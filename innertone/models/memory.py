"""
ConversationMessage ORM Model
Stores every message in a user conversation for memory retrieval.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from innertone.core.database import Base


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)
    # Session ID groups messages into one conversation
    session_id = Column(String(128), nullable=False, index=True)
    # "user" or "model"
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    # Flag for crisis detection — marks the session as high-risk
    is_crisis = Column(Boolean, default=False, nullable=False)
    # Auto-populated timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
