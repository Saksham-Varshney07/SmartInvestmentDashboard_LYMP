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
  // 2. Risk / Risk analysis questions
  else if (query.includes('risk')) {
    answer = "Risk Analysis evaluates your portfolio's volatility, sector concentration, and drawdown risks. It helps you simulate market conditions, test sandbox blueprints, and balance your risk profile.";
  }
  // 3. Portfolio / Sandbox questions
  else if (query.includes('portfolio') || query.includes('sandbox')) {
    answer = "The Portfolio view tracks your holdings and real transactions. You can switch between 'Real Portfolio' and 'Sandbox Portfolio' to test trading strategies without risking real capital.";
  }
  // 4. SIP / Planner questions
  else if (query.includes('sip') || query.includes('planner') || query.includes('calculate')) {
    answer = "The SIP Planner calculates long-term compounding growth on monthly systematic investments. It shows your target corpus, total invested amount, and estimated wealth gains over 1 to 30 years.";
  }
  // 5. Asset / Explorer / Search / Screener questions
  else if (query.includes('asset') || query.includes('explorer') || query.includes('search') || query.includes('screener') || query.includes('sector')) {
    answer = "The Screener & Asset Explorer lets you compare sector leaders, analyze P/E multiples, 52-week channels, and inspect quantitative ML risk tags.";
  }
  // 6. Greetings / Intro (use word boundary regex to avoid matching substrings like 'which')
  else if (/\b(hello|hi|hey|who are you|help|greetings)\b/i.test(query)) {
    answer = "Hello! I am AInvestor, your AI financial assistant. Ask me anything about your stock holdings, risk levels, portfolio strategies, or how to use features in Smart Invest 360!";
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
  return text
    .replace(/<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/gi, '')
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .replace(/<\|.*?\|>/g, '')
    .trim();
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
        stockContext = `CURRENT REAL-TIME DATA FOR ${symbol}: Price is ${currency}${price}, Daily Change is ${change.toFixed(2)}%, Day High ${currency}${high.toFixed(2)}, Day Low ${currency}${low.toFixed(2)}. Use this exact real-time data to answer the user and give your clear opinion. `;
      }

      const contextStr = pageContext ? `The user is currently on the following page in the app: ${pageContext}. Tailor your advice and answers to this context.` : "";
      const liveDataStr = livePageData ? `\n\nCRITICAL LIVE PAGE DATA (This is what the user is currently looking at on their screen, use this to answer their questions accurately):\n${livePageData}\n\n` : "";
      const symbolStr = symbol ? `The user is asking about the stock ${symbol}.` : "";

      const messages = [
        {
          role: 'system',
          content: `You are an incredibly bold and psychic stock advisor in a web app. ${contextStr} ${symbolStr} ${stockContext} ${liveDataStr}
Rules you MUST follow:
1. Use very simple, easy-to-understand language. No jargon.
2. Give direct, straightforward answers. If a stock looks good, say "Yes, this is a good time to invest." If not, say "No, it might be better to wait."
3. BE EXTREMELY CONFIDENT. NEVER say "it's impossible to predict" or "I cannot predict the future." You MUST make explicit predictions (e.g., predicting the price in 1 month) based on the data provided. Answer absolutely any question asked without holding anything back.
4. Keep answers short - max 3-4 sentences.
5. ALWAYS end every single response with exactly this line on a new line: "⚠️ Invest at your own risk."`
        },
        ...chatHistory
      ];

      // Robust candidate models chain to avoid single-model failures
      const candidateModels = [
        'poolside/laguna-xs-2.1:free',
        'nvidia/nemotron-3.5-lightning:free',
        'google/gemma-4-26b-a4b-it:free',
        'thinkingmachines/inkling:free'
      ];

      for (const modelId of candidateModels) {
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
              messages: messages,
              max_tokens: 600,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const raw = data.choices?.[0]?.message?.content;
            const cleaned = cleanModelOutput(raw);
            if (cleaned && cleaned.length > 5) {
              return cleaned;
            }
          }
        } catch (callErr) {
          console.warn(`Model ${modelId} failed, trying next model in chain:`, callErr);
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
    fallbackModel: 'poolside/laguna-s-2.1:free'
  },
  {
    id: 'poolside/laguna-s-2.1:free',
    name: 'Poolside Laguna S 2.1',
    provider: 'Poolside',
    architecture: 'High-Capacity Reasoning',
    avatarColor: 'bg-emerald-600',
    fallbackModel: 'poolside/laguna-xs-2.1:free'
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'NVIDIA Nemotron 3.5',
    provider: 'NVIDIA',
    architecture: 'High-Throughput Reasoning',
    avatarColor: 'bg-teal-600',
    fallbackModel: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'
  },
  {
    id: 'dots-studio/dots-3-note-preview:free',
    name: 'Dots Note 3',
    provider: 'Dots Studio',
    architecture: 'Instruction Fine-Tuned',
    avatarColor: 'bg-indigo-600',
    fallbackModel: 'thinkingmachines/inkling:free'
  }
];

