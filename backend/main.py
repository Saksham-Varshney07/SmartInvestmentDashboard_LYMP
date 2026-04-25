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
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import collections

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

class PortfolioRequest(BaseModel):
    budget: float
    stocks: List[str]
    duration: int
    risk_profile: str

@app.post('/api/portfolio-risk')
def analyze_portfolio_architecture(payload: PortfolioRequest, db: Session=Depends(get_db)):
    """
    Acts as the 'AI Portfolio Doctor', analyzing correlation risk and returning
    three optimized allocation breakdowns based on real Inverse Volatility weighting.
    """
    try:
        # 1. We mock correlation data using Sector Mapping logic typical for Indian bluechips.
        sector_mapping = {
            'RELIANCE.NS': 'Energy', 'ONGC.NS': 'Energy',
            'TCS.NS': 'IT', 'INFY.NS': 'IT', 'WIPRO.NS': 'IT', 'HCLTECH.NS': 'IT',
            'HDFCBANK.NS': 'Banking', 'ICICIBANK.NS': 'Banking', 'SBIN.NS': 'Banking', 'AXISBANK.NS': 'Banking',
            'ITC.NS': 'FMCG', 'HINDUNILVR.NS': 'FMCG', 'TATASTEEL.NS': 'Metals', 'JSWSTEEL.NS': 'Metals'
        }
        
        # Determine concentration
        sectors = []
        for s in payload.stocks:
            normalized = s.upper()
            if not normalized.endswith('.NS'):
                normalized += '.NS'
            sectors.append(sector_mapping.get(normalized, 'Other'))
            
        counter = collections.Counter(sectors)
        
        warnings_array = []
        high_correlation = False
        
        for sector, count in counter.items():
            if count >= 3 and sector != 'Other':
                high_correlation = True
                warnings_array.append(f"CONCENTRATION RISK: You have selected {count} stocks entirely in the {sector} sector. These assets are highly correlated; if {sector} faces a downturn, your entire portfolio falls simultaneously.")
                
        if len(payload.stocks) <= 2:
            warnings_array.append("DIVERSIFICATION WARNING: Only choosing 1-2 stocks concentrates capital too heavily. Consider blending in stable mutual funds.")
            
        if not warnings_array:
            warnings_array.append("Your chosen stock universe shows excellent sector diversification and low correlation overlap.")
            
        # 2. Extract Real ML Metrics from Database
        user_stocks_data = []
        for s in payload.stocks:
            normalized = s.upper()
            if not normalized.endswith('.NS') and '-' not in normalized and '=' not in normalized:
                normalized += '.NS'
            
            # Fetch from DB to instantly get Volatility and Yearly Return
            asset_record = db.query(models.AssetAnalysis).filter(models.AssetAnalysis.asset == normalized).first()
            if asset_record:
                user_stocks_data.append({
                    'symbol': normalized,
                    'volatility': asset_record.volatility,
                    'yearly_return': asset_record.yearly_return
                })
            else:
                # Fallback if not yet analyzed: assume average market vol and 8% return
                user_stocks_data.append({
                    'symbol': normalized,
                    'volatility': 0.015,
                    'yearly_return': 8.0
                })
                
        # Calculate Inverse Volatility Weights purely for the User Selection slice
        total_inv_vol = sum((1.0 / s['volatility']) for s in user_stocks_data) if user_stocks_data else 1
        for s in user_stocks_data:
            s['weight'] = (1.0 / s['volatility']) / total_inv_vol
            
        avg_user_return = sum((s['yearly_return'] * s['weight']) for s in user_stocks_data) if user_stocks_data else 8.0

        # Heuristic MPT Portfolio Allocator
        b = payload.budget
        
        # Helper to divide a slice among user stocks
        def generate_user_allocations(slice_budget, color_start="#2563eb"):
            # If no stocks, provide generic
            if not user_stocks_data:
                 return [{"name": "User Selection", "percentage": 100, "amount": slice_budget, "color": color_start}]
                 
            allocs = []
            # some color variations
            colors = ["#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d", "#059669", "#0891b2", "#2563eb", "#4f46e5", "#7c3aed", "#c026d3", "#e11d48"]
            for i, s in enumerate(user_stocks_data):
                amt = slice_budget * s['weight']
                allocs.append({
                    "name": s['symbol'],
                    "percentage": round(s['weight'] * 100, 1),
                    "amount": round(amt, 2),
                    "color": colors[i % len(colors)]
                })
            return allocs

        # Portfolio 1: The Defender
        def_user_slice = b * 0.20
        the_defender = {
            "name": "The Defender (Low Risk)",
            "description": "80% Large Cap & Debt, 20% Growth",
            "allocations": [
                {"name": "Gov Bonds / FDs", "percentage": 40, "amount": b * 0.40, "color": "#1e293b"},
                {"name": "Bluechip / Large Cap", "percentage": 40, "amount": b * 0.40, "color": "#475569"},
            ] + generate_user_allocations(def_user_slice),
            "projected_return_pa": round((0.4 * 6.5) + (0.4 * 10.0) + (0.2 * avg_user_return), 1)
        }
        
        # Portfolio 2: The Balanced
        bal_user_slice = b * 0.40
        the_balanced = {
            "name": "The Balanced (AI Optimum)",
            "description": "60% Equity mixes, 40% Stable backbone",
            "allocations": [
                {"name": "Index Funds (NIFTY 50)", "percentage": 40, "amount": b * 0.40, "color": "#0284c7"},
                {"name": "Gold / Liquid", "percentage": 20, "amount": b * 0.20, "color": "#eab308"}
            ] + generate_user_allocations(bal_user_slice),
            "projected_return_pa": round((0.4 * 12.0) + (0.2 * 5.0) + (0.4 * avg_user_return), 1)
        }
        
        # Portfolio 3: The Aggressor
        agg_user_slice = b * 0.60
        the_aggressor = {
            "name": "The Aggressor (High Risk)",
            "description": "85% Aggressive Equity, 15% Support",
            "allocations": [
                {"name": "Small/Mid Cap Funds", "percentage": 25, "amount": b * 0.25, "color": "#9333ea"},
                {"name": "Cash Reserve", "percentage": 15, "amount": b * 0.15, "color": "#cbd5e1"}
            ] + generate_user_allocations(agg_user_slice),
            "projected_return_pa": round((0.25 * 18.0) + (0.15 * 4.0) + (0.60 * avg_user_return), 1)
        }
        
        return {
            'status': 'success',
            'analysis': {
                'has_high_correlation': high_correlation,
                'ai_warnings': warnings_array,
                'user_profile_matched': payload.risk_profile,
                'portfolios': {
                    'safe': the_defender,
                    'balanced': the_balanced,
                    'aggressive': the_aggressor
                }
            }
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))