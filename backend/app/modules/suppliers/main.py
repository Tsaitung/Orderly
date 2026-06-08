"""
FastAPI Supplier Service Application
使用統一的應用程式工廠簡化初始化
"""
import os
import sys


from orderly_fastapi_core import create_service_app

from app.modules.suppliers.core.config import settings
from app.modules.suppliers.core.database import async_engine
from app.modules.suppliers.api.v1.suppliers import router as suppliers_router
# Import models to register them with SQLAlchemy
from app.modules.suppliers.models import Organization, SupplierProfile, SupplierCustomer, SupplierOnboardingProgress  # noqa: F401

app = create_service_app(
    service_name="supplier-service-fastapi",
    version=settings.app_version,
    async_engine=async_engine,
    get_db_url=settings.get_database_url_async,
    settings=settings,
    debug=settings.debug,
)

# 註冊供應商路由
app.include_router(suppliers_router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(suppliers_router, prefix="/api", tags=["Suppliers"])
app.include_router(suppliers_router, prefix="", tags=["Suppliers"])
