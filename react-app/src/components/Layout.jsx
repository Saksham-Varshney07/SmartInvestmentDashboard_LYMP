import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Layout({ children }) {
  const { currentUser, setCurrentUser } = useContext(AuthContext);
  const [loginForm, setLoginForm] = useState({ username: '', full_name: '', risk_profile: 'Balanced', investment_horizon: 'Medium-term' });
  const [isSignup, setIsSignup] = useState(false);
  
  // Theme State (Default White)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  
  // Search State
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

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.username.trim()) return;
    try {
      const res = await fetch('http://127.0.0.1:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: loginForm.username.trim(),
          full_name: isSignup ? loginForm.full_name.trim() : '',
          risk_profile: isSignup ? loginForm.risk_profile : '',
          investment_horizon: isSignup ? loginForm.investment_horizon : ''
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setCurrentUser(data);
      } else {
        alert(data.message || 'Error logging in');
      }
    } catch (e) {
      console.error(e);
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

  const getNavClass = (path) => {
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
      ? "text-blue-600 dark:text-blue-400 font-semibold border-b-2 border-blue-600 dark:border-blue-400 pb-1 text-sm tracking-tight"
      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium tracking-tight";
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 antialiased font-['Inter'] py-12 transition-colors duration-300">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-800 transition-colors">
           <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6 mx-auto">
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

             <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-md mt-4">
               {isSignup ? 'Sign Up' : 'Log In'}
             </button>
           </form>

           <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
             {isSignup ? "Already have an account? " : "Don't have an account? "}
             <button type="button" onClick={() => setIsSignup(!isSignup)} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
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
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 antialiased font-['Inter'] flex flex-col transition-colors duration-300">
      {/* Global Navbar */}
      <header className="fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex justify-between items-center max-w-[1440px] mx-auto px-6 h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Smart Investment Dashboard</Link>
            <nav className="hidden md:flex gap-6 items-center mt-1">
              <Link className={getNavClass('/')} to="/">Dashboard</Link>
              <Link className={getNavClass('/riskanalysis')} to="/riskanalysis">Risk Analysis</Link>
              <Link className={getNavClass('/portfolio')} to="/portfolio">Portfolio</Link>
              <Link className={getNavClass('/sipplanner')} to="/sipplanner">SIP Planner</Link>
              <Link className={getNavClass('/assetexplorer')} to="/assetexplorer">Asset Explorer</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 relative" ref={searchRef}>
            <div className="relative hidden sm:block">
              <input 
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
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
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
      <div className="pt-16 flex-1">
         {children}
      </div>
    </div>
  );
}
