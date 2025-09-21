import os, sys
# Add monorepo libs to path for shared core
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..', 'libs')))
from orderly_fastapi_core.settings import AppSettings


class Settings(AppSettings):
    app_name: str = os.getenv("APP_NAME", "Orderly Order Service (FastAPI)")
    app_version: str = os.getenv("APP_VERSION", "0.1.0")
    port: int = int(os.getenv("PORT", "3002"))
    debug: bool = os.getenv("ENVIRONMENT", "development").lower() != "production"
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly",
    )


settings = Settings()
