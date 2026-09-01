import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import { motion, useMotionValue, useTransform, AnimatePresence, animate } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { AiContext } from '../context/AiContext';

const SwipeCard = ({ card, onSwipe, index, isTop, triggerSwipe }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacityReject = useTransform(x, [-100, -20, 0], [1, 0, 0]);
  const opacityWishlist = useTransform(x, [0, 20, 100], [0, 0, 1]);
  const scale = isTop ? 1 : 0.95 - (index * 0.05);
  const yOffset = isTop ? 0 : index * 15;

  useEffect(() => {
    if (isTop && triggerSwipe) {
      const targetX = triggerSwipe === 'wishlist' ? 300 : -300;
      animate(x, targetX, { duration: 0.2 }).then(() => {
        onSwipe(triggerSwipe, card);
      });
    }
  }, [triggerSwipe, isTop, card, x, onSwipe]);

  const handleDragEnd = (event, info) => {
    if (info.offset.x > 80) {
      onSwipe('wishlist', card);
    } else if (info.offset.x < -80) {
      onSwipe('reject', card);
    }
  };

  return (
    <motion.div
      style={{ x, rotate, zIndex: 10 - index }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
      className={`absolute inset-0 w-full h-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden ${isTop ? 'cursor-grab' : 'pointer-events-none'}`}
      initial={{ scale: 0.9, y: 30, opacity: 0 }}
      animate={{ scale, y: yOffset, opacity: 1 }}
      exit={{ x: x.get() > 0 ? 300 : -300, opacity: 0, transition: { duration: 0.2 } }}
    >
      <div className="flex-1 p-6 flex flex-col relative">
        <motion.div style={{ opacity: opacityWishlist }} className="absolute top-6 left-6 border-4 border-green-500 text-green-500 font-black text-xl px-2 py-1 -rotate-12 rounded z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">BULLISH!</motion.div>
        <motion.div style={{ opacity: opacityReject }} className="absolute top-6 right-6 border-4 border-red-500 text-red-500 font-black text-xl px-2 py-1 rotate-12 rounded z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">BEARISH!</motion.div>
        
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{card.ticker}</h3>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">{card.name}</p>
        
        <p className="text-slate-700 dark:text-slate-300 text-sm flex-1 leading-relaxed line-clamp-4">{card.reason}</p>
        
        <div className="h-28 w-full mt-auto relative z-30 pointer-events-auto">
          <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">6-Month Trend Projection</p>
          <ReactApexChart 
             options={{
               chart: { type: 'area', sparkline: { enabled: true }, animations: { enabled: false } },
               stroke: { curve: 'smooth', width: 2 },
               fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 90, 100] } },
               colors: ['#3b82f6'],
               tooltip: { 
                 theme: 'light',
                 fixed: { enabled: false }, 
                 x: { show: false }, 
                 marker: { show: false },
                 y: { formatter: (val) => '₹' + val, title: { formatter: () => 'Price:' } }
               }
             }}
             series={[{ name: 'Price', data: card.historical_trend }]}
             type="area"
             height="100%"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default function RiskAnalysis() {
  const { currentUser } = useContext(AuthContext);
  const { setAiPageData } = useContext(AiContext);
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
  const [rejectedStocks, setRejectedStocks] = useState(() => {
    const saved = sessionStorage.getItem('risk_rejected');
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

  // AI Suggestions State
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnswers, setAiAnswers] = useState({
    horizon: 'Long term',
    market: 'Indian stocks',
    risk: 'Medium risk',
    sector: ''
  });
  const [aiApiKey, setAiApiKey] = useState(localStorage.getItem('openRouterApiKey') || '');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [activeWarningIdx, setActiveWarningIdx] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);

  const [triggerSwipe, setTriggerSwipe] = useState(null);

  const handleSwipe = (direction, card) => {
    if (direction === 'wishlist') {
      addStock(card.ticker);
    } else {
      const updatedRejected = [...rejectedStocks, card.ticker];
      setRejectedStocks(updatedRejected);
      sessionStorage.setItem('risk_rejected', JSON.stringify(updatedRejected));
    }
    setAiSuggestions(prev => prev.filter(c => c?.ticker !== card?.ticker));
    setTriggerSwipe(null);
  };

  const handleGenerateAISuggestions = async () => {
    if (!aiApiKey.trim()) {
      setAiError('Please provide an OpenRouter API key.');
      return;
    }
    
    localStorage.setItem('openRouterApiKey', aiApiKey.trim());
    setAiLoading(true);
    setAiError(null);

    const excludeTickers = [...stocks.map(s => s.ticker), ...rejectedStocks];
    const excludeText = excludeTickers.length > 0 ? ` DO NOT suggest any of these tickers under any circumstance: ${excludeTickers.join(', ')}.` : '';

    const prompt = `I have a budget of ₹${budget}. I am looking for ${aiAnswers.horizon} investments in ${aiAnswers.market}, with a ${aiAnswers.risk} profile. I prefer sectors: ${aiAnswers.sector || 'Any'}. Please suggest 5 specific stock tickers I should consider adding to my portfolio.${excludeText} Provide a 1-sentence reason for each. 
Return ONLY a raw JSON array (no markdown code blocks, no intro/outro text) matching this exact schema:
[
  {
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "reason": "Strong brand and continuous innovation in consumer electronics.",
    "historical_trend": [120, 125, 130, 128, 135, 150]
  }
]
CRITICAL RULES:
1. The "ticker" field MUST be the exact, valid Yahoo Finance ticker symbol (e.g., "HDFCBANK.NS", "RELIANCE.NS", "AAPL", "MSFT"). NEVER put the company name in the "ticker" field.
2. If suggesting Indian stocks, you MUST append the ".NS" or ".BO" suffix to the ticker (e.g. "INFY.NS").
3. The historical_trend MUST be an array of 6 numbers representing mock monthly stock prices for the last 6 months. DO NOT return anything except the JSON array.`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiApiKey}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'Smart Investment Dashboard',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch recommendations.');
      }

      let content = data.choices[0].message.content;
      
      // Robustly extract JSON array if the LLM includes intro/outro text
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Could not locate JSON array in AI response.');
      
      const parsed = JSON.parse(match[0]);
      
      if (!Array.isArray(parsed)) throw new Error('AI did not return a valid list.');
      
      // Override mock trends with real market data
      const withRealData = await Promise.all(parsed.map(async (card) => {
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/market-trend?symbol=${card.ticker}`);
          if (res.ok) {
            const trendData = await res.json();
            if (trendData.trend && trendData.trend.length > 0) {
              return { ...card, historical_trend: trendData.trend };
            }
          }
        } catch (e) {
          console.error("Failed to fetch real trend for", card.ticker, e);
        }
        return card; // fallback to LLM mock data if backend fetch fails
      }));
      
      setAiSuggestions(withRealData);
    } catch (err) {
      console.error(err);
      setAiError("Failed to parse AI suggestions. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    sessionStorage.setItem('risk_step', step);
    sessionStorage.setItem('risk_stocks', JSON.stringify(stocks));
    sessionStorage.setItem('risk_budget', budget);
    sessionStorage.setItem('risk_duration', duration);
    sessionStorage.setItem('risk_profile', riskProfile);
    if (analysisResult) {
      sessionStorage.setItem('risk_analysisResult', JSON.stringify(analysisResult));
      
      // Push live page data to the AI Context
      let aiData = `Current Portfolio Stocks: ${stocks.join(', ')}\n`;
      aiData += `Budget: ₹${budget}, Risk Profile: ${riskProfile}, Horizon: ${duration} years\n`;
      
      if (analysisResult.correlation_matrix) {
        aiData += `\nCORRELATION MATRIX (Red means High Correlation/Risk, Green means Low):\n`;
        const matrix = analysisResult.correlation_matrix;
        Object.keys(matrix).forEach(row => {
          Object.keys(matrix[row]).forEach(col => {
             if (row !== col) {
               const val = matrix[row][col];
               if (typeof val === 'number' && !isNaN(val)) {
                 const color = val > 0.7 ? "RED (Danger/High Risk)" : val < 0.3 ? "GREEN (Safe/Low Risk)" : "YELLOW (Moderate)";
                 aiData += `- Correlation between ${row} and ${col} is ${val.toFixed(2)} (${color})\n`;
               } else {
                 aiData += `- Correlation between ${row} and ${col} is N/A\n`;
               }
             }
          });
        });
      }
      if (analysisResult.risk_warnings && analysisResult.risk_warnings.length > 0) {
        aiData += `\nRISK WARNINGS FIRED ON SCREEN:\n`;
        analysisResult.risk_warnings.forEach(w => aiData += `- ${w.title}: ${w.message}\n`);
      }
      setAiPageData(aiData);
    } else {
      sessionStorage.removeItem('risk_analysisResult');
      setAiPageData("");
    }
  }, [step, stocks, budget, duration, riskProfile, analysisResult, setAiPageData]);

  // Clear AI context data when the user leaves the Risk Analysis page
  useEffect(() => {
    return () => setAiPageData("");
  }, [setAiPageData]);

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
                  <button onClick={() => setShowAIModal(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm hover:shadow">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span> AI Suggest
                  </button>
                  
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
             
             {/* Dynamic Alerts Module - Creative Space Saving Carousel */}
             <div className="mb-10 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm relative overflow-hidden transition-colors flex flex-col md:flex-row gap-6 items-stretch">
                {/* Left Side Info */}
                <div className="md:w-1/3 flex flex-col justify-center border-r border-slate-100 dark:border-slate-800 pr-6">
                   <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 text-slate-900 dark:text-white">
                     <span className={`material-symbols-outlined text-3xl ${analysisResult.ai_warnings.length > 0 && !analysisResult.ai_warnings[0].startsWith('Great job!') ? 'text-amber-500' : 'text-emerald-500'}`}>
                       {analysisResult.ai_warnings.length > 0 && !analysisResult.ai_warnings[0].startsWith('Great job!') ? 'warning' : 'check_circle'}
                     </span>
                     Diagnostic Report
                   </h2>
                   <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                     Analyzed {analysisResult.valid_count || stocks.length} assets against <strong>{riskProfile}</strong>.
                   </p>
                   
                   {analysisResult.ai_warnings.length > 1 && (
                     <div className="flex gap-2 items-center mt-auto">
                       <button 
                         onClick={() => {
                           setSlideDirection(-1);
                           setActiveWarningIdx(prev => prev === 0 ? analysisResult.ai_warnings.length - 1 : prev - 1);
                         }}
                         className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                       >
                         <span className="material-symbols-outlined text-sm">chevron_left</span>
                       </button>
                       <span className="text-xs font-bold text-slate-400">{activeWarningIdx + 1} / {analysisResult.ai_warnings.length}</span>
                       <button 
                         onClick={() => {
                           setSlideDirection(1);
                           setActiveWarningIdx(prev => (prev + 1) % analysisResult.ai_warnings.length);
                         }}
                         className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                       >
                         <span className="material-symbols-outlined text-sm">chevron_right</span>
                       </button>
                     </div>
                   )}
                </div>

                {/* Right Side Carousel */}
                <div className="md:w-2/3 relative flex items-center overflow-hidden min-h-[140px]">
                   {analysisResult.ai_warnings.length > 0 && (
                     <AnimatePresence mode="wait" custom={slideDirection}>
                       <motion.div 
                          key={activeWarningIdx}
                          custom={slideDirection}
                          initial={{ x: slideDirection * 60, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: slideDirection * -60, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className={`w-full absolute p-6 rounded-xl border ${analysisResult.ai_warnings[activeWarningIdx].startsWith('Great job!') ? 'bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900 border-emerald-200 dark:border-emerald-500/30' : 'bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-900 border-amber-200 dark:border-amber-500/30'}`}
                        >
                          <div className="flex items-start gap-4">
                            <span className={`material-symbols-outlined text-4xl shrink-0 ${analysisResult.ai_warnings[activeWarningIdx].startsWith('Great job!') ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'}`}>
                               {analysisResult.ai_warnings[activeWarningIdx].startsWith('Great job!') ? 'verified_user' : 'warning'}
                            </span>
                            <div>
                              <h4 className={`font-bold text-sm mb-1 uppercase tracking-wider ${analysisResult.ai_warnings[activeWarningIdx].startsWith('Great job!') ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                {analysisResult.ai_warnings[activeWarningIdx].startsWith('Great job!') ? 'All Clear' : 'Attention Needed'}
                              </h4>
                              <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed text-sm md:text-base">
                                {analysisResult.ai_warnings[activeWarningIdx]}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                     </AnimatePresence>
                   )}
                </div>
             </div>

             {/* Correlation Heatmap */}
             {analysisResult.correlation_matrix && (
               <div className="mb-12 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Asset Correlation Matrix</h3>
                 <div className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed space-y-1">
                   <p>This grid shows how your stocks move in relation to each other.</p>
                   <p><span className="text-emerald-600 dark:text-emerald-400 font-semibold">Green blocks</span> mean the stocks move independently (which is good for balancing risk!).</p>
                   <p><span className="text-red-500 font-semibold">Red blocks</span> mean they move in the exact same direction (which is risky because if one crashes, the other will crash too).</p>
                 </div>
                 <div className="h-[300px]">
                   <ReactApexChart 
                     key={`heatmap-${analysisResult.correlation_matrix.map(r => r.name).join('-')}`}
                     options={{
                       chart: { type: 'heatmap', toolbar: { show: false } },
                       dataLabels: { enabled: true },
                       colors: ["#dc2626"],
                       tooltip: {
                         custom: function({series, seriesIndex, dataPointIndex, w}) {
                           const val = series[seriesIndex][dataPointIndex];
                           const s1 = w.config.series[seriesIndex].name;
                           const s2 = w.config.xaxis.categories[dataPointIndex];
                           
                           // Handle self-correlation (diagonal line)
                           if (s1 === s2) {
                              return `<div class="p-3 bg-white dark:bg-slate-800 shadow-lg rounded border border-slate-100 dark:border-slate-700">
                                <div class="font-bold text-slate-800 dark:text-white mb-1">${s1}</div>
                                <div class="text-xs text-slate-500 dark:text-slate-400">A stock is always 100% correlated with itself.</div>
                              </div>`;
                           }

                           let explanation = "";
                           if (val <= 0.3) {
                             explanation = "<span style='color: #10b981; font-weight: bold;'>Safe:</span> These stocks move independently.";
                           } else if (val <= 0.7) {
                             explanation = "<span style='color: #f59e0b; font-weight: bold;'>Warning:</span> These stocks often move together.";
                           } else {
                             explanation = "<span style='color: #ef4444; font-weight: bold;'>Risky:</span> These stocks move in the exact same direction. If one crashes, the other crashes.";
                           }
                           
                           return `<div class="p-3 bg-white dark:bg-slate-800 shadow-xl rounded-lg border border-slate-100 dark:border-slate-700 min-w-[200px]">
                             <div class="font-bold text-slate-800 dark:text-white mb-2 pb-2 border-b border-slate-100 dark:border-slate-700 text-sm flex justify-between">
                               <span>${s1}</span> <span class="text-slate-400 px-2">&</span> <span>${s2}</span>
                             </div>
                             <div class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${explanation}</div>
                           </div>`;
                         }
                       },
                       plotOptions: {
                         heatmap: {
                           shadeIntensity: 0.5,
                           radius: 4,
                           useFillColorAsStroke: false,
                           colorScale: {
                             ranges: [
                               { from: 0.0, to: 0.3, name: 'Low Risk (Green)', color: '#10b981' },
                               { from: 0.31, to: 0.7, name: 'Medium Risk (Yellow)', color: '#f59e0b' },
                               { from: 0.71, to: 1.0, name: 'High Risk (Red)', color: '#ef4444' }
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

      {/* AI Suggestion Modal with fixed scrolling layout */}
      {showAIModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">psychology</span>
                AInvestor Suggestions
              </h3>
              <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {!aiSuggestions ? (
                <div className="space-y-4">
                  <p className="text-slate-600 dark:text-slate-400 mb-4">Answer a few quick questions so our AI can tailor stock recommendations to your current budget (₹{budget}).</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Investment Horizon</label>
                      <select 
                        value={aiAnswers.horizon} 
                        onChange={e => setAiAnswers({...aiAnswers, horizon: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-800 dark:text-white outline-none"
                      >
                        <option>Short term (&lt; 1 yr)</option>
                        <option>Medium term (1-5 yrs)</option>
                        <option>Long term (5+ yrs)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Market Preference</label>
                      <select 
                        value={aiAnswers.market} 
                        onChange={e => setAiAnswers({...aiAnswers, market: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-800 dark:text-white outline-none"
                      >
                        <option>Indian stocks (NSE/BSE)</option>
                        <option>US / International stocks</option>
                        <option>Both</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Risk Tolerance</label>
                      <select 
                        value={aiAnswers.risk} 
                        onChange={e => setAiAnswers({...aiAnswers, risk: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-800 dark:text-white outline-none"
                      >
                        <option>Low risk (Defensive)</option>
                        <option>Medium risk (Balanced)</option>
                        <option>High risk (Aggressive)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Preferred Sectors</label>
                      <input 
                        type="text" 
                        value={aiAnswers.sector} 
                        onChange={e => setAiAnswers({...aiAnswers, sector: e.target.value})}
                        placeholder="e.g. IT, Banking, Energy, Any"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-800 dark:text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">OpenRouter API Key <span className="text-red-500">*</span></label>
                    <input 
                      type="password" 
                      value={aiApiKey} 
                      onChange={e => setAiApiKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-800 dark:text-white outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">Your key is stored locally and never sent to our servers.</p>
                  </div>

                  {aiError && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-sm">
                      {aiError}
                    </div>
                  )}

                  <div className="mt-8 flex justify-end gap-3">
                    <button onClick={() => setShowAIModal(false)} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                    <button 
                      onClick={handleGenerateAISuggestions} 
                      disabled={aiLoading}
                      className="px-6 py-2 font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {aiLoading ? <span className="material-symbols-outlined animate-spin text-sm">refresh</span> : <span className="material-symbols-outlined text-sm">auto_awesome</span>}
                      {aiLoading ? 'Generating...' : 'Get Suggestions'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex-1 relative w-full flex items-center justify-center min-h-[340px] mb-4">
                    <AnimatePresence>
                      {aiSuggestions.map((card, index) => (
                        <SwipeCard 
                          key={card.ticker} 
                          card={card} 
                          index={index} 
                          isTop={index === 0}
                          onSwipe={handleSwipe}
                          triggerSwipe={index === 0 ? triggerSwipe : null}
                        />
                      ))}
                    </AnimatePresence>
                    
                    {aiSuggestions.length === 0 && (
                      <div className="text-center text-slate-500 animate-fade-in flex flex-col items-center">
                        <span className="material-symbols-outlined text-6xl mb-4 text-slate-300 dark:text-slate-700">task_alt</span>
                        <h4 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-1">All caught up!</h4>
                        <p className="mt-1 text-sm mb-6">You've reviewed all AI suggestions.</p>
                        
                        <button 
                          onClick={handleGenerateAISuggestions} 
                          disabled={aiLoading}
                          className="px-6 py-2.5 font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors flex items-center gap-2"
                        >
                          {aiLoading ? <span className="material-symbols-outlined animate-spin text-sm">refresh</span> : <span className="material-symbols-outlined text-sm">refresh</span>}
                          {aiLoading ? 'Refreshing...' : 'Load more stocks'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center items-center gap-6 mb-6">
                     <button 
                       onClick={() => { if(aiSuggestions.length > 0) setTriggerSwipe('reject'); }}
                       disabled={aiSuggestions.length === 0 || triggerSwipe !== null}
                       className="w-16 h-16 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg text-red-500 border border-slate-100 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                     >
                       <span className="material-symbols-outlined text-3xl font-bold">close</span>
                     </button>
                     <button 
                       onClick={() => { if(aiSuggestions.length > 0) setTriggerSwipe('wishlist'); }}
                       disabled={aiSuggestions.length === 0 || triggerSwipe !== null}
                       className="w-16 h-16 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg text-green-500 border border-slate-100 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all disabled:opacity-50"
                     >
                       <span className="material-symbols-outlined text-3xl font-bold">favorite</span>
                     </button>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-4">
                    <button onClick={() => setAiSuggestions(null)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                      &larr; Ask again with different settings
                    </button>
                    <button onClick={() => setShowAIModal(false)} className="px-6 py-2 font-bold bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors">
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
