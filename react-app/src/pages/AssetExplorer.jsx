import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ASSET_UNIVERSE = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', type: 'Stock', sector: 'Energy' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', type: 'Stock', sector: 'IT' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', type: 'Stock', sector: 'Banking' },
  { symbol: 'INFY.NS', name: 'Infosys Ltd', type: 'Stock', sector: 'IT' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', type: 'Stock', sector: 'Banking' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', type: 'Stock', sector: 'Banking' },
  { symbol: 'ITC.NS', name: 'ITC Limited', type: 'Stock', sector: 'FMCG' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro', type: 'Stock', sector: 'Infra' },
  { symbol: 'BTC-USD', name: 'Bitcoin', type: 'Crypto', sector: 'Cryptocurrency' },
  { symbol: 'ETH-USD', name: 'Ethereum', type: 'Crypto', sector: 'Cryptocurrency' },
  { symbol: 'GC=F', name: 'Gold Futures', type: 'Commodity', sector: 'Precious Metal' },
  { symbol: 'SI=F', name: 'Silver Futures', type: 'Commodity', sector: 'Precious Metal' },
];

const TYPE_COLORS = {
  Stock: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  Crypto: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  Commodity: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
};

export default function AssetExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [assetData, setAssetData] = useState({});
  const [loading, setLoading] = useState({});
  const navigate = useNavigate();

  const filtered = ASSET_UNIVERSE.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'All' || a.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const analyzeAsset = async (symbol) => {
    if (assetData[symbol]) {
      navigate(`/search/${symbol}`);
      return;
    }
    setLoading(prev => ({ ...prev, [symbol]: true }));
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/analyze/${symbol}`);
      const result = await res.json();
      if (result?.analysis) {
        setAssetData(prev => ({ ...prev, [symbol]: result.analysis }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(prev => ({ ...prev, [symbol]: false }));
    }
  };

  const getRiskBadge = (risk) => {
    if (!risk) return null;
    const map = {
      'High': { cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800', icon: 'trending_down' },
      'Moderate': { cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800', icon: 'trending_flat' },
      'Low': { cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800', icon: 'trending_up' },
    };
    const m = map[risk] || map['Moderate'];
    return (
      <span className={`text-xs font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${m.cls}`}>
        <span className="material-symbols-outlined text-[13px]">{m.icon}</span>
        {risk} Risk
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-slate-950 antialiased font-['Inter'] transition-colors duration-300">
      <main className="max-w-[1240px] mx-auto px-6 py-8 pb-32">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-4xl text-blue-600 dark:text-blue-400">travel_explore</span>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Asset Explorer</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-14">The world's first unified AI risk intelligence layer for Stocks, Crypto, and Commodities — all in one place.</p>
        </div>

        {/* USP 3 Callout */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl px-8 py-6 mb-10 text-white flex justify-between items-center shadow-lg">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-blue-200 mb-1">AI-Powered · Multi-Asset</p>
            <h2 className="text-2xl font-bold mb-1">One Intelligence Layer. Every Asset Class.</h2>
            <p className="text-blue-200 text-sm">Click on any asset below to run the ML pipeline and get instant risk scores with full Isolation Forest analysis.</p>
          </div>
          <span className="material-symbols-outlined text-[80px] text-blue-400/30 hidden md:block">hub</span>
        </div>

        {/* Search + Filter */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-8 transition-colors">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                placeholder="Search assets (e.g. TCS, Bitcoin, Gold...)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-transparent border border-slate-200 dark:border-slate-700 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              {['All', 'Stock', 'Crypto', 'Commodity'].map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeFilter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Asset Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(asset => {
            const tc = TYPE_COLORS[asset.type];
            const d = assetData[asset.symbol];
            const isLoading = loading[asset.symbol];
            return (
              <div key={asset.symbol} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md dark:hover:shadow-slate-800/50 transition-all hover:-translate-y-0.5 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">{asset.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{asset.symbol}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${tc.bg} ${tc.text} ${tc.border}`}>{asset.type}</span>
                  </div>

                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Sector: <strong className="text-slate-600 dark:text-slate-300">{asset.sector}</strong></p>

                  {d ? (
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">AI Risk Level</span>
                        {getRiskBadge(d.risk)}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Stability</span>
                        <span className={`text-xs font-bold ${d.stability === 'Stable' ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>{d.stability}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Yearly Return</span>
                        <span className={`text-xs font-bold ${d.yearly_return >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{d.yearly_return}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Volatility</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{(d.volatility * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-xs text-slate-400 italic">Click Analyze to run ML pipeline</div>
                  )}
                </div>

                <div className="px-6 pb-6 flex gap-2">
                  <button
                    onClick={() => analyzeAsset(asset.symbol)}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isLoading
                      ? <><span className="material-symbols-outlined text-sm animate-spin">data_usage</span> Analyzing...</>
                      : <><span className="material-symbols-outlined text-sm">psychology</span> {d ? 'View Full Analysis' : 'Analyze'}</>
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
