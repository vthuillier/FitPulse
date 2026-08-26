from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import delete, update

from app.core.database import get_db
from app.models.models import WorkoutTemplate, WorkoutTemplateItem, WorkoutSession, User, UserRole
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

@router.put("/{template_id}", response_model=WorkoutTemplateResponse)
async def update_template(
    template_id: int,
    template_in: WorkoutTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Modifier une pré-séance existante (titre, description, items). Seul le créateur peut la modifier.
    """
    template = await db.get(WorkoutTemplate, template_id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pré-séance introuvable.")
    if template.created_by_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez modifier que vos propres pré-séances.")

    template.title = template_in.title
    template.description = template_in.description
    if current_user.role == UserRole.ADMIN:
        template.is_predefined_program = template_in.is_predefined_program
    template.program_category = template_in.program_category

    await db.execute(delete(WorkoutTemplateItem).where(WorkoutTemplateItem.template_id == template_id))

    for item in template_in.items:
        t_item = WorkoutTemplateItem(
            template_id=template_id,
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

    stmt = (
        select(WorkoutTemplate)
        .options(
            selectinload(WorkoutTemplate.template_items).selectinload(WorkoutTemplateItem.exercise)
        )
        .where(WorkoutTemplate.id == template_id)
    )
    res = await db.execute(stmt)
    return res.scalars().first()

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Supprimer une pré-séance. Seul le créateur peut la supprimer. L'historique des séances déjà
    effectuées à partir de ce modèle est conservé (juste détaché du modèle).
    """
    template = await db.get(WorkoutTemplate, template_id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pré-séance introuvable.")
    if template.created_by_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez supprimer que vos propres pré-séances.")

    await db.execute(update(WorkoutSession).where(WorkoutSession.template_id == template_id).values(template_id=None))
    await db.execute(delete(WorkoutTemplateItem).where(WorkoutTemplateItem.template_id == template_id))
    await db.delete(template)
    await db.commit()
