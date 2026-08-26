import enum
from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"

class ExerciseMetricType(str, enum.Enum):
    REPS_WEIGHT = "reps_weight"  # Répétitions & Charge (kg)
    REPS_ONLY = "reps_only"      # Répétitions seules (ex: Pompes)
    TIME_REST = "time_rest"      # Exercices chronométrés / Gainage
    CARDIO = "cardio"            # Temps & Distance / Cal

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.USER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    workouts: Mapped[list["WorkoutSession"]] = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")
    templates: Mapped[list["WorkoutTemplate"]] = relationship("WorkoutTemplate", back_populates="creator", cascade="all, delete-orphan")
    body_measurements: Mapped[list["BodyMeasurement"]] = relationship("BodyMeasurement", back_populates="user", cascade="all, delete-orphan")

class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False) # Musculation, Cardio, Stretches
    metric_type: Mapped[ExerciseMetricType] = mapped_column(Enum(ExerciseMetricType), default=ExerciseMetricType.REPS_WEIGHT, nullable=False)
    default_rest_seconds: Mapped[int] = mapped_column(Integer, default=60) # ex: 60 sec rest
    primary_muscles: Mapped[list[str]] = mapped_column(JSON, default=list) # e.g. ["chest", "triceps"]
    secondary_muscles: Mapped[list[str]] = mapped_column(JSON, default=list) # e.g. ["shoulders_front"]
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

class WorkoutTemplate(Base):
    """Modèle de pré-séance (ex: Push, Pull, Legs, Cardio Evolution)"""
    __tablename__ = "workout_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    is_predefined_program: Mapped[bool] = mapped_column(Boolean, default=False) # e.g., Cardio Evolution
    program_category: Mapped[str] = mapped_column(String(100), nullable=True) # "cardio_evolution", "hypertrophy"
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    creator: Mapped["User"] = relationship("User", back_populates="templates")
    template_items: Mapped[list["WorkoutTemplateItem"]] = relationship("WorkoutTemplateItem", back_populates="template", cascade="all, delete-orphan", order_by="WorkoutTemplateItem.order")

class WorkoutTemplateItem(Base):
    __tablename__ = "workout_template_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    template_id: Mapped[int] = mapped_column(Integer, ForeignKey("workout_templates.id"), nullable=False)
    exercise_id: Mapped[int] = mapped_column(Integer, ForeignKey("exercises.id"), nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
    target_sets: Mapped[int] = mapped_column(Integer, default=3)
    target_reps: Mapped[int] = mapped_column(Integer, default=10)
    target_weight_kg: Mapped[float] = mapped_column(Float, default=0.0)
    target_duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    rest_seconds: Mapped[int] = mapped_column(Integer, default=60)

    template: Mapped["WorkoutTemplate"] = relationship("WorkoutTemplate", back_populates="template_items")
    exercise: Mapped["Exercise"] = relationship("Exercise")

class WorkoutSession(Base):
    """Séance réelle réalisée par l'utilisateur"""
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    template_id: Mapped[int] = mapped_column(Integer, ForeignKey("workout_templates.id"), nullable=True) # None si à la volée
    title: Mapped[str] = mapped_column(String(255), nullable=False) # Ex: "Push Day - Volée" ou "Cardio Intensif"
    start_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    body_weight_kg: Mapped[float] = mapped_column(Float, nullable=True) # Poids relevé lors de la séance
    meals_logged: Mapped[str] = mapped_column(Text, nullable=True) # Repas du jour / notes nutrition

    user: Mapped["User"] = relationship("User", back_populates="workouts")
    exercises_done: Mapped[list["WorkoutSessionExercise"]] = relationship("WorkoutSessionExercise", back_populates="session", cascade="all, delete-orphan")

class WorkoutSessionExercise(Base):
    __tablename__ = "workout_session_exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("workout_sessions.id"), nullable=False)
    exercise_id: Mapped[int] = mapped_column(Integer, ForeignKey("exercises.id"), nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    session: Mapped["WorkoutSession"] = relationship("WorkoutSession", back_populates="exercises_done")
    exercise: Mapped["Exercise"] = relationship("Exercise")
    sets: Mapped[list["WorkoutSetDetail"]] = relationship("WorkoutSetDetail", back_populates="session_exercise", cascade="all, delete-orphan")

class WorkoutSetDetail(Base):
    __tablename__ = "workout_set_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_exercise_id: Mapped[int] = mapped_column(Integer, ForeignKey("workout_session_exercises.id"), nullable=False)
    set_number: Mapped[int] = mapped_column(Integer, nullable=False)
    reps_completed: Mapped[int] = mapped_column(Integer, default=0)
    weight_kg: Mapped[float] = mapped_column(Float, default=0.0)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)
    calories_burned: Mapped[float] = mapped_column(Float, default=0.0)
    rest_seconds: Mapped[int] = mapped_column(Integer, default=60)
    completed: Mapped[bool] = mapped_column(Boolean, default=True)

    session_exercise: Mapped["WorkoutSessionExercise"] = relationship("WorkoutSessionExercise", back_populates="sets")

class BodyMeasurement(Base):
    """Suivi des mensurations corporelles"""
    __tablename__ = "body_measurements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=True)
    chest_cm: Mapped[float] = mapped_column(Float, nullable=True) # Tour de pecs
    waist_cm: Mapped[float] = mapped_column(Float, nullable=True) # Tour de ventre / taille
    biceps_cm: Mapped[float] = mapped_column(Float, nullable=True) # Tour de bras
    thighs_cm: Mapped[float] = mapped_column(Float, nullable=True) # Tour de cuisses
    hips_cm: Mapped[float] = mapped_column(Float, nullable=True) # Tour de hanches
    notes: Mapped[str] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="body_measurements")
