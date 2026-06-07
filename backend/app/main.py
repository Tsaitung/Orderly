"""Orderly modular-monolith composition root (STEP 3).

Mounts every module's pre-built routers into ONE FastAPI app so the whole backend
runs as a single `uvicorn app.main:app` process on localhost. Each module still
owns its own engine / Base / settings at this stage (DB + Base unification is
STEP 5, alembic consolidation STEP 6).

Approach: each module's main.py already builds a FastAPI app via
orderly_fastapi_core.create_service_app and registers its routers at the surveyed
prefixes (including dual /api + no-prefix mounts). We re-include each module's
`.router` here so those exact paths are preserved, and apply CORS + Auth
middleware ONCE at this top level.

gateway_compat (api-gateway) is intentionally NOT mounted: its routes are httpx
reverse-proxies to per-service ports that do not exist inside the monolith. Its
security-headers / rate-limit / verification_level middleware is a STEP 4 follow-up.
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from orderly_fastapi_core.middleware import AuthMiddleware, DEFAULT_PUBLIC_PATHS
from orderly_fastapi_core.errors import register_exception_handlers

# Shared auth settings (all modules validate JWT against the same env JWT_SECRET).
from app.modules.users.core.config import settings as _settings

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

# Auth once at the top. public_paths is the union of the shared defaults plus each
# module's own public paths, so module-specific open endpoints (OTP, auth, etc.)
# keep working through the single middleware.
_public_paths = set(DEFAULT_PUBLIC_PATHS)
for _name, _mapp in MODULES:
    for _mw in getattr(_mapp, "user_middleware", []):
        _opts = getattr(_mw, "kwargs", {}) or getattr(_mw, "options", {})
        _pp = _opts.get("public_paths") if isinstance(_opts, dict) else None
        if _pp:
            _public_paths |= set(_pp)
app.add_middleware(AuthMiddleware, settings=_settings, public_paths=_public_paths)

register_exception_handlers(app)


@app.get("/health", tags=["monolith"])
def health():
    """Liveness probe for /restart and load balancers."""
    return {"status": "ok", "service": "orderly-monolith"}


# Mount every module's routers at their existing prefixes (dual /api + no-prefix,
# /api/v2, etc. all preserved exactly as each module declared them).
for _name, _mapp in MODULES:
    app.include_router(_mapp.router)
