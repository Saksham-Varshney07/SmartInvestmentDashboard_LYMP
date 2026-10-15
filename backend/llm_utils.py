import os
from openai import OpenAI

env_file = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_file):
    with open(env_file, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY", ""),
)

def ask_ai_about_stock(symbol: str, question: str) -> str:
    try:
        completion = client.chat.completions.create(
            model="poolside/laguna-xs-2.1:free",
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
