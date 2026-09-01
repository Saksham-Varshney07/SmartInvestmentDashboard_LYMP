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
    is_signup: Optional[bool] = False

app = FastAPI(title='Risk Analysis System API')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.on_event('startup')
def on_startup():
    init_db()
    try:
        if engine:
            Base.metadata.create_all(bind=engine)
            # Ensure the stored procedure exists
            with engine.connect() as conn:
                conn.execute(text("""
                CREATE OR REPLACE PROCEDURE purchase_portfolio_asset(
                    p_portfolio_id INT,
                    p_ticker VARCHAR,
                    p_shares FLOAT,
                    p_price FLOAT
                )
                LANGUAGE plpgsql
                AS $$
                BEGIN
                    INSERT INTO portfolio_assets (portfolio_id, ticker, shares, purchase_price, purchase_date)
                    VALUES (p_portfolio_id, p_ticker, p_shares, p_price, NOW());
                    IF p_shares <= 0 THEN
                        RAISE EXCEPTION 'Shares must be greater than zero. Rolling back transaction.';
                    END IF;
                END;
                $$;
                """))
                conn.commit()
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
        if raw_df.empty or len(raw_df) < 14:
            suggestion = ""
            if ".BO" in symbol:
                suggestion = f" Try using the NSE ticker instead: {symbol.replace('.BO', '.NS')}."
            raise HTTPException(status_code=404, detail=f'Insufficient historical data available from Yahoo Finance for symbol {symbol} (requires at least 14 days of trading history).{suggestion}')
        
        final_output, full_processed_df = run_pipeline(raw_df)
        if full_processed_df.empty:
            suggestion = ""
            if ".BO" in symbol:
                suggestion = f" Try using the NSE ticker instead: {symbol.replace('.BO', '.NS')}."
            raise HTTPException(status_code=404, detail=f'Insufficient data to train AI anomaly models for {symbol}.{suggestion}')
        market_entries = []
        for _, row in full_processed_df.iterrows():
            market_entry = models.AssetPrice(ticker=str(row['Symbol']), date=row['Date'], open=float(row['Open']), high=float(row['High']), low=float(row['Low']), close=float(row['Close']), volume=int(row['Volume']))
            db.merge(market_entry)
            market_entries.append(market_entry)
        analysis_data = None
        for item in final_output:
            analysis_entry = models.RiskScore(**item)
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
            analysis_entry = models.RiskScore(**item)
            db.merge(analysis_entry)
        db.commit()
        return {'status': 'success', 'message': f'Pipeline executed successfully for {len(final_output)} assets.'}
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
@app.get('/api/market-trend')
def get_market_trend(symbol: str):
    """
    Fetches the 6-month closing price history for a given symbol for AI card mini-charts.
    """
    try:
        # Map known outdated/alias tickers to correct Yahoo Finance tickers
        TICKER_MAP = {
            'TATAMOTORS.NS': 'TMCV.NS',
            'TATAMOTORS': 'TMCV.NS',
            'INFOSYS.NS': 'INFY.NS',
            'INFOSYS': 'INFY.NS',
            'MINDTREE.NS': 'LTIM.NS',
            'MINDTREE': 'LTIM.NS'
        }
        mapped_symbol = TICKER_MAP.get(symbol.upper().strip(), symbol.upper().strip())
        
        ticker = yf.Ticker(mapped_symbol)
        hist = ticker.history(period="6mo")
        
        if hist.empty:
            # Fallback to appending .NS for Indian stocks just in case
            if not symbol.endswith('.NS') and not symbol.endswith('.BO'):
                hist = yf.Ticker(symbol + ".NS").history(period="6mo")
        
        if hist.empty:
            return {"symbol": symbol, "trend": []}
            
        # Downsample slightly if it's too large, but 120 days is perfectly fine for Sparkline
        closes = [round(float(val), 2) for val in hist['Close'].tolist()]
        return {"symbol": symbol, "trend": closes}
    except Exception as e:
        return {"symbol": symbol, "trend": [], "error": str(e)}

