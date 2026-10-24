import re
import requests
import yfinance as yf
import pandas as pd
from typing import List, Tuple, Dict, Optional

# Comprehensive alias map for Indian & global equities, common abbreviations, and brand names
TICKER_ALIASES: Dict[str, str] = {
    # Hindustan Unilever
    'HUL': 'HINDUNILVR.NS',
    'HUL.NS': 'HINDUNILVR.NS',
    'HUL.BO': 'HINDUNILVR.BO',
    'HINDUSTANUNILEVER': 'HINDUNILVR.NS',
    'HINDUSTANUNILEVER.NS': 'HINDUNILVR.NS',
    'HINDUSTAN UNILEVER': 'HINDUNILVR.NS',
    'HINDUNILVR': 'HINDUNILVR.NS',

    # Tata Motors (NSE symbol changed to TMCV following demerger / restructuring)
    'TATA': 'TMCV.NS',
    'TATA.NS': 'TMCV.NS',
    'TATAMOTORS': 'TMCV.NS',
    'TATAMOTORS.NS': 'TMCV.NS',
    'TATAMTR': 'TMCV.NS',
    'TATA-MOTORS': 'TMCV.NS',
    'TATA MOTORS': 'TMCV.NS',
    'TMCV': 'TMCV.NS',

    # Larsen & Toubro
    'L&T': 'LT.NS',
    'L&T.NS': 'LT.NS',
    'LT': 'LT.NS',
    'LARSEN': 'LT.NS',
    'LARSEN & TOUBRO': 'LT.NS',

    # Mahindra & Mahindra
    'M&M': 'M&M.NS',
    'M&M.NS': 'M&M.NS',
    'MM': 'M&M.NS',
    'MM.NS': 'M&M.NS',
    'MAHINDRA': 'M&M.NS',
    'MAHINDRA & MAHINDRA': 'M&M.NS',

    # State Bank of India
    'SBI': 'SBIN.NS',
    'SBI.NS': 'SBIN.NS',
    'SBIN': 'SBIN.NS',
    'STATE BANK': 'SBIN.NS',
    'STATE BANK OF INDIA': 'SBIN.NS',

    # Bharti Airtel
    'AIRTEL': 'BHARTIARTL.NS',
    'AIRTEL.NS': 'BHARTIARTL.NS',
    'BHARTI': 'BHARTIARTL.NS',
    'BHARTI.NS': 'BHARTIARTL.NS',
    'BHARTIARTL': 'BHARTIARTL.NS',
    'BHARTI AIRTEL': 'BHARTIARTL.NS',

    # Infosys
    'INFOSYS': 'INFY.NS',
    'INFOSYS.NS': 'INFY.NS',
    'INFY': 'INFY.NS',

    # LTIMindtree
    'MINDTREE': 'LTIM.NS',
    'MINDTREE.NS': 'LTIM.NS',
    'LTI': 'LTIM.NS',
    'LTI.NS': 'LTIM.NS',
    'LTIM': 'LTIM.NS',
    'LTIMINDTREE': 'LTIM.NS',

    # Bajaj Auto
    'BAJAJAUTO': 'BAJAJ-AUTO.NS',
    'BAJAJAUTO.NS': 'BAJAJ-AUTO.NS',
    'BAJAJ-AUTO': 'BAJAJ-AUTO.NS',
    'BAJAJ AUTO': 'BAJAJ-AUTO.NS',

    # Bajaj Finance & Finserv
    'BAJAJFINANCE': 'BAJFINANCE.NS',
    'BAJAJFINANCE.NS': 'BAJFINANCE.NS',
    'BAJFINANCE': 'BAJFINANCE.NS',
    'BAJAJ FINANCE': 'BAJFINANCE.NS',
    'BAJAJFINSERV': 'BAJAJFINSV.NS',
    'BAJAJFINSERV.NS': 'BAJAJFINSV.NS',
    'BAJAJFINSV': 'BAJAJFINSV.NS',
    'BAJAJ FINSERV': 'BAJAJFINSV.NS',

    # Maruti Suzuki
    'MARUTI': 'MARUTI.NS',
    'MARUTISUZUKI': 'MARUTI.NS',
    'MARUTI SUZUKI': 'MARUTI.NS',

    # FMCG
    'NESTLE': 'NESTLEIND.NS',
    'NESTLE.NS': 'NESTLEIND.NS',
    'NESTLEIND': 'NESTLEIND.NS',
    'NESTLE INDIA': 'NESTLEIND.NS',
    'BRITANNIA': 'BRITANNIA.NS',
    'DABUR': 'DABUR.NS',
    'MARICO': 'MARICO.NS',
    'GODREJCP': 'GODREJCP.NS',
    'ITC': 'ITC.NS',
    'TATACONSUMER': 'TATACONSUMER.NS',
    'TATA CONSUMER': 'TATACONSUMER.NS',

    # Paints
    'ASIANPAINTS': 'ASIANPAINT.NS',
    'ASIANPAINTS.NS': 'ASIANPAINT.NS',
    'ASIANPAINT': 'ASIANPAINT.NS',
    'ASIAN PAINTS': 'ASIANPAINT.NS',
    'BERGERPAINTS': 'BERGEPAINT.NS',
    'BERGEPAINT': 'BERGEPAINT.NS',
    'BERGER PAINTS': 'BERGEPAINT.NS',

    # Pharma & Healthcare
    'SUNPHARMA': 'SUNPHARMA.NS',
    'SUN PHARMA': 'SUNPHARMA.NS',
    'CIPLA': 'CIPLA.NS',
    'DRREDDY': 'DRREDDY.NS',
    'DRREDDYS': 'DRREDDY.NS',
    'DR REDDY': 'DRREDDY.NS',
    'DIVIS': 'DIVISLAB.NS',
    'DIVIS.NS': 'DIVISLAB.NS',
    'DIVISLAB': 'DIVISLAB.NS',
    'DIVIS LABORATORIES': 'DIVISLAB.NS',
    'APOLLO': 'APOLLOHOSP.NS',
    'APOLLOHOSP': 'APOLLOHOSP.NS',
    'APOLLO HOSPITALS': 'APOLLOHOSP.NS',

    # Cement & Metals
    'ULTRATECH': 'ULTRACEMCO.NS',
    'ULTRACEMCO': 'ULTRACEMCO.NS',
    'ULTRATECH CEMENT': 'ULTRACEMCO.NS',
    'GRASIM': 'GRASIM.NS',
    'TATASTEEL': 'TATASTEEL.NS',
    'TATA STEEL': 'TATASTEEL.NS',
    'JSWSTEEL': 'JSWSTEEL.NS',
    'JSW STEEL': 'JSWSTEEL.NS',
    'HINDALCO': 'HINDALCO.NS',
    'VEDL': 'VEDL.NS',
    'VEDANTA': 'VEDL.NS',

    # Energy & Utilities
    'RELIANCE': 'RELIANCE.NS',
    'RIL': 'RELIANCE.NS',
    'RELIANCE INDUSTRIES': 'RELIANCE.NS',
    'ONGC': 'ONGC.NS',
    'BPCL': 'BPCL.NS',
    'HPCL': 'HPCL.NS',
    'IOC': 'IOC.NS',
    'INDIAN OIL': 'IOC.NS',
    'NTPC': 'NTPC.NS',
    'POWERGRID': 'POWERGRID.NS',
    'POWER GRID': 'POWERGRID.NS',
    'TATAPOWER': 'TATAPOWER.NS',
    'TATA POWER': 'TATAPOWER.NS',
    'COALINDIA': 'COALINDIA.NS',
    'COAL INDIA': 'COALINDIA.NS',

    # Auto & Heavy
    'EICHER': 'EICHERMOT.NS',
    'EICHERMOT': 'EICHERMOT.NS',
    'ROYAL ENFIELD': 'EICHERMOT.NS',
    'HERO': 'HEROMOTOCO.NS',
    'HEROMOTOCO': 'HEROMOTOCO.NS',
    'HERO MOTOCORP': 'HEROMOTOCO.NS',

    # Tech & Services
    'TCS': 'TCS.NS',
    'TATA CONSULTANCY SERVICES': 'TCS.NS',
    'WIPRO': 'WIPRO.NS',
    'HCLTECH': 'HCLTECH.NS',
    'HCL': 'HCLTECH.NS',
    'TECHM': 'TECHM.NS',
    'TECH MAHINDRA': 'TECHM.NS',

    # Banking & Financials
    'HDFC': 'HDFCBANK.NS',
    'HDFCBANK': 'HDFCBANK.NS',
    'HDFC BANK': 'HDFCBANK.NS',
    'ICICI': 'ICICIBANK.NS',
    'ICICIBANK': 'ICICIBANK.NS',
    'ICICI BANK': 'ICICIBANK.NS',
    'KOTAK': 'KOTAKBANK.NS',
    'KOTAKBANK': 'KOTAKBANK.NS',
    'KOTAK MAHINDRA BANK': 'KOTAKBANK.NS',
    'AXIS': 'AXISBANK.NS',
    'AXISBANK': 'AXISBANK.NS',
    'AXIS BANK': 'AXISBANK.NS',
    'INDUSIND': 'INDUSINDBK.NS',
    'INDUSINDBK': 'INDUSINDBK.NS',
    'BOB': 'BANKBARODA.NS',
    'BANK OF BARODA': 'BANKBARODA.NS',
    'PNB': 'PNB.NS',
    'YESBANK': 'YESBANK.NS',
    'JIOFIN': 'JIOFIN.NS',
    'JIO': 'JIOFIN.NS',
    'JIO FINANCIAL': 'JIOFIN.NS',

    # Retail, Defense & New Age
    'TITAN': 'TITAN.NS',
    'TRENT': 'TRENT.NS',
    'ZOMATO': 'ZOMATO.NS',
    'PAYTM': 'PAYTM.NS',
    'SWIGGY': 'SWIGGY.NS',
    'HYUNDAI': 'HYUNDAI.NS',
    'HAL': 'HAL.NS',
    'BEL': 'BEL.NS',
    'BHEL': 'BHEL.NS',
    'IRCTC': 'IRCTC.NS',
    'SUZLON': 'SUZLON.NS',

    # Adani Group
    'ADANIENT': 'ADANIENT.NS',
    'ADANI': 'ADANIENT.NS',
    'ADANI ENTERPRISES': 'ADANIENT.NS',
    'ADANIPORTS': 'ADANIPORTS.NS',
    'ADANI PORTS': 'ADANIPORTS.NS',
    'ADANIGREEN': 'ADANIGREEN.NS',
    'ADANI GREEN': 'ADANIGREEN.NS',
    'ADANIPOWER': 'ADANIPOWER.NS',
    'ADANI POWER': 'ADANIPOWER.NS',
}

