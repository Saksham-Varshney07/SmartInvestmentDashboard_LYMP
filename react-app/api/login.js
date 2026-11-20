// Serverless authentication and user registry endpoint for Vercel
// Supports registration and strict password verification

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

// Persistent in-memory map across lambda warmup invocations
const userStore = new Map();
initialUsers.forEach(u => userStore.set(u.username.toLowerCase(), u));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

      if (userStore.has(key)) {
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

      userStore.set(key, newUser);

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
    const existing = userStore.get(key);
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
