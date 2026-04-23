import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
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
    first_price = df.groupby('Symbol')['Close'].transform('first')
    df['Yearly_Return'] = (df['Close'] - first_price) / first_price
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
    if df.empty:
        return (None, None)
    features = ['Close', 'Volume', 'Returns', 'Volatility']
    X = df[features].copy()
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(X_scaled)
    df['Anomaly_Flag'] = model.predict(X_scaled)
    return (df, model)

def analyze_risk_and_stability(df):
    """
    Map predictions to risk and stability based on criteria.
    Output:
    { "asset": ..., "risk": ..., "stability": ..., "trend": ..., "returns": ..., "yearly_return": ..., "volatility": ..., "average_price": ..., "latest_price": ..., "anomaly_ratio": ..., "stars": ... }
    """
    results = []
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
        high_anomaly_threshold = 0.1
        high_volatility_threshold = 0.03
        if anomaly_ratio > high_anomaly_threshold or volatility > high_volatility_threshold:
            stability = 'Unstable'
        else:
            stability = 'Stable'
        if yearly_return < -10 or anomaly_ratio > high_anomaly_threshold:
            risk = 'High Risk'
            stars = 2 if yearly_return > -20 else 1
        elif anomaly_ratio > 0.05 or volatility > 0.02:
            risk = 'Medium Risk'
            stars = 3
        else:
            risk = 'Low Risk'
            stars = 5 if yearly_return > 10 else 4
        results.append({'asset': symbol, 'risk': risk.split(' ')[0], 'stability': stability, 'trend': trend, 'returns': round(returns, 2), 'yearly_return': round(yearly_return, 2), 'volatility': round(volatility, 4), 'average_price': round(avg_price, 2), 'latest_price': round(latest_price, 2), 'anomaly_ratio': round(anomaly_ratio, 4), 'stars': stars})
    return results

def run_pipeline(raw_df):
    print('Preprocessing data...')
    cleaned_df = preprocess_data(raw_df)
    print('Feature Engineering...')
    features_df = feature_engineering(cleaned_df)
    print('Training Model...')
    results_df, model = train_isolation_forest(features_df)
    print('Analyzing Risk and Stability...')
    final_output = analyze_risk_and_stability(results_df)
    return (final_output, results_df)