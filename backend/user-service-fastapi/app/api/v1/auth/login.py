"""
登入端點模組
"""

from datetime import datetime, timedelta

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.models.organization import Organization
from app.models.session import Session as UserSession
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest
from app.services.login_attempts_service import LoginAttemptsService
from app.services.password_service import PasswordService

from .core import (
    JWT_ALGORITHM,
    JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    JWT_SECRET,
    _build_claims,
    create_access_token,
    create_refresh_token,
)

logger = structlog.get_logger()

router = APIRouter()


@router.post("/auth/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> AuthResponse:
    # Log login attempt
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get('user-agent', 'unknown')

    logger.info(
        "user_login_attempt",
        email=payload.email,
        client_ip=client_ip,
        user_agent=user_agent
    )

    # Get user with case-insensitive email lookup
    res = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = res.scalar_one_or_none()

    if not user or not user.password_hash:
        logger.warn(
            "user_login_failed_user_not_found",
            email=payload.email,
            client_ip=client_ip
        )
        return AuthResponse(success=False, error="Invalid credentials")

    # 檢查帳號是否被鎖定
    lockout_status = await LoginAttemptsService.check_lockout(user, db)
    if lockout_status["locked"]:
        logger.warn(
            "user_login_blocked_account_locked",
            email=payload.email,
            user_id=str(user.id),
            client_ip=client_ip,
            locked_until=lockout_status["locked_until"].isoformat()
        )
        return AuthResponse(
            success=False,
            error=lockout_status["message"]
        )

    if not PasswordService.verify_password(payload.password, user.password_hash):
        # 記錄登入失敗嘗試
        attempt_result = await LoginAttemptsService.record_failed_attempt(
            user=user,
            db=db,
            ip_address=client_ip,
            user_agent=user_agent,
            reason="Invalid password"
        )

        logger.warn(
            "user_login_failed_invalid_password",
            email=payload.email,
            user_id=str(user.id),
            client_ip=client_ip,
            failed_attempts=user.failed_login_attempts,
            locked=attempt_result["locked"]
        )

        # 如果帳號被鎖定，返回鎖定訊息
        if attempt_result["locked"]:
            return AuthResponse(
                success=False,
                error=attempt_result["message"]
            )

        # 返回錯誤訊息（可選：包含剩餘嘗試次數）
        error_msg = "Invalid credentials"
        if attempt_result["attempts_remaining"] and attempt_result["attempts_remaining"] <= 3:
            error_msg = f"Invalid credentials. {attempt_result['attempts_remaining']} attempts remaining before lockout."

        return AuthResponse(success=False, error=error_msg)

    # Load organization
    org_res = await db.execute(select(Organization).where(Organization.id == user.organization_id))
    org = org_res.scalar_one_or_none()

    if not org:
        logger.error(
            "user_login_organization_not_found",
            user_id=str(user.id),
            organization_id=user.organization_id,
            client_ip=client_ip
        )
        return AuthResponse(success=False, error="Account configuration error")

    # 檢查是否啟用 MFA
    if getattr(user, 'mfa_enabled', False) and user.mfa_enabled:
        # 生成 MFA challenge token
        mfa_challenge_data = {
            "sub": str(user.id),
            "email": user.email,
            "type": "mfa_challenge",
            "exp": datetime.utcnow() + timedelta(minutes=5)
        }
        challenge_token = jwt.encode(mfa_challenge_data, JWT_SECRET, algorithm=JWT_ALGORITHM)

        logger.info(
            "user_login_mfa_required",
            user_id=str(user.id),
            email=user.email,
            client_ip=client_ip
        )

        # 返回需要 MFA 的響應
        return AuthResponse(
            success=True,
            error=None,
            user={
                "id": str(user.id),
                "email": user.email,
                "requires_mfa": True,
                "mfa_method": getattr(user, 'mfa_method', 'totp'),
                "challenge_token": challenge_token
            },
            timestamp=datetime.utcnow()
        )

    try:
        # 登入成功，重置失敗計數
        await LoginAttemptsService.record_successful_login(
            user=user,
            db=db,
            ip_address=client_ip,
            user_agent=user_agent
        )

        # Create JWT tokens (只有在不需要 MFA 時才發放)
        claims = _build_claims(user, org)
        access_token = create_access_token(data=claims)
        refresh_token = create_refresh_token(data={"sub": str(user.id), "token_version": user.token_version})

        # Store/update session
        expires = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        session = UserSession(
            user_id=str(user.id),
            token=refresh_token,
            expires_at=expires
        )
        db.add(session)
        await db.commit()

        logger.info(
            "user_login_success",
            user_id=str(user.id),
            email=user.email,
            organization_id=str(org.id),
            client_ip=client_ip
        )

    except Exception as e:
        logger.error(
            "user_login_session_error",
            user_id=str(user.id),
            error=str(e),
            client_ip=client_ip
        )
        raise HTTPException(status_code=500, detail="Login failed")

    return AuthResponse(
        success=True,
        token=access_token,
        refresh_token=refresh_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "permissions": user.permissions or [],
            "tenant": {
                "id": user.tenant_id or str(org.id),
                "type": user.tenant_type or org.type,
            },
            "organization": {
                "id": str(org.id),
                "name": org.name,
                "type": org.type
            },
        },
        timestamp=datetime.utcnow(),
    )
