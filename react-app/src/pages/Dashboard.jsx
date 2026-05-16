import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const navigate = useNavigate();

  
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    }, 400); // 400ms debounce
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

  const addTransaction = () => {
    alert("Manual Transaction form opened. You can now add an asset.");
  };

  const navClass = "text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium tracking-tight";
  const activeNavClass = "text-blue-600 font-semibold border-b-2 border-blue-600 pb-1 text-sm tracking-tight";

  return (
    <div className="bg-surface text-on-surface antialiased">
      
      <header className="fixed top-0 w-full z-50 sticky glass-nav border-b border-slate-200/50" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)' }}>
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
                className="bg-surface-container-low border-none rounded-lg py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 w-64" 
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
                  <div className="flex gap-2 p-3 border-b border-slate-100 overflow-x-auto no-scrollbar">
                     {['All', 'Stocks', 'F&O', 'Mutual Funds', 'ETF', 'FAQs'].map(tab => (
                        <button key={tab} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${tab === 'Stocks' ? 'bg-slate-100 border border-slate-300 text-slate-800' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                           {tab}
                        </button>
                     ))}
                  </div>

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
                        <div className="font-bold text-sm text-slate-900 truncate"><span className="text-blue-900">{s.shortname?.substring(0, searchTerm.length) || ''}</span>{s.shortname?.substring(searchTerm.length) || s.symbol}</div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">Stock • {s.symbol}</div>
                      </div>
                    </div>
                  ))}
                  {!isSearching && suggestions.length > 0 && (
                     <div className="p-3 text-center border-t border-slate-100">
                        <button className="text-sm font-semibold text-slate-700 hover:text-blue-600 border-b border-dashed border-slate-400">More results</button>
                     </div>
                  )}
                </div>
              )}
            </div>
            <button className="p-2 hover:bg-slate-50 rounded-full text-slate-500 transition-all">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 hover:bg-slate-50 rounded-full text-slate-500 transition-all">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <img alt="User Profile" className="w-8 h-8 rounded-full border border-slate-200" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuDCnvjfhbDb_rgRtu_aadl71dje67aF4NcHCZ2HXB3Ad3rUxqm5IOUhwL97tok9dGkF4fR4qOt9puUeM8knSGZKu82F9QJIKCyvGzeZZ6GEr04D4txAZBCx2erato0tvCRPjHsxang65N7sk4BfbTWgsgflrZN1QDfAM-CReLfT0uDOFaINEcnPpddeMARGGi5fv9JL8z0g9QjBf97wK1HNSGxmrLT00TAAUEMKHuR9wMcLR3K88XQEmUtDkd8IjQfgzbfaTA2Os"/>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-8 mb-20 lg:mb-0">
        <section className="mb-8 relative overflow-hidden rounded-xl bg-primary-container p-8 text-on-primary-container shadow-[0_8px_24px_rgba(25,28,29,0.04)]">
          <div className="relative z-10 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2 block">Daily Perspective</span>
            <h2 className="text-2xl md:text-3xl font-semibold leading-tight italic tracking-tight">
              "Investing is the key to financial freedom"
            </h2>
            <p className="mt-4 text-sm font-medium opacity-90">— Smart Investment Insights</p>
          </div>
          <div className="absolute right-0 top-0 w-1/2 h-full opacity-20 bg-gradient-to-l from-white/20 to-transparent"></div>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] opacity-10 rotate-12">format_quote</span>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] flex flex-col justify-between">
            <div>
              <p className="text-on-surface-variant text-sm font-medium mb-1">Total Investment</p>
              <h3 className="text-2xl font-bold tracking-tight">₹ 14,24,500.00</h3>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span className="text-xs text-on-surface-variant font-medium">Updated 2m ago</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] flex flex-col justify-between">
            <div>
              <p className="text-on-surface-variant text-sm font-medium mb-1">Portfolio Value</p>
              <h3 className="text-2xl font-bold tracking-tight">₹ 16,42,820.45</h3>
            </div>
            <div className="mt-4 flex items-center text-secondary font-semibold text-sm">
              <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
              <span>+₹ 12,240.00 Today</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] flex flex-col justify-between border-l-4 border-secondary">
            <div>
              <p className="text-on-surface-variant text-sm font-medium mb-1">Total Profit</p>
              <h3 className="text-2xl font-bold tracking-tight text-secondary">+₹ 2,18,320.45</h3>
            </div>
            <div className="mt-4 flex items-center">
              <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-0.5 rounded-full">+15.3% All Time</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] flex flex-col justify-between">
            <div>
              <p className="text-on-surface-variant text-sm font-medium mb-1">Annual Growth</p>
              <h3 className="text-2xl font-bold tracking-tight">22.4%</h3>
            </div>
            <div className="mt-4 h-1.5 w-full bg-surface-container-low rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[72%] rounded-full"></div>
            </div>
          </div>
        </div>

        <section className="mb-10">
          <h4 className="text-lg font-bold mb-6 text-slate-900 tracking-tight">Asset Allocation</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group cursor-pointer bg-surface-container-lowest p-5 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] hover:bg-surface-container-low transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
                <span className="text-xs font-bold text-on-surface-variant">65%</span>
              </div>
              <p className="font-bold text-slate-900 mb-1">Stocks</p>
              <p className="text-sm text-on-surface-variant">₹ 10,67,800.00</p>
              <div className="mt-3 text-xs font-semibold text-secondary flex items-center">
                <span className="material-symbols-outlined text-sm mr-0.5">north_east</span> 2.4%
              </div>
            </div>
            <div className="group cursor-pointer bg-surface-container-lowest p-5 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] hover:bg-surface-container-low transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <span className="material-symbols-outlined">currency_bitcoin</span>
                </div>
                <span className="text-xs font-bold text-on-surface-variant">15%</span>
              </div>
              <p className="font-bold text-slate-900 mb-1">Crypto</p>
              <p className="text-sm text-on-surface-variant">₹ 2,46,423.00</p>
              <div className="mt-3 text-xs font-semibold text-tertiary flex items-center">
                <span className="material-symbols-outlined text-sm mr-0.5">south_east</span> 1.2%
              </div>
            </div>
            <div className="group cursor-pointer bg-surface-container-lowest p-5 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] hover:bg-surface-container-low transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <span className="text-xs font-bold text-on-surface-variant">12%</span>
              </div>
              <p className="font-bold text-slate-900 mb-1">Gold &amp; Silver</p>
              <p className="text-sm text-on-surface-variant">₹ 1,97,136.00</p>
              <div className="mt-3 text-xs font-semibold text-secondary flex items-center">
                <span className="material-symbols-outlined text-sm mr-0.5">trending_flat</span> 0.0%
              </div>
            </div>
            <div className="group cursor-pointer bg-surface-container-lowest p-5 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] hover:bg-surface-container-low transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <span className="material-symbols-outlined">account_balance</span>
                </div>
                <span className="text-xs font-bold text-on-surface-variant">8%</span>
              </div>
              <p className="font-bold text-slate-900 mb-1">Cash</p>
              <p className="text-sm text-on-surface-variant">₹ 1,31,461.45</p>
              <div className="mt-3 text-xs font-semibold text-on-surface-variant flex items-center">
                  Liquid Assets
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl shadow-[0_8px_24px_rgba(25,28,29,0.04)] p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold text-slate-900">Portfolio Performance</h4>
            </div>
            <div className="h-[300px] w-full bg-surface-container-low rounded-lg relative overflow-hidden flex items-end group">
              <div className="absolute inset-0 p-6 flex flex-col justify-between opacity-30">
                <div className="border-t border-slate-200/50 w-full"></div>
                <div className="border-t border-slate-200/50 w-full"></div>
                <div className="border-t border-slate-200/50 w-full"></div>
                <div className="border-t border-slate-200/50 w-full"></div>
                <div className="border-t border-slate-200/50 w-full"></div>
              </div>
              <svg className="w-full h-full p-0 relative z-10 opacity-30 grayscale blur-[2px]" preserveAspectRatio="none" viewBox="0 0 400 100">
                <path d="M0,80 Q50,75 100,50 T200,40 T300,20 T400,10" fill="none" stroke="#005daa" strokeWidth="3"></path>
                <path d="M0,80 Q50,75 100,50 T200,40 T300,20 T400,10 L400,100 L0,100 Z" fill="url(#grad1)" opacity="0.1"></path>
                <defs>
                  <linearGradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#005daa', stopOpacity:1}}></stop>
                    <stop offset="100%" style={{stopColor:'#005daa', stopOpacity:0}}></stop>
                  </linearGradient>
                </defs>
              </svg>
              {/* Disclaimer Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/40 backdrop-blur-[2px]">
                 <div className="bg-white px-6 py-4 rounded-xl shadow-lg border border-slate-200 flex flex-col items-center text-center max-w-[250px]">
                    <span className="material-symbols-outlined text-amber-500 text-3xl mb-2">construction</span>
                    <p className="font-bold text-slate-800 text-sm mb-1">Coming Soon</p>
                    <p className="text-xs text-slate-500">Live portfolio synchronization is currently under construction.</p>
                 </div>
              </div>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest rounded-xl shadow-[0_8px_24px_rgba(25,28,29,0.04)] p-6">
            <h4 className="text-lg font-bold text-slate-900 mb-6">Recent Activity</h4>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                  <span className="material-symbols-outlined text-xl">shopping_cart</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">Bought AAPL</p>
                  <p className="text-xs text-on-surface-variant">Stock • 12 Shares</p>
                </div>
                <p className="text-sm font-bold text-slate-900">-₹ 2,02,400</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
                  <span className="material-symbols-outlined text-xl">payments</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">Dividend Received</p>
                  <p className="text-xs text-on-surface-variant">Microsoft Corp</p>
                </div>
                <p className="text-sm font-bold text-secondary">+₹ 8,145.20</p>
              </div>
            </div>
          </div>
        </div>

        {/* USP 4: Data → ML → Insight Pipeline Strip */}
        <div className="mt-10 mx-0">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
            <span className="material-symbols-outlined absolute -right-8 -bottom-8 text-[160px] text-slate-700/20">account_tree</span>
            <div className="relative z-10">
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">How Our AI Works</p>
              <h2 className="text-2xl font-bold mb-8">The Intelligence Pipeline</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0">
                {[
                  { icon: 'storage', label: 'Raw Market Data', sub: 'yfinance · NSE/BSE · Crypto', color: 'text-blue-400' },
                  { icon: 'build', label: 'Feature Engineering', sub: 'Returns · Volatility · Trend', color: 'text-purple-400' },
                  { icon: 'psychology', label: 'Isolation Forest', sub: 'Anomaly Detection · ML Model', color: 'text-indigo-400' },
                  { icon: 'label', label: 'Risk Labels', sub: 'High · Moderate · Low Risk', color: 'text-yellow-400' },
                  { icon: 'dashboard', label: 'Your Dashboard', sub: 'Insights · Charts · Advice', color: 'text-green-400' },
                ].map((step, i, arr) => (
                  <React.Fragment key={step.label}>
                    <div className="flex flex-col items-center text-center min-w-[120px]">
                      <div className={`w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center mb-3 border border-slate-600`}>
                        <span className={`material-symbols-outlined text-2xl ${step.color}`}>{step.icon}</span>
                      </div>
                      <p className="text-sm font-bold text-white leading-tight">{step.label}</p>
                      <p className="text-xs text-slate-400 mt-1 leading-tight">{step.sub}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex-1 flex items-center justify-center px-2 py-6 sm:py-0">
                        <span className="material-symbols-outlined text-slate-600 text-2xl rotate-90 sm:rotate-0">arrow_forward</span>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      
      <button 
        className="fixed bottom-20 right-6 md:bottom-10 md:right-10 w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform" 
        onClick={addTransaction}
        title="Add Transaction"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </div>
  );
}
