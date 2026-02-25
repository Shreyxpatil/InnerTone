"""
Memory Service
Stores and retrieves conversation history from PostgreSQL.
Each session maintains a sliding window of messages for context.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from innertone.models.memory import ConversationMessage
import json

# How many recent messages to keep as active context
MEMORY_WINDOW = 20


async def get_history(session_id: str, db: AsyncSession) -> list[dict]:
    """Retrieves recent conversation history for a session in Gemini format."""
    result = await db.execute(
        select(ConversationMessage)
        .where(ConversationMessage.session_id == session_id)
        .order_by(ConversationMessage.created_at.asc())
        .limit(MEMORY_WINDOW)
    )
    records = result.scalars().all()
    
    return [
        {"role": r.role, "parts": [{"text": r.content}]}
        for r in records
    ]


async def save_message(
    session_id: str,
    role: str,
    content: str,
    db: AsyncSession,
    is_crisis: bool = False,
) -> None:
    """Saves a message to the conversation history."""
    msg = ConversationMessage(
        session_id=session_id,
        role=role,
        content=content,
        is_crisis=is_crisis,
    )
    db.add(msg)
    await db.commit()
