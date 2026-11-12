import https from 'https';

const COMMON_ALIASES = {
  'tatasteel': 'TATASTEEL.NS', 'tata steel': 'TATASTEEL.NS',
  'tatamotors': 'TATAMOTORS.NS', 'tata motors': 'TATAMOTORS.NS',
  'tatapower': 'TATAPOWER.NS', 'tata power': 'TATAPOWER.NS',
  'tcs': 'TCS.NS', 'titan': 'TITAN.NS', 'trent': 'TRENT.NS',
  'reliance': 'RELIANCE.NS', 'ril': 'RELIANCE.NS',
  'hdfc': 'HDFCBANK.NS', 'hdfcbank': 'HDFCBANK.NS',
  'icici': 'ICICIBANK.NS', 'icicibank': 'ICICIBANK.NS',
  'infy': 'INFY.NS', 'sbi': 'SBIN.NS', 'itc': 'ITC.NS',
  'zomato': 'ETERNAL.NS', 'eternal': 'ETERNAL.NS', 'paytm': 'PAYTM.NS'
};

const US_GLOBAL_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX', 'AMD', 'INTC',
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'GC=F', 'SI=F'
];

function resolveSymbol(inputSym) {
  if (!inputSym) return 'RELIANCE.NS';
  const clean = inputSym.trim().toLowerCase();
  if (COMMON_ALIASES[clean]) return COMMON_ALIASES[clean];
  const upper = inputSym.trim().toUpperCase();
  if (upper.includes('.') || upper.includes('-') || upper.includes('=')) return upper;
  if (US_GLOBAL_SYMBOLS.includes(upper)) return upper;
  return upper + '.NS';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const symbol = resolveSymbol(req.query.symbol || 'TATASTEEL.NS');
  const timeframe = (req.query.timeframe || '1mo').toLowerCase();

  let range = '1mo';
  let interval = '1d';

  if (timeframe === '1d') {
    range = '1d';
    interval = '5m';
  } else if (timeframe === '5d' || timeframe === '1w') {
    range = '5d';
    interval = '15m';
  } else if (timeframe === '1m' || timeframe === '1mo') {
    range = '1mo';
    interval = '1d';
  } else if (timeframe === '3m' || timeframe === '3mo') {
    range = '3mo';
    interval = '1d';
  } else if (timeframe === '6m' || timeframe === '6mo') {
    range = '6mo';
    interval = '1d';
  } else if (timeframe === '1y') {
    range = '1y';
    interval = '1d';
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;

  try {
    const data = await new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      };
      https.get(url, options, response => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });

    const result = data.chart?.result?.[0];
    if (!result) {
      return res.status(404).json({ status: 'error', detail: `No trend data found for ${symbol}` });
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const points = [];
    const trend = [];

    for (let i = 0; i < timestamps.length; i++) {
      const close = quote.close?.[i];
      if (close !== null && close !== undefined && !isNaN(close)) {
        const val = Number(close.toFixed(2));
        trend.push(val);
        const d = new Date(timestamps[i] * 1000);
        points.push({
          date: d.toISOString(),
          close: val,
          high: quote.high?.[i] ? Number(quote.high[i].toFixed(2)) : val,
          low: quote.low?.[i] ? Number(quote.low[i].toFixed(2)) : val
        });
      }
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ status: 'success', symbol, trend, points });

  } catch (err) {
    console.error('Error fetching trend:', err);
    return res.status(500).json({ status: 'error', detail: err.message });
  }
}
