import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.model_selection import TimeSeriesSplit, train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, classification_report
import xgboost as xgb
import warnings
warnings.filterwarnings('ignore')

def build_dataset():
    print("Fetching multi-sector historical dataset from Yahoo Finance...")
    universe = [
        'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS',
        'SBIN.NS', 'ITC.NS', 'HINDUNILVR.NS', 'TATASTEEL.NS', 'LT.NS'
    ]
    raw_close = yf.download(universe, period="max")['Close']
    data = raw_close.dropna(axis=1, how='all').dropna()
    returns = data.pct_change().dropna()

    window_sizes = [30, 60, 90]
    X_list = []
    y_list = []
    dates = []

    for i in range(250, len(returns) - 30, 15):
        for window in window_sizes:
            chunk = returns.iloc[i-window:i]
            corr_matrix = chunk.corr().values
            upper_tri = corr_matrix[np.triu_indices_from(corr_matrix, k=1)]
            avg_corr = np.nanmean(upper_tri)

            weights = np.array([1/len(universe)] * len(universe))
            cov_matrix = chunk.cov() * 252
            port_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
            
            # Momentum / return feature
            cum_ret = chunk.mean(axis=1).sum()

            future_chunk = returns.iloc[i : i+20]
            future_port_return = future_chunk.mean(axis=1).sum()
            label = 1 if future_port_return < -0.02 else 0

            X_list.append([avg_corr, port_volatility, cum_ret])
            y_list.append(label)
            dates.append(returns.index[i])

    X = pd.DataFrame(X_list, columns=['Avg_Correlation', 'Port_Volatility', 'Recent_Momentum'], index=dates)
    y = np.array(y_list)
    return X, y

def evaluate_models_walk_forward(X, y):
    print("\n" + "="*70)
    print("      WALK-FORWARD TIME-SERIES CROSS VALIDATION (NO LOOK-AHEAD)")
    print("="*70)
    
    tscv = TimeSeriesSplit(n_splits=5)
    
    rf_metrics = {'acc': [], 'prec': [], 'rec': [], 'f1': [], 'auc': []}
    xgb_metrics = {'acc': [], 'prec': [], 'rec': [], 'f1': [], 'auc': []}

    fold = 1
    for train_index, test_index in tscv.split(X):
        X_train, X_test = X.iloc[train_index], X.iloc[test_index]
        y_train, y_test = y[train_index], y[test_index]

        # 1. Random Forest
        rf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
        rf.fit(X_train, y_train)
        rf_pred = rf.predict(X_test)
        rf_prob = rf.predict_proba(X_test)[:, 1] if len(np.unique(y_train)) > 1 else rf_pred

        rf_metrics['acc'].append(accuracy_score(y_test, rf_pred))
        rf_metrics['prec'].append(precision_score(y_test, rf_pred, zero_division=0))
        rf_metrics['rec'].append(recall_score(y_test, rf_pred, zero_division=0))
        rf_metrics['f1'].append(f1_score(y_test, rf_pred, zero_division=0))
        try:
            rf_metrics['auc'].append(roc_auc_score(y_test, rf_prob))
        except Exception:
            rf_metrics['auc'].append(0.5)

        # 2. XGBoost
        scale_pos = (len(y_train) - sum(y_train)) / max(1, sum(y_train))
        model_xgb = xgb.XGBClassifier(
            n_estimators=100, 
            max_depth=4, 
            learning_rate=0.05, 
            scale_pos_weight=scale_pos,
            random_state=42, 
            eval_metric='logloss'
        )
        model_xgb.fit(X_train, y_train)
        xgb_pred = model_xgb.predict(X_test)
        xgb_prob = model_xgb.predict_proba(X_test)[:, 1]

        xgb_metrics['acc'].append(accuracy_score(y_test, xgb_pred))
        xgb_metrics['prec'].append(precision_score(y_test, xgb_pred, zero_division=0))
        xgb_metrics['rec'].append(recall_score(y_test, xgb_pred, zero_division=0))
        xgb_metrics['f1'].append(f1_score(y_test, xgb_pred, zero_division=0))
        try:
            xgb_metrics['auc'].append(roc_auc_score(y_test, xgb_prob))
        except Exception:
            xgb_metrics['auc'].append(0.5)

        print(f"Fold {fold}: Train size={len(train_index)}, Test size={len(test_index)}")
        print(f"   RF  -> F1: {rf_metrics['f1'][-1]:.3f} | Recall: {rf_metrics['rec'][-1]:.3f} | AUC: {rf_metrics['auc'][-1]:.3f}")
        print(f"   XGB -> F1: {xgb_metrics['f1'][-1]:.3f} | Recall: {xgb_metrics['rec'][-1]:.3f} | AUC: {xgb_metrics['auc'][-1]:.3f}")
        fold += 1

    print("\n" + "="*70)
    print("       MODEL BENCHMARK COMPARISON (5-FOLD WALK-FORWARD AVERAGE)")
    print("="*70)
    print(f"{'Metric':<15} | {'Random Forest':<18} | {'XGBoost (Alternative)':<20}")
    print("-" * 60)
    print(f"{'Accuracy':<15} | {np.mean(rf_metrics['acc'])*100:>16.2f}% | {np.mean(xgb_metrics['acc'])*100:>18.2f}%")
    print(f"{'Precision':<15} | {np.mean(rf_metrics['prec'])*100:>16.2f}% | {np.mean(xgb_metrics['prec'])*100:>18.2f}%")
    print(f"{'Recall (Crash)':<15} | {np.mean(rf_metrics['rec'])*100:>16.2f}% | {np.mean(xgb_metrics['rec'])*100:>18.2f}%")
    print(f"{'F1-Score':<15} | {np.mean(rf_metrics['f1'])*100:>16.2f}% | {np.mean(xgb_metrics['f1'])*100:>18.2f}%")
    print(f"{'ROC-AUC':<15} | {np.mean(rf_metrics['auc']):>17.3f}  | {np.mean(xgb_metrics['auc']):>19.3f} ")
    print("="*70)

    return rf_metrics, xgb_metrics

if __name__ == '__main__':
    X, y = build_dataset()
    evaluate_models_walk_forward(X, y)
