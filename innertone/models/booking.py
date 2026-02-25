"""
Appointment Booking ORM Model
"""
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from innertone.core.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(128), nullable=False, index=True)
    therapist_name = Column(String(128), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String(32), default="scheduled", nullable=False)  # scheduled, completed, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
