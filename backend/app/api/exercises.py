from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.models import Exercise, User
from app.schemas.schemas import ExerciseCreate, ExerciseResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/exercises", tags=["Exercises"])

@router.get("/", response_model=List[ExerciseResponse])
async def get_exercises(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtenir la liste globale de tous les exercices (pré-configurés + customisés)"""
    result = await db.execute(select(Exercise).order_by(Exercise.name))
    return result.scalars().all()

@router.post("/", response_model=ExerciseResponse)
async def create_exercise(
    exercise_in: ExerciseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ajouter un nouvel exercice personnalisé à la BDD"""
    result = await db.execute(select(Exercise).where(Exercise.name == exercise_in.name))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un exercice avec ce nom existe déjà."
        )

    exercise = Exercise(
        name=exercise_in.name,
        description=exercise_in.description,
        category=exercise_in.category,
        metric_type=exercise_in.metric_type,
        default_rest_seconds=exercise_in.default_rest_seconds,
        primary_muscles=exercise_in.primary_muscles,
        secondary_muscles=exercise_in.secondary_muscles,
        is_custom=True,
        created_by_id=current_user.id
    )
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return exercise
