import yfinance as yf
tickers = ['TATAMOTORS.NS', 'DBL.NS', 'MINDTREE.NS', 'INFOSYS.NS', 'LT.NS']
data = yf.download(tickers, period="1y", progress=False)['Close']
print(data.columns)
print(data.isna().all())
