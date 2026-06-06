"""
FastAPI API Gateway
- Provides health/metrics endpoints
- Proxies /api/... to internal services via httpx
- Updated: 2025-09-24 for v2 deployment trigger
"""

import os
import time
import uuid
import logging
from datetime import datetime
from dataclasses import dataclass
from typing import Optional, Dict, Any

from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import JSONResponse, StreamingResponse
import httpx
from jose import jwt, JWTError
from app.middleware.redis_rate_limit import RedisRateLimiter
from app.middleware.security_headers import SecurityHeadersMiddleware

APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
ENVIRONMENT = os.getenv("NODE_ENV", os.getenv("ENVIRONMENT", "development"))
USE_V2_BACKENDS = os.getenv("USE_V2_BACKENDS", "false").lower() == "true"

# Service targets (default to docker-compose names/ports)
SERVICE_URLS = {
    "users": os.getenv("USER_SERVICE_URL", "http://localhost:3001"),
    "orders": os.getenv("ORDER_SERVICE_URL", "http://localhost:3002"),
    # Product service mounts under /api/products, keep original prefix when proxying
    "products": os.getenv("PRODUCT_SERVICE_URL", "http://localhost:3003"),
    # Acceptance service mounts under /acceptance (no /api prefix in service)
    "acceptance": os.getenv("ACCEPTANCE_SERVICE_URL", "http://localhost:3004/acceptance"),
    # Billing service exposes /api/reconciliations, /api/billing-periods, /api/fee-configs
    "billing": os.getenv("BILLING_SERVICE_URL", "http://localhost:3005"),
    # Notification service exposes /notifications at root (no /api prefix in service)
    "notifications": os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:3006"),
    # Customer Hierarchy service exposes '/api/v2/*'
    "customer_hierarchy_v2": os.getenv("CUSTOMER_HIERARCHY_SERVICE_URL", "http://localhost:3007"),
    # Supplier service exposes '/api/*' and '/*' paths
    "suppliers": os.getenv("SUPPLIER_SERVICE_URL", "http://localhost:3008"),
}


@dataclass(frozen=True)
class ProxyMappingEntry:
    """Mapping rule telling the gateway how to reach a downstream service."""

    service: str
    base_url: str
    strip_segments: int
    note: str = ""


# Static mapping table for '/api/*' prefixes. Keep definitions in one place to
# avoid scattering proxy rules throughout the codebase.
PROXY_MAPPING: Dict[str, ProxyMappingEntry] = {
    # '/api/users/*' -> user-service '/*' (service exposes '/auth/*' and '/api/auth/*')
    "users": ProxyMappingEntry("users", SERVICE_URLS["users"], 2, "User service root"),
    # '/api/auth/*' -> user-service '/api/auth/*'
    "auth": ProxyMappingEntry("users", SERVICE_URLS["users"], 0, "User auth endpoints"),
    # '/api/platform/suppliers/*' -> user-service '/api/suppliers/*' (admin/platform functions)
    "platform": ProxyMappingEntry("users", SERVICE_URLS["users"], 1, "Platform supplier management"),
    # '/api/suppliers/*' -> supplier-service '/api/suppliers/*'
    "suppliers": ProxyMappingEntry("suppliers", SERVICE_URLS["suppliers"], 0, "Supplier core service"),
    # '/api/orders/*' -> order-service '/*'
    "orders": ProxyMappingEntry("orders", SERVICE_URLS["orders"], 2, "Order service"),
    # '/api/products/*' -> product-service '/api/products/*'
    "products": ProxyMappingEntry("products", SERVICE_URLS["products"], 0, "Product catalog"),
    # '/api/acceptance/*' -> acceptance-service '/acceptance/*'
    "acceptance": ProxyMappingEntry("acceptance", SERVICE_URLS["acceptance"], 2, "Acceptance workflows"),
    # '/api/notifications/*' -> notification-service '/*'
    "notifications": ProxyMappingEntry("notifications", SERVICE_URLS["notifications"], 2, "Notification delivery"),
    # '/api/reconciliations/*' -> billing-service '/api/reconciliations/*'
    "reconciliations": ProxyMappingEntry("billing", SERVICE_URLS["billing"], 0, "Billing reconciliations"),
    # '/api/billing-periods/*' -> billing-service '/api/billing-periods/*'
    "billing-periods": ProxyMappingEntry("billing", SERVICE_URLS["billing"], 0, "Billing periods"),
    # '/api/fee-configs/*' -> billing-service '/api/fee-configs/*'
    "fee-configs": ProxyMappingEntry("billing", SERVICE_URLS["billing"], 0, "Fee configurations"),
}

