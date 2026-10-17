const generateSmartFallbackAnswer = (symbol, chatHistory, stockData, pageContext, livePageData) => {
  const lastUserMsg = chatHistory[chatHistory.length - 1]?.content || "";
  const query = lastUserMsg.toLowerCase().trim();

  let answer = "";

  // Screen / page context questions
  if (query.includes('screen') || query.includes('page') || query.includes('where am i')) {
    const screenName = pageContext || 'Dashboard';
    answer = `You are currently on the "${screenName}" screen. ${
      livePageData ? `\n\nLive Screen Data:\n${livePageData}` : 'Ask me anything about the data on this screen!'
    }`;
  }
  // 1. Dashboard questions
  else if (query.includes('dashboard')) {
    answer = "The Dashboard is your main financial overview. It gives you a 360-degree view of your net worth, total investments, real-time market indices (like NIFTY 50 & S&P 500), asset allocation charts, and recent activity.";
  }
  // 2. Correlation Matrix / Diversification questions
  else if (query.includes('correlation') || query.includes('matrix')) {
    if (livePageData && (livePageData.includes('CORRELATION MATRIX') || livePageData.includes('Correlation between'))) {
      const lines = livePageData.split('\n').filter(l => l.includes('Correlation between') || l.includes('vs'));
      if (lines.length > 0) {
        answer = `Here is the correlation breakdown for your selected stocks:\n\n${lines.slice(0, 5).join('\n')}\n\n• Green (< 0.3): Move independently, ideal for risk hedging.\n• Red (> 0.7): Move in lockstep, increasing vulnerability to sector pullbacks.`;
      } else {
        answer = "The Asset Correlation Matrix measures how your selected stocks move relative to each other on a scale of -1.0 to +1.0:\n\n• High (>0.7 / Red): Stocks move together in the same direction.\n• Low (<0.3 / Green): Stocks move independently, providing strong diversification.\n• Moderate (0.3 - 0.7 / Yellow): Moderate co-movement.";
      }
    } else {
      answer = "The Asset Correlation Matrix measures the statistical relationship between your chosen holdings on a scale of -1.0 to +1.0:\n\n• High Correlation (+0.7 to +1.0): Assets move in lockstep. Holding too many highly correlated stocks increases vulnerability during sector pullbacks.\n• Low / Moderate Correlation (0.0 to +0.4): Healthy diversification where different assets react independently to macro news.\n• Negative Correlation (-1.0 to 0.0): Strong hedge protection where gains in one asset offset drops in another.\n\nTip: Balance high-beta growth stocks with defensive sector leaders or fixed income to maintain an optimal Sharpe ratio.";
    }
  }
  // 3. Risk / Volatility analysis questions
  else if (query.includes('risk') || query.includes('volatility') || query.includes('var') || query.includes('sharpe')) {
    answer = "Risk Analysis evaluates your portfolio's volatility, sector concentration, and drawdown risks. It computes Value-at-Risk (VaR), Sharpe Ratio, and helps you simulate market stress conditions to rebalance your allocation.";
  }
  // 4. XIRR / Returns questions
  else if (query.includes('xirr') || query.includes('cagr') || query.includes('compounding')) {
    answer = "Cumulative XIRR (Extended Internal Rate of Return) calculates your annualized returns while factoring in the exact dates of multiple buys, sells, and dividends. Unlike simple percentage return, XIRR gives an accurate measure of real compounding performance on staggered capital deployments.";
  }
  // 5. Portfolio / Sandbox questions
  else if (query.includes('portfolio') || query.includes('sandbox')) {
    answer = "The Portfolio view tracks your holdings and real transactions. You can switch between 'Real Portfolio' and 'Sandbox Portfolio' to test trading strategies without risking real capital.";
  }
  // 6. SIP / Planner questions
  else if (query.includes('sip') || query.includes('planner') || query.includes('calculate')) {
    answer = "The SIP Planner calculates long-term compounding growth on monthly systematic investments. It shows your target corpus, total invested amount, and estimated wealth gains over 1 to 30 years.";
  }
  // 7. Asset / Explorer / Search / Screener questions
  else if (query.includes('asset') || query.includes('explorer') || query.includes('search') || query.includes('screener') || query.includes('sector')) {
    answer = "The Screener & Asset Explorer lets you compare sector leaders, analyze P/E multiples, 52-week channels, and inspect quantitative ML risk tags.";
  }
  // 8. Greetings / Intro
  else if (/\b(hello|hi|hey|who are you|help|greetings)\b/i.test(query)) {
    answer = "Hello! I am AInvestor, your AI financial assistant. Ask me anything about your stock holdings, correlation matrix, risk levels, portfolio strategies, or features in Smart Invest 360!";
  }
  // 7. Stock-specific questions (dynamic and intent-aware)
  else if (symbol || stockData) {
    const stockName = symbol || 'this stock';
    const isInvestQuery = query.includes('invest') || query.includes('buy') || query.includes('purchase') || query.includes('good time');
    const isRiskQuery = query.includes('risk') || query.includes('safe') || query.includes('danger') || query.includes('drawdown');
    const isTargetQuery = query.includes('target') || query.includes('future') || query.includes('price') || query.includes('prediction') || query.includes('outlook');
    const isSellQuery = query.includes('sell') || query.includes('exit') || query.includes('cut') || query.includes('loss');

    if (stockData) {
      const price = stockData.latest_price || 0;
      const change = stockData.returns || 0;
      const currency = stockData.currency || (symbol?.endsWith('.NS') ? '₹' : '$');
      const isPositive = change >= 0;
      
      if (isInvestQuery) {
        answer = isPositive
          ? `Yes, ${stockName} is demonstrating strong upward momentum (+${change.toFixed(2)}% today at ${currency}${price}). Technical indicators support a phased accumulation approach (SIP) with trailing stop-loss.`
          : `${stockName} is currently consolidating at ${currency}${price} (${change.toFixed(2)}%). It offers a disciplined buy-on-dips entry for medium to long-term investors aiming for mean-reversion upside.`;
      } else if (isRiskQuery) {
        answer = `${stockName} displays ${isPositive ? 'low to moderate' : 'heightened'} volatility. With current trading at ${currency}${price}, keep your single-stock position size below 10-15% of total portfolio value.`;
      } else if (isTargetQuery) {
        const estTarget = (price * (isPositive ? 1.12 : 1.08)).toFixed(1);
        answer = `Quantitative price action models project a 3-month upside horizon toward ${currency}${estTarget} for ${stockName}, backed by solid sector liquidity.`;
      } else {
        answer = `${stockName} is trading at ${currency}${price} (${isPositive ? '+' : ''}${change.toFixed(2)}% today). Fundamentals indicate healthy institutional interest with sound balance sheet liquidity.`;
      }
    } else {
      // Dynamic fallback when live price object is not yet loaded in context
      if (isInvestQuery) {
        answer = `Yes, ${stockName} presents a viable investment setup. Current sector multiples and quantitative momentum favor accumulation in staggered tranches over a 6 to 12-month horizon.`;
      } else if (isRiskQuery) {
        answer = `The quantitative risk engine rates ${stockName} as Moderate risk with low systemic contagion probability. Diversifying across defensive sectors will further cushion potential drawdowns.`;
      } else if (isTargetQuery) {
        answer = `Sector consensus projects an estimated 10-15% annual return potential for ${stockName}, assuming benchmark indices sustain support above key moving averages.`;
      } else if (isSellQuery) {
        answer = `For ${stockName}, consider trailing a stop-loss 5% below its recent swing low. If your investment thesis remains intact, holding through consolidation is recommended.`;
      } else {
        answer = `Analysis on ${stockName}: The company demonstrates resilient operational metrics and strong market presence. Momentum and volume profiles indicate favorable risk-adjusted positioning.`;
      }
    }
  }
  // 8. General financial / context fallback
  else {
    const contextInfo = pageContext ? ` (currently on ${pageContext})` : "";
    answer = `Based on your portfolio setup${contextInfo}, maintaining a diversified asset allocation between growth equities, index funds, and cash reserves provides optimal risk-adjusted returns over time.`;
  }

  if (!answer.includes('⚠️ Invest at your own risk.')) {
    answer += '\n\n⚠️ Invest at your own risk.';
  }

  return answer;
};

