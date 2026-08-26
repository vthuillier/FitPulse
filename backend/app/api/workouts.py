from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import (
    WorkoutSession, WorkoutSessionExercise, WorkoutSetDetail, 
    WorkoutTemplate, WorkoutTemplateItem, User
)
from app.schemas.schemas import WorkoutSessionCreate, WorkoutSessionResponse, WeeklySummaryResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/workouts", tags=["Workouts / Live Sessions"])

@router.get("/", response_model=List[WorkoutSessionResponse])
async def list_user_workouts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Historique des séances terminées par l'utilisateur"""
    stmt = (
        select(WorkoutSession)
        .options(
            selectinload(WorkoutSession.exercises_done)
            .selectinload(WorkoutSessionExercise.exercise),
            selectinload(WorkoutSession.exercises_done)
            .selectinload(WorkoutSessionExercise.sets)
        )
        .where(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.start_time.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/community", response_model=List[WorkoutSessionResponse])
async def list_community_workouts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Partage des progressions : Voir les séances accomplies par les autres utilisateurs autorisés"""
    stmt = (
        select(WorkoutSession)
        .options(
            selectinload(WorkoutSession.exercises_done)
            .selectinload(WorkoutSessionExercise.exercise),
            selectinload(WorkoutSession.exercises_done)
            .selectinload(WorkoutSessionExercise.sets)
        )
        .order_by(WorkoutSession.start_time.desc())
        .limit(30)
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/last-by-template/{template_id}", response_model=Optional[WorkoutSessionResponse])
async def get_last_workout_by_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupère la séance la plus récente faite à partir de ce template pour comparer en direct les charges/reps.
    """
    stmt = (
        select(WorkoutSession)
        .options(
            selectinload(WorkoutSession.exercises_done)
            .selectinload(WorkoutSessionExercise.exercise),
            selectinload(WorkoutSession.exercises_done)
            .selectinload(WorkoutSessionExercise.sets)
        )
        .where(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.template_id == template_id
        )
        .order_by(WorkoutSession.start_time.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    return res.scalars().first()

@router.post("/", response_model=WorkoutSessionResponse)
async def record_workout_session(
    workout_in: WorkoutSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sauvegarder une séance terminée (qu'elle soit issue d'une pré-séance ou faite 'à la volée').
    """
    session = WorkoutSession(
        user_id=current_user.id,
        template_id=workout_in.template_id,
        title=workout_in.title,
        notes=workout_in.notes,
        body_weight_kg=workout_in.body_weight_kg,
        meals_logged=workout_in.meals_logged,
        start_time=datetime.utcnow(),
        end_time=datetime.utcnow()
    )
    db.add(session)
    await db.flush()

    for ex_in in workout_in.exercises:
        sess_ex = WorkoutSessionExercise(
            session_id=session.id,
            exercise_id=ex_in.exercise_id,
            order=ex_in.order
        )
        db.add(sess_ex)
        await db.flush()

        for s_in in ex_in.sets:
            st_detail = WorkoutSetDetail(
                session_exercise_id=sess_ex.id,
                set_number=s_in.set_number,
                reps_completed=s_in.reps_completed,
                weight_kg=s_in.weight_kg,
                duration_seconds=s_in.duration_seconds,
                distance_km=s_in.distance_km,
                calories_burned=s_in.calories_burned,
                rest_seconds=s_in.rest_seconds,
                completed=s_in.completed
            )
            db.add(st_detail)

    await db.commit()

    # Query full response object
    stmt = (
        select(WorkoutSession)
        .options(
            selectinload(WorkoutSession.exercises_done)
            .selectinload(WorkoutSessionExercise.exercise),
            selectinload(WorkoutSession.exercises_done)
            .selectinload(WorkoutSessionExercise.sets)
        )
        .where(WorkoutSession.id == session.id)
    )
    res = await db.execute(stmt)
    return res.scalars().first()

@router.get("/weekly-summary", response_model=WeeklySummaryResponse)
async def get_weekly_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Organiseur & Planning Hebdomadaire :
    Affiche les séances déjà faites cette semaine + séances suggérées disponibles.
    """
    today = datetime.utcnow()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

    # Workouts completed this week
    stmt_done = (
        select(WorkoutSession)
        .options(
            selectinload(WorkoutSession.exercises_done)
            .selectinload(WorkoutSessionExercise.exercise),
            selectinload(WorkoutSession.exercises_done)
            .selectinload(WorkoutSessionExercise.sets)
        )
        .where(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.start_time >= start_of_week
        )
        .order_by(WorkoutSession.start_time.desc())
    )
    res_done = await db.execute(stmt_done)
    completed_sessions = res_done.scalars().all()

    # Suggested templates
    stmt_tpl = (
        select(WorkoutTemplate)
        .options(
            selectinload(WorkoutTemplate.template_items).selectinload(WorkoutTemplateItem.exercise)
        )
        .where(
            (WorkoutTemplate.created_by_id == current_user.id) |
            (WorkoutTemplate.is_predefined_program == True)
        )
    )
    res_tpl = await db.execute(stmt_tpl)
    suggested_templates = res_tpl.scalars().all()

    return {
        "total_workouts": len(completed_sessions),
        "completed_sessions": completed_sessions,
        "suggested_templates": suggested_templates
    }
