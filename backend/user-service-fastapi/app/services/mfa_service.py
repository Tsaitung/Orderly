"""
MFA (Multi-Factor Authentication) 服務

支援：
- TOTP (Time-based One-Time Password) - Google Authenticator 相容
- 備份碼 (Backup Codes)

PRD 需求：
- 6 位數 TOTP
- 30 秒有效期
- ±1 視窗容錯
- 8 組備份碼
"""

import secrets
import io
import base64
from typing import Dict, List, Optional, Any
from datetime import datetime

import pyotp
import qrcode
from qrcode.image.pure import PyPNGImage
import structlog

logger = structlog.get_logger()


class MFAService:
    """MFA 服務 - 管理 TOTP 和備份碼"""

    # TOTP 配置
    TOTP_ISSUER = "井然 Orderly"
    TOTP_DIGITS = 6
    TOTP_INTERVAL = 30  # 秒
    TOTP_VALID_WINDOW = 1  # ±1 視窗容錯（允許前後 30 秒）

    # 備份碼配置
    BACKUP_CODE_COUNT = 8
    BACKUP_CODE_LENGTH = 8  # 每組 8 個字元

    @staticmethod
    def generate_totp_secret() -> str:
        """
        生成 TOTP 密鑰

        Returns:
            Base32 編碼的密鑰字串
        """
        return pyotp.random_base32()

    @staticmethod
    def get_totp_uri(secret: str, user_email: str) -> str:
        """
        生成 TOTP provisioning URI

        Args:
            secret: TOTP 密鑰
            user_email: 用戶 Email（用於顯示名稱）

        Returns:
            otpauth:// URI
        """
        totp = pyotp.TOTP(
            secret,
            digits=MFAService.TOTP_DIGITS,
            interval=MFAService.TOTP_INTERVAL
        )
        return totp.provisioning_uri(
            name=user_email,
            issuer_name=MFAService.TOTP_ISSUER
        )

    @staticmethod
    def generate_qr_code(secret: str, user_email: str) -> str:
        """
        生成 TOTP QR Code（Base64 PNG）

        Args:
            secret: TOTP 密鑰
            user_email: 用戶 Email

        Returns:
            data:image/png;base64,... 格式的圖片
        """
        uri = MFAService.get_totp_uri(secret, user_email)

        # 生成 QR Code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(uri)
        qr.make(fit=True)

        # 轉換為 PNG 圖片
        img = qr.make_image(fill_color="black", back_color="white")

        # 轉換為 Base64
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return f"data:image/png;base64,{img_base64}"

    @staticmethod
    def verify_totp(secret: str, code: str) -> bool:
        """
        驗證 TOTP 驗證碼

        Args:
            secret: 用戶的 TOTP 密鑰
            code: 用戶輸入的驗證碼

        Returns:
            驗證是否成功
        """
        if not secret or not code:
            return False

        # 移除空格和非數字字元
        code = "".join(c for c in code if c.isdigit())

        if len(code) != MFAService.TOTP_DIGITS:
            return False

        totp = pyotp.TOTP(
            secret,
            digits=MFAService.TOTP_DIGITS,
            interval=MFAService.TOTP_INTERVAL
        )

        return totp.verify(code, valid_window=MFAService.TOTP_VALID_WINDOW)

    @staticmethod
    def get_current_totp(secret: str) -> str:
        """
        獲取當前 TOTP 驗證碼（用於測試）

        Args:
            secret: TOTP 密鑰

        Returns:
            當前有效的驗證碼
        """
        totp = pyotp.TOTP(
            secret,
            digits=MFAService.TOTP_DIGITS,
            interval=MFAService.TOTP_INTERVAL
        )
        return totp.now()

    @staticmethod
    def generate_backup_codes() -> List[str]:
        """
        生成備份碼

        Returns:
            8 組備份碼列表
        """
        codes = []
        for _ in range(MFAService.BACKUP_CODE_COUNT):
            # 生成格式：XXXX-XXXX（字母數字混合）
            part1 = secrets.token_hex(2).upper()
            part2 = secrets.token_hex(2).upper()
            codes.append(f"{part1}-{part2}")
        return codes

    @staticmethod
    def verify_backup_code(
        code: str,
        stored_codes: List[str]
    ) -> Dict[str, Any]:
        """
        驗證備份碼

        Args:
            code: 用戶輸入的備份碼
            stored_codes: 存儲的備份碼列表

        Returns:
            {
                "valid": bool,
                "remaining_codes": List[str],  # 如果有效，移除已使用的碼
                "error": str | None
            }
        """
        if not code or not stored_codes:
            return {
                "valid": False,
                "remaining_codes": stored_codes or [],
                "error": "No backup codes available"
            }

        # 標準化輸入（移除空格和破折號，轉大寫）
        normalized_code = code.replace(" ", "").replace("-", "").upper()

        for stored_code in stored_codes:
            stored_normalized = stored_code.replace("-", "").upper()
            if secrets.compare_digest(normalized_code, stored_normalized):
                # 找到匹配，移除已使用的碼
                remaining = [c for c in stored_codes if c != stored_code]
                return {
                    "valid": True,
                    "remaining_codes": remaining,
                    "error": None
                }

        return {
            "valid": False,
            "remaining_codes": stored_codes,
            "error": "Invalid backup code"
        }

    @staticmethod
    def setup_mfa_for_user(user_email: str) -> Dict[str, Any]:
        """
        為用戶設置 MFA（生成密鑰、QR Code、備份碼）

        Args:
            user_email: 用戶 Email

        Returns:
            {
                "secret": str,
                "qr_code": str,
                "backup_codes": List[str],
                "otpauth_uri": str
            }
        """
        secret = MFAService.generate_totp_secret()
        qr_code = MFAService.generate_qr_code(secret, user_email)
        backup_codes = MFAService.generate_backup_codes()
        uri = MFAService.get_totp_uri(secret, user_email)

        logger.info(
            "mfa_setup_initiated",
            email=user_email
        )

        return {
            "secret": secret,
            "qr_code": qr_code,
            "backup_codes": backup_codes,
            "otpauth_uri": uri
        }

    @staticmethod
    def get_mfa_status(user) -> Dict[str, Any]:
        """
        獲取用戶的 MFA 狀態

        Args:
            user: User 模型實例

        Returns:
            MFA 狀態資訊
        """
        mfa_enabled = getattr(user, "mfa_enabled", False)
        mfa_method = getattr(user, "mfa_method", "none")
        mfa_backup_codes = getattr(user, "mfa_backup_codes", []) or []

        return {
            "enabled": mfa_enabled,
            "method": mfa_method,
            "backup_codes_remaining": len(mfa_backup_codes),
            "enforced_at": getattr(user, "mfa_enforced_at", None)
        }

    @staticmethod
    async def enable_mfa(
        user,
        secret: str,
        backup_codes: List[str],
        db
    ) -> bool:
        """
        啟用用戶的 MFA

        Args:
            user: User 模型實例
            secret: TOTP 密鑰
            backup_codes: 備份碼列表
            db: 資料庫 session

        Returns:
            是否成功
        """
        try:
            user.mfa_enabled = True
            user.mfa_secret = secret
            user.mfa_method = "totp"
            user.mfa_backup_codes = backup_codes
            user.mfa_enforced_at = datetime.utcnow()

            await db.commit()

            logger.info(
                "mfa_enabled",
                user_id=str(user.id),
                method="totp"
            )

            return True

        except Exception as e:
            await db.rollback()
            logger.error(
                "mfa_enable_failed",
                user_id=str(user.id),
                error=str(e)
            )
            return False

    @staticmethod
    async def disable_mfa(user, db) -> bool:
        """
        停用用戶的 MFA

        Args:
            user: User 模型實例
            db: 資料庫 session

        Returns:
            是否成功
        """
        try:
            user.mfa_enabled = False
            user.mfa_secret = None
            user.mfa_method = "none"
            user.mfa_backup_codes = []
            user.mfa_enforced_at = None

            await db.commit()

            logger.info(
                "mfa_disabled",
                user_id=str(user.id)
            )

            return True

        except Exception as e:
            await db.rollback()
            logger.error(
                "mfa_disable_failed",
                user_id=str(user.id),
                error=str(e)
            )
            return False

    @staticmethod
    async def regenerate_backup_codes(user, db) -> Optional[List[str]]:
        """
        重新生成備份碼

        Args:
            user: User 模型實例
            db: 資料庫 session

        Returns:
            新的備份碼列表，或 None（如果失敗）
        """
        if not user.mfa_enabled:
            return None

        try:
            new_codes = MFAService.generate_backup_codes()
            user.mfa_backup_codes = new_codes

            await db.commit()

            logger.info(
                "mfa_backup_codes_regenerated",
                user_id=str(user.id)
            )

            return new_codes

        except Exception as e:
            await db.rollback()
            logger.error(
                "mfa_backup_codes_regenerate_failed",
                user_id=str(user.id),
                error=str(e)
            )
            return None

    @staticmethod
    async def use_backup_code(
        user,
        code: str,
        db
    ) -> Dict[str, Any]:
        """
        使用備份碼進行驗證

        Args:
            user: User 模型實例
            code: 備份碼
            db: 資料庫 session

        Returns:
            驗證結果
        """
        stored_codes = user.mfa_backup_codes or []
        result = MFAService.verify_backup_code(code, stored_codes)

        if result["valid"]:
            # 更新剩餘的備份碼
            user.mfa_backup_codes = result["remaining_codes"]
            await db.commit()

            logger.info(
                "mfa_backup_code_used",
                user_id=str(user.id),
                remaining=len(result["remaining_codes"])
            )

        return result
