from flask import Flask, request, jsonify
import yfinance as yf
import numpy as np
import pandas as pd
from flask_cors import CORS
app = Flask(__name__)
CORS(app)

@app.route('/features')
def get_features():
    demo_symbols = {'TATASTEEL': 'TATASTEEL.NS', 'RELIANCE': 'RELIANCE.NS', 'INFY': 'INFY.NS', 'HDFCBANK': 'HDFCBANK.NS', 'TCS': 'TCS.NS'}
    symbol = request.args.get('symbol')
    if not symbol:
        return (jsonify({'error': 'Symbol is required'}), 400)
    symbol_upper = symbol.upper()
    yf_symbol = demo_symbols.get(symbol_upper, symbol_upper)
    if not yf_symbol.endswith('.NS') and yf_symbol in demo_symbols.values():
        yf_symbol = yf_symbol + '.NS'
    try:
        data = yf.download(yf_symbol, period='7d', interval='1d')
        if data is None or data.empty:
            return (jsonify({'error': f'No data found for symbol {symbol}. Try one of: ' + ', '.join(demo_symbols.keys())}), 404)
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        data = data.reset_index()
        data['Return'] = data['Close'].pct_change() * 100
        closes = data['Close'].dropna()
        if closes is None or closes.empty or len(closes) < 2:
            return (jsonify({'error': 'Not enough data to compute features. Try again later or with another symbol.'}), 500)
        try:
            trend = 'Uptrend' if float(closes.iloc[-1]) > float(closes.iloc[0]) else 'Downtrend'
        except Exception:
            trend = 'Unknown'
        try:
            volatility = float(np.std(closes))
        except Exception:
            volatility = None
        try:
            avg_price = float(np.mean(closes))
        except Exception:
            avg_price = None
        try:
            latest_close = float(closes.iloc[-1])
        except Exception:
            latest_close = None
        try:
            returns = float(data['Return'].iloc[-1]) if not np.isnan(data['Return'].iloc[-1]) else 0.0
        except Exception:
            returns = None
        for col in ['Open', 'High', 'Low', 'Close', 'Volume']:
            if col not in data:
                data[col] = None
        if 'Date' in data.columns:
            data['Date'] = data['Date'].astype(str)
        elif 'index' in data.columns:
            data['Date'] = data['index'].astype(str)
        raw = data[['Date', 'Open', 'High', 'Low', 'Close', 'Volume']].to_dict(orient='records')
        result = {'symbol': symbol_upper, 'latest_close': latest_close, 'returns': returns, 'trend': trend, 'volatility': volatility, 'average_price': avg_price, 'raw': raw}
        return jsonify(result)
    except Exception as e:
        return (jsonify({'error': f'Error: {str(e)}. Try one of these demo symbols: ' + ', '.join(demo_symbols.keys())}), 500)
if __name__ == '__main__':
    app.run(debug=True)