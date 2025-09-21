"""
Simplified Customer Hierarchy Service - FastAPI Application
Minimal version for testing database seeding
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import structlog
from typing import Dict, Any

from app.core.config import settings
from app.core.database import init_db, close_db, check_db_health

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Customer Hierarchy Service starting up", version=settings.API_VERSION)
    
    # Initialize database
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize database", error=str(e))
        raise
    
    yield
    
    # Shutdown
    logger.info("Customer Hierarchy Service shutting down")
    await close_db()


# FastAPI application instance
app = FastAPI(
    title="Customer Hierarchy Service (Simple)",
    description="Minimal version for database testing",
    version=settings.API_VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoints
@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": "customer-hierarchy-service",
        "version": settings.API_VERSION,
        "timestamp": str(time.time())
    }


@app.get("/health/detailed")
async def detailed_health_check() -> Dict[str, Any]:
    """Detailed health check with database"""
    health_status = {
        "status": "healthy",
        "service": "customer-hierarchy-service",
        "version": settings.API_VERSION,
        "timestamp": str(time.time()),
        "checks": {}
    }
    
    # Database health check
    try:
        db_healthy = await check_db_health()
        if db_healthy:
            health_status["checks"]["database"] = {"status": "healthy"}
        else:
            health_status["checks"]["database"] = {"status": "unhealthy"}
            health_status["status"] = "unhealthy"
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "unhealthy"
    
    return health_status


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Customer Hierarchy Service (Simple)",
        "description": "Minimal version for database testing",
        "version": settings.API_VERSION,
        "health_url": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main_simple:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,
        log_level="info"
    )