"""
FastAPI Order Service Application
使用統一的應用程式工廠簡化初始化
"""
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..", "libs")))

from orderly_fastapi_core import create_service_app

from app.core.config import settings
from app.core.database import async_engine
from app.api.v1.orders import router as orders_router

app = create_service_app(
    service_name="order-service-fastapi",
    version=settings.app_version,
    async_engine=async_engine,
    get_db_url=settings.get_database_url_async,
    settings=settings,
    debug=settings.debug,
)

# 註冊訂單路由
app.include_router(orders_router, prefix="/api", tags=["Orders"])
app.include_router(orders_router, prefix="", tags=["Orders"])
