"""
FastAPI Acceptance Service Application
使用統一的應用程式工廠簡化初始化
"""
import os
import sys


from orderly_fastapi_core import create_service_app

from app.core.config import settings
from app.core.database import async_engine
from app.api.v1.acceptance import router as acceptance_router

app = create_service_app(
    service_name="acceptance-service-fastapi",
    version="1.1.0",
    async_engine=async_engine,
    get_db_url=settings.get_database_url_async,
    settings=settings,
    debug=getattr(settings, "debug", False),
)


@app.get("/acceptance/health")
async def health_legacy():
    """Legacy health endpoint for backward compatibility"""
    return {"status": "healthy", "service": "acceptance-service-fastapi"}


app.include_router(acceptance_router)
