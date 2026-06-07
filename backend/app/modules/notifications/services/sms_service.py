"""
SMS 服務

使用 Twilio 發送 SMS 驗證碼

配置環境變數：
- TWILIO_ACCOUNT_SID: Twilio 帳號 SID
- TWILIO_AUTH_TOKEN: Twilio 認證 Token
- TWILIO_PHONE_NUMBER: 發送方電話號碼
"""

import os
from typing import Optional
import structlog

logger = structlog.get_logger()

# Twilio 配置
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

# 嘗試導入 Twilio（可選依賴）
try:
    from twilio.rest import Client as TwilioClient
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    TwilioClient = None


class SMSService:
    """SMS 發送服務"""

    def __init__(self):
        """初始化 SMS 服務"""
        self.enabled = False
        self.client = None

        if not TWILIO_AVAILABLE:
            logger.warning(
                "twilio_not_installed",
                message="Twilio SDK not installed. SMS service disabled."
            )
            return

        if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]):
            logger.warning(
                "twilio_config_missing",
                message="Twilio credentials not configured. SMS service disabled."
            )
            return

        try:
            self.client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            self.enabled = True
            logger.info(
                "sms_service_initialized",
                from_number=TWILIO_PHONE_NUMBER
            )
        except Exception as e:
            logger.error(
                "twilio_init_failed",
                error=str(e)
            )

    def is_available(self) -> bool:
        """檢查 SMS 服務是否可用"""
        return self.enabled and self.client is not None

    async def send_otp_sms(
        self,
        to_phone: str,
        otp_code: str,
        purpose: str = "驗證"
    ) -> bool:
        """
        發送 OTP 驗證碼簡訊

        Args:
            to_phone: 接收方電話號碼（含國碼，如 +886912345678）
            otp_code: 驗證碼
            purpose: 用途說明

        Returns:
            是否發送成功
        """
        if not self.is_available():
            logger.warning(
                "sms_service_not_available",
                to_phone=to_phone
            )
            return False

        try:
            # 標準化電話號碼
            normalized_phone = self._normalize_phone(to_phone)

            # 構建訊息
            message_body = f"【井然 Orderly】您的{purpose}驗證碼是：{otp_code}，有效期 10 分鐘。請勿將驗證碼告知他人。"

            # 發送簡訊
            message = self.client.messages.create(
                body=message_body,
                from_=TWILIO_PHONE_NUMBER,
                to=normalized_phone
            )

            logger.info(
                "sms_sent_successfully",
                to_phone=normalized_phone,
                message_sid=message.sid,
                purpose=purpose
            )

            return True

        except Exception as e:
            logger.error(
                "sms_send_failed",
                to_phone=to_phone,
                error=str(e)
            )
            return False

    async def send_notification_sms(
        self,
        to_phone: str,
        message: str
    ) -> bool:
        """
        發送通知簡訊

        Args:
            to_phone: 接收方電話號碼
            message: 訊息內容

        Returns:
            是否發送成功
        """
        if not self.is_available():
            return False

        try:
            normalized_phone = self._normalize_phone(to_phone)

            sms = self.client.messages.create(
                body=message,
                from_=TWILIO_PHONE_NUMBER,
                to=normalized_phone
            )

            logger.info(
                "notification_sms_sent",
                to_phone=normalized_phone,
                message_sid=sms.sid
            )

            return True

        except Exception as e:
            logger.error(
                "notification_sms_failed",
                to_phone=to_phone,
                error=str(e)
            )
            return False

    def _normalize_phone(self, phone: str) -> str:
        """
        標準化電話號碼

        將台灣手機號碼轉換為國際格式

        Examples:
            0912345678 -> +886912345678
            +886912345678 -> +886912345678
            886912345678 -> +886912345678
        """
        # 移除空格和破折號
        phone = phone.replace(" ", "").replace("-", "")

        # 如果已經是 + 開頭，直接返回
        if phone.startswith("+"):
            return phone

        # 台灣手機號碼處理
        if phone.startswith("09"):
            # 0912345678 -> +886912345678
            return f"+886{phone[1:]}"

        if phone.startswith("886"):
            return f"+{phone}"

        # 其他情況，假設是完整號碼
        return f"+{phone}"

    async def verify_phone_format(self, phone: str) -> dict:
        """
        驗證電話號碼格式

        Args:
            phone: 電話號碼

        Returns:
            {
                "valid": bool,
                "normalized": str,
                "carrier": str | None,
                "error": str | None
            }
        """
        try:
            normalized = self._normalize_phone(phone)

            # 基本格式驗證
            if not normalized.startswith("+"):
                return {
                    "valid": False,
                    "normalized": None,
                    "carrier": None,
                    "error": "Invalid phone number format"
                }

            # 台灣手機號碼驗證
            if normalized.startswith("+8869"):
                if len(normalized) != 13:  # +886 + 9位數
                    return {
                        "valid": False,
                        "normalized": None,
                        "carrier": None,
                        "error": "Invalid Taiwan mobile number"
                    }

            # 如果 Twilio 可用，使用 Lookup API 進行進階驗證
            if self.is_available():
                try:
                    lookup = self.client.lookups.v1.phone_numbers(normalized).fetch()
                    return {
                        "valid": True,
                        "normalized": lookup.phone_number,
                        "carrier": lookup.carrier.get("name") if lookup.carrier else None,
                        "error": None
                    }
                except Exception:
                    pass  # Lookup 失敗時使用基本驗證結果

            return {
                "valid": True,
                "normalized": normalized,
                "carrier": None,
                "error": None
            }

        except Exception as e:
            return {
                "valid": False,
                "normalized": None,
                "carrier": None,
                "error": str(e)
            }


# 單例實例
sms_service = SMSService()
