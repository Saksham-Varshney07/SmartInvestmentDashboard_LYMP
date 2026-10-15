const generateSmartFallbackAnswer = (symbol, chatHistory, stockData, pageContext, livePageData) => {
  const lastUserMsg = chatHistory[chatHistory.length - 1]?.content || "";
  const query = lastUserMsg.toLowerCase().trim();

  let answer = "";

  // 1. Dashboard questions
  if (query.includes('dashboard')) {
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
  // 5. Asset / Explorer / Search questions
  else if (query.includes('asset') || query.includes('explorer') || query.includes('search')) {
    answer = "Asset Explorer lets you search global and Indian stocks, analyze P/E ratios, market cap, financial performance, and view interactive price charts.";
  }
  // 6. Greetings / Intro
  else if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('who are you') || query.includes('help')) {
    answer = "Hello! I am AInvestor, your AI financial assistant. Ask me anything about your stock holdings, risk levels, portfolio strategies, or how to use features in Smart Invest 360!";
  }
  // 7. Stock-specific questions
  else if (symbol || stockData) {
    const stockName = symbol || 'this stock';
    if (stockData) {
      const price = stockData.latest_price || 0;
      const change = stockData.returns || 0;
      const currency = stockData.currency || (symbol?.endsWith('.NS') ? '₹' : '$');
      const isPositive = change >= 0;
      const sentiment = isPositive ? "positive momentum" : "short-term consolidation";
      const advice = isPositive 
        ? "With its upward trend and strong metrics, it presents solid upside momentum." 
        : "Currently trading near support levels, it offers a potential buy-on-dips opportunity for long-term investors.";

      answer = `${stockName} is currently trading at ${currency}${price} (${isPositive ? '+' : ''}${change.toFixed(2)}% today) with ${sentiment}. ${advice}`;
    } else {
      answer = `Regarding ${stockName}: Evaluate revenue growth, valuation metrics (P/E ratio), and current sector trend before adjusting your portfolio position.`;
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

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'poolside/laguna-xs-2.1:free',
          messages: messages,
          max_tokens: 1500,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return content.toString();
        }
      } else {
        console.warn(`OpenRouter API call failed with status ${response.status}. Falling back to local smart assistant.`);
      }
    }
  } catch (e) {
    console.error('Error calling ask AI, falling back to local assistant:', e);
  }

  return generateSmartFallbackAnswer(symbol, chatHistory, stockData, pageContext, livePageData);
};