# Runtime memory cache for dynamically discovered symbols (persists while backend is running)
DYNAMIC_CACHE: Dict[str, str] = {}


def clean_input(symbol: str) -> str:
    """Standardizes input string by stripping whitespace and uppercase."""
    return symbol.strip().upper()


def discover_via_yahoo_search(query: str) -> Optional[str]:
    """
    Queries Yahoo Finance Search API to dynamically discover canonical stock symbols
    for any unlisted/newly listed or unmapped company.
    Prioritizes Indian exchanges (.NS, .BO), then global symbols.
    """
    clean_q = query.replace('.NS', '').replace('.BO', '').strip()
    url = f'https://query2.finance.yahoo.com/v1/finance/search?q={clean_q}'
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    try:
        res = requests.get(url, headers=headers, timeout=4)
        if res.status_code == 200:
            quotes = res.json().get('quotes', [])
            # Priority 1: Exact or closest .NS ticker
            for q in quotes:
                sym = q.get('symbol', '')
                if sym.endswith('.NS'):
                    return sym
            # Priority 2: .BO ticker
            for q in quotes:
                sym = q.get('symbol', '')
                if sym.endswith('.BO'):
                    return sym
            # Priority 3: Major global stock (US equities, etc.)
            for q in quotes:
                sym = q.get('symbol', '')
                if sym and '.' not in sym and not sym.startswith('^'):
                    return sym
    except Exception as e:
        print(f"[ticker_resolver] Dynamic search error for '{query}': {e}")
    return None


