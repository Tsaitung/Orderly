from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


logger = logging.getLogger("orderly.errors")


# ============================================================================
# Orderly 統一異常類別
# ============================================================================

class OrderlyException(Exception):
    """
    Orderly 專案的基礎異常類別

    所有服務應使用此類別或其子類別來拋出業務邏輯異常，
    確保錯誤響應格式統一。
    """

    def __init__(
        self,
        message: str,
        error_code: str = "ORDERLY_ERROR",
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """轉換為 API 響應格式"""
        result = {
            "code": self.error_code,
            "message": self.message,
        }
        if self.details:
            result["details"] = self.details
        return result


class NotFoundError(OrderlyException):
    """資源未找到異常"""

    def __init__(self, resource: str, identifier: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"{resource} not found: {identifier}",
            error_code="NOT_FOUND",
            status_code=404,
            details=details
        )


class ValidationError(OrderlyException):
    """驗證失敗異常"""

    def __init__(self, message: str, field: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        error_details = details or {}
        if field:
            error_details["field"] = field
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=422,
            details=error_details
        )


class AuthenticationError(OrderlyException):
    """認證失敗異常"""

    def __init__(self, message: str = "Authentication required", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            status_code=401,
            details=details
        )


class AuthorizationError(OrderlyException):
    """授權失敗異常"""

    def __init__(self, message: str = "Permission denied", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            status_code=403,
            details=details
        )


class ConflictError(OrderlyException):
    """資源衝突異常（如重複建立）"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="CONFLICT",
            status_code=409,
            details=details
        )


class BusinessRuleError(OrderlyException):
    """業務規則違反異常"""

    def __init__(self, message: str, rule: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        error_details = details or {}
        if rule:
            error_details["rule"] = rule
        super().__init__(
            message=message,
            error_code="BUSINESS_RULE_VIOLATION",
            status_code=400,
            details=error_details
        )


class ExternalServiceError(OrderlyException):
    """外部服務調用失敗異常"""

    def __init__(self, service: str, message: str, details: Optional[Dict[str, Any]] = None):
        error_details = details or {}
        error_details["service"] = service
        super().__init__(
            message=message,
            error_code="EXTERNAL_SERVICE_ERROR",
            status_code=502,
            details=error_details
        )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(OrderlyException)
    async def orderly_exception_handler(request: Request, exc: OrderlyException):
        """處理 Orderly 自定義異常"""
        logger.warning(
            "Orderly exception: %s (code=%s, status=%d)",
            exc.message,
            exc.error_code,
            exc.status_code,
            extra={"details": exc.details}
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": exc.to_dict(),
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {"code": exc.status_code, "message": exc.detail},
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": {"code": 422, "message": "Validation error", "details": exc.errors()},
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {"code": 500, "message": "Internal server error"},
            },
        )

