import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function StockSearch() {
  const { stockname } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://127.0.0.1:8000/api/analyze/${stockname}`);
        const result = await response.json();
        
        
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (stockname) fetchData();
  }, [stockname]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-12 text-slate-500 bg-[#f8f9fa]">
         <span className="material-symbols-outlined text-4xl mb-4 animate-spin">data_usage</span>
         <p>Fetching live market data and fundamentals...</p>
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
  const latestPrice = hist.length > 0 ? hist[hist.length - 1].close : 0;
  const startPrice = hist.length > 0 ? hist[0].close : 0;
  const priceChange = latestPrice - startPrice;
  const pctChange = startPrice ? (priceChange / startPrice) * 100 : 0;
  
  const isPositive = priceChange >= 0;
  
  const f = data?.fundamentals || {};

  return (
    <div className="min-h-screen bg-[#f8f9fa] antialiased font-['Inter']">
      
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <Link to="/" className="text-blue-600 flex items-center gap-1 font-medium hover:bg-blue-50 px-2 py-1 rounded">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Dashboard
            </Link>
            <div className="h-6 w-px bg-slate-200"></div>
            <h1 className="text-lg font-bold text-slate-900">{f.shortName || stockname.toUpperCase()}</h1>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{stockname.toUpperCase()}</span>
          </div>
          <div className="flex gap-3">
             <button className="p-2 border border-slate-200 rounded-full hover:bg-slate-50"><span className="material-symbols-outlined text-sm">notifications</span></button>
             <button className="p-2 border border-slate-200 rounded-full hover:bg-slate-50"><span className="material-symbols-outlined text-sm">bookmark</span></button>
          </div>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2">
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="mb-6">
              <h2 className="text-3xl font-bold flex items-baseline gap-2">
                ₹{latestPrice.toFixed(2)}
                <span className={`text-sm font-semibold flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{pctChange.toFixed(2)}%)
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">Live market data representation</p>
            </div>
            
            
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hist}>
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
                     tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip 
                     labelFormatter={(l) => new Date(l).toLocaleDateString()}
                     formatter={(val) => [`₹${Number(val).toFixed(2)}`, 'Price']}
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
            
            <div className="flex gap-2 mt-4 border-t border-slate-100 pt-4">
              {['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'All'].map(t => (
                <button key={t} className="text-xs font-semibold px-3 py-1 rounded-full text-slate-600 hover:bg-slate-100">{t}</button>
              ))}
            </div>
          </div>

          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
             
             <div className="flex gap-6 px-6 border-b border-slate-100 pt-4">
               <button className="text-sm font-bold text-[#059669] border-b-2 border-[#059669] pb-3">Overview</button>
               <button className="text-sm font-medium text-slate-500 hover:text-slate-900 pb-3">Technicals</button>
               <button className="text-sm font-medium text-slate-500 hover:text-slate-900 pb-3">News</button>
               <button className="text-sm font-medium text-slate-500 hover:text-slate-900 pb-3">Events</button>
             </div>

             <div className="p-6">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-1">Performance <span className="material-symbols-outlined text-sm text-slate-400">info</span></h3>
                
                
                <div className="mb-6">
                   <div className="flex justify-between text-xs text-slate-500 mb-2">
                      <span>Today's low <br/><strong className="text-sm text-slate-900">{f.regularMarketDayLow || (hist.length > 0 ? hist[hist.length-1].low : '-')}</strong></span>
                      <span className="text-right">Today's high <br/><strong className="text-sm text-slate-900">{f.regularMarketDayHigh || (hist.length > 0 ? hist[hist.length-1].high : '-')}</strong></span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 rounded-full relative">
                      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-2 h-2 bg-slate-700 rotate-45 transform"></div>
                   </div>
                </div>

                
                <div className="mb-8 border-b border-slate-100 pb-8">
                   <div className="flex justify-between text-xs text-slate-500 mb-2">
                      <span>52 week low <br/><strong className="text-sm text-slate-900">{f.fiftyTwoWeekLow || '-'}</strong></span>
                      <span className="text-right">52 week high <br/><strong className="text-sm text-slate-900">{f.fiftyTwoWeekHigh || '-'}</strong></span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 rounded-full relative">
                      <div className="absolute top-1/2 left-2/3 -translate-y-1/2 w-2 h-2 bg-slate-700 rotate-45 transform"></div>
                   </div>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-8 text-sm">
                   <div><div className="text-slate-500 mb-1">Open price</div><div className="font-semibold">{f.regularMarketOpen || '-'}</div></div>
                   <div><div className="text-slate-500 mb-1">Previous close</div><div className="font-semibold">{f.previousClose || '-'}</div></div>
                   <div><div className="text-slate-500 mb-1">Live volume</div><div className="font-semibold">{f.regularMarketVolume || '-'}</div></div>
                   <div><div className="text-slate-500 mb-1">Lower circuit</div><div className="font-semibold">-</div></div>
                   <div><div className="text-slate-500 mb-1">Upper circuit</div><div className="font-semibold">-</div></div>
                </div>

                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-1 mt-8">Fundamentals <span className="material-symbols-outlined text-sm text-slate-400">info</span></h3>
                
                <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm">
                   <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                      <span className="text-slate-500">Market Cap</span>
                      <span className="font-semibold">{f.marketCap ? `₹${(f.marketCap/10000000).toFixed(0)}Cr` : '-'}</span>
                   </div>
                   <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                      <span className="text-slate-500">ROE</span>
                      <span className="font-semibold">{f.returnOnEquity ? `${(f.returnOnEquity*100).toFixed(2)}%` : '-'}</span>
                   </div>
                   <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                      <span className="text-slate-500">P/E Ratio(TTM)</span>
                      <span className="font-semibold">{f.trailingPE ? f.trailingPE.toFixed(2) : '-'}</span>
                   </div>
                   <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                      <span className="text-slate-500">EPS(TTM)</span>
                      <span className="font-semibold">{f.trailingEps ? f.trailingEps.toFixed(2) : '-'}</span>
                   </div>
                   <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                      <span className="text-slate-500">P/B Ratio</span>
                      <span className="font-semibold">{f.priceToBook ? f.priceToBook.toFixed(2) : '-'}</span>
                   </div>
                   <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                      <span className="text-slate-500">Dividend Yield</span>
                      <span className="font-semibold">{f.dividendYield ? `${(f.dividendYield*100).toFixed(2)}%` : '0.00%'}</span>
                   </div>
                   <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                      <span className="text-slate-500">Industry P/E</span>
                      <span className="font-semibold">-</span>
                   </div>
                   <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                      <span className="text-slate-500">Book Value</span>
                      <span className="font-semibold">{f.bookValue ? f.bookValue.toFixed(2) : '-'}</span>
                   </div>
                </div>

             </div>
          </div>
        </div>

        
        <div>
           
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center sticky top-24">
              <div className="w-48 h-32 mx-auto bg-blue-50 rounded-lg flex items-center justify-center text-blue-300 mb-6 border border-blue-100">
                 <span className="material-symbols-outlined text-6xl">location_city</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Want to invest in this stock?</h3>
              <p className="text-sm text-slate-500 mb-6">Open a free Demat account in minutes to start investing in stocks.</p>
              <button className="w-full bg-[#059669] hover:bg-[#047857] text-white font-bold py-3 rounded-lg transition-colors">
                Buy now
              </button>

              <div className="mt-8 pt-6 border-t border-slate-100">
                 <div className="flex items-center justify-between text-left border border-slate-200 rounded-lg p-4 cursor-pointer hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                       <span className="material-symbols-outlined text-slate-400">calendar_month</span>
                       <div>
                          <p className="text-sm font-bold text-slate-900">Create Stock SIP</p>
                          <p className="text-xs text-slate-500">Automate your investments</p>
                       </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
