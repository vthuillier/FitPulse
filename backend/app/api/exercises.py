from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.models import Exercise, ExerciseMetricType, User, UserRole, WorkoutTemplateItem, WorkoutSessionExercise
from app.schemas.schemas import ExerciseCreate, ExerciseResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/exercises", tags=["Exercises"])

import httpx

# Map Wger muscle IDs (https://wger.de/api/v2/muscle/) to our anatomical
# visualizer keys. Serratus anterior (3) and Brachialis (13) have no
# dedicated shape in BodyVisualizer, folded into the nearest visible region.
WGER_MUSCLE_MAP = {
    1: "biceps",      # Biceps brachii
    2: "shoulders",   # Anterior deltoid
    3: "chest",       # Serratus anterior (no dedicated shape)
    4: "chest",       # Pectoralis major
    5: "triceps",     # Triceps brachii
    6: "abs",         # Rectus abdominis
    7: "calves",      # Gastrocnemius
    8: "glutes",      # Gluteus maximus
    9: "trapezius",   # Trapezius
    10: "quadriceps", # Quadriceps femoris
    11: "hamstrings", # Biceps femoris
    12: "back_lats",  # Latissimus dorsi
    13: "biceps",     # Brachialis (no dedicated shape)
    14: "obliques",   # Obliquus externus abdominis
    15: "calves",     # Soleus
}

