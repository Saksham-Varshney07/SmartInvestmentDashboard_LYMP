import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AskAiModal from '../components/AskAiModal';

export default function StockSearch() {
  const { stockname } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1M');
  const [fetchError, setFetchError] = useState(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setFetchError(null);
        const response = await fetch(`http://127.0.0.1:8000/api/analyze/${stockname}`);
        const result = await response.json();
        if (!response.ok) {
          setFetchError(result.detail || 'Server error');
        } else {
          setData(result);
        }
      } catch (err) {
        setFetchError('Could not connect to the analysis server. Make sure the backend is running.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (stockname) fetchData();
  }, [stockname]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400 bg-transparent transition-colors duration-300">
         <span className="material-symbols-outlined text-4xl mb-4 animate-spin">data_usage</span>
         <p>Fetching live market data and fundamentals...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-12 bg-transparent transition-colors duration-300">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-6 rounded-xl flex items-start gap-3 max-w-md">
          <span className="material-symbols-outlined mt-0.5">error</span>
          <div>
            <p className="font-bold mb-1">Analysis Failed</p>
            <p className="text-sm">{fetchError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400 bg-[#f8f9fa] dark:bg-slate-950 transition-colors duration-300">
        <span className="material-symbols-outlined text-4xl mb-4 text-slate-300 dark:text-slate-600">search_off</span>
        <p>No data returned for <strong>{stockname}</strong>. The symbol may be invalid.</p>
      </div>
    );
  }

  if (data?.detail || data?.error) {
    return (
      <div className="p-8 max-w-[1440px] mx-auto antialiased font-['Inter']">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
           <span className="material-symbols-outlined">error</span> Error: {data.detail || data.error}
        </div>
      </div>
    );
  }

  const hist = data?.history || [];
  
  const filterHistory = (history, range) => {
    if (!history.length) return [];
    const latestDate = new Date(history[history.length - 1].date);
    
    let cutoffDate = new Date(latestDate);
    if (range === '1D') cutoffDate.setDate(cutoffDate.getDate() - 1);
    else if (range === '1W') cutoffDate.setDate(cutoffDate.getDate() - 7);
    else if (range === '1M') cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    else if (range === '3M') cutoffDate.setMonth(cutoffDate.getMonth() - 3);
    else if (range === '6M') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
    else if (range === '1Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    else if (range === '3Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 3);
    else if (range === '5Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
    else return history; // For 'MAX'

    return history.filter(d => new Date(d.date) >= cutoffDate);
  };

  const filteredHist = filterHistory(hist, timeRange);

  const latestPrice = filteredHist.length > 0 ? filteredHist[filteredHist.length - 1].close : 0;
  const startPrice = filteredHist.length > 0 ? filteredHist[0].close : 0;
  const priceChange = latestPrice - startPrice;
  const pctChange = startPrice ? (priceChange / startPrice) * 100 : 0;
  
  const isPositive = priceChange >= 0;
  
  const f = data?.fundamentals || {};
  const r = data?.analysis || {};

  const riskMeta = {
    High: { bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400', icon: 'warning', dot: 'bg-red-500' },
    Moderate: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-400', icon: 'info', dot: 'bg-yellow-500' },
    Low: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', icon: 'verified_user', dot: 'bg-emerald-500' },
  };
  const rm = riskMeta[r.risk] || riskMeta['Moderate'];

  const aiReasoning = () => {
    const parts = [];
    const vol = r.volatility ? (r.volatility * 100).toFixed(1) : null;
    const ar = r.anomaly_ratio ? (r.anomaly_ratio * 100).toFixed(1) : null;
    const yr = r.yearly_return;
    if (vol) parts.push(`Volatility is ${vol}% (market avg ~15%). ${Number(vol) > 25 ? 'This is significantly above average — the stock swings wildly.' : 'This is within an acceptable range.'}`);
    if (ar) parts.push(`Isolation Forest flagged anomalous trading sessions in ${ar}% of the last year. ${Number(ar) > 20 ? 'High anomaly frequency signals unpredictable behavior.' : 'Low anomaly frequency means the stock trades predictably.'}`);
    if (yr !== undefined) parts.push(`Yearly return is ${yr}%. ${yr > 10 ? 'Strong historical returns support its classification.' : yr < 0 ? 'Negative returns add to downside risk.' : 'Returns are modest but stable.'}`);
    return parts;
  };

  const getStabilityExplainer = () => {
    if (!r.stability) return null;
    const vol = r.volatility ? (r.volatility * 100).toFixed(2) : 0;
    const ar = r.anomaly_ratio ? (r.anomaly_ratio * 100).toFixed(1) : 0;
    
    if (r.stability === 'Stable') {
      return `Classified as Stable because the rolling price volatility (${vol}%) is safely below the 3% risk threshold, and the ML anomaly detection flagged only ${ar}% of historical trading days as outliers (below the 10% maximum tolerance).`;
    } else {
      let reasons = [];
      if (Number(vol) > 3) reasons.push(`excessive rolling volatility (${vol}% > 3% limit)`);
      if (Number(ar) > 10) reasons.push(`high frequency of erratic trading sessions (${ar}% > 10% anomaly tolerance)`);
      
      return `Flagged as Unstable by the Isolation Forest model due to ${reasons.join(' and ')}.`;
    }
  };


  return (
    <div className="min-h-screen bg-transparent antialiased font-['Inter'] transition-colors duration-300">
      <main className="max-w-[1440px] mx-auto px-6 py-6 pb-20">
        
        {/* Breadcrumb & Title */}
        <div className="flex justify-between items-end mb-6">
          <div className="flex items-center gap-3">
             <Link to="/" className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded">
               <span className="material-symbols-outlined text-sm">arrow_back</span> Dashboard
             </Link>
             <div className="h-6 w-px bg-slate-300 dark:bg-slate-700"></div>
             <div>
               <h1 className="text-3xl font-bold text-slate-900 dark:text-white leading-none">{f.shortName || stockname.toUpperCase()}</h1>
               <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{f.exchange} • {f.quoteType} • {f.currency}</span>
             </div>
          </div>
          <div className="flex gap-3">
             <button className="p-2 border border-slate-200 dark:border-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800"><span className="material-symbols-outlined text-sm">notifications</span></button>
             <button className="p-2 border border-slate-200 dark:border-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800"><span className="material-symbols-outlined text-sm">bookmark</span></button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2">
          
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6 transition-colors">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-baseline gap-2">
                {f?.currency === 'INR' || stockname?.endsWith('.NS') ? '₹' : '$'}{latestPrice.toFixed(2)}
                <span className={`text-sm font-semibold flex items-center gap-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{pctChange.toFixed(2)}%)
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Live market data representation</p>
            </div>
            
            
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredHist}>
                  <XAxis 
                     dataKey="date" 
                     tickFormatter={(tick) => new Date(tick).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                     minTickGap={50}
                     axisLine={false}
                     tickLine={false}
                     tick={{fontSize: 12, fill: '#64748b'}}
                  />
                  <YAxis 
                     domain={['auto', 'auto']} 
                     axisLine={false} 
                     tickLine={false}
                     tick={{fontSize: 12, fill: '#64748b'}}
                     tickFormatter={(val) => `${f?.currency === 'INR' || stockname?.endsWith('.NS') ? '₹' : '$'}${val}`}
                  />
                  <Tooltip 
                     labelFormatter={(l) => new Date(l).toLocaleDateString()}
                     formatter={(val) => [`${f?.currency === 'INR' || stockname?.endsWith('.NS') ? '₹' : '$'}${Number(val).toFixed(2)}`, 'Price']}
                  />
                  <Line 
                     type="monotone" 
                     dataKey="close" 
                     stroke={isPositive ? '#059669' : '#dc2626'} 
                     strokeWidth={2} 
                     dot={false}
                     activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex gap-2 mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
              {['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'MAX'].map(t => (
                <button 
                   key={t} 
                   onClick={() => setTimeRange(t)}
                   className={`text-xs font-semibold px-3 py-1 rounded-full ${timeRange === t ? 'bg-[#059669] text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                   {t}
                </button>
              ))}
            </div>
          </div>

          
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
             
             <div className="flex gap-6 px-6 border-b border-slate-100 dark:border-slate-800 pt-4">
               <button className="text-sm font-bold text-[#059669] border-b-2 border-[#059669] pb-3">Overview</button>
               <button className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white pb-3">Technicals</button>
               <button className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white pb-3">News</button>
               <button className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white pb-3">Events</button>
             </div>

             <div className="p-6">
                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-1">Performance <span className="material-symbols-outlined text-sm text-slate-400">info</span></h3>
                
                
                <div className="mb-6">
                   <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <span>Today's low <br/><strong className="text-sm text-slate-900 dark:text-white">{f.regularMarketDayLow || (hist.length > 0 ? hist[hist.length-1].low : '-')}</strong></span>
                      <span className="text-right">Today's high <br/><strong className="text-sm text-slate-900 dark:text-white">{f.regularMarketDayHigh || (hist.length > 0 ? hist[hist.length-1].high : '-')}</strong></span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full relative">
                      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-2 h-2 bg-slate-700 dark:bg-slate-400 rotate-45 transform"></div>
                   </div>
                </div>

                
                <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-8">
                   <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <span>52 week low <br/><strong className="text-sm text-slate-900 dark:text-white">{f.fiftyTwoWeekLow || '-'}</strong></span>
                      <span className="text-right">52 week high <br/><strong className="text-sm text-slate-900 dark:text-white">{f.fiftyTwoWeekHigh || '-'}</strong></span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full relative">
                      <div className="absolute top-1/2 left-2/3 -translate-y-1/2 w-2 h-2 bg-slate-700 dark:bg-slate-400 rotate-45 transform"></div>
                   </div>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-8 text-sm">
                   <div><div className="text-slate-500 dark:text-slate-400 mb-1">Open price</div><div className="font-semibold text-slate-900 dark:text-white">{f.regularMarketOpen || '-'}</div></div>
                   <div><div className="text-slate-500 dark:text-slate-400 mb-1">Previous close</div><div className="font-semibold text-slate-900 dark:text-white">{f.previousClose || '-'}</div></div>
                   <div><div className="text-slate-500 dark:text-slate-400 mb-1">Live volume</div><div className="font-semibold text-slate-900 dark:text-white">{f.regularMarketVolume || '-'}</div></div>
                   <div><div className="text-slate-500 dark:text-slate-400 mb-1">Lower circuit</div><div className="font-semibold text-slate-900 dark:text-white">-</div></div>
                   <div><div className="text-slate-500 dark:text-slate-400 mb-1">Upper circuit</div><div className="font-semibold text-slate-900 dark:text-white">-</div></div>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-1 mt-8">Fundamentals <span className="material-symbols-outlined text-sm text-slate-400">info</span></h3>
                
                <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm text-slate-900 dark:text-white">
                   <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-slate-500 dark:text-slate-400">Market Cap</span>
                      <span className="font-semibold">{f.marketCap ? `₹${(f.marketCap/10000000).toFixed(0)}Cr` : '-'}</span>
                   </div>
                   <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-slate-500 dark:text-slate-400">ROE</span>
                      <span className="font-semibold">{f.returnOnEquity ? `${(f.returnOnEquity*100).toFixed(2)}%` : '-'}</span>
                   </div>
                   <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-slate-500 dark:text-slate-400">P/E Ratio(TTM)</span>
                      <span className="font-semibold">{f.trailingPE ? f.trailingPE.toFixed(2) : '-'}</span>
                   </div>
                   <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-slate-500 dark:text-slate-400">EPS(TTM)</span>
                      <span className="font-semibold">{f.trailingEps ? f.trailingEps.toFixed(2) : '-'}</span>
                   </div>
                   <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-slate-500 dark:text-slate-400">P/B Ratio</span>
                      <span className="font-semibold">{f.priceToBook ? f.priceToBook.toFixed(2) : '-'}</span>
                   </div>
                   <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-slate-500 dark:text-slate-400">Dividend Yield</span>
                      <span className="font-semibold">{f.dividendYield ? `${(f.dividendYield*100).toFixed(2)}%` : '0.00%'}</span>
                   </div>
                   <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-slate-500 dark:text-slate-400">Industry P/E</span>
                      <span className="font-semibold">-</span>
                   </div>
                   <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-slate-500 dark:text-slate-400">Book Value</span>
                      <span className="font-semibold">{f.bookValue ? f.bookValue.toFixed(2) : '-'}</span>
                   </div>
                </div>

             </div>
          </div>
        </div>

        
        <div className="space-y-5">
           
           {/* USP 1: AI Risk Classification Badge */}
           {r.risk && (
             <div className={`rounded-xl border p-5 ${rm.bg} ${rm.border}`}>
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2">
                   <span className={`material-symbols-outlined ${rm.text}`}>{rm.icon}</span>
                   <span className="font-bold text-slate-800">AI Risk Classification</span>
                 </div>
                 <span className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full ${rm.bg} ${rm.text} border ${rm.border}`}>
                   <span className={`w-2 h-2 rounded-full ${rm.dot} animate-pulse`}></span>
                   {r.risk} Risk
                 </span>
               </div>
               <div className="flex gap-1 mt-2">
                 {Array.from({length: 5}).map((_, i) => (
                   <span key={i} className={`material-symbols-outlined text-base ${i < (r.stars || 0) ? 'text-yellow-400' : 'text-slate-200'}`}>star</span>
                 ))}
                 <span className="text-xs text-slate-500 ml-1 self-center">{r.stars}/5 AI Score</span>
               </div>
             </div>
           )}

           {/* USP 2: Stability Analysis Card */}
           {r.stability && (
             <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-colors">
               <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                 <span className="material-symbols-outlined text-indigo-500 dark:text-indigo-400">show_chart</span>
                 Stability Analysis
               </h4>
               <div className="flex items-center justify-between mb-4">
                 <span className="text-sm text-slate-500 dark:text-slate-400">Stability Rating</span>
                 <span className={`text-sm font-bold px-3 py-1 rounded-full ${r.stability === 'Stable' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
                   {r.stability}
                 </span>
               </div>
               <div className="space-y-3 text-sm text-slate-900 dark:text-white">
                 <div className="flex justify-between">
                   <span className="text-slate-500 dark:text-slate-400">Volatility</span>
                   <span className="font-semibold">{r.volatility ? `${(r.volatility*100).toFixed(2)}%` : '-'}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-slate-500 dark:text-slate-400">Anomaly Frequency</span>
                   <span className="font-semibold">{r.anomaly_ratio !== undefined ? `${(r.anomaly_ratio*100).toFixed(1)}%` : '-'}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-slate-500 dark:text-slate-400">Yearly Return</span>
                   <span className={`font-semibold ${r.yearly_return >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{r.yearly_return !== undefined ? `${r.yearly_return}%` : '-'}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-slate-500 dark:text-slate-400">Trend</span>
                   <span className="font-semibold capitalize">{r.trend || '-'}</span>
                 </div>
               </div>
               <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800 pt-3 leading-relaxed">
                 {getStabilityExplainer()}
               </p>
             </div>
           )}

           {/* USP 6: Explainable AI */}
           {r.risk && (
             <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
               <button
                 onClick={() => setShowReasoning(!showReasoning)}
                 className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
               >
                 <div className="flex items-center gap-2">
                   <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">psychology</span>
                   <span className="font-bold text-slate-900 dark:text-white text-sm">Why is this risk {r.risk}?</span>
                 </div>
                 <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 transition-transform" style={{transform: showReasoning ? 'rotate(180deg)' : 'rotate(0)'}}>
                   expand_more
                 </span>
               </button>
               {showReasoning && (
                 <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800">
                   <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-4 mb-3">AI Reasoning (Explainable AI)</p>
                   <ul className="space-y-3">
                     {aiReasoning().map((reason, i) => (
                       <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                         <span className="material-symbols-outlined text-blue-400 dark:text-blue-500 text-base mt-0.5 shrink-0">arrow_right</span>
                         {reason}
                       </li>
                     ))}
                   </ul>
                 </div>
               )}
             </div>
           )}

           <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 text-center transition-colors">
              <div className="w-48 h-32 mx-auto bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-300 dark:text-blue-500 mb-6 border border-blue-100 dark:border-blue-900/50">
                 <span className="material-symbols-outlined text-6xl">location_city</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Want to invest in this stock?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Test the performance of this asset in your Sandbox Portfolio.</p>
              <button onClick={async () => {
                if (!currentUser) return;
                try {
                  await fetch('http://127.0.0.1:8000/api/portfolio/transaction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      user_id: currentUser.user_id,
                      symbol: f.shortName || stockname.toUpperCase(),
                      transaction_type: 'BUY',
                      shares: 10,
                      price_at_purchase: startPrice > 0 ? startPrice : latestPrice,
                      portfolio_type: 'sandbox'
                    })
                  });
                  setShowBuyModal(true);
                } catch (e) {
                  console.error(e);
                }
              }} className="w-full bg-[#059669] hover:bg-[#047857] text-white font-bold py-3 rounded-lg transition-colors flex flex-col items-center">
                <span>Buy 10 Shares (Sandbox)</span>
                <span className="text-[10px] font-normal opacity-80 mt-0.5">Simulates purchase at start of {timeRange} chart</span>
              </button>

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                 <div onClick={() => navigate('/sipplanner')} className="flex items-center justify-between text-left border border-slate-200 dark:border-slate-700 rounded-lg p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3">
                       <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">calendar_month</span>
                       <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Create Stock SIP</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Automate your investments</p>
                       </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">chevron_right</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
      </main>

      {/* Custom Buy Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden scale-in">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Purchase Successful</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                <strong>{f.shortName || stockname.toUpperCase()}</strong> has been added to your Sandbox Portfolio! 
                (Note: Sandbox mode uses virtual currency).
              </p>
              <button 
                onClick={() => setShowBuyModal(false)} 
                className="w-full px-4 py-3 rounded-xl font-bold text-white bg-[#059669] hover:bg-[#047857] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ask AI FAB */}
      {!showAiModal && (
        <button
          onClick={() => setShowAiModal(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transition-all z-40 flex items-center gap-2 group"
        >
          <span className="material-symbols-outlined text-2xl group-hover:animate-pulse">magic_button</span>
          <span className="font-bold hidden md:block pr-2">Ask AI</span>
        </button>
      )}

      {/* Ask AI Modal */}
      {showAiModal && (
        <AskAiModal 
          symbol={stockname.toUpperCase()} 
          stockData={data?.analysis}
          onClose={() => setShowAiModal(false)} 
        />
      )}
    </div>
  );
}
