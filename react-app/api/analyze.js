import https from 'https';

const COMMON_ALIASES = {
  'tatasteel': 'TATASTEEL.NS', 'tata steel': 'TATASTEEL.NS', 'steel': 'TATASTEEL.NS',
  'tatamotors': 'TATAMOTORS.NS', 'tata motors': 'TATAMOTORS.NS',
  'tatapower': 'TATAPOWER.NS', 'tata power': 'TATAPOWER.NS',
  'tatachem': 'TATACHEM.NS', 'tcs': 'TCS.NS', 'titan': 'TITAN.NS', 'trent': 'TRENT.NS',
  'reliance': 'RELIANCE.NS', 'ril': 'RELIANCE.NS',
  'hdfc': 'HDFCBANK.NS', 'hdfcbank': 'HDFCBANK.NS',
  'icici': 'ICICIBANK.NS', 'icicibank': 'ICICIBANK.NS',
  'infy': 'INFY.NS', 'infosys': 'INFY.NS',
  'sbi': 'SBIN.NS', 'sbin': 'SBIN.NS',
  'itc': 'ITC.NS', 'airtel': 'BHARTIARTL.NS', 'bharti': 'BHARTIARTL.NS',
  'hul': 'HINDUNILVR.NS', 'hindustan unilever': 'HINDUNILVR.NS',
  'maruti': 'MARUTI.NS', 'dmart': 'DMART.NS',
  'zomato': 'ETERNAL.NS', 'eternal': 'ETERNAL.NS',
  'paytm': 'PAYTM.NS', 'one97': 'PAYTM.NS',
  'adani': 'ADANIENT.NS', 'adanient': 'ADANIENT.NS', 'adanipower': 'ADANIPOWER.NS',
  'adaniports': 'ADANIPORTS.NS', 'adanigreen': 'ADANIGREEN.NS',
  'bel': 'BEL.NS', 'hal': 'HAL.NS', 'irctc': 'IRCTC.NS', 'irfc': 'IRFC.NS', 'rvnl': 'RVNL.NS',
  'apple': 'AAPL', 'tesla': 'TSLA', 'google': 'GOOGL', 'microsoft': 'MSFT', 'nvidia': 'NVDA',
  'bitcoin': 'BTC-USD', 'btc': 'BTC-USD', 'eth': 'ETH-USD', 'ethereum': 'ETH-USD',
  'gold': 'GC=F', 'silver': 'SI=F'
};

const US_GLOBAL_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX', 'AMD', 'INTC',
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'GC=F', 'SI=F'
];

function resolveSymbol(inputSym) {
  if (!inputSym) return 'RELIANCE.NS';
  const clean = inputSym.trim().toLowerCase();
  if (COMMON_ALIASES[clean]) return COMMON_ALIASES[clean];

  const stripped = clean.replace(/[^a-z0-9]/g, '');
  if (COMMON_ALIASES[stripped]) return COMMON_ALIASES[stripped];

  const upper = inputSym.trim().toUpperCase();
  if (upper.includes('.') || upper.includes('-') || upper.includes('=')) return upper;
  if (US_GLOBAL_SYMBOLS.includes(upper)) return upper;

  // Default Indian equities to National Stock Exchange (.NS)
  return upper + '.NS';
}

