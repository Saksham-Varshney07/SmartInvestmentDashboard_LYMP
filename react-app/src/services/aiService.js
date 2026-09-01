export const askAiChat = async (symbol, chatHistory, stockData, pageContext = "", livePageData = "") => {
  try {
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
        'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY || 'YOUR_API_KEY'}`,
      },
      body: JSON.stringify({
        model: 'poolside/laguna-xs-2.1',
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
      return 'API Error: The AI model ran out of tokens while thinking. Please try again.';
    } else {
      const text = await response.text();
      return `Server returned error: ${response.status} - ${text}`;
    }
  } catch (e) {
    console.error('Error calling ask AI:', e);
    return `Error: ${e.message}`;
  }
};
