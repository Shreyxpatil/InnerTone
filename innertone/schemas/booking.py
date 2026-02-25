"""
Booking API Schema (Pydantic Models)
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class AppointmentCreate(BaseModel):
    user_id: str = Field(..., description="User ID booking the appointment")
    therapist_name: str = Field(..., description="Name of the professional or AI service")
    scheduled_at: datetime = Field(..., description="Date and time of the appointment")
    notes: Optional[str] = Field(None, description="Optional notes for the session")


class AppointmentResponse(AppointmentCreate):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
