import https from 'https';

const POPULAR_STOCKS = [
  { symbol: 'TATASTEEL.NS', shortname: 'Tata Steel Ltd', exchDisp: 'NSE', keywords: ['tatasteel', 'tata steel', 'steel', 'metals'] },
  { symbol: 'TATAMOTORS.NS', shortname: 'Tata Motors Ltd', exchDisp: 'NSE', keywords: ['tatamotors', 'tata motors', 'auto', 'motors'] },
  { symbol: 'TCS.NS', shortname: 'Tata Consultancy Services Ltd', exchDisp: 'NSE', keywords: ['tcs', 'tata consultancy', 'tech', 'it'] },
  { symbol: 'TATAPOWER.NS', shortname: 'Tata Power Company Ltd', exchDisp: 'NSE', keywords: ['tatapower', 'tata power', 'energy', 'power'] },
  { symbol: 'RELIANCE.NS', shortname: 'Reliance Industries Ltd', exchDisp: 'NSE', keywords: ['reliance', 'ril', 'jio', 'oil', 'telecom'] },
  { symbol: 'HDFCBANK.NS', shortname: 'HDFC Bank Ltd', exchDisp: 'NSE', keywords: ['hdfc', 'hdfcbank', 'hdfc bank', 'bank'] },
  { symbol: 'ICICIBANK.NS', shortname: 'ICICI Bank Ltd', exchDisp: 'NSE', keywords: ['icici', 'icicibank', 'icici bank', 'bank'] },
  { symbol: 'SBIN.NS', shortname: 'State Bank of India', exchDisp: 'NSE', keywords: ['sbi', 'sbin', 'state bank of india', 'bank'] },
  { symbol: 'INFY.NS', shortname: 'Infosys Ltd', exchDisp: 'NSE', keywords: ['infosys', 'infy', 'it', 'tech'] },
  { symbol: 'ITC.NS', shortname: 'ITC Ltd', exchDisp: 'NSE', keywords: ['itc', 'fmcg', 'tobacco'] },
  { symbol: 'LT.NS', shortname: 'Larsen & Toubro Ltd', exchDisp: 'NSE', keywords: ['lt', 'larsen', 'toubro', 'infra', 'infrastructure'] },
  { symbol: 'BHARTIARTL.NS', shortname: 'Bharti Airtel Ltd', exchDisp: 'NSE', keywords: ['airtel', 'bharti', 'bhartiartl', 'telecom'] },
  { symbol: 'ADANIENT.NS', shortname: 'Adani Enterprises Ltd', exchDisp: 'NSE', keywords: ['adani', 'adanient', 'adani enterprises'] },
  { symbol: 'ADANIGREEN.NS', shortname: 'Adani Green Energy Ltd', exchDisp: 'NSE', keywords: ['adanigreen', 'adani green', 'green energy'] },
  { symbol: 'HINDUNILVR.NS', shortname: 'Hindustan Unilever Ltd', exchDisp: 'NSE', keywords: ['hul', 'hindunilvr', 'unilever', 'fmcg'] },
  { symbol: 'BAJFINANCE.NS', shortname: 'Bajaj Finance Ltd', exchDisp: 'NSE', keywords: ['bajaj finance', 'bajfinance', 'bajaj', 'nbfc'] },
  { symbol: 'ZOMATO.NS', shortname: 'Zomato Ltd', exchDisp: 'NSE', keywords: ['zomato', 'food', 'delivery'] },
  { symbol: 'TRENT.NS', shortname: 'Trent Ltd', exchDisp: 'NSE', keywords: ['trent', 'zudio', 'westside', 'retail'] },
  { symbol: 'RVNL.NS', shortname: 'Rail Vikas Nigam Ltd', exchDisp: 'NSE', keywords: ['rvnl', 'railway', 'rail vikas'] },
  { symbol: 'MARUTI.NS', shortname: 'Maruti Suzuki India Ltd', exchDisp: 'NSE', keywords: ['maruti', 'suzuki', 'auto'] },
  { symbol: 'SUNPHARMA.NS', shortname: 'Sun Pharmaceutical Industries', exchDisp: 'NSE', keywords: ['sun', 'sunpharma', 'pharma', 'health'] },
  { symbol: 'TITAN.NS', shortname: 'Titan Company Ltd', exchDisp: 'NSE', keywords: ['titan', 'tanishq', 'jewellery'] },
  { symbol: 'KOTAKBANK.NS', shortname: 'Kotak Mahindra Bank', exchDisp: 'NSE', keywords: ['kotak', 'kotakbank', 'bank'] },
  { symbol: 'WIPRO.NS', shortname: 'Wipro Ltd', exchDisp: 'NSE', keywords: ['wipro', 'tech', 'it'] },
  { symbol: 'AXISBANK.NS', shortname: 'Axis Bank Ltd', exchDisp: 'NSE', keywords: ['axis', 'axisbank', 'bank'] },
  { symbol: 'ULTRACEMCO.NS', shortname: 'UltraTech Cement Ltd', exchDisp: 'NSE', keywords: ['ultratech', 'cement'] },
  { symbol: 'ASIANPAINT.NS', shortname: 'Asian Paints Ltd', exchDisp: 'NSE', keywords: ['asian paints', 'paint'] },
  { symbol: 'POWERGRID.NS', shortname: 'Power Grid Corp of India', exchDisp: 'NSE', keywords: ['powergrid', 'power grid', 'energy'] },
  { symbol: 'NTPC.NS', shortname: 'NTPC Ltd', exchDisp: 'NSE', keywords: ['ntpc', 'power', 'energy'] },
  { symbol: 'ONGC.NS', shortname: 'Oil & Natural Gas Corp', exchDisp: 'NSE', keywords: ['ongc', 'oil', 'gas'] },
  { symbol: 'COALINDIA.NS', shortname: 'Coal India Ltd', exchDisp: 'NSE', keywords: ['coal', 'coalindia', 'mining'] },
  { symbol: 'JSWSTEEL.NS', shortname: 'JSW Steel Ltd', exchDisp: 'NSE', keywords: ['jsw', 'jswsteel', 'steel'] },
  { symbol: 'HINDALCO.NS', shortname: 'Hindalco Industries Ltd', exchDisp: 'NSE', keywords: ['hindalco', 'metals'] },
  { symbol: 'NESTLEIND.NS', shortname: 'Nestle India Ltd', exchDisp: 'NSE', keywords: ['nestle', 'maggi', 'fmcg'] },
  { symbol: 'M&M.NS', shortname: 'Mahindra & Mahindra Ltd', exchDisp: 'NSE', keywords: ['mahindra', 'm&m', 'auto'] },
  { symbol: 'AAPL', shortname: 'Apple Inc.', exchDisp: 'NASDAQ', keywords: ['apple', 'aapl', 'iphone', 'tech'] },
  { symbol: 'MSFT', shortname: 'Microsoft Corporation', exchDisp: 'NASDAQ', keywords: ['microsoft', 'msft', 'tech'] },
  { symbol: 'NVDA', shortname: 'NVIDIA Corporation', exchDisp: 'NASDAQ', keywords: ['nvidia', 'nvda', 'ai', 'chips'] },
  { symbol: 'GOOGL', shortname: 'Alphabet Inc.', exchDisp: 'NASDAQ', keywords: ['google', 'googl', 'tech'] },
  { symbol: 'AMZN', shortname: 'Amazon.com, Inc.', exchDisp: 'NASDAQ', keywords: ['amazon', 'amzn', 'ecommerce'] },
  { symbol: 'META', shortname: 'Meta Platforms, Inc.', exchDisp: 'NASDAQ', keywords: ['meta', 'facebook', 'instagram'] },
  { symbol: 'TSLA', shortname: 'Tesla, Inc.', exchDisp: 'NASDAQ', keywords: ['tesla', 'tsla', 'ev'] },
  { symbol: 'BTC-USD', shortname: 'Bitcoin (USD)', exchDisp: 'CRYPTO', keywords: ['bitcoin', 'btc', 'crypto'] },
  { symbol: 'ETH-USD', shortname: 'Ethereum (USD)', exchDisp: 'CRYPTO', keywords: ['ethereum', 'eth', 'crypto'] },
  { symbol: 'GC=F', shortname: 'Gold Futures', exchDisp: 'COMMODITY', keywords: ['gold', 'commodity'] },
  { symbol: 'SI=F', shortname: 'Silver Futures', exchDisp: 'COMMODITY', keywords: ['silver', 'commodity'] }
];

