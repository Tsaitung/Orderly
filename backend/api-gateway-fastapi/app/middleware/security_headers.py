"""
安全頭部中間件

提供：
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy
"""

import os
from typing import Optional, List, Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import structlog

logger = structlog.get_logger()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """安全頭部中間件"""

    def __init__(
        self,
        app,
        csp_policy: Optional[dict] = None,
        hsts_max_age: int = 31536000,  # 1 年
        hsts_include_subdomains: bool = True,
        hsts_preload: bool = False,
        frame_options: str = "DENY",
        content_type_options: str = "nosniff",
        xss_protection: str = "1; mode=block",
        referrer_policy: str = "strict-origin-when-cross-origin",
        permissions_policy: Optional[dict] = None,
        excluded_paths: Optional[List[str]] = None,
        is_production: bool = None
    ):
        """
        初始化安全頭部中間件

        Args:
            csp_policy: CSP 策略配置
            hsts_max_age: HSTS max-age（秒）
            hsts_include_subdomains: 是否包含子網域
            hsts_preload: 是否啟用 preload
            frame_options: X-Frame-Options 值
            content_type_options: X-Content-Type-Options 值
            xss_protection: X-XSS-Protection 值
            referrer_policy: Referrer-Policy 值
            permissions_policy: Permissions-Policy 配置
            excluded_paths: 排除的路徑
            is_production: 是否為生產環境
        """
        super().__init__(app)

        self.is_production = is_production if is_production is not None else (
            os.getenv("ENVIRONMENT", "development") == "production"
        )

        # CSP 策略
        self.csp_policy = csp_policy or self._get_default_csp()

        # HSTS
        self.hsts_max_age = hsts_max_age
        self.hsts_include_subdomains = hsts_include_subdomains
        self.hsts_preload = hsts_preload

        # 其他頭部
        self.frame_options = frame_options
        self.content_type_options = content_type_options
        self.xss_protection = xss_protection
        self.referrer_policy = referrer_policy

        # Permissions Policy
        self.permissions_policy = permissions_policy or self._get_default_permissions()

        # 排除的路徑
        self.excluded_paths = excluded_paths or [
            "/health",
            "/db/health",
            "/metrics",
            "/openapi.json",
            "/docs",
            "/redoc"
        ]

    def _get_default_csp(self) -> dict:
        """取得預設 CSP 策略"""
        if self.is_production:
            return {
                "default-src": ["'self'"],
                "script-src": ["'self'", "'unsafe-inline'"],  # 如需 inline script
                "style-src": ["'self'", "'unsafe-inline'"],  # 如需 inline style
                "img-src": ["'self'", "data:", "https:"],
                "font-src": ["'self'", "https://fonts.gstatic.com"],
                "connect-src": ["'self'", "https://api.orderly.com.tw"],
                "frame-ancestors": ["'none'"],
                "base-uri": ["'self'"],
                "form-action": ["'self'"],
                "upgrade-insecure-requests": []
            }
        else:
            # 開發環境較寬鬆
            return {
                "default-src": ["'self'"],
                "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                "style-src": ["'self'", "'unsafe-inline'"],
                "img-src": ["'self'", "data:", "https:", "http:"],
                "font-src": ["'self'", "https:", "data:"],
                "connect-src": ["'self'", "http://localhost:*", "ws://localhost:*"],
                "frame-ancestors": ["'self'"]
            }

    def _get_default_permissions(self) -> dict:
        """取得預設 Permissions Policy"""
        return {
            "accelerometer": [],
            "camera": [],
            "geolocation": [],
            "gyroscope": [],
            "magnetometer": [],
            "microphone": [],
            "payment": ["self"],  # 允許支付 API
            "usb": []
        }

    def _build_csp_header(self) -> str:
        """構建 CSP 頭部字串"""
        directives = []

        for directive, values in self.csp_policy.items():
            if values:
                directives.append(f"{directive} {' '.join(values)}")
            else:
                directives.append(directive)

        return "; ".join(directives)

    def _build_hsts_header(self) -> str:
        """構建 HSTS 頭部字串"""
        parts = [f"max-age={self.hsts_max_age}"]

        if self.hsts_include_subdomains:
            parts.append("includeSubDomains")

        if self.hsts_preload:
            parts.append("preload")

        return "; ".join(parts)

    def _build_permissions_header(self) -> str:
        """構建 Permissions-Policy 頭部字串"""
        policies = []

        for feature, allowed in self.permissions_policy.items():
            if not allowed:
                policies.append(f"{feature}=()")
            elif allowed == ["self"]:
                policies.append(f"{feature}=(self)")
            else:
                origins = " ".join(f'"{o}"' for o in allowed)
                policies.append(f"{feature}=({origins})")

        return ", ".join(policies)

    def _should_skip(self, path: str) -> bool:
        """檢查是否應跳過此路徑"""
        for excluded in self.excluded_paths:
            if path.startswith(excluded):
                return True
        return False

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """處理請求並添加安全頭部"""
        response = await call_next(request)

        # 跳過特定路徑
        if self._should_skip(request.url.path):
            return response

        # Content Security Policy
        response.headers["Content-Security-Policy"] = self._build_csp_header()

        # HSTS（僅 HTTPS 或生產環境）
        if self.is_production or request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = self._build_hsts_header()

        # X-Frame-Options（防止 Clickjacking）
        response.headers["X-Frame-Options"] = self.frame_options

        # X-Content-Type-Options（防止 MIME 類型嗅探）
        response.headers["X-Content-Type-Options"] = self.content_type_options

        # X-XSS-Protection（舊瀏覽器的 XSS 過濾）
        response.headers["X-XSS-Protection"] = self.xss_protection

        # Referrer-Policy
        response.headers["Referrer-Policy"] = self.referrer_policy

        # Permissions-Policy
        response.headers["Permissions-Policy"] = self._build_permissions_header()

        # Cache-Control（API 回應不快取）
        if not response.headers.get("Cache-Control"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

        return response


class SecurityHeadersConfig:
    """安全頭部配置工具類"""

    @staticmethod
    def for_api() -> dict:
        """取得 API 服務的配置"""
        return {
            "csp_policy": {
                "default-src": ["'none'"],
                "frame-ancestors": ["'none'"],
                "base-uri": ["'self'"],
                "form-action": ["'self'"]
            },
            "frame_options": "DENY"
        }

    @staticmethod
    def for_web_app(allowed_origins: List[str] = None) -> dict:
        """取得 Web 應用的配置"""
        connect_src = ["'self'"]
        if allowed_origins:
            connect_src.extend(allowed_origins)

        return {
            "csp_policy": {
                "default-src": ["'self'"],
                "script-src": ["'self'"],
                "style-src": ["'self'", "'unsafe-inline'"],
                "img-src": ["'self'", "data:", "https:"],
                "font-src": ["'self'", "https://fonts.gstatic.com"],
                "connect-src": connect_src,
                "frame-ancestors": ["'self'"],
                "base-uri": ["'self'"],
                "form-action": ["'self'"]
            },
            "frame_options": "SAMEORIGIN"
        }

    @staticmethod
    def with_google_analytics() -> dict:
        """取得包含 Google Analytics 的配置"""
        return {
            "csp_policy": {
                "default-src": ["'self'"],
                "script-src": [
                    "'self'",
                    "https://www.googletagmanager.com",
                    "https://www.google-analytics.com"
                ],
                "img-src": [
                    "'self'",
                    "data:",
                    "https://www.google-analytics.com",
                    "https://www.googletagmanager.com"
                ],
                "connect-src": [
                    "'self'",
                    "https://www.google-analytics.com",
                    "https://analytics.google.com"
                ]
            }
        }
