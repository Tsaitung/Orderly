"""
密碼相關端點模組

包含忘記密碼、重設密碼、修改密碼等功能
"""

import os
from datetime import datetime

import httpx
import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ChangePasswordResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from app.services.password_service import PasswordService

from .core import get_current_user_from_token, pwd_context

logger = structlog.get_logger()

router = APIRouter()


@router.post("/auth/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> ForgotPasswordResponse:
    """
    忘記密碼 - 發送 OTP 驗證碼到 Email

    流程：
    1. 驗證用戶 Email 是否存在
    2. 生成 OTP 驗證碼
    3. 調用 Notification Service 發送郵件
    4. 返回成功訊息（不透露用戶是否存在）
    """
    client_ip = request.client.host if request.client else "unknown"

    logger.info(
        "forgot_password_request",
        email=payload.email,
        client_ip=client_ip
    )

    # 查找用戶
    res = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = res.scalar_one_or_none()

    if not user:
        # 安全考量：不透露用戶是否存在，統一返回成功訊息
        logger.warn(
            "forgot_password_user_not_found",
            email=payload.email,
            client_ip=client_ip
        )
        return ForgotPasswordResponse(
            success=True,
            message="如果該 Email 已註冊，您將收到密碼重設驗證碼"
        )

    # 調用 Notification Service 發送 OTP
    notification_service_url = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:3006")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{notification_service_url}/otp/send-email",
                json={
                    "user_id": str(user.id),
                    "email": user.email,
                    "user_name": user.display_name or user.email.split("@")[0],
                    "purpose": "密碼重設"
                }
            )

            if response.status_code != 200:
                logger.error(
                    "forgot_password_otp_send_failed",
                    user_id=str(user.id),
                    status_code=response.status_code,
                    response=response.text
                )
                return ForgotPasswordResponse(
                    success=False,
                    message="發送驗證碼失敗，請稍後再試",
                    error="OTP service error"
                )

        logger.info(
            "forgot_password_otp_sent",
            user_id=str(user.id),
            email=user.email
        )

        return ForgotPasswordResponse(
            success=True,
            message="密碼重設驗證碼已發送到您的 Email"
        )

    except Exception as e:
        logger.error(
            "forgot_password_error",
            email=payload.email,
            error=str(e)
        )
        return ForgotPasswordResponse(
            success=False,
            message="發送驗證碼失敗，請稍後再試",
            error=str(e)
        )


@router.post("/auth/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> ResetPasswordResponse:
    """
    重設密碼

    流程：
    1. 驗證 OTP 驗證碼
    2. 驗證新密碼強度
    3. 檢查密碼歷史（防止重複使用）
    4. 更新密碼
    5. 使所有 session 失效（強制重新登入）
    """
    client_ip = request.client.host if request.client else "unknown"

    logger.info(
        "reset_password_request",
        email=payload.email,
        client_ip=client_ip
    )

    # 查找用戶
    res = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = res.scalar_one_or_none()

    if not user:
        logger.warn(
            "reset_password_user_not_found",
            email=payload.email,
            client_ip=client_ip
        )
        return ResetPasswordResponse(
            success=False,
            message="重設密碼失敗",
            error="用戶不存在"
        )

    # 驗證 OTP
    notification_service_url = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:3006")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            otp_response = await client.post(
                f"{notification_service_url}/otp/verify",
                json={
                    "user_id": str(user.id),
                    "otp_type": "email",
                    "code": payload.otp_code
                }
            )

            if otp_response.status_code != 200:
                logger.error(
                    "reset_password_otp_verify_failed",
                    user_id=str(user.id),
                    status_code=otp_response.status_code
                )
                return ResetPasswordResponse(
                    success=False,
                    message="驗證失敗，請重試",
                    error="OTP verification service error"
                )

            otp_result = otp_response.json()

            if not otp_result.get("valid"):
                logger.warn(
                    "reset_password_invalid_otp",
                    user_id=str(user.id),
                    error=otp_result.get("error")
                )
                return ResetPasswordResponse(
                    success=False,
                    message="驗證碼無效或已過期",
                    error=otp_result.get("error")
                )

        # OTP 驗證成功，驗證新密碼強度
        password_validation = PasswordService.validate_strength(
            password=payload.new_password,
            user_email=user.email,
            org_name=None  # 密碼重設時不需要檢查組織名稱
        )

        if not password_validation["valid"]:
            logger.warn(
                "reset_password_weak_password",
                user_id=str(user.id),
                errors=password_validation["errors"]
            )
            return ResetPasswordResponse(
                success=False,
                message=password_validation["errors"][0],
                error="Weak password"
            )

        # 檢查密碼歷史
        password_history_check = await PasswordService.check_password_history(
            user_id=str(user.id),
            new_password=payload.new_password,
            db=db
        )

        if not password_history_check["allowed"]:
            logger.warn(
                "reset_password_reused_password",
                user_id=str(user.id)
            )
            return ResetPasswordResponse(
                success=False,
                message=password_history_check["error"],
                error="Password reuse"
            )

        # 更新密碼
        user.password_hash = PasswordService.hash_password(payload.new_password)
        user.password_changed_at = datetime.utcnow()

        # 增加 token_version 使所有現有 session 失效
        user.token_version += 1

        await db.commit()

        logger.info(
            "reset_password_success",
            user_id=str(user.id),
            email=user.email,
            client_ip=client_ip
        )

        return ResetPasswordResponse(
            success=True,
            message="密碼重設成功，請使用新密碼登入"
        )

    except Exception as e:
        await db.rollback()
        logger.error(
            "reset_password_error",
            email=payload.email,
            error=str(e)
        )
        return ResetPasswordResponse(
            success=False,
            message="重設密碼失敗，請稍後再試",
            error=str(e)
        )


