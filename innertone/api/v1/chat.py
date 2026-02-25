"""
Chat API Router (v1)
Handles user messages, calls the consultant engine, persists memory, and returns a response.
"""
import asyncio
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from innertone.core.database import get_db
from innertone.schemas.chat import ChatRequest, ChatResponse
from innertone.services.consultant import get_consultant_response
from innertone.services.memory import get_history, save_message
from innertone.services.emotion import detect_emotion
from innertone.models.emotion import EmotionRecord

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/", response_model=ChatResponse, summary="Send a message to InnerTone AI")
async def send_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    """
    Main chat endpoint.

    Flow:
    1. Load conversation history from memory (PostgreSQL)
    2. Pass to consultant engine (Safety → RAG → Gemini)
    3. Save user message + AI response to memory
    4. Return structured response
    """
    # 2. Detect emotion in parallel (non-blocking)
    history, emotion_result = await asyncio.gather(
        get_history(request.session_id, db),
        detect_emotion(request.message),
    )

    # 3. Get response from consultant engine
    result = await get_consultant_response(
        user_message=request.message,
        conversation_history=history,
        db=db,
    )

    # 4. Persist conversation messages
    await save_message(request.session_id, "user", request.message, db, is_crisis=result["is_crisis"])
    await save_message(request.session_id, "model", result["response"], db, is_crisis=result["is_crisis"])

    # 5. Persist emotion record
    db.add(EmotionRecord(
        session_id=request.session_id,
        message_snippet=request.message[:300],
        emotions=emotion_result["emotions"],
        intensity=emotion_result["intensity"],
        detection_method=emotion_result["method"],
    ))
    await db.commit()

    # 6. Return response
    return ChatResponse(
        session_id=request.session_id,
        response=result["response"],
        is_crisis=result["is_crisis"],
        sources=result["sources"],
        emotions=emotion_result["emotions"],
        emotion_intensity=emotion_result["intensity"],
    )
