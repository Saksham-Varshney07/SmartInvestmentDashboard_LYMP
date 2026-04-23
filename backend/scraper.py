import yfinance as yf
import pandas as pd
import time

def fetch_data(symbol, start, end, retries=3):
    for attempt in range(retries):
        try:
            print(f'Fetching {symbol}... (Attempt {attempt + 1})')
            df = yf.download(symbol, start=start, end=end, progress=False)
            if not df.empty:
                if isinstance(df.columns, pd.MultiIndex):
                    df.columns = df.columns.droplevel(1)
                df = df[['Open', 'High', 'Low', 'Close', 'Volume']].copy()
                df['Symbol'] = symbol
                df['Date'] = df.index
                df.reset_index(drop=True, inplace=True)
                return df
        except Exception as e:
            print(f'Error fetching {symbol}: {e}')
            time.sleep(2)
    print(f'Failed to fetch {symbol}')
    return pd.DataFrame()

def get_stock_data(symbols_list, start_date, end_date):
    all_data = []
    for sym in symbols_list:
        df = fetch_data(sym, start_date, end_date)
        if not df.empty:
            all_data.append(df)
        time.sleep(0.5)
    if all_data:
        return pd.concat(all_data, ignore_index=True)
    return pd.DataFrame()