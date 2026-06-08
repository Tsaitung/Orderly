"""
驗證級別服務

管理用戶和組織的驗證級別：
- Level 0: 未驗證
- Level 1: 社群帳號已建立
- Level 2: 社群帳號 + Phone 已驗證
- Level 3: 社群帳號 + Phone + 營業登記已驗證

不同級別可訪問不同功能。
"""

from typing import Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

logger = structlog.get_logger()


class VerificationService:
    """用戶和組織驗證級別管理"""

    # 驗證級別定義
    LEVEL_UNVERIFIED = 0  # 未驗證
    LEVEL_ACCOUNT = 1     # 社群帳號已建立
    LEVEL_PHONE = 2       # 社群帳號 + Phone 已驗證
    LEVEL_BUSINESS = 3    # 社群帳號 + Phone + 營業登記已驗證

    # 級別說明
    LEVEL_DESCRIPTIONS = {
        0: "未驗證",
        1: "社群帳號已建立",
        2: "社群帳號 + 手機已驗證",
        3: "完整驗證（含營業登記）"
    }

    @staticmethod
    def calculate_user_level(user, organization=None) -> int:
        """
        計算用戶的驗證級別

        Args:
            user: User 模型實例
            organization: Organization 模型實例（可選）

        Returns:
            驗證級別 (0-3)
        """
        # Level 0: 未啟用或停用
        if not getattr(user, "is_active", True) or getattr(user, "status", "active") != "active":
            return VerificationService.LEVEL_UNVERIFIED

        # Level 1: 社群帳號已建立。Email 不再作為身份驗證因素。
        level = VerificationService.LEVEL_ACCOUNT

        # Level 2: Phone 已驗證
        if hasattr(user, 'phone_verified') and user.phone_verified:
            level = VerificationService.LEVEL_PHONE

        # Level 3: 組織營業登記已驗證
        if organization and hasattr(organization, 'verified_at') and organization.verified_at:
            if organization.verification_documents:
                level = VerificationService.LEVEL_BUSINESS

        return level

    @staticmethod
    async def update_user_verification_level(
        user,
        organization,
        db: AsyncSession
    ) -> int:
        """
        更新用戶的驗證級別

        Args:
            user: User 模型實例
            organization: Organization 模型實例
            db: 資料庫 session

        Returns:
            新的驗證級別
        """
        new_level = VerificationService.calculate_user_level(user, organization)

        if hasattr(user, 'verification_level') and user.verification_level != new_level:
            old_level = user.verification_level
            user.verification_level = new_level
            await db.commit()

            logger.info(
                "user_verification_level_updated",
                user_id=str(user.id),
                old_level=old_level,
                new_level=new_level
            )

        return new_level

    @staticmethod
    def get_level_description(level: int) -> str:
        """取得驗證級別的說明"""
        return VerificationService.LEVEL_DESCRIPTIONS.get(level, "未知級別")

    @staticmethod
    def can_access_endpoint(user_level: int, required_level: int) -> bool:
        """
        檢查用戶級別是否可以訪問端點

        Args:
            user_level: 用戶的驗證級別
            required_level: 端點要求的最低驗證級別

        Returns:
            是否可以訪問
        """
        return user_level >= required_level

    @staticmethod
    def get_required_steps(current_level: int, target_level: int) -> Dict[str, bool]:
        """
        取得升級到目標級別所需的步驟

        Args:
            current_level: 當前級別
            target_level: 目標級別

        Returns:
            Dict 包含各項驗證步驟的完成狀態
        """
        steps = {
            "account_created": current_level >= VerificationService.LEVEL_ACCOUNT,
            "phone_verified": current_level >= VerificationService.LEVEL_PHONE,
            "business_verified": current_level >= VerificationService.LEVEL_BUSINESS
        }

        return steps

    @staticmethod
    def get_level_benefits(level: int) -> list[str]:
        """
        取得該級別可以使用的功能

        Args:
            level: 驗證級別

        Returns:
            功能列表
        """
        benefits = {
            0: [
                "瀏覽產品目錄",
                "查看供應商資訊"
            ],
            1: [
                "瀏覽產品目錄",
                "查看供應商資訊",
                "聯繫客服"
            ],
            2: [
                "瀏覽產品目錄",
                "查看供應商資訊",
                "聯繫客服",
                "下單購買",
                "查看訂單記錄"
            ],
            3: [
                "瀏覽產品目錄",
                "查看供應商資訊",
                "聯繫客服",
                "下單購買",
                "查看訂單記錄",
                "查看帳單明細",
                "發票管理",
                "供應商管理（供應商角色）",
                "產品上架（供應商角色）"
            ]
        }

        return benefits.get(level, benefits[0])

    @staticmethod
    async def verify_user_email(user, db: AsyncSession) -> bool:
        """
        標記用戶 Email 為已驗證

        Args:
            user: User 模型實例
            db: 資料庫 session

        Returns:
            是否成功
        """
        from datetime import datetime

        try:
            user.email_verified = True
            user.email_verified_at = datetime.utcnow()

            # 更新驗證級別
            if hasattr(user, 'verification_level'):
                user.verification_level = max(
                    user.verification_level or 0,
                    VerificationService.LEVEL_ACCOUNT
                )

            await db.commit()

            logger.info(
                "user_email_verified",
                user_id=str(user.id),
                email=user.email
            )

            return True

        except Exception as e:
            await db.rollback()
            logger.error(
                "user_email_verification_failed",
                user_id=str(user.id),
                error=str(e)
            )
            return False

    @staticmethod
    async def verify_user_phone(user, db: AsyncSession) -> bool:
        """
        標記用戶 Phone 為已驗證

        Args:
            user: User 模型實例
            db: 資料庫 session

        Returns:
            是否成功
        """
        from datetime import datetime

        try:
            if not hasattr(user, 'phone_verified'):
                return False

            user.phone_verified = True
            user.phone_verified_at = datetime.utcnow()

            # 更新驗證級別
            if hasattr(user, 'verification_level'):
                user.verification_level = max(
                    user.verification_level or 0,
                    VerificationService.LEVEL_PHONE
                )

            await db.commit()

            logger.info(
                "user_phone_verified",
                user_id=str(user.id),
                phone=user.phone
            )

            return True

        except Exception as e:
            await db.rollback()
            logger.error(
                "user_phone_verification_failed",
                user_id=str(user.id),
                error=str(e)
            )
            return False
