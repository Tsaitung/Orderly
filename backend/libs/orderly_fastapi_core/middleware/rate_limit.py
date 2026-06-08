"""Redis-backed rate limiting middleware."""

from typing import Any, Dict, Iterable, Optional

import structlog
from redis import asyncio as aioredis
from starlette import status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = structlog.get_logger()


class RedisRateLimiter:
    """Distributed fixed-window rate limiter using Redis."""

    LIMITS = {
        "/api/auth/login": {"max": 5, "window": 900},
        "/auth/login": {"max": 5, "window": 900},
        "/api/auth/register": {"max": 3, "window": 3600},
        "/auth/register": {"max": 3, "window": 3600},
        "/api/auth/forgot-password": {"max": 3, "window": 3600},
        "/auth/forgot-password": {"max": 3, "window": 3600},
        "/api/auth/reset-password": {"max": 5, "window": 900},
        "/auth/reset-password": {"max": 5, "window": 900},
    }
    DEFAULT_LIMIT = {"max": 100, "window": 60}

    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis: Optional[aioredis.Redis] = None

    async def connect(self) -> None:
        try:
            self.redis = await aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            await self.redis.ping()
            logger.info("redis_rate_limiter_connected", redis_url=self.redis_url)
        except Exception as exc:
            logger.error("redis_rate_limiter_connection_failed", error=str(exc))
            self.redis = None

    async def close(self) -> None:
        if self.redis:
            await self.redis.close()

    def get_limit_config(self, endpoint: str) -> Dict[str, int]:
        return self.LIMITS.get(endpoint, self.DEFAULT_LIMIT)

    async def check(self, key_identifier: str, endpoint: str) -> Dict[str, Any]:
        if not self.redis:
            return {"allowed": True, "remaining": 999, "retry_after": 0, "limit": 999, "window": 60}

        limit_config = self.get_limit_config(endpoint)
        max_requests = limit_config["max"]
        window_seconds = limit_config["window"]
        redis_key = f"ratelimit:{endpoint}:{key_identifier}"

        try:
            current = await self.redis.get(redis_key)
            if current is None:
                await self.redis.setex(redis_key, window_seconds, "1")
                return {
                    "allowed": True,
                    "remaining": max_requests - 1,
                    "retry_after": 0,
                    "limit": max_requests,
                    "window": window_seconds,
                }

            count = int(current)
            if count >= max_requests:
                retry_after = max(0, await self.redis.ttl(redis_key))
                return {
                    "allowed": False,
                    "remaining": 0,
                    "retry_after": retry_after,
                    "limit": max_requests,
                    "window": window_seconds,
                }

            await self.redis.incr(redis_key)
            return {
                "allowed": True,
                "remaining": max_requests - count - 1,
                "retry_after": 0,
                "limit": max_requests,
                "window": window_seconds,
            }
        except Exception as exc:
            logger.error("rate_limit_check_error", endpoint=endpoint, key=key_identifier, error=str(exc))
            return {"allowed": True, "remaining": 999, "retry_after": 0, "limit": 999, "window": 60}


class RedisRateLimitMiddleware(BaseHTTPMiddleware):
    """Apply Redis rate limits at the FastAPI edge, failing open when Redis is down."""

    def __init__(
        self,
        app,
        redis_url: str,
        excluded_paths: Optional[Iterable[str]] = None,
    ):
        super().__init__(app)
        self.limiter = RedisRateLimiter(redis_url)
        self.excluded_paths = tuple(
            excluded_paths
            or (
                "/health",
                "/db/health",
                "/ready",
                "/live",
                "/metrics",
                "/docs",
                "/redoc",
                "/openapi.json",
            )
        )
        self._connect_attempted = False

    async def _ensure_connected(self) -> None:
        if not self._connect_attempted:
            self._connect_attempted = True
            await self.limiter.connect()

    def _should_skip(self, request: Request) -> bool:
        if request.method == "OPTIONS":
            return True
        return any(request.url.path.startswith(path) for path in self.excluded_paths)

    def _client_identifier(self, request: Request) -> str:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",", 1)[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        return request.client.host if request.client else "unknown"

    async def dispatch(self, request: Request, call_next):
        if self._should_skip(request):
            return await call_next(request)

        await self._ensure_connected()
        endpoint = request.url.path.rstrip("/") or "/"
        result = await self.limiter.check(self._client_identifier(request), endpoint)
        if not result["allowed"]:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "success": False,
                    "error": {"code": 429, "message": "Rate limit exceeded"},
                },
                headers={
                    "Retry-After": str(result["retry_after"]),
                    "X-RateLimit-Limit": str(result["limit"]),
                    "X-RateLimit-Remaining": "0",
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(result["limit"])
        response.headers["X-RateLimit-Remaining"] = str(result["remaining"])
        return response