def resolve_symbol(raw_symbol: str) -> str:
    """
    Resolves any stock symbol, brand name, or alias to its valid Yahoo Finance ticker.
    Supports instant alias lookup, extension-agnostic mapping, and dynamic search fallback.
    """
    if not raw_symbol:
        return raw_symbol
        
    s = clean_input(raw_symbol)

    # 1. Direct hit in alias table
    if s in TICKER_ALIASES:
        return TICKER_ALIASES[s]

    # 2. Check in dynamic cache
    if s in DYNAMIC_CACHE:
        return DYNAMIC_CACHE[s]

    # 3. Strip .NS or .BO and check alias table
    # (e.g. user typed HUL.NS, which becomes HUL -> HINDUNILVR.NS)
    base_sym = s
    if base_sym.endswith('.NS'):
        base_sym = base_sym[:-3]
    elif base_sym.endswith('.BO'):
        base_sym = base_sym[:-3]

    if base_sym in TICKER_ALIASES:
        resolved = TICKER_ALIASES[base_sym]
        DYNAMIC_CACHE[s] = resolved
        return resolved

    # 4. Crypto or Commodity futures - retain as-is (e.g. BTC-USD, GC=F)
    if '-' in s or '=' in s:
        return s

    # 5. If no dot in symbol, standard Indian default is .NS
    if '.' not in s:
        candidate = f"{s}.NS"
        # Check if candidate base is known
        if candidate in TICKER_ALIASES:
            return TICKER_ALIASES[candidate]
        return candidate

    return s


