"""
OTP API 端點

提供：
- POST /otp/send-email - 發送 Email OTP
- POST /otp/verify - 驗證 OTP
"""

from fastapi import APIRouter, HTTPException, Depends
from app.modules.notifications.schemas.otp import (
    SendEmailOTPRequest,
    SendEmailOTPResponse,
    SendSMSOTPRequest,
    SendSMSOTPResponse,
    VerifyOTPRequest,
    VerifyOTPResponse
)
from app.modules.notifications.services.otp_service import OTPService
from app.modules.notifications.services.email_service import EmailService
from app.modules.notifications.services.sms_service import SMSService
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/otp", tags=["OTP"])

# 這些依賴將在 main.py 中設定
otp_service: OTPService = None
email_service: EmailService = None
sms_service: SMSService = None


def get_otp_service() -> OTPService:
    """取得 OTP 服務實例"""
    if otp_service is None:
        raise HTTPException(status_code=500, detail="OTP service not initialized")
    return otp_service


def get_email_service() -> EmailService:
    """取得 Email 服務實例"""
    if email_service is None:
        raise HTTPException(status_code=500, detail="Email service not initialized")
    return email_service


def get_sms_service() -> SMSService:
    """取得 SMS 服務實例"""
    if sms_service is None:
        raise HTTPException(status_code=500, detail="SMS service not initialized")
    return sms_service


@router.post("/send-email", response_model=SendEmailOTPResponse)
async def send_email_otp(
    request: SendEmailOTPRequest,
    otp_svc: OTPService = Depends(get_otp_service),
    email_svc: EmailService = Depends(get_email_service)
):
    """
    發送 Email OTP 驗證碼

    - 生成 6 位數 OTP
    - 存儲到 Redis (10 分鐘有效)
    - 發送 Email 到用戶信箱

    **Rate Limit**: 3 requests / hour (由 API Gateway 控制)
    """
    try:
        # 生成 OTP
        otp_code = await otp_svc.generate_otp(
            user_id=request.user_id,
            otp_type="email",
            metadata={"email": request.email, "purpose": request.purpose}
        )

        # 發送 Email
        email_sent = await email_svc.send_otp_email(
            to_email=request.email,
            otp_code=otp_code,
            user_name=request.user_name,
            purpose=request.purpose
        )

        if not email_sent:
            logger.error(
                "otp_email_send_failed",
                user_id=request.user_id,
                email=request.email
            )
            return SendEmailOTPResponse(
                success=False,
                message="郵件發送失敗，請稍後再試",
                error="Email delivery failed"
            )

        logger.info(
            "otp_email_sent_successfully",
            user_id=request.user_id,
            email=request.email,
            purpose=request.purpose
        )

        return SendEmailOTPResponse(
            success=True,
            message=f"驗證碼已發送到 {request.email}",
            expires_in=otp_svc.OTP_TTL_SECONDS
        )

    except Exception as e:
        logger.error(
            "send_email_otp_error",
            user_id=request.user_id,
            email=request.email,
            error=str(e)
        )
        raise HTTPException(
            status_code=500,
            detail="發送驗證碼失敗，請稍後再試"
        )


@router.post("/verify", response_model=VerifyOTPResponse)
async def verify_otp(
    request: VerifyOTPRequest,
    otp_svc: OTPService = Depends(get_otp_service)
):
    """
    驗證 OTP 驗證碼

    - 檢查驗證碼是否正確
    - 檢查是否過期
    - 限制嘗試次數 (5 次)

    **重要**: 驗證成功後 OTP 會被刪除，不可重複使用
    """
    try:
        # 驗證 OTP
        result = await otp_svc.verify_otp(
            user_id=request.user_id,
            otp_type=request.otp_type,
            code=request.code
        )

        if result["valid"]:
            return VerifyOTPResponse(
                success=True,
                valid=True,
                message="驗證成功",
                metadata=result.get("metadata")
            )
        else:
            return VerifyOTPResponse(
                success=True,  # API 調用成功
                valid=False,   # 但驗證碼無效
                message="驗證失敗",
                error=result["error"]
            )

    except Exception as e:
        logger.error(
            "verify_otp_error",
            user_id=request.user_id,
            otp_type=request.otp_type,
            error=str(e)
        )
        raise HTTPException(
            status_code=500,
            detail="驗證失敗，請稍後再試"
        )


