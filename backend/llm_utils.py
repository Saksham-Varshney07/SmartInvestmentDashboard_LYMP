import os
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY", "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"),
)

def ask_ai_about_stock(symbol: str, question: str) -> str:
    try:
        completion = client.chat.completions.create(
            model="poolside/laguna-xs-2.1",
            messages=[
                {"role": "system", "content": "You are a financial advisor assistant in the Smart Investment app. Answer questions concisely and professionally."},
                {"role": "user", "content": f"The user is asking about the stock {symbol}. Here is their question:\n{question}"}
            ],
            max_tokens=300
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"Error querying OpenRouter LLM: {e}")
        return "Sorry, I am currently unable to analyze this stock. Please try again later."
