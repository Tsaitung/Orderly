"""
Logging middleware for Customer Hierarchy Service
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import time
import uuid
import structlog
from typing import Optional

logger = structlog.get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Request/response logging middleware with correlation ID
    """
    
    def __init__(self, app):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request with logging"""
        
        # Generate correlation ID
        correlation_id = str(uuid.uuid4())
        request.state.correlation_id = correlation_id
        
        # Start timing
        start_time = time.time()
        
        # Extract user information if available
        user_id = getattr(request.state, "user_id", None)
        
        # Log incoming request
        logger.info(
            "Request started",
            correlation_id=correlation_id,
            method=request.method,
            path=request.url.path,
            query_params=str(request.query_params) if request.query_params else None,
            user_id=user_id,
            client_ip=self.get_client_ip(request),
            user_agent=request.headers.get("user-agent")
        )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate response time
            process_time = time.time() - start_time
            
            # Add correlation ID to response headers
            response.headers["X-Correlation-ID"] = correlation_id
            response.headers["X-Process-Time"] = str(process_time)
            
            # Log successful response
            logger.info(
                "Request completed",
                correlation_id=correlation_id,
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                process_time=process_time,
                user_id=user_id
            )
            
            return response
            
        except Exception as e:
            # Calculate response time for errors
            process_time = time.time() - start_time
            
            # Log error
            logger.error(
                "Request failed",
                correlation_id=correlation_id,
                method=request.method,
                path=request.url.path,
                error=str(e),
                error_type=type(e).__name__,
                process_time=process_time,
                user_id=user_id,
                exc_info=True
            )
            
            raise
    
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        
        # Check for forwarded headers (when behind proxy/load balancer)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first one
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        if hasattr(request.client, "host"):
            return request.client.host
        
        return "unknown"


def get_correlation_id(request: Request) -> Optional[str]:
    """Get correlation ID from request state"""
    return getattr(request.state, "correlation_id", None)


def log_business_event(
    event_type: str,
    entity_type: str,
    entity_id: str,
    action: str,
    user_id: str,
    correlation_id: Optional[str] = None,
    **additional_data
):
    """Log business events for audit and analytics"""
    
    logger.info(
        "Business event",
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        user_id=user_id,
        correlation_id=correlation_id,
        **additional_data
    )


def log_performance_metric(
    operation: str,
    duration: float,
    entity_count: Optional[int] = None,
    correlation_id: Optional[str] = None,
    **additional_data
):
    """Log performance metrics"""
    
    logger.info(
        "Performance metric",
        operation=operation,
        duration=duration,
        entity_count=entity_count,
        correlation_id=correlation_id,
        **additional_data
    )