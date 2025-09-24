"""
FastAPI Product Service Application
Replaces legacy Node.js product service
"""
import logging
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.core.config import settings
from app.core.database import async_engine
from sqlalchemy import text
from app.api.v1.categories import router as categories_router
from app.api.v1.products import router as products_router
from app.api.v1.skus_simple import router as skus_router
from app.api.v1.sku_upload import router as sku_upload_router
from app.api.v1.sku_analytics import router as sku_analytics_router
from app.api.v1.sku_sharing import router as sku_sharing_router
from app.middleware.error_handler import ErrorHandlerMiddleware, RequestValidationMiddleware


# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("🚀 FastAPI Product Service starting up", version=settings.app_version)
    # Log database connection source (mask secrets)
    try:
        db_url = settings.get_database_url_async()
        masked = db_url
        if "://" in db_url and "@" in db_url:
            scheme, rest = db_url.split("://", 1)
            creds, hostpart = rest.split("@", 1)
            if ":" in creds:
                user, _ = creds.split(":", 1)
                creds_masked = f"{user}:***"
            else:
                creds_masked = creds
            masked = f"{scheme}://{creds_masked}@{hostpart}"
        logger.info("db.config", url=masked)
    except Exception as e:
        logger.warning("db.config_log_failed", error=str(e))
    yield
    # Shutdown
    logger.info("🛑 FastAPI Product Service shutting down")
    await async_engine.dispose()


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="井然 Orderly Product Service - FastAPI Version",
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
    openapi_url="/api/openapi.json" if settings.debug else None,
    lifespan=lifespan
)

# Add middleware
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(RequestValidationMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-API-Key",
        "X-Correlation-ID",
        "X-User-ID",
        "X-User-Role",
        "X-User-Permissions"
    ],
)

if not settings.debug:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"]  # Configure as needed for production
    )


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for consistent error responses"""
    logger.error(
        "Unhandled exception",
        exc_info=exc,
        path=request.url.path,
        method=request.method
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "details": str(exc) if settings.debug else "An unexpected error occurred"
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP exception handler for consistent error responses"""
    logger.warning(
        "HTTP exception",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
        method=request.method
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )


# Health check endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint compatible with existing Node.js service"""
    return {
        "status": "healthy",
        "service": "product-service",
        "version": settings.app_version,
        "framework": "FastAPI",
        "timestamp": "2025-09-19T08:00:00Z",  # Will be dynamic in production
        "environment": "development",  # From config
        "uptime": 0,  # Will be calculated in production
        "memory": {},  # Will include memory stats
        "database": "connected"  # Will check actual DB connection
    }


@app.get("/ready")
async def readiness_check():
    """Readiness check endpoint"""
    return {
        "status": "ready",
        "timestamp": "2025-09-19T08:00:00Z",
        "service": "product-service-fastapi"
    }


@app.get("/live")
async def liveness_check():
    """Liveness check endpoint"""
    return {
        "status": "alive",
        "timestamp": "2025-09-19T08:00:00Z",
        "service": "product-service-fastapi"
    }


# Include API routers
app.include_router(
    categories_router,
    prefix="/api/products",
    tags=["Product Categories"]
)

app.include_router(
    products_router,
    prefix="/api/products",
    tags=["Products"]
)

app.include_router(
    skus_router,
    prefix="/api/products",
    tags=["SKU Management"]
)

app.include_router(
    sku_upload_router,
    prefix="/api/products",
    tags=["SKU Batch Upload"]
)

app.include_router(
    sku_analytics_router,
    prefix="/api/products",
    tags=["SKU Analytics"]
)

app.include_router(
    sku_sharing_router,
    prefix="/api/products",
    tags=["SKU Sharing System"]
)


# Simple products endpoints for compatibility
@app.get("/api/products/health")
async def products_health():
    """Products health endpoint - matches existing Node.js structure"""
    return {
        "status": "healthy",
        "service": "product-service",
        "framework": "FastAPI",
        "timestamp": "2025-09-19T08:00:00Z"
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "井然 Orderly Product Service (FastAPI)",
        "version": settings.app_version,
        "docs": "/api/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )


@app.get("/db/health")
async def db_health():
    """Active DB probe: attempts a lightweight SELECT 1."""
    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "healthy"}
    except Exception as e:
        logger.error("db.health.failed", error=str(e))
        return JSONResponse(status_code=503, content={"status": "unhealthy", "error": str(e)})
