"""
Enhanced Error Handling Middleware
Provides comprehensive error handling with security considerations
"""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import traceback
import uuid
from typing import Any, Dict
from datetime import datetime

logger = logging.getLogger(__name__)

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Enhanced error handling with security and logging"""
    
    # Error messages that should never be exposed to users
    SENSITIVE_PATTERNS = [
        'password', 'token', 'secret', 'key', 'credential',
        'authorization', 'bearer', 'api_key', 'private'
    ]
    
    async def dispatch(self, request: Request, call_next):
        # Generate correlation ID for request tracking
        correlation_id = str(uuid.uuid4())
        request.state.correlation_id = correlation_id
        
        try:
            response = await call_next(request)
            return response
        
        except HTTPException as e:
            # Handle known HTTP exceptions
            return await self._handle_http_exception(e, correlation_id)
        
        except ValueError as e:
            # Handle validation errors
            return await self._handle_validation_error(e, correlation_id)
        
        except Exception as e:
            # Handle unexpected errors
            return await self._handle_unexpected_error(e, correlation_id, request)
    
    async def _handle_http_exception(
        self, 
        exc: HTTPException, 
        correlation_id: str
    ) -> JSONResponse:
        """Handle HTTP exceptions with proper logging"""
        
        logger.warning(
            f"HTTP Exception: {exc.status_code}",
            extra={
                "correlation_id": correlation_id,
                "status_code": exc.status_code,
                "detail": exc.detail
            }
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "message": self._sanitize_message(str(exc.detail)),
                    "type": "http_error",
                    "correlation_id": correlation_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        )
    
    async def _handle_validation_error(
        self, 
        exc: ValueError, 
        correlation_id: str
    ) -> JSONResponse:
        """Handle validation errors"""
        
        logger.warning(
            f"Validation Error",
            extra={
                "correlation_id": correlation_id,
                "error": str(exc)
            }
        )
        
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "message": "Invalid input provided",
                    "type": "validation_error",
                    "correlation_id": correlation_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        )
    
    async def _handle_unexpected_error(
        self, 
        exc: Exception, 
        correlation_id: str,
        request: Request
    ) -> JSONResponse:
        """Handle unexpected errors with full logging"""
        
        # Log full error details internally
        logger.error(
            f"Unexpected error occurred",
            extra={
                "correlation_id": correlation_id,
                "error": str(exc),
                "traceback": traceback.format_exc(),
                "path": request.url.path,
                "method": request.method
            }
        )
        
        # Return generic error to user
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "message": "An internal error occurred. Please try again later.",
                    "type": "internal_error",
                    "correlation_id": correlation_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        )
    
    def _sanitize_message(self, message: str) -> str:
        """Remove sensitive information from error messages"""
        
        message_lower = message.lower()
        
        for pattern in self.SENSITIVE_PATTERNS:
            if pattern in message_lower:
                return "An error occurred processing your request"
        
        return message

class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Validate incoming requests for security"""
    
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB
    
    async def dispatch(self, request: Request, call_next):
        # Check content length
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.MAX_CONTENT_LENGTH:
            return JSONResponse(
                status_code=413,
                content={
                    "error": {
                        "message": "Request entity too large",
                        "type": "validation_error"
                    }
                }
            )
        
        # Validate content type for POST/PUT/PATCH
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            if not content_type.startswith(("application/json", "multipart/form-data")):
                return JSONResponse(
                    status_code=415,
                    content={
                        "error": {
                            "message": "Unsupported media type",
                            "type": "validation_error"
                        }
                    }
                )
        
        response = await call_next(request)
        return response