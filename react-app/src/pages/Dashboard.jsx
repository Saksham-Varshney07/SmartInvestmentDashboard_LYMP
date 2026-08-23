import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { currentUser } = useContext(AuthContext);
  const [portfolio, setPortfolio] = useState({
    summary: { total_investment: 0, portfolio_value: 0, total_profit: 0, total_profit_pct: 0 },
    assets: [],
    recent_activity: []
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      const interval = setInterval(fetchPortfolio, 5000); 
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  const groupedAllocations = React.useMemo(() => {
    let stocks = 0;
    let crypto = 0;
    let gold = 0;
    
    (portfolio.assets || []).forEach(asset => {
      const sym = asset.symbol.toUpperCase();
      if (sym.includes('-USD') || sym.includes('BTC') || sym.includes('ETH') || sym.includes('CRYPTO')) {
        crypto += asset.allocation_pct || 0;
      } else if (sym.includes('GOLD') || sym.includes('SILV')) {
        gold += asset.allocation_pct || 0;
      } else {
        stocks += asset.allocation_pct || 0;
      }
    });

    return [
      { label: 'Stocks', pct: stocks, colorClass: 'text-blue-600 dark:text-blue-400' },
      { label: 'Crypto', pct: crypto, colorClass: 'text-emerald-600 dark:text-emerald-400' },
      { label: 'Gold & Silver', pct: gold, colorClass: 'text-amber-600 dark:text-amber-400' },
      { label: 'Cash', pct: 0, colorClass: 'text-slate-500 dark:text-slate-400' }
    ];
  }, [portfolio.assets]);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#F15B5B', '#4D4D4E'];

  // Generate REAL historical curve based on actual user transaction dates
  const performanceData = React.useMemo(() => {
    if (!portfolio.assets || portfolio.assets.length === 0) return [];
    
    // Extract all transactions from all assets
    let allTransactions = [];
    portfolio.assets.forEach(asset => {
       if (asset.history) {
           asset.history.forEach(tx => {
               allTransactions.push({
                   date: new Date(tx.date),
                   amount: tx.type === 'BUY' ? (tx.shares * tx.price) : -(tx.shares * tx.price)
               });
           });
       }
    });
    
    // Sort transactions by date ascending
    allTransactions.sort((a, b) => a.date - b.date);
    
    // Build cumulative timeline
    let cumulative = 0;
    const timeline = [];
    allTransactions.forEach(tx => {
        cumulative += tx.amount;
        const monthDay = tx.date.toLocaleString('default', { month: 'short', day: 'numeric' });
        // Avoid duplicate dates by updating the last one if it's the same day
        if (timeline.length > 0 && timeline[timeline.length - 1].dateStr === monthDay) {
            timeline[timeline.length - 1].value = cumulative;
        } else {
            timeline.push({ dateStr: monthDay, value: Math.max(0, Math.round(cumulative)) });
        }
    });
    
    // Add today's live value at the end if it's different from the last transaction
    const today = new Date();
    const todayStr = 'Today';
    const currentLiveValue = portfolio.summary.portfolio_value || cumulative;
    
    // If the portfolio is very new (only 1 data point), add a fake previous point to draw a line
    if (timeline.length === 1) {
        timeline.unshift({ dateStr: 'Start', value: 0 });
    }
    
    timeline.push({ dateStr: todayStr, value: Math.round(currentLiveValue) });
    
    return timeline;
  }, [portfolio.assets, portfolio.summary.portfolio_value]);

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8 mb-20 lg:mb-0">
      
      <div className="mb-8">
         <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard Overview</h1>
         <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, {currentUser?.username}. Here's a quick summary of your wealth.</p>
      </div>

      {/* Dynamic Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] border border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-colors">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total Investment</p>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{formatCurrency(portfolio.summary.total_investment)}</h3>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-emerald-600 font-bold tracking-tight">Live updating</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] border border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-colors">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Live Portfolio Value</p>
            <div className="flex items-center gap-3">
               <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{formatCurrency(portfolio.summary.portfolio_value)}</h3>
               <button onClick={fetchPortfolio} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Refresh Live Prices">
                 <span className={`material-symbols-outlined text-sm ${isRefreshing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`}>refresh</span>
               </button>
            </div>
          </div>
          <div className="mt-4 flex items-center text-blue-600 font-semibold text-sm">
            <span className="material-symbols-outlined text-sm mr-1">sync</span>
            <span>Auto-refreshing (5s)</span>
          </div>
        </div>

        <div className={`bg-white dark:bg-slate-900 p-6 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] border-l-4 flex flex-col justify-between transition-colors ${portfolio.summary.total_profit >= 0 ? 'border-emerald-500 dark:border-emerald-500' : 'border-red-500 dark:border-red-500'}`}>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total Profit/Loss</p>
            <h3 className={`text-2xl font-bold tracking-tight ${portfolio.summary.total_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {portfolio.summary.total_profit >= 0 ? '+' : ''}{formatCurrency(portfolio.summary.total_profit)}
            </h3>
          </div>
          <div className="mt-4 flex items-center">
            <span className={`${portfolio.summary.total_profit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
              {portfolio.summary.total_profit_pct > 0 ? '+' : ''}{portfolio.summary.total_profit_pct.toFixed(2)}% All Time
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-[0_8px_24px_rgba(25,28,29,0.04)] border border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-colors">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Active Assets</p>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{portfolio.assets.length}</h3>
          </div>
          <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            {portfolio.assets.map((asset, i) => (
              <div key={i} className="h-full" style={{ width: `${asset.allocation_pct}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
            ))}
          </div>
        </div>
      </div>

      {/* Original Style Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        
        {/* Original Asset Allocation Grid */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-[0_8px_24px_rgba(25,28,29,0.04)] border border-slate-100 dark:border-slate-800 flex flex-col transition-colors">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Asset Allocation</h3>
          <div className="grid grid-cols-2 gap-4 flex-grow">
            {groupedAllocations.map((group, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl p-5 flex flex-col justify-center items-center text-center hover:shadow-md transition-shadow">
                <span className="text-slate-500 dark:text-white font-medium text-sm tracking-wide uppercase mb-2">{group.label}</span>
                <span className={`text-3xl font-bold ${group.colorClass}`}>
                  {group.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Original Portfolio Performance Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-[0_8px_24px_rgba(25,28,29,0.04)] border border-slate-100 dark:border-slate-800 transition-colors">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Portfolio Performance</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="dateStr" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  cursor={{stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Link to portfolio details */}
         <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-8 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-10">
               <span className="material-symbols-outlined text-[200px]">monitoring</span>
            </div>
            <div className="relative z-10">
               <h3 className="text-2xl font-bold mb-2">Deep Dive Portfolio Analysis</h3>
               <p className="text-blue-100 max-w-sm mb-8">Manage your individual asset holdings, review recent transactions, and balance your risk allocation.</p>
               <Link to="/portfolio" className="bg-white text-blue-700 px-6 py-3 rounded-lg font-bold shadow-md hover:bg-blue-50 transition-colors inline-flex items-center gap-2">
                 Go to Portfolio <span className="material-symbols-outlined text-sm">arrow_forward</span>
               </Link>
            </div>
         </div>

         {/* Link to Risk Analysis */}
         <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 flex flex-col justify-between transition-colors">
            <div>
               <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">warning</span>
               </div>
               <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">AI Risk & Allocation Doctor</h3>
               <p className="text-slate-500 dark:text-slate-400 mb-6">Uncover hidden correlations and concentration risks in your stock universe using our AI models.</p>
            </div>
            <Link to="/riskanalysis" className="text-blue-600 dark:text-blue-400 font-bold hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-2">
               Run Analysis <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
         </div>
      </div>

    </div>
  );
}
