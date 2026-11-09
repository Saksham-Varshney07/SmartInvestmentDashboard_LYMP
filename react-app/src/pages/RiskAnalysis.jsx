import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import { motion, useMotionValue, useTransform, AnimatePresence, animate } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { AiContext } from '../context/AiContext';
import { cleanModelOutput, getActiveApiKey } from '../services/aiService';
import { calculatePortfolioRisk, applyBlueprint as applyBlueprintService, searchAutocomplete, getMarketTrend } from '../services/apiClient';

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

  // AI Strategic Allocation & Breakdown States (Requested by User & Mentor)
  const [isAllocationCalculated, setIsAllocationCalculated] = useState(() => {
    return sessionStorage.getItem('risk_allocation_calculated') === 'true';
  });
  const [isCalculatingBreakdown, setIsCalculatingBreakdown] = useState(false);
  const [breakdownRationale, setBreakdownRationale] = useState(() => {
    try {
      const saved = sessionStorage.getItem('risk_breakdown_rationale');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [expandedStockRationale, setExpandedStockRationale] = useState({});

  // Prompt that gets sent to the AI API key
  const [allocationPrompt, setAllocationPrompt] = useState(() => {
    return sessionStorage.getItem('risk_allocation_prompt') || '';
  });
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // Sync default prompt if not explicitly customized by user
  useEffect(() => {
    const defaultText = `The user has a budget of ₹${budget.toLocaleString('en-IN')}, and has selected ${stocks.join(', ')}. Suggest an optimal portfolio allocation breakdown tailored for his risk profile (${riskProfile}), and provide convincing, realistic wealth-advisor reasons explaining why each stock is allocated that amount.`;
    if (!allocationPrompt || allocationPrompt.startsWith('The user has a budget of ₹')) {
      setAllocationPrompt(defaultText);
      sessionStorage.setItem('risk_allocation_prompt', defaultText);
    }
  }, [budget, stocks, riskProfile]);

  // Reset breakdown calculation if selected stocks list changes
  useEffect(() => {
    setIsAllocationCalculated(false);
    sessionStorage.removeItem('risk_allocation_calculated');
    sessionStorage.removeItem('risk_breakdown_rationale');
    setBreakdownRationale(null);
  }, [stocks.join(',')]);

  // AI Suggestions State
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnswers, setAiAnswers] = useState({
    horizon: 'Long term',
    market: 'Indian stocks',
    risk: 'Medium risk',
    sector: ''
  });
  const [aiApiKey, setAiApiKey] = useState(
    localStorage.getItem('openRouterApiKey') || 
    import.meta.env.VITE_OPENROUTER_API_KEY || 
    ''
  );
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

// Comprehensive Institutional Stock Catalogs (Diverse sectors, high market cap, strong liquidity)
const INDIAN_STOCK_CATALOG = [
  // Banking & Financial Services
  { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.', sector: 'Banking', reason: 'India\'s largest private bank with premier asset quality and steady credit expansion.', historical_trend: [1520, 1545, 1590, 1610, 1665, 1720] },
  { ticker: 'ICICIBANK.NS', name: 'ICICI Bank Ltd.', sector: 'Banking', reason: 'Consistently expanding net interest margins across retail and corporate banking.', historical_trend: [990, 1030, 1065, 1100, 1140, 1190] },
  { ticker: 'SBIN.NS', name: 'State Bank of India', sector: 'Banking', reason: 'Public sector powerhouse with unmatched nationwide deposit franchise and strong loan growth.', historical_trend: [720, 745, 780, 810, 835, 870] },
  { ticker: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', sector: 'Banking', reason: 'High capital adequacy ratio and conservative underwriting driving steady compound growth.', historical_trend: [1710, 1730, 1765, 1790, 1820, 1860] },
  { ticker: 'AXISBANK.NS', name: 'Axis Bank Ltd.', sector: 'Banking', reason: 'Strong digital banking adoption and improving cost-to-income efficiency.', historical_trend: [1020, 1055, 1080, 1120, 1150, 1195] },
  { ticker: 'BAJFINANCE.NS', name: 'Bajaj Finance Ltd.', sector: 'Financial Services', reason: 'Dominant consumer lending NBFC with outstanding customer acquisition and ROE.', historical_trend: [6800, 6950, 7150, 7300, 7550, 7800] },

  // Information Technology
  { ticker: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT', reason: 'Premier IT bellwether boasting high margins, resilient deal pipelines, and consistent dividends.', historical_trend: [3600, 3720, 3850, 3920, 4050, 4180] },
  { ticker: 'INFY.NS', name: 'Infosys Ltd.', sector: 'IT', reason: 'Global leader in cloud transformation and generative enterprise AI consulting.', historical_trend: [1520, 1580, 1640, 1690, 1760, 1840] },
  { ticker: 'HCLTECH.NS', name: 'HCL Technologies Ltd.', sector: 'IT', reason: 'Leadership in engineering R&D services and cloud infrastructure with high dividend yield.', historical_trend: [1420, 1480, 1530, 1590, 1660, 1730] },
  { ticker: 'WIPRO.NS', name: 'Wipro Ltd.', sector: 'IT', reason: 'Large-cap IT services provider executing turnaround in large deals and consulting margins.', historical_trend: [450, 470, 490, 510, 530, 555] },
  { ticker: 'LTIM.NS', name: 'LTIMindtree Ltd.', sector: 'IT', reason: 'Fast-growing tier-1 IT player with strong presence in banking, insurance, and tech verticals.', historical_trend: [4900, 5100, 5300, 5450, 5700, 5950] },

  // Automobile & EV
  { ticker: 'TATAMOTORS.NS', name: 'Tata Motors Ltd.', sector: 'Automobile', reason: 'Passenger EV market leader with strong global turnaround in JLR luxury cash flows.', historical_trend: [820, 880, 940, 980, 1020, 1070] },
  { ticker: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto Ltd.', sector: 'Automobile', reason: 'Pioneer in two-wheeler EV expansion (Chetak) and premium export markets with robust operating margins.', historical_trend: [8200, 8500, 8850, 9150, 9500, 9900] },
  { ticker: 'MARUTI.NS', name: 'Maruti Suzuki India', sector: 'Automobile', reason: 'Dominant passenger car market share with strong push into premium hybrid SUVs.', historical_trend: [11200, 11600, 12050, 12400, 12800, 13250] },
  { ticker: 'M&M.NS', name: 'Mahindra & Mahindra', sector: 'Automobile', reason: 'Unmatched order book in authentic SUVs alongside tractor agricultural equipment leadership.', historical_trend: [2200, 2350, 2520, 2680, 2850, 3050] },
  { ticker: 'EICHERMOT.NS', name: 'Eicher Motors Ltd.', sector: 'Automobile', reason: 'Royal Enfield premium motorcycle franchise with expanding international presence and high ROCE.', historical_trend: [4200, 4350, 4520, 4680, 4850, 5050] },

  // Energy, Conglomerate & Utilities
  { ticker: 'RELIANCE.NS', name: 'Reliance Industries Ltd.', sector: 'Energy', reason: 'Integrated mega-cap leader in retail, 5G telecom, and green energy investments.', historical_trend: [2500, 2580, 2660, 2740, 2850, 2980] },
  { ticker: 'NTPC.NS', name: 'NTPC Ltd.', sector: 'Energy', reason: 'India\'s largest power utility transitioning aggressively toward commercial solar and green hydrogen capacity.', historical_trend: [310, 330, 355, 375, 400, 425] },
  { ticker: 'POWERGRID.NS', name: 'Power Grid Corp.', sector: 'Utilities', reason: 'Regulated return monopoly in interstate electricity transmission with predictable regulated tariff yields.', historical_trend: [260, 275, 295, 315, 330, 350] },
  { ticker: 'ONGC.NS', name: 'Oil & Natural Gas Corp.', sector: 'Energy', reason: 'Beneficiary of stable crude realization with attractive dividend yield and expanding offshore gas production.', historical_trend: [230, 245, 265, 280, 295, 315] },

  // FMCG, Retail & Consumer
  { ticker: 'ITC.NS', name: 'ITC Ltd.', sector: 'Consumer Goods', reason: 'Cash-generating FMCG conglomerate with hotel demerger value unlocking and rural recovery.', historical_trend: [420, 435, 450, 465, 485, 510] },
  { ticker: 'HINDUNILVR.NS', name: 'Hindustan Unilever', sector: 'Consumer Goods', reason: 'India\'s largest FMCG company with unmatched rural distribution reach and brand equity across home care.', historical_trend: [2350, 2420, 2490, 2560, 2640, 2720] },
  { ticker: 'TITAN.NS', name: 'Titan Company Ltd.', sector: 'Consumer Goods', reason: 'Luxury jewellery (Tanishq) market share consolidator benefiting from bridal demand and formalization.', historical_trend: [3300, 3420, 3550, 3680, 3800, 3950] },
  { ticker: 'NESTLEIND.NS', name: 'Nestle India Ltd.', sector: 'Consumer Goods', reason: 'Packaged food and dairy market leader with strong brand pricing power and high capital returns.', historical_trend: [2300, 2380, 2460, 2520, 2610, 2700] },
  { ticker: 'ASIANPAINT.NS', name: 'Asian Paints Ltd.', sector: 'Consumer Goods', reason: 'Dominant decorative coatings market leader expanding into comprehensive home décor solutions.', historical_trend: [2750, 2840, 2920, 3010, 3120, 3250] },

  // Healthcare & Pharma
  { ticker: 'SUNPHARMA.NS', name: 'Sun Pharma Ltd.', sector: 'Healthcare', reason: 'Global specialty dermatology pipeline and strong domestic formulation market leadership.', historical_trend: [1420, 1490, 1560, 1630, 1710, 1800] },
  { ticker: 'CIPLA.NS', name: 'Cipla Ltd.', sector: 'Healthcare', reason: 'Respiratory portfolio leader in North America alongside resilient high-margin chronic therapy sales in India.', historical_trend: [1350, 1410, 1470, 1530, 1590, 1660] },
  { ticker: 'DRREDDY.NS', name: 'Dr. Reddy\'s Laboratories', sector: 'Healthcare', reason: 'Strong biosimilar pipeline and diversified revenue footprint across global generics markets.', historical_trend: [5900, 6150, 6380, 6550, 6780, 7050] },
  { ticker: 'APOLLOHOSP.NS', name: 'Apollo Hospitals Ltd.', sector: 'Healthcare', reason: 'India\'s largest healthcare network expanding digital omnichannel pharmacy and robotic surgeries.', historical_trend: [5800, 6050, 6300, 6550, 6850, 7200] },

  // Infrastructure, Capital Goods & Defense
  { ticker: 'LT.NS', name: 'Larsen & Toubro', sector: 'Infrastructure', reason: 'Prime beneficiary of national infrastructure capex with record domestic and international order backlog.', historical_trend: [3300, 3450, 3620, 3750, 3900, 4100] },
  { ticker: 'BEL.NS', name: 'Bharat Electronics', sector: 'Defense', reason: 'Defense electronics monopoly with multi-year order visibility under Make-in-India programs.', historical_trend: [210, 235, 260, 285, 310, 335] },
  { ticker: 'TATASTEEL.NS', name: 'Tata Steel Ltd.', sector: 'Metals', reason: 'Lowest-cost domestic steel producer with expanding Kalinganagar capacity and European restructuring.', historical_trend: [135, 145, 155, 165, 175, 185] },
  { ticker: 'JSWSTEEL.NS', name: 'JSW Steel Ltd.', sector: 'Metals', reason: 'Leading private steel manufacturer expanding brownfield capacity to capture infrastructure demand.', historical_trend: [840, 880, 920, 955, 990, 1035] }
];

const US_STOCK_CATALOG = [
  // Mega-Cap Tech & AI
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', reason: 'Unmatched global ecosystem retention, growing services revenue, and Apple Intelligence rollout.', historical_trend: [175, 182, 189, 198, 215, 230] },
  { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', reason: 'Enterprise software monopoly and Azure cloud momentum powered by OpenAI partnership.', historical_trend: [370, 390, 415, 430, 445, 465] },
  { ticker: 'NVDA', name: 'Nvidia Corp.', sector: 'Technology', reason: 'Monopolistic data center AI accelerator market share with Blackwell architecture demand surge.', historical_trend: [650, 780, 920, 1050, 1180, 1280] },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', reason: 'Search advertising fortress, YouTube monetization, and rapid expansion of Google Cloud AI.', historical_trend: [135, 145, 155, 168, 178, 190] },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', reason: 'E-commerce margin expansion paired with accelerating enterprise cloud spending on AWS.', historical_trend: [145, 158, 172, 185, 198, 210] },
  { ticker: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', reason: 'Ad-targeting efficiency gains via open-source LLaMA and dominant engagement across Instagram & WhatsApp.', historical_trend: [360, 420, 475, 510, 560, 600] },
  { ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Automobile', reason: 'Global EV volume leader scaling energy storage megapacks and autonomous Full Self-Driving tech.', historical_trend: [180, 195, 215, 230, 245, 265] },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', reason: 'Growing market share in x86 data center CPUs and MI300 series AI accelerator deployment.', historical_trend: [125, 140, 155, 168, 180, 195] },

  // Financials & Payments
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial Services', reason: 'America\'s fortress bank with industry-leading net interest income and pristine balance sheet.', historical_trend: [175, 188, 198, 208, 220, 235] },
  { ticker: 'V', name: 'Visa Inc.', sector: 'Financial Services', reason: 'Global duopoly payments tollbooth with 50%+ operating margins and secular cashless growth.', historical_trend: [260, 270, 280, 288, 298, 310] },
  { ticker: 'MA', name: 'Mastercard Inc.', sector: 'Financial Services', reason: 'Cross-border travel payments strength and high-margin cybersecurity services.', historical_trend: [430, 450, 470, 485, 505, 525] },

  // Healthcare
  { ticker: 'LLY', name: 'Eli Lilly and Co.', sector: 'Healthcare', reason: 'Blockbuster obesity (GLP-1) and diabetes drugs driving generational revenue growth.', historical_trend: [580, 680, 760, 840, 910, 970] },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', reason: 'Defensive pharmaceutical innovation and medical technology leader with AAA credit rating.', historical_trend: [150, 155, 158, 162, 165, 170] },
  { ticker: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', reason: 'Diversified managed healthcare and Optum pharmacy services provider with steady compounding.', historical_trend: [480, 500, 520, 545, 570, 595] },

  // Consumer & Retail
  { ticker: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Defensive', reason: 'Omnichannel retail scale, expanding e-commerce marketplace, and high-margin advertising business.', historical_trend: [58, 62, 67, 72, 78, 84] },
  { ticker: 'COST', name: 'Costco Wholesale Corp.', sector: 'Consumer Defensive', reason: '90%+ membership renewal rate driving predictable recurring high-margin cash flow.', historical_trend: [680, 730, 790, 840, 890, 940] },
  { ticker: 'HD', name: 'The Home Depot', sector: 'Consumer Cyclical', reason: 'Home improvement category leader with expanding pro contractor digital ecosystem.', historical_trend: [340, 360, 375, 390, 405, 420] }
];

  const handleGenerateAISuggestions = async () => {
    if (aiApiKey.trim()) {
      localStorage.setItem('openRouterApiKey', aiApiKey.trim());
    }
    setAiLoading(true);
    setAiError(null);

    // Extract current portfolio tickers and rejected history cleanly
    const currentPortfolioTickers = stocks.map(s => (typeof s === 'string' ? s : s?.ticker || '')).filter(Boolean);
    let currentRejected = [...rejectedStocks];
    let excludeTickers = new Set([...currentPortfolioTickers, ...currentRejected]);

    const isIndian = aiAnswers.market === 'Indian Market' || aiAnswers.market === 'Indian stocks' || !aiAnswers.market?.toLowerCase().includes('us');
    const catalog = isIndian ? INDIAN_STOCK_CATALOG : US_STOCK_CATALOG;

    const excludeText = excludeTickers.size > 0 
      ? ` DO NOT suggest any of these tickers under any circumstance: ${Array.from(excludeTickers).join(', ')}.` 
      : '';

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
1. The "ticker" field MUST be the exact, valid Yahoo Finance ticker symbol (e.g., "HDFCBANK.NS", "TCS.NS", "AAPL", "MSFT"). Only suggest real, actively traded companies.
2. If suggesting Indian stocks, you MUST append the ".NS" or ".BO" suffix to the ticker (e.g. "INFY.NS").
3. The historical_trend MUST be an array of 6 numbers representing mock monthly stock prices for the last 6 months. DO NOT return anything except the JSON array.`;

    let parsed = null;
    const effectiveApiKey = aiApiKey.trim() || import.meta.env.VITE_OPENROUTER_API_KEY || '';

    // Candidate real models on OpenRouter
    const candidateModels = [
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'openrouter/free',
      'nvidia/nemotron-3.5-lightning:free',
      'dots-studio/dots-3-note-preview:free'
    ];

    if (effectiveApiKey && effectiveApiKey !== 'YOUR_API_KEY') {
      for (const modelId of candidateModels) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${effectiveApiKey}`,
              'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'http://localhost:5173',
              'X-Title': 'Smart Investment Dashboard',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 1500,
              temperature: 0.3
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';
            const match = content.match(/\[[\s\S]*\]/);
            if (match) {
              const candidateArr = JSON.parse(match[0]);
              if (Array.isArray(candidateArr) && candidateArr.length > 0) {
                // Ensure tickers aren't in excludeTickers
                const filtered = candidateArr.filter(item => item?.ticker && !excludeTickers.has(item.ticker));
                if (filtered.length > 0) {
                  parsed = filtered.slice(0, 5);
                  break;
                }
              }
            }
          }
        } catch (err) {
          // Continue to next candidate model
        }
      }
    }

    // Dynamic catalog selection with infinite exploration
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
      let remainingPool = catalog.filter(item => !excludeTickers.has(item.ticker));

      // Prioritize requested sector if specified
      if (aiAnswers.sector && aiAnswers.sector.trim()) {
        const secLower = aiAnswers.sector.toLowerCase().trim();
        remainingPool.sort((a, b) => {
          const aMatch = (a.sector || '').toLowerCase().includes(secLower) ? 1 : 0;
          const bMatch = (b.sector || '').toLowerCase().includes(secLower) ? 1 : 0;
          return bMatch - aMatch;
        });
      }

      // If user reviewed all stocks in the catalog, recycle rejected stocks so they can explore again
      // (preserving current portfolio holdings so already added stocks aren't re-suggested)
      if (remainingPool.length === 0) {
        setRejectedStocks([]);
        sessionStorage.removeItem('risk_rejected');
        currentRejected = [];
        excludeTickers = new Set(currentPortfolioTickers);
        remainingPool = catalog.filter(item => !excludeTickers.has(item.ticker));
      }

      parsed = remainingPool.slice(0, 5);
    }

    try {
      // Enhance with live price data
      const withRealData = await Promise.all(parsed.map(async (card) => {
        try {
          const trendData = await getMarketTrend(card.ticker);
          if (trendData?.trend && Array.isArray(trendData.trend) && trendData.trend.length > 0) {
            return { ...card, historical_trend: trendData.trend.slice(-15) };
          }
        } catch (e) {
          // Graceful fallback to built-in trend
        }
        return card;
      }));
      
      const validSuggestions = withRealData.filter(Boolean);
      setAiSuggestions(validSuggestions);
    } catch (err) {
      console.error(err);
      setAiError("Failed to generate AI suggestions. Please try again.");
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
      let aiData = `SCREEN: Risk Analysis Simulator (Step 3: Optimized Blueprints & Correlation Matrix)\n`;
      aiData += `Selected Stocks: ${stocks.join(', ')}\n`;
      aiData += `Target Budget: ₹${budget.toLocaleString('en-IN')} | Risk Profile: ${riskProfile} | Horizon: ${duration} years\n`;
      
      // Parse correlation matrix accurately regardless of data shape
      if (analysisResult.correlation_matrix) {
        aiData += `\nLIVE ASSET CORRELATION MATRIX (Values range from -1.0 to +1.0):\n`;
        const matrix = analysisResult.correlation_matrix;
        const seenPairs = new Set();

        if (Array.isArray(matrix)) {
          // ApexCharts format: [{ name: 'TCS.NS', data: [{ x: 'INFY.NS', y: 0.78 }] }]
          matrix.forEach((rowObj, rIdx) => {
            const stockA = rowObj.name || (stocks[rIdx] || `Stock ${rIdx}`);
            if (Array.isArray(rowObj.data)) {
              rowObj.data.forEach((item, cIdx) => {
                let stockB = null;
                let val = null;
                if (item && typeof item === 'object') {
                  stockB = item.x || (stocks[cIdx] || null);
                  val = typeof item.y === 'number' ? item.y : null;
                } else if (typeof item === 'number') {
                  stockB = matrix[cIdx]?.name || stocks[cIdx] || null;
                  val = item;
                }

                if (stockA && stockB && stockA !== stockB && val !== null && !isNaN(val)) {
                  const pairKey = [stockA, stockB].sort().join(' <-> ');
                  if (!seenPairs.has(pairKey)) {
                    seenPairs.add(pairKey);
                    const tag = val > 0.7 ? "HIGH CORRELATION (Risky - moves together / Red block on screen)" :
                                val < 0.3 ? "LOW CORRELATION (Safe - healthy diversification / Green block on screen)" :
                                "MODERATE CORRELATION (Yellow block on screen)";
                    aiData += `- Correlation between ${stockA} and ${stockB}: ${val.toFixed(2)} [${tag}]\n`;
                  }
                }
              });
            }
          });
        } else if (typeof matrix === 'object') {
          // Plain 2D map: { "TCS.NS": { "INFY.NS": 0.78 } }
          Object.keys(matrix).forEach(row => {
            if (typeof matrix[row] === 'object' && matrix[row] !== null) {
              Object.keys(matrix[row]).forEach(col => {
                if (row !== col) {
                  const pairKey = [row, col].sort().join(' <-> ');
                  const val = matrix[row][col];
                  if (!seenPairs.has(pairKey) && typeof val === 'number' && !isNaN(val)) {
                    seenPairs.add(pairKey);
                    const tag = val > 0.7 ? "HIGH CORRELATION (Risky / Red)" :
                                val < 0.3 ? "LOW CORRELATION (Safe / Green)" :
                                "MODERATE CORRELATION (Yellow)";
                    aiData += `- Correlation between ${row} and ${col}: ${val.toFixed(2)} [${tag}]\n`;
                  }
                }
              });
            }
          });
        }
      }

      // Add Sector Breakdown
      if (Array.isArray(analysisResult.sector_breakdown) && analysisResult.sector_breakdown.length > 0) {
        aiData += `\nSECTOR EXPOSURE BREAKDOWN:\n`;
        analysisResult.sector_breakdown.forEach(s => {
          aiData += `- ${s.name}: ${s.percentage}%\n`;
        });
      }

      // Add Risk Warnings
      const warnings = analysisResult.ai_warnings || analysisResult.risk_warnings || [];
      if (warnings.length > 0) {
        aiData += `\nACTIVE RISK WARNINGS FROM SYSTEM:\n`;
        warnings.forEach(w => {
          const msg = typeof w === 'string' ? w : `${w.title || ''}: ${w.message || ''}`;
          aiData += `- ${msg}\n`;
        });
      }

      // Add Proposed Allocations (Blueprints)
      if (analysisResult.portfolios) {
        aiData += `\nPROPOSED BLUEPRINT ALLOCATIONS (Target allocations simulated for ₹${budget.toLocaleString('en-IN')} budget):\n`;
        Object.entries(analysisResult.portfolios).forEach(([key, p]) => {
          if (p && p.allocations && p.allocations.length > 0) {
            const summary = p.allocations.map(a => `${a.name}: ${a.percentage}% (₹${a.amount})`).join(', ');
            aiData += `- ${p.name} (Projected Return: ${p.projected_return_pa}% p.a.): ${summary}\n`;
          }
        });
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
        const results = await searchAutocomplete(stockInput);
        if (results) {
           setSuggestions(results.slice(0, 5));
        }
      } catch (err) {}
    }, 250);
    return () => clearTimeout(timer);
  }, [stockInput]);

  const ALIAS_MAP = {
    'HUL': 'HINDUNILVR.NS',
    'HUL.NS': 'HINDUNILVR.NS',
    'HINDUSTANUNILEVER': 'HINDUNILVR.NS',
    'HINDUSTANUNILEVER.NS': 'HINDUNILVR.NS',
    'TATAMOTORS': 'TMCV.NS',
    'TATAMOTORS.NS': 'TMCV.NS',
    'TATA': 'TMCV.NS',
    'INFOSYS': 'INFY.NS',
    'INFOSYS.NS': 'INFY.NS',
    'MINDTREE': 'LTIM.NS',
    'MINDTREE.NS': 'LTIM.NS',
    'SBI': 'SBIN.NS',
    'SBI.NS': 'SBIN.NS',
    'AIRTEL': 'BHARTIARTL.NS',
    'AIRTEL.NS': 'BHARTIARTL.NS',
    'M&M': 'M&M.NS',
    'L&T': 'LT.NS',
  };

  const addStock = (sym = null) => {
    const rawSym = typeof sym === 'string' ? sym : stockInput.trim();
    if (!rawSym) return;
    const cleanSym = rawSym.toUpperCase();
    const resolved = ALIAS_MAP[cleanSym] || cleanSym;
    if (!stocks.includes(resolved)) {
      setStocks([...stocks, resolved]);
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
      const analysis = await calculatePortfolioRisk(payload);
      if (analysis) {
        setAnalysisResult(analysis);
        setStep(3);
      } else {
        throw new Error("Failed to analyze portfolio.");
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to analyze portfolio.");
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
      const res = await applyBlueprintService(currentUser.user_id, confirmApply.allocations);
      if (res?.status === 'success') {
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

  // Institutional financial knowledge base for realistic company rationale
  const STOCK_KNOWLEDGE = {
    // FMCG / Consumer Staples
    'HINDUNILVR': { sector: 'FMCG & Consumer Staples', defensiveTrait: 'daily household necessity demand and pricing power that insulate earnings during economic contractions', growthTrait: 'steady volume growth and expanding premium product margins' },
    'ITC': { sector: 'Diversified FMCG & Agri', defensiveTrait: 'virtually zero debt, robust free cash flows, and reliable dividend yields', growthTrait: 'agri-business scaling and rapid margin expansion in non-cigarette FMCG' },
    'NESTLE': { sector: 'Packaged Foods & Nutrition', defensiveTrait: 'high-margin non-cyclical food consumption with exceptional brand loyalty', growthTrait: 'urban premiumization and rapid quick-commerce retail expansion' },
    'BRITANNIA': { sector: 'Consumer Bakery & Dairy', defensiveTrait: 'resilient staple volume demand and high return on capital employed (ROCE)', growthTrait: 'deep distribution penetration across tier-2/3 markets and premium launches' },
    'DABUR': { sector: 'Ayurvedic & Healthcare FMCG', defensiveTrait: 'steady demand for daily wellness and herbal healthcare products', growthTrait: 'modern trade expansion and strong rural retail recovery' },
    'MARICO': { sector: 'Consumer Oils & Personal Care', defensiveTrait: 'dominant market share in core hair and edible oil categories with steady cash flows', growthTrait: 'digital-first brand scaling and international market growth' },
    'COLPAL': { sector: 'Oral & Personal Care', defensiveTrait: 'inelastic daily oral care usage and market-leading gross margins', growthTrait: 'premium therapeutics and specialized oral beauty products' },
    'TATACONSUM': { sector: 'Packaged Beverages & Foods', defensiveTrait: 'steady staple consumption across tea, salt, and essential groceries', growthTrait: 'rapid portfolio scaling in health foods, ready-to-eat, and cafe joint ventures' },

    // Pharma & Healthcare
    'DRREDDY': { sector: 'Pharmaceuticals & Generics', defensiveTrait: 'inelastic global demand for essential prescription medicine that remains steady through market cycles', growthTrait: 'high-margin complex generic launches and US market patent exclusivities' },
    'SUNPHARMA': { sector: 'Specialty Pharma & Therapeutics', defensiveTrait: 'diversified therapeutic revenue base and leading domestic chronic disease market share', growthTrait: 'rapidly growing global specialty dermatology and ophthalmology franchises' },
    'CIPLA': { sector: 'Respiratory & Primary Healthcare', defensiveTrait: 'essential respiratory therapy demand and extensive global distribution', growthTrait: 'expansion in complex generic inhalation therapies in the US and Europe' },
    'APOLLO': { sector: 'Healthcare & Hospitals', defensiveTrait: 'non-discretionary medical demand and high hospital bed occupancy rates', growthTrait: 'omnichannel digital health expansion via Apollo 24/7 and diagnostic centers' },
    'DIVISLAB': { sector: 'Active Pharmaceutical Ingredients (API)', defensiveTrait: 'global supply reliability in critical generic APIs and custom synthesis', growthTrait: 'large-scale capacity additions for contrast media and patent peptide APIs' },

    // Banking & Financials
    'SBIN': { sector: 'Banking & Financial Services', defensiveTrait: 'massive low-cost CASA deposit base and sovereign asset backing', growthTrait: 'strong corporate credit growth and healthy net interest margins' },
    'HDFC': { sector: 'Private Banking & Wealth Services', defensiveTrait: 'prudent underwriting discipline, low non-performing assets, and vast deposit network', growthTrait: 'cross-selling mortgages, credit cards, and wealth solutions across newly merged branches' },
    'ICICI': { sector: 'Private Sector Banking', defensiveTrait: 'conservative risk buffers, well-diversified loan book, and strong capital adequacy', growthTrait: 'digital loan processing velocity and industry-leading return on equity (ROE)' },
    'KOTAK': { sector: 'Private Banking & Asset Management', defensiveTrait: 'exceptional Tier-1 capital adequacy and conservative risk-weighted asset profile', growthTrait: 'accelerating SME lending growth and high-net-worth wealth management expansion' },
    'AXIS': { sector: 'Commercial Banking & Cards', defensiveTrait: 'strengthened balance sheet quality and growing retail deposit stickiness', growthTrait: 'synergies from acquired consumer banking assets and digital retail credit expansion' },
    'BAJFINANCE': { sector: 'Consumer Finance & NBFC', defensiveTrait: 'sophisticated proprietary risk-scoring models and low delinquency rates', growthTrait: 'unmatched customer acquisition run-rate and aggressive omnichannel loan disbursement' },

    // Tech & Digital Solutions
    'TCS': { sector: 'IT Services & Digital Transformation', defensiveTrait: 'industry-leading operating margins, ~100% free cash flow conversion, and vast multi-year client backlog', growthTrait: 'global enterprise contracts in generative AI, cloud modernization, and cyber architecture' },
    'INFY': { sector: 'Information Technology & Consulting', defensiveTrait: 'debt-free balance sheet, large liquid cash reserves, and generous shareholder dividend policy', growthTrait: 'accelerating large enterprise transformation deal wins and cloud platform scaling' },
    'HCLTECH': { sector: 'IT Services & Engineering R&D', defensiveTrait: 'recurring software intellectual property (IP) revenue and high enterprise client retention', growthTrait: 'expanding digital engineering solutions and telecom 5G cloud transformation contracts' },
    'WIPRO': { sector: 'IT Consulting & Cloud Solutions', defensiveTrait: 'healthy balance sheet liquidity and long-standing Fortune 500 client partnerships', growthTrait: 'large multi-year IT infrastructure deals and strategic consulting integration' },
    'LTIM': { sector: 'IT Services & Enterprise Tech', defensiveTrait: 'strong engineering heritage under Larsen & Toubro backing and diversified tier-1 accounts', growthTrait: 'post-merger cross-selling in banking, media, and supply chain tech' },

    // Utilities & Energy
    'POWERGRID': { sector: 'Power Transmission & Utilities', defensiveTrait: 'regulated cost-plus return on equity model with guaranteed tariffs and zero demand volume risk', growthTrait: 'major capital expenditure to connect new renewable energy green transmission corridors' },
    'NTPC': { sector: 'Power Generation & Green Energy', defensiveTrait: 'long-term Power Purchase Agreements (PPAs) ensuring consistent cash receipts and protected operating margins', growthTrait: 'aggressive commissioning of 60 GW of solar and wind generation capacity by 2032' },
    'ONGC': { sector: 'Oil & Gas Exploration & Production', defensiveTrait: 'domestic energy security significance and high dividend payouts backed by sovereign support', growthTrait: 'increased domestic gas realization caps and offshore deepwater exploration' },
    'RELIANCE': { sector: 'Energy & Digital Conglomerate', defensiveTrait: 'multi-engine cash flow streams across telecom, retail, and energy that cushion market shocks', growthTrait: '5G network monetization, rapid retail footprint growth, and renewable energy gigafactories' },
    'TATAPOWER': { sector: 'Renewables & Power Distribution', defensiveTrait: 'stable regulated returns across transmission and city distribution circles', growthTrait: 'rapidly expanding solar EPC order book, rooftop solar, and nationwide EV charging stations' },

    // Consumer Discretionary & Auto
    'TITAN': { sector: 'Branded Retail & Discretionary', defensiveTrait: 'trusted Tata brand equity that commands enduring customer loyalty and pricing power', growthTrait: 'rapid formalization of jewelry retail and high store network expansion' },
    'MARUTI': { sector: 'Automotive & Mobility', defensiveTrait: 'peerless nationwide distribution network, debt-free balance sheet, and strong resale value', growthTrait: 'market share gains from new hybrid SUV rollouts and expanding export volumes' },
    'TATAMOTORS': { sector: 'Commercial & Luxury Automotive', defensiveTrait: 'market leadership in Indian domestic commercial vehicles and trucks', growthTrait: 'pioneering leadership in domestic EV passenger cars and strong global order book for Range Rover/Defender' },
    'BAJAJ-AUTO': { sector: 'Automotive & 2/3-Wheelers', defensiveTrait: 'diversified export presence across 70+ countries and debt-free cash generation', growthTrait: 'rapidly scaling Chetak EV footprint and premium Triumph motorcycle partnerships' },
    'M&M': { sector: 'Automotive & Farm Equipment', defensiveTrait: 'uncontested dominance in domestic agricultural tractors and rural cash flows', growthTrait: 'booming order book for flagship SUV models and new born-electric vehicle platforms' },

    // Industrials & Capital Goods
    'LT': { sector: 'Engineering & Construction', defensiveTrait: 'historic multi-trillion rupee global order backlog backed by sovereign and institutional infrastructure tenders', growthTrait: 'record international hydrocarbon and renewable infrastructure orders across the Middle East' },
    'BEL': { sector: 'Defense Electronics & Aerospace', defensiveTrait: 'zero-debt sovereign enterprise with guaranteed domestic defense procurement mandates', growthTrait: 'record defense order pipeline in radar, electronic warfare, and missile defense avionics' },
    'TATASTEEL': { sector: 'Metals & Basic Materials', defensiveTrait: 'low-cost iron ore integration and deep domestic industrial market relationships', growthTrait: 'capacity expansions at Kalinganagar and transition to low-carbon electric arc furnaces' },

    // Global / US Leaders
    'AAPL': { sector: 'Global Technology Ecosystem', defensiveTrait: 'active global installed device base of over 2 billion devices with unmatched customer retention', growthTrait: 'high-margin Services compounding and on-device privacy-focused Apple Intelligence' },
    'MSFT': { sector: 'Cloud & Enterprise Software', defensiveTrait: 'indispensable enterprise productivity suite and mission-critical Azure cloud infrastructure', growthTrait: 'leadership in commercial generative AI copilots and enterprise cloud workloads' },
    'GOOGL': { sector: 'Search & Cloud Platforms', defensiveTrait: 'uncontested global search monopoly and unmatched digital advertising ecosystem', growthTrait: 'Google Cloud profitability scaling, YouTube subscription growth, and Gemini model integration' },
    'NVDA': { sector: 'AI Hardware & Semiconductor', defensiveTrait: 'deep developer moat with proprietary CUDA software architecture and high switching costs', growthTrait: 'unprecedented global enterprise and hyperscaler demand for accelerated AI compute clusters' },
    'AMZN': { sector: 'E-Commerce & Cloud Infrastructure', defensiveTrait: 'world-class logistics fulfillment moat and AWS enterprise recurring cloud cash flows', growthTrait: 'accelerating digital retail ad monetization and AI infrastructure hosting' }
  };

  const getStockRationale = (symbol, alloc, profileType) => {
    const sym = (symbol || '').toUpperCase().replace(/\.(NS|BO)$/i, '');
    const pct = alloc.percentage;
    const amtFormatted = Math.round(alloc.amount).toLocaleString('en-IN');
    
    let matchKey = Object.keys(STOCK_KNOWLEDGE).find(k => sym.includes(k) || k.includes(sym));
    const info = matchKey ? STOCK_KNOWLEDGE[matchKey] : null;

    if (profileType === 'safe') {
      if (pct >= 25) {
        if (info) return `Allocated a primary ${pct}% (₹${amtFormatted}) as a defensive foundation in ${info.sector}. ${info.defensiveTrait[0].toUpperCase() + info.defensiveTrait.slice(1)}, keeping downside portfolio volatility minimal.`;
        return `Allocated a primary ${pct}% (₹${amtFormatted}) as a core defensive pillar; its consistent operational cash flows and low market beta safeguard your capital against market pullbacks.`;
      } else {
        if (info) return `Weighted at ${pct}% (₹${amtFormatted}) to maintain healthy diversification in ${info.sector} without over-exposing the portfolio to cyclical swings.`;
        return `Weighted at ${pct}% (₹${amtFormatted}) to maintain asset diversification while keeping portfolio risk strictly within conservative limits.`;
      }
    } else if (profileType === 'balanced') {
      if (pct >= 25) {
        if (info) return `Allocated ${pct}% (₹${amtFormatted}) as a core growth compounder in ${info.sector}. Combines ${info.defensiveTrait} with ${info.growthTrait}.`;
        return `Allocated ${pct}% (₹${amtFormatted}) as a principal compounder, delivering an optimal balance between steady cash generation and long-term capital compounding.`;
      } else {
        if (info) return `Allocated ${pct}% (₹${amtFormatted}) to capture ${info.growthTrait} in ${info.sector}, optimizing the portfolio's overall risk-reward ratio.`;
        return `Allocated ${pct}% (₹${amtFormatted}) to capture upside growth momentum while dampening correlation risks across your holdings.`;
      }
    } else {
      // aggressive
      if (pct >= 35) {
        if (info) return `Heavily weighted at ${pct}% (₹${amtFormatted}) to maximize upside capital appreciation in ${info.sector}, capitalizing on ${info.growthTrait}.`;
        return `Heavily weighted at ${pct}% (₹${amtFormatted}) to maximize capital growth, capitalizing on strong sector tailwinds and secular earnings expansion.`;
      } else {
        if (info) return `Allocated ${pct}% (₹${amtFormatted}) in ${info.sector} to accelerate portfolio return velocity while maintaining tactical liquidity.`;
        return `Allocated ${pct}% (₹${amtFormatted}) to drive aggressive portfolio expansion and capture market-beating alpha.`;
      }
    }
  };

  // Generates institutional financial rationale for stock breakdowns across all 3 risk profiles
  const generateDeterministicRationale = (stocksList, budgetAmount, portfolios) => {
    const safeAllocs = portfolios?.safe?.allocations || [];
    const balancedAllocs = portfolios?.balanced?.allocations || [];
    const aggressiveAllocs = portfolios?.aggressive?.allocations || [];

    const buildStockReasons = (allocs, profileType) => {
      const reasons = {};
      allocs.forEach(a => {
        const ticker = a.ticker || a.name;
        reasons[ticker] = getStockRationale(ticker, a, profileType);
      });
      return reasons;
    };

    return {
      safe: {
        strategy_summary: 'Capital Preservation Strategy: Overweights recession-resistant sectors (FMCG, healthcare, regulated utilities) with fortress balance sheets, high dividend yields, and low market beta to safeguard your capital against sudden market drawdowns.',
        mentor_answer: 'The low-risk allocation is calculated by solving for minimal empirical portfolio variance. Non-cyclical defensive stocks with low correlation and inelastic demand receive the lion’s share of capital, while volatile cyclical assets are tightly capped.',
        stock_reasons: buildStockReasons(safeAllocs, 'safe')
      },
      balanced: {
        strategy_summary: 'Optimal Compounding Strategy: Strikes an intelligent equilibrium between high-quality defensive anchors and market-leading compounders, maximizing long-term wealth accumulation while managing portfolio volatility.',
        mentor_answer: 'The balanced profile optimizes for the highest risk-adjusted compounding efficiency (Sharpe ratio), ensuring each rupee invested generates maximum excess return per unit of volatility.',
        stock_reasons: buildStockReasons(balancedAllocs, 'balanced')
      },
      aggressive: {
        strategy_summary: 'Aggressive Growth Strategy: Concentrates capital directly into high-momentum market leaders and secular growth sectors to maximize capital appreciation, accepting higher short-term volatility in exchange for maximum compounding speed.',
        mentor_answer: 'The high-risk portfolio removes defensive diversification constraints to concentrate into top secular performers, prioritizing alpha generation and market upside over downside buffering.',
        stock_reasons: buildStockReasons(aggressiveAllocs, 'aggressive')
      }
    };
  };

  const calculateAiAllocationBreakdown = async () => {
    setIsCalculatingBreakdown(true);
    const effectiveApiKey = aiApiKey?.trim() || getActiveApiKey() || '';

    const safeAllocs = analysisResult?.portfolios?.safe?.allocations || [];
    const balancedAllocs = analysisResult?.portfolios?.balanced?.allocations || [];
    const aggressiveAllocs = analysisResult?.portfolios?.aggressive?.allocations || [];

    const activePromptText = allocationPrompt?.trim() || 
      `The user has a budget of ₹${budget.toLocaleString('en-IN')}, and has selected ${stocks.join(', ')}. Suggest an optimal portfolio allocation breakdown tailored for his risk profile (${riskProfile}), and provide convincing, realistic wealth-advisor reasons explaining why each stock is allocated that amount.`;

    const prompt = `USER DIRECTIVE:
${activePromptText}

PORTFOLIO DETAILS:
- Total Budget: ₹${budget.toLocaleString('en-IN')}
- Selected Assets: ${stocks.join(', ')}
- Target Horizon: ${duration} years
- Selected Risk Profile: ${riskProfile}

Baseline Modern Portfolio Theory (MPT) Optimization Weights Already Computed:
1. The Defender (Low Risk / Capital Preservation):
${safeAllocs.map(a => `- ${a.ticker || a.name}: ${a.percentage}% (₹${Math.round(a.amount).toLocaleString('en-IN')})`).join('\n')}

2. The Balanced (AI Optimum / Balanced Compounding):
${balancedAllocs.map(a => `- ${a.ticker || a.name}: ${a.percentage}% (₹${Math.round(a.amount).toLocaleString('en-IN')})`).join('\n')}

3. The Aggressor (High Risk / Momentum Alpha):
${aggressiveAllocs.map(a => `- ${a.ticker || a.name}: ${a.percentage}% (₹${Math.round(a.amount).toLocaleString('en-IN')})`).join('\n')}

TASK:
Provide a clear, professional institutional rationale explaining WHY each stock received its specific weight across the 3 profiles, and give a concise talking script to answer a mentor asking: "Why is the price and weight breakdown calculated this way?"

CRITICAL GUIDELINES:
1. Speak like a senior private wealth manager. DO NOT use raw mathematical formulas or symbols (NO "min w^T \\Sigma w", NO "quadratic programming", NO "(E[Rp]-Rf)/\\sigma_p"). Mentors and investors dislike dry math formulas.
2. Explain the financial reasoning in natural, persuasive wealth advisor language:
   - Why does a low-risk profile favor defensive staples, pharmaceuticals, or dividend utilities?
   - Why does the balanced profile blend steady cash generators with compounders?
   - Why does the high-risk profile concentrate in fast-growing leaders?
3. For EACH stock in each profile, write 1-2 distinct, specific sentences explaining why its specific allocated amount and percentage makes sense for that company's business model (e.g. cash flow predictability, pricing power, balance sheet, dividend safety, or growth momentum). DO NOT repeat the same generic sentence for different stocks.

Return ONLY a JSON object with this exact structure (no markdown fences, no other text):
{
  "safe": {
    "strategy_summary": "1-2 sentence core thesis on capital preservation and defensive sector tilt.",
    "mentor_answer": "Direct 2-3 sentence answer to give your mentor explaining why the low-risk portfolio is weighted like this.",
    "stock_reasons": {
      "TICKER": "1-2 sentences on why this stock received its allocated percentage and amount."
    }
  },
  "balanced": {
    "strategy_summary": "1-2 sentence core thesis on balanced compounding and risk-adjusted efficiency.",
    "mentor_answer": "Direct 2-3 sentence answer to give your mentor explaining why the balanced portfolio is weighted like this.",
    "stock_reasons": {
      "TICKER": "1-2 sentences on why this stock received its allocated percentage and amount."
    }
  },
  "aggressive": {
    "strategy_summary": "1-2 sentence core thesis on capital appreciation and momentum.",
    "mentor_answer": "Direct 2-3 sentence answer to give your mentor explaining why the high-risk portfolio is weighted like this.",
    "stock_reasons": {
      "TICKER": "1-2 sentences on why this stock received its allocated percentage and amount."
    }
  }
}`;

    let parsed = null;
    if (effectiveApiKey && effectiveApiKey !== 'YOUR_API_KEY') {
      const candidateModels = [
        'google/gemma-4-31b-it:free',
        'nvidia/nemotron-3-ultra-550b-a55b:free',
        'openrouter/free',
        'nvidia/nemotron-3.5-lightning:free'
      ];
      for (const modelId of candidateModels) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 9000);
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${effectiveApiKey}`,
              'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'http://localhost:5173',
              'X-Title': 'Smart Investment Dashboard',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 1500,
              temperature: 0.25
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (response.ok) {
            const data = await response.json();
            const rawContent = data.choices?.[0]?.message?.content || '';
            const cleaned = cleanModelOutput(rawContent);
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              const obj = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
              if (obj.safe && obj.balanced && obj.aggressive) {
                parsed = obj;
                break;
              }
            }
          }
        } catch (e) {
          // Continue to next candidate model
        }
      }
    }

    if (!parsed) {
      // High-quality deterministic institutional rationale
      parsed = generateDeterministicRationale(stocks, budget, analysisResult?.portfolios);
    }

    setBreakdownRationale(parsed);
    setIsAllocationCalculated(true);
    setIsCalculatingBreakdown(false);
    sessionStorage.setItem('risk_allocation_calculated', 'true');
    sessionStorage.setItem('risk_breakdown_rationale', JSON.stringify(parsed));
  };

  const PortfolioCard = ({ portfolio, profileKey = 'safe' }) => {
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
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 relative flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{portfolio.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{portfolio.description}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold tracking-wide whitespace-nowrap">
              {portfolio.projected_return_pa}% PA
            </div>
          </div>
          
          <div className="h-[200px] w-full mb-6 relative flex items-center justify-center">
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

          {/* AI Institutional Allocation Rationale (Requested by Mentor) */}
          {breakdownRationale && breakdownRationale[profileKey] && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
              <div className="flex items-center mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-blue-500">psychology</span>
                  Why this breakdown?
                </span>
              </div>
              
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                {breakdownRationale[profileKey].strategy_summary}
              </p>

              {/* Stock-by-stock rationale accordion */}
              <div className="space-y-1.5">
                {portfolio.allocations.map((alloc, idx) => {
                  const sym = alloc.ticker || alloc.name;
                  const cleanSym = sym.replace(/\.(NS|BO)$/i, '');
                  const reason = breakdownRationale[profileKey].stock_reasons?.[sym] || 
                                 breakdownRationale[profileKey].stock_reasons?.[cleanSym] ||
                                 breakdownRationale[profileKey].stock_reasons?.[alloc.name] ||
                                 getStockRationale(sym, alloc, profileKey);
                  const isExp = expandedStockRationale[`${profileKey}_${sym}`];
                  return (
                    <div key={idx} className="rounded-lg border border-slate-100 dark:border-slate-800/80 bg-white/70 dark:bg-slate-800/40 p-2 text-xs">
                      <button
                        onClick={() => setExpandedStockRationale(prev => ({ ...prev, [`${profileKey}_${sym}`]: !isExp }))}
                        className="w-full flex justify-between items-center text-left font-semibold text-slate-700 dark:text-slate-200"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: alloc.color }}></span>
                          <span className="truncate">{sym} ({alloc.percentage}%)</span>
                        </span>
                        <span className="material-symbols-outlined text-[14px] text-slate-400 shrink-0">
                          {isExp ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                      {isExp && (
                        <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-1.5 animate-fade-in">
                          {reason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
    <div className="page-shell risk-page min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased font-['Inter'] transition-colors duration-300">

      <main className="max-w-[1240px] mx-auto px-6 py-4 pb-12">
        <div className="risk-header">
          <div className="risk-title-lockup">
            <span className="material-symbols-outlined risk-title-icon">health_and_safety</span>
            <div><h1>AI Portfolio Doctor</h1><p>Understand your risk profile, test a basket, and shape a more resilient plan.</p></div>
          </div>
          <ol className="risk-progress" aria-label="Analysis progress">
            {['Investor profile', 'Build portfolio', 'Review analysis'].map((label, index) => (
              <li key={label} className={`${step === index + 1 ? 'is-current' : ''} ${step > index + 1 ? 'is-complete' : ''}`}>
                <span className="risk-step-number">{step > index + 1 ? <span className="material-symbols-outlined">check</span> : index + 1}</span>
                <span className="risk-step-label">{label}</span>
              </li>
            ))}
          </ol>
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
                  <input type="number" value={budget} onChange={e => setBudget(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 pl-10 pr-4 font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Investment Horizon (Years)</label>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-4 font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
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

              {/* AI Strategic Allocation Header & Status */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>AI Suggested Allocations</span>
                    {isAllocationCalculated && (
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">verified</span> AI Advisor Verified
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Modern Portfolio Theory optimization tailored across 3 distinct risk appetites.
                  </p>
                </div>
                {isAllocationCalculated && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPromptEditor(!showPromptEditor)}
                      className="px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">edit_note</span>
                      <span>{showPromptEditor ? 'Hide Prompt' : 'Edit Prompt & Recalculate'}</span>
                    </button>
                    <button
                      onClick={calculateAiAllocationBreakdown}
                      disabled={isCalculatingBreakdown}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                      title="Recalculate AI breakdown rationale"
                    >
                      <span className={`material-symbols-outlined text-sm text-blue-500 ${isCalculatingBreakdown ? 'animate-spin' : ''}`}>sync</span>
                      <span>Recalculate</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Collapsible Prompt Editor Bar when already calculated */}
              {isAllocationCalculated && showPromptEditor && (
                <div className="mb-6 p-4 rounded-2xl bg-slate-900 text-white border border-slate-700/80 shadow-md animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="material-symbols-outlined text-sm text-amber-400">psychology</span>
                      Active AI Advisor Prompt
                    </label>
                    <span className="text-[11px] text-slate-400">Tweak instructions and re-run</span>
                  </div>
                  <textarea
                    value={allocationPrompt}
                    onChange={(e) => {
                      setAllocationPrompt(e.target.value);
                      sessionStorage.setItem('risk_allocation_prompt', e.target.value);
                    }}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl p-3 text-xs text-slate-200 outline-none transition-all leading-relaxed resize-none"
                    placeholder="e.g. The user has a budget of [budget], has selected [stocks], suggest a good allocation based on his [risk profile]..."
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => setShowPromptEditor(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        calculateAiAllocationBreakdown();
                        setShowPromptEditor(false);
                      }}
                      disabled={isCalculatingBreakdown}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">bolt</span>
                      Recalculate with this Prompt
                    </button>
                  </div>
                </div>
              )}

              {/* 3 Profile Cards with Interactive Blur Overlay */}
              <div className="relative mb-12">
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-500 ${
                  !isAllocationCalculated ? 'filter blur-md pointer-events-none select-none opacity-30 scale-[0.99]' : ''
                }`}>
                   <PortfolioCard portfolio={analysisResult.portfolios.safe} profileKey="safe" />
                   <PortfolioCard portfolio={analysisResult.portfolios.balanced} profileKey="balanced" />
                   <PortfolioCard portfolio={analysisResult.portfolios.aggressive} profileKey="aggressive" />
                </div>

                {/* Floating Centered Action Card when Breakdown Not Yet Calculated */}
                {!isAllocationCalculated && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                    <div className="w-full max-w-xl bg-slate-900/95 dark:bg-slate-900/95 text-white backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.6)] text-center animate-fade-in relative overflow-hidden">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <span className="material-symbols-outlined text-3xl text-amber-400 animate-pulse">local_fire_department</span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1.5">
                        Calculate Breakdown According to Profile
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto mb-4">
                        Generate an intelligent capital allocation and clear, stock-by-stock advisor explanations using your connected AI API key.
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-2 mb-4 text-xs text-slate-300">
                        <span className="bg-slate-800/90 border border-slate-700 px-3 py-1 rounded-full font-medium">
                          💰 Budget: ₹{budget.toLocaleString('en-IN')}
                        </span>
                        <span className="bg-slate-800/90 border border-slate-700 px-3 py-1 rounded-full font-medium">
                          📊 Stocks: {stocks.length} Selected
                        </span>
                        <span className="bg-slate-800/90 border border-slate-700 px-3 py-1 rounded-full font-medium">
                          🎯 Profile: {riskProfile}
                        </span>
                      </div>

                      {/* Placeholder / Editable AI Prompt Box */}
                      <div className="text-left mb-5 bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 shadow-inner">
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[14px] text-blue-400">psychology</span>
                            AI Prompt Sent to API
                          </label>
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Live LLM Engine
                          </span>
                        </div>
                        <textarea
                          value={allocationPrompt}
                          onChange={(e) => {
                            setAllocationPrompt(e.target.value);
                            sessionStorage.setItem('risk_allocation_prompt', e.target.value);
                          }}
                          rows={3}
                          className="w-full bg-slate-900 border border-slate-700/80 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all leading-relaxed font-sans resize-none shadow-inner"
                          placeholder="The user has a budget of [budget], he has selected [stocks], suggest a good allocation based on his [risk profile]..."
                        />
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] text-slate-400">edit</span>
                          You can customize this prompt above before clicking suggest.
                        </p>
                      </div>

                      <button
                        onClick={calculateAiAllocationBreakdown}
                        disabled={isCalculatingBreakdown}
                        className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-75 disabled:cursor-wait"
                      >
                        {isCalculatingBreakdown ? (
                          <>
                            <span className="material-symbols-outlined text-lg animate-spin">refresh</span>
                            <span>Sending Prompt to AI & Computing Allocation...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">bolt</span>
                            <span>Suggest Breakdown via AI</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
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