@router.put("/auth/change-password", response_model=ChangePasswordResponse)
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> ChangePasswordResponse:
    """
    修改密碼（需要登入）

    與重設密碼的差異：
    - 需要提供當前密碼
    - 需要 JWT 認證
    - 不需要 OTP

    流程：
    1. 驗證 JWT token
    2. 驗證當前密碼
    3. 驗證新密碼強度
    4. 檢查新密碼不與舊密碼相同
    5. 更新密碼
    """
    try:
        # 1. 驗證 JWT 並取得當前用戶
        current_user = await get_current_user_from_token(request, db)

        logger.info(
            "change_password_attempt",
            user_id=str(current_user.id),
            email=current_user.email
        )

        # 2. 驗證當前密碼
        if not pwd_context.verify(payload.current_password, current_user.password_hash):
            logger.warning(
                "change_password_wrong_current",
                user_id=str(current_user.id)
            )
            return ChangePasswordResponse(
                success=False,
                message="當前密碼錯誤",
                error="Current password is incorrect"
            )

        # 3. 驗證新密碼強度
        validation = PasswordService.validate_strength(
            payload.new_password,
            user_email=current_user.email
        )

        if not validation["valid"]:
            return ChangePasswordResponse(
                success=False,
                message=validation["errors"][0] if validation["errors"] else "密碼強度不足",
                error="Password validation failed"
            )

        # 4. 檢查新密碼不與當前密碼相同
        if pwd_context.verify(payload.new_password, current_user.password_hash):
            return ChangePasswordResponse(
                success=False,
                message="新密碼不能與當前密碼相同",
                error="New password cannot be the same as current password"
            )

        # 5. 更新密碼
        new_hash = PasswordService.hash_password(payload.new_password)
        current_user.password_hash = new_hash
        current_user.password_changed_at = datetime.utcnow()

        # 可選：增加 token_version 使其他設備的 session 失效
        # current_user.token_version += 1

        await db.commit()

        logger.info(
            "change_password_success",
            user_id=str(current_user.id),
            email=current_user.email
        )

        return ChangePasswordResponse(
            success=True,
            message="密碼修改成功"
        )

    except HTTPException:
        # 重新拋出認證錯誤
        raise

    except Exception as e:
        await db.rollback()
        logger.error(
            "change_password_error",
            error=str(e)
        )
        return ChangePasswordResponse(
            success=False,
            message="密碼修改失敗，請稍後再試",
            error=str(e)
        )
