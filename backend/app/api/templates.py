from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import WorkoutTemplate, WorkoutTemplateItem, User, UserRole
from app.schemas.schemas import WorkoutTemplateCreate, WorkoutTemplateResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/templates", tags=["Workout Templates"])

@router.get("/", response_model=List[WorkoutTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupère les modèles de séances (pré-séances créées par l'utilisateur + programmes prédéfinis).
    """
    stmt = (
        select(WorkoutTemplate)
        .options(
            selectinload(WorkoutTemplate.template_items).selectinload(WorkoutTemplateItem.exercise)
        )
        .where(
            (WorkoutTemplate.created_by_id == current_user.id) |
            (WorkoutTemplate.is_predefined_program == True)
        )
        .order_by(WorkoutTemplate.id.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=WorkoutTemplateResponse)
async def create_template(
    template_in: WorkoutTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Créer une pré-séance (ex: Push, Pull, Legs, ou programme cardio).
    """
    # Seul l'admin peut flagger un template comme is_predefined_program
    is_predefined = template_in.is_predefined_program if current_user.role == UserRole.ADMIN else False

    template = WorkoutTemplate(
        title=template_in.title,
        description=template_in.description,
        is_predefined_program=is_predefined,
        program_category=template_in.program_category,
        created_by_id=current_user.id
    )
    db.add(template)
    await db.flush()

    for item in template_in.items:
        t_item = WorkoutTemplateItem(
            template_id=template.id,
            exercise_id=item.exercise_id,
            order=item.order,
            target_sets=item.target_sets,
            target_reps=item.target_reps,
            target_weight_kg=item.target_weight_kg,
            target_duration_seconds=item.target_duration_seconds,
            rest_seconds=item.rest_seconds
        )
        db.add(t_item)

    await db.commit()
    
    # Reload with details
    stmt = (
        select(WorkoutTemplate)
        .options(
            selectinload(WorkoutTemplate.template_items).selectinload(WorkoutTemplateItem.exercise)
        )
        .where(WorkoutTemplate.id == template.id)
    )
    res = await db.execute(stmt)
    return res.scalars().first()