def resolve_ticker_list(raw_tickers: List[str]) -> Tuple[List[str], Dict[str, str]]:
    """
    Resolves a list of input tickers to canonical Yahoo Finance tickers.
    Returns:
        resolved_list: Unique list of canonical tickers.
        mapping: Dict mapping original_raw -> resolved_canonical.
    """
    resolved_list = []
    mapping = {}
    
    for raw in raw_tickers:
        original = raw.strip()
        canonical = resolve_symbol(original)
        mapping[original] = canonical
        if canonical not in resolved_list:
            resolved_list.append(canonical)
            
    return resolved_list, mapping


def get_search_suggestions(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """
    Provides instant autocomplete suggestions for search queries.
    Checks alias table first, then merges with live Yahoo Finance search results.
    """
    results = []
    seen = set()
    q_clean = query.strip().upper()
    if not q_clean:
        return []

    # 1. Match local alias dictionary
    for alias, canonical in TICKER_ALIASES.items():
        if alias.startswith(q_clean) or q_clean in alias:
            if canonical not in seen:
                seen.add(canonical)
                results.append({
                    'symbol': canonical,
                    'shortname': f"{alias.title()} (Auto-Resolved)",
                    'exchDisp': 'NSE' if canonical.endswith('.NS') else 'BSE'
                })
        if len(results) >= 3:
            break

    # 2. Fetch from Yahoo Finance Search API
    url = f'https://query2.finance.yahoo.com/v1/finance/search?q={q_clean}'
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    try:
        res = requests.get(url, headers=headers, timeout=3)
        if res.status_code == 200:
            quotes = res.json().get('quotes', [])
            for q in quotes:
                sym = q.get('symbol')
                if sym and sym not in seen:
                    seen.add(sym)
                    results.append({
                        'symbol': sym,
                        'shortname': q.get('shortname', sym),
                        'exchDisp': q.get('exchDisp', '')
                    })
                if len(results) >= max_results:
                    break
    except Exception:
        pass

    return results[:max_results]