@app.post('/api/login')
def login(req: LoginRequest, db: Session=Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == req.username).first()
    if not user:
        if not req.is_signup:
            return {'status': 'error', 'message': "Account not found. Please click 'Sign up' below to create a new account."}
            
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
    
    portfolios = db.query(models.Portfolio).filter(models.Portfolio.user_id == req.user_id).all()
    if not portfolios:
        # Auto-create the portfolio if the user has absolutely zero portfolios
        portfolio = models.Portfolio(portfolio_name=target_name, user_id=req.user_id)
        db.add(portfolio)
        db.commit()
        db.refresh(portfolio)
    else:
        # Use the requested portfolio name, or fallback to their first portfolio (e.g., custom named ones)
        portfolio = next((p for p in portfolios if p.portfolio_name == target_name), portfolios[0])
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
        import pandas as pd
        import numpy as np
        import scipy.optimize as sco
        import yfinance as yf
        
        stocks_list = payload.stocks
        if not stocks_list:
            raise ValueError('No stocks provided.')
            
        stocks_list = list(set(stocks_list))
            
        raw_tickers = [s.upper().strip() for s in stocks_list]
        
        # Map known outdated/alias tickers to correct Yahoo Finance tickers
        TICKER_MAP = {
            'TATAMOTORS.NS': 'TMCV.NS',
            'TATAMOTORS': 'TMCV.NS',
            'INFOSYS.NS': 'INFY.NS',
            'INFOSYS': 'INFY.NS',
            'MINDTREE.NS': 'LTIM.NS',
            'MINDTREE': 'LTIM.NS'
        }
        
        mapped_tickers = [TICKER_MAP.get(t, t) for t in raw_tickers]
            
        # 1. Fetch Real Historical Data (Last 1 Year)
        # Try fetching exactly what was passed first
        data = yf.download(mapped_tickers, period="1y", progress=False)['Close']
        if isinstance(data, pd.Series):
            data = data.to_frame(name=mapped_tickers[0])
            
        # Check for failed tickers
        valid_tickers = [c for c in data.columns if not data[c].isna().all()]
        failed_tickers = [t for t in mapped_tickers if t not in valid_tickers]
        
        # Retry failed tickers by appending .NS if they lack a suffix
        retry_tickers = []
        for t in failed_tickers:
            if '.' not in t and '-' not in t and '=' not in t:
                retry_tickers.append(t + '.NS')
                
        if retry_tickers:
            retry_data = yf.download(retry_tickers, period="1y", progress=False)['Close']
            if isinstance(retry_data, pd.Series):
                retry_data = retry_data.to_frame(name=retry_tickers[0])
            for c in retry_data.columns:
                if not retry_data[c].isna().all():
                    data[c] = retry_data[c]
                    valid_tickers.append(c)
        
        if len(valid_tickers) == 0:
            raise ValueError("No valid data returned from Yahoo Finance for the provided stocks.")
            
        # Add warnings for failed tickers so the user knows they were excluded
        failed_after_retry = [t for t in mapped_tickers if t not in valid_tickers and (t + '.NS') not in valid_tickers]
        
        # Filter data to only valid columns
        data = data[valid_tickers]
        
        # Crypto trades 24/7, stocks trade 5 days/week. 
        # Forward fill stock prices on weekends before dropping NaNs to preserve the timeline.
        data = data.ffill().dropna()
        
        returns = data.pct_change().dropna()
        if returns.empty:
            raise ValueError("Not enough historical data to compute returns.")
            
        yf_tickers = valid_tickers
            
        # 2. Real Correlation Matrix
        corr_df = returns.corr()
        
        correlation_matrix = []
        for s1 in yf_tickers:
            row = {'name': s1, 'data': []}
            for s2 in yf_tickers:
                if s1 in corr_df.columns and s2 in corr_df.columns:
                    val = corr_df.loc[s1, s2]
                    val = 0 if pd.isna(val) else val
                else:
                    val = 1.0 if s1 == s2 else 0.0
                row['data'].append({'x': s2, 'y': round(val, 2)})
            correlation_matrix.append(row)
            
        # 3. Dynamic High-Correlation Warnings
        warnings_array = []
        if failed_after_retry:
            warnings_array.append(f"Invalid Tickers: Could not fetch data for {', '.join(failed_after_retry)}. They might be misspelled, delisted, or use a different ticker symbol. They were excluded from the analysis.")
            
        high_correlation = False
        correlated_pairs = []
        
        for i in range(len(yf_tickers)):
            for j in range(i+1, len(yf_tickers)):
                s1, s2 = yf_tickers[i], yf_tickers[j]
                c_val = corr_df.loc[s1, s2]
                if c_val > 0.45:
                    high_correlation = True
                    correlated_pairs.append(f"{s1} & {s2}")
                    
        if high_correlation:
            pair_examples = ", ".join(correlated_pairs[:2]) + (" and others" if len(correlated_pairs) > 2 else "")
            warnings_array.append(f"Overlap Warning: Some stocks in your list (like {pair_examples}) tend to move in the exact same direction. If one drops, the others will likely drop too, making your portfolio riskier.")
        
        if len(yf_tickers) <= 2:
            warnings_array.append("Too Few Stocks: Having only 1-2 stocks is risky because all your money is tied to one company's success. Try adding more stocks to balance it out.")
            
        # 4. Sector Exposure Breakdown (100% Real via concurrent fetch)
        import concurrent.futures
        def fetch_sector(ticker):
            try:
                sec = yf.Ticker(ticker).info.get('sector')
                return sec if sec else 'Other/Unknown'
            except:
                return 'Other/Unknown'
                
        counter = collections.Counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            fetched_sectors = list(executor.map(fetch_sector, yf_tickers))
            
        for s in fetched_sectors:
            counter[s] += 1
            
        sector_breakdown = []
        for sector, count in counter.items():
            pct = round((count / len(yf_tickers)) * 100)
            sector_breakdown.append({
                "name": sector,
                "percentage": pct
            })
            if pct > 50 and sector != 'Other/Unknown':
                warnings_array.append(f"Sector Warning: {pct}% of your portfolio is in the '{sector}' sector. If this specific industry has a bad year, your whole portfolio will suffer.")
                
        sector_breakdown.sort(key=lambda x: x['percentage'], reverse=True)
        
        if not warnings_array:
            warnings_array.append("Great job! Your selected stocks are well balanced and don't overlap too much.")
        
        # 5. MPT Optimization for Allocations
        mean_returns = returns.mean() * 252
        cov_matrix = returns.cov() * 252
        num_assets = len(valid_tickers)
        
        def get_allocs(weights, budget_slice):
            allocs = []
            colors = ["#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d", "#059669", "#0891b2", "#2563eb", "#4f46e5", "#7c3aed", "#c026d3", "#e11d48"]
            for i, ticker in enumerate(valid_tickers):
                w = weights[i]
                if w > 0.01:
                    allocs.append({
                        "name": ticker, "ticker": ticker,
                        "percentage": round(w * 100, 1),
                        "amount": round(budget_slice * w, 2),
                        "color": colors[i % len(colors)]
                    })
            return allocs

        if num_assets > 1:
            def port_perf(weights, mean_ret, cov):
                ret = np.sum(mean_ret * weights)
                std = np.sqrt(np.dot(weights.T, np.dot(cov, weights)))
                return std, ret

            def neg_sharpe(weights, mean_ret, cov, risk_free=0.07):
                p_var, p_ret = port_perf(weights, mean_ret, cov)
                return -(p_ret - risk_free) / p_var

            def port_vol(weights, mean_ret, cov):
                return port_perf(weights, mean_ret, cov)[0]

            constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
            
            # For pure optimization, use 0 to 1
            bounds = tuple((0.0, 1.0) for _ in range(num_assets))
            
            # For balanced/defender, enforce diversification (e.g., max 40-50% in one stock)
            max_weight = max(0.4, 1.5 / num_assets) if num_assets >= 3 else 0.8
            div_bounds = tuple((0.02, max_weight) for _ in range(num_assets))
            
            init_guess = num_assets * [1. / num_assets,]
            
            # Global Minimum Variance (Defender)
            opt_def = sco.minimize(port_vol, init_guess, args=(mean_returns, cov_matrix), method='SLSQP', bounds=div_bounds, constraints=constraints)
            defender_w = opt_def['x']
            def_ret = np.sum(mean_returns * defender_w)
            
            # Maximum Sharpe (Balanced)
            opt_bal = sco.minimize(neg_sharpe, init_guess, args=(mean_returns, cov_matrix), method='SLSQP', bounds=div_bounds, constraints=constraints)
            balanced_w = opt_bal['x']
            bal_ret = np.sum(mean_returns * balanced_w)
            
            # Aggressive (Weighted heavily to top returners)
            aggressor_w = np.zeros(num_assets)
            top_idx = np.argsort(mean_returns.values)[-2:] if num_assets >= 2 else [0]
            if len(top_idx) == 2:
                aggressor_w[top_idx[1]] = 0.65
                aggressor_w[top_idx[0]] = 0.35
            else:
                aggressor_w[0] = 1.0
            agg_ret = np.sum(mean_returns * aggressor_w)
        else:
            defender_w = balanced_w = aggressor_w = np.array([1.0])
            def_ret = bal_ret = agg_ret = mean_returns.values[0] if num_assets > 0 else 0
            
        b = payload.budget
        the_defender = {
            "name": "The Defender (Low Risk)",
            "description": "MPT Global Minimum Variance",
            "allocations": get_allocs(defender_w, b),
            "projected_return_pa": round((def_ret*100), 1)
        }
        
        the_balanced = {
            "name": "The Balanced (AI Optimum)",
            "description": "MPT Maximum Sharpe Ratio",
            "allocations": get_allocs(balanced_w, b),
            "projected_return_pa": round((bal_ret*100), 1)
        }
        
        the_aggressor = {
            "name": "The Aggressor (High Risk)",
            "description": "Momentum & High-Yield Driven",
            "allocations": get_allocs(aggressor_w, b),
            "projected_return_pa": round((agg_ret*100), 1)
        }
        
        # 6. Real Historical Backtesting
        simulation_data = {"categories": [], "user_portfolio": [], "ai_balanced": []}
        
        if num_assets > 0:
            user_weights = np.array([1.0 / num_assets] * num_assets)
            user_daily_ret = (returns * user_weights).sum(axis=1)
            ai_daily_ret = (returns * balanced_w).sum(axis=1)
            
            # Blend AI stock slice with 40% NIFTY (est 0.04% daily) and 20% Gold (est 0.02% daily)
            blended_ai_ret = (ai_daily_ret * 0.40) + 0.0004 * 0.40 + 0.0002 * 0.20
            
            user_cum = (1 + user_daily_ret).cumprod()
            ai_cum = (1 + blended_ai_ret).cumprod()
            
            port_df = pd.DataFrame({'user': user_cum, 'ai': ai_cum})
            monthly_data = port_df.iloc[::21, :] # roughly every 21 trading days (1 month)
            
            for date, row in monthly_data.iterrows():
                simulation_data["categories"].append(date.strftime("%b %y"))
                simulation_data["user_portfolio"].append(round(100000 * row['user']))
                simulation_data["ai_balanced"].append(round(100000 * row['ai']))
                
        if len(simulation_data["categories"]) < 2:
            simulation_data["categories"] = ["Jan", "Feb", "Mar", "Apr"]
            simulation_data["user_portfolio"] = [100000]*4
            simulation_data["ai_balanced"] = [100000]*4
            
        return {
            'status': 'success',
            'analysis': {
                'valid_count': len(valid_tickers),
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
            
            # Fetch the actual live price instead of hardcoding 100.0
            purchase_price = 100.0
            try:
                import yfinance as yf
                import pandas as pd
                live_price = yf.download(ticker, period="1d", progress=False)['Close']
                if not live_price.empty:
                    val = live_price.iloc[-1].iloc[0] if isinstance(live_price, pd.DataFrame) else live_price.iloc[-1]
                    if not pd.isna(val):
                        purchase_price = float(val)
            except Exception as e:
                print(f"Failed to fetch live price for {ticker}: {e}")
                
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

class AskAiRequest(BaseModel):
    question: str

@app.post('/api/ask_ai/{symbol}')
def ask_ai_about_stock_endpoint(symbol: str, req: AskAiRequest):
    try:
        from llm_utils import ask_ai_about_stock
        answer = ask_ai_about_stock(symbol, req.question)
        return {'status': 'success', 'answer': answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))