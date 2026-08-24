import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Shepherd from 'shepherd.js';
import { AuthContext } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Portfolio() {
  const { currentUser } = useContext(AuthContext);
  const location = useLocation();
  
  const [portfolio, setPortfolio] = useState({
    summary: { total_investment: 0, portfolio_value: 0, total_profit: 0, total_profit_pct: 0 },
    assets: [],
    recent_activity: []
  });

  const [portfolioType, setPortfolioType] = useState(() => {
    return location.state?.targetPortfolio === 'sandbox' ? 'sandbox' : 'real';
  });
  const [expandedAsset, setExpandedAsset] = useState(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [txForm, setTxForm] = useState({ id: null, symbol: '', transaction_type: 'BUY', shares: '', price_at_purchase: '' });
  const [txSuggestions, setTxSuggestions] = useState([]);
  const [showTxSuggestions, setShowTxSuggestions] = useState(false);
  const [isTxSearching, setIsTxSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const txSearchRef = useRef(null);
  const txSearchTimeoutRef = useRef(null);
  const tourRef = useRef(null);

  const getAssetChartData = (asset) => {
    if (!asset.history || asset.history.length === 0) return [];
    const sortedHistory = [...asset.history].sort((a, b) => new Date(a.date) - new Date(b.date));
    const chartData = sortedHistory.map(tx => ({
        dateStr: new Date(tx.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: '2-digit'}),
        price: tx.price
    }));
    chartData.push({
        dateStr: 'Today',
        price: asset.live_price
    });
    return chartData;
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (txSearchRef.current && !txSearchRef.current.contains(event.target)) {
        setShowTxSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (location.state?.openAddTransaction) {
      // Clean up the state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
      
      const isDarkMode = document.documentElement.classList.contains('dark');
      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: isDarkMode ? 'shepherd-dark' : 'shepherd-light',
          scrollTo: true,
          cancelIcon: { enabled: true }
        }
      });
      tourRef.current = tour;

      tour.addStep({
        id: 'invest-pointer',
        title: 'Start Investing',
        text: 'Click here to record a new transaction and add assets to your portfolio.',
        attachTo: { element: '#btn-add-transaction', on: 'bottom' },
        buttons: [
          {
            text: 'Got it',
            action: tour.cancel,
            classes: 'btn-primary'
          }
        ]
      });

      // Delay slightly to let the page render completely
      setTimeout(() => tour.start(), 300);
    }
  }, [location.state]);

  const fetchPortfolio = async () => {
    if (!currentUser) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/portfolio/${currentUser.user_id}?type=${portfolioType}`);
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
      const interval = setInterval(fetchPortfolio, 5000); 
      return () => clearInterval(interval);
    }
  }, [currentUser, portfolioType]);

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
          price_at_purchase: parseFloat(txForm.price_at_purchase),
          portfolio_type: portfolioType
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowTxModal(false);
        setTxForm({ id: null, symbol: '', transaction_type: 'BUY', shares: '', price_at_purchase: '' });
        fetchPortfolio();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTransaction = async (id) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/portfolio/transaction/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') fetchPortfolio();
    } catch(e) {
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

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Your Portfolio</h1>
            <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
              <button 
                onClick={() => setPortfolioType('real')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${portfolioType === 'real' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Real
              </button>
              <button 
                onClick={() => setPortfolioType('sandbox')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${portfolioType === 'sandbox' ? 'bg-[#059669] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Sandbox
              </button>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {portfolioType === 'real' ? 'Manage your holdings and track performance.' : 'Simulate investments and test AI blueprints risk-free.'}
          </p>
        </div>
        <button 
          id="btn-add-transaction"
          onClick={() => {
            if (tourRef.current) tourRef.current.cancel();
            setShowTxModal(true);
          }} 
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span> Add Transaction
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Assets */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">Current Holdings</h3>
               <button onClick={fetchPortfolio} className="text-slate-400 hover:text-blue-600 transition-colors">
                  <span className={`material-symbols-outlined ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}>refresh</span>
               </button>
             </div>
             
             {portfolio.assets.length === 0 ? (
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center flex flex-col items-center">
                   <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">account_balance_wallet</span>
                   <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No assets in portfolio</h3>
                   <p className="text-sm text-slate-500 mt-1">Add a transaction to get started.</p>
                </div>
             ) : (
                <div className="space-y-4">
                  {portfolio.assets.map((asset, i) => (
                    <div key={i} className="flex flex-col border border-slate-100 dark:border-slate-800 rounded-lg hover:border-blue-100 dark:hover:border-slate-700 hover:shadow-md transition-all group overflow-hidden">
                      <div 
                        onClick={() => setExpandedAsset(expandedAsset === asset.symbol ? null : asset.symbol)}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 cursor-pointer w-full"
                      >
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-300 uppercase transition-colors">
                              {asset.symbol.substring(0,2)}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {asset.symbol}
                                <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform ${expandedAsset === asset.symbol ? 'rotate-180' : ''}`}>expand_more</span>
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{Number(asset.shares.toFixed(2))} shares @ {formatCurrency(asset.live_price)}</p>
                            </div>
                         </div>
                         <div className="mt-4 sm:mt-0 text-right w-full sm:w-auto flex justify-between sm:block">
                            <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(asset.current_value)}</p>
                            <div className={`text-xs font-semibold flex items-center sm:justify-end ${asset.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              <span className="material-symbols-outlined text-sm mr-0.5">{asset.profit >= 0 ? 'trending_up' : 'trending_down'}</span> 
                              {Math.abs(asset.profit_pct).toFixed(2)}% ({formatCurrency(Math.abs(asset.profit))})
                            </div>
                         </div>
                      </div>
                      
                      {expandedAsset === asset.symbol && (
                         <div className="bg-slate-50 dark:bg-slate-800/30 p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 animate-[fadeIn_0.2s_ease-in-out]">
                           <div className="flex flex-col lg:flex-row gap-6 items-center">
                             <div className="flex-1">
                               <h5 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Performance Explainer</h5>
                               <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                 You invested a total of <strong className="text-slate-900 dark:text-white">{formatCurrency(asset.invested)}</strong> to acquire {Number(asset.shares.toFixed(2))} shares of {asset.symbol} at an average price of <strong className="text-slate-900 dark:text-white">{formatCurrency(asset.shares > 0 ? asset.invested / asset.shares : 0)}</strong>. 
                                 Since your purchase, the live market price has moved to <strong className="text-slate-900 dark:text-white">{formatCurrency(asset.live_price)}</strong>. 
                                 This price action has generated a net {asset.profit >= 0 ? 'profit' : 'loss'} of <strong className={asset.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{formatCurrency(Math.abs(asset.profit))}</strong>.
                               </p>
                             </div>
                             <div className="w-full lg:w-64 h-32 shrink-0">
                               <ResponsiveContainer width="100%" height="100%">
                                 <AreaChart data={getAssetChartData(asset)}>
                                   <defs>
                                     <linearGradient id={`colorValue${i}`} x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor={asset.profit >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor={asset.profit >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0}/>
                                     </linearGradient>
                                   </defs>
                                   <XAxis dataKey="dateStr" hide />
                                   <YAxis domain={['auto', 'auto']} hide />
                                   <Tooltip 
                                     contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                     cursor={{stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3'}}
                                     formatter={(value) => [formatCurrency(value), 'Price']}
                                   />
                                   <Area type="monotone" dataKey="price" stroke={asset.profit >= 0 ? '#10b981' : '#ef4444'} strokeWidth={2} fillOpacity={1} fill={`url(#colorValue${i})`} />
                                 </AreaChart>
                               </ResponsiveContainer>
                             </div>
                           </div>
                         </div>
                      )}
                    </div>
                  ))}
                </div>
             )}
          </div>
        </div>

        {/* Right Col: Recent Activity */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
             <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Transaction History</h3>
             <div className="space-y-5">
               {portfolio.recent_activity.length === 0 ? (
                  <div className="text-sm text-slate-400 text-center py-6">No recent transactions.</div>
               ) : (
                 portfolio.recent_activity.map((tx, i) => (
                   <div key={i} className="flex items-center justify-between group">
                     <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'BUY' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'}`}>
                         <span className="material-symbols-outlined text-lg">{tx.type === 'BUY' ? 'add' : 'remove'}</span>
                       </div>
                       <div>
                         <p className="text-sm font-bold text-slate-900 dark:text-white">{tx.type} {tx.symbol}</p>
                         <p className="text-xs text-slate-500 dark:text-slate-400">
                           {Number(tx.shares.toFixed(2))} @ {formatCurrency(tx.price)} • {new Date(tx.date).toLocaleDateString()}
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${tx.type === 'BUY' ? 'text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {tx.type === 'BUY' ? '-' : '+'}{formatCurrency(tx.total)}
                        </p>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button onClick={() => openEditModal(tx)} className="text-slate-400 hover:text-blue-600"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                          <button onClick={() => deleteTransaction(tx.id)} className="text-slate-400 hover:text-red-600"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                        </div>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      {showTxModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{txForm.id ? 'Edit Transaction' : 'Add Transaction'}</h3>
              <button onClick={() => {
                  setShowTxModal(false);
                  setTxForm({ id: null, symbol: '', transaction_type: 'BUY', shares: '', price_at_purchase: '' });
                }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={submitTransaction} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 relative" ref={txSearchRef}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asset Symbol</label>
                  <input 
                    type="text" 
                    value={txForm.symbol}
                    onChange={handleTxSearchChange}
                    onFocus={() => { if(txForm.symbol.length >= 2) setShowTxSuggestions(true); }}
                    className="w-full bg-transparent border border-slate-300 dark:border-slate-700 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                    placeholder="e.g. RELIANCE.NS"
                    required
                  />
                  {showTxSuggestions && (
                    <div className="absolute top-[70px] left-0 w-full border border-slate-200 bg-white rounded-lg shadow-xl z-[70] max-h-[40vh] overflow-y-auto mt-1">
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
                            <div className="text-xs text-slate-500 truncate mt-0.5">{s.symbol}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                  <select 
                    value={txForm.transaction_type}
                    onChange={e => setTxForm({...txForm, transaction_type: e.target.value})}
                    className="w-full bg-transparent border border-slate-300 dark:border-slate-700 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none [&>option]:bg-white dark:[&>option]:bg-slate-900"
                  >
                    <option value="BUY">Buy</option>
                    <option value="SELL">Sell</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                  <input 
                    type="number" step="any" min="0.0001"
                    value={txForm.shares}
                    onChange={e => setTxForm({...txForm, shares: e.target.value})}
                    className="w-full bg-transparent border border-slate-300 dark:border-slate-700 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.0"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price per share (₹)</label>
                  <input 
                    type="number" step="any" min="0.01"
                    value={txForm.price_at_purchase}
                    onChange={e => setTxForm({...txForm, price_at_purchase: e.target.value})}
                    className="w-full bg-transparent border border-slate-300 dark:border-slate-700 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
