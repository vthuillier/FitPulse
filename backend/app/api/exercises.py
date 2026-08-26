from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.models import Exercise, ExerciseMetricType, User
from app.schemas.schemas import ExerciseCreate, ExerciseResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/exercises", tags=["Exercises"])

# Mapping wger category / muscle names to our system's muscle keys
MUSCLE_MAPPING = {
    "chest": "chest",
    "pectoralis major": "chest",
    "biceps": "biceps",
    "biceps brachii": "biceps",
    "triceps": "triceps",
    "triceps brachii": "triceps",
    "shoulders": "shoulders",
    "deltoid": "shoulders",
    "anterior deltoid": "shoulders",
    "quadriceps": "quadriceps",
    "rectus femoris": "quadriceps",
    "abs": "abs",
    "rectus abdominis": "abs",
    "abdominals": "abs",
    "back": "back_lats",
    "latissimus dorsi": "back_lats",
    "trapezius": "back_lats",
    "glutes": "glutes",
    "gluteus maximus": "glutes",
    "hamstrings": "hamstrings",
    "biceps femoris": "hamstrings",
    "calves": "calves",
    "gastrocnemius": "calves"
}

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

@router.post("/import-wger", response_model=List[ExerciseResponse])
async def import_exercises_from_wger_api(
    category_filter: Optional[str] = None,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupération et importation d'exercices réels à partir de l'API gratuite et open-source Wger REST API (https://wger.de/api/v2/).
    Enregistre les nouveaux exercices ramenés de l'API externe directement dans la base de données de l'application.
    """
    imported_exercises = []
    wger_url = "https://wger.de/api/v2/exercise/?language=2&limit=20" # Language 2 = French or English fallback

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(wger_url)
            if resp.status_code != 200:
                # Fallback to English (language 2 or no language filter)
                resp = await client.get("https://wger.de/api/v2/exerciseinfo/?limit=20")
            
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])

                for item in results[:limit]:
                    name = item.get("name") or (item.get("exercises", [{}])[0].get("name") if "exercises" in item else None)
                    if not name:
                        continue

                    # Check if exercise already exists
                    res_ex = await db.execute(select(Exercise).where(Exercise.name == name))
                    if res_ex.scalars().first():
                        continue

                    # Clean description text
                    description = item.get("description", "").replace("<p>", "").replace("</p>", "").strip()
                    if not description:
                        description = "Exercice importé via l'API wger.de"

                    # Detect target muscles
                    muscles_list = []
                    for m in item.get("muscles", []):
                        m_name = m.get("name_en", "").lower() or m.get("name", "").lower()
                        mapped = MUSCLE_MAPPING.get(m_name, "chest")
                        if mapped not in muscles_list:
                            muscles_list.append(mapped)

                    if not muscles_list:
                        muscles_list = ["chest"]

                    category_name = "Musculation"
                    if "category" in item and isinstance(item["category"], dict):
                        category_name = item["category"].get("name", "Musculation")

                    new_exercise = Exercise(
                        name=name,
                        description=description[:500],
                        category=category_name,
                        metric_type=ExerciseMetricType.REPS_WEIGHT,
                        default_rest_seconds=60,
                        primary_muscles=muscles_list,
                        secondary_muscles=[],
                        is_custom=True,
                        created_by_id=current_user.id
                    )
                    db.add(new_exercise)
                    imported_exercises.append(new_exercise)

                await db.commit()
                for ex in imported_exercises:
                    await db.refresh(ex)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur lors de l'appel à l'API externe Wger: {str(e)}"
        )

    return imported_exercises
