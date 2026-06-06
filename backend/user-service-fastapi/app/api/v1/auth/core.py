"""
認證核心模組

包含 JWT 配置、token 創建函式、密碼上下文和用戶驗證依賴
"""

from datetime import datetime, timedelta
import os
from typing import Any, Dict

import structlog
from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.models.organization import Organization
from app.models.user import User
from app.services.verification_service import VerificationService

logger = structlog.get_logger()

# Secure password hashing with bcrypt (cost factor 12)
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)

# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 15
JWT_REFRESH_TOKEN_EXPIRE_DAYS = 7


def _build_claims(user: User, org: Organization) -> Dict[str, Any]:
    """
    構建 JWT claims

    包含用戶基本資訊、角色權限和驗證級別
    """
    permissions = user.permissions or []

    # 計算用戶驗證級別 (0-3)
    verification_level = VerificationService.calculate_user_level(user, org)

    return {
        "sub": str(user.id),
        "email": user.email,
        "tenant_id": user.tenant_id or str(org.id),
        "org_id": str(org.id),
        "tenant_type": user.tenant_type or getattr(org, "type", None),
        "org_type": getattr(org, "type", None),
        "role": user.role,
        "permissions": permissions,
        "token_version": user.token_version,
        "status": user.status,
        "verification_level": verification_level,
    }


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


async def get_current_user_from_token(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> User:
    """
    從 Authorization header 提取 JWT 並驗證用戶

    用於需要認證的端點
    """
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="需要認證",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

        # 驗證 token 類型
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="無效的 token 類型"
            )

        user_id = payload.get("sub")
        token_version = payload.get("token_version", 0)

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="無效的 token"
            )

        # 從資料庫獲取用戶
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用戶不存在"
            )

        # 驗證 token 版本（用於撤銷所有 session）
        if user.token_version != token_version:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token 已失效，請重新登入"
            )

        # 檢查用戶狀態
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="帳號已停用"
            )

        return user

    except JWTError as e:
        logger.warning("jwt_validation_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 已過期或無效"
        )
