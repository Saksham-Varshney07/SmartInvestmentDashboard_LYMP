import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
import warnings
warnings.filterwarnings('ignore')

def preprocess_data(df):
    """
    Handle missing values, duplicates, ensure time-series ordering.
    """
    if df.empty:
        return df
    df.sort_values(by=['Symbol', 'Date'], ascending=[True, True], inplace=True)
    df.drop_duplicates(subset=['Symbol', 'Date'], keep='last', inplace=True)
    cols_to_fill = ['Open', 'High', 'Low', 'Close', 'Volume']
    df[cols_to_fill] = df.groupby('Symbol')[cols_to_fill].ffill()
    df[cols_to_fill] = df.groupby('Symbol')[cols_to_fill].bfill()
    df.reset_index(drop=True, inplace=True)
    return df

def feature_engineering(df):
    """
    Generate Features: Returns, Volatility, Yearly Return, Average Price, Trend
    """
    if df.empty:
        return df
    df['Returns'] = df.groupby('Symbol')['Close'].pct_change()
    df['Volatility'] = df.groupby('Symbol')['Returns'].transform(lambda x: x.rolling(window=14).std())
    
    def calc_yearly_return(group):
        if group.empty:
            return pd.Series(dtype=float)
        symbol = str(group.name).upper()
        # Crypto trades 365 days a year, traditional stocks trade ~252 days
        period = 365 if "-USD" in symbol else 252
        return group.pct_change(periods=period)

    df['Yearly_Return'] = df.groupby('Symbol', group_keys=False)['Close'].apply(calc_yearly_return)
    
    first_price = df.groupby('Symbol')['Close'].transform('first')
    df['Yearly_Return'] = df['Yearly_Return'].fillna((df['Close'] - first_price) / first_price)
    df['Average_Price'] = df.groupby('Symbol')['Close'].transform('mean')
    df['Trend'] = np.where(df['Close'] > df['Average_Price'], 'Uptrend', 'Downtrend')
    df.dropna(inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df

def train_isolation_forest(df):
    """
    Train Isolation Forest on Close, Volume, Returns, Volatility.
    Apply StandardScaler before training.
    """
    if df is None or df.empty:
        return (pd.DataFrame(), None)
    features = ['Close', 'Volume', 'Returns', 'Volatility']
    X = df[features].copy()
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = IsolationForest(contamination='auto', random_state=42)
    model.fit(X_scaled)
    df['Anomaly_Flag'] = model.predict(X_scaled)
    return (df, model)

def train_xgboost_drawdown_model(df):
    """
    Cost-Sensitive Extreme Gradient Boosting (XGBoost) classifier.
    Forecasts downside drawdown risk (forward 5-day drop > 2%) using multi-factor features.
    Applies scale_pos_weight to penalize false negatives on rare market downturns.
    """
    xgb_results = {}
    if df is None or df.empty or 'Symbol' not in df.columns:
        return xgb_results

    features = ['Returns', 'Volatility', 'Yearly_Return']

    for symbol, group in df.groupby('Symbol'):
        try:
            if len(group) < 20:
                vol = float(group['Volatility'].iloc[-1]) if not group['Volatility'].isna().all() else 0.02
                prob = min(0.95, max(0.05, vol * 15))
                xgb_results[symbol] = {
                    'drawdown_prob': round(prob * 100, 1),
                    'xgb_risk': 'High Risk' if prob >= 0.40 else ('Moderate Risk' if prob >= 0.20 else 'Low Risk')
                }
                continue

            grp = group.copy()
            # 5-day forward return target (< -2% drawdown)
            grp['Future_5d_Ret'] = grp['Close'].shift(-5) / grp['Close'] - 1.0
            grp['Target'] = (grp['Future_5d_Ret'] < -0.02).astype(int)

            train_data = grp.dropna(subset=features + ['Target'])
            if len(train_data) < 20 or train_data['Target'].nunique() < 2:
                vol = float(grp['Volatility'].iloc[-1]) if not grp['Volatility'].isna().all() else 0.02
                y_ret = float(grp['Yearly_Return'].iloc[-1]) if not grp['Yearly_Return'].isna().all() else 0.0
                prob = min(0.95, max(0.05, (vol * 12) + (0.15 if y_ret < -0.05 else 0.0)))
                xgb_results[symbol] = {
                    'drawdown_prob': round(prob * 100, 1),
                    'xgb_risk': 'High Risk' if prob >= 0.40 else ('Moderate Risk' if prob >= 0.20 else 'Low Risk')
                }
                continue

            X_tr = train_data[features]
            y_tr = train_data['Target'].values

            pos_count = sum(y_tr)
            neg_count = len(y_tr) - pos_count
            scale_pos = max(1.0, float(neg_count) / max(1, pos_count))

            model = xgb.XGBClassifier(
                n_estimators=40,
                max_depth=3,
                learning_rate=0.08,
                scale_pos_weight=scale_pos,
                eval_metric='logloss',
                random_state=42
            )
            model.fit(X_tr, y_tr)

            latest_X = grp[features].iloc[[-1]]
            prob_arr = model.predict_proba(latest_X)
            raw_p = float(prob_arr[0][1])
            # Calibrate odds to remove cost-sensitive weight inflation for true drawdown probability
            odds_weighted = raw_p / max(1e-5, (1.0 - raw_p))
            odds_calibrated = odds_weighted / scale_pos
            calibrated_p = odds_calibrated / (1.0 + odds_calibrated)
            drawdown_p = min(0.95, max(0.03, calibrated_p))

            xgb_results[symbol] = {
                'drawdown_prob': round(drawdown_p * 100, 1),
                'xgb_risk': 'High Risk' if drawdown_p >= 0.35 else ('Moderate Risk' if drawdown_p >= 0.18 else 'Low Risk')
            }
        except Exception as e:
            print(f"[XGBoost] Warning for {symbol}: {e}")
            xgb_results[symbol] = {
                'drawdown_prob': 15.0,
                'xgb_risk': 'Low Risk'
            }

    return xgb_results

def analyze_risk_and_stability(df, xgb_dict=None):
    """
    Map predictions to risk and stability based on multi-model criteria.
    Output:
    { "ticker": ..., "risk_level": ..., "stability": ..., "trend": ..., "returns": ..., "yearly_return": ..., "volatility": ..., "average_price": ..., "latest_price": ..., "anomaly_ratio": ..., "stars": ..., "xgboost_prob": ..., "xgboost_risk": ... }
    """
    results = []
    if df is None or df.empty:
        return results
    for symbol, group in df.groupby('Symbol'):
        total_count = len(group)
        anomaly_count = (group['Anomaly_Flag'] == -1).sum()
        anomaly_ratio = anomaly_count / total_count if total_count > 0 else 0
        latest_record = group.iloc[-1]
        latest_price = latest_record['Close']
        avg_price = latest_record['Average_Price']
        returns = latest_record['Returns'] * 100
        yearly_return = latest_record['Yearly_Return'] * 100
        volatility = latest_record['Volatility']
        trend = latest_record['Trend']
        high_anomaly_threshold = 0.10
        high_volatility_threshold = 0.03
        if anomaly_ratio > high_anomaly_threshold or volatility > high_volatility_threshold:
            stability = 'Unstable'
        else:
            stability = 'Stable'
            
        if yearly_return < -10 or anomaly_ratio > high_anomaly_threshold:
            risk = 'High Risk'
            stars = 2 if yearly_return > -20 else 1
        elif anomaly_ratio > 0.05 or volatility > 0.025:
            risk = 'Medium Risk'
            stars = 3
        else:
            risk = 'Low Risk'
            stars = 5 if yearly_return > 10 else 4

        xgb_info = xgb_dict.get(symbol, {'drawdown_prob': 15.0, 'xgb_risk': 'Low Risk'}) if xgb_dict else {'drawdown_prob': 15.0, 'xgb_risk': 'Low Risk'}

        results.append({
            'ticker': symbol,
            'risk_level': risk.split(' ')[0],
            'stability': stability,
            'trend': trend,
            'returns': float(round(returns, 2)),
            'yearly_return': float(round(yearly_return, 2)),
            'volatility': float(round(volatility, 4)),
            'average_price': float(round(avg_price, 2)),
            'latest_price': float(round(latest_price, 2)),
            'anomaly_ratio': float(round(anomaly_ratio, 4)),
            'stars': int(stars),
            'xgboost_prob': float(xgb_info['drawdown_prob']),
            'xgboost_risk': str(xgb_info['xgb_risk'])
        })
    return results

def run_pipeline(raw_df):
    print('Preprocessing data...')
    cleaned_df = preprocess_data(raw_df)
    print('Feature Engineering...')
    features_df = feature_engineering(cleaned_df)
    print('Training Isolation Forest Anomaly Model...')
    results_df, model = train_isolation_forest(features_df)
    print('Training Cost-Sensitive XGBoost Drawdown Classifier...')
    xgb_dict = train_xgboost_drawdown_model(results_df)
    print('Analyzing Multi-Model Risk & Stability...')
    final_output = analyze_risk_and_stability(results_df, xgb_dict)
    return (final_output, results_df)