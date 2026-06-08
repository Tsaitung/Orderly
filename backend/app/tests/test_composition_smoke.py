"""Composition-root smoke tests for the Orderly modular monolith.

These validate that `app.main` actually boots — i.e. every module's routers
import and mount into the single FastAPI app — and that the liveness + OpenAPI
contracts hold. They are deliberately DB/Redis-free: `/health` and
`/openapi.json` are in the rate-limiter's excluded paths and the auth public
paths, and the rate limiter fails open when Redis is absent, so these run as a
fast, deterministic gate that catches the highest-value regression: a module
silently failing to import/mount.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import MODULES, app

EXPECTED_MODULES = [
    "notifications",
    "acceptance",
    "suppliers",
    "orders",
    "billing",
    "users",
    "customer_hierarchy",
    "products",
]


def test_app_is_fastapi() -> None:
    assert isinstance(app, FastAPI)


def test_all_eight_modules_registered() -> None:
    assert [name for name, _ in MODULES] == EXPECTED_MODULES


def test_every_module_router_is_mounted() -> None:
    # Each module's routers are included at the composition root; if any module
    # failed to import this assertion (and the import above) would fail.
    paths = {getattr(route, "path", "") for route in app.routes}
    assert len([p for p in paths if p]) > 300, "monolith should expose 300+ routes"
    # one representative path per health domain must be present
    for path in ["/health", "/api/v2/health", "/acceptance/health", "/service-map"]:
        assert path in paths, f"missing composition route {path}"


def test_health_liveness_returns_200() -> None:
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "service": "orderly-monolith"}


def test_openapi_schema_builds_with_all_routes() -> None:
    client = TestClient(app)
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    assert len(resp.json()["paths"]) > 300


def test_auth_gated_route_rejects_unauthenticated() -> None:
    # A non-public route must be guarded by the single top-level AuthMiddleware
    # (401), proving auth is wired — not 404 (missing) or 5xx (broken).
    client = TestClient(app)
    resp = client.get("/api/v1/users/me")
    assert resp.status_code in (401, 403)