def map_wger_muscles(muscles_list):
    mapped = set()
    for m in muscles_list:
        m_id = m.get("id") if isinstance(m, dict) else m
        m_name = (m.get("name") if isinstance(m, dict) else str(m)).lower()
        
        if m_id in WGER_MUSCLE_MAP:
            mapped.add(WGER_MUSCLE_MAP[m_id])
        elif "biceps" in m_name:
            mapped.add("biceps")
        elif "triceps" in m_name:
            mapped.add("triceps")
        elif "chest" in m_name or "pectoral" in m_name:
            mapped.add("chest")
        elif "back" in m_name or "latissimus" in m_name or "trapezius" in m_name:
            mapped.add("back_lats")
        elif "shoulder" in m_name or "deltoid" in m_name:
            mapped.add("shoulders")
        elif "quadriceps" in m_name or "thigh" in m_name:
            mapped.add("quadriceps")
        elif "glute" in m_name:
            mapped.add("glutes")
        elif "hamstring" in m_name:
            mapped.add("hamstrings")
        elif "abs" in m_name or "abdominis" in m_name:
            mapped.add("abs")
        elif "calf" in m_name or "calves" in m_name or "gastrocnemius" in m_name:
            mapped.add("calves")
    
    return list(mapped) if mapped else ["chest"]

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

    metric_type = ExerciseMetricType.CARDIO if exercise_in.category == "Cardio" else exercise_in.metric_type

    exercise = Exercise(
        name=exercise_in.name,
        description=exercise_in.description,
        category=exercise_in.category,
        metric_type=metric_type,
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

@router.post("/enrich-catalog", response_model=List[ExerciseResponse])
async def enrich_exercises_catalog(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Interroge dynamiquement l'API Wger publique pour importer en masse les exercices.
    Loggue chaque étape pour le débogage.
    """
    print("🚀 [ENRICH CATALOG] Début de l'enrichissement via API externe Wger...", flush=True)
    added_exercises = []
    
    headers = {
        "User-Agent": "FitPulsePro/2.0 (Sports Performance Tracker; +http://localhost)",
        "Accept": "application/json"
    }

    base_url = "https://wger.de/api/v2/exerciseinfo/?limit=50"

    async with httpx.AsyncClient(timeout=20.0, headers=headers, follow_redirects=True) as client:
        current_page_url = base_url
        pages_processed = 0
        max_pages = 5

        while current_page_url and pages_processed < max_pages:
            try:
                print(f"📡 [ENRICH CATALOG] Interrogation de: {current_page_url}", flush=True)
                response = await client.get(current_page_url)
                print(f"📩 [ENRICH CATALOG] Status Code: {response.status_code}", flush=True)
                
                if response.status_code != 200:
                    print(f"❌ [ENRICH CATALOG] Échec de la requête: {response.text[:200]}", flush=True)
                    break

                data = response.json()
                results = data.get("results", [])
                print(f"📦 [ENRICH CATALOG] Page {pages_processed + 1}: {len(results)} éléments bruts reçus", flush=True)

                if not results:
                    break

                # Batch-check which names already exist in one query instead
                # of one SELECT per item (avoids N+1 across up to 50 items/page).
                page_names = []
                for item in results:
                    translations = item.get("translations", [])
                    name = None
                    if isinstance(translations, list) and translations:
                        for t in translations:
                            if isinstance(t, dict) and t.get("name") and t.get("language") in [12, 2]:
                                name = t.get("name")
                                break
                        if not name and isinstance(translations[0], dict):
                            name = translations[0].get("name")
                    if not name and isinstance(item.get("name"), str):
                        name = item.get("name")
                    if name and isinstance(name, str) and len(name.strip()) >= 2:
                        page_names.append(name.strip())

                existing_names = set()
                if page_names:
                    res_existing = await db.execute(select(Exercise.name).where(Exercise.name.in_(page_names)))
                    existing_names = {n for (n,) in res_existing.all()}

                for item in results:
                    name = None
                    desc = ""

                    # Extract name & description from translations (Language preference: FR=12, EN=2, DE=1)
                    translations = item.get("translations", [])
                    if isinstance(translations, list) and translations:
                        for t in translations:
                            if isinstance(t, dict) and t.get("name"):
                                # If we find French or English preferred
                                if t.get("language") in [12, 2]:
                                    name = t.get("name")
                                    desc = t.get("description", "") or ""
                                    break
                        if not name and isinstance(translations[0], dict):
                            name = translations[0].get("name")
                            desc = translations[0].get("description", "") or ""
                    
                    if not name and isinstance(item.get("name"), str):
                        name = item.get("name")

                    if not name or not isinstance(name, str) or len(name.strip()) < 2:
                        continue

                    name = name.strip()

                    # Clean HTML description tags
                    import re
                    clean_desc = re.sub('<[^<]+?>', '', desc).strip()
                    if not clean_desc:
                        clean_desc = f"Exercice {name} importé via Wger API."

                    # Category mapping
                    cat_info = item.get("category", {})
                    cat_name = cat_info.get("name", "Musculation") if isinstance(cat_info, dict) else "Musculation"

                    # Muscle mapping
                    muscles_prim = map_wger_muscles(item.get("muscles", []))
                    muscles_sec = map_wger_muscles(item.get("muscles_secondary", []))

                    if name not in existing_names:
                        new_ex = Exercise(
                            name=name,
                            description=clean_desc[:255],
                            category=cat_name,
                            metric_type=ExerciseMetricType.CARDIO if cat_name == "Cardio" else ExerciseMetricType.REPS_WEIGHT,
                            default_rest_seconds=60,
                            primary_muscles=muscles_prim,
                            secondary_muscles=muscles_sec,
                            is_custom=False,
                            created_by_id=current_user.id
                        )
                        db.add(new_ex)
                        added_exercises.append(new_ex)
                        existing_names.add(name)

                current_page_url = data.get("next")
                pages_processed += 1

            except Exception as e:
                print(f"❌ [ENRICH CATALOG] Erreur lors du traitement ({current_page_url}): {e}", flush=True)
                break

    if added_exercises:
        await db.commit()
        print(f"💾 [ENRICH CATALOG] {len(added_exercises)} nouveaux exercices enregistrés en BDD !", flush=True)

    # Récupérer la liste totale des exercices en base
    res_all = await db.execute(select(Exercise).order_by(Exercise.name))
    all_exercises = res_all.scalars().all()
    print(f"📊 [ENRICH CATALOG] Nombre total d'exercices dans la BDD: {len(all_exercises)}", flush=True)
    return all_exercises

@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(
    exercise_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Supprimer un exercice. Réservé au créateur de l'exercice ou à un admin, et refusé s'il est utilisé dans une pré-séance ou un historique de séance."""
    exercise = await db.get(Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercice introuvable.")

    if current_user.role != UserRole.ADMIN and exercise.created_by_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez supprimer que vos propres exercices personnalisés.")

    in_template = (await db.execute(select(WorkoutTemplateItem).where(WorkoutTemplateItem.exercise_id == exercise_id).limit(1))).scalars().first()
    in_session = (await db.execute(select(WorkoutSessionExercise).where(WorkoutSessionExercise.exercise_id == exercise_id).limit(1))).scalars().first()
    if in_template or in_session:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cet exercice est utilisé dans une pré-séance ou un historique de séance et ne peut pas être supprimé."
        )

    await db.delete(exercise)
    await db.commit()




