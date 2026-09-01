import yfinance as yf
tickers = ['TMCV.NS', 'TATAMOTORS.NS', 'INFY.NS', 'LTIM.NS']
data = yf.download(tickers, period="1mo", progress=False)['Close']
print(data.columns)
print(data.isna().all())
