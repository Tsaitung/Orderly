import os
from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = os.getenv("APP_NAME", "Orderly Billing Service (FastAPI)")
    app_version: str = os.getenv("APP_VERSION", "0.1.0")
    port: int = int(os.getenv("PORT", "3005"))
    debug: bool = os.getenv("ENVIRONMENT", "development").lower() != "production"
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly",
    )


settings = Settings()

