import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import { AuthContext } from '../context/AuthContext';

export default function RiskAnalysis() {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

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

  const [step, setStep] = useState(() => {
    const saved = sessionStorage.getItem('risk_step');
    return saved ? parseInt(saved) : 1;
  });
  const [stocks, setStocks] = useState(() => {
    const saved = sessionStorage.getItem('risk_stocks');
    return saved ? JSON.parse(saved) : [];
  });
  const [stockInput, setStockInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [budget, setBudget] = useState(() => {
    const saved = sessionStorage.getItem('risk_budget');
    return saved ? parseInt(saved) : 100000;
  });
  const [duration, setDuration] = useState(() => {
    const saved = sessionStorage.getItem('risk_duration');
    return saved ? parseInt(saved) : 5;
  });
  const [riskProfile, setRiskProfile] = useState(() => {
    const saved = sessionStorage.getItem('risk_profile');
    return saved ? saved : (currentUser?.risk_profile ? mapRisk(currentUser.risk_profile) : 'Balanced');
  });
  
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(() => {
    const saved = sessionStorage.getItem('risk_analysisResult');
    return saved ? JSON.parse(saved) : null;
  });
  const [confirmApply, setConfirmApply] = useState(null);

  useEffect(() => {
    sessionStorage.setItem('risk_step', step);
    sessionStorage.setItem('risk_stocks', JSON.stringify(stocks));
    sessionStorage.setItem('risk_budget', budget);
    sessionStorage.setItem('risk_duration', duration);
    sessionStorage.setItem('risk_profile', riskProfile);
    if (analysisResult) {
      sessionStorage.setItem('risk_analysisResult', JSON.stringify(analysisResult));
    } else {
      sessionStorage.removeItem('risk_analysisResult');
    }
  }, [step, stocks, budget, duration, riskProfile, analysisResult]);

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
           setSuggestions(data.results.slice(0, 5));
        }
      } catch (err) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [stockInput]);

  const addStock = (sym = null) => {
    const symbolToAdd = typeof sym === 'string' ? sym : stockInput.trim();
    if (symbolToAdd && !stocks.includes(symbolToAdd.toUpperCase())) {
      setStocks([...stocks, symbolToAdd.toUpperCase()]);
      setStockInput('');
      setSuggestions([]);
      setShowSuggestions(false);
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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to analyze portfolio. Some stocks may be invalid or have conflicting trading calendars.");
      }
      
      const data = await response.json();
      setAnalysisResult(data.analysis);
      setStep(3);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to analyze portfolio. Ensure backend is running.");
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

  const applyBlueprint = async () => {
    if (!currentUser || !confirmApply) return;
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/portfolio/${currentUser.user_id}/apply_blueprint?type=sandbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations: confirmApply.allocations })
      });
      const data = await response.json();
      if (data.status === 'success') {
        alert('Blueprint successfully copied to your Sandbox Portfolio! Redirecting...');
        navigate('/portfolio', { state: { targetPortfolio: 'sandbox' } });
      } else {
        alert('Failed to apply blueprint.');
      }
    } catch (err) {
      console.error(err);
      alert('Error applying blueprint.');
    } finally {
      setConfirmApply(null);
    }
  };

  const PortfolioCard = ({ portfolio }) => {
    const chartOptions = {
      chart: {
        type: 'donut',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          animateGradually: {
              enabled: true,
              delay: 150
          },
          dynamicAnimation: {
              enabled: true,
              speed: 350
          }
        }
      },
      labels: portfolio.allocations.map(a => a.name),
      colors: portfolio.allocations.map(a => a.color),
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              name: {
                show: false
              },
              value: {
                show: true,
                fontSize: '18px',
                fontWeight: 600,
                formatter: function (val) {
                  return formatCurrency(val)
                }
              }
            }
          }
        }
      },
      dataLabels: {
        enabled: false
      },
      legend: {
        show: false
      },
      stroke: {
        width: 0
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: function (val) {
            return formatCurrency(val)
          }
        }
      }
    };

    const series = portfolio.allocations.map(a => a.amount);

    return (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 relative">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{portfolio.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{portfolio.description}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold tracking-wide whitespace-nowrap">
            {portfolio.projected_return_pa}% PA
          </div>
        </div>
        
        <div className="h-[220px] w-full mb-6 relative flex items-center justify-center">
          <ReactApexChart options={chartOptions} series={series} type="donut" height="100%" />
        </div>
        
        <div className="space-y-3 w-full">
          {portfolio.allocations.map((alloc, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 overflow-hidden mr-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: alloc.color }}></div>
                <span className="text-slate-700 dark:text-slate-300 truncate font-medium" title={alloc.name}>
                  {alloc.name} <span className="text-slate-400 font-normal">({alloc.percentage}%)</span>
                </span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white shrink-0">{formatCurrency(alloc.amount)}</span>
            </div>
          ))}
        </div>
        
        <button 
          onClick={() => {
            if (!currentUser) return alert('Please log in first.');
            setConfirmApply(portfolio);
          }}
          className="mt-6 w-full py-3 rounded-lg font-bold text-sm bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 dark:text-slate-300 dark:hover:text-white transition-colors"
        >
          Apply to Portfolio
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased font-['Inter'] transition-colors duration-300">

      <main className="max-w-[1240px] mx-auto px-6 py-4 pb-12">
        <div className="flex items-center gap-3 mb-4">
           <span className="material-symbols-outlined text-4xl text-blue-600 dark:text-blue-400">health_and_safety</span>
           <h1 className="text-4xl font-bold text-slate-800 dark:text-white">AI Portfolio Doctor</h1>
        </div>

        {step === 1 && (
          <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 py-6 px-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 animate-fade-in text-center transition-colors">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">psychology</span>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-1 text-slate-900 dark:text-white">Discover Your Investor Profile</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-2xl mx-auto text-sm leading-relaxed">
              Before we analyze correlation risks, let's establish your baseline risk elasticity. Which of these statements best describes your approach to financial drawdowns?
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mb-6">
              <label className={`flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${riskProfile === 'The Defender' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                <div className="flex justify-between items-center mb-3">
                  <span className="material-symbols-outlined text-emerald-500 text-2xl">shield</span>
                  <input type="radio" name="risk" className="w-5 h-5 text-blue-600 accent-blue-600" checked={riskProfile === 'The Defender'} onChange={() => setRiskProfile('The Defender')} />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">The Defender</h4>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-2">Low Risk</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">I prefer capital preservation. A sudden 15% market crash would cause me severe anxiety. I want steady, reliable compounding.</p>
              </label>

              <label className={`flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${riskProfile === 'Balanced' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                <div className="flex justify-between items-center mb-3">
                  <span className="material-symbols-outlined text-blue-500 text-2xl">balance</span>
                  <input type="radio" name="risk" className="w-5 h-5 text-blue-600 accent-blue-600" checked={riskProfile === 'Balanced'} onChange={() => setRiskProfile('Balanced')} />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">The Optimist</h4>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-2">Medium Risk</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">I can stomach temporary 10-20% dips if it means outperforming inflation and bonds. I want a mix of offense and defense.</p>
              </label>

              <label className={`flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${riskProfile === 'The Aggressor' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                <div className="flex justify-between items-center mb-3">
                  <span className="material-symbols-outlined text-amber-500 text-2xl">local_fire_department</span>
                  <input type="radio" name="risk" className="w-5 h-5 text-blue-600 accent-blue-600" checked={riskProfile === 'The Aggressor'} onChange={() => setRiskProfile('The Aggressor')} />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">The Aggressor</h4>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-2">High Risk</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">I am here for high alpha. I am comfortable with extreme volatility and drops because my timeline is long enough to recover.</p>
              </label>
            </div>

            <button onClick={() => setStep(2)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-12 rounded-xl transition-all shadow-md hover:shadow-lg w-full md:w-auto">
              Proceed to Portfolio Setup
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 py-6 px-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in transition-colors">
            <button onClick={() => setStep(1)} className="text-sm text-slate-500 dark:text-slate-400 flex items-center mb-4 hover:text-slate-800 dark:hover:text-white transition-colors"><span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span> Choose Profile</button>
            <h2 className="text-2xl font-bold mb-6 dark:text-white">Construct Your Test Portfolio</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Capital / Budget (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500">₹</span>
                  <input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 pl-10 pr-4 font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Investment Horizon (Years)</label>
                <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-4 font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Build Your Stock Universe</label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">Add the stocks you ideally want in your portfolio. Our ML engine will cross-examine them for overlapping correlation risk.</p>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {stocks.map(sym => (
                    <span key={sym} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[13px] font-semibold flex items-center gap-2">
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
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-4 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" 
                  />
                  <button onClick={addStock} className="bg-slate-800 dark:bg-slate-700 text-white px-6 font-bold rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors">Add</button>
                  
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-14 left-0 right-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl overflow-hidden z-20">
                      {suggestions.map((s, i) => (
                        <div 
                          key={i} 
                          onMouseDown={(e) => { e.preventDefault(); addStock(s.symbol); }}
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

            <button onClick={runAnalysis} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-12 rounded-lg transition-colors w-full flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
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
                     <span className={`material-symbols-outlined text-3xl ${analysisResult.has_high_correlation ? 'text-amber-500' : 'text-emerald-500'}`}>
                       {analysisResult.has_high_correlation ? 'warning' : 'check_circle'}
                     </span>
                     AI Diagnostic Report - {analysisResult.has_high_correlation ? 'Needs Attention' : 'Optimal'}
                   </h2>
                   <p className="text-slate-500 dark:text-slate-400 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                     Analyzed {stocks.length} assets mapped against your <strong>{riskProfile}</strong> profile.
                   </p>
                   
                   <div className="space-y-4">
                     {analysisResult.ai_warnings.map((warning, i) => (
                       <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border ${analysisResult.has_high_correlation ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'}`}>
                         <span className={`material-symbols-outlined ${analysisResult.has_high_correlation ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {analysisResult.has_high_correlation ? 'warning' : 'check_circle'}
                         </span>
                         <p className={`${analysisResult.has_high_correlation ? 'text-amber-700 dark:text-amber-200' : 'text-emerald-700 dark:text-emerald-200'} font-medium text-sm leading-relaxed`}>{warning}</p>
                       </div>
                     ))}
                   </div>
                </div>
             </div>

             {/* Correlation Heatmap */}
             {analysisResult.correlation_matrix && (
               <div className="mb-12 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Asset Correlation Matrix</h3>
                 <p className="text-sm text-slate-500 mb-6">
                   Darker colors indicate high correlation overlap. If multiple assets move together, diversification is compromised.
                 </p>
                 <div className="h-[300px]">
                   <ReactApexChart 
                     key={`heatmap-${analysisResult.correlation_matrix.map(r => r.name).join('-')}`}
                     options={{
                       chart: { type: 'heatmap', toolbar: { show: false } },
                       dataLabels: { enabled: true },
                       colors: ["#dc2626"],
                       plotOptions: {
                         heatmap: {
                           shadeIntensity: 0.5,
                           radius: 4,
                           useFillColorAsStroke: false,
                           colorScale: {
                             ranges: [
                               { from: 0.0, to: 0.3, name: 'Low', color: '#10b981' },
                               { from: 0.31, to: 0.7, name: 'Medium', color: '#f59e0b' },
                               { from: 0.71, to: 1.0, name: 'High', color: '#ef4444' }
                             ]
                           }
                         }
                       },
                       xaxis: { 
                          type: 'category',
                          categories: analysisResult.correlation_matrix.map(r => r.name)
                        }
                     }}
                     series={analysisResult.correlation_matrix}
                     type="heatmap"
                     height="100%"
                   />
                 </div>
               </div>
             )}

             {/* Sector Exposure Breakdown */}
             {analysisResult.sector_breakdown && (
               <div className="mb-12 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Sector Exposure Breakdown</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                   {analysisResult.sector_breakdown.map((sector, i) => (
                     <div key={i}>
                       <div className="flex justify-between items-center mb-2">
                         <span className="font-bold text-slate-700 dark:text-slate-300">{sector.name}</span>
                         <span className="text-sm font-bold text-slate-900 dark:text-white">{sector.percentage}%</span>
                       </div>
                       <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                         <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${sector.percentage}%` }}></div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">AI Suggested Allocations</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <PortfolioCard portfolio={analysisResult.portfolios.safe} />
                <PortfolioCard portfolio={analysisResult.portfolios.balanced} />
                <PortfolioCard portfolio={analysisResult.portfolios.aggressive} />
             </div>

             {/* Historical Drawdown Simulation */}
             {analysisResult.simulation_data && (
               <div className="mb-12 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_24px_rgba(25,28,29,0.04)] border border-slate-100 dark:border-slate-800 p-8">
                 <div className="flex justify-between items-center mb-6">
                   <div>
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white">Historical Drawdown Simulation</h3>
                     <p className="text-sm text-slate-500">How your concentrated stock picks compare to the AI Balanced portfolio during a 12-month trailing stress test (including a simulated market crash).</p>
                   </div>
                   <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">Trailing 12M</div>
                 </div>
                 
                 <div className="h-[350px]">
                   <ReactApexChart 
                     options={{
                       chart: { type: 'area', toolbar: { show: false }, animations: { enabled: true } },
                       colors: ['#ef4444', '#10b981'],
                       dataLabels: { enabled: false },
                       stroke: { curve: 'smooth', width: 3 },
                       fill: {
                         type: 'gradient',
                         gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.0, stops: [0, 90, 100] }
                       },
                       xaxis: {
                         categories: analysisResult.simulation_data.categories,
                         labels: { style: { colors: '#94a3b8' } }
                       },
                       yaxis: {
                         labels: {
                           style: { colors: '#94a3b8' },
                           formatter: (val) => "₹" + (val/1000).toFixed(0) + "k"
                         }
                       },
                       grid: { borderColor: '#334155', strokeDashArray: 4 },
                       tooltip: { theme: 'dark' },
                       legend: { position: 'top', horizontalAlign: 'right' }
                     }}
                     series={[
                       { name: 'Your Stock Picks', data: analysisResult.simulation_data.user_portfolio },
                       { name: 'AI Balanced Portfolio', data: analysisResult.simulation_data.ai_balanced }
                     ]}
                     type="area"
                     height="100%"
                   />
                 </div>
               </div>
             )}
          </div>
        )}

      </main>

      {/* Custom Confirmation Modal */}
      {confirmApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden scale-in">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">swap_calls</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Apply Blueprint</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Are you sure you want to copy the <strong>{confirmApply.name}</strong> blueprint to your <strong>Sandbox Portfolio</strong>? This will safely overwrite your current Sandbox assets without affecting your Real Portfolio.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmApply(null)} 
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={applyBlueprint} 
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Confirm & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
