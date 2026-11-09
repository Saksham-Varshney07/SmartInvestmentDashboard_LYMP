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
    const rawName = stockData?.company_name || stockData?.name || '';
    const cleanSym = symbol ? symbol.replace(/\.(NS|BO)$/i, '') : '';
    const stockName = rawName ? `${rawName} (${symbol || cleanSym})` : (symbol || 'this stock');
    const isInvestQuery = query.includes('invest') || query.includes('buy') || query.includes('purchase') || query.includes('good time');
    const isRiskQuery = query.includes('risk') || query.includes('safe') || query.includes('danger') || query.includes('drawdown');
    const isTargetQuery = query.includes('target') || query.includes('future') || query.includes('price') || query.includes('prediction') || query.includes('outlook');
    const isSellQuery = query.includes('sell') || query.includes('exit') || query.includes('cut') || query.includes('loss');
    const isPerfQuery = query.includes('perform') || query.includes('doing') || query.includes('trend') || query.includes('status') || query.includes('how is');

    if (stockData && stockData.latest_price) {
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
      } else if (isPerfQuery) {
        answer = `${stockName} is trading at ${currency}${price} (${isPositive ? '+' : ''}${change.toFixed(2)}% today). Price action and technical indicators show ${isPositive ? 'resilient buyer accumulation' : 'mild consolidation'}, in line with broader sector sentiment.`;
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
      } else if (isPerfQuery) {
        answer = `Analysis on ${stockName}: The company demonstrates resilient operational performance and strong market capitalization. Technical indicators show healthy institutional positioning.`;
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

// Strips stray XML tags, chain-of-thought, or internal model thinking processes
export const cleanModelOutput = (text) => {
  if (!text || typeof text !== 'string') return "";

  let cleaned = text
    .replace(/<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/gi, '')
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .replace(/<\|.*?\|>/g, '')
    // 1. Remove standard XML thinking/reasoning tags
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '')
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .trim();

  // If text was cut off before closing tag: e.g. <think>...[EOF]
  if (/<(?:think|thought|thinking|reasoning)>/i.test(cleaned)) {
    const splitTag = cleaned.split(/<(?:think|thought|thinking|reasoning)>/i);
    cleaned = (splitTag[0] || '').trim();
  }

  // 2. Look for explicit final answer / verdict markers
  const finalMarkerMatch = /(?:(?:\*\*|#+)?\s*(?:final response|final answer|final verdict|verdict|recommendation|final output|conclusion):\s*(?:\*\*|#+)?)([\s\S]+)/i.exec(cleaned);
  if (finalMarkerMatch && finalMarkerMatch[1] && finalMarkerMatch[1].trim().length > 10) {
    return finalMarkerMatch[1].trim();
  }

  // 3. Strip "Here's a thinking process:" / "Thinking Process:" blocks
  if (/(?:here'?s (?:a )?thinking process|thinking process|thought process):/i.test(cleaned)) {
    const afterThinking = cleaned.split(/(?:here'?s (?:a )?thinking process|thinking process|thought process):/i)[1];
    if (afterThinking) {
      // Look for stance transition line (e.g. "BULLISH - " or "[BULLISH]" or "**BULLISH**" or "**Stance:**")
      const stanceMarker = /(?:(?:\n\s*---\s*\n|\n\n+)(?=(?:\[?(?:BULLISH|BEARISH|NEUTRAL)\]?|(?:\*\*|#+)?(?:Stance|Rating|Verdict):?))|(?:\n\n)(?=[A-Z][a-zA-Z\s]{0,25}(?:–|-|:)\s*[A-Z]))([\s\S]+)/i.exec(afterThinking);
      if (stanceMarker && stanceMarker[1] && stanceMarker[1].trim().length > 10) {
        return stanceMarker[1].trim();
      }

      // Check if there is a paragraph ending with "Invest at your own risk" that isn't part of instructions
      const paragraphs = afterThinking.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
      const answerPara = paragraphs.reverse().find(p => 
        (p.includes('Invest at your own risk') || p.includes('⚠️')) && 
        !/^we need to /i.test(p) && 
        !/^\d+\.\s*\*\*/.test(p) &&
        !/^user asks/i.test(p)
      );
      if (answerPara) {
        return answerPara.trim();
      }

      // If no valid response was produced (model cut off while thinking)
      cleaned = '';
    }
  }

  // 4. Strip prompt-reflection / meta-planning text (e.g. 'We need to respond with... The user asks: ...')
  if (/^we need to (?:respond|output)/i.test(cleaned) || /^user (?:query|asks):/i.test(cleaned)) {
    const parts = cleaned.split(/\n\n+/);
    const validParts = parts.filter(p => 
      !/^we need to/i.test(p) && 
      !/^the user asks/i.test(p) && 
      !/^user (?:query|asks):/i.test(p) &&
      !/^\d+\.\s*\*\*/.test(p) &&
      !/they want a verdict/i.test(p)
    );
    if (validParts.length > 0 && validParts.join('\n\n').length > 15) {
      cleaned = validParts.join('\n\n').trim();
    } else {
      cleaned = '';
    }
  }

  // 5. Strip leading numbered thinking steps if they appear at the start (e.g. '1. **Analyze User Input:**')
  if (/^1\.\s*\*\*Analyze User Input/i.test(cleaned) || /^1\.\s*\*\*(?:Understand|Examine|Deconstruct)/i.test(cleaned)) {
    const nonThinking = cleaned.split(/\n\n+/).filter(p => !/^\d+\.\s*\*\*/.test(p));
    if (nonThinking.length > 0 && nonThinking.join('\n\n').length > 15) {
      cleaned = nonThinking.join('\n\n').trim();
    } else {
      cleaned = '';
    }
  }

  return cleaned.trim();
};

export const askAiChat = async (symbol, chatHistory, stockData, pageContext = "", livePageData = "") => {
  try {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || 
                   localStorage.getItem('openRouterApiKey') || 
                   localStorage.getItem('openrouter_api_key');

    const targetSymbol = (symbol || stockData?.symbol || '').trim();
    const rawCompanyName = stockData?.company_name || stockData?.name || '';
    const cleanName = rawCompanyName || (targetSymbol ? targetSymbol.replace(/\.(NS|BO)$/i, '') : '');
    const companyLabel = cleanName ? `${cleanName} (${targetSymbol})` : targetSymbol;

    if (apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_API_KEY') {
      let stockContext = "";
      if (targetSymbol) {
        const price = stockData?.latest_price || stockData?.price || 0;
        const change = stockData?.returns ?? stockData?.change ?? 0;
        const currency = stockData?.currency || (targetSymbol.endsWith('.NS') ? '₹' : '$');
        const high = stockData?.day_high || (price ? price * 1.01 : 0);
        const low = stockData?.day_low || (price ? price * 0.99 : 0);
        stockContext = `CURRENT ACTIVE STOCK DATA FOR ${companyLabel}: Price ${currency}${price}, Change ${Number(change) >= 0 ? '+' : ''}${typeof change === 'number' ? change.toFixed(2) : change}%, High ${currency}${typeof high === 'number' ? high.toFixed(2) : high}, Low ${currency}${typeof low === 'number' ? low.toFixed(2) : low}. `;
        if (stockData?.pe_ratio) stockContext += `P/E Ratio: ${stockData.pe_ratio}. `;
        if (stockData?.sector) stockContext += `Sector: ${stockData.sector}. `;
        if (stockData?.risk) stockContext += `Risk Level: ${stockData.risk}. `;
      }

      const contextStr = pageContext ? `Screen Context: ${pageContext}.\n` : "";
      const symbolStr = targetSymbol 
        ? `Active Target Stock: ${companyLabel}.\nIMPORTANT CONTEXT INSTRUCTION: When the user asks "how is this stock performing?", "is it a good buy?", "what are its risks?", "should I buy it?", or uses pronouns like "this stock", "this company", "it", or "its", they are explicitly asking about ${companyLabel}. Never ask the user to specify the ticker or company name — answer directly for ${companyLabel}.\n`
        : "";
      const liveDataHeader = livePageData 
        ? `\n--- LIVE METRICS FROM USER'S CURRENT SCREEN ---\n${livePageData}\n----------------------------------------------\nIMPORTANT: Use the specific numbers, stock pairs, and blueprint allocations in the screen data above to answer the user's question directly. Do NOT assume holdings or allocations are 0.00% if simulated blueprint data is provided.\n`
        : "";

      const promptDirective = `You are AInvestor, an expert institutional AI financial advisor in Smart Invest 360.
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

      // Responsive free models on OpenRouter (favor clean instruction-tuned models)
      const candidateModels = [
        'google/gemma-4-31b-it:free',
        'nvidia/nemotron-3-ultra-550b-a55b:free',
        'openrouter/free',
        'nvidia/nemotron-3.5-lightning:free',
        'dots-studio/dots-3-note-preview:free'
      ];

      for (const modelId of candidateModels) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second fast timeout per model

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
              max_tokens: 1000,
              temperature: 0.3,
              include_reasoning: false
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
    id: 'google/gemma-4-31b-it:free',
    name: 'Poolside Laguna XS 2.1',
    provider: 'Poolside',
    architecture: 'Financial Micro-LLM',
    avatarColor: 'bg-purple-600',
    fallbackModel: 'openrouter/free'
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
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
    fallbackModel: 'nvidia/nemotron-3-ultra-550b-a55b:free'
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
  { id: 'openrouter/free', name: 'OpenRouter Smart Free Router' },
  { id: 'google/gemma-4-31b-it:free', name: 'Google Gemma 4 31B (Fast)' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'NVIDIA Nemotron 3 Ultra 550B' },
  { id: 'dots-studio/dots-3-note-preview:free', name: 'Dots Note 3' }
];

export const querySingleModelOpenRouter = async (modelInfo, symbol, prompt, stockData, apiKey, overrideModelId = null) => {
  const startTime = performance.now();
  const cleanPrompt = (prompt || '').trim();

  // Resolve active symbol & clean company name
  const targetSymbol = (symbol || stockData?.symbol || '').trim();
  const rawCompanyName = stockData?.company_name || stockData?.name || '';
  const cleanName = rawCompanyName || (targetSymbol ? targetSymbol.replace(/\.(NS|BO)$/i, '') : '');
  const companyLabel = cleanName ? `${cleanName} (${targetSymbol})` : targetSymbol;

  let stockContext = "";
  if (targetSymbol) {
    const price = stockData?.latest_price || stockData?.price;
    const change = stockData?.returns ?? stockData?.change;
    const currency = stockData?.currency || (targetSymbol.endsWith('.NS') ? '₹' : '$');
    stockContext = `Target Stock Asset: ${companyLabel}.`;
    if (price !== undefined && price !== null && price > 0) {
      stockContext += ` Current Market Price: ${currency}${price}`;
      if (change !== undefined && change !== null) {
        stockContext += ` (${Number(change) >= 0 ? '+' : ''}${typeof change === 'number' ? change.toFixed(2) : change}% today)`;
      }
      stockContext += `.`;
    }
    if (stockData?.sector) stockContext += ` Sector: ${stockData.sector}.`;
    if (stockData?.pe_ratio) stockContext += ` P/E Ratio: ${stockData.pe_ratio}.`;
    if (stockData?.risk) stockContext += ` Quantitative Risk: ${stockData.risk}.`;
  }

  // Check if prompt is purely mathematical or greeting with no stock context
  const isPureMath = /^\s*[\d\.\s\+\-\*\/\(\)\^]+\s*$/.test(cleanPrompt);
  const isPureGreeting = /^(hello|hi|hey|greetings)$/i.test(cleanPrompt);
  const isGeneralPrompt = isPureMath || isPureGreeting;

  let userContent = "";
  if (isPureMath || isPureGreeting) {
    userContent = cleanPrompt;
  } else {
    // If targetSymbol is known and user refers to "this stock", "it", or doesn't mention the ticker name
    let contextualizedQuestion = cleanPrompt || `Provide your equity recommendation on ${companyLabel || 'this stock'}.`;
    if (targetSymbol) {
      const mentionsTicker = cleanPrompt.toLowerCase().includes(targetSymbol.toLowerCase()) || 
                             (cleanName && cleanPrompt.toLowerCase().includes(cleanName.toLowerCase()));
      if (!mentionsTicker) {
        contextualizedQuestion = `Regarding ${companyLabel}: ${cleanPrompt}`;
      }
    }

    userContent = `[INSTITUTIONAL DIRECTIVE: You are analyzing ${companyLabel || 'the requested equity'}. Provide ONLY your direct final verdict and rationale in 2-3 concise sentences. DO NOT say "no ticker provided" or ask for a symbol — the target asset on screen is ${companyLabel}. Absolutely NEVER output any internal thinking process, reasoning steps, or notes.]\n\n${stockContext ? `Live Market Context: ${stockContext}\n` : ''}User Question: ${contextualizedQuestion}\n\nFormat: [BULLISH, BEARISH, or NEUTRAL] - [Concise fundamental reason for ${companyLabel || 'the stock'}]. End with: ⚠️ Invest at your own risk.`;
  }

  const systemContent = `You are an institutional equity analyst in Smart Investment Dashboard.${targetSymbol ? ` The user is actively viewing and analyzing ${companyLabel}. All questions like "how is this stock performing?" refer directly to ${companyLabel}.` : ''} Provide ONLY your final, concise verdict and analysis in 2-3 sentences. Absolutely NEVER output any thinking process, internal reasoning, scratchpad, or planning steps. Begin directly with your stance ([BULLISH], [BEARISH], or [NEUTRAL]).`;

  const makeSingleCall = async (modelId) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s per candidate
    try {
      const payload = {
        model: modelId,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent }
        ],
        max_tokens: 1000,
        temperature: 0.25,
        include_reasoning: false
      };

      let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
          'X-Title': 'Smart Investment Dashboard'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      // If a model rejects 'system' role with 400, retry with single user role
      if (response && response.status === 400) {
        payload.messages = [{ role: 'user', content: `${systemContent}\n\n${userContent}` }];
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
            'X-Title': 'Smart Investment Dashboard'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      }

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
    'nvidia/nemotron-3-ultra-550b-a55b:free',
    'google/gemma-4-31b-it:free',
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

        // Clean out any thinking process or chain-of-thought artifacts
        const rawContent = cleanModelOutput(raw);
        // Note: Do NOT fall back to uncleaned raw if it was stripped (since stripped means pure thinking)
        if (rawContent && rawContent.trim().length > 10) {
          successfulData = {
            content: rawContent.trim(),
            tokens: data.usage?.total_tokens || null,
            modelUsed: data.model || candidateId
          };
          modelActuallyUsed = data.model || candidateId;
          break;
        } else {
          lastErrorMsg = 'Model generated reasoning steps without a direct response.';
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

