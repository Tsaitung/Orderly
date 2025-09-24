"""
FastAPI Supplier Service Application (SQLAlchemy + Alembic)
Essential supplier management without inventory, ERP, or automation
"""
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..', 'libs')))
from orderly_fastapi_core.errors import register_exception_handlers
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import async_engine
from sqlalchemy import text
from app.api.v1.suppliers import router as suppliers_router
# Import models to register them with SQLAlchemy
from app.models import Organization, SupplierProfile, SupplierCustomer, SupplierOnboardingProgress


structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
)
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("supplier-service.start", version=settings.app_version)
    yield
    logger.info("supplier-service.stop")
    await async_engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
    openapi_url="/api/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)

# Secure CORS configuration
allowed_origins = [
    "http://localhost:3000",  # Next.js development
    "https://orderly.example.com",  # Production domain
]

if settings.debug:
    allowed_origins.extend([
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "X-CSRF-Token",
        "X-Correlation-ID"
    ],
    expose_headers=["X-Correlation-ID"]
)

# Consistent error responses
register_exception_handlers(app)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "supplier-service-fastapi", "version": settings.app_version}


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


@app.get("/db/info")
async def db_info():
    """Non-sensitive DB info for diagnostics (masked)."""
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
        # simple ping
        import time
        start = time.time()
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        dur = (time.time() - start) * 1000
        return {"url_masked": masked, "ping_ms": dur}
    except Exception as e:
        logger.error("db.info.failed", error=str(e))
        return JSONResponse(status_code=503, content={"error": str(e)})


@app.get("/")
async def root():
    return {"service": "Orderly Supplier Service (FastAPI)", "docs": "/api/docs"}


app.include_router(suppliers_router, prefix="/api", tags=["Suppliers"])
# Also expose without '/api' prefix for API Gateway routing
app.include_router(suppliers_router, prefix="", tags=["Suppliers"])
