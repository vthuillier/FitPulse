from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.models import BodyMeasurement, User
from app.schemas.schemas import BodyMeasurementCreate, BodyMeasurementResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/measurements", tags=["Body Measurements"])

@router.get("/", response_model=List[BodyMeasurementResponse])
async def list_user_measurements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Liste de toutes les prises de mensurations de l'utilisateur"""
    stmt = (
        select(BodyMeasurement)
        .where(BodyMeasurement.user_id == current_user.id)
        .order_by(BodyMeasurement.recorded_at.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/", response_model=BodyMeasurementResponse)
async def create_measurement(
    measurement_in: BodyMeasurementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enregistrer une nouvelle prise de mensuration (poids, tour de pecs, tour de ventre, etc.)"""
    meas = BodyMeasurement(
        user_id=current_user.id,
        weight_kg=measurement_in.weight_kg,
        chest_cm=measurement_in.chest_cm,
        waist_cm=measurement_in.waist_cm,
        biceps_cm=measurement_in.biceps_cm,
        thighs_cm=measurement_in.thighs_cm,
        hips_cm=measurement_in.hips_cm,
        notes=measurement_in.notes
    )
    db.add(meas)
    await db.commit()
    await db.refresh(meas)
    return meas
