from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import requests
import traceback
from .db import init_db, get_db, engine, Base
from . import models
from .scraper import get_stock_data
from .ml_pipeline import run_pipeline
app = FastAPI(title='Risk Analysis System API')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.on_event('startup')
def on_startup():
    init_db()
    try:
        if engine:
            Base.metadata.create_all(bind=engine)
    except Exception as e:
        print('Could not create tables immediately warning:', e)

@app.get('/')
def read_root():
    return {'message': 'AI Based Multi Asset Investment Risk Analysis System API API'}

@app.get('/api/search')
def search_yahoo(q: str):
    """
    Fetches autocomplete suggestions from Yahoo Finance.
    """
    url = f'https://query2.finance.yahoo.com/v1/finance/search?q={q}'
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    try:
        res = requests.get(url, headers=headers, timeout=5)
        data = res.json()
        quotes = data.get('quotes', [])
        filtered = [{'symbol': q.get('symbol'), 'shortname': q.get('shortname', ''), 'exchDisp': q.get('exchDisp', '')} for q in quotes if 'symbol' in q]
        return {'results': filtered}
    except Exception as e:
        return {'error': str(e), 'results': []}

@app.get('/api/analyze/{symbol}')
def run_single_analysis(symbol: str, db: Session=Depends(get_db)):
    """
    Analyzes a single stock and returns its risk profile and history.
    """
    symbol = symbol.upper()
    try:
        raw_df = get_stock_data([symbol], period="max")
        if raw_df.empty:
            raise HTTPException(status_code=404, detail=f'No data available for symbol {symbol}')
        final_output, full_processed_df = run_pipeline(raw_df)
        market_entries = []
        for _, row in full_processed_df.iterrows():
            market_entry = models.MarketData(symbol=row['Symbol'], date=row['Date'], open=row['Open'], high=row['High'], low=row['Low'], close=row['Close'], volume=row['Volume'])
            db.merge(market_entry)
            market_entries.append(market_entry)
        analysis_data = None
        for item in final_output:
            analysis_entry = models.AssetAnalysis(**item)
            db.merge(analysis_entry)
            analysis_data = item
        db.commit()
        import yfinance as yf
        info = {}
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
        except Exception:
            pass
        return {'status': 'success', 'analysis': analysis_data, 'history': market_entries, 'fundamentals': info}
    except HTTPException as h:
        raise h
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/api/run-pipeline')
def execute_pipeline(db: Session=Depends(get_db)):
    """
    Triggers the scraping, processing, ML anomaly detection, for a batch of popular stocks.
    """
    try:
        symbols = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'TATAMOTORS.NS', 'ITC.NS', 'ICICIBANK.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'HINDUNILVR.NS']
        raw_df = get_stock_data(symbols, period="max")
        if raw_df.empty:
            raise HTTPException(status_code=500, detail='Data scraping failed.')
        final_output, full_processed_df = run_pipeline(raw_df)
        for _, row in full_processed_df.iterrows():
            market_entry = models.MarketData(symbol=row['Symbol'], date=row['Date'], open=row['Open'], high=row['High'], low=row['Low'], close=row['Close'], volume=row['Volume'])
            db.merge(market_entry)
        for item in final_output:
            analysis_entry = models.AssetAnalysis(**item)
            db.merge(analysis_entry)
        db.commit()
        return {'status': 'success', 'processed_assets': len(final_output)}
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/assets')
def get_assets(db: Session=Depends(get_db)):
    assets = db.query(models.AssetAnalysis).all()
    return assets

@app.get('/api/market/{symbol}')
def get_market_history(symbol: str, db: Session=Depends(get_db)):
    symbol = symbol.upper()
    history = db.query(models.MarketData).filter(models.MarketData.symbol == symbol).order_by(models.MarketData.date.desc()).all()
    if not history:
        return {'error': 'No market history found for this symbol.'}
    return {'history': history}