"""Shared security headers middleware for Orderly FastAPI apps."""

import os
from typing import Callable, Iterable, Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add API security headers at the application edge."""

    def __init__(
        self,
        app,
        csp_policy: Optional[dict] = None,
        hsts_max_age: int = 31536000,
        hsts_include_subdomains: bool = True,
        hsts_preload: bool = False,
        frame_options: str = "DENY",
        content_type_options: str = "nosniff",
        xss_protection: str = "1; mode=block",
        referrer_policy: str = "strict-origin-when-cross-origin",
        permissions_policy: Optional[dict] = None,
        excluded_paths: Optional[Iterable[str]] = None,
        is_production: Optional[bool] = None,
    ):
        super().__init__(app)
        self.is_production = (
            os.getenv("ENVIRONMENT", "development") == "production"
            if is_production is None
            else is_production
        )
        self.csp_policy = csp_policy or self._default_csp()
        self.hsts_max_age = hsts_max_age
        self.hsts_include_subdomains = hsts_include_subdomains
        self.hsts_preload = hsts_preload
        self.frame_options = frame_options
        self.content_type_options = content_type_options
        self.xss_protection = xss_protection
        self.referrer_policy = referrer_policy
        self.permissions_policy = permissions_policy or self._default_permissions()
        self.excluded_paths = tuple(
            excluded_paths
            or (
                "/health",
                "/db/health",
                "/metrics",
                "/openapi.json",
                "/docs",
                "/redoc",
                "/live",
                "/ready",
            )
        )

    def _default_csp(self) -> dict:
        if self.is_production:
            return {
                "default-src": ["'none'"],
                "frame-ancestors": ["'none'"],
                "base-uri": ["'self'"],
                "form-action": ["'self'"],
            }
        return {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:", "https:", "http:"],
            "font-src": ["'self'", "https:", "data:"],
            "connect-src": ["'self'", "http://localhost:*", "ws://localhost:*"],
            "frame-ancestors": ["'self'"],
        }

    def _default_permissions(self) -> dict:
        return {
            "accelerometer": [],
            "camera": [],
            "geolocation": [],
            "gyroscope": [],
            "magnetometer": [],
            "microphone": [],
            "payment": ["self"],
            "usb": [],
        }

    def _build_csp_header(self) -> str:
        directives = []
        for directive, values in self.csp_policy.items():
            directives.append(f"{directive} {' '.join(values)}" if values else directive)
        return "; ".join(directives)

    def _build_hsts_header(self) -> str:
        parts = [f"max-age={self.hsts_max_age}"]
        if self.hsts_include_subdomains:
            parts.append("includeSubDomains")
        if self.hsts_preload:
            parts.append("preload")
        return "; ".join(parts)

    def _build_permissions_header(self) -> str:
        policies = []
        for feature, allowed in self.permissions_policy.items():
            if not allowed:
                policies.append(f"{feature}=()")
            elif allowed == ["self"]:
                policies.append(f"{feature}=(self)")
            else:
                origins = " ".join(f'"{origin}"' for origin in allowed)
                policies.append(f"{feature}=({origins})")
        return ", ".join(policies)

    def _should_skip(self, path: str) -> bool:
        return any(path.startswith(excluded) for excluded in self.excluded_paths)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        if self._should_skip(request.url.path):
            return response

        response.headers["Content-Security-Policy"] = self._build_csp_header()
        if self.is_production or request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = self._build_hsts_header()
        response.headers["X-Frame-Options"] = self.frame_options
        response.headers["X-Content-Type-Options"] = self.content_type_options
        response.headers["X-XSS-Protection"] = self.xss_protection
        response.headers["Referrer-Policy"] = self.referrer_policy
        response.headers["Permissions-Policy"] = self._build_permissions_header()
        response.headers.setdefault("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
        response.headers.setdefault("Pragma", "no-cache")
        response.headers.setdefault("Expires", "0")
        return response


class SecurityHeadersConfig:
    """Security header presets."""

    @staticmethod
    def for_api() -> dict:
        return {
            "csp_policy": {
                "default-src": ["'none'"],
                "frame-ancestors": ["'none'"],
                "base-uri": ["'self'"],
                "form-action": ["'self'"],
            },
            "frame_options": "DENY",
        }
