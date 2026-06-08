"""
稽核日誌服務

提供：
- 記錄稽核事件
- 查詢稽核日誌
- 安全警報
"""

import os
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, func, text
import structlog
import json

from app.modules.users.models.audit_log import AuditLog, AuditEventType, AuditEventResult

logger = structlog.get_logger()


class AuditService:
    """稽核日誌服務"""

    # 需要即時告警的事件類型
    ALERT_EVENTS = [
        AuditEventType.SUPER_USER_ACTIVATE,
        AuditEventType.SUSPICIOUS_ACTIVITY,
        AuditEventType.SECURITY_ALERT,
        AuditEventType.ACCOUNT_LOCK,
    ]

    # 登入失敗告警閾值
    LOGIN_FAILURE_THRESHOLD = 5
    LOGIN_FAILURE_WINDOW_MINUTES = 15

    def __init__(self, db: AsyncSession = None):
        """初始化稽核服務"""
        self.db = db

    async def log(
        self,
        event_type: str,
        result: str = "SUCCESS",
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        organization_id: Optional[str] = None,
        target_user_id: Optional[str] = None,
        target_user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        action: Optional[str] = None,
        metadata: Optional[Dict] = None,
        db: AsyncSession = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None
    ) -> AuditLog:
        """
        記錄稽核事件

        Args:
            event_type: 事件類型
            result: 事件結果
            user_id: 執行操作的用戶 ID
            user_email: 用戶 Email
            organization_id: 組織 ID
            target_user_id: 目標用戶 ID（如果涉及其他用戶）
            target_user_email: 目標用戶 Email
            ip_address: IP 地址
            user_agent: User Agent
            request_id: 請求追蹤 ID
            action: 詳細動作描述
            metadata: 額外資料
            db: 資料庫會話
            entity_type: 實體類型（如 USER, SESSION, MFA 等）
            entity_id: 實體 ID

        Returns:
            創建的稽核日誌
        """
        session = db or self.db
        if not session:
            logger.warning("audit_log_no_session", event_type=event_type)
            return None

        try:
            # 若未指定 entity_type，根據 event_type 推斷預設值
            resolved_entity_type = entity_type or "USER"

            audit_log = AuditLog(
                event_type=event_type,
                event_result=result,
                action=action,
                entity_type=resolved_entity_type,
                entity_id=entity_id or user_id or "",
                user_id=user_id,
                user_email=user_email,
                organization_id=organization_id,
                target_user_id=target_user_id,
                target_user_email=target_user_email,
                ip_address=ip_address,
                user_agent=user_agent,
                request_id=request_id,
                event_metadata=metadata or {},
                created_at=datetime.utcnow()
            )

            session.add(audit_log)
            await session.commit()

            # 結構化日誌輸出
            logger.info(
                "audit_event",
                event_type=event_type,
                result=result,
                user_id=str(user_id)[:8] if user_id else None,
                ip_address=ip_address
            )

            # 檢查是否需要告警
            if event_type in [e.value for e in self.ALERT_EVENTS]:
                await self._send_alert(audit_log)

            return audit_log

        except Exception as e:
            logger.error("audit_log_error", event_type=event_type, error=str(e))
            return None

    async def query(
        self,
        user_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        event_type: Optional[str] = None,
        event_types: Optional[List[str]] = None,
        result: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        ip_address: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """
        查詢稽核日誌

        Returns:
            {
                "total": int,
                "logs": List[AuditLog],
                "has_more": bool
            }
        """
        session = db or self.db
        if not session:
            return {"total": 0, "logs": [], "has_more": False}

        # 構建查詢條件
        conditions = []

        if user_id:
            conditions.append(AuditLog.user_id == user_id)

        if organization_id:
            conditions.append(AuditLog.organization_id == organization_id)

        if event_type:
            conditions.append(AuditLog.event_type == event_type)

        if event_types:
            conditions.append(AuditLog.event_type.in_(event_types))

        if result:
            conditions.append(AuditLog.event_result == result)

        if start_time:
            conditions.append(AuditLog.created_at >= start_time)

        if end_time:
            conditions.append(AuditLog.created_at <= end_time)

        if ip_address:
            conditions.append(AuditLog.ip_address == ip_address)

        # 計算總數
        count_query = select(func.count(AuditLog.id))
        if conditions:
            count_query = count_query.where(and_(*conditions))

        total_result = await session.execute(count_query)
        total = total_result.scalar()

        # 查詢日誌
        query = select(AuditLog).order_by(desc(AuditLog.created_at))
        if conditions:
            query = query.where(and_(*conditions))

        query = query.limit(limit).offset(offset)

        result = await session.execute(query)
        logs = result.scalars().all()

        return {
            "total": total,
            "logs": logs,
            "has_more": (offset + len(logs)) < total
        }

    async def get_user_activity(
        self,
        user_id: str,
        days: int = 30,
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """
        取得用戶活動摘要

        Returns:
            {
                "login_count": int,
                "failed_login_count": int,
                "password_changes": int,
                "mfa_events": int,
                "last_login": datetime,
                "last_ip": str,
                "unique_ips": int
            }
        """
        session = db or self.db
        if not session:
            return {}

        start_time = datetime.utcnow() - timedelta(days=days)

        # 查詢登入事件
        login_result = await session.execute(
            select(
                func.count(AuditLog.id).filter(AuditLog.event_type == AuditEventType.LOGIN_SUCCESS.value),
                func.count(AuditLog.id).filter(AuditLog.event_type == AuditEventType.LOGIN_FAILED.value)
            ).where(
                and_(
                    AuditLog.user_id == user_id,
                    AuditLog.created_at >= start_time
                )
            )
        )
        login_stats = login_result.fetchone()

        # 密碼變更次數
        password_result = await session.execute(
            select(func.count(AuditLog.id)).where(
                and_(
                    AuditLog.user_id == user_id,
                    AuditLog.event_type == AuditEventType.PASSWORD_CHANGE.value,
                    AuditLog.created_at >= start_time
                )
            )
        )
        password_changes = password_result.scalar()

        # MFA 事件數
        mfa_result = await session.execute(
            select(func.count(AuditLog.id)).where(
                and_(
                    AuditLog.user_id == user_id,
                    AuditLog.event_type.in_([
                        AuditEventType.MFA_ENABLE.value,
                        AuditEventType.MFA_DISABLE.value,
                        AuditEventType.MFA_VERIFY_SUCCESS.value,
                        AuditEventType.MFA_VERIFY_FAILED.value
                    ]),
                    AuditLog.created_at >= start_time
                )
            )
        )
        mfa_events = mfa_result.scalar()

        # 最後登入
        last_login_result = await session.execute(
            select(AuditLog).where(
                and_(
                    AuditLog.user_id == user_id,
                    AuditLog.event_type == AuditEventType.LOGIN_SUCCESS.value
                )
            ).order_by(desc(AuditLog.created_at)).limit(1)
        )
        last_login_log = last_login_result.scalar_one_or_none()

        # 不重複 IP 數
        unique_ips_result = await session.execute(
            select(func.count(func.distinct(AuditLog.ip_address))).where(
                and_(
                    AuditLog.user_id == user_id,
                    AuditLog.created_at >= start_time,
                    AuditLog.ip_address.isnot(None)
                )
            )
        )
        unique_ips = unique_ips_result.scalar()

        return {
            "login_count": login_stats[0] if login_stats else 0,
            "failed_login_count": login_stats[1] if login_stats else 0,
            "password_changes": password_changes,
            "mfa_events": mfa_events,
            "last_login": last_login_log.created_at if last_login_log else None,
            "last_ip": last_login_log.ip_address if last_login_log else None,
            "unique_ips": unique_ips
        }

    async def check_suspicious_activity(
        self,
        user_id: str,
        ip_address: str,
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """
        檢查可疑活動

        檢查項目：
        1. 短時間內多次登入失敗
        2. 從異常位置登入
        3. 異常時間登入

        Returns:
            {
                "is_suspicious": bool,
                "reasons": List[str],
                "risk_level": str  # low/medium/high
            }
        """
        session = db or self.db
        if not session:
            return {"is_suspicious": False, "reasons": [], "risk_level": "low"}

        reasons = []
        risk_score = 0

        # 檢查登入失敗次數
        window_start = datetime.utcnow() - timedelta(minutes=self.LOGIN_FAILURE_WINDOW_MINUTES)
        failure_result = await session.execute(
            select(func.count(AuditLog.id)).where(
                and_(
                    AuditLog.user_id == user_id,
                    AuditLog.event_type == AuditEventType.LOGIN_FAILED.value,
                    AuditLog.created_at >= window_start
                )
            )
        )
        failure_count = failure_result.scalar()

        if failure_count >= self.LOGIN_FAILURE_THRESHOLD:
            reasons.append(f"短時間內 {failure_count} 次登入失敗")
            risk_score += 3

        # 檢查是否為新 IP
        ip_result = await session.execute(
            select(func.count(AuditLog.id)).where(
                and_(
                    AuditLog.user_id == user_id,
                    AuditLog.ip_address == ip_address,
                    AuditLog.event_type == AuditEventType.LOGIN_SUCCESS.value
                )
            )
        )
        ip_count = ip_result.scalar()

        if ip_count == 0:
            reasons.append("首次從此 IP 登入")
            risk_score += 1

        # 計算風險等級
        if risk_score >= 3:
            risk_level = "high"
        elif risk_score >= 1:
            risk_level = "medium"
        else:
            risk_level = "low"

        return {
            "is_suspicious": risk_score >= 1,
            "reasons": reasons,
            "risk_level": risk_level,
            "risk_score": risk_score
        }

    async def _send_alert(self, audit_log: AuditLog):
        """發送安全告警（可整合 Slack/PagerDuty）"""
        # 目前只記錄日誌，未來可整合告警系統
        logger.warning(
            "security_alert",
            event_type=audit_log.event_type,
            user_id=str(audit_log.user_id)[:8] if audit_log.user_id else None,
            ip_address=audit_log.ip_address
        )


# 單例實例
audit_service = AuditService()
