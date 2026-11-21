// Serverless authentication and user registry endpoint for Vercel
// Backed by persistent cloud storage (GitHub Gist) + in-memory fast caching

const GIST_ID = process.env.GIST_ID || '342a9ebbf685161fd3b737938ac6f337';
const GIST_TOKEN = process.env.GIST_TOKEN || '';

const initialUsers = [
  {
    username: 'saksham',
    password: 'saksham123',
    full_name: 'Saksham Varshney',
    risk_profile: 'Balanced',
    investment_horizon: 'Medium-term',
    user_id: 1,
    portfolio_id: 1
  }
];

// In-memory cache across warm Lambda invocations
const localCache = new Map();
initialUsers.forEach(u => localCache.set(u.username.toLowerCase(), u));
let lastRemoteFetch = 0;

async function fetchRemoteUsers() {
  const map = new Map();
  initialUsers.forEach(u => map.set(u.username.toLowerCase(), u));

  if (!GIST_ID) return map;

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
      const content = data.files?.['users.json']?.content || data.files?.['gistfile0.txt']?.content;
      if (content) {
        const parsed = JSON.parse(content);
        for (const [k, v] of Object.entries(parsed)) {
          if (k && v) {
            map.set(k.toLowerCase(), v);
            localCache.set(k.toLowerCase(), v);
          }
        }
        lastRemoteFetch = Date.now();
      }
    }
  } catch (err) {
    console.warn('Could not fetch remote users from Gist:', err.message);
  }

  return map;
}

async function saveUserToRemote(newUser) {
  localCache.set(newUser.username.toLowerCase(), newUser);

  if (!GIST_ID || !GIST_TOKEN) return false;

  try {
    const currentUsers = await fetchRemoteUsers();
    currentUsers.set(newUser.username.toLowerCase(), newUser);

    const usersObj = {};
    for (const [k, v] of currentUsers.entries()) {
      usersObj[k] = v;
    }

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
          'users.json': {
            content: JSON.stringify(usersObj, null, 2)
          }
        }
      })
    });

    return res.ok;
  } catch (err) {
    console.error('Failed to sync new user to Gist:', err);
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const users = await fetchRemoteUsers();
    return res.status(200).json({
      status: 'success',
      count: users.size
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    body = body || {};

    const username = (body.username || '').trim();
    const password = (body.password || '').trim();
    const isSignup = Boolean(body.is_signup);
    const fullName = (body.full_name || '').trim();
    const riskProfile = body.risk_profile || 'Balanced';
    const investmentHorizon = body.investment_horizon || 'Medium-term';

    if (!username) {
      return res.status(400).json({ status: 'error', message: 'Please enter a username.' });
    }

    if (!password) {
      return res.status(400).json({ status: 'error', message: 'Please enter a password.' });
    }

    const key = username.toLowerCase();

    if (isSignup) {
      if (password.length < 4) {
        return res.status(400).json({ status: 'error', message: 'Password must be at least 4 characters long.' });
      }

      // Check remote users across devices
      const remoteUsers = await fetchRemoteUsers();
      if (remoteUsers.has(key) || localCache.has(key)) {
        return res.status(409).json({ status: 'error', message: 'Username is already taken. Please choose another username or Log In.' });
      }

      const newId = Date.now();
      const newUser = {
        user_id: newId,
        portfolio_id: newId + 1,
        username: username,
        password: password,
        full_name: fullName || username,
        risk_profile: riskProfile,
        investment_horizon: investmentHorizon
      };

      await saveUserToRemote(newUser);

      return res.status(200).json({
        status: 'success',
        user_id: newUser.user_id,
        portfolio_id: newUser.portfolio_id,
        username: newUser.username,
        full_name: newUser.full_name,
        risk_profile: newUser.risk_profile,
        investment_horizon: newUser.investment_horizon
      });
    }

    // Normal Log In
    let existing = localCache.get(key);
    // If not in local in-memory cache or cache is older than 10s, fetch fresh from cloud storage
    if (!existing || (Date.now() - lastRemoteFetch > 10000)) {
      const remoteUsers = await fetchRemoteUsers();
      existing = remoteUsers.get(key) || localCache.get(key);
    }

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: "Account not found. Please click 'Sign up' to create an account."
      });
    }

    if (existing.password && existing.password !== password) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect password. Please verify and try again.'
      });
    }

    return res.status(200).json({
      status: 'success',
      user_id: existing.user_id,
      portfolio_id: existing.portfolio_id,
      username: existing.username,
      full_name: existing.full_name,
      risk_profile: existing.risk_profile,
      investment_horizon: existing.investment_horizon
    });

  } catch (err) {
    console.error('Login handler error:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error during authentication.' });
  }
}
