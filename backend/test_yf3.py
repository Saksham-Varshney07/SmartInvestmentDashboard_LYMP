import yfinance as yf
import pandas as pd
live_price = yf.download("LT.NS", period="1d", progress=False)['Close']
print(type(live_price.iloc[-1]))
print(pd.isna(live_price.iloc[-1]))