@router.get("/remaining-time/{user_id}/{otp_type}")
async def get_remaining_time(
    user_id: str,
    otp_type: str,
    otp_svc: OTPService = Depends(get_otp_service)
):
    """
    取得 OTP 剩餘有效時間

    用於前端顯示倒數計時
    """
    try:
        ttl = await otp_svc.get_remaining_ttl(user_id, otp_type)

        return {
            "user_id": user_id,
            "otp_type": otp_type,
            "remaining_seconds": ttl,
            "expired": ttl <= 0
        }

    except Exception as e:
        logger.error(
            "get_remaining_time_error",
            user_id=user_id,
            otp_type=otp_type,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="查詢失敗")


@router.delete("/{user_id}/{otp_type}")
async def cancel_otp(
    user_id: str,
    otp_type: str,
    otp_svc: OTPService = Depends(get_otp_service)
):
    """
    取消/刪除 OTP

    用於用戶取消操作或重新發送前清除舊的 OTP
    """
    try:
        deleted = await otp_svc.delete_otp(user_id, otp_type)

        return {
            "success": deleted,
            "message": "OTP 已刪除" if deleted else "OTP 不存在或已過期"
        }

    except Exception as e:
        logger.error(
            "cancel_otp_error",
            user_id=user_id,
            otp_type=otp_type,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="刪除失敗")


@router.post("/send-sms", response_model=SendSMSOTPResponse)
async def send_sms_otp(
    request: SendSMSOTPRequest,
    otp_svc: OTPService = Depends(get_otp_service),
    sms_svc: SMSService = Depends(get_sms_service)
):
    """
    發送 SMS OTP 驗證碼

    - 生成 6 位數 OTP
    - 存儲到 Redis (10 分鐘有效)
    - 發送 SMS 到用戶手機

    **Rate Limit**: 3 requests / hour (由 API Gateway 控制)

    **注意**: 需要配置 Twilio 環境變數才能發送 SMS
    """
    try:
        # 檢查 SMS 服務是否可用
        if not sms_svc.is_available():
            logger.warning(
                "sms_service_not_available",
                user_id=request.user_id,
                phone=request.phone
            )
            return SendSMSOTPResponse(
                success=False,
                message="SMS 服務暫時不可用",
                error="SMS service not available"
            )

        # 生成 OTP
        otp_code = await otp_svc.generate_otp(
            user_id=request.user_id,
            otp_type="sms",
            metadata={"phone": request.phone, "purpose": request.purpose}
        )

        # 發送 SMS
        sms_sent = await sms_svc.send_otp_sms(
            to_phone=request.phone,
            otp_code=otp_code,
            purpose=request.purpose
        )

        if not sms_sent:
            logger.error(
                "otp_sms_send_failed",
                user_id=request.user_id,
                phone=request.phone
            )
            return SendSMSOTPResponse(
                success=False,
                message="簡訊發送失敗，請稍後再試",
                error="SMS delivery failed"
            )

        logger.info(
            "otp_sms_sent_successfully",
            user_id=request.user_id,
            phone=request.phone,
            purpose=request.purpose
        )

        return SendSMSOTPResponse(
            success=True,
            message=f"驗證碼已發送到 {request.phone}",
            expires_in=otp_svc.OTP_TTL_SECONDS
        )

    except Exception as e:
        logger.error(
            "send_sms_otp_error",
            user_id=request.user_id,
            phone=request.phone,
            error=str(e)
        )
        raise HTTPException(
            status_code=500,
            detail="發送驗證碼失敗，請稍後再試"
        )


@router.get("/sms-status")
async def check_sms_status(
    sms_svc: SMSService = Depends(get_sms_service)
):
    """
    檢查 SMS 服務狀態

    返回 SMS 服務是否可用
    """
    return {
        "available": sms_svc.is_available(),
        "message": "SMS 服務正常" if sms_svc.is_available() else "SMS 服務未配置或不可用"
    }
