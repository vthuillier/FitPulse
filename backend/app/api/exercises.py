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

# Reserve fallback dataset if API is slow or rate-limited
EXTERNAL_EXERCISE_POOL = [
    {"name": "Développé Incliné Halteres", "category": "Musculation", "muscles": ["chest", "shoulders"], "rest": 90, "desc": "Développé haut des pectoraux aux haltères."},
    {"name": "Dips (Poids de Corps / Lesté)", "category": "Musculation", "muscles": ["triceps", "chest"], "rest": 90, "desc": "Exercice de poussée aux barres parallèles."},
    {"name": "Soulevé de Terre (Deadlift)", "category": "Musculation", "muscles": ["back_lats", "glutes", "hamstrings"], "rest": 120, "desc": "Exercice polyarticulaire complet pour la chaîne postérieure."},
    {"name": "Tirage Horizontal (Seated Row)", "category": "Musculation", "muscles": ["back_lats", "biceps"], "rest": 75, "desc": "Ciblage de l'épaisseur du dos."},
    {"name": "Élévations Latérales Haltères", "category": "Musculation", "muscles": ["shoulders"], "rest": 60, "desc": "Isolation du faisceau moyen du deltoïde."},
    {"name": "Fentes Avant Haltères", "category": "Musculation", "muscles": ["quadriceps", "glutes"], "rest": 75, "desc": "Renforcement unilatéral des cuisses."},
    {"name": "Curl Biceps Barre EZ", "category": "Musculation", "muscles": ["biceps"], "rest": 60, "desc": "Isolation classique des biceps à la barre coudée."},
    {"name": "Extension Triceps Poulie Haute", "category": "Musculation", "muscles": ["triceps"], "rest": 60, "desc": "Isolation de la portion externe et médiane du triceps."},
    {"name": "Leg Extension", "category": "Musculation", "muscles": ["quadriceps"], "rest": 60, "desc": "Isolation des quadriceps à la machine."},
    {"name": "Crunch Abdominal Poulie", "category": "Musculation", "muscles": ["abs"], "rest": 45, "desc": "Renforcement sous tension continue des abdos."}
]

MUSCLE_MAPPING = {
    "chest": "chest",
    "pectoralis major": "chest",
    "biceps": "biceps",
    "biceps brachii": "biceps",
    "triceps": "triceps",
    "triceps brachii": "triceps",
    "shoulders": "shoulders",
    "deltoid": "shoulders",
    "quadriceps": "quadriceps",
    "abs": "abs",
    "abdominals": "abs",
    "back": "back_lats",
    "latissimus dorsi": "back_lats",
    "glutes": "glutes",
    "hamstrings": "hamstrings",
    "calves": "calves"
}

@router.get("/", response_model=List[ExerciseResponse])
async def get_exercises(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtenir la liste globale de tous les exercices"""
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
    limit: int = 15,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Importation garantie d'exercices à partir de l'API externe Wger avec fallback intelligent.
    """
    imported_exercises = []

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get("https://wger.de/api/v2/exerciseinfo/?limit=30")
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])

                for item in results:
                    # Find English or first translation
                    name = None
                    description = ""
                    
                    if "name" in item and item["name"]:
                        name = item["name"]
                    elif "category" in item and isinstance(item.get("category"), dict):
                        name = f"Exercice {item['category'].get('name', 'Fitness')} #{item.get('id')}"

                    if not name:
                        continue

                    # Clean name
                    name = name.strip()

                    # Check existence in DB
                    res_ex = await db.execute(select(Exercise).where(Exercise.name == name))
                    if res_ex.scalars().first():
                        continue

                    raw_desc = item.get("description") or ""
                    description = raw_desc.replace("<p>", "").replace("</p>", "").replace("<br>", "").strip()
                    if not description:
                        description = f"Exercice de renforcement importé depuis Wger API (ID #{item.get('id')})"

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

                    new_ex = Exercise(
                        name=name,
                        description=description[:300],
                        category=category_name,
                        metric_type=ExerciseMetricType.REPS_WEIGHT,
                        default_rest_seconds=60,
                        primary_muscles=muscles_list,
                        secondary_muscles=[],
                        is_custom=True,
                        created_by_id=current_user.id
                    )
                    db.add(new_ex)
                    imported_exercises.append(new_ex)

                    if len(imported_exercises) >= limit:
                        break

    except Exception:
        pass # Fallback pool triggered below if imported_exercises is empty

    # Fallback Guarantee: If external API yielded no new items, use external exercise pool
    if len(imported_exercises) == 0:
        for pool_item in EXTERNAL_EXERCISE_POOL:
            res_ex = await db.execute(select(Exercise).where(Exercise.name == pool_item["name"]))
            if not res_ex.scalars().first():
                new_ex = Exercise(
                    name=pool_item["name"],
                    description=pool_item["desc"],
                    category=pool_item["category"],
                    metric_type=ExerciseMetricType.REPS_WEIGHT,
                    default_rest_seconds=pool_item["rest"],
                    primary_muscles=pool_item["muscles"],
                    secondary_muscles=[],
                    is_custom=True,
                    created_by_id=current_user.id
                )
                db.add(new_ex)
                imported_exercises.append(new_ex)
                if len(imported_exercises) >= 5:
                    break

    await db.commit()
    for ex in imported_exercises:
        await db.refresh(ex)

    return imported_exercises
