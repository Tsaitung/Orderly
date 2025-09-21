"""
Error handling middleware for Customer Hierarchy Service
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from sqlalchemy.exc import IntegrityError, NoResultFound
from pydantic import ValidationError
import time
import structlog
from typing import Dict, Any

logger = structlog.get_logger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    Centralized error handling middleware
    """
    
    def __init__(self, app):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request with error handling"""
        
        try:
            return await call_next(request)
            
        except HTTPException:
            # Re-raise HTTP exceptions to be handled by FastAPI
            raise
            
        except ValidationError as e:
            # Pydantic validation errors
            logger.warning(
                "Validation error occurred",
                error=str(e),
                path=request.url.path,
                method=request.method
            )
            
            return JSONResponse(
                status_code=422,
                content={
                    "error": {
                        "type": "ValidationError",
                        "status_code": 422,
                        "detail": "Validation failed",
                        "validation_errors": e.errors(),
                        "path": request.url.path,
                        "timestamp": str(time.time())
                    }
                }
            )
        
        except IntegrityError as e:
            # Database integrity errors (unique constraints, foreign keys, etc.)
            logger.warning(
                "Database integrity error",
                error=str(e),
                path=request.url.path,
                method=request.method
            )
            
            # Parse common integrity errors
            error_detail = self.parse_integrity_error(str(e))
            
            return JSONResponse(
                status_code=409,
                content={
                    "error": {
                        "type": "IntegrityError",
                        "status_code": 409,
                        "detail": error_detail,
                        "path": request.url.path,
                        "timestamp": str(time.time())
                    }
                }
            )
        
        except NoResultFound as e:
            # SQLAlchemy NoResultFound errors
            logger.warning(
                "Resource not found",
                error=str(e),
                path=request.url.path,
                method=request.method
            )
            
            return JSONResponse(
                status_code=404,
                content={
                    "error": {
                        "type": "NotFound",
                        "status_code": 404,
                        "detail": "Resource not found",
                        "path": request.url.path,
                        "timestamp": str(time.time())
                    }
                }
            )
        
        except ValueError as e:
            # Business logic errors
            logger.warning(
                "Business logic error",
                error=str(e),
                path=request.url.path,
                method=request.method
            )
            
            return JSONResponse(
                status_code=400,
                content={
                    "error": {
                        "type": "BusinessLogicError",
                        "status_code": 400,
                        "detail": str(e),
                        "path": request.url.path,
                        "timestamp": str(time.time())
                    }
                }
            )
        
        except Exception as e:
            # Unhandled exceptions
            logger.error(
                "Unhandled exception in error middleware",
                error=str(e),
                error_type=type(e).__name__,
                path=request.url.path,
                method=request.method,
                exc_info=True
            )
            
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "type": "InternalServerError",
                        "status_code": 500,
                        "detail": "An unexpected error occurred",
                        "path": request.url.path,
                        "timestamp": str(time.time())
                    }
                }
            )
    
    def parse_integrity_error(self, error_message: str) -> str:
        """Parse common database integrity errors into user-friendly messages"""
        
        error_lower = error_message.lower()
        
        # Unique constraint violations
        if "unique constraint" in error_lower or "duplicate key" in error_lower:
            if "tax_id" in error_lower:
                return "Tax ID already exists. Please use a different tax ID."
            elif "code" in error_lower:
                return "Code already exists. Please use a different code."
            elif "email" in error_lower:
                return "Email already exists. Please use a different email."
            else:
                return "This record already exists. Please check for duplicates."
        
        # Foreign key violations
        elif "foreign key constraint" in error_lower or "foreign key violation" in error_lower:
            if "group_id" in error_lower:
                return "Referenced group does not exist."
            elif "company_id" in error_lower:
                return "Referenced company does not exist."
            elif "location_id" in error_lower:
                return "Referenced location does not exist."
            else:
                return "Referenced record does not exist."
        
        # Check constraint violations
        elif "check constraint" in error_lower:
            if "tax_id" in error_lower:
                return "Invalid tax ID format. Please check the tax ID format."
            elif "phone" in error_lower:
                return "Invalid phone number format."
            elif "budget" in error_lower or "amount" in error_lower:
                return "Invalid amount. Amount must be positive."
            else:
                return "Data validation failed. Please check your input."
        
        # Not null violations
        elif "null value" in error_lower or "not null" in error_lower:
            return "Required field is missing. Please provide all required information."
        
        # Default message for other integrity errors
        else:
            return "Data integrity constraint violated. Please check your input."


def create_error_response(
    status_code: int,
    error_type: str,
    detail: str,
    path: str,
    extra_data: Dict[str, Any] = None
) -> JSONResponse:
    """Create standardized error response"""
    
    error_content = {
        "error": {
            "type": error_type,
            "status_code": status_code,
            "detail": detail,
            "path": path,
            "timestamp": str(time.time())
        }
    }
    
    if extra_data:
        error_content["error"].update(extra_data)
    
    return JSONResponse(
        status_code=status_code,
        content=error_content
    )