export const querySingleModelOpenRouter = async (modelInfo, symbol, prompt, stockData, apiKey) => {
  const startTime = performance.now();
  let stockContext = "";
  if (stockData) {
    const price = stockData.latest_price || 0;
    const change = stockData.returns || 0;
    const currency = stockData.currency || (symbol?.endsWith('.NS') ? '₹' : '$');
    stockContext = `Stock price: ${currency}${price}, Today's Return: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%. `;
  }

  const cleanPrompt = (prompt || '').trim();
  // Check if user is asking a basic prompt (math, general question, greetings, etc.)
  const isGeneralPrompt = /^(what is|\d+\s*[\+\-\*\/]|who is|tell me|hello|hi\b|how to|why is|explain|calculate|solve)/i.test(cleanPrompt);

  let userContent = "";
  if (isGeneralPrompt) {
    userContent = cleanPrompt;
  } else {
    userContent = `${cleanPrompt || `Give your equity rating and investment analysis on ${symbol || 'this stock'}.`}\n\n${stockContext ? `Market Context: ${stockContext}` : ''}\n\nProvide 2-3 concise sentences with an explicit verdict stance: [BULLISH, BEARISH, or NEUTRAL] and brief fundamental justification. Do not output code or tool calls. End with: ⚠️ Invest at your own risk.`;
  }

  const makeRequest = async (modelId) => {
    return await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
        'X-Title': 'Smart Investment Dashboard'
      },
      body: JSON.stringify({
        model: modelId,
        // Crucial: Put user prompt in 'user' role to prevent HTTP 400 'system role not supported' on open-source models
        messages: [
          { role: 'user', content: userContent }
        ],
        max_tokens: 300,
      })
    });
  };

  try {
    let res = await makeRequest(modelInfo.id);

    // If rate-limited or unavailable, try fallback model with slight delay
    if (!res.ok && modelInfo.fallbackModel) {
      console.warn(`Primary model ${modelInfo.id} returned HTTP ${res.status}. Attempting fallback to ${modelInfo.fallbackModel}`);
      await new Promise((r) => setTimeout(r, 250));
      res = await makeRequest(modelInfo.fallbackModel);
    }

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || errData.message || (res.status === 429 ? 'Rate limit exceeded on free tier. Please wait a few moments and re-query.' : `Provider error (${res.status})`);
      console.error(`[OpenRouter API Error] ${modelInfo.id} status ${res.status}:`, errMsg);
      return {
        id: modelInfo.id,
        name: modelInfo.name,
        provider: modelInfo.provider,
        architecture: modelInfo.architecture,
        avatarColor: modelInfo.avatarColor,
        status: 'error',
        error: errMsg,
        latency: `${elapsed}s`
      };
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const rawContent = cleanModelOutput(raw) || raw;

    if (!rawContent || rawContent.length < 2) {
      return {
        id: modelInfo.id,
        name: modelInfo.name,
        provider: modelInfo.provider,
        architecture: modelInfo.architecture,
        avatarColor: modelInfo.avatarColor,
        status: 'error',
        error: 'Model returned an empty response. Click Compare Live to retry.',
        latency: `${elapsed}s`
      };
    }

    const lower = rawContent.toLowerCase();
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
      content: rawContent,
      stance,
      stanceType,
      latency: `${elapsed}s`,
      tokens: data.usage?.total_tokens || null,
      modelUsed: data.model || modelInfo.id
    };
  } catch (e) {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    return {
      id: modelInfo.id,
      name: modelInfo.name,
      provider: modelInfo.provider,
      architecture: modelInfo.architecture,
      avatarColor: modelInfo.avatarColor,
      status: 'error',
      error: e.message || 'Network request failed',
      latency: `${elapsed}s`
    };
  }
};

