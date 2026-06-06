"""
FastAPI Billing Service Application
使用統一的應用程式工廠簡化初始化
"""
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..", "libs")))

from orderly_fastapi_core import create_service_app

from app.core.config import settings
from app.core.database import async_engine
from app.api.v1.reconciliations import router as reconciliations_router
from app.api.v1.billing_periods import router as billing_periods_router
from app.api.v1.fee_configs import router as fee_configs_router

app = create_service_app(
    service_name="billing-service-fastapi",
    version=settings.app_version,
    async_engine=async_engine,
    get_db_url=settings.get_database_url_async,
    settings=settings,
    debug=settings.debug,
)

# 註冊帳務路由（含 /api 前綴和根路徑以相容 API Gateway）
app.include_router(reconciliations_router, prefix="/api", tags=["Reconciliations"])
app.include_router(billing_periods_router, prefix="/api", tags=["Billing Periods"])
app.include_router(fee_configs_router, prefix="/api", tags=["Fee Configs"])

app.include_router(reconciliations_router, prefix="", tags=["Reconciliations"])
app.include_router(billing_periods_router, prefix="", tags=["Billing Periods"])
app.include_router(fee_configs_router, prefix="", tags=["Fee Configs"])
