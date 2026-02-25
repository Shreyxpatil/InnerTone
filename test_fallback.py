import os
import asyncio
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(".env", override=True)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

model = "gemini-2.5-flash"
print(f"Testing {model} with BLOCK_NONE safety...")
try:
    response = client.models.generate_content(
        model=model,
        contents="i feel sad",
        config=types.GenerateContentConfig(
            safety_settings=[
                types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
                types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
                types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
                types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
            ]
        )
    )
    print("SUCCESS:", response.text[:50])
except Exception as e:
    print("EXCEPTION:", repr(e))

