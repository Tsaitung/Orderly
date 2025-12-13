"""
Super User 服務

提供時間限制的超級用戶權限管理：
- 啟用/停用 Super User 權限
- 時間限制（最長 24 小時）
- 雙重核准（超過 1 小時需要核准者）
- 自動過期
- 稽核日誌
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
import structlog

from app.models.user import User

logger = structlog.get_logger()


class SuperUserService:
    """Super User 權限管理服務"""

    # 配置
    MAX_DURATION_HOURS = 24  # 最長 Super User 時間
    REQUIRE_APPROVAL_HOURS = 1  # 超過此時間需要核准
    ALLOWED_ROLES = ["platform_admin", "super_admin"]  # 可啟用 Super User 的角色

    @staticmethod
    async def activate(
        user_id: str,
        reason: str,
        duration_hours: int,
        approver_id: Optional[str],
        db: AsyncSession,
        audit_service=None
    ) -> Dict[str, Any]:
        """
        啟用 Super User 權限

        Args:
            user_id: 要啟用的用戶 ID
            reason: 啟用原因（必填）
            duration_hours: 持續時間（小時）
            approver_id: 核准者 ID（超過 1 小時必填）
            db: 資料庫會話
            audit_service: 稽核日誌服務（可選）

        Returns:
            {
                "success": bool,
                "activated_at": datetime,
                "expires_at": datetime,
                "duration_hours": int
            }

        Raises:
            PermissionError: 權限不足
            ValueError: 參數錯誤
        """
        # 取得用戶
        user = await db.get(User, user_id)
        if not user:
            raise ValueError("用戶不存在")

        # 檢查角色資格
        if user.role not in SuperUserService.ALLOWED_ROLES:
            raise PermissionError("只有平台管理員可以啟用 Super User")

        # 檢查 MFA 是否啟用
        if not getattr(user, 'mfa_enabled', False):
            raise PermissionError("啟用 Super User 需要先啟用 MFA")

        # 檢查用戶狀態
        if user.status != "active":
            raise PermissionError("只有活躍用戶可以啟用 Super User")

        # 檢查持續時間
        if duration_hours < 1:
            raise ValueError("持續時間至少 1 小時")

        if duration_hours > SuperUserService.MAX_DURATION_HOURS:
            raise ValueError(f"持續時間不能超過 {SuperUserService.MAX_DURATION_HOURS} 小時")

        # 檢查是否需要核准
        if duration_hours > SuperUserService.REQUIRE_APPROVAL_HOURS:
            if not approver_id:
                raise ValueError(f"超過 {SuperUserService.REQUIRE_APPROVAL_HOURS} 小時需要核准者")

            # 驗證核准者
            approver = await db.get(User, approver_id)
            if not approver:
                raise ValueError("核准者不存在")

            if approver.role not in SuperUserService.ALLOWED_ROLES:
                raise PermissionError("核准者必須是平台管理員")

            if str(approver.id) == str(user_id):
                raise ValueError("不能自我核准")

        # 啟用 Super User
        now = datetime.utcnow()
        expires_at = now + timedelta(hours=duration_hours)

        user.is_super_user = True
        user.super_user_activated_at = now
        user.super_user_expires_at = expires_at
        user.super_user_reason = reason

        await db.commit()

        # 記錄稽核日誌
        if audit_service:
            await audit_service.log({
                "event_type": "SUPER_USER_ACTIVATE",
                "user_id": str(user_id),
                "approver_id": str(approver_id) if approver_id else None,
                "reason": reason,
                "duration_hours": duration_hours,
                "expires_at": expires_at.isoformat()
            })

        logger.info(
            "super_user_activated",
            user_id=str(user_id)[:8],
            duration_hours=duration_hours,
            expires_at=expires_at.isoformat()
        )

        return {
            "success": True,
            "activated_at": now,
            "expires_at": expires_at,
            "duration_hours": duration_hours
        }

    @staticmethod
    async def deactivate(
        user_id: str,
        db: AsyncSession,
        deactivated_by: Optional[str] = None,
        reason: Optional[str] = None,
        audit_service=None
    ) -> Dict[str, Any]:
        """
        停用 Super User 權限

        Args:
            user_id: 用戶 ID
            db: 資料庫會話
            deactivated_by: 停用者 ID（可選，自動過期時為空）
            reason: 停用原因
            audit_service: 稽核日誌服務
        """
        user = await db.get(User, user_id)
        if not user:
            raise ValueError("用戶不存在")

        was_super_user = getattr(user, 'is_super_user', False)

        # 停用 Super User
        user.is_super_user = False
        user.super_user_activated_at = None
        user.super_user_expires_at = None
        user.super_user_reason = None

        await db.commit()

        # 記錄稽核日誌
        if audit_service and was_super_user:
            await audit_service.log({
                "event_type": "SUPER_USER_DEACTIVATE",
                "user_id": str(user_id),
                "deactivated_by": str(deactivated_by) if deactivated_by else "system",
                "reason": reason or "Manual deactivation"
            })

        logger.info(
            "super_user_deactivated",
            user_id=str(user_id)[:8],
            deactivated_by=str(deactivated_by)[:8] if deactivated_by else "system"
        )

        return {
            "success": True,
            "deactivated_at": datetime.utcnow()
        }

    @staticmethod
    async def check_expiration(
        db: AsyncSession,
        audit_service=None
    ) -> Dict[str, Any]:
        """
        檢查並停用所有過期的 Super User

        應由定期任務調用（例如每分鐘）

        Returns:
            {
                "checked_at": datetime,
                "expired_count": int,
                "expired_users": List[str]
            }
        """
        now = datetime.utcnow()

        # 查找所有過期的 Super User
        result = await db.execute(
            select(User).where(
                and_(
                    User.is_super_user == True,
                    User.super_user_expires_at < now
                )
            )
        )
        expired_users = result.scalars().all()

        expired_ids = []
        for user in expired_users:
            user.is_super_user = False
            user.super_user_activated_at = None
            user.super_user_expires_at = None
            user.super_user_reason = None
            expired_ids.append(str(user.id))

            # 記錄稽核日誌
            if audit_service:
                await audit_service.log({
                    "event_type": "SUPER_USER_EXPIRED",
                    "user_id": str(user.id),
                    "deactivated_by": "system",
                    "reason": "Automatic expiration"
                })

        if expired_users:
            await db.commit()
            logger.info(
                "super_users_expired",
                count=len(expired_ids),
                user_ids=[uid[:8] for uid in expired_ids]
            )

        return {
            "checked_at": now,
            "expired_count": len(expired_ids),
            "expired_users": expired_ids
        }

    @staticmethod
    async def get_status(
        user_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        取得 Super User 狀態

        Returns:
            {
                "is_super_user": bool,
                "activated_at": datetime | None,
                "expires_at": datetime | None,
                "remaining_minutes": int | None,
                "reason": str | None
            }
        """
        user = await db.get(User, user_id)
        if not user:
            raise ValueError("用戶不存在")

        is_super = getattr(user, 'is_super_user', False)
        expires_at = getattr(user, 'super_user_expires_at', None)

        remaining_minutes = None
        if is_super and expires_at:
            remaining = (expires_at - datetime.utcnow()).total_seconds()
            remaining_minutes = max(0, int(remaining / 60))

            # 如果已過期，自動停用
            if remaining < 0:
                user.is_super_user = False
                user.super_user_activated_at = None
                user.super_user_expires_at = None
                user.super_user_reason = None
                await db.commit()
                is_super = False
                remaining_minutes = 0

        return {
            "is_super_user": is_super,
            "activated_at": getattr(user, 'super_user_activated_at', None),
            "expires_at": expires_at,
            "remaining_minutes": remaining_minutes,
            "reason": getattr(user, 'super_user_reason', None) if is_super else None
        }

    @staticmethod
    async def extend(
        user_id: str,
        additional_hours: int,
        approver_id: str,
        db: AsyncSession,
        audit_service=None
    ) -> Dict[str, Any]:
        """
        延長 Super User 時間

        Args:
            user_id: 用戶 ID
            additional_hours: 額外時間（小時）
            approver_id: 核准者 ID（必填）
            db: 資料庫會話
        """
        user = await db.get(User, user_id)
        if not user:
            raise ValueError("用戶不存在")

        if not getattr(user, 'is_super_user', False):
            raise ValueError("用戶目前不是 Super User")

        current_expires = getattr(user, 'super_user_expires_at', None)
        if not current_expires:
            raise ValueError("無法取得當前過期時間")

        # 驗證核准者
        approver = await db.get(User, approver_id)
        if not approver:
            raise ValueError("核准者不存在")

        if approver.role not in SuperUserService.ALLOWED_ROLES:
            raise PermissionError("核准者必須是平台管理員")

        if str(approver.id) == str(user_id):
            raise ValueError("不能自我核准延長")

        # 計算新的過期時間
        now = datetime.utcnow()
        base_time = max(current_expires, now)
        new_expires = base_time + timedelta(hours=additional_hours)

        # 檢查總時間不超過 MAX_DURATION_HOURS
        activated_at = getattr(user, 'super_user_activated_at', now)
        total_hours = (new_expires - activated_at).total_seconds() / 3600

        if total_hours > SuperUserService.MAX_DURATION_HOURS:
            raise ValueError(
                f"總時間不能超過 {SuperUserService.MAX_DURATION_HOURS} 小時"
            )

        # 更新過期時間
        user.super_user_expires_at = new_expires
        await db.commit()

        # 記錄稽核日誌
        if audit_service:
            await audit_service.log({
                "event_type": "SUPER_USER_EXTEND",
                "user_id": str(user_id),
                "approver_id": str(approver_id),
                "additional_hours": additional_hours,
                "new_expires_at": new_expires.isoformat()
            })

        logger.info(
            "super_user_extended",
            user_id=str(user_id)[:8],
            additional_hours=additional_hours,
            new_expires_at=new_expires.isoformat()
        )

        return {
            "success": True,
            "new_expires_at": new_expires,
            "additional_hours": additional_hours
        }

    @staticmethod
    async def list_active(db: AsyncSession) -> List[Dict[str, Any]]:
        """
        列出所有活躍的 Super User

        Returns:
            活躍 Super User 列表
        """
        now = datetime.utcnow()

        result = await db.execute(
            select(User).where(
                and_(
                    User.is_super_user == True,
                    User.super_user_expires_at > now
                )
            )
        )
        users = result.scalars().all()

        return [
            {
                "user_id": str(user.id),
                "email": user.email,
                "role": user.role,
                "activated_at": getattr(user, 'super_user_activated_at', None),
                "expires_at": getattr(user, 'super_user_expires_at', None),
                "reason": getattr(user, 'super_user_reason', None)
            }
            for user in users
        ]


# 單例實例
super_user_service = SuperUserService()
