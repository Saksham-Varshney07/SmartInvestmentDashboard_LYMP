import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { AiContext } from '../context/AiContext';
import AskAiModal from './AskAiModal';
import { searchAutocomplete, loginUser } from '../services/apiClient';

export default function Layout({ children }) {
  const { currentUser, setCurrentUser } = useContext(AuthContext);
  const { aiPageData, activeStockData, activeStockSymbol } = useContext(AiContext);
  const [loginForm, setLoginForm] = useState({ username: '', full_name: '', risk_profile: 'Balanced', investment_horizon: 'Medium-term' });
  const [isSignup, setIsSignup] = useState(false);
  
  const [showAiModal, setShowAiModal] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const username = (loginForm.username || '').trim();
    if (!username) {
      alert('Please enter a username');
      return;
    }
    setIsSubmitting(true);
    try {
      const user = await loginUser(loginForm, isSignup);
      setCurrentUser(user);
    } catch (e) {
      console.error('Login error:', e);
      setCurrentUser({
        status: 'success',
        user_id: 1,
        portfolio_id: 1,
        username: username,
        full_name: (isSignup ? loginForm.full_name?.trim() : '') || username,
        risk_profile: (isSignup ? loginForm.risk_profile : '') || 'Balanced',
        investment_horizon: (isSignup ? loginForm.investment_horizon : '') || 'Medium-term'
      });
    } finally {
      setIsSubmitting(false);
    }
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
        const results = await searchAutocomplete(val);
        setSuggestions(results || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 250); 
  };

  const selectSymbol = (symbol) => {
    setSearchTerm(symbol);
    setShowSuggestions(false);
    navigate(`/search/${symbol}`);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && searchTerm) {
      if (suggestions && suggestions.length > 0) {
        selectSymbol(suggestions[0].symbol);
      } else {
        setShowSuggestions(false);
        navigate(`/search/${searchTerm.trim().toUpperCase()}`);
      }
    }
  };

  const getNavClass = (path) => {
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
      ? "nav-link nav-link-active"
      : "nav-link";
  };

  if (!currentUser) {
    return (
      <div className="auth-screen min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 antialiased font-['Inter'] py-12 transition-colors duration-300">
        <div className="auth-layout">
        <aside className="auth-story">
          <Link to="/" className="auth-wordmark"><span className="brand-mark"><span className="material-symbols-outlined">show_chart</span></span> Smart Investment Dashboard</Link>
          <div className="auth-story-copy">
            <span className="auth-kicker"><span /> INVEST WITH A CLEARER VIEW</span>
            <h1>Make your next move<br/><em>with confidence.</em></h1>
            <p>One workspace for your portfolio, market research, and long-term plans.</p>
          </div>
          <div className="auth-visual" aria-hidden="true">
            <div className="auth-visual-label"><span>A SPACE TO THINK AHEAD</span><span className="auth-visual-dot">● &nbsp;Your view, in one place</span></div>
            <svg className="auth-landscape" viewBox="0 0 520 180" preserveAspectRatio="none" focusable="false"><defs><linearGradient id="authHorizon" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#e7c9b6" stopOpacity=".72"/><stop offset="1" stopColor="#d8ded2" stopOpacity=".16"/></linearGradient></defs><circle cx="386" cy="66" r="31" fill="#f0ddc6" opacity=".9"/><path d="M0 117c58-19 105-6 155-24s83-6 137 9 92-11 127-20 64-1 101-13v111H0Z" fill="url(#authHorizon)"/><path d="M0 139c90-15 137 2 212 10s167-12 308-2v31H0Z" fill="#e3d4bd" opacity=".32"/><path d="M21 154c62-5 110 1 166 6m69-8c69 6 139-3 238 3" fill="none" stroke="#f2e5d4" strokeOpacity=".6" strokeWidth="1"/></svg>
            <div className="auth-chart-axis"><span>PORTFOLIO</span><span>RISK</span><span>PLANNING</span></div>
          </div>
          <div className="auth-features"><div><span className="material-symbols-outlined">account_balance_wallet</span><span>Portfolio<br/>tracking</span></div><div><span className="material-symbols-outlined">query_stats</span><span>Risk-aware<br/>insights</span></div><div><span className="material-symbols-outlined">event_repeat</span><span>Smarter<br/>planning</span></div></div>
        </aside>
        <div className="auth-card w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-800 transition-colors">
           <div className="auth-mobile-brand"><span className="brand-mark"><span className="material-symbols-outlined">show_chart</span></span> Smart Investment Dashboard</div>
           <div className="auth-icon w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6 mx-auto">
             <span className="material-symbols-outlined text-3xl">{isSignup ? 'person_add' : 'account_circle'}</span>
           </div>
           <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
           <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-8">{isSignup ? 'Set up your investor profile' : 'Login to view your portfolio.'}</p>
           
           <form onSubmit={handleLogin} className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
               <input 
                 type="text" 
                 value={loginForm.username}
                 onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                 className="w-full bg-transparent border border-slate-300 dark:border-slate-700 dark:text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                 placeholder="Enter username"
                 required
               />
             </div>

             {isSignup && (
               <>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                   <input 
                     type="text" 
                     value={loginForm.full_name}
                     onChange={e => setLoginForm({...loginForm, full_name: e.target.value})}
                     className="w-full bg-transparent border border-slate-300 dark:border-slate-700 dark:text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                     placeholder="Enter your full name"
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Risk Profile</label>
                     <select 
                       value={loginForm.risk_profile}
                       onChange={e => setLoginForm({...loginForm, risk_profile: e.target.value})}
                       className="w-full bg-transparent border border-slate-300 dark:border-slate-700 dark:text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none [&>option]:bg-white dark:[&>option]:bg-slate-900"
                     >
                       <option value="Defender">Defender (Low Risk)</option>
                       <option value="Balanced">Balanced</option>
                       <option value="Aggressor">Aggressor (High Risk)</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Horizon</label>
                     <select 
                       value={loginForm.investment_horizon}
                       onChange={e => setLoginForm({...loginForm, investment_horizon: e.target.value})}
                       className="w-full bg-transparent border border-slate-300 dark:border-slate-700 dark:text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none [&>option]:bg-white dark:[&>option]:bg-slate-900"
                     >
                       <option value="Short-term">Short-term</option>
                       <option value="Medium-term">Medium-term</option>
                       <option value="Long-term">Long-term</option>
                     </select>
                   </div>
                 </div>
               </>
             )}

             <button 
               type="submit" 
               disabled={isSubmitting}
               className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md mt-4 cursor-pointer disabled:opacity-70"
               style={{ cursor: 'pointer', touchAction: 'manipulation' }}
             >
               {isSubmitting ? 'Please wait...' : (isSignup ? 'Sign Up' : 'Log In')}
             </button>
           </form>

           <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
             {isSignup ? "Already have an account? " : "Don't have an account? "}
             <button 
               type="button" 
               onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 setIsSignup(prev => !prev);
               }} 
               className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-block p-1"
               style={{ cursor: 'pointer', touchAction: 'manipulation' }}
             >
               {isSignup ? 'Log in' : 'Sign up'}
             </button>
           </div>
           
           <div className="mt-8 flex justify-center">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Toggle Theme"
              >
                <span className="material-symbols-outlined text-sm">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
              </button>
           </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 antialiased font-['Inter'] flex flex-col transition-colors duration-300">
      {/* Global Navbar */}
      <header className="app-header fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="app-header-inner max-w-[1440px] mx-auto px-6 min-h-16">
          <div className="brand-and-nav">
            <Link to="/" className="brand-lockup">
              <span className="brand-mark"><span className="material-symbols-outlined">show_chart</span></span>
              <span className="brand-name">Smart Investment Dashboard</span>
            </Link>
            <nav className="primary-nav">
              <Link id="nav-dashboard" className={getNavClass('/')} to="/">Dashboard</Link>
              <Link id="nav-riskanalysis" className={getNavClass('/riskanalysis')} to="/riskanalysis">Risk Analysis</Link>
              <Link id="nav-portfolio" className={getNavClass('/portfolio')} to="/portfolio">Portfolio</Link>
              <Link id="nav-sectors" className={getNavClass('/sectors')} to="/sectors">Screener</Link>
              <Link id="nav-sipplanner" className={getNavClass('/sipplanner')} to="/sipplanner">SIP Planner</Link>
              <Link id="nav-assetexplorer" className={getNavClass('/assetexplorer')} to="/assetexplorer">Asset Explorer</Link>
            </nav>
          </div>
          <div className="header-tools flex items-center gap-4 relative" ref={searchRef}>
            <div id="nav-search" className="relative hidden sm:block">
              <input 
                aria-label="Search markets"
                className="bg-slate-100 dark:bg-slate-800 dark:text-white border-none rounded-lg py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 w-64 outline-none transition-colors" 
                placeholder="Search markets..." 
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyPress}
                onClick={() => {if(searchTerm.length >= 2) setShowSuggestions(true);}}
              />
              <span className="material-symbols-outlined absolute left-3 top-1.5 text-slate-400 text-lg">search</span>
              
              {showSuggestions && (
                <div className="absolute top-12 left-0 w-[400px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg shadow-xl z-[60] max-h-[80vh] overflow-y-auto mt-2">
                  {isSearching && <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">Searching internet...</div>}
                  {!isSearching && suggestions.length === 0 && <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">No results found.</div>}
                  {!isSearching && suggestions.map((s, i) => (
                    <div 
                      key={i} 
                      className="p-3 border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex gap-4 items-center transition-colors"
                      onClick={() => selectSymbol(s.symbol)}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center shrink-0">
                         <span className="material-symbols-outlined text-slate-400 text-sm">show_chart</span>
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{s.shortname || s.symbol}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">Stock • {s.symbol}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="account-tools flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
               <button 
                onClick={() => window.dispatchEvent(new Event('trigger-onboarding'))} 
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Guide"
               >
                 <span className="material-symbols-outlined text-sm">menu_book</span>
               </button>
               <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Toggle Theme"
               >
                 <span className="material-symbols-outlined text-sm">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
               </button>
               <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 hidden lg:block">{currentUser.username}</div>
               <Link to="/account" className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase cursor-pointer hover:bg-blue-700 shadow-sm transition-colors" title="My Account">
                 {currentUser.username[0]}
               </Link>
            </div>
          </div>
        </div>
      </header>
      
      {/* Page Content */}
      <div className="page-content pt-16 flex-1">
         {children}
      </div>

      <footer className="site-footer">
        <Link to="/" className="site-footer-brand">Smart Investment Dashboard</Link>
        <span>Tools for a longer view.</span>
        <nav className="site-footer-links" aria-label="Footer navigation">
          <Link to="/portfolio">Portfolio</Link>
          <Link to="/riskanalysis">Risk analysis</Link>
          <Link to="/sipplanner">SIP planner</Link>
          <Link to="/assetexplorer">Explore assets</Link>
        </nav>
      </footer>

      {/* Global Ask AI FAB */}
      {currentUser && (
        <button
          onClick={() => setShowAiModal(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 hover:scale-105 transition-all z-40 group"
          title="Ask AInvestor"
        >
          <span className="material-symbols-outlined text-2xl group-hover:animate-pulse">smart_toy</span>
        </button>
      )}

      {/* Global Ask AI Modal */}
      {showAiModal && (() => {
        const urlSymbol = location.pathname.startsWith('/search/')
          ? decodeURIComponent(location.pathname.replace(/^\/search\/?/, '').split('/')[0].split('?')[0]).trim()
          : '';
        const currentActiveSymbol = urlSymbol || activeStockSymbol || activeStockData?.symbol || null;
        const currentActiveData = (activeStockData && activeStockData.symbol === currentActiveSymbol)
          ? activeStockData
          : (currentActiveSymbol ? {
              symbol: currentActiveSymbol,
              name: currentActiveSymbol.replace(/\.(NS|BO)$/i, ''),
              company_name: currentActiveSymbol.replace(/\.(NS|BO)$/i, ''),
              currency: currentActiveSymbol.endsWith('.NS') ? '₹' : '$'
            } : null);

        return (
          <AskAiModal 
            symbol={currentActiveSymbol}
            stockData={currentActiveData}
            pageContext={
              location.pathname === '/' ? 'Dashboard' :
              location.pathname === '/riskanalysis' ? 'Risk Analysis Portfolio Simulator' :
              location.pathname === '/portfolio' ? 'Live Portfolio Tracking' :
              (location.pathname === '/sectors' || location.pathname === '/screener') ? 'Sector Comparison & Fundamental Screener' :
              location.pathname === '/sipplanner' ? 'SIP Planner' :
              location.pathname === '/assetexplorer' ? 'Asset Explorer' :
              location.pathname.startsWith('/search/') ? 'Stock Search / Analysis' :
              'Navigation'
            }
            livePageData={aiPageData}
            onClose={() => setShowAiModal(false)}
          />
        );
      })()}
    </div>
  );
}
