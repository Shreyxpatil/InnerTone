"""
EmotionRecord ORM Model
Stores the detected emotion for each user message for mood trend tracking.
"""
from sqlalchemy import Column, Integer, String, JSON, ForeignKey, DateTime
from sqlalchemy.sql import func
from innertone.core.database import Base


class EmotionRecord(Base):
    __tablename__ = "emotion_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(128), nullable=False, index=True)
    # The raw user message snippet (first 300 chars for audit)
    message_snippet = Column(String(300), nullable=True)
    # Detected emotions as JSON list e.g. ["anxious", "stressed"]
    emotions = Column(JSON, nullable=False)
    # "low", "medium", "high"
    intensity = Column(String(16), nullable=False, default="medium")
    # "keyword" or "gemini"
    detection_method = Column(String(16), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
