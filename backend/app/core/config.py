import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True)

    PROJECT_NAME: str = "FitPulse Pro API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "SUPER_SECURE_SECRET_KEY_CHANGE_IN_PRODUCTION_FITPULSE_2026_PRO")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # DB Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./fitpulse.db"
    )

    # CORS: comma-separated allowed origins. No wildcard - required for
    # allow_credentials=True to work in browsers and to avoid exposing
    # authenticated endpoints to arbitrary origins. Kept as a plain str field
    # (not list[str]) because pydantic-settings auto-binds list-typed fields
    # from env as JSON, which breaks a comma-separated value.
    CORS_ORIGINS_RAW: str = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
    )

    @property
    def CORS_ORIGINS(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS_RAW.split(",") if o.strip()]
    
    # Initial Admin Seed Configuration
    FIRST_ADMIN_EMAIL: str = os.getenv("FIRST_ADMIN_EMAIL", "admin@fitpulse.com")
    FIRST_ADMIN_PASSWORD: str = os.getenv("FIRST_ADMIN_PASSWORD", "AdminSecure2026!")
    FIRST_ADMIN_NAME: str = "Administrateur"

settings = Settings()
