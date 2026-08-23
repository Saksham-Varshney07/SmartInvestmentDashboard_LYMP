import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { AuthContext } from '../context/AuthContext';

export default function RiskAnalysis() {
  const { currentUser } = useContext(AuthContext);

  const mapRisk = (profile) => {
    if (profile === 'Defender') return 'The Defender';
    if (profile === 'Aggressor') return 'The Aggressor';
    return 'Balanced';
  };
  const mapDuration = (horizon) => {
    if (horizon === 'Short-term') return 2;
    if (horizon === 'Long-term') return 10;
    return 5;
  };

  const [step, setStep] = useState(currentUser?.risk_profile ? 2 : 1);
  const [budget, setBudget] = useState(100000);
  const [duration, setDuration] = useState(currentUser?.investment_horizon ? mapDuration(currentUser.investment_horizon) : 5);
  const [stockInput, setStockInput] = useState('');
  const [stocks, setStocks] = useState(['RELIANCE.NS', 'TCS.NS', 'INFY.NS']);
  const [riskProfile, setRiskProfile] = useState(currentUser?.risk_profile ? mapRisk(currentUser.risk_profile) : 'Balanced');
  
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!stockInput.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/search?q=${stockInput}`);
        const data = await res.json();
        if (data.results) {
           setSuggestions(data.results.filter(r => r.exchDisp === 'NSE' || r.exchDisp === 'BSE').slice(0, 5));
        }
      } catch (err) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [stockInput]);

  const addStock = () => {
    if (stockInput.trim() && !stocks.includes(stockInput.trim().toUpperCase())) {
      setStocks([...stocks, stockInput.trim().toUpperCase()]);
      setStockInput('');
    }
  };

  const removeStock = (sym) => {
    setStocks(stocks.filter(s => s !== sym));
  };

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const payload = {
        budget,
        stocks,
        duration,
        risk_profile: riskProfile
      };
      const response = await fetch('http://127.0.0.1:8000/api/portfolio-risk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      setAnalysisResult(data.analysis);
      setStep(3);
    } catch (err) {
      console.error(err);
      alert("Failed to analyze portfolio. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const PortfolioCard = ({ portfolio }) => {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{portfolio.name}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{portfolio.description}</p>
        
        <div className="h-40 w-full mb-6 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={portfolio.allocations}
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="amount"
              >
                {portfolio.allocations.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(val) => formatCurrency(val)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Proj Returns</span>
            <span className="text-lg font-bold text-slate-800">{portfolio.projected_return_pa}%</span>
          </div>
        </div>

        <div className="space-y-3">
          {portfolio.allocations.map((alloc, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: alloc.color }}></div>
                <span className="text-slate-700">{alloc.name} ({alloc.percentage}%)</span>
              </div>
              <span className="font-semibold text-slate-900">{formatCurrency(alloc.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased font-['Inter'] transition-colors duration-300">

      <main className="max-w-[1240px] mx-auto px-6 py-24 pb-32">
        <div className="flex items-center gap-3 mb-8">
           <span className="material-symbols-outlined text-4xl text-blue-600 dark:text-blue-400">health_and_safety</span>
           <h1 className="text-4xl font-bold text-slate-800 dark:text-white">AI Portfolio Doctor</h1>
        </div>

        {step === 1 && (
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in text-center mt-12 transition-colors">
            <span className="material-symbols-outlined text-[80px] text-blue-100 dark:text-blue-900/30 mb-6">psychology</span>
            <h2 className="text-2xl font-bold mb-4 dark:text-white">Discover Your Investor Profile</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">
              Before we analyze correlation risks, let's establish your baseline risk elasticity. Which of these statements Best describes your approach to financial drawdowns?
            </p>
            
            <div className="space-y-4 text-left">
              <label className="flex items-start gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors relative">
                <input type="radio" name="risk" className="mt-1 w-5 h-5 text-blue-600 accent-blue-600" onChange={() => setRiskProfile('The Defender')} />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">The Defender (Low Risk)</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">I prefer capital preservation. A sudden 15% market crash would cause me severe anxiety. I want steady, reliable compounding.</p>
                </div>
              </label>

              <label className="flex items-start gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors relative">
                <input type="radio" name="risk" defaultChecked className="mt-1 w-5 h-5 text-blue-600 accent-blue-600" onChange={() => setRiskProfile('Balanced')} />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">The Balanced Optimist (Medium Risk)</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">I can stomach temporary 10-20% dips if it means outperforming inflation and bonds. I want a mix of offense and defense.</p>
                </div>
              </label>

              <label className="flex items-start gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors relative">
                <input type="radio" name="risk" className="mt-1 w-5 h-5 text-blue-600 accent-blue-600" onChange={() => setRiskProfile('The Aggressor')} />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">The Aggressor (High Risk)</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">I am here for high alpha. I am comfortable with extreme volatility and 40% drops because my timeline is long enough to recover.</p>
                </div>
              </label>
            </div>

            <button onClick={() => setStep(2)} className="mt-10 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-12 rounded-lg transition-colors w-full">
              Proceed to Portfolio Setup
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in mt-12 transition-colors">
            <button onClick={() => setStep(1)} className="text-sm text-slate-500 dark:text-slate-400 flex items-center mb-6 hover:text-slate-800 dark:hover:text-white transition-colors"><span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span> Choose Profile</button>
            <h2 className="text-2xl font-bold mb-8 dark:text-white">Construct Your Test Portfolio</h2>
            
            <div className="space-y-8">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Total Capital / Budget (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500">₹</span>
                  <input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-3 pl-10 pr-4 font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Investment Horizon (Years)</label>
                <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-3 px-4 font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Build Your Stock Universe</label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Add the stocks you ideally want in your portfolio. Our ML engine will cross-examine them for overlapping correlation risk.</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {stocks.map(sym => (
                    <span key={sym} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-sm font-semibold flex items-center gap-2">
                       {sym}
                       <button onClick={() => removeStock(sym)} className="text-blue-400 hover:text-blue-800 transition-colors leading-none">&times;</button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 relative">
                  <input 
                    type="text" 
                    value={stockInput} 
                    onChange={e => { setStockInput(e.target.value); setShowSuggestions(true); }} 
                    onKeyPress={e => e.key === 'Enter' && addStock()}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="e.g. HDFCBANK" 
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-3 px-4 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" 
                  />
                  <button onClick={addStock} className="bg-slate-800 dark:bg-slate-700 text-white px-6 font-bold rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors">Add</button>
                  
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-14 left-0 right-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl overflow-hidden z-20">
                      {suggestions.map((s, i) => (
                        <div 
                          key={i} 
                          onClick={() => { setStockInput(s.symbol); setSuggestions([]); setShowSuggestions(false); }}
                          className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 flex justify-between items-center"
                        >
                          <div className="font-bold text-slate-800 dark:text-white">{s.symbol}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{s.shortname}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button onClick={runAnalysis} className="mt-10 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-lg transition-colors w-full flex items-center justify-center gap-2">
              {loading ? <span className="material-symbols-outlined animate-spin">data_usage</span> : 'Run Risk Analysis Simulation'}
            </button>
          </div>
        )}

        {step === 3 && analysisResult && (
          <div className="animate-fade-in">
             <button onClick={() => setStep(2)} className="text-sm text-slate-500 flex items-center mb-6 hover:text-slate-800 transition-colors"><span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span> Edit Portfolio inputs</button>
             
             {/* Dynamic Alerts Module */}
             <div className="mb-10 p-6 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white shadow-xl relative overflow-hidden transition-colors">
                <span className="material-symbols-outlined absolute -right-4 -top-4 text-[100px] text-slate-100 dark:text-slate-700 opacity-80 dark:opacity-20">warning</span>
                <div className="relative z-10">
                   <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                     <span className="material-symbols-outlined text-yellow-500 text-3xl">model_training</span>
                     AI Diagnostic Report
                   </h2>
                   <p className="text-slate-500 dark:text-slate-400 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">Analyzed {stocks.length} assets mapped against your {riskProfile} profile.</p>
                   
                   <div className="space-y-4">
                     {analysisResult.ai_warnings.map((warning, i) => (
                       <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border ${analysisResult.has_high_correlation ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'}`}>
                         <span className={`material-symbols-outlined ${analysisResult.has_high_correlation ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {analysisResult.has_high_correlation ? 'warning' : 'verified_user'}
                         </span>
                         <p className={`${analysisResult.has_high_correlation ? 'text-red-700 dark:text-red-200' : 'text-emerald-700 dark:text-emerald-200'} font-medium text-sm leading-relaxed`}>{warning}</p>
                       </div>
                     ))}
                   </div>
                </div>
             </div>

             <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">AI Suggested Allocations</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PortfolioCard portfolio={analysisResult.portfolios.safe} />
                <PortfolioCard portfolio={analysisResult.portfolios.balanced} />
                <PortfolioCard portfolio={analysisResult.portfolios.aggressive} />
             </div>
          </div>
        )}

      </main>
    </div>
  );
}
