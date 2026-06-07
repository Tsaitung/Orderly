"""
FastAPI User Service Application
使用統一的應用程式工廠簡化初始化
"""
import os
import sys


from orderly_fastapi_core import create_service_app, DEFAULT_PUBLIC_PATHS

from app.modules.users.core.config import settings
from app.modules.users.core.database import async_engine
from app.modules.users.api.v1.auth import router as auth_router
from app.modules.users.api.v1.mfa import router as mfa_router
from app.modules.users.api.v1.oauth import router as oauth_router
from app.modules.users.api.v1.super_user import router as super_user_router
from app.modules.users.api.v1.sessions import router as sessions_router
from app.modules.users.api.v1.business_verification import router as verification_router
from app.modules.users.api.v1.audit import router as audit_router
from app.modules.users.api.v1.suppliers import router as suppliers_router
from app.modules.users.api.v1.organizations import router as organizations_router

# User Service 需要額外的公開路徑
public_auth_paths = DEFAULT_PUBLIC_PATHS | {
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/auth/mfa/verify",
    "/api/auth/mfa/verify",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/auth/oauth/providers",
    "/auth/oauth/line/initiate",
    "/auth/oauth/google/initiate",
    "/auth/oauth/line/callback",
    "/auth/oauth/google/callback",
    "/auth/oauth/complete-registration",
    "/api/auth/oauth/providers",
    "/api/auth/oauth/line/initiate",
    "/api/auth/oauth/google/initiate",
    "/api/auth/oauth/line/callback",
    "/api/auth/oauth/google/callback",
    "/api/auth/oauth/complete-registration",
}

app = create_service_app(
    service_name="user-service-fastapi",
    version=settings.app_version,
    async_engine=async_engine,
    get_db_url=settings.get_database_url_async,
    settings=settings,
    public_paths=public_auth_paths,
    debug=settings.debug,
)


def register_dual_prefix(router, tag: str, api_prefix: str = "/api", root_prefix: str = ""):
    """註冊路由到 /api 和根路徑以相容 API Gateway"""
    app.include_router(router, prefix=api_prefix, tags=[tag])
    app.include_router(router, prefix=root_prefix, tags=[tag])


# 註冊所有路由（含 /api 前綴和根路徑以相容 API Gateway）
register_dual_prefix(auth_router, "Auth")
register_dual_prefix(mfa_router, "MFA")
register_dual_prefix(oauth_router, "OAuth")
register_dual_prefix(super_user_router, "Super User")
register_dual_prefix(sessions_router, "Sessions")
register_dual_prefix(verification_router, "Verification")
register_dual_prefix(audit_router, "Audit")
register_dual_prefix(suppliers_router, "Suppliers")
register_dual_prefix(organizations_router, "Organizations", "/api/v1", "/v1")
