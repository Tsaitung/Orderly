"""
FastAPI API Gateway
- Provides health/metrics endpoints
- Proxies /api/... to internal services via httpx
"""

import os
import time
import uuid
import logging
from typing import Optional, Dict, Any

from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import JSONResponse, StreamingResponse
import httpx

APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
ENVIRONMENT = os.getenv("NODE_ENV", os.getenv("ENVIRONMENT", "development"))

# Service targets (default to docker-compose names/ports)
SERVICE_URLS = {
    "users": os.getenv("USER_SERVICE_URL", "http://user-service:3001"),
    "orders": os.getenv("ORDER_SERVICE_URL", "http://order-service:3002"),
    # Product service mounts under /api/products, keep original prefix when proxying
    "products": os.getenv("PRODUCT_SERVICE_URL", "http://localhost:3003"),
    # Acceptance service mounts under /acceptance (no /api prefix in service)
    "acceptance": os.getenv("ACCEPTANCE_SERVICE_URL", "http://acceptance-service:3004/acceptance"),
    # Billing service exposes /invoices at root (no /api prefix in service)
    "billing": os.getenv("BILLING_SERVICE_URL", "http://billing-service:3005"),
    # Notification service exposes /notifications at root (no /api prefix in service)
    "notifications": os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:3006"),
}

logger = logging.getLogger("api_gateway")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


async def get_client(request: Request) -> httpx.AsyncClient:
    client: Optional[httpx.AsyncClient] = request.state.__dict__.get("httpx_client")
    if client is None:
        client = httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=5.0))
        request.state.httpx_client = client
    return client


def correlation_id(request: Request) -> str:
    cid = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    return cid


app = FastAPI(
    title="Orderly API Gateway (FastAPI)",
    version=APP_VERSION,
    description="FastAPI replacement for the Node.js API Gateway",
)

# Basic CORS, aligned with Node gateway defaults
allowed_origins = os.getenv("CORS_ORIGINS") or os.getenv("CORS_ORIGIN")
origins = [o.strip() for o in allowed_origins.split(",") if o.strip()] if allowed_origins else [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Optional trusted hosts (disabled by default)
trusted_hosts = os.getenv("TRUSTED_HOSTS")
if trusted_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=[h.strip() for h in trusted_hosts.split(",") if h.strip()])


@app.middleware("http")
async def add_correlation_and_logging(request: Request, call_next):
    start = time.time()
    cid = correlation_id(request)
    # Attach correlation id
    request.state.correlation_id = cid
    try:
        response: Response = await call_next(request)
    except Exception as e:
        logger.exception("Gateway error: %s", e)
        return JSONResponse(status_code=500, content={
            "error": "internal_error",
            "message": str(e),
            "correlationId": cid,
        })
    duration = int((time.time() - start) * 1000)
    response.headers["X-Correlation-ID"] = cid
    response.headers["X-Response-Time-ms"] = str(duration)
    return response


@app.on_event("shutdown")
async def close_clients():
    # No global client here; per-request client is closed by lifespan of request
    pass


def health_payload() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "api-gateway",
        "environment": ENVIRONMENT,
        "version": APP_VERSION,
    }


@app.get("/health")
async def health():
    return health_payload()


@app.get("/ready")
async def ready():
    # Basic readiness check; could probe dependencies if needed
    return {**health_payload(), "status": "ready"}


@app.get("/live")
async def live():
    return {"status": "alive"}


@app.get("/metrics/business")
async def business_metrics():
    # Minimal stub; extend as needed
    return {
        "orders": {"total": 0},
        "system": {"avgResponseTime": 0},
        "timestamp": int(time.time()),
    }


def _target_info(path: str) -> Optional[Dict[str, str]]:
    # Map incoming path to service and rewrite base path
    # e.g. /api/users/xyz -> (users, target_url + /xyz)
    segments = [s for s in path.split("/") if s]
    if len(segments) < 2 or segments[0] != "api":
        return None
    key = segments[1]
    mapping = {
        # '/api/users/*' -> user-service '/*' (service exposes '/auth/*' and '/api/auth/*')
        "users": ("users", SERVICE_URLS["users"], 2),
        # '/api/orders/*' -> order-service '/*' (service exposes '/orders/*' at root and '/api/orders/*')
        "orders": ("orders", SERVICE_URLS["orders"], 2),
        # '/api/products/*' -> product-service '/api/products/*' (keep prefix)
        "products": ("products", SERVICE_URLS["products"], 0),
        # '/api/acceptance/*' -> acceptance-service '/acceptance/*'
        "acceptance": ("acceptance", SERVICE_URLS["acceptance"], 2),
        # '/api/billing/*' -> billing-service '/*'
        "billing": ("billing", SERVICE_URLS["billing"], 2),
        # '/api/notifications/*' -> notification-service '/*'
        "notifications": ("notifications", SERVICE_URLS["notifications"], 2),
    }
    if key not in mapping:
        return None
    service_name, base, strip_n = mapping[key]
    remainder = "/" + "/".join(segments[strip_n:]) if len(segments) > strip_n else "/"
    return {"service": service_name, "url": base + remainder}


async def _proxy(request: Request, full_path: str) -> Response:
    info = _target_info(full_path)
    if not info:
        raise HTTPException(status_code=404, detail="Endpoint not found")

    method = request.method.upper()
    client = await get_client(request)

    # Prepare outgoing headers: forward most headers + correlation id
    headers = dict(request.headers)
    headers["X-Correlation-ID"] = request.state.correlation_id
    # Remove host header to let httpx set it correctly
    headers.pop("host", None)

    # Body (for methods that may contain a body)
    content = await request.body()

    try:
        r = await client.request(
            method,
            info["url"],
            content=content if method in {"POST", "PUT", "PATCH", "DELETE"} else None,
            headers=headers,
            params=dict(request.query_params),
        )
    except httpx.RequestError as e:
        logger.error("Proxy error to %s: %s", info["url"], e)
        return JSONResponse(status_code=503, content={
            "error": f"{info['service']} service unavailable",
            "correlationId": request.state.correlation_id,
        })

    # Stream back the response, preserving status and headers
    proxy_headers = [(k, v) for k, v in r.headers.items() if k.lower() not in {"content-encoding", "transfer-encoding", "connection"}]
    return Response(content=r.content, status_code=r.status_code, headers=dict(proxy_headers), media_type=r.headers.get("content-type"))


# Catch-all route for /api/* to proxy
@app.api_route("/api/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def api_proxy(full_path: str, request: Request):
    return await _proxy(request, "/api/" + full_path)


# Frontend compatibility: '/products/*' (without '/api' prefix)
@app.api_route("/products/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def products_alias(full_path: str, request: Request):
    # Rewrite '/products/x' -> '/api/products/x'
    return await _proxy(request, "/api/products/" + full_path)


@app.get("/")
async def root():
    return {
        "message": "Orderly API Gateway (FastAPI)",
        "health": "/health",
    }