function searchLocalCatalog(query) {
  const qClean = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!qClean) return [];

  return POPULAR_STOCKS.filter(stock => {
    const symClean = stock.symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameClean = stock.shortname.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (symClean.includes(qClean) || nameClean.includes(qClean)) return true;
    if (stock.keywords && stock.keywords.some(k => k.replace(/[^a-z0-9]/g, '').includes(qClean))) return true;
    return false;
  }).map(s => ({
    symbol: s.symbol,
    shortname: s.shortname,
    exchDisp: s.exchDisp
  }));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const q = req.query.q || '';
  if (!q || q.trim().length === 0) {
    return res.status(200).json({ results: [] });
  }

  const localMatches = searchLocalCatalog(q);

  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;

  try {
    const data = await new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        timeout: 2500
      };
      const request = https.get(url, options, response => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ quotes: [] });
          }
        });
      });
      request.on('error', () => resolve({ quotes: [] }));
      request.on('timeout', () => {
        request.destroy();
        resolve({ quotes: [] });
      });
    });

    const quotes = data.quotes || [];
    const yahooResults = quotes
      .filter(item => item.symbol && (item.quoteType === 'EQUITY' || item.quoteType === 'CRYPTOCURRENCY' || item.quoteType === 'COMMODITY' || item.quoteType === 'ETF'))
      .map(item => ({
        symbol: item.symbol,
        shortname: item.shortname || item.longname || item.symbol,
        exchDisp: item.exchange || 'MARKET'
      }));

    // Deduplicate and merge: local prioritized for exact/clean match, plus Yahoo results
    const seen = new Set();
    const merged = [];

    for (const item of [...localMatches, ...yahooResults]) {
      if (!seen.has(item.symbol)) {
        seen.add(item.symbol);
        merged.push(item);
      }
    }

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({ results: merged });

  } catch (err) {
    console.error('Search error:', err);
    return res.status(200).json({ results: localMatches });
  }
}