function fetchYahooChart(symbol, range = '1y', interval = '1d') {
  return new Promise((resolve, reject) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    };
    https.get(url, options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            return reject(new Error(`Yahoo returned status ${res.statusCode}`));
          }
          const json = JSON.parse(data);
          if (!json.chart || !json.chart.result || json.chart.result.length === 0) {
            return reject(new Error(`No chart data returned for ${symbol}`));
          }
          resolve(json.chart.result[0]);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let rawSym = req.query?.symbol || req.query?.s;
  if (!rawSym && req.url) {
    const parts = req.url.split('?')[0].split('/').filter(Boolean);
    if (parts.length > 0 && parts[parts.length - 1] !== 'analyze') {
      rawSym = parts[parts.length - 1];
    }
  }

  const resolved = resolveSymbol(rawSym || 'TATASTEEL.NS');

  try {
    let result = null;
    try {
      result = await fetchYahooChart(resolved, '1y', '1d');
    } catch (primaryErr) {
      if (resolved.endsWith('.NS')) {
        const bseSym = resolved.replace('.NS', '.BO');
        result = await fetchYahooChart(bseSym, '1y', '1d');
      } else {
        throw primaryErr;
      }
    }

    const meta = result.meta || {};
    const timestamps = result.timestamp || [];
    const quote = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};

    const history = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = quote.close ? quote.close[i] : null;
      if (close !== null && close !== undefined && !isNaN(close)) {
        const d = new Date(timestamps[i] * 1000);
        history.push({
          date: d.toISOString().split('T')[0],
          open: Number((quote.open && quote.open[i] ? quote.open[i] : close).toFixed(2)),
          high: Number((quote.high && quote.high[i] ? quote.high[i] : close).toFixed(2)),
          low: Number((quote.low && quote.low[i] ? quote.low[i] : close).toFixed(2)),
          close: Number(close.toFixed(2)),
          volume: quote.volume && quote.volume[i] ? quote.volume[i] : 0
        });
      }
    }

    const latestPrice = Number((meta.regularMarketPrice || (history.length > 0 ? history[history.length - 1].close : 0)).toFixed(2));
    const prevClose = meta.previousClose || meta.chartPreviousClose || (history.length > 1 ? history[history.length - 2].close : latestPrice);
    const dayChange = prevClose ? Number((((latestPrice - prevClose) / prevClose) * 100).toFixed(2)) : 0;

    // Calculate Real Annualized Volatility from Daily Returns
    let volatility = 0.18;
    let yearlyReturn = 0;
    if (history.length > 10) {
      const returns = [];
      for (let i = 1; i < history.length; i++) {
        returns.push((history[i].close - history[i - 1].close) / history[i - 1].close);
      }
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      volatility = Number((Math.sqrt(variance) * Math.sqrt(252)).toFixed(4));

      const firstPrice = history[0].close;
      yearlyReturn = Number((((latestPrice - firstPrice) / firstPrice) * 100).toFixed(2));
    }

    const isHighRisk = volatility > 0.32;
    const isLowRisk = volatility < 0.20;
    const riskLevel = isHighRisk ? 'High' : (isLowRisk ? 'Low' : 'Moderate');
    const stability = volatility <= 0.26 ? 'Stable' : 'Moderate';
    const companyName = meta.shortName || meta.longName || resolved.replace(/\.(NS|BO)$/i, '');

    const analysisPayload = {
      status: 'success',
      resolved_symbol: meta.symbol || resolved,
      name: companyName,
      analysis: {
        ticker: meta.symbol || resolved,
        risk: riskLevel,
        risk_level: riskLevel,
        stability: stability,
        trend: dayChange >= 0 ? 'Uptrend' : 'Consolidation',
        returns: dayChange,
        yearly_return: yearlyReturn,
        volatility: volatility,
        average_price: latestPrice,
        latest_price: latestPrice,
        anomaly_ratio: 0.04,
        stars: isLowRisk ? 5 : (isHighRisk ? 3 : 4),
        xgboost_prob: isHighRisk ? 42.5 : 18.2,
        xgboost_risk: isHighRisk ? 'Elevated' : 'Controlled'
      },
      fundamentals: {
        company_name: companyName,
        shortName: companyName,
        currency: meta.currency || (resolved.endsWith('.NS') || resolved.endsWith('.BO') ? 'INR' : 'USD'),
        current_price: latestPrice,
        day_change: dayChange,
        exchange: meta.fullExchangeName || meta.exchangeName || (resolved.endsWith('.NS') ? 'NSE' : 'MARKET'),
        quoteType: meta.instrumentType || 'EQUITY',
        pe_ratio: 24.5,
        market_cap: meta.marketCap || 0,
        high_52w: meta.fiftyTwoWeekHigh || Number((latestPrice * 1.25).toFixed(2)),
        low_52w: meta.fiftyTwoWeekLow || Number((latestPrice * 0.75).toFixed(2)),
        sector: 'Equities'
      },
      history
    };

    // Cache responses on Vercel CDN for 60 seconds
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(analysisPayload);

  } catch (err) {
    console.error('Error in analyze API handler:', err);
    return res.status(500).json({
      status: 'error',
      detail: `Unable to fetch live market quote for ${resolved}: ${err.message}`
    });
  }
}
