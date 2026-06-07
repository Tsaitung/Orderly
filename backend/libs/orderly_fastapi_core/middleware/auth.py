"""
統一的 JWT 驗證中介層
"""

import logging
from typing import Optional, Dict, Any, Iterable, Mapping, Set
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from jose import jwt, JWTError, ExpiredSignatureError

from orderly_fastapi_core import UnifiedSettings, get_settings

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)

DEFAULT_PUBLIC_PATHS: Set[str] = {
    "/",
    "/health",
    "/health/detailed",
    "/db/health",
    "/db/info",
    "/ready",
    "/live",
    "/metrics",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/docs",
    "/api/redoc",
    "/api/openapi.json",
    # Auth public endpoints
    "/auth/register",
    "/auth/login",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/refresh",
    "/auth/oauth/line/callback",
    "/auth/oauth/google/callback",
}


class AuthMiddleware(BaseHTTPMiddleware):
    """
    驗證 JWT 並將使用者上下文寫入 request.state
    """

    def __init__(
        self,
        app,
        settings: Optional[UnifiedSettings] = None,
        public_paths: Optional[Iterable[str]] = None,
        verification_requirements: Optional[Mapping[str, int]] = None,
    ):
        super().__init__(app)
        self.settings = settings or get_settings()
        self.public_paths: Set[str] = set(public_paths) if public_paths else set(DEFAULT_PUBLIC_PATHS)
        self.verification_requirements = dict(verification_requirements or {})

    def _is_public(self, path: str) -> bool:
        if path in self.public_paths:
            return True
        # Treat docs and OpenAPI paths as public
        return (
            path.startswith("/docs")
            or path.startswith("/redoc")
            or path.endswith("/openapi.json")
            or path.startswith("/api/docs")
            or path.startswith("/api/redoc")
            or path.endswith("/api/openapi.json")
        )

    def _required_verification_level(self, path: str) -> Optional[int]:
        required_level: Optional[int] = None
        matched_prefix_length = -1
        for prefix, level in self.verification_requirements.items():
            if path == prefix or path.startswith(prefix.rstrip("/") + "/"):
                if len(prefix) > matched_prefix_length:
                    matched_prefix_length = len(prefix)
                    required_level = level
        return required_level

    def _payload_verification_level(self, payload: Dict[str, Any]) -> int:
        value = payload.get("verification_level", payload.get("verificationLevel", 0))
        try:
            return int(value or 0)
        except (TypeError, ValueError):
            return 0

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Public routes and explicitly disabled auth
        if self._is_public(path) or self.settings.disable_auth:
            return await call_next(request)

        credentials = await bearer_scheme(request)
        if credentials is None or credentials.scheme.lower() != "bearer":
            # MUST return, not raise: an HTTPException raised inside a
            # BaseHTTPMiddleware.dispatch is not handled by FastAPI's exception
            # handlers and surfaces as a 500. Returning yields a proper 401.
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"success": False, "error": {"code": 401, "message": "Missing bearer token"}},
            )

        token = credentials.credentials
        try:
            payload = jwt.decode(
                token,
                self.settings.jwt_secret,
                algorithms=[self.settings.jwt_algorithm],
                options={"verify_exp": True},
            )
        except ExpiredSignatureError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"success": False, "error": {"code": 401, "message": "Token has expired"}},
            )
        except JWTError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"success": False, "error": {"code": 401, "message": "Invalid token"}},
            )

        # Attach user context to request.state
        request.state.user = payload
        request.state.user_id = payload.get("sub")
        request.state.tenant_id = payload.get("tenant_id") or payload.get("org_id")
        request.state.permissions = payload.get("permissions", [])

        required_level = self._required_verification_level(path)
        if required_level is not None and self._payload_verification_level(payload) < required_level:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "success": False,
                    "error": {
                        "code": 403,
                        "message": f"Verification level {required_level} required",
                    },
                },
            )

        return await call_next(request)
