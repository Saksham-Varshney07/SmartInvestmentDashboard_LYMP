export const askAiChat = async (symbol, chatHistory, stockData) => {
  try {
    let stockContext = "";
    if (stockData) {
      const price = stockData.latest_price || 0;
      const change = stockData.returns || 0;
      const currency = stockData.currency || (symbol.endsWith('.NS') ? '₹' : '$');
      const high = stockData.day_high || (price * 1.01);
      const low = stockData.day_low || (price * 0.99);
      stockContext = `CURRENT REAL-TIME DATA FOR ${symbol}: Price is ${currency}${price}, Daily Change is ${change.toFixed(2)}%, Day High ${currency}${high.toFixed(2)}, Day Low ${currency}${low.toFixed(2)}. Use this exact real-time data to answer the user and give your clear opinion. `;
    }

    const messages = [
      {
        role: 'system',
        content: `You are a friendly stock advisor in a web app. The user is asking about the stock ${symbol}. ${stockContext}Rules you MUST follow:\n1. Use very simple, easy-to-understand language that anyone can understand. No jargon.\n2. Give direct, straightforward answers. If a stock looks good to buy, say "Yes, this looks like a good time to invest." If not, say "No, it might be better to wait."\n3. Be confident and clear. Do not hedge or give wishy-washy answers. Give your honest opinion based on the stock performance.\n4. Keep answers short - max 3-4 sentences.\n5. ALWAYS end every single response with exactly this line on a new line: "⚠️ Invest at your own risk."`
      },
      ...chatHistory
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY_HERE',
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
