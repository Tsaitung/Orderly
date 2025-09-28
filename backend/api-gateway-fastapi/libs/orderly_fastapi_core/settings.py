from __future__ import annotations

from typing import List
from pydantic import Field
try:
    from pydantic_settings import BaseSettings  # Pydantic v2 style
except Exception:  # Fallback for environments without pydantic-settings
    from pydantic import BaseSettings  # type: ignore


class AppSettings(BaseSettings):
    """Shared settings base for Orderly FastAPI services.

    Services can subclass and override defaults; values can be overridden by env.
    """

    # Application
    app_name: str = Field(default="Orderly Service (FastAPI)")
    app_version: str = Field(default="0.1.0")
    debug: bool = Field(default=False)
    port: int = Field(default=8000)

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly"
    )

    # CORS
    cors_origins: List[str] = Field(default=["http://localhost:3000", "http://localhost:8000"])

    class Config:
        env_file = ".env"
        case_sensitive = False

