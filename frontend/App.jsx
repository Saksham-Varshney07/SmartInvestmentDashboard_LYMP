import React, { useState } from 'react';

const API_URL = 'http://localhost:5000/features';

function App() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleExtract = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${API_URL}?symbol=${symbol}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error fetching data');
      setResult(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Stock Feature Extraction Demo</h1>
      <div className="input-section">
        <input
          type="text"
          placeholder="Enter stock symbol (e.g., AAPL, BTC-USD)"
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
        />
        <button onClick={handleExtract} disabled={loading || !symbol}>
          {loading ? 'Extracting...' : 'Extract Features'}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      {result && (
        <>
          <h2>Extracted Features</h2>
          <table className="features-table">
            <tbody>
              <tr><td>Symbol</td><td>{result.symbol}</td></tr>
              <tr><td>Latest Close</td><td>{result.latest_close}</td></tr>
              <tr><td>Returns (%)</td><td>{result.returns.toFixed(2)}</td></tr>
              <tr>
                <td>Trend</td>
                <td style={{color: result.trend === 'Uptrend' ? 'green' : 'red'}}>{result.trend}</td>
              </tr>
              <tr><td>Volatility</td><td>{result.volatility.toFixed(2)}</td></tr>
              <tr><td>Average Price</td><td>{result.average_price.toFixed(2)}</td></tr>
            </tbody>
          </table>
          <h2>Raw OHLCV Data (Last 7 Days)</h2>
          <div className="table-container">
            <table className="raw-table">
              <thead>
                <tr>
                  <th>Date</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {result.raw.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.Date ? new Date(row.Date).toLocaleDateString() : ''}</td>
                    <td>{row.Open}</td>
                    <td>{row.High}</td>
                    <td>{row.Low}</td>
                    <td>{row.Close}</td>
                    <td>{row.Volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
