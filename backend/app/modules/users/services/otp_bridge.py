"""In-process bridge to notification OTP services for the monolith."""

from typing import Optional

import structlog

from app.modules.notifications.main import email_service, otp_service, sms_service

logger = structlog.get_logger()


class InProcessOTPBridge:
    """Call notification OTP services directly without loopback HTTP."""

    async def _ensure_redis(self) -> None:
        if otp_service.redis is None:
            await otp_service.connect()

    async def send_email_otp(
        self,
        user_id: str,
        email: str,
        purpose: str,
        user_name: Optional[str] = None,
    ) -> dict:
        try:
            await self._ensure_redis()
            code = await otp_service.generate_otp(
                user_id=user_id,
                otp_type="email",
                metadata={"email": email, "purpose": purpose},
            )
            sent = await email_service.send_otp_email(
                to_email=email,
                otp_code=code,
                user_name=user_name,
                purpose=purpose,
            )
            return {
                "success": bool(sent),
                "message": f"OTP sent to {email}" if sent else "Email delivery failed",
                "expires_in": otp_service.OTP_TTL_SECONDS,
                "error": None if sent else "Email delivery failed",
            }
        except Exception as exc:
            logger.error("in_process_email_otp_failed", user_id=user_id, email=email, error=str(exc))
            return {"success": False, "message": "OTP send failed", "error": str(exc)}

    async def send_sms_otp(self, user_id: str, phone: str, purpose: str) -> dict:
        try:
            if not sms_service.is_available():
                return {
                    "success": False,
                    "message": "SMS service not available",
                    "error": "SMS service not available",
                }
            await self._ensure_redis()
            code = await otp_service.generate_otp(
                user_id=user_id,
                otp_type="sms",
                metadata={"phone": phone, "purpose": purpose},
            )
            sent = await sms_service.send_otp_sms(to_phone=phone, otp_code=code, purpose=purpose)
            return {
                "success": bool(sent),
                "message": f"OTP sent to {phone}" if sent else "SMS delivery failed",
                "expires_in": otp_service.OTP_TTL_SECONDS,
                "error": None if sent else "SMS delivery failed",
            }
        except Exception as exc:
            logger.error("in_process_sms_otp_failed", user_id=user_id, phone=phone, error=str(exc))
            return {"success": False, "message": "OTP send failed", "error": str(exc)}

    async def verify_otp(self, user_id: str, otp_type: str, code: str) -> dict:
        try:
            await self._ensure_redis()
            result = await otp_service.verify_otp(user_id=user_id, otp_type=otp_type, code=code)
            return {"success": True, **result}
        except Exception as exc:
            logger.error("in_process_otp_verify_failed", user_id=user_id, otp_type=otp_type, error=str(exc))
            return {"success": False, "valid": False, "error": str(exc), "metadata": None}


in_process_otp = InProcessOTPBridge()
