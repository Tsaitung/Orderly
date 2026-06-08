"""
驗證相關端點模組

包含手機驗證功能。Email 不再是登入或驗證因素。
"""

from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.core.database import get_async_session
from app.modules.users.models.organization import Organization
from app.modules.users.schemas.auth import (
    SendPhoneVerificationRequest,
    SendPhoneVerificationResponse,
    VerifyPhoneRequest,
    VerifyPhoneResponse,
)
from app.modules.users.services.verification_service import VerificationService
from app.modules.users.services.otp_bridge import in_process_otp

from .core import get_current_user_from_token

logger = structlog.get_logger()

router = APIRouter()


# ============================================================================
# 手機驗證端點
# ============================================================================


@router.post("/auth/send-phone-verification", response_model=SendPhoneVerificationResponse)
async def send_phone_verification(
    payload: SendPhoneVerificationRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> SendPhoneVerificationResponse:
    """
    發送手機驗證碼（需要登入）

    流程：
    1. 驗證 JWT token
    2. 更新用戶手機號碼
    3. 調用 Notification Service 發送 SMS OTP
    """
    try:
        # 1. 驗證 JWT 並取得當前用戶
        current_user = await get_current_user_from_token(request, db)

        # 檢查手機是否已驗證
        if hasattr(current_user, 'phone_verified') and current_user.phone_verified:
            if current_user.phone == payload.phone:
                return SendPhoneVerificationResponse(
                    success=False,
                    message="此手機號碼已經驗證過了",
                    error="Phone already verified"
                )

        # 3. 更新用戶手機號碼
        current_user.phone = payload.phone

        # 4. Direct in-process SMS OTP call
        data = await in_process_otp.send_sms_otp(
            user_id=str(current_user.id),
            phone=payload.phone,
            purpose="手機驗證",
        )
        if data.get("success"):
            await db.commit()
            logger.info(
                "phone_verification_otp_sent",
                user_id=str(current_user.id),
                phone=payload.phone
            )
            return SendPhoneVerificationResponse(
                success=True,
                message=f"驗證碼已發送到 {payload.phone}",
                expires_in=data.get("expires_in", 600)
            )

        if data.get("error") == "SMS service not available":
            await db.commit()  # 仍然保存手機號碼
            return SendPhoneVerificationResponse(
                success=False,
                message="SMS 服務尚未啟用，請聯繫客服",
                error="SMS service not available"
            )

        return SendPhoneVerificationResponse(
            success=False,
            message="發送驗證碼失敗，請稍後再試",
            error=data.get("error") or "Failed to send SMS OTP"
        )

    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.error(
            "send_phone_verification_error",
            error=str(e)
        )
        return SendPhoneVerificationResponse(
            success=False,
            message="發送驗證碼失敗，請稍後再試",
            error=str(e)
        )


@router.post("/auth/verify-phone", response_model=VerifyPhoneResponse)
async def verify_phone(
    payload: VerifyPhoneRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> VerifyPhoneResponse:
    """
    驗證手機 OTP（需要登入）

    流程：
    1. 驗證 JWT token
    2. 調用 Notification Service 驗證 OTP
    3. 更新用戶 phone_verified 狀態
    4. 更新驗證級別
    """
    try:
        # 1. 驗證 JWT 並取得當前用戶
        current_user = await get_current_user_from_token(request, db)

        # 檢查是否有手機號碼
        if not current_user.phone:
            return VerifyPhoneResponse(
                success=False,
                message="請先設定手機號碼",
                error="Phone number not set"
            )

        # 檢查是否已驗證
        if hasattr(current_user, 'phone_verified') and current_user.phone_verified:
            return VerifyPhoneResponse(
                success=True,
                message="手機已經驗證過了",
                verification_level=VerificationService.calculate_user_level(current_user)
            )

        # 2. Direct in-process OTP validation
        data = await in_process_otp.verify_otp(
            user_id=str(current_user.id),
            otp_type="sms",
            code=payload.otp_code,
        )

        if not data.get("success"):
            return VerifyPhoneResponse(
                success=False,
                message="驗證服務暫時不可用",
                error="Verification service unavailable"
            )

        if not data.get("valid"):
            return VerifyPhoneResponse(
                success=False,
                message="驗證碼錯誤或已過期",
                error=data.get("error", "Invalid OTP")
            )

        # 3. 更新用戶 phone_verified 狀態
        current_user.phone_verified = True
        current_user.phone_verified_at = datetime.utcnow()

        # 4. 更新驗證級別
        result = await db.execute(
            select(Organization).where(Organization.id == current_user.organization_id)
        )
        org = result.scalar_one_or_none()

        new_level = VerificationService.calculate_user_level(current_user, org)
        if hasattr(current_user, 'verification_level'):
            current_user.verification_level = new_level

        await db.commit()

        logger.info(
            "phone_verified_successfully",
            user_id=str(current_user.id),
            phone=current_user.phone,
            verification_level=new_level
        )

        return VerifyPhoneResponse(
            success=True,
            message="手機驗證成功",
            verification_level=new_level
        )

    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.error(
            "verify_phone_error",
            error=str(e)
        )
        return VerifyPhoneResponse(
            success=False,
            message="驗證失敗，請稍後再試",
            error=str(e)
        )
