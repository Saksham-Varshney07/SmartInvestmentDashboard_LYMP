import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const txSearchRef = useRef(null);
  const txSearchTimeoutRef = useRef(null);
  const navigate = useNavigate();

  // Portfolio State
  const [currentUser, setCurrentUser] = useState(null);
  const [loginName, setLoginName] = useState('');
  const [portfolio, setPortfolio] = useState({
    summary: { total_investment: 0, portfolio_value: 0, total_profit: 0, total_profit_pct: 0 },
    assets: [],
    recent_activity: []
  });

  // Modal State
  const [showTxModal, setShowTxModal] = useState(false);
  const [txForm, setTxForm] = useState({ id: null, symbol: '', transaction_type: 'BUY', shares: '', price_at_purchase: '' });
  const [txSuggestions, setTxSuggestions] = useState([]);
  const [showTxSuggestions, setShowTxSuggestions] = useState(false);
  const [isTxSearching, setIsTxSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (txSearchRef.current && !txSearchRef.current.contains(event.target)) {
        setShowTxSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPortfolio = async () => {
    if (!currentUser) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/portfolio/${currentUser.user_id}`);
      const data = await res.json();
      if (data.status === 'success') {
        setPortfolio(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchPortfolio();
      const interval = setInterval(fetchPortfolio, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginName.trim()) return;
    try {
      const res = await fetch('http://127.0.0.1:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginName.trim() })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setCurrentUser(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitTransaction = async (e) => {
    e.preventDefault();
    if (!txForm.symbol || !txForm.shares || !txForm.price_at_purchase) return;
    
    try {
      const url = txForm.id 
        ? `http://127.0.0.1:8000/api/portfolio/transaction/${txForm.id}`
        : 'http://127.0.0.1:8000/api/portfolio/transaction';
      
      const method = txForm.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser?.user_id,
          symbol: txForm.symbol,
          transaction_type: txForm.transaction_type,
          shares: parseFloat(txForm.shares),
          price_at_purchase: parseFloat(txForm.price_at_purchase)
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowTxModal(false);
        setTxForm({ id: null, symbol: '', transaction_type: 'BUY', shares: '', price_at_purchase: '' });
        fetchPortfolio(); // Instant refresh
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditModal = (tx) => {
    setTxForm({
      id: tx.id,
      symbol: tx.symbol,
      transaction_type: tx.type,
      shares: tx.shares,
      price_at_purchase: tx.price
    });
    setShowTxModal(true);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsSearching(true);
    setShowSuggestions(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/search?q=${val}`);
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 400); 
  };

  const handleTxSearchChange = (e) => {
    const val = e.target.value;
    setTxForm({...txForm, symbol: val.toUpperCase()});
    if (txSearchTimeoutRef.current) clearTimeout(txSearchTimeoutRef.current);
    if (val.length < 2) {
      setTxSuggestions([]);
      setShowTxSuggestions(false);
      return;
    }
    setIsTxSearching(true);
    setShowTxSuggestions(true);
    txSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/search?q=${val}`);
        const data = await res.json();
        setTxSuggestions(data.results || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsTxSearching(false);
      }
    }, 400); 
  };

  const selectSymbol = (symbol) => {
    setSearchTerm(symbol);
    setShowSuggestions(false);
    navigate(`/search/${symbol}`);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && searchTerm) {
      navigate(`/search/${searchTerm}`);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  const navClass = "text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium tracking-tight";
  const activeNavClass = "text-blue-600 font-semibold border-b-2 border-blue-600 pb-1 text-sm tracking-tight";

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
           <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 mx-auto">
             <span className="material-symbols-outlined text-3xl">account_circle</span>
           </div>
           <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Welcome Back</h2>
           <p className="text-center text-slate-500 text-sm mb-8">Enter a username to load or create your live portfolio.</p>
           
           <form onSubmit={handleLogin} className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
               <input 
                 type="text" 
                 value={loginName}
                 onChange={e => setLoginName(e.target.value)}
                 className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 placeholder="Enter username"
                 required
               />
             </div>
             <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-md">
               Access Portfolio
             </button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen relative">
      
      {/* Navbar */}
      <header className="fixed top-0 w-full z-40 sticky glass-nav border-b border-slate-200/50 bg-white/80 backdrop-blur-md">
        <div className="flex justify-between items-center max-w-[1440px] mx-auto px-6 h-16">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold tracking-tight text-slate-900">Smart Investment Dashboard</span>
            <nav className="hidden md:flex gap-6 items-center">
              <Link className={activeNavClass} to="/">Dashboard</Link>
              <Link className={navClass} to="/riskanalysis">Risk Analysis</Link>
              <Link className={navClass} to="/portfolio">Portfolio</Link>
              <Link className={navClass} to="/sipplanner">SIP Planner</Link>
              <Link className={navClass} to="/assetexplorer">Asset Explorer</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 relative" ref={searchRef}>
            <div className="relative hidden sm:block">
              <input 
                className="bg-slate-100 border-none rounded-lg py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 w-64" 
                placeholder="Search markets..." 
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyPress}
                onClick={() => {if(searchTerm.length >= 2) setShowSuggestions(true);}}
              />
              <span className="material-symbols-outlined absolute left-3 top-1.5 text-slate-400 text-lg">search</span>
              
              {showSuggestions && (
                <div className="absolute top-12 left-0 w-[400px] border border-slate-200 bg-white rounded-lg shadow-xl z-[60] max-h-[80vh] overflow-y-auto mt-2">
                  {isSearching && <div className="p-4 text-sm text-slate-500 text-center">Searching internet...</div>}
                  {!isSearching && suggestions.length === 0 && <div className="p-4 text-sm text-slate-500 text-center">No results found.</div>}
                  {!isSearching && suggestions.map((s, i) => (
                    <div 
                      key={i} 
                      className="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex gap-4 items-center"
                      onClick={() => selectSymbol(s.symbol)}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                         <span className="material-symbols-outlined text-slate-400 text-sm">show_chart</span>
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-sm text-slate-900 truncate">{s.shortname || s.symbol}</div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">Stock • {s.symbol}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
               <div className="text-sm font-semibold text-slate-700">{currentUser.username}</div>
               <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase cursor-pointer" onClick={() => setCurrentUser(null)} title="Logout">
                 {currentUser.username[0]}
               </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-8 mb-20 lg:mb-0">
        
        {/* Dynamic Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] border border-slate-100 flex flex-col justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Total Investment</p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900">{formatCurrency(portfolio.summary.total_investment)}</h3>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-emerald-600 font-bold tracking-tight">Live updating</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] border border-slate-100 flex flex-col justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Live Portfolio Value</p>
              <div className="flex items-center gap-3">
                 <h3 className="text-2xl font-bold tracking-tight text-slate-900">{formatCurrency(portfolio.summary.portfolio_value)}</h3>
                 <button onClick={fetchPortfolio} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors" title="Refresh Live Prices">
                   <span className={`material-symbols-outlined text-sm ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}>refresh</span>
                 </button>
              </div>
            </div>
            <div className="mt-4 flex items-center text-blue-600 font-semibold text-sm">
              <span className="material-symbols-outlined text-sm mr-1">sync</span>
              <span>Auto-refreshing (5s)</span>
            </div>
          </div>

          <div className={`bg-white p-6 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] border-l-4 flex flex-col justify-between ${portfolio.summary.total_profit >= 0 ? 'border-emerald-500' : 'border-red-500'}`}>
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Total Profit/Loss</p>
              <h3 className={`text-2xl font-bold tracking-tight ${portfolio.summary.total_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {portfolio.summary.total_profit >= 0 ? '+' : ''}{formatCurrency(portfolio.summary.total_profit)}
              </h3>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`${portfolio.summary.total_profit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                {portfolio.summary.total_profit_pct > 0 ? '+' : ''}{portfolio.summary.total_profit_pct.toFixed(2)}% All Time
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] border border-slate-100 flex flex-col justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Active Assets</p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900">{portfolio.assets.length}</h3>
            </div>
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              {portfolio.assets.map((asset, i) => (
                <div key={i} className="h-full" style={{ width: `${asset.allocation_pct}%`, backgroundColor: `hsl(${i * 60}, 70%, 50%)` }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Asset Allocation */}
        <section className="mb-10">
          <div className="flex justify-between items-end mb-6">
            <h4 className="text-lg font-bold text-slate-900 tracking-tight">Your Assets (Live)</h4>
          </div>
          
          {portfolio.assets.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center flex flex-col items-center">
               <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">account_balance_wallet</span>
               <h3 className="text-lg font-bold text-slate-700">No assets in portfolio</h3>
               <p className="text-sm text-slate-500 mt-1 mb-4">Click the '+' button below to add your first transaction.</p>
               <button onClick={() => setShowTxModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm">Add Transaction</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {portfolio.assets.map((asset, i) => (
                <div key={i} className="group cursor-pointer bg-white border border-slate-100 p-5 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-100 font-bold text-xs uppercase">
                      {asset.symbol}
                    </div>
                    <span className="text-xs font-bold text-slate-400">{asset.allocation_pct.toFixed(1)}%</span>
                  </div>
                  <p className="font-bold text-slate-900 mb-1">{formatCurrency(asset.current_value)}</p>
                  <p className="text-xs text-slate-500 mb-3">{asset.shares} shares @ {formatCurrency(asset.live_price)}</p>
                  <div className={`text-xs font-semibold flex items-center ${asset.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    <span className="material-symbols-outlined text-sm mr-0.5">{asset.profit >= 0 ? 'north_east' : 'south_east'}</span> 
                    {Math.abs(asset.profit_pct).toFixed(2)}% ({formatCurrency(Math.abs(asset.profit))})
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Live Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.02)] border border-slate-100 p-6">
             <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold text-slate-900">Portfolio Performance</h4>
            </div>
            <div className="h-[300px] w-full bg-slate-50 rounded-lg relative overflow-hidden flex items-end group border border-slate-100">
              <div className="absolute inset-0 p-6 flex flex-col justify-between opacity-30">
                <div className="border-t border-slate-200/50 w-full"></div>
                <div className="border-t border-slate-200/50 w-full"></div>
                <div className="border-t border-slate-200/50 w-full"></div>
                <div className="border-t border-slate-200/50 w-full"></div>
                <div className="border-t border-slate-200/50 w-full"></div>
              </div>
              <svg className="w-full h-full p-0 relative z-10 opacity-30 grayscale blur-[2px]" preserveAspectRatio="none" viewBox="0 0 400 100">
                <path d="M0,80 Q50,75 100,50 T200,40 T300,20 T400,10" fill="none" stroke="#005daa" strokeWidth="3"></path>
              </svg>
              {/* Disclaimer Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/40 backdrop-blur-[2px]">
                 <div className="bg-white px-6 py-4 rounded-xl shadow-lg border border-slate-200 flex flex-col items-center text-center max-w-[250px]">
                    <span className="material-symbols-outlined text-amber-500 text-3xl mb-2">construction</span>
                    <p className="font-bold text-slate-800 text-sm mb-1">Coming Soon</p>
                    <p className="text-xs text-slate-500">Live portfolio chart synchronization is currently under construction.</p>
                 </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.02)] border border-slate-100 p-6">
            <h4 className="text-lg font-bold text-slate-900 mb-6">Recent Activity</h4>
            <div className="space-y-6">
              {portfolio.recent_activity.length === 0 ? (
                 <div className="text-sm text-slate-400 text-center py-10">No recent transactions.</div>
              ) : (
                portfolio.recent_activity.map((tx, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'BUY' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      <span className="material-symbols-outlined text-xl">{tx.type === 'BUY' ? 'shopping_cart' : 'payments'}</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-slate-900 truncate">{tx.type} {tx.symbol}</p>
                      <p className="text-xs text-slate-500 truncate">{tx.shares} shares @ {formatCurrency(tx.price)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                       <p className={`text-sm font-bold ${tx.type === 'BUY' ? 'text-slate-900' : 'text-emerald-600'}`}>
                         {tx.type === 'BUY' ? '-' : '+'}{formatCurrency(tx.total)}
                       </p>
                       <button onClick={() => openEditModal(tx)} className="text-slate-300 hover:text-blue-600 transition-colors" title="Edit Transaction">
                          <span className="material-symbols-outlined text-sm">edit</span>
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Add Button */}
      <button 
        className="fixed bottom-20 right-6 md:bottom-10 md:right-10 w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform z-40" 
        onClick={() => setShowTxModal(true)}
        title="Add Transaction"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      {/* Transaction Modal */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">{txForm.id ? 'Edit Transaction' : 'Add Transaction'}</h3>
              <button onClick={() => {
                  setShowTxModal(false);
                  setTxForm({ id: null, symbol: '', transaction_type: 'BUY', shares: '', price_at_purchase: '' });
                }} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={submitTransaction} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 relative" ref={txSearchRef}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Asset Symbol</label>
                  <input 
                    type="text" 
                    value={txForm.symbol}
                    onChange={handleTxSearchChange}
                    onFocus={() => { if(txForm.symbol.length >= 2) setShowTxSuggestions(true); }}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                    placeholder="e.g. RELIANCE.NS, AAPL, BTC-USD"
                    required
                  />
                  {showTxSuggestions && (
                    <div className="absolute top-[70px] left-0 w-full border border-slate-200 bg-white rounded-lg shadow-xl z-[60] max-h-[40vh] overflow-y-auto mt-1">
                      {isTxSearching && <div className="p-4 text-sm text-slate-500 text-center">Searching internet...</div>}
                      {!isTxSearching && txSuggestions.length === 0 && <div className="p-4 text-sm text-slate-500 text-center">No results found.</div>}
                      {!isTxSearching && txSuggestions.map((s, i) => (
                        <div 
                          key={i} 
                          className="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex gap-3 items-center"
                          onClick={() => {
                            setTxForm({...txForm, symbol: s.symbol});
                            setShowTxSuggestions(false);
                          }}
                        >
                          <div className="overflow-hidden">
                            <div className="font-bold text-sm text-slate-900 truncate">{s.shortname || s.symbol}</div>
                            <div className="text-xs text-slate-500 truncate mt-0.5">Stock • {s.symbol}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select 
                    value={txForm.transaction_type}
                    onChange={e => setTxForm({...txForm, transaction_type: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="BUY">Buy</option>
                    <option value="SELL">Sell</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input 
                    type="number" step="any" min="0.0001"
                    value={txForm.shares}
                    onChange={e => setTxForm({...txForm, shares: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.0"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price per share (₹)</label>
                  <input 
                    type="number" step="any" min="0.01"
                    value={txForm.price_at_purchase}
                    onChange={e => setTxForm({...txForm, price_at_purchase: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="₹ 0.00"
                    required
                  />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
