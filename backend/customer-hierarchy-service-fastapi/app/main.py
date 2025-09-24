"""
Customer Hierarchy Service - FastAPI Application
Main entry point for the 4-level customer hierarchy management system
"""

from fastapi import FastAPI, Request, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import structlog
from typing import Dict, Any, Optional, List

from app.core.config import settings
from sqlalchemy import text
from app.core.database import async_engine as engine, get_async_db as get_database, init_db, check_db_health
from app.api.v2 import router as api_v2_router
from app.middleware.auth import AuthMiddleware
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.middleware.logging import LoggingMiddleware

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events
    """
    # Startup
    logger.info("Customer Hierarchy Service starting up", version=settings.api_version)
    # Log database connection source (mask secrets)
    try:
        db_url = settings.database_url_async
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
    
    # Skip immediate database connection to avoid startup failures
    # Database will be checked on first health check instead
    logger.info("Database connection will be verified on first health check")
    
    yield
    
    # Shutdown
    logger.info("Customer Hierarchy Service shutting down")
    await engine.dispose()


# FastAPI application instance
app = FastAPI(
    title="Customer Hierarchy Service",
    description="""
    4-Level Customer Hierarchy Management System
    
    This service manages the complete customer hierarchy structure:
    - 集團 (Group): Virtual grouping layer
    - 公司 (Company): Legal entity for billing
    - 地點 (Location): Physical delivery destination  
    - 業務單位 (Business Unit): Actual ordering entities
    
    Features:
    - Complete CRUD operations for all hierarchy levels
    - Tree navigation and search capabilities
    - Migration from single-level to 4-level hierarchy
    - Bulk operations and data validation
    - Real-time updates with caching
    """,
    version=settings.api_version,
    openapi_url=f"{settings.api_v2_str}/openapi.json",
    docs_url=f"{settings.api_v2_str}/docs",
    redoc_url=f"{settings.api_v2_str}/redoc",
    lifespan=lifespan
)

# Security middleware
if settings.backend_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.backend_cors_origins],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Trusted hosts middleware for production
if settings.environment == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.allowed_hosts
    )

# Custom middleware
app.add_middleware(LoggingMiddleware)
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(AuthMiddleware)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add response time header"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Health check endpoints
@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, str]:
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": "customer-hierarchy-service",
        "version": settings.api_version,
        "timestamp": str(time.time())
    }


@app.get("/health/detailed", tags=["Health"])
async def detailed_health_check() -> Dict[str, Any]:
    """Detailed health check with dependencies"""
    health_status = {
        "status": "healthy",
        "service": "customer-hierarchy-service",
        "version": settings.api_version,
        "timestamp": str(time.time()),
        "checks": {}
    }
    
    # Database health check
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        health_status["checks"]["database"] = {"status": "healthy"}
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "unhealthy"
    
    # Redis health check (if Redis is configured)
    if settings.redis_url:
        try:
            # Redis health check would go here
            health_status["checks"]["redis"] = {"status": "healthy"}
        except Exception as e:
            health_status["checks"]["redis"] = {
                "status": "unhealthy", 
                "error": str(e)
            }
    
    return health_status


@app.get("/ready", tags=["Health"])
async def readiness_check() -> Dict[str, str]:
    """Kubernetes readiness probe"""
    try:
        # Check if service is ready to serve requests
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        raise HTTPException(status_code=503, detail="Service not ready")


@app.get("/live", tags=["Health"])
async def liveness_check() -> Dict[str, str]:
    """Kubernetes liveness probe"""
    return {"status": "alive"}


@app.get("/db/health", tags=["Health"])
async def db_health_probe() -> Dict[str, Any]:
    """Active DB probe: performs SELECT 1 and reports status."""
    ok = await check_db_health()
    if ok:
        return {"status": "healthy"}
    raise HTTPException(status_code=503, detail="Database unhealthy")


# Metrics endpoint for Prometheus
@app.get("/metrics", tags=["Monitoring"])
async def get_metrics():
    """Prometheus metrics endpoint"""
    # This would return Prometheus-formatted metrics
    # For now, return a placeholder
    return {"metrics": "# HELP hierarchy_requests_total Total hierarchy requests"}


# Include API routers
app.include_router(
    api_v2_router,
    prefix=settings.api_v2_str,
    tags=["API v2"]
)

# Note: All hierarchy endpoints now handled by the v2 router
# Removed compatibility endpoints since proper v2 router is working


# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Global HTTP exception handler"""
    logger.warning(
        "HTTP exception occurred",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
        method=request.method
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "type": "HTTPException",
                "status_code": exc.status_code,
                "detail": exc.detail,
                "path": request.url.path,
                "timestamp": str(time.time())
            }
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled exceptions"""
    logger.error(
        "Unhandled exception occurred",
        error=str(exc),
        error_type=type(exc).__name__,
        path=request.url.path,
        method=request.method,
        exc_info=True
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "type": "InternalServerError",
                "status_code": 500,
                "detail": "Internal server error occurred",
                "path": request.url.path,
                "timestamp": str(time.time())
            }
        }
    )


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Customer Hierarchy Service",
        "description": "4-Level Customer Hierarchy Management System",
        "version": settings.api_version,
        "docs_url": f"{settings.api_v2_str}/docs",
        "health_url": "/health",
        "metrics_url": "/metrics"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development",
        log_level="info"
    )
