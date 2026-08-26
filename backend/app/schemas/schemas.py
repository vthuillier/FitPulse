from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.models import UserRole, ExerciseMetricType

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str
    role: Optional[UserRole] = UserRole.USER

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# --- Exercise Schemas ---
class ExerciseBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    metric_type: ExerciseMetricType
    default_rest_seconds: int = 60
    primary_muscles: List[str] = []
    secondary_muscles: List[str] = []

class ExerciseCreate(ExerciseBase):
    pass

class ExerciseResponse(ExerciseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_custom: bool
    created_by_id: Optional[int] = None

# --- Template Schemas ---
class TemplateItemBase(BaseModel):
    exercise_id: int
    order: int = 0
    target_sets: int = 3
    target_reps: int = 10
    target_weight_kg: float = 0.0
    target_duration_seconds: int = 0
    rest_seconds: int = 60

class TemplateItemCreate(TemplateItemBase):
    pass

class TemplateItemResponse(TemplateItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise: ExerciseResponse

class WorkoutTemplateBase(BaseModel):
    title: str
    description: Optional[str] = None
    is_predefined_program: bool = False
    program_category: Optional[str] = None

class WorkoutTemplateCreate(WorkoutTemplateBase):
    items: List[TemplateItemCreate] = []

class WorkoutTemplateResponse(WorkoutTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    template_items: List[TemplateItemResponse] = []

# --- Session & Live Workout Schemas ---
class SetDetailCreate(BaseModel):
    set_number: int
    reps_completed: int = 0
    weight_kg: float = 0.0
    duration_seconds: int = 0
    rest_seconds: int = 60
    completed: bool = True

class SetDetailResponse(SetDetailCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

class SessionExerciseCreate(BaseModel):
    exercise_id: int
    order: int = 0
    sets: List[SetDetailCreate] = []

class SessionExerciseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    exercise_id: int
    order: int
    exercise: ExerciseResponse
    sets: List[SetDetailResponse] = []

class WorkoutSessionCreate(BaseModel):
    template_id: Optional[int] = None
    title: str
    notes: Optional[str] = None
    body_weight_kg: Optional[float] = None
    meals_logged: Optional[str] = None
    exercises: List[SessionExerciseCreate] = []

class WorkoutSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    template_id: Optional[int] = None
    title: str
    start_time: datetime
    end_time: Optional[datetime] = None
    notes: Optional[str] = None
    body_weight_kg: Optional[float] = None
    meals_logged: Optional[str] = None
    exercises_done: List[SessionExerciseResponse] = []

# --- Body Measurement Schemas ---
class BodyMeasurementBase(BaseModel):
    weight_kg: Optional[float] = None
    chest_cm: Optional[float] = None
    waist_cm: Optional[float] = None
    biceps_cm: Optional[float] = None
    thighs_cm: Optional[float] = None
    hips_cm: Optional[float] = None
    notes: Optional[str] = None

class BodyMeasurementCreate(BodyMeasurementBase):
    pass

class BodyMeasurementResponse(BodyMeasurementBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    recorded_at: datetime

# --- Weekly Analytics & Progression ---
class WeeklySummaryResponse(BaseModel):
    total_workouts: int
    completed_sessions: List[WorkoutSessionResponse]
    suggested_templates: List[WorkoutTemplateResponse]