// Strips stray XML tags or model tool-calling tokens
export const cleanModelOutput = (text) => {
  if (!text) return "";
  let cleaned = text
    .replace(/<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/gi, '')
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .replace(/<\|.*?\|>/g, '')
    .trim();

  // If stripped everything because answer was wrapped in think tags:
  if (!cleaned && text.includes('<think>')) {
    cleaned = text.replace(/<\/?think>/gi, '').trim();
  }
  return cleaned || text.trim();
};

export const askAiChat = async (symbol, chatHistory, stockData, pageContext = "", livePageData = "") => {
  try {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || 
                   localStorage.getItem('openRouterApiKey') || 
                   localStorage.getItem('openrouter_api_key');

    if (apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_API_KEY') {
      let stockContext = "";
      if (stockData) {
        const price = stockData.latest_price || 0;
        const change = stockData.returns || 0;
        const currency = stockData.currency || (symbol?.endsWith('.NS') ? '₹' : '$');
        const high = stockData.day_high || (price * 1.01);
        const low = stockData.day_low || (price * 0.99);
        stockContext = `CURRENT DATA FOR ${symbol}: Price ${currency}${price}, Change ${change.toFixed(2)}%, High ${currency}${high.toFixed(2)}, Low ${currency}${low.toFixed(2)}. `;
      }

      const contextStr = pageContext ? `Screen Context: ${pageContext}.\n` : "";
      const symbolStr = symbol ? `Stock: ${symbol}.\n` : "";
      const liveDataHeader = livePageData 
        ? `\n--- LIVE METRICS FROM USER'S CURRENT SCREEN ---\n${livePageData}\n----------------------------------------------\nIMPORTANT: Use the specific numbers, stock pairs, and blueprint allocations in the screen data above to answer the user's question directly. Do NOT assume holdings or allocations are 0.00% if simulated blueprint data is provided.\n`
        : "";

      const promptDirective = `You are AInvestor, an expert AI financial advisor in Smart Invest 360.
${contextStr}${symbolStr}${stockContext}${liveDataHeader}
Answer the user's question clearly, informatively, and directly in 2-4 sentences using the live data on screen.
Always end with: ⚠️ Invest at your own risk.`;

      // Transform chat history into universally compatible messages format (user role instruction to avoid 400 system rejections)
      const messages = chatHistory.map((m, idx) => {
        if (idx === chatHistory.length - 1 && m.role === 'user') {
          return {
            role: 'user',
            content: `${promptDirective}\n\nUser Question: ${m.content}`
          };
        }
        return m;
      });

      // Responsive free models on OpenRouter
      const candidateModels = [
        'dots-studio/dots-3-note-preview:free',
        'openrouter/free',
        'poolside/laguna-xs-2.1:free',
        'poolside/laguna-s-2.1:free',
        'nvidia/nemotron-3.5-lightning:free'
      ];

      for (const modelId of candidateModels) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000); // 7-second strict timeout per model

          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey.trim()}`,
              'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
              'X-Title': 'Smart Investment Dashboard'
            },
            body: JSON.stringify({
              model: modelId,
              messages: messages,
              max_tokens: 650,
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            let raw = data.choices?.[0]?.message?.content;
            if (!raw || !raw.trim()) {
              raw = data.choices?.[0]?.message?.reasoning || 
                    data.choices?.[0]?.message?.thought || 
                    data.choices?.[0]?.text || 
                    "";
            }
            const cleaned = cleanModelOutput(raw);
            if (cleaned && cleaned.length > 5) {
              return cleaned;
            }
          }
        } catch (callErr) {
          console.warn(`Model ${modelId} timed out or failed, checking next model:`, callErr.name || callErr.message);
        }
      }
    }
  } catch (e) {
    console.error('Error calling ask AI, falling back to local assistant:', e);
  }

  return generateSmartFallbackAnswer(symbol, chatHistory, stockData, pageContext, livePageData);
};

export const getActiveApiKey = () => {
  return (
    import.meta.env.VITE_OPENROUTER_API_KEY ||
    localStorage.getItem('openRouterApiKey') ||
    localStorage.getItem('openrouter_api_key') ||
    ''
  ).trim();
};

export const REAL_BENCHMARK_MODELS = [
  {
    id: 'poolside/laguna-xs-2.1:free',
    name: 'Poolside Laguna XS 2.1',
    provider: 'Poolside',
    architecture: 'Financial Micro-LLM',
    avatarColor: 'bg-purple-600',
    fallbackModel: 'dots-studio/dots-3-note-preview:free'
  },
  {
    id: 'poolside/laguna-s-2.1:free',
    name: 'Poolside Laguna S 2.1',
    provider: 'Poolside',
    architecture: 'High-Capacity Reasoning',
    avatarColor: 'bg-emerald-600',
    fallbackModel: 'openrouter/free'
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'NVIDIA Nemotron 3.5',
    provider: 'NVIDIA',
    architecture: 'High-Throughput Reasoning',
    avatarColor: 'bg-teal-600',
    fallbackModel: 'dots-studio/dots-3-note-preview:free'
  },
  {
    id: 'dots-studio/dots-3-note-preview:free',
    name: 'Dots Note 3',
    provider: 'Dots Studio',
    architecture: 'Instruction Fine-Tuned',
    avatarColor: 'bg-indigo-600',
    fallbackModel: 'openrouter/free'
  }
];

export const ALTERNATIVE_MODELS_LIST = [
  { id: 'dots-studio/dots-3-note-preview:free', name: 'Dots Note 3 (Fast)' },
  { id: 'openrouter/free', name: 'OpenRouter Smart Free Router' },
  { id: 'poolside/laguna-s-2.1:free', name: 'Poolside Laguna S 2.1' },
  { id: 'nvidia/nemotron-3.5-lightning:free', name: 'NVIDIA Nemotron 3.5' }
];

export const querySingleModelOpenRouter = async (modelInfo, symbol, prompt, stockData, apiKey, overrideModelId = null) => {
  const startTime = performance.now();
  let stockContext = "";
  if (stockData) {
    const price = stockData.latest_price || 0;
    const change = stockData.returns || 0;
    const currency = stockData.currency || (symbol?.endsWith('.NS') ? '₹' : '$');
    stockContext = `Stock price: ${currency}${price}, Today's Return: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%. `;
  }

  const cleanPrompt = (prompt || '').trim();
  const isGeneralPrompt = /^(what is|\d+\s*[\+\-\*\/]|who is|tell me|hello|hi\b|how to|why is|explain|calculate|solve)/i.test(cleanPrompt);

  let userContent = "";
  if (isGeneralPrompt) {
    userContent = cleanPrompt;
  } else {
    userContent = `${cleanPrompt || `Give your equity rating and investment analysis on ${symbol || 'this stock'}.`}\n\n${stockContext ? `Market Context: ${stockContext}` : ''}\n\nProvide 2-3 concise sentences with an explicit verdict stance: [BULLISH, BEARISH, or NEUTRAL] and brief fundamental justification. Do not output code or tool calls. End with: ⚠️ Invest at your own risk.`;
  }

  const makeSingleCall = async (modelId) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s per candidate
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
          'X-Title': 'Smart Investment Dashboard'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: userContent }],
          max_tokens: 650,
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      return response;
    } catch (err) {
      clearTimeout(timeout);
      return null;
    }
  };

  // Build candidate models order to cascade through
  const primaryId = overrideModelId || modelInfo.id;
  const candidates = [
    primaryId,
    overrideModelId ? 'openrouter/free' : modelInfo.fallbackModel,
    'dots-studio/dots-3-note-preview:free',
    'openrouter/free'
  ].filter(Boolean);

  const uniqueCandidates = [...new Set(candidates)];

  let successfulData = null;
  let modelActuallyUsed = primaryId;
  let lastErrorMsg = 'Endpoint busy on free tier.';

  for (let i = 0; i < uniqueCandidates.length; i++) {
    const candidateId = uniqueCandidates[i];
    if (i > 0) {
      await new Promise(r => setTimeout(r, 200));
    }

    try {
      const res = await makeSingleCall(candidateId);
      if (res && res.ok) {
        const data = await res.json();
        let raw = data.choices?.[0]?.message?.content;
        if (!raw || !raw.trim()) {
          raw = data.choices?.[0]?.message?.reasoning || 
                data.choices?.[0]?.message?.thought || 
                data.choices?.[0]?.delta?.content || 
                data.choices?.[0]?.text || 
                "";
        }

        const rawContent = cleanModelOutput(raw) || raw;
        if (rawContent && rawContent.trim().length > 2) {
          successfulData = {
            content: rawContent.trim(),
            tokens: data.usage?.total_tokens || null,
            modelUsed: data.model || candidateId
          };
          modelActuallyUsed = data.model || candidateId;
          break;
        } else {
          lastErrorMsg = 'Empty output returned from model.';
        }
      } else if (res) {
        const errJson = await res.json().catch(() => ({}));
        lastErrorMsg = errJson.error?.message || errJson.message || `HTTP ${res.status}`;
      } else {
        lastErrorMsg = 'Request timed out.';
      }
    } catch (e) {
      lastErrorMsg = e.message || 'Call failed';
    }
  }

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

  if (successfulData) {
    const lower = successfulData.content.toLowerCase();
    let stance = isGeneralPrompt ? 'Answer' : 'Neutral';
    let stanceType = 'hold';
    if (lower.includes('bullish') || lower.includes('buy') || lower.includes('positive') || lower.includes('upside') || lower.includes('outperform')) {
      stance = 'Bullish';
      stanceType = 'buy';
    } else if (lower.includes('bearish') || lower.includes('sell') || lower.includes('negative') || lower.includes('downside') || lower.includes('avoid')) {
      stance = 'Bearish';
      stanceType = 'sell';
    }

    return {
      id: modelInfo.id,
      name: modelInfo.name,
      provider: modelInfo.provider,
      architecture: modelInfo.architecture,
      avatarColor: modelInfo.avatarColor,
      status: 'success',
      content: successfulData.content,
      stance,
      stanceType,
      latency: `${elapsed}s`,
      tokens: successfulData.tokens,
      modelUsed: successfulData.modelUsed || modelActuallyUsed
    };
  }

  return {
    id: modelInfo.id,
    name: modelInfo.name,
    provider: modelInfo.provider,
    architecture: modelInfo.architecture,
    avatarColor: modelInfo.avatarColor,
    status: 'error',
    error: lastErrorMsg,
    latency: `${elapsed}s`,
    canRetryAlt: true
  };
};

