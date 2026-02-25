"""
Safety Detection Service
This is the FIRST thing called on every user message.
If a crisis signal is detected, the normal LLM response is bypassed
and an emergency helpline message is returned instead.
"""
import re

# Keywords and patterns indicating a crisis
CRISIS_PATTERNS = [
    r"suicid(e|al|ally)?",
    r"sucid(e|al)?",
    r"\bkill myself\b",
    r"\bend (my|this) life\b",
    r"\bwant to die\b",
    r"\bnot worth living\b",
    r"\bself[- ]harm\b",
    r"\bcut(ting)? myself\b",
    r"\bhurt(ing)? myself\b",
    r"\bno reason to live\b",
    r"\bdon'?t want to be here\b",
]

_compiled_patterns = [re.compile(p, re.IGNORECASE) for p in CRISIS_PATTERNS]

EMERGENCY_RESPONSE = """
🚨 **I'm very concerned about what you've shared.**

You're not alone, and help is available right now.

**Please reach out to a crisis helpline immediately:**

🇮🇳 **India:**
- iCall: **9152987821** (Mon–Sat, 8am–10pm)
- Vandrevala Foundation: **1860-2662-345** (24/7)
- AASRA: **9820466627** (24/7)

🌍 **International:**
- International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/
- Crisis Text Line: Text **HELLO** to **741741** (USA)

---

Your life matters. Please talk to someone who can help you right now. 💙
""".strip()

def check_for_crisis(user_message: str) -> dict:
    """
    Checks user message for crisis signals.
    
    Returns:
        {
            "is_crisis": bool,
            "response": str | None   # Emergency message if crisis detected
        }
    """
    for pattern in _compiled_patterns:
        if pattern.search(user_message):
            return {
                "is_crisis": True,
                "response": EMERGENCY_RESPONSE,
            }
    return {"is_crisis": False, "response": None}
