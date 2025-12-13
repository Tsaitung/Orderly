"""
FastAPI User Service Application (SQLAlchemy + Alembic)
Replaces legacy Node.js user-service
"""
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..', 'libs')))
from orderly_fastapi_core.errors import register_exception_handlers
from orderly_fastapi_core.middleware import AuthMiddleware, DEFAULT_PUBLIC_PATHS
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import async_engine
from sqlalchemy import text
from app.api.v1.auth import router as auth_router
from app.api.v1.mfa import router as mfa_router
from app.api.v1.oauth import router as oauth_router
from app.api.v1.super_user import router as super_user_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.business_verification import router as verification_router
from app.api.v1.audit import router as audit_router
from app.api.v1.suppliers import router as suppliers_router
from app.api.v1.organizations import router as organizations_router
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

# Consistent error responses
register_exception_handlers(app)

public_auth_paths = DEFAULT_PUBLIC_PATHS.union({
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    # MFA verify (user doesn't have token during MFA challenge)
    "/auth/mfa/verify",
    "/api/auth/mfa/verify",
    # Password reset (user doesn't have token during reset flow)
    "/auth/forgot-password",
    "/auth/reset-password",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    # OAuth endpoints (initiate and callback are public)
    "/auth/oauth/providers",
    "/auth/oauth/line/initiate",
    "/auth/oauth/google/initiate",
    "/auth/oauth/line/callback",
    "/auth/oauth/google/callback",
    "/auth/oauth/complete-registration",
    "/api/auth/oauth/providers",
    "/api/auth/oauth/line/initiate",
    "/api/auth/oauth/google/initiate",
    "/api/auth/oauth/line/callback",
    "/api/auth/oauth/google/callback",
    "/api/auth/oauth/complete-registration",
})
app.add_middleware(AuthMiddleware, settings=settings, public_paths=public_auth_paths)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "user-service-fastapi", "version": settings.app_version}


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
    return {"service": "Orderly User Service (FastAPI)", "docs": "/api/docs"}


app.include_router(auth_router, prefix="/api", tags=["Auth"])
# Also expose without '/api' so API Gateway '/api/users' -> '' works for '/auth/*'
app.include_router(auth_router, prefix="", tags=["Auth"])

# MFA APIs
app.include_router(mfa_router, prefix="/api", tags=["MFA"])
app.include_router(mfa_router, prefix="", tags=["MFA"])

# OAuth APIs
app.include_router(oauth_router, prefix="/api", tags=["OAuth"])
app.include_router(oauth_router, prefix="", tags=["OAuth"])

# Super User APIs
app.include_router(super_user_router, prefix="/api", tags=["Super User"])
app.include_router(super_user_router, prefix="", tags=["Super User"])

# Session management APIs
app.include_router(sessions_router, prefix="/api", tags=["Sessions"])
app.include_router(sessions_router, prefix="", tags=["Sessions"])

# Business verification APIs
app.include_router(verification_router, prefix="/api", tags=["Verification"])
app.include_router(verification_router, prefix="", tags=["Verification"])

# Audit log APIs
app.include_router(audit_router, prefix="/api", tags=["Audit"])
app.include_router(audit_router, prefix="", tags=["Audit"])

# Supplier management APIs
app.include_router(suppliers_router, prefix="/api", tags=["Suppliers"])
app.include_router(suppliers_router, prefix="", tags=["Suppliers"])

# Organization management APIs (for platform admin view switching)
app.include_router(organizations_router, prefix="/api/v1", tags=["Organizations"])
app.include_router(organizations_router, prefix="/v1", tags=["Organizations"])

# Supplier invitations - temporarily disabled
# app.include_router(invitations_router, prefix="/api/invitations", tags=["Invitations"])
# app.include_router(invitations_router, prefix="/invitations", tags=["Invitations"])
