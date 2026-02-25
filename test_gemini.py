import os
import asyncio
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(".env", override=True)
api_key = os.getenv("GEMINI_API_KEY")
print(f"Loaded API Key starting with: {api_key[:10]}...")

client = genai.Client(api_key=api_key)
fallback_models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-pro-exp-0205", "gemini-1.5-pro"]

for model in fallback_models:
    try:
        print(f"\nTesting {model}...")
        response = client.models.generate_content(
            model=model,
            contents="hello",
        )
        print(f"SUCCESS with {model}: {response.text}")
        break
    except Exception as e:
        print(f"FAILED with {model}. Error: {type(e).__name__} - {str(e)}")

