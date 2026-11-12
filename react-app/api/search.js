import https from 'https';

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

  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;

  try {
    const data = await new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
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

    const quotes = data.quotes || [];
    const results = quotes
      .filter(item => item.symbol && (item.quoteType === 'EQUITY' || item.quoteType === 'CRYPTOCURRENCY' || item.quoteType === 'COMMODITY' || item.quoteType === 'ETF'))
      .map(item => ({
        symbol: item.symbol,
        shortname: item.shortname || item.longname || item.symbol,
        exchDisp: item.exchange || 'MARKET'
      }));

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({ results });

  } catch (err) {
    console.error('Search error:', err);
    return res.status(200).json({ results: [] });
  }
}
