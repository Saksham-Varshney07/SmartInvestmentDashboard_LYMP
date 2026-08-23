from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
import requests
import traceback
from db import init_db, get_db, engine, Base
import models
from scraper import get_stock_data
from ml_pipeline import run_pipeline
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import collections
import yfinance as yf

class TransactionRequest(BaseModel):
    user_id: int
    symbol: str
    transaction_type: str
    shares: float
    price_at_purchase: float
    portfolio_type: str = 'real'

class TransactionEditRequest(BaseModel):
    symbol: str
    transaction_type: str
    shares: float
    price_at_purchase: float

class LoginRequest(BaseModel):
    username: str
    full_name: Optional[str] = None
    risk_profile: Optional[str] = None
    investment_horizon: Optional[str] = None

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
            market_entry = models.AssetPrice(ticker=str(row['Symbol']), date=row['Date'], open=float(row['Open']), high=float(row['High']), low=float(row['Low']), close=float(row['Close']), volume=int(row['Volume']))
            db.merge(market_entry)
            market_entries.append(market_entry)
        analysis_data = None
        for item in final_output:
            analysis_entry = models.RiskScore(
                ticker=item['asset'],
                risk_level=item['risk'],
                stability=item['stability'],
                trend=item['trend'],
                returns=float(item['returns']),
                yearly_return=float(item['yearly_return']),
                volatility=float(item['volatility']),
                average_price=float(item['average_price']),
                latest_price=float(item['latest_price']),
                anomaly_ratio=float(item['anomaly_ratio']),
                stars=int(item['stars'])
            )
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
            market_entry = models.AssetPrice(ticker=str(row['Symbol']), date=row['Date'], open=float(row['Open']), high=float(row['High']), low=float(row['Low']), close=float(row['Close']), volume=int(row['Volume']))
            db.merge(market_entry)
        for item in final_output:
            analysis_entry = models.RiskScore(
                ticker=item['asset'],
                risk_level=item['risk'],
                stability=item['stability'],
                trend=item['trend'],
                returns=float(item['returns']),
                yearly_return=float(item['yearly_return']),
                volatility=float(item['volatility']),
                average_price=float(item['average_price']),
                latest_price=float(item['latest_price']),
                anomaly_ratio=float(item['anomaly_ratio']),
                stars=int(item['stars'])
            )
            db.merge(analysis_entry)
        db.commit()
        return {'status': 'success', 'message': f'Pipeline executed successfully for {len(final_output)} assets.'}
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/api/login')
def login(req: LoginRequest, db: Session=Depends(get_db)):
    # 1. Handle User
    user = db.query(models.User).filter(models.User.username == req.username).first()
    if not user:
        user = models.User(
            username=req.username,
            full_name=req.full_name,
            risk_profile=req.risk_profile,
            investment_horizon=req.investment_horizon
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update existing user details on login if provided
        if req.full_name: user.full_name = req.full_name
        if req.risk_profile: user.risk_profile = req.risk_profile
        if req.investment_horizon: user.investment_horizon = req.investment_horizon
        db.commit()
        db.refresh(user)
        
    # 2. Ensure User has a default Portfolio
    real_portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == user.id, models.Portfolio.portfolio_name == 'Real Portfolio').first()
    if not real_portfolio:
        real_portfolio = models.Portfolio(portfolio_name='Real Portfolio', user_id=user.id)
        db.add(real_portfolio)
        
    sandbox_portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == user.id, models.Portfolio.portfolio_name == 'Sandbox Portfolio').first()
    if not sandbox_portfolio:
        sandbox_portfolio = models.Portfolio(portfolio_name='Sandbox Portfolio', user_id=user.id)
        db.add(sandbox_portfolio)
        
    db.commit()
    db.refresh(real_portfolio)

    # 3. Return combined profile
    return {
        'status': 'success', 
        'user_id': user.id, 
        'portfolio_id': real_portfolio.id,
        'username': user.username,
        'full_name': user.full_name,
        'risk_profile': user.risk_profile,
        'investment_horizon': user.investment_horizon
    }