# 端點驗證級別要求映射表
# Level 0: 未驗證
# Level 1: Email 已驗證（預設，大部分端點）
# Level 2: Email + Phone 已驗證（下單、查看訂單）
# Level 3: Email + Phone + 營業登記已驗證（帳單、供應商功能）
ENDPOINT_VERIFICATION_REQUIREMENTS: Dict[str, int] = {
    # Level 2 要求 - 核心交易功能
    "/api/orders": 2,
    "/api/acceptance": 2,

    # Level 3 要求 - 進階功能（對帳、計費）
    "/api/billing": 3,
    "/api/reconciliations": 3,
    "/api/billing-periods": 3,
    "/api/fee-configs": 3,
    "/api/products/create": 3,
    "/api/suppliers/products": 3,
    "/api/platform": 3,
}

# BFF endpoints (/api/bff/*) are served by the product-service FastAPI layer,
# which aggregates product data and proxies hierarchy requests.
PROXY_MAPPING["bff"] = ProxyMappingEntry(
    service="products",
    base_url=SERVICE_URLS["products"],
    strip_segments=0,
    note="Frontend BFF layer",
)

logger = logging.getLogger("api_gateway")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

# Redis-based distributed rate limiter
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_rate_limiter = RedisRateLimiter(redis_url=REDIS_URL)


async def get_client(request: Request) -> httpx.AsyncClient:
    client: Optional[httpx.AsyncClient] = request.state.__dict__.get("httpx_client")
    if client is None:
        client = httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=5.0))
        request.state.httpx_client = client
    return client


def correlation_id(request: Request) -> str:
    cid = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    return cid


# Rate limit handler removed - using custom implementation


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

# Security Headers middleware (CSP, HSTS, X-Frame-Options, etc.)
IS_PRODUCTION = ENVIRONMENT == "production"
app.add_middleware(
    SecurityHeadersMiddleware,
    is_production=IS_PRODUCTION,
    hsts_max_age=31536000,  # 1 year
    hsts_include_subdomains=True,
    frame_options="DENY",
    referrer_policy="strict-origin-when-cross-origin"
)


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


@app.on_event("startup")
async def startup():
    """Initialize Redis rate limiter on startup."""
    await redis_rate_limiter.connect()


@app.on_event("shutdown")
async def shutdown():
    """Close Redis connection on shutdown."""
    await redis_rate_limiter.close()


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


@app.get("/api/health")
async def api_health():
    """Compatibility probe for external monitors expecting '/api/health'.
    Returns same payload as '/health'.
    """
    return health_payload()


