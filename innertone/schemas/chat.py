"""
Chat API Schema (Pydantic Models)
"""
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Unique session/conversation ID", example="user-abc-123")
    message: str = Field(..., description="The user's message", min_length=1, max_length=4000)


class SourceReference(BaseModel):
    book: str
    section: str


class ChatResponse(BaseModel):
    session_id: str
    response: str
    is_crisis: bool
    sources: list[SourceReference] = []
