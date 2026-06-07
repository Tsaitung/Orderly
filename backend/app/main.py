"""Orderly modular-monolith composition root.

Mounts every module's pre-built routers into ONE FastAPI app so the whole backend
runs as a single `uvicorn app.main:app` process on localhost.

Approach: each module's main.py already builds a FastAPI app via
orderly_fastapi_core.create_service_app and registers its routers at the surveyed
prefixes (including dual /api + no-prefix mounts). We re-include each module's
`.router` here so those exact paths are preserved, and apply CORS + Auth
middleware ONCE at this top level.
"""
import os
from typing import Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from orderly_fastapi_core.middleware import (
    AuthMiddleware,
    DEFAULT_PUBLIC_PATHS,
    RedisRateLimitMiddleware,
    SecurityHeadersConfig,
    SecurityHeadersMiddleware,
)
from orderly_fastapi_core.errors import register_exception_handlers

# Shared auth settings (all modules validate JWT against the same env JWT_SECRET).
from app.modules.users.core.config import settings as _settings
from app.modules.users.core.database import async_engine as _users_async_engine

# Module apps — importing each runs its create_service_app() and mounts its routers.
from app.modules.notifications.main import app as _notifications_app
from app.modules.acceptance.main import app as _acceptance_app
from app.modules.suppliers.main import app as _suppliers_app
from app.modules.orders.main import app as _orders_app
from app.modules.billing.main import app as _billing_app
from app.modules.users.main import app as _users_app
from app.modules.customer_hierarchy.main import app as _customer_hierarchy_app
from app.modules.products.main import app as _products_app

# (module_name, module_app) in mount order.
MODULES = [
    ("notifications", _notifications_app),
    ("acceptance", _acceptance_app),
    ("suppliers", _suppliers_app),
    ("orders", _orders_app),
    ("billing", _billing_app),
    ("users", _users_app),
    ("customer_hierarchy", _customer_hierarchy_app),
    ("products", _products_app),
]

app = FastAPI(
    title="Orderly Monolith",
    version="0.1.0",
    description="井然 Orderly modular-monolith (9 services collapsed into one app)",
)

# CORS once at the top (origins from env CORS_ORIGINS, falling back to local dev).
_cors_origins = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "http://localhost:5566").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "X-CSRF-Token",
        "X-Correlation-ID",
    ],
    expose_headers=["X-Correlation-ID"],
)

_health_public_paths = {
    "/health",
    "/health/detailed",
    "/db/health",
    "/db/info",
    "/ready",
    "/live",
    "/acceptance/health",
    "/acceptance/db/health",
    "/api/v2/health",
    "/api/v2/health/live",
    "/api/v2/health/ready",
    "/service-map",
}

_verification_requirements: Dict[str, int] = {
    "/api/orders": 2,
    "/orders": 2,
    "/api/acceptance": 2,
    "/acceptance": 2,
    "/api/billing": 3,
    "/billing": 3,
    "/api/reconciliations": 3,
    "/reconciliations": 3,
    "/api/billing-periods": 3,
    "/billing-periods": 3,
    "/api/fee-configs": 3,
    "/fee-configs": 3,
    "/api/products/create": 3,
    "/products/create": 3,
    "/api/suppliers/products": 3,
    "/suppliers/products": 3,
    "/api/platform": 3,
    "/platform": 3,
}

# Auth once at the top. public_paths is the union of the shared defaults, the
# monolith health matrix, and each module's public paths, so module-specific open
# endpoints (OTP, auth, etc.) keep working through the single middleware.
_public_paths = set(DEFAULT_PUBLIC_PATHS)
_public_paths |= _health_public_paths
for _name, _mapp in MODULES:
    for _mw in getattr(_mapp, "user_middleware", []):
        _opts = getattr(_mw, "kwargs", {}) or getattr(_mw, "options", {})
        _pp = _opts.get("public_paths") if isinstance(_opts, dict) else None
        if _pp:
            _public_paths |= set(_pp)
app.add_middleware(
    AuthMiddleware,
    settings=_settings,
    public_paths=_public_paths,
    verification_requirements=_verification_requirements,
)
app.add_middleware(RedisRateLimitMiddleware, redis_url=_settings.get_redis_url())
app.add_middleware(SecurityHeadersMiddleware, **SecurityHeadersConfig.for_api())

register_exception_handlers(app)


@app.get("/health", tags=["monolith"])
def health():
    """Liveness probe for /restart and load balancers."""
    return {"status": "ok", "service": "orderly-monolith"}


@app.get("/live", tags=["monolith"])
def live():
    return {"status": "ok", "service": "orderly-monolith"}


async def _db_ping() -> bool:
    try:
        async with _users_async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


@app.get("/db/health", tags=["monolith"])
async def db_health():
    healthy = await _db_ping()
    return {
        "status": "healthy" if healthy else "unhealthy",
        "service": "orderly-monolith",
        "database": healthy,
    }


@app.get("/ready", tags=["monolith"])
async def ready():
    healthy = await _db_ping()
    return {
        "status": "ready" if healthy else "not_ready",
        "service": "orderly-monolith",
        "database": healthy,
    }


@app.get("/health/detailed", tags=["monolith"])
async def detailed_health():
    healthy = await _db_ping()
    return {
        "status": "healthy" if healthy else "unhealthy",
        "service": "orderly-monolith",
        "modules": [name for name, _ in MODULES],
        "database": healthy,
    }


@app.get("/db/info", tags=["monolith"])
def db_info():
    return {
        "service": "orderly-monolith",
        "database": "postgresql",
        "mode": "single-process",
    }


@app.get("/acceptance/health", tags=["monolith"])
def acceptance_health():
    return {"status": "healthy", "service": "acceptance", "mode": "in-process"}


@app.get("/acceptance/db/health", tags=["monolith"])
async def acceptance_db_health():
    return await db_health()


@app.get("/api/v2/health", tags=["monolith"])
def hierarchy_health():
    return {"status": "healthy", "service": "customer-hierarchy", "mode": "in-process"}


@app.get("/api/v2/health/live", tags=["monolith"])
def hierarchy_live():
    return {"status": "ok", "service": "customer-hierarchy", "mode": "in-process"}


@app.get("/api/v2/health/ready", tags=["monolith"])
async def hierarchy_ready():
    return await ready()


@app.get("/service-map", tags=["monolith"])
def service_map():
    return {
        "mode": "monolith",
        "service": "orderly-monolith",
        "routing": "in-process",
        "proxy": False,
        "modules": {name: {"owner": "in-process", "transport": "router"} for name, _ in MODULES},
    }


# Mount every module's routers at their existing prefixes (dual /api + no-prefix,
# /api/v2, etc. all preserved exactly as each module declared them).
for _name, _mapp in MODULES:
    app.include_router(_mapp.router)
