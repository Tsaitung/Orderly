"""
井然 Orderly Platform - FastAPI Core Library
統一的 FastAPI 核心組件和配置管理

Currently provides:
- Database engine/session helpers for sync and async SQLAlchemy
- Unified configuration management system
- Error handling utilities
- Pagination helpers
"""

__version__ = "2.0.0"
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

__all__ = [
    "create_db_engines",
    "AsyncSessionLocalFactory", 
    "SessionLocalFactory",
    "get_async_session_dependency",
    "UnifiedSettings",
    "get_settings",
    "AuthMiddleware",
    "DEFAULT_PUBLIC_PATHS",
]