@app.post('/api/portfolio/transaction')
def add_transaction(req: TransactionRequest, db: Session=Depends(get_db)):
    target_name = 'Real Portfolio' if req.portfolio_type == 'real' else 'Sandbox Portfolio'
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == req.user_id, models.Portfolio.portfolio_name == target_name).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    if req.transaction_type.upper() == 'BUY':
        # Use the stored procedure as requested
        db.execute(
            text("CALL purchase_portfolio_asset(:pid, :sym, :shares, :price)"),
            {"pid": portfolio.id, "sym": req.symbol.upper(), "shares": req.shares, "price": req.price_at_purchase}
        )
        db.commit()
    else:
        # For SELL, just add a negative share amount using SQLAlchemy
        asset = models.PortfolioAsset(
            portfolio_id=portfolio.id,
            ticker=req.symbol.upper(),
            shares=-req.shares,
            purchase_price=req.price_at_purchase
        )
        db.add(asset)
        db.commit()
        
    return {'status': 'success', 'message': 'Transaction added'}

@app.put('/api/portfolio/transaction/{tx_id}')
def edit_transaction(tx_id: int, req: TransactionEditRequest, db: Session=Depends(get_db)):
    tx = db.query(models.PortfolioAsset).filter(models.PortfolioAsset.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    tx.ticker = req.symbol.upper()
    tx.shares = req.shares if req.transaction_type.upper() == 'BUY' else -req.shares
    tx.purchase_price = req.price_at_purchase
    
    db.commit()
    return {'status': 'success', 'message': 'Transaction updated'}

@app.delete('/api/portfolio/transaction/{tx_id}')
def delete_transaction(tx_id: int, db: Session=Depends(get_db)):
    tx = db.query(models.PortfolioAsset).filter(models.PortfolioAsset.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    db.delete(tx)
    db.commit()
    return {'status': 'success', 'message': 'Transaction deleted'}

# Simple memory cache for live prices to avoid Yahoo rate limits (expires every 1 minute)
price_cache = {}
@app.get('/api/portfolio/{user_id}')
def get_portfolio(user_id: int, type: str = 'real', db: Session=Depends(get_db)):
    portfolios = db.query(models.Portfolio).filter(models.Portfolio.user_id == user_id).all()
    if not portfolios:
        return {'status': 'success', 'summary': {'total_investment': 0, 'portfolio_value': 0, 'total_profit': 0, 'total_profit_pct': 0}, 'assets': [], 'recent_activity': []}
        
    target_name = 'Real Portfolio' if type == 'real' else 'Sandbox Portfolio'
    portfolio = next((p for p in portfolios if p.portfolio_name == target_name), portfolios[0])

    transactions = db.query(models.PortfolioAsset).filter(models.PortfolioAsset.portfolio_id == portfolio.id).all()
    
    holdings = {}
    for tx in transactions:
        sym = tx.ticker
        if sym not in holdings:
            holdings[sym] = {'shares': 0.0, 'total_invested': 0.0, 'history': []}
        
        # Determine BUY or SELL based on shares sign
        tx_type = 'BUY' if tx.shares > 0 else 'SELL'
        abs_shares = abs(tx.shares)
        
        if tx_type == 'BUY':
            holdings[sym]['shares'] += abs_shares
            holdings[sym]['total_invested'] += (abs_shares * tx.purchase_price)
        else:
            holdings[sym]['shares'] -= abs_shares
            if holdings[sym]['shares'] <= 0:
                holdings[sym]['total_invested'] = 0.0
            
        holdings[sym]['history'].append({
            'type': tx_type,
            'shares': abs_shares,
            'price': tx.purchase_price,
            'date': tx.purchase_date
        })

    # Filter out empty holdings
    holdings = {k: v for k, v in holdings.items() if v['shares'] > 0}
    
    total_investment = 0.0
    current_portfolio_value = 0.0
    asset_allocation = {}
    
    # Fetch live prices
    symbols_to_fetch = list(holdings.keys())
    live_prices = {}
    
    now = datetime.now()
    for sym in symbols_to_fetch:
        # Check cache
        if sym in price_cache and (now - price_cache[sym]['time']).total_seconds() < 60:
            live_prices[sym] = price_cache[sym]['price']
        else:
            try:
                # Fetch fast price
                ticker = yf.Ticker(sym)
                info = ticker.fast_info
                price = getattr(info, 'last_price', 0)
                if price == 0:
                    price = getattr(info, 'previous_close', 0)
                live_prices[sym] = price
                price_cache[sym] = {'price': price, 'time': now}
            except:
                # Fallback to historical db or purchase price if yf fails
                live_prices[sym] = holdings[sym]['total_invested'] / holdings[sym]['shares'] if holdings[sym]['shares'] > 0 else 0
                
    assets = []
    for sym, data in holdings.items():
        shares = data['shares']
        invested = data['total_invested']
        live_price = live_prices.get(sym, 0)
        current_val = shares * live_price
        profit = current_val - invested
        profit_pct = (profit / invested * 100) if invested > 0 else 0
        
        total_investment += invested
        current_portfolio_value += current_val
        
        assets.append({
            'symbol': sym,
            'shares': shares,
            'invested': invested,
            'current_value': current_val,
            'live_price': live_price,
            'profit': profit,
            'profit_pct': profit_pct,
            'history': data['history']
        })
        
    total_profit = current_portfolio_value - total_investment
    total_profit_pct = (total_profit / total_investment * 100) if total_investment > 0 else 0
    
    # Calculate allocation
    for asset in assets:
        asset['allocation_pct'] = (asset['current_value'] / current_portfolio_value * 100) if current_portfolio_value > 0 else 0
        
    # Get recent activity (last 5)
    recent_activity = []
    for tx in reversed(transactions[-5:]):
        tx_type = 'BUY' if tx.shares > 0 else 'SELL'
        abs_shares = abs(tx.shares)
        recent_activity.append({
            'id': tx.id,
            'symbol': tx.ticker,
            'type': tx_type,
            'shares': abs_shares,
            'price': tx.purchase_price,
            'total': abs_shares * tx.purchase_price,
            'date': tx.purchase_date
        })

    return {
        'status': 'success',
        'summary': {
            'total_investment': total_investment,
            'portfolio_value': current_portfolio_value,
            'total_profit': total_profit,
            'total_profit_pct': total_profit_pct
        },
        'assets': assets,
        'recent_activity': recent_activity
    }

@app.get('/api/assets')
def get_assets(db: Session=Depends(get_db)):
    assets = db.query(models.RiskScore).all()
    return assets

@app.get('/api/market/{symbol}')
def get_market_history(symbol: str, db: Session=Depends(get_db)):
    symbol = symbol.upper()
    history = db.query(models.AssetPrice).filter(models.AssetPrice.ticker == symbol).order_by(models.AssetPrice.date.desc()).all()
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
        
        # Calculate Sector Breakdown
        sector_breakdown = []
        for sector, count in counter.items():
            sector_breakdown.append({
                "name": sector,
                "percentage": round((count / len(sectors)) * 100)
            })
        sector_breakdown.sort(key=lambda x: x['percentage'], reverse=True)
        
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
            
        # Generate heuristic correlation matrix for heatmap
        correlation_matrix = []
        for i, s1 in enumerate(payload.stocks):
            row = {'name': s1, 'data': []}
            sec1 = sector_mapping.get(s1.upper().replace('.NS', '') + '.NS', 'Other')
            for j, s2 in enumerate(payload.stocks):
                sec2 = sector_mapping.get(s2.upper().replace('.NS', '') + '.NS', 'Other')
                if i == j:
                    corr = 1.0
                elif sec1 == sec2 and sec1 != 'Other':
                    corr = 0.85
                else:
                    corr = 0.25
                row['data'].append({'x': s2, 'y': corr})
            correlation_matrix.append(row)
            
        # 2. Extract Real ML Metrics from Database
        user_stocks_data = []
        for s in payload.stocks:
            normalized = s.upper()
            if not normalized.endswith('.NS') and '-' not in normalized and '=' not in normalized:
                normalized += '.NS'
            
            # Fetch from DB to instantly get Volatility and Yearly Return
            asset_record = db.query(models.RiskScore).filter(models.RiskScore.ticker == normalized).first()
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
                 return [{"name": "User Selection", "ticker": "USER.SEL", "percentage": 100, "amount": slice_budget, "color": color_start}]
                 
            allocs = []
            # some color variations
            colors = ["#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d", "#059669", "#0891b2", "#2563eb", "#4f46e5", "#7c3aed", "#c026d3", "#e11d48"]
            for i, s in enumerate(user_stocks_data):
                amt = slice_budget * s['weight']
                allocs.append({
                    "name": s['symbol'],
                    "ticker": s['symbol'],
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
                {"name": "Gov Bonds / FDs", "ticker": "GOV.BND", "percentage": 40, "amount": b * 0.40, "color": "#1e293b"},
                {"name": "Bluechip / Large Cap", "ticker": "LARGE.CAP", "percentage": 40, "amount": b * 0.40, "color": "#475569"},
            ] + generate_user_allocations(def_user_slice),
            "projected_return_pa": round((0.4 * 6.5) + (0.4 * 10.0) + (0.2 * avg_user_return), 1)
        }
        
        # Portfolio 2: The Balanced
        bal_user_slice = b * 0.40
        the_balanced = {
            "name": "The Balanced (AI Optimum)",
            "description": "60% Equity mixes, 40% Stable backbone",
            "allocations": [
                {"name": "Index Funds (NIFTY 50)", "ticker": "NIFTY50.IDX", "percentage": 40, "amount": b * 0.40, "color": "#0284c7"},
                {"name": "Gold / Liquid", "ticker": "GOLD.ETF", "percentage": 20, "amount": b * 0.20, "color": "#eab308"}
            ] + generate_user_allocations(bal_user_slice),
            "projected_return_pa": round((0.4 * 12.0) + (0.2 * 5.0) + (0.4 * avg_user_return), 1)
        }
        
        # Portfolio 3: The Aggressor
        agg_user_slice = b * 0.60
        the_aggressor = {
            "name": "The Aggressor (High Risk)",
            "description": "85% Aggressive Equity, 15% Support",
            "allocations": [
                {"name": "Small/Mid Cap Funds", "ticker": "SMALL.CAP", "percentage": 25, "amount": b * 0.25, "color": "#9333ea"},
                {"name": "Cash Reserve", "ticker": "CASH", "percentage": 15, "amount": b * 0.15, "color": "#cbd5e1"}
            ] + generate_user_allocations(agg_user_slice),
            "projected_return_pa": round((0.25 * 18.0) + (0.15 * 4.0) + (0.60 * avg_user_return), 1)
        }
        
        # Drawdown Simulation Data (12 months heuristic)
        simulation_data = {
            "categories": [],
            "user_portfolio": [],
            "ai_balanced": []
        }
        
        # Base values
        user_val = 100000
        ai_val = 100000
        
        import random
        # 12 months ago to now
        for i in range(12):
            month_date = datetime.now() - timedelta(days=30*(11-i))
            simulation_data["categories"].append(month_date.strftime("%b %Y"))
            
            # Month 6-7 is our "Crash"
            if i in [5, 6]:
                # User portfolio drops heavily based on correlation
                drop = random.uniform(0.15, 0.25) if high_correlation else random.uniform(0.10, 0.15)
                user_val = user_val * (1 - drop)
                # AI Balanced drops less due to bonds
                ai_val = ai_val * (1 - random.uniform(0.04, 0.08))
            else:
                # Normal growth
                user_val = user_val * (1 + random.uniform(0.01, 0.04))
                ai_val = ai_val * (1 + random.uniform(0.01, 0.025))
                
            simulation_data["user_portfolio"].append(round(user_val))
            simulation_data["ai_balanced"].append(round(ai_val))

        return {
            'status': 'success',
            'analysis': {
                'has_high_correlation': high_correlation,
                'ai_warnings': warnings_array,
                'user_profile_matched': payload.risk_profile,
                'correlation_matrix': correlation_matrix,
                'sector_breakdown': sector_breakdown,
                'simulation_data': simulation_data,
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

class BlueprintApplyRequest(BaseModel):
    allocations: List[dict]

@app.post('/api/portfolio/{user_id}/apply_blueprint')
def apply_blueprint(user_id: int, req: BlueprintApplyRequest, type: str = 'sandbox', db: Session=Depends(get_db)):
    """
    Clears current portfolio and applies the AI Blueprint
    """
    try:
        target_name = 'Real Portfolio' if type == 'real' else 'Sandbox Portfolio'
        portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == user_id, models.Portfolio.portfolio_name == target_name).first()
        if not portfolio:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Delete existing assets
        db.query(models.PortfolioAsset).filter(models.PortfolioAsset.portfolio_id == portfolio.id).delete()
        db.commit()
        
        # Insert new blueprint transactions
        for alloc in req.allocations:
            amount = alloc.get('amount', 0)
            if amount <= 0: continue
            
            ticker = alloc.get('ticker')
            if not ticker: ticker = alloc.get('name', 'UNKNOWN')
            
            # Since we don't know real live prices of generics, assume 1 unit costs 100 for simplicity
            purchase_price = 100.0
            shares = amount / purchase_price
            
            asset = models.PortfolioAsset(
                portfolio_id=portfolio.id,
                ticker=ticker,
                shares=shares,
                purchase_price=purchase_price,
                purchase_date=datetime.now()
            )
            db.add(asset)
            
        db.commit()
        return {'status': 'success', 'message': 'Blueprint applied successfully.'}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))