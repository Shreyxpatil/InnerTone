"""
Emotion Detection Service

Classifies the user's emotional state from their message using a
multi-label approach. Uses a lightweight rule-based + Gemini hybrid:
  - Fast regex/keyword pass for obvious emotions
  - Gemini for nuanced/ambiguous cases (async, non-blocking)

Detected emotions feed into:
  1. The consultant engine (for more empathetic contextual responses)
  2. The memory system (for longitudinal mood tracking)
  3. The safety module (as a secondary signal for distress level)
"""
import re
from enum import Enum
from google import genai
from google.genai import types
from innertone.core.config import get_settings

settings = get_settings()

class Emotion(str, Enum):
    ANXIOUS   = "anxious"
    DEPRESSED = "depressed"
    ANGRY     = "angry"
    STRESSED  = "stressed"
    LONELY    = "lonely"
    HOPEFUL   = "hopeful"
    NEUTRAL   = "neutral"
    SAD       = "sad"
    HAPPY     = "happy"
    OVERWHELMED = "overwhelmed"

# Fast keyword map for quick local detection (avoids API call for obvious cases)
_KEYWORD_MAP: dict[Emotion, list[str]] = {
    Emotion.ANXIOUS:     ["anxious", "anxiety", "nervous", "worried", "panic", "panicking", "scared", "fear", "dreading"],
    Emotion.DEPRESSED:   ["depressed", "depression", "hopeless", "worthless", "empty", "numb", "meaningless"],
    Emotion.ANGRY:       ["angry", "anger", "furious", "rage", "frustrated", "irritated", "annoyed"],
    Emotion.STRESSED:    ["stressed", "stress", "pressure", "burnt out", "burnout", "exhausted", "overwhelmed"],
    Emotion.LONELY:      ["lonely", "alone", "isolated", "no one", "nobody cares", "disconnected"],
    Emotion.HOPEFUL:     ["hopeful", "optimistic", "excited", "looking forward", "better", "improving"],
    Emotion.SAD:         ["sad", "unhappy", "crying", "cry", "tears", "grief", "loss", "heartbroken"],
    Emotion.HAPPY:       ["happy", "great", "wonderful", "joy", "joyful", "fantastic", "amazing", "proud"],
    Emotion.OVERWHELMED: ["overwhelmed", "too much", "can't cope", "falling apart", "breaking down"],
}

def _keyword_detect(text: str) -> list[str]:
    """Fast local emotion detection using keyword matching."""
    text_lower = text.lower()
    detected = []
    for emotion, keywords in _KEYWORD_MAP.items():
        for kw in keywords:
            if kw in text_lower:
                detected.append(emotion.value)
                break
    return detected if detected else [Emotion.NEUTRAL.value]


_GEMINI_CLASSIFICATION_PROMPT = """
You are an emotion detection classifier for a mental wellness application.

Analyze the following user message and return ONLY a JSON object with this exact format:
{
  "emotions": ["<emotion1>", "<emotion2>"],
  "intensity": "<low|medium|high>",
  "short_reason": "<one sentence>"
}

Valid emotions: anxious, depressed, angry, stressed, lonely, hopeful, neutral, sad, happy, overwhelmed
Pick 1-3 emotions that best describe the message. Always include intensity.
Return only valid JSON, no extra text.

User message: "{message}"
""".strip()


async def detect_emotion(user_message: str) -> dict:
    """
    Detects emotions in the user message.

    Returns:
    {
        "emotions": ["anxious", "stressed"],
        "intensity": "medium",
        "method": "gemini" | "keyword"
    }
    """
    # Try fast keyword detection first
    keyword_emotions = _keyword_detect(user_message)

    # Only call Gemini if API key is set and the message is non-trivial
    if settings.GEMINI_API_KEY and len(user_message.split()) > 3:
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            prompt = _GEMINI_CLASSIFICATION_PROMPT.format(message=user_message[:500])
            
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
                config=types.GenerateContentConfig(
                    temperature=0.1,  # Low temperature for consistent classification
                    max_output_tokens=100,
                )
            )
            
            import json
            # Strip markdown code fences if present
            raw = response.text.strip().strip("```json").strip("```").strip()
            result = json.loads(raw)
            
            return {
                "emotions": result.get("emotions", keyword_emotions),
                "intensity": result.get("intensity", "medium"),
                "method": "gemini",
            }
        except Exception:
            # Fallback to keyword detection on any error
            pass

    return {
        "emotions": keyword_emotions,
        "intensity": "medium",
        "method": "keyword",
    }
