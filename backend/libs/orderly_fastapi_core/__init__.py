"""
井然 Orderly Platform - FastAPI Core Library
統一的 FastAPI 核心組件和配置管理

Currently provides:
- Database engine/session helpers for sync and async SQLAlchemy
- Unified configuration management system
- Error handling utilities
- Pagination helpers
- Health check utilities
- Schema utilities (CamelCaseModel, response wrappers)
- Unified model definitions (UnifiedBaseModel, Mixins)
"""

__version__ = "2.2.0"
__author__ = "Orderly Development Team"

from .database import (
    create_db_engines,
    AsyncSessionLocalFactory,
    SessionLocalFactory,
    get_async_session_dependency,
)

# Import unified_config first to avoid circular import
from .unified_config import UnifiedSettings, get_settings

# Import middleware after unified_config to avoid circular dependency
from .middleware import AuthMiddleware, DEFAULT_PUBLIC_PATHS

# Health check utilities
from .health import (
    check_db_health,
    get_db_info,
    mask_database_url,
    create_health_router,
)

# Schema utilities
from .schemas import (
    to_camel,
    CamelCaseModel,
    PaginatedResponse,
    SuccessResponse,
    ErrorResponse,
    DataResponse,
    MessageResponse,
)

# Application factory
from .app_factory import create_service_app

# Unified models
from .models import (
    Base,
    UnifiedBaseModel,
    AuditMixin,
    SoftDeleteMixin,
    MetadataMixin,
)

# CRUD utilities
from .crud import CRUDBase

# Error handling
from .errors import (
    register_exception_handlers,
    OrderlyException,
    NotFoundError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    BusinessRuleError,
    ExternalServiceError,
)

__all__ = [
    # Database
    "create_db_engines",
    "AsyncSessionLocalFactory",
    "SessionLocalFactory",
    "get_async_session_dependency",
    # Config
    "UnifiedSettings",
    "get_settings",
    # Middleware
    "AuthMiddleware",
    "DEFAULT_PUBLIC_PATHS",
    # Health
    "check_db_health",
    "get_db_info",
    "mask_database_url",
    "create_health_router",
    # Schemas
    "to_camel",
    "CamelCaseModel",
    "PaginatedResponse",
    "SuccessResponse",
    "ErrorResponse",
    "DataResponse",
    "MessageResponse",
    # App Factory
    "create_service_app",
    # Models
    "Base",
    "UnifiedBaseModel",
    "AuditMixin",
    "SoftDeleteMixin",
    "MetadataMixin",
    # CRUD
    "CRUDBase",
    # Errors
    "register_exception_handlers",
    "OrderlyException",
    "NotFoundError",
    "ValidationError",
    "AuthenticationError",
    "AuthorizationError",
    "ConflictError",
    "BusinessRuleError",
    "ExternalServiceError",
]