@app.get("/db/health")
async def db_health(request: Request):
    """Database health check - verifies all backend services can connect to their databases"""
    # Check all backend services' /db/health endpoints
    hierarchy_base = SERVICE_URLS["customer_hierarchy_v2"].rstrip("/")
    db_endpoints = {
        "user-service": f"{SERVICE_URLS['users']}/db/health",
        "order-service": f"{SERVICE_URLS['orders']}/db/health",
        "product-service": f"{SERVICE_URLS['products']}/db/health",
        "acceptance-service": f"{SERVICE_URLS['acceptance']}/db/health",
        "notification-service": f"{SERVICE_URLS['notifications']}/db/health",
        "supplier-service": f"{SERVICE_URLS['suppliers']}/db/health",
        "hierarchy-service": f"{hierarchy_base}/api/v2/health/ready",  # Customer hierarchy uses different path
    }
    
    client = await get_client(request)
    db_status = {}
    overall_healthy = True
    
    for service_name, db_url in db_endpoints.items():
        try:
            response = await client.get(db_url, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                db_status[service_name] = {
                    "status": "healthy",
                    "url": db_url,
                    "response_time_ms": round(response.elapsed.total_seconds() * 1000, 2),
                    "details": data.get("database", {}) if isinstance(data, dict) else {}
                }
            else:
                db_status[service_name] = {
                    "status": "unhealthy",
                    "url": db_url,
                    "error": f"HTTP {response.status_code}"
                }
                overall_healthy = False
        except Exception as e:
            db_status[service_name] = {
                "status": "unhealthy", 
                "url": db_url,
                "error": str(e)
            }
            overall_healthy = False
    
    return {
        "status": "healthy" if overall_healthy else "unhealthy",
        "service": "api-gateway",
        "check_type": "database",
        "services": db_status,
        "timestamp": datetime.utcnow().isoformat(),
        "summary": {
            "total": len(db_endpoints),
            "healthy": len([s for s in db_status.values() if s["status"] == "healthy"]),
            "unhealthy": len([s for s in db_status.values() if s["status"] != "healthy"])
        }
    }


@app.get("/ready")
async def ready(request: Request):
    """Enhanced readiness check that verifies downstream services"""
    base_health = health_payload()
    
    # Service health checks
    service_status = {}
    
    # List of services to check
    hierarchy_base = SERVICE_URLS["customer_hierarchy_v2"].rstrip("/")
    services_to_check = {
        "user-service": f"{SERVICE_URLS['users']}/health",
        "order-service": f"{SERVICE_URLS['orders']}/health",
        "product-service": f"{SERVICE_URLS['products']}/health",
        # acceptance service base already includes '/acceptance' suffix
        "acceptance-service": f"{SERVICE_URLS['acceptance']}/health",
        "notification-service": f"{SERVICE_URLS['notifications']}/health",
        "supplier-service": f"{SERVICE_URLS['suppliers']}/health",
        # Prefer '/api/v2/health', fallback to '/health' if service exposes it at root
        "hierarchy-service-primary": f"{hierarchy_base}/api/v2/health",
        "hierarchy-service-fallback": f"{hierarchy_base}/health",
    }
    
    client = await get_client(request)
    overall_healthy = True
    
    # Probe each endpoint; special handling: if hierarchy primary is healthy, we can ignore fallback errors
    hierarchy_ok = False
    for service_name, health_url in services_to_check.items():
        try:
            response = await client.get(health_url, timeout=5.0)
            if response.status_code == 200:
                service_status[service_name] = {"status": "healthy", "url": health_url, "response_time_ms": response.elapsed.total_seconds() * 1000}
                if service_name == "hierarchy-service-primary":
                    hierarchy_ok = True
            else:
                service_status[service_name] = {"status": "unhealthy", "url": health_url, "error": f"HTTP {response.status_code}"}
        except Exception as e:
            service_status[service_name] = {"status": "unhealthy", "url": health_url, "error": str(e)}

    # Derive overall health: tolerate hierarchy-fallback failure if primary succeeded
    overall_healthy = True
    for name, info in service_status.items():
        if name == "hierarchy-service-fallback" and hierarchy_ok:
            continue
        if info.get("status") != "healthy":
            overall_healthy = False
    
    # Summaries
    unhealthy = [name for name, info in service_status.items() if not (name == "hierarchy-service-fallback" and hierarchy_ok) and info.get("status") != "healthy"]
    errors = {name: info.get("error") for name, info in service_status.items() if info.get("status") != "healthy" and info.get("error")}

    return {
        **base_health,
        "status": "ready" if overall_healthy else "degraded",
        "use_v2_backends": USE_V2_BACKENDS,
        "configured_urls": {
            "user": SERVICE_URLS["users"],
            "order": SERVICE_URLS["orders"],
            "product": SERVICE_URLS["products"],
            "acceptance": SERVICE_URLS["acceptance"],
            "notification": SERVICE_URLS["notifications"],
            "customer_hierarchy_v2": SERVICE_URLS["customer_hierarchy_v2"],
            "supplier": SERVICE_URLS["suppliers"],
        },
        "services": service_status,
        "unhealthy": unhealthy,
        "errors": errors,
    }


@app.get("/service-map")
async def get_service_map():
    """診斷端點：返回當前Gateway配置的所有服務URL映射"""
    return {
        "environment": ENVIRONMENT,
        "service_urls": {
            "user_service": os.getenv("USER_SERVICE_URL", "NOT_CONFIGURED"),
            "order_service": os.getenv("ORDER_SERVICE_URL", "NOT_CONFIGURED"),
            "product_service": os.getenv("PRODUCT_SERVICE_URL", "NOT_CONFIGURED"),
            "acceptance_service": os.getenv("ACCEPTANCE_SERVICE_URL", "NOT_CONFIGURED"),
            "notification_service": os.getenv("NOTIFICATION_SERVICE_URL", "NOT_CONFIGURED"),
            "customer_hierarchy_service": os.getenv("CUSTOMER_HIERARCHY_SERVICE_URL", "NOT_CONFIGURED"),
            "supplier_service": os.getenv("SUPPLIER_SERVICE_URL", "NOT_CONFIGURED"),
        },
        "internal_service_map": SERVICE_URLS,
        "timestamp": datetime.utcnow().isoformat(),
        "version": APP_VERSION
    }


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
    
    
    # Support '/api/v2/*' path for Customer Hierarchy service
    if key == "v2":
        base = SERVICE_URLS["customer_hierarchy_v2"]
        remainder = "/" + "/".join(segments[2:]) if len(segments) > 2 else "/"
        # Be defensive: if base already contains '/api/v2', don't append again
        if base.rstrip("/").endswith("/api/v2"):
            final_url = base.rstrip("/") + remainder
        else:
            final_url = base.rstrip("/") + "/api/v2" + remainder
        return {"service": "customer_hierarchy_v2", "url": final_url}

    # Support '/api/v1/organizations/*' path for User Service organization listing
    if key == "v1":
        if len(segments) >= 3 and segments[2] == "organizations":
            base = SERVICE_URLS["users"]
            remainder = "/" + "/".join(segments[2:]) if len(segments) > 2 else "/"
            # Be defensive: if base already contains '/api/v1', don't append again
            if base.rstrip("/").endswith("/api/v1"):
                final_url = base.rstrip("/") + remainder
            else:
                final_url = base.rstrip("/") + "/api/v1" + remainder
            return {"service": "users", "url": final_url}
        return None

    entry = PROXY_MAPPING.get(key)
    if not entry:
        return None
    service_name, base, strip_n = entry.service, entry.base_url, entry.strip_segments
    remainder = "/" + "/".join(segments[strip_n:]) if len(segments) > strip_n else "/"
    return {"service": service_name, "url": base + remainder}


async def _proxy(request: Request, full_path: str) -> Response:
    # Basic protection: require Authorization for protected areas
    def _is_protected(p: str) -> bool:
        # Allow health check endpoints without auth
        if p == "/api/v2/hierarchy/tree" and request.url.query == "fast_mode=true":
            return False
        return any(p.startswith(prefix) for prefix in [
            "/api/orders", "/api/acceptance", "/api/notifications", "/api/users", "/api/v2"
        ])

    claims = None
    if _is_protected(full_path):
        auth = request.headers.get("authorization") or request.headers.get("Authorization")
        if not auth or not auth.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Missing bearer token")
        secret = os.getenv("JWT_SECRET") or os.getenv("USER_SERVICE_JWT_SECRET")
        if not secret:
            if ENVIRONMENT.lower() == "development":
                secret = "dev-jwt-secret-change-in-production"
                logger.warning("JWT_SECRET not set; using dev default. DO NOT USE IN PRODUCTION.")
            else:
                logger.error("JWT_SECRET not configured, cannot validate token")
                raise HTTPException(status_code=500, detail="Gateway JWT secret not configured")

        token = auth.split(" ", 1)[1].strip()
        try:
            claims = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_exp": True}
            )
            # Optional role enforcement
            if os.getenv("GATEWAY_ENFORCE_ROLES", "false").lower() == "true":
                role = claims.get("role")
                sub = claims.get("sub")
                org_id = claims.get("org_id") or claims.get("tenant_id")
                if not role or not sub or not org_id:
                    raise HTTPException(status_code=403, detail="Insufficient claims")

            # 驗證級別檢查
            user_verification_level = claims.get("verification_level", 0)
            required_level = None

            # 檢查端點是否需要特定驗證級別
            for endpoint_prefix, level in ENDPOINT_VERIFICATION_REQUIREMENTS.items():
                if full_path.startswith(endpoint_prefix):
                    required_level = level
                    break

            # 如果端點需要驗證級別，檢查用戶是否符合
            if required_level is not None and user_verification_level < required_level:
                logger.warning(
                    "verification_level_insufficient: path=%s, user_level=%s, required_level=%s, user_id=%s",
                    full_path,
                    user_verification_level,
                    required_level,
                    claims.get("sub"),
                )

                # 根據不同級別提供具體的錯誤訊息
                level_messages = {
                    1: "此功能需要驗證 Email",
                    2: "此功能需要驗證 Email 和手機號碼",
                    3: "此功能需要完整驗證（包含營業登記）",
                }

                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "insufficient_verification",
                        "message": level_messages.get(required_level, f"需要驗證級別 {required_level}"),
                        "current_level": user_verification_level,
                        "required_level": required_level,
                    }
                )
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

    info = _target_info(full_path)
    if not info:
        raise HTTPException(status_code=404, detail="Endpoint not found")

    method = request.method.upper()
    client = await get_client(request)

    # Prepare outgoing headers: forward most headers + correlation id
    headers = dict(request.headers)
    headers["X-Correlation-ID"] = request.state.correlation_id
    if claims:
        # Propagate user context to downstream services
        if claims.get("sub"): headers["X-User-Id"] = str(claims.get("sub"))
        if claims.get("org_id"): headers["X-Org-Id"] = str(claims.get("org_id"))
        if claims.get("role"): headers["X-User-Role"] = str(claims.get("role"))
        if claims.get("tenant_id"): headers["X-Tenant-Id"] = str(claims.get("tenant_id"))
        if claims.get("tenant_type"): headers["X-Tenant-Type"] = str(claims.get("tenant_type"))
        if claims.get("status"): headers["X-User-Status"] = str(claims.get("status"))
        if claims.get("verification_level") is not None:
            headers["X-Verification-Level"] = str(claims.get("verification_level"))
        perms = claims.get("permissions") or []
        if perms:
            headers["X-Permissions"] = ",".join([str(p) for p in perms])
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


async def _rate_limit_response(limit_result: Dict[str, Any], error_prefix: str) -> JSONResponse:
    """Build rate limit exceeded response"""
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": f"{error_prefix} Please try again in {limit_result['retry_after']} seconds.",
            "retry_after": limit_result["retry_after"],
        },
        headers={
            "X-RateLimit-Limit": str(limit_result["limit"]),
            "X-RateLimit-Remaining": str(limit_result["remaining"]),
            "X-RateLimit-Reset": str(limit_result["retry_after"]),
            "Retry-After": str(limit_result["retry_after"]),
        }
    )


async def _rate_limited_proxy(
    request: Request,
    rate_limit_key: str,
    proxy_path: str,
    error_prefix: str
) -> Response:
    """Apply rate limiting and proxy request"""
    client_ip = request.client.host if request.client else "unknown"
    limit_result = await redis_rate_limiter.check(client_ip, rate_limit_key)

    if not limit_result["allowed"]:
        return await _rate_limit_response(limit_result, error_prefix)

    return await _proxy(request, proxy_path)


# Dedicated auth endpoints with stricter rate limits
@app.api_route("/api/auth/login", methods=["POST"])
async def api_auth_login(request: Request):
    return await _rate_limited_proxy(
        request, "/api/auth/login", "/api/auth/login", "Too many login attempts."
    )


@app.api_route("/auth/login", methods=["POST"])
async def auth_login_alias(request: Request):
    return await _rate_limited_proxy(
        request, "/api/auth/login", "/auth/login", "Too many login attempts."
    )


@app.api_route("/api/auth/register", methods=["POST"])
async def api_auth_register(request: Request):
    return await _rate_limited_proxy(
        request, "/api/auth/register", "/api/auth/register", "Too many registration attempts."
    )


@app.api_route("/auth/register", methods=["POST"])
async def auth_register_alias(request: Request):
    return await _rate_limited_proxy(
        request, "/api/auth/register", "/auth/register", "Too many registration attempts."
    )


# Catch-all route for /api/* to proxy
@app.api_route("/api/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def api_proxy(full_path: str, request: Request):
    return await _proxy(request, "/api/" + full_path)


# Frontend compatibility: '/products/*' (without '/api' prefix)
@app.api_route("/products/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def products_alias(full_path: str, request: Request):
    # Rewrite '/products/x' -> '/api/products/x'
    return await _proxy(request, "/api/products/" + full_path)


# Frontend compatibility: '/suppliers' root path (without '/api' prefix)
@app.api_route("/suppliers", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def suppliers_root(request: Request):
    # Rewrite '/suppliers' -> '/api/suppliers'
    return await _proxy(request, "/api/suppliers")


# Frontend compatibility: '/suppliers/*' (without '/api' prefix)
@app.api_route("/suppliers/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def suppliers_alias(full_path: str, request: Request):
    # Rewrite '/suppliers/x' -> '/api/suppliers/x'
    return await _proxy(request, "/api/suppliers/" + full_path)


@app.get("/")
async def root():
    return {
        "message": "Orderly API Gateway (FastAPI)",
        "health": "/health",
    }
