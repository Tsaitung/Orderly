"""
FastAPI User Service Application (SQLAlchemy + Alembic)
Replaces legacy Node.js user-service
"""
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import async_engine
from app.api.v1.auth import router as auth_router
from app.api.v1.suppliers import router as suppliers_router
# from app.api.v1.invitations import router as invitations_router


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
    logger.info("user-service.start", version=settings.app_version)
    yield
    logger.info("user-service.stop")
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


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "user-service-fastapi", "version": settings.app_version}


@app.get("/")
async def root():
    return {"service": "Orderly User Service (FastAPI)", "docs": "/api/docs"}


app.include_router(auth_router, prefix="/api", tags=["Auth"])
# Also expose without '/api' so API Gateway '/api/users' -> '' works for '/auth/*'
app.include_router(auth_router, prefix="", tags=["Auth"])

# Supplier management APIs
app.include_router(suppliers_router, prefix="/api", tags=["Suppliers"])
app.include_router(suppliers_router, prefix="", tags=["Suppliers"])

# Supplier invitations - temporarily disabled
# app.include_router(invitations_router, prefix="/api/invitations", tags=["Invitations"])
# app.include_router(invitations_router, prefix="/invitations", tags=["Invitations"])
