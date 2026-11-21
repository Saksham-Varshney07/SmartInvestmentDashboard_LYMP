// Serverless portfolio storage and sync endpoint for Vercel
// Backed by persistent cloud storage (GitHub Gist)

const GIST_ID = process.env.GIST_ID || '342a9ebbf685161fd3b737938ac6f337';
const GIST_TOKEN = process.env.GIST_TOKEN || '';

const DEFAULT_REAL_TX = [
  { id: 1, symbol: 'RELIANCE.NS', transaction_type: 'BUY', shares: 35, price_at_purchase: 1280.0, created_at: '2026-10-15' },
  { id: 2, symbol: 'TCS.NS', transaction_type: 'BUY', shares: 18, price_at_purchase: 2360.0, created_at: '2026-10-20' },
  { id: 3, symbol: 'TATASTEEL.NS', transaction_type: 'BUY', shares: 200, price_at_purchase: 145.0, created_at: '2026-10-25' },
  { id: 4, symbol: 'INFY.NS', transaction_type: 'BUY', shares: 24, price_at_purchase: 1380.0, created_at: '2026-11-01' }
];

const DEFAULT_SANDBOX_TX = [
  { id: 101, symbol: 'TATAMOTORS.NS', transaction_type: 'BUY', shares: 150, price_at_purchase: 410.0, created_at: '2026-09-20' },
  { id: 102, symbol: 'ICICIBANK.NS', transaction_type: 'BUY', shares: 40, price_at_purchase: 1490.0, created_at: '2026-10-18' },
  { id: 103, symbol: 'TATASTEEL.NS', transaction_type: 'BUY', shares: 300, price_at_purchase: 142.0, created_at: '2026-10-28' }
];

const STOCK_PRICES = {
  'RELIANCE.NS': { name: 'Reliance Industries', price: 1324.40, sector: 'Energy', risk: 'Low' },
  'TCS.NS': { name: 'Tata Consultancy Services', price: 2475.40, sector: 'Technology', risk: 'Low' },
  'TATASTEEL.NS': { name: 'Tata Steel Ltd', price: 188.00, sector: 'Metals & Mining', risk: 'Moderate' },
  'INFY.NS': { name: 'Infosys Ltd', price: 1422.50, sector: 'Technology', risk: 'Low' },
  'HDFCBANK.NS': { name: 'HDFC Bank', price: 994.20, sector: 'Financial Services', risk: 'Low' },
  'ICICIBANK.NS': { name: 'ICICI Bank', price: 1250.00, sector: 'Financial Services', risk: 'Low' },
  'TATAMOTORS.NS': { name: 'Tata Motors', price: 780.00, sector: 'Automobile', risk: 'Moderate' },
  'SBIN.NS': { name: 'State Bank of India', price: 810.00, sector: 'Financial Services', risk: 'Moderate' },
  'ITC.NS': { name: 'ITC Ltd', price: 470.00, sector: 'Consumer Goods', risk: 'Low' },
  'BHARTIARTL.NS': { name: 'Bharti Airtel', price: 1600.00, sector: 'Telecommunications', risk: 'Moderate' }
};

let localPortfolioCache = null;
let lastPortfolioFetch = 0;

async function fetchRemotePortfolios() {
  if (localPortfolioCache && (Date.now() - lastPortfolioFetch < 10000)) {
    return localPortfolioCache;
  }

  const map = {
    '1_real': [...DEFAULT_REAL_TX],
    '1_sandbox': [...DEFAULT_SANDBOX_TX],
    'saksham_real': [...DEFAULT_REAL_TX],
    'saksham_sandbox': [...DEFAULT_SANDBOX_TX]
  };

  if (!GIST_ID) {
    localPortfolioCache = map;
    return map;
  }

  try {
    const headers = {
      'User-Agent': 'SmartInvestmentDashboard-Vercel',
      'Accept': 'application/vnd.github+json'
    };
    if (GIST_TOKEN) {
      headers['Authorization'] = `Bearer ${GIST_TOKEN}`;
    }

    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers,
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.files?.['portfolios.json']?.content;
      if (content) {
        const parsed = JSON.parse(content);
        Object.assign(map, parsed);
        localPortfolioCache = map;
        lastPortfolioFetch = Date.now();
      }
    }
  } catch (e) {
    console.warn('Failed to load remote portfolios:', e);
  }

  localPortfolioCache = map;
  return map;
}

async function saveRemotePortfolios(portfoliosObj) {
  localPortfolioCache = portfoliosObj;
  lastPortfolioFetch = Date.now();

  if (!GIST_ID || !GIST_TOKEN) return false;

  try {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        'User-Agent': 'SmartInvestmentDashboard-Vercel',
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${GIST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: 'Smart Investment User Registry',
        files: {
          'portfolios.json': {
            content: JSON.stringify(portfoliosObj, null, 2)
          }
        }
      })
    });
    return res.ok;
  } catch (e) {
    console.error('Failed to save portfolios to Gist:', e);
    return false;
  }
}

