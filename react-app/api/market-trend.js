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

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let cachedSession = null;
let sessionExpiresAt = 0;

function getYahooSession() {
  const now = Date.now();
  if (cachedSession && now < sessionExpiresAt) {
    return Promise.resolve(cachedSession);
  }

  return new Promise((resolve) => {
    const req = https.get('https://fc.yahoo.com', { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      const setCookie = res.headers['set-cookie'];
      let cookie = '';
      if (setCookie && setCookie.length > 0) {
        cookie = setCookie.map(c => c.split(';')[0]).join('; ');
      }
      if (!cookie) return resolve(null);

      https.get('https://query2.finance.yahoo.com/v1/test/getcrumb', {
        headers: { 'User-Agent': USER_AGENT, 'Cookie': cookie }
      }, (crumbRes) => {
        let crumb = '';
        crumbRes.on('data', d => crumb += d);
        crumbRes.on('end', () => {
          if (crumb && crumbRes.statusCode === 200) {
            cachedSession = { cookie, crumb: crumb.trim() };
            sessionExpiresAt = Date.now() + (1000 * 60 * 30);
            resolve(cachedSession);
          } else {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(3500, () => { req.destroy(); resolve(null); });
  });
}

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

  try {
    const session = await getYahooSession();
    let url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
    const headers = { 'User-Agent': USER_AGENT, 'Accept': 'application/json' };

    if (session && session.crumb) {
      url += `&crumb=${encodeURIComponent(session.crumb)}`;
      headers['Cookie'] = session.cookie;
    }

    const data = await new Promise((resolve, reject) => {
      const request = https.get(url, { headers }, response => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      });
      request.on('error', reject);
      request.setTimeout(4500, () => { request.destroy(); reject(new Error('Timeout')); });
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
