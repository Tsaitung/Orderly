import os, sys
from pydantic import BaseModel
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..', 'libs')))
from orderly_fastapi_core.settings import AppSettings


class Settings(AppSettings):
    app_name: str = os.getenv("APP_NAME", "Orderly Supplier Service (FastAPI)")
    app_version: str = os.getenv("APP_VERSION", "0.1.0")
    port: int = int(os.getenv("PORT", "3008"))
    debug: bool = os.getenv("ENVIRONMENT", "development").lower() != "production"

    # Database URLs (async for app, sync for Alembic)
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly"
    )

    jwt_secret: str = os.getenv("JWT_SECRET", "dev-jwt-secret-change-in-production")

    # Service URLs for inter-service communication
    user_service_url: str = os.getenv("USER_SERVICE_URL", "http://localhost:3001")
    order_service_url: str = os.getenv("ORDER_SERVICE_URL", "http://localhost:3002")


settings = Settings()
