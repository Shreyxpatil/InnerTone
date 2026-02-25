"""
Booking API Router (v1)
Handles scheduling, retrieving, and canceling wellness appointments.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from innertone.core.database import get_db
from innertone.schemas.booking import AppointmentCreate, AppointmentResponse
from innertone.models.booking import Appointment

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post("/", response_model=AppointmentResponse, status_code=201, summary="Schedule a new appointment")
async def create_appointment(
    booking: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new appointment booking in the database.
    """
    new_appt = Appointment(
        user_id=booking.user_id,
        therapist_name=booking.therapist_name,
        scheduled_at=booking.scheduled_at,
        notes=booking.notes,
        status="scheduled"
    )
    db.add(new_appt)
    await db.commit()
    await db.refresh(new_appt)
    return new_appt


@router.get("/{user_id}", response_model=list[AppointmentResponse], summary="Get appointments for a user")
async def get_user_appointments(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves all appointments for a specific user ID.
    """
    result = await db.execute(
        select(Appointment).where(Appointment.user_id == user_id).order_by(Appointment.scheduled_at.asc())
    )
    return result.scalars().all()


@router.delete("/{appointment_id}", status_code=204, summary="Cancel an appointment")
async def cancel_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Marks an appointment as cancelled.
    """
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    appt.status = "cancelled"
    await db.commit()
    return None
