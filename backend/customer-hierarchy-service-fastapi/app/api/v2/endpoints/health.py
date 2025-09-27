"""Health endpoints for API v2."""

import time
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text

from app.core.config import settings
from app.core.database import async_engine as engine, check_db_health


router = APIRouter()


@router.get("", tags=["Health"])
async def v2_health(detailed: bool = Query(False, description="Include dependency checks")):
    """Return basic (or detailed) health information for API v2."""
    health_status = {
        "status": "healthy",
        "service": "customer-hierarchy-service",
        "version": settings.api_version,
        "timestamp": str(time.time()),
    }

    if not detailed:
        return health_status

    checks = {}

    # Database check
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = {"status": "healthy"}
    except Exception as exc:
        checks["database"] = {"status": "unhealthy", "error": str(exc)}
        health_status["status"] = "unhealthy"

    # Active DB probe (leveraging existing helper for more context)
    try:
        db_ok = await check_db_health()
        checks["database_probe"] = {"status": "healthy" if db_ok else "unhealthy"}
        if not db_ok:
            health_status["status"] = "unhealthy"
    except Exception as exc:
        checks["database_probe"] = {"status": "unhealthy", "error": str(exc)}
        health_status["status"] = "unhealthy"

    health_status["checks"] = checks
    return health_status


@router.get("/live", tags=["Health"])
async def v2_liveness():
    """Liveness check for API v2."""
    return {"status": "alive"}


@router.get("/ready", tags=["Health"])
async def v2_readiness():
    """Readiness probe for API v2."""
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Service not ready: {exc}")
