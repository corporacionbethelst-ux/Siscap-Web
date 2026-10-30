from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuración global de la aplicación."""

    # Base de datos
    DATABASE_URL: str

    # Seguridad
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # App
    APP_NAME: str = "SISCAP Web"
    APP_VERSION: str = "6.0.0"
    DEBUG: bool = True

    # Importación masiva (NUEVO)
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    class Config:
        env_file = ".env"
        case_sensitive = True
        # Coherencia con .env.example (v6.1): permite claves informativas como
        # ENVIRONMENT sin romper la carga de configuración (extra="ignore").
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
