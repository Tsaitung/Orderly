"""
FastAPI Product Service Application
使用統一的應用程式工廠簡化初始化
"""
import os
import sys
from pathlib import Path


from fastapi.staticfiles import StaticFiles

from orderly_fastapi_core import create_service_app

from app.modules.products.core.config import settings
from app.modules.products.core.database import async_engine
from app.modules.products.api.v1.categories import router as categories_router
from app.modules.products.api.v1.products import router as products_router
from app.modules.products.api.v1.skus_simple import router as skus_router
from app.modules.products.api.v1.sku_upload import router as sku_upload_router
from app.modules.products.api.v1.sku_analytics import router as sku_analytics_router
from app.modules.products.api.v1.sku_sharing import router as sku_sharing_router
from app.modules.products.api.v1.price_history import router as price_history_router
from app.modules.products.api.v1.product_images import router as product_images_router
from app.modules.products.api.v1.promotions import router as promotions_router
from app.modules.products.api.v1.supplier_skus import router as supplier_skus_router
from app.modules.products.api.v1.customer_prices import router as customer_prices_router
from app.modules.products.api.v1.bulk_operations import router as bulk_operations_router
from app.modules.products.api.bff import router as bff_router
from app.modules.products.middleware.error_handler import ErrorHandlerMiddleware, RequestValidationMiddleware

# 使用統一的應用程式工廠建立 FastAPI 應用
app = create_service_app(
    service_name="product-service-fastapi",
    version=settings.app_version,
    async_engine=async_engine,
    get_db_url=settings.get_database_url_async,
    settings=settings,
    cors_origins=settings.cors_origins if hasattr(settings, 'cors_origins') else None,
    debug=settings.debug,
    title="Orderly Product Service",
    description="井然 Orderly Product Service - FastAPI Version",
)

# 添加 Product Service 特定的 Middleware
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(RequestValidationMiddleware)

# 靜態文件：產品圖片上傳目錄
UPLOAD_DIR = Path(getattr(settings, 'local_upload_dir', '/tmp/uploads/products'))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads/products", StaticFiles(directory=str(UPLOAD_DIR)), name="product_uploads")

# 額外的健康檢查端點
@app.get("/ready")
async def readiness_check():
    """Readiness check endpoint"""
    return {"status": "ready", "service": "product-service-fastapi"}


@app.get("/live")
async def liveness_check():
    """Liveness check endpoint"""
    return {"status": "alive", "service": "product-service-fastapi"}


@app.get("/api/products/health")
async def products_health():
    """Products health endpoint - matches existing Node.js structure"""
    return {
        "status": "healthy",
        "service": "product-service",
        "framework": "FastAPI",
    }


# ==================== API Routers ====================

# Product Categories
app.include_router(
    categories_router,
    prefix="/api/products",
    tags=["Product Categories"]
)

# Products
app.include_router(
    products_router,
    prefix="/api/products",
    tags=["Products"]
)

# SKU Management
app.include_router(
    skus_router,
    prefix="/api/products",
    tags=["SKU Management"]
)

# SKU Batch Upload
app.include_router(
    sku_upload_router,
    prefix="/api/products",
    tags=["SKU Batch Upload"]
)

# SKU Analytics
app.include_router(
    sku_analytics_router,
    prefix="/api/products",
    tags=["SKU Analytics"]
)

# SKU Sharing System
app.include_router(
    sku_sharing_router,
    prefix="/api/products",
    tags=["SKU Sharing System"]
)

# Price History
app.include_router(
    price_history_router,
    prefix="/api/products",
    tags=["Price History"]
)

# Product Images
app.include_router(
    product_images_router,
    prefix="/api/products",
    tags=["Product Images"]
)

# Promotions
app.include_router(
    promotions_router,
    prefix="/api/products/promotions",
    tags=["Promotions"]
)

# Supplier SKU Management
app.include_router(
    supplier_skus_router,
    prefix="/api/products",
    tags=["Supplier SKU Management"]
)

# Customer Prices
app.include_router(
    customer_prices_router,
    prefix="/api/products/customer-prices",
    tags=["Customer Prices"]
)

# Bulk Operations
app.include_router(
    bulk_operations_router,
    prefix="/api/products",
    tags=["Bulk Operations"]
)

# BFF routes consumed by the frontend platform
app.include_router(bff_router)
