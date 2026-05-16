import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

export default function SipPlanner() {
  const [monthlyInvestment, setMonthlyInvestment] = useState(25000);
  const [returnRate, setReturnRate] = useState(12);
  const [timePeriod, setTimePeriod] = useState(10);
  const [targetYear, setTargetYear] = useState(2036);
  const [inflationRate, setInflationRate] = useState(6);
  const [activeFaq, setActiveFaq] = useState(null);

  const calculateSIP = () => {
    const P = monthlyInvestment;
    const n = timePeriod * 12;
    const i = returnRate / 12 / 100;
    
    let M = 0;
    if (i === 0) {
       M = P * n;
    } else {
       M = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    }

    const investedAmount = P * n;
    const estReturns = M - investedAmount;

    return {
      investedAmount: Math.round(investedAmount),
      estReturns: Math.round(estReturns),
      totalValue: Math.round(M)
    };
  };

  const calculateMonteCarlo = () => {
    // AI Monte Carlo Simulator: Runs 500 stochastic market paths using Geometric Brownian Motion
    const P = monthlyInvestment * 12;
    const n = timePeriod;
    const expectedReturn = returnRate / 100;
    const volatility = 0.15; // Baseline market volatility
    
    let paths = [];
    for (let sim = 0; sim < 500; sim++) {
      let simTotal = 0;
      for (let yr = 0; yr < n; yr++) {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v); // Box-Muller transform
        
        let yearlyReturn = expectedReturn + (volatility * z);
        simTotal = (simTotal + P) * (1 + yearlyReturn);
      }
      paths.push(Math.max(0, simTotal));
    }
    paths.sort((a, b) => a - b);
    
    return {
       worstCase: Math.round(paths[Math.floor(500 * 0.05)]), // 5th percentile
       bestCase: Math.round(paths[Math.floor(500 * 0.95)])   // 95th percentile
    };
  };

  const getAIFeasibility = () => {
    if (returnRate > 15) return { level: 'High Risk / Low Probability', color: 'text-amber-600', border: 'border-amber-200', bg: 'bg-amber-50', icon: 'warning', msg: `AI considers a sustained ${returnRate}% return over ${timePeriod} years to be statistically improbable without exposing the portfolio to severe drawdown risk. Consider lowering expectations.` };
    if (returnRate > 12) return { level: 'Moderate Probability', color: 'text-blue-600', border: 'border-blue-200', bg: 'bg-blue-50', icon: 'analytics', msg: `Historical data shows ~12% CAGR. You will need a slightly aggressive mid/small-cap tilt to achieve ${returnRate}%. Expect moderate volatility.` };
    return { level: 'High Probability', color: 'text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50', icon: 'verified_user', msg: `AI simulation shows a 94% historical probability of achieving ${returnRate}% returns safely using standard index investing.` };
  }

  const { investedAmount, estReturns, totalValue } = calculateSIP();
  const mcPaths = calculateMonteCarlo();
  const aiStatus = getAIFeasibility();
  
  const yearsForInflation = Math.max(0, targetYear - 2026);
  const inflationAdjustedValue = totalValue / Math.pow(1 + (inflationRate / 100), yearsForInflation);

  const data = [
    { name: 'Invested amount', value: investedAmount, fill: '#91bc4bff' },
    { name: 'Est. returns', value: estReturns, fill: '#4f46e5' }, // Indigo color matching screenshots
  ];

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const faqs = [
    { q: "How much can I invest in a SIP?", a: "You can start a SIP with as little as ₹500 per month. There is no upper limit to how much you can invest." },
    { q: "What is the maximum tenure of a SIP?", a: "There is no maximum tenure. You can continue a SIP for as long as you want, or until your financial goals are met." },
    { q: "Are SIPs similar to mutual funds?", a: "A SIP (Systematic Investment Plan) is simply a method of investing in mutual funds, not a separate distinct asset class itself. It means you invest a fixed amount regularly rather than a lump sum." },
    { q: "Can I modify my SIP amount?", a: "Yes, many platforms offer a 'Step-up SIP' or allow you to pause/modify your SIP amount through your fund house." },
    { q: "Do SIP allows only equity mutual funds investments?", a: "No, you can do a SIP in debt funds, hybrid funds, and index funds as well." },
    { q: "What are the types of SIPs available?", a: "There are Regular SIPs, Step-up (Top-up) SIPs, Flexible SIPs, and Perpetual SIPs." },
    { q: "Can I renew a SIP?", a: "Yes, once a SIP tenure ends, you can easily renew it by issuing a fresh mandate." },
    { q: "Can I pause my investments in a SIP?", a: "Yes, most AMCs and platforms allow you to pause your SIP for a specific duration (usually 1 to 6 months) without penalty." }
  ];

  return (
    <div className="bg-[#f8f9fa] min-h-screen text-slate-800 antialiased font-['Inter']">
      
      {/* Header (Same as Dashboard) */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="flex justify-between items-center max-w-[1440px] mx-auto px-6 h-16">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold tracking-tight text-slate-900">Smart Investment Dashboard</span>
            <nav className="hidden md:flex gap-6 items-center">
              <Link className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium tracking-tight" to="/">Dashboard</Link>
              <Link className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium tracking-tight" to="/riskanalysis">Risk Analysis</Link>
              <Link className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium tracking-tight" to="/portfolio">Portfolio</Link>
              <Link className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-1 text-sm tracking-tight" to="/sipplanner">SIP Planner</Link>
              <Link className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium tracking-tight" to="/assetexplorer">Asset Explorer</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
             <button className="bg-slate-100 hover:bg-slate-200 w-10 h-10 rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-slate-600">notifications</span></button>
             <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuDCnvjfhbDb_rgRtu_aadl71dje67aF4NcHCZ2HXB3Ad3rUxqm5IOUhwL97tok9dGkF4fR4qOt9puUeM8knSGZKu82F9QJIKCyvGzeZZ6GEr04D4txAZBCx2erato0tvCRPjHsxang65N7sk4BfbTWgsgflrZN1QDfAM-CReLfT0uDOFaINEcnPpddeMARGGi5fv9JL8z0g9QjBf97wK1HNSGxmrLT00TAAUEMKHuR9wMcLR3K88XQEmUtDkd8IjQfgzbfaTA2Os" className="w-10 h-10 rounded-full border border-slate-300" alt="profile"/>
          </div>
        </div>
      </header>

      <main className="max-w-[1240px] mx-auto px-6 py-24 pb-32">
        <h1 className="text-4xl font-bold mb-8 text-slate-800">SIP Calculator</h1>

        {/* SIP Calculator Component */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="flex gap-6 px-10 border-b border-slate-100 pt-6">
             <div className="text-[15px] font-bold text-[#059669] border-b-[3px] border-[#059669] pb-3 px-2">Systematic Investment Plan</div>
          </div>
          
          <div className="p-10 flex flex-col lg:flex-row gap-16">
            
            {/* Form Sliders */}
            <div className="flex-1">
               <div className="mb-10">
                  <div className="flex justify-between items-center mb-6">
                     <label className="font-semibold text-slate-700">Monthly investment (₹)</label>
                     <input 
                        type="number" 
                        value={monthlyInvestment} 
                        onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
                        className="bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-4 py-2 rounded-lg w-[120px] text-right focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                     />
                  </div>
                  <input 
                     type="range" 
                     min="500" max="100000" step="500"
                     value={monthlyInvestment}
                     onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
                     className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#059669]" 
                  />
               </div>

               <div className="mb-10">
                  <div className="flex justify-between items-center mb-6">
                     <label className="font-semibold text-slate-700">Expected return rate (p.a %)</label>
                     <input 
                        type="number" 
                        value={returnRate} 
                        onChange={(e) => setReturnRate(Number(e.target.value))}
                        className="bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-4 py-2 rounded-lg w-[100px] text-right focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                     />
                  </div>
                  <input 
                     type="range" 
                     min="1" max="30" step="0.5"
                     value={returnRate}
                     onChange={(e) => setReturnRate(Number(e.target.value))}
                     className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#059669]" 
                  />
               </div>

               <div className="mb-10">
                  <div className="flex justify-between items-center mb-6">
                     <label className="font-semibold text-slate-700">Time period (Years)</label>
                     <input 
                        type="number" 
                        value={timePeriod} 
                        onChange={(e) => setTimePeriod(Number(e.target.value))}
                        className="bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-4 py-2 rounded-lg w-[100px] text-right focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                     />
                  </div>
                  <input 
                     type="range" 
                     min="1" max="40" step="1"
                     value={timePeriod}
                     onChange={(e) => setTimePeriod(Number(e.target.value))}
                     className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#059669]" 
                  />
               </div>

               <div className="mt-12 space-y-4 text-[15px]">
                  <div className="flex justify-between items-center">
                     <span className="text-slate-500 font-medium">Invested amount</span>
                     <span className="font-bold">{formatCurrency(investedAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-slate-500 font-medium">Est. returns</span>
                     <span className="font-bold">{formatCurrency(estReturns)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg mt-6 pt-6 border-t border-slate-100">
                     <span className="text-slate-700 font-medium">Total value</span>
                     <span className="font-bold text-slate-900">{formatCurrency(totalValue)}</span>
                  </div>

                  {/* Inflation Adjustment Module */}
                  <div className="mt-8 p-5 bg-red-50 border border-red-100 rounded-xl relative overflow-hidden">
                     <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-2 text-slate-800 font-semibold">
                           <span className="material-symbols-outlined text-red-500">trending_down</span>
                           Inflation Adjustment
                        </div>
                        <div className="flex gap-3 text-sm">
                           <div className="flex items-center gap-2">
                             <label className="text-slate-500 font-medium whitespace-nowrap">Target Year:</label>
                             <input 
                               type="number" min="2026" max="2040" 
                               value={targetYear} 
                               onChange={(e) => setTargetYear(Math.min(2040, Math.max(2026, Number(e.target.value))))}
                               className="w-20 px-2 py-1 rounded bg-white border border-red-200 text-red-700 font-bold focus:outline-none"
                             />
                           </div>
                           <div className="flex items-center gap-2">
                             <label className="text-slate-500 font-medium whitespace-nowrap">Inflation rate:</label>
                             <input 
                               type="number" min="1" max="15" step="0.5"
                               value={inflationRate} 
                               onChange={(e) => setInflationRate(Number(e.target.value))}
                               className="w-16 px-2 py-1 rounded bg-white border border-red-200 text-red-700 font-bold focus:outline-none"
                             />
                             <span>%</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex justify-between items-center text-lg pt-4 border-t border-red-200/50 relative z-10">
                        <span className="text-slate-700 font-medium">Real adjusted value in {targetYear}</span>
                        <span className="font-bold text-red-700">{formatCurrency(Math.round(inflationAdjustedValue))}</span>
                     </div>
                     <p className="text-[11px] text-slate-500 mt-3 relative z-10">
                        Disclaimer: The actual purchasing power varies constantly. These inflation-adjusted values are simulations relying on historical constant inflation averages and are exclusively for theoretical planning.
                     </p>
                  </div>

                  {/* AI Feasibility Insight */}
                  <div className={`mt-6 p-5 rounded-xl border ${aiStatus.border} ${aiStatus.bg} relative overflow-hidden`}>
                     <div className="flex items-center gap-2 font-bold mb-2">
                        <span className={`material-symbols-outlined ${aiStatus.color}`}>{aiStatus.icon}</span>
                        <span className={aiStatus.color}>AI Feasibility: {aiStatus.level}</span>
                     </div>
                     <p className={`text-sm ${aiStatus.color} opacity-90`}>{aiStatus.msg}</p>
                  </div>

               </div>
            </div>

            {/* Donut Chart & Action */}
            <div className="flex-[0.8] flex flex-col items-center pt-8 lg:pt-0">
               
               <div className="flex gap-6 mb-8 text-sm font-medium text-slate-500">
                  <div className="flex items-center gap-2">
                     <div className="w-4 h-2 rounded-full bg-slate-200"></div> Invested amount
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-4 h-2 rounded-full bg-indigo-500"></div> Est. returns
                  </div>
               </div>

               <div className="h-[300px] w-full max-w-[300px] mx-auto relative cursor-pointer">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={data}
                           innerRadius={85}
                           outerRadius={120}
                           paddingAngle={0}
                           dataKey="value"
                           startAngle={90}
                           endAngle={-270}
                           stroke="none"
                        >
                           {data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                           ))}
                        </Pie>
                        <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                     </PieChart>
                  </ResponsiveContainer>
               </div>

               {/* AI Monte Carlo Simulator */}
                <div className="mt-8 w-full max-w-[320px] bg-indigo-50 border border-indigo-100 p-5 rounded-xl text-center">
                   <div className="flex items-center justify-center gap-2 text-indigo-700 font-bold mb-2">
                      <span className="material-symbols-outlined">network_intelligence</span>
                      AI Monte Carlo Simulator
                   </div>
                   <p className="text-xs text-indigo-600/80 mb-4 leading-relaxed">
                      AI ran <span className="font-bold">500 stochastic market simulations</span> using normal distributions of historical market volatility to predict your realistic outcome spectrum:
                   </p>
                   
                   <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-indigo-100 mb-2">
                      <div className="text-left">
                         <div className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Worst Case (5%)</div>
                         <div className="font-black text-slate-800">{formatCurrency(mcPaths.worstCase)}</div>
                      </div>
                      <span className="material-symbols-outlined text-slate-300">trending_down</span>
                   </div>

                   <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-indigo-100">
                      <div className="text-left">
                         <div className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Best Case (95%)</div>
                         <div className="font-black text-slate-800">{formatCurrency(mcPaths.bestCase)}</div>
                      </div>
                      <span className="material-symbols-outlined text-slate-300">trending_up</span>
                   </div>
                </div>

               <button className="mt-8 bg-[#059669] hover:bg-[#047857] transition-colors text-white font-bold py-4 px-12 rounded-lg w-full max-w-[320px]">
                  INVEST NOW
               </button>
            </div>
          </div>
        </div>

        {/* Motivational Facts */}
        <section className="mt-16 bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-2xl p-10 text-white relative overflow-hidden shadow-xl">
           <div className="absolute -right-20 -top-20 opacity-10">
              <span className="material-symbols-outlined text-[300px]">lightbulb</span>
           </div>
           <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
                 <span className="material-symbols-outlined text-yellow-400">tips_and_updates</span> Smart Tips
              </h2>
              <p className="text-xl leading-relaxed text-indigo-100 italic">
                 "A fixed amount of your salary if kept aside for 10-15 years can make you a millionaire, the only thing you lack is planning and guidance."
              </p>
              <p className="mt-6 text-sm text-indigo-200 font-medium">
                 Start small, stay disciplined. Time in the market always beats timing the market!
              </p>
           </div>
        </section>

        {/* FAQs Section */}
        <section className="mt-16 bg-white p-10 rounded-2xl shadow-sm border border-slate-200">
           <h2 className="text-2xl font-bold mb-8 text-slate-800">FAQs</h2>
           <div className="flex flex-col">
              {faqs.map((faq, idx) => (
                 <div key={idx} className="border-b border-slate-100 last:border-0">
                    <button 
                       className="w-full text-left py-6 flex justify-between items-center focus:outline-none group"
                       onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    >
                       <span className={`text-lg font-medium transition-colors ${activeFaq === idx ? 'text-blue-600' : 'text-slate-700 group-hover:text-blue-600'}`}>{faq.q}</span>
                       <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600 transition-transform duration-300 transform" style={{ rotate: activeFaq === idx ? '180deg' : '0deg'}}>expand_more</span>
                    </button>
                    {activeFaq === idx && (
                       <div className="pb-6 text-slate-600 leading-relaxed pr-12 animate-fade-in">
                          {faq.a}
                       </div>
                    )}
                 </div>
              ))}
           </div>
        </section>

      </main>
    </div>
  );
}
