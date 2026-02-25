"""
LLM Consultant Engine
Orchestrates the full CBT-style response cycle:
  1. Safety check (always first)
  2. RAG retrieval from FAISS
  3. Build prompt with context
  4. Call Gemini via google-genai SDK
"""
from google import genai
from google.genai import types
from innertone.core.config import get_settings
from innertone.rag.retrieve import retrieve_relevant_chunks
from innertone.services.safety import check_for_crisis
from sqlalchemy.ext.asyncio import AsyncSession

settings = get_settings()

# CBT-guided system instruction
CBT_SYSTEM_PROMPT = """
You are InnerTone, a compassionate AI mental wellness consultant trained in 
Cognitive Behavioral Therapy (CBT) principles.

## YOUR CORE RULES:
1. You are NOT a doctor. Never provide a medical diagnosis or suggest medications.
2. Ask only ONE follow-up question per response.
3. Be empathetic but grounded in logic. Avoid toxic positivity.
4. If the user seems in crisis, acknowledge their pain but direct them to professional help.
5. Draw insights from the provided psychology book excerpts to inform your response.

## YOUR RESPONSE MUST ALWAYS FOLLOW THIS EXACT STRUCTURE:
**1. Acknowledge** — Validate the user's emotion in 1-2 sentences.
**2. Reflect** — Offer a calm, logical reframe of their situation (CBT style).  
**3. Suggest** — Give one small, concrete, actionable coping step.
**4. Ask** — End with exactly ONE open-ended follow-up question.

Keep responses warm, concise, and under 250 words.
""".strip()


def _format_rag_context(chunks: list[dict]) -> str:
    """Formats retrieved book chunks into a readable context block."""
    if not chunks:
        return ""
    lines = ["## Relevant knowledge from psychology books:\n"]
    for i, chunk in enumerate(chunks, 1):
        lines.append(f"[Source {i}: {chunk['book_name']} — {chunk['section']}]")
        lines.append(chunk["content"][:500])
        lines.append("")
    return "\n".join(lines)


async def get_consultant_response(
    user_message: str,
    conversation_history: list[dict],
    db: AsyncSession,
) -> dict:
    """
    Main entry point for the consultant engine.
    Returns: {"response": str, "is_crisis": bool, "sources": list}
    """
    # --- Step 1: Safety Check (always first) ---
    safety_result = check_for_crisis(user_message)
    if safety_result["is_crisis"]:
        return {
            "response": safety_result["response"],
            "is_crisis": True,
            "sources": [],
        }

    # --- Step 2: RAG Retrieval ---
    relevant_chunks = []
    try:
        relevant_chunks = await retrieve_relevant_chunks(user_message, db, top_k=4)
    except FileNotFoundError:
        pass  # No FAISS index yet — respond without book context

    rag_context = _format_rag_context(relevant_chunks)

    # --- Step 3: Build the full user message with RAG context injected ---
    full_user_message = user_message
    if rag_context:
        full_user_message = f"{rag_context}\n\n---\n\n**User:** {user_message}"

    # --- Step 4: Call Gemini using google-genai SDK ---
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    # Build history in google-genai Content format
    contents = []
    for turn in conversation_history:
        role = turn["role"]
        text = turn["parts"][0]["text"]
        contents.append(types.Content(role=role, parts=[types.Part(text=text)]))

    # Append the current user message
    contents.append(types.Content(role="user", parts=[types.Part(text=full_user_message)]))

    fallback_models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.0-flash-lite"]
    response_text = None
    last_error = None

    for model_name in fallback_models:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=CBT_SYSTEM_PROMPT,
                    temperature=0.7,
                    max_output_tokens=600,
                    safety_settings=[
                        types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
                        types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
                    ]
                ),
            )
            response_text = response.text
            break
        except Exception as e:
            last_error = e
            continue

    if not response_text:
        raise last_error

    # --- Step 5: Return structured result ---
    sources = [
        {"book": c["book_name"], "section": c["section"]}
        for c in relevant_chunks
    ]

    return {
        "response": response_text,
        "is_crisis": False,
        "sources": sources,
    }
