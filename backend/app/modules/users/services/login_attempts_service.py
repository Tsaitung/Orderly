"""
Login Attempts Service

處理登入嘗試追蹤和帳號鎖定邏輯

鎖定策略（依據 PRD）：
- 5 次失敗 → 鎖定 5 分鐘
- 10 次失敗 → 鎖定 30 分鐘
- 15 次失敗 → 鎖定 24 小時
"""

import structlog
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.modules.users.models.user import User
from app.modules.users.models.audit_log import AuditLog

logger = structlog.get_logger()


class LoginAttemptsService:
    """登入嘗試追蹤服務"""

    # 鎖定策略配置
    LOCKOUT_THRESHOLDS = [
        {"attempts": 5, "duration_minutes": 5},
        {"attempts": 10, "duration_minutes": 30},
        {"attempts": 15, "duration_minutes": 1440},  # 24 小時
    ]

    # 重置失敗計數的時間（成功登入或經過指定時間後）
    RESET_AFTER_MINUTES = 30

    @classmethod
    async def check_lockout(
        cls,
        user: User,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        檢查用戶是否被鎖定

        Returns:
            {
                "locked": bool,
                "locked_until": datetime | None,
                "remaining_seconds": int | None,
                "message": str | None
            }
        """
        if not user.locked_until:
            return {
                "locked": False,
                "locked_until": None,
                "remaining_seconds": None,
                "message": None
            }

        now = datetime.utcnow()

        if user.locked_until > now:
            remaining = (user.locked_until - now).total_seconds()
            remaining_minutes = int(remaining / 60)

            if remaining_minutes >= 60:
                time_str = f"{remaining_minutes // 60} 小時 {remaining_minutes % 60} 分鐘"
            elif remaining_minutes > 0:
                time_str = f"{remaining_minutes} 分鐘"
            else:
                time_str = f"{int(remaining)} 秒"

            logger.info(
                "login_attempt_blocked_account_locked",
                user_id=str(user.id),
                locked_until=user.locked_until.isoformat(),
                remaining_seconds=remaining
            )

            return {
                "locked": True,
                "locked_until": user.locked_until,
                "remaining_seconds": int(remaining),
                "message": f"帳號已被鎖定，請在 {time_str} 後再試"
            }

        # 鎖定時間已過，自動解鎖
        await cls._unlock_account(user, db)

        return {
            "locked": False,
            "locked_until": None,
            "remaining_seconds": None,
            "message": None
        }

    @classmethod
    async def record_failed_attempt(
        cls,
        user: User,
        db: AsyncSession,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        reason: str = "Invalid credentials"
    ) -> Dict[str, Any]:
        """
        記錄登入失敗嘗試

        Returns:
            {
                "locked": bool,
                "locked_until": datetime | None,
                "attempts_remaining": int,
                "message": str
            }
        """
        # 增加失敗計數
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        attempts = user.failed_login_attempts

        logger.info(
            "login_failed_attempt_recorded",
            user_id=str(user.id),
            email=user.email,
            failed_attempts=attempts,
            ip_address=ip_address
        )

        # 檢查是否需要鎖定
        lockout_info = cls._calculate_lockout(attempts)

        if lockout_info["should_lock"]:
            user.locked_until = datetime.utcnow() + timedelta(
                minutes=lockout_info["duration_minutes"]
            )

            logger.warning(
                "account_locked_due_to_failed_attempts",
                user_id=str(user.id),
                email=user.email,
                failed_attempts=attempts,
                locked_until=user.locked_until.isoformat(),
                duration_minutes=lockout_info["duration_minutes"],
                ip_address=ip_address
            )

            # 記錄審計日誌
            await cls._log_audit(
                db=db,
                user_id=str(user.id),
                event_type="ACCOUNT_LOCK",
                action=f"Account locked after {attempts} failed attempts",
                result="success",
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    "failed_attempts": attempts,
                    "locked_until": user.locked_until.isoformat(),
                    "duration_minutes": lockout_info["duration_minutes"],
                    "reason": reason
                }
            )

            await db.commit()

            return {
                "locked": True,
                "locked_until": user.locked_until,
                "attempts_remaining": 0,
                "message": f"帳號已被鎖定 {lockout_info['duration_minutes']} 分鐘"
            }

        # 記錄登入失敗審計日誌
        await cls._log_audit(
            db=db,
            user_id=str(user.id),
            event_type="LOGIN_FAILED",
            action="Login attempt failed",
            result="failed",
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                "failed_attempts": attempts,
                "reason": reason
            }
        )

        await db.commit()

        # 計算剩餘嘗試次數
        next_threshold = cls._get_next_threshold(attempts)
        attempts_remaining = next_threshold - attempts if next_threshold else 0

        return {
            "locked": False,
            "locked_until": None,
            "attempts_remaining": attempts_remaining,
            "message": f"登入失敗，剩餘 {attempts_remaining} 次嘗試機會" if attempts_remaining > 0 else None
        }

    @classmethod
    async def record_successful_login(
        cls,
        user: User,
        db: AsyncSession,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """
        記錄成功登入，重置失敗計數

        Args:
            user: 用戶對象
            db: 資料庫 session
            ip_address: 客戶端 IP
            user_agent: User Agent
        """
        had_failures = user.failed_login_attempts > 0

        # 重置失敗計數
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = datetime.utcnow()

        logger.info(
            "login_success_attempts_reset",
            user_id=str(user.id),
            email=user.email,
            previous_failed_attempts=had_failures,
            ip_address=ip_address
        )

        # 記錄審計日誌
        await cls._log_audit(
            db=db,
            user_id=str(user.id),
            event_type="LOGIN_SUCCESS",
            action="User logged in successfully",
            result="success",
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={
                "previous_failed_attempts": user.failed_login_attempts if had_failures else 0
            }
        )

        await db.commit()

    @classmethod
    async def _unlock_account(
        cls,
        user: User,
        db: AsyncSession
    ) -> None:
        """解鎖帳號（不重置失敗計數）"""
        user.locked_until = None

        logger.info(
            "account_unlocked_automatically",
            user_id=str(user.id),
            email=user.email,
            failed_attempts=user.failed_login_attempts
        )

        await db.commit()

    @classmethod
    def _calculate_lockout(cls, attempts: int) -> Dict[str, Any]:
        """
        計算是否需要鎖定以及鎖定時長

        Returns:
            {
                "should_lock": bool,
                "duration_minutes": int
            }
        """
        for threshold in cls.LOCKOUT_THRESHOLDS:
            if attempts == threshold["attempts"]:
                return {
                    "should_lock": True,
                    "duration_minutes": threshold["duration_minutes"]
                }

        return {
            "should_lock": False,
            "duration_minutes": 0
        }

    @classmethod
    def _get_next_threshold(cls, current_attempts: int) -> Optional[int]:
        """取得下一個鎖定閾值"""
        for threshold in cls.LOCKOUT_THRESHOLDS:
            if current_attempts < threshold["attempts"]:
                return threshold["attempts"]
        return None

    @classmethod
    async def get_login_stats(
        cls,
        user: User
    ) -> Dict[str, Any]:
        """
        取得用戶登入統計

        Returns:
            {
                "failed_attempts": int,
                "is_locked": bool,
                "locked_until": datetime | None,
                "last_login": datetime | None,
                "next_lockout_at": int | None
            }
        """
        is_locked = False
        if user.locked_until:
            is_locked = user.locked_until > datetime.utcnow()

        next_threshold = cls._get_next_threshold(user.failed_login_attempts or 0)

        return {
            "failed_attempts": user.failed_login_attempts or 0,
            "is_locked": is_locked,
            "locked_until": user.locked_until if is_locked else None,
            "last_login": user.last_login_at,
            "next_lockout_at": next_threshold
        }

    @classmethod
    async def admin_unlock_account(
        cls,
        user: User,
        db: AsyncSession,
        admin_user_id: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        管理員手動解鎖帳號

        Args:
            user: 要解鎖的用戶
            db: 資料庫 session
            admin_user_id: 執行操作的管理員 ID
            ip_address: 管理員 IP

        Returns:
            {
                "success": bool,
                "message": str
            }
        """
        if not user.locked_until:
            return {
                "success": False,
                "message": "帳號未被鎖定"
            }

        previous_locked_until = user.locked_until
        user.locked_until = None
        user.failed_login_attempts = 0

        logger.info(
            "account_unlocked_by_admin",
            user_id=str(user.id),
            admin_user_id=admin_user_id,
            previous_locked_until=previous_locked_until.isoformat(),
            ip_address=ip_address
        )

        # 記錄審計日誌
        await cls._log_audit(
            db=db,
            user_id=str(user.id),
            event_type="ACCOUNT_UNLOCK",
            action="Account unlocked by administrator",
            result="success",
            ip_address=ip_address,
            metadata={
                "admin_user_id": admin_user_id,
                "previous_locked_until": previous_locked_until.isoformat()
            }
        )

        await db.commit()

        return {
            "success": True,
            "message": "帳號已解鎖"
        }

    @classmethod
    async def _log_audit(
        cls,
        db: AsyncSession,
        user_id: str,
        event_type: str,
        action: str,
        result: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> None:
        """記錄審計日誌"""
        try:
            audit_log = AuditLog(
                user_id=user_id,
                event_type=event_type,
                action=action,
                event_result=result,
                ip_address=ip_address,
                user_agent=user_agent,
                event_metadata=metadata or {}
            )
            db.add(audit_log)
        except Exception as e:
            logger.error(
                "audit_log_failed",
                user_id=user_id,
                event_type=event_type,
                error=str(e)
            )
