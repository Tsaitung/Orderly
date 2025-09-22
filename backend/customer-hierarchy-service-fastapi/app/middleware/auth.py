"""
Authentication middleware for Customer Hierarchy Service
"""

from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import jwt
from typing import Optional, Dict, Any
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)
security = HTTPBearer(auto_error=False)


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Authentication middleware for JWT token validation
    """
    
    # Public endpoints that don't require authentication
    PUBLIC_PATHS = {
        "/health",
        "/health/detailed", 
        "/ready",
        "/live",
        "/metrics",
        "/",
        "/docs",
        "/redoc",
        "/openapi.json"
    }
    
    def __init__(self, app):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request with authentication"""
        
        # Skip authentication for public paths and API docs
        if (request.url.path in self.PUBLIC_PATHS or 
            request.url.path.startswith("/docs") or
            request.url.path.startswith("/redoc") or
            request.url.path.endswith("/openapi.json")):
            return await call_next(request)
        
        # Extract and validate JWT token
        try:
            user_info = await self.authenticate_request(request)
            if user_info:
                # Add user information to request state
                request.state.user = user_info
                request.state.user_id = user_info.get("sub")
                request.state.user_permissions = user_info.get("permissions", [])
                
                # Add hierarchy context headers
                await self.add_hierarchy_context(request, user_info)
            else:
                # For development/testing, allow requests without auth
                if settings.environment == "development":
                    logger.debug("No auth token provided, using dev-user in development mode")
                    dev_user_info = {"sub": "dev-user", "permissions": ["admin"]}
                    request.state.user = dev_user_info
                    request.state.user_id = "dev-user"
                    request.state.user_permissions = ["admin"]
                    # Add default hierarchy context for dev user
                    await self.add_hierarchy_context(request, dev_user_info)
                else:
                    logger.warning("Authentication required but no token provided", path=request.url.path)
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Authentication required"
                    )
                    
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except Exception as e:
            logger.error("Authentication error", error=str(e), path=request.url.path, method=request.method)
            # In development, be more lenient
            if settings.environment == "development":
                logger.warning("Auth error in development, falling back to dev-user", error=str(e))
                dev_user_info = {"sub": "dev-user", "permissions": ["admin"]}
                request.state.user = dev_user_info
                request.state.user_id = "dev-user"
                request.state.user_permissions = ["admin"]
                await self.add_hierarchy_context(request, dev_user_info)
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication"
                )
        
        return await call_next(request)
    
    async def authenticate_request(self, request: Request) -> Optional[Dict[str, Any]]:
        """Extract and validate JWT token from request"""
        
        # Get authorization header
        authorization = request.headers.get("Authorization")
        if not authorization:
            return None
        
        # Extract token
        try:
            scheme, token = authorization.split()
            if scheme.lower() != "bearer":
                return None
        except ValueError:
            return None
        
        # Validate JWT token
        try:
            payload = jwt.decode(
                token,
                settings.secret_key,
                algorithms=["HS256"],
                options={"verify_exp": True}
            )
            
            logger.debug(
                "Token validated successfully",
                user_id=payload.get("sub"),
                permissions=payload.get("permissions", [])
            )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Expired token provided")
            # In development, don't fail on expired tokens
            if settings.environment == "development":
                logger.debug("Ignoring expired token in development mode")
                return None
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            logger.warning("Invalid token provided", error=str(e))
            # In development, don't fail on invalid tokens
            if settings.environment == "development":
                logger.debug("Ignoring invalid token in development mode")
                return None
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    async def add_hierarchy_context(self, request: Request, user_info: Dict[str, Any]):
        """Add hierarchy context to request headers"""
        
        # Extract hierarchy information from user claims
        hierarchy_scope = user_info.get("hierarchy_scope", {})
        
        # Add hierarchy context to request state
        request.state.hierarchy_context = {
            "group_ids": hierarchy_scope.get("group_ids", []),
            "company_ids": hierarchy_scope.get("company_ids", []),
            "location_ids": hierarchy_scope.get("location_ids", []),
            "unit_ids": hierarchy_scope.get("unit_ids", []),
            "scope_level": hierarchy_scope.get("level", "unit"),  # group, company, location, unit
            "permissions": user_info.get("permissions", [])
        }
        
        logger.debug(
            "Hierarchy context added",
            user_id=user_info.get("sub"),
            scope_level=hierarchy_scope.get("level", "unit"),
            group_count=len(hierarchy_scope.get("group_ids", [])),
            company_count=len(hierarchy_scope.get("company_ids", [])),
            location_count=len(hierarchy_scope.get("location_ids", [])),
            unit_count=len(hierarchy_scope.get("unit_ids", []))
        )


def get_current_user(request: Request) -> Dict[str, Any]:
    """Get current user from request state"""
    if not hasattr(request.state, "user"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return request.state.user


def get_hierarchy_context(request: Request) -> Dict[str, Any]:
    """Get hierarchy context from request state"""
    if not hasattr(request.state, "hierarchy_context"):
        return {
            "group_ids": [],
            "company_ids": [],
            "location_ids": [],
            "unit_ids": [],
            "scope_level": "unit",
            "permissions": []
        }
    return request.state.hierarchy_context


def require_permission(permission: str):
    """Decorator to require specific permission"""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            user_permissions = getattr(request.state, "user_permissions", [])
            if permission not in user_permissions and "admin" not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission '{permission}' required"
                )
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator