from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.models import User, UserRole, Exercise, ExerciseMetricType, WorkoutTemplate, WorkoutTemplateItem

INITIAL_EXERCISES = [
    {
        "name": "Pompes Diamant",
        "description": "Mains rapprochées en forme de diamant pour cibler intensivement les triceps et l'intérieur des pectoraux.",
        "category": "Musculation",
        "metric_type": ExerciseMetricType.REPS_ONLY,
        "default_rest_seconds": 60,
        "primary_muscles": ["triceps", "chest"],
        "secondary_muscles": ["shoulders"]
    },
    {
        "name": "Développé Couché",
        "description": "Exercice polyarticulaire roi pour la masse pectorale.",
        "category": "Musculation",
        "metric_type": ExerciseMetricType.REPS_WEIGHT,
        "default_rest_seconds": 90,
        "primary_muscles": ["chest"],
        "secondary_muscles": ["triceps", "shoulders"]
    },
    {
        "name": "Squat Barre",
        "description": "Exercice fondamental pour le bas du corps (Quadriceps & Fessiers).",
        "category": "Musculation",
        "metric_type": ExerciseMetricType.REPS_WEIGHT,
        "default_rest_seconds": 120,
        "primary_muscles": ["quadriceps", "glutes"],
        "secondary_muscles": ["hamstrings", "abs"]
    },
    {
        "name": "Tractions Pronation",
        "description": "Tirage vertical au poids de corps pour la largeur du dos.",
        "category": "Musculation",
        "metric_type": ExerciseMetricType.REPS_ONLY,
        "default_rest_seconds": 90,
        "primary_muscles": ["back_lats"],
        "secondary_muscles": ["biceps", "forearms"]
    },
    {
        "name": "Course à Pied - Cardio Évolution",
        "description": "Session d'endurance fondamentale & accélérations progressives.",
        "category": "Cardio",
        "metric_type": ExerciseMetricType.CARDIO,
        "default_rest_seconds": 45,
        "primary_muscles": ["quadriceps", "calves"],
        "secondary_muscles": ["hamstrings", "glutes"]
    },
    {
        "name": "Gainage Ventral (Planche)",
        "description": "Maintien isométrique de la sangle abdominale.",
        "category": "Musculation",
        "metric_type": ExerciseMetricType.TIME_REST,
        "default_rest_seconds": 45,
        "primary_muscles": ["abs"],
        "secondary_muscles": ["shoulders", "glutes"]
    }
]

async def init_db_seeds(db: AsyncSession):
    # 1. Admin Initial Seed
    res_admin = await db.execute(select(User).where(User.email == settings.FIRST_ADMIN_EMAIL))
    admin_user = res_admin.scalars().first()
    if not admin_user:
        admin_user = User(
            email=settings.FIRST_ADMIN_EMAIL,
            hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
            full_name=settings.FIRST_ADMIN_NAME,
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin_user)
        await db.flush()

    # 2. Exercises Initial Seed
    exercise_objs = {}
    for ex_data in INITIAL_EXERCISES:
        res_ex = await db.execute(select(Exercise).where(Exercise.name == ex_data["name"]))
        existing_ex = res_ex.scalars().first()
        if not existing_ex:
            new_ex = Exercise(**ex_data, is_custom=False)
            db.add(new_ex)
            await db.flush()
            exercise_objs[ex_data["name"]] = new_ex
        else:
            exercise_objs[ex_data["name"]] = existing_ex

    # 3. Predefined Programs Seed (e.g. Cardio Evolution & Push Day)
    res_tpl = await db.execute(select(WorkoutTemplate).where(WorkoutTemplate.title == "Programme Cardio Évolution"))
    if not res_tpl.scalars().first():
        cardio_tpl = WorkoutTemplate(
            title="Programme Cardio Évolution",
            description="Programme hebdomadaire axé sur le développement de la VO2Max, l'endurance et le renforcement des jambes.",
            is_predefined_program=True,
            program_category="cardio_evolution",
            created_by_id=admin_user.id
        )
        db.add(cardio_tpl)
        await db.flush()

        if "Course à Pied - Cardio Évolution" in exercise_objs:
            db.add(WorkoutTemplateItem(
                template_id=cardio_tpl.id,
                exercise_id=exercise_objs["Course à Pied - Cardio Évolution"].id,
                order=1,
                target_sets=3,
                target_duration_seconds=600, # 10 mins per interval
                rest_seconds=60
            ))

    res_push = await db.execute(select(WorkoutTemplate).where(WorkoutTemplate.title == "Séance Push (Pectoraux/Triceps/Épaules)"))
    if not res_push.scalars().first():
        push_tpl = WorkoutTemplate(
            title="Séance Push (Pectoraux/Triceps/Épaules)",
            description="Routine classique Push ciblant le haut du corps.",
            is_predefined_program=True,
            program_category="hypertrophy",
            created_by_id=admin_user.id
        )
        db.add(push_tpl)
        await db.flush()

        if "Développé Couché" in exercise_objs:
            db.add(WorkoutTemplateItem(
                template_id=push_tpl.id,
                exercise_id=exercise_objs["Développé Couché"].id,
                order=1,
                target_sets=4,
                target_reps=10,
                target_weight_kg=70.0,
                rest_seconds=90
            ))
        if "Pompes Diamant" in exercise_objs:
            db.add(WorkoutTemplateItem(
                template_id=push_tpl.id,
                exercise_id=exercise_objs["Pompes Diamant"].id,
                order=2,
                target_sets=3,
                target_reps=15,
                rest_seconds=60
            ))

    await db.commit()