function calculatePortfolio(txList) {
  const holdingsMap = {};
  (txList || []).forEach(tx => {
    const sym = (tx.symbol || '').toUpperCase();
    if (!sym) return;

    if (!holdingsMap[sym]) {
      const info = STOCK_PRICES[sym] || {
        price: tx.price_at_purchase || 100,
        name: sym.replace(/\.(NS|BO)$/i, ''),
        sector: 'Equities',
        risk: 'Moderate'
      };
      holdingsMap[sym] = {
        ticker: tx.symbol,
        name: info.name,
        shares: 0,
        total_cost: 0,
        current_price: info.price,
        sector: info.sector,
        risk_flag: info.risk
      };
    }

    const shares = parseFloat(tx.shares) || 0;
    const price = parseFloat(tx.price_at_purchase) || 0;

    if (tx.transaction_type === 'BUY') {
      holdingsMap[sym].shares += shares;
      holdingsMap[sym].total_cost += shares * price;
    } else if (tx.transaction_type === 'SELL') {
      holdingsMap[sym].shares = Math.max(0, holdingsMap[sym].shares - shares);
      holdingsMap[sym].total_cost = Math.max(0, holdingsMap[sym].total_cost - shares * price);
    }
  });

  const assets = Object.values(holdingsMap)
    .filter(a => a.shares > 0)
    .map(a => {
      const avg_cost = a.shares > 0 ? a.total_cost / a.shares : a.current_price;
      const total_value = a.shares * a.current_price;
      const total_profit = total_value - a.total_cost;
      const return_pct = a.total_cost > 0 ? (total_profit / a.total_cost) * 100 : 0;

      const assetTx = (txList || []).filter(t => (t.symbol || '').toUpperCase() === a.ticker.toUpperCase());
      const history = assetTx.map(t => ({
        type: t.transaction_type,
        shares: parseFloat(t.shares) || 0,
        price: parseFloat(t.price_at_purchase) || 0,
        date: t.created_at || new Date().toISOString().split('T')[0]
      }));

      return {
        ticker: a.ticker,
        symbol: a.ticker,
        name: a.name,
        shares: a.shares,
        avg_cost: Number(avg_cost.toFixed(2)),
        invested: Number(a.total_cost.toFixed(2)),
        current_price: Number(a.current_price.toFixed(2)),
        live_price: Number(a.current_price.toFixed(2)),
        total_value: Number(total_value.toFixed(2)),
        current_value: Number(total_value.toFixed(2)),
        total_profit: Number(total_profit.toFixed(2)),
        profit: Number(total_profit.toFixed(2)),
        return_pct: Number(return_pct.toFixed(2)),
        profit_pct: Number(return_pct.toFixed(2)),
        sector: a.sector,
        risk_flag: a.risk_flag,
        history
      };
    });

  const total_investment = assets.reduce((sum, a) => sum + (a.shares * a.avg_cost), 0);
  const portfolio_value = assets.reduce((sum, a) => sum + a.total_value, 0);
  const total_profit = portfolio_value - total_investment;
  const total_profit_pct = total_investment > 0 ? (total_profit / total_investment) * 100 : 0;

  assets.forEach(a => {
    a.allocation_pct = portfolio_value > 0 ? Number(((a.total_value / portfolio_value) * 100).toFixed(1)) : 0;
  });

  const recent_activity = (txList || []).slice().reverse().map(tx => ({
    id: tx.id,
    ticker: tx.symbol,
    symbol: tx.symbol,
    type: tx.transaction_type,
    transaction_type: tx.transaction_type,
    shares: tx.shares,
    price: tx.price_at_purchase,
    price_at_purchase: tx.price_at_purchase,
    total: tx.shares * tx.price_at_purchase,
    date: tx.created_at || 'Recently',
    created_at: tx.created_at || 'Recently'
  }));

  return {
    status: 'success',
    summary: {
      total_investment: Number(total_investment.toFixed(2)),
      portfolio_value: Number(portfolio_value.toFixed(2)),
      total_profit: Number(total_profit.toFixed(2)),
      total_profit_pct: Number(total_profit_pct.toFixed(2)),
      xirr: total_profit_pct > 0 ? Number((total_profit_pct * 1.5).toFixed(2)) : 0.0
    },
    assets,
    recent_activity
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const portfolios = await fetchRemotePortfolios();

  if (req.method === 'GET') {
    const rawUserId = req.query.user_id || req.query.userId || 'guest';
    const type = req.query.type === 'sandbox' ? 'sandbox' : 'real';
    const uid = String(rawUserId).toLowerCase();
    const key = `${uid}_${type}`;

    const isDemo = (uid === '1' || uid === 'saksham');
    let txList = portfolios[key];

    if (!txList) {
      if (isDemo) {
        txList = type === 'real' ? [...DEFAULT_REAL_TX] : [...DEFAULT_SANDBOX_TX];
      } else {
        txList = [];
      }
    }

    const result = calculatePortfolio(txList);
    return res.status(200).json(result);
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  if (req.method === 'POST' || req.method === 'PUT') {
    const txData = body;
    const rawUserId = txData.user_id || req.query.user_id || 'guest';
    const type = txData.portfolio_type || req.query.type || 'real';
    const uid = String(rawUserId).toLowerCase();
    const key = `${uid}_${type}`;

    let list = Array.isArray(portfolios[key]) ? [...portfolios[key]] : [];

    if (txData.id) {
      list = list.map(item => item.id === txData.id ? { ...item, ...txData } : item);
    } else {
      const newTx = {
        ...txData,
        id: Date.now(),
        created_at: new Date().toISOString().split('T')[0]
      };
      list.push(newTx);
    }

    portfolios[key] = list;
    await saveRemotePortfolios(portfolios);
    return res.status(200).json({ status: 'success' });
  }

  if (req.method === 'DELETE') {
    const txId = Number(req.query.tx_id || req.query.id || body.id);
    const rawUserId = req.query.user_id || body.user_id || 'guest';
    const type = req.query.type || body.type || 'real';
    const uid = String(rawUserId).toLowerCase();
    const key = `${uid}_${type}`;

    if (Array.isArray(portfolios[key])) {
      portfolios[key] = portfolios[key].filter(tx => tx.id !== txId);
      await saveRemotePortfolios(portfolios);
    }

    return res.status(200).json({ status: 'success' });
  }

  return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
}
