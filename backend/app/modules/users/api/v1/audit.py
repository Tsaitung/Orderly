"""
稽核日誌 API 端點

提供：
- GET /audit/logs - 查詢稽核日誌
- GET /audit/user/{user_id}/activity - 取得用戶活動摘要
- GET /audit/security-events - 取得安全事件
- GET /audit/export - 匯出稽核日誌
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
import structlog
import csv
import io

from app.modules.users.core.database import get_async_session
from app.modules.users.models.user import User
from app.modules.users.models.audit_log import AuditEventType, AuditEventResult
from app.modules.users.services.audit_service import AuditService
from app.modules.users.api.v1.auth import get_current_user_from_token

logger = structlog.get_logger()
router = APIRouter(prefix="/audit", tags=["Audit"])


# ========== Schemas ==========

class AuditLogItem(BaseModel):
    """稽核日誌項目"""
    id: str
    event_type: str
    event_result: str
    action: Optional[str] = None
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    organization_id: Optional[str] = None
    target_user_id: Optional[str] = None
    target_user_email: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: datetime


class AuditLogsResponse(BaseModel):
    """稽核日誌查詢回應"""
    success: bool
    total: int
    logs: List[AuditLogItem]
    has_more: bool


class UserActivityResponse(BaseModel):
    """用戶活動摘要回應"""
    success: bool
    user_id: str
    period_days: int
    login_count: int
    failed_login_count: int
    password_changes: int
    mfa_events: int
    last_login: Optional[datetime] = None
    last_ip: Optional[str] = None
    unique_ips: int


class SecurityEventItem(BaseModel):
    """安全事件項目"""
    id: str
    event_type: str
    event_result: str
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: datetime


class SecurityEventsResponse(BaseModel):
    """安全事件列表回應"""
    success: bool
    count: int
    events: List[SecurityEventItem]


class EventTypesResponse(BaseModel):
    """事件類型列表"""
    success: bool
    event_types: List[dict]


# ========== Endpoints ==========

@router.get("/logs", response_model=AuditLogsResponse)
async def query_audit_logs(
    user_id: Optional[str] = Query(None, description="用戶 ID"),
    organization_id: Optional[str] = Query(None, description="組織 ID"),
    event_type: Optional[str] = Query(None, description="事件類型"),
    result: Optional[str] = Query(None, description="事件結果"),
    start_date: Optional[datetime] = Query(None, description="開始時間"),
    end_date: Optional[datetime] = Query(None, description="結束時間"),
    ip_address: Optional[str] = Query(None, description="IP 地址"),
    limit: int = Query(50, ge=1, le=200, description="每頁數量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    查詢稽核日誌

    **權限**:
    - platform_admin/super_admin: 可查詢所有日誌
    - 其他用戶: 只能查詢自己的日誌
    """
    # 權限檢查
    if current_user.role not in ["platform_admin", "super_admin"]:
        # 非管理員只能查詢自己的
        user_id = str(current_user.id)
        organization_id = None

    try:
        audit_svc = AuditService(db)
        result_data = await audit_svc.query(
            user_id=user_id,
            organization_id=organization_id,
            event_type=event_type,
            result=result,
            start_time=start_date,
            end_time=end_date,
            ip_address=ip_address,
            limit=limit,
            offset=offset,
            db=db
        )

        logs = [
            AuditLogItem(
                id=str(log.id),
                event_type=log.event_type,
                event_result=log.event_result,
                action=log.action,
                user_id=str(log.user_id) if log.user_id else None,
                user_email=log.user_email,
                organization_id=str(log.organization_id) if log.organization_id else None,
                target_user_id=str(log.target_user_id) if log.target_user_id else None,
                target_user_email=log.target_user_email,
                ip_address=log.ip_address,
                user_agent=log.user_agent[:100] if log.user_agent else None,
                request_id=log.request_id,
                metadata=log.event_metadata,
                created_at=log.created_at
            )
            for log in result_data["logs"]
        ]

        return AuditLogsResponse(
            success=True,
            total=result_data["total"],
            logs=logs,
            has_more=result_data["has_more"]
        )

    except Exception as e:
        logger.error("query_audit_logs_error", error=str(e))
        raise HTTPException(status_code=500, detail="查詢失敗")


@router.get("/user/{user_id}/activity", response_model=UserActivityResponse)
async def get_user_activity(
    user_id: str,
    days: int = Query(30, ge=1, le=365, description="統計天數"),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    取得用戶活動摘要

    **權限**:
    - platform_admin/super_admin: 可查詢任何用戶
    - 其他用戶: 只能查詢自己
    """
    # 權限檢查
    if current_user.role not in ["platform_admin", "super_admin"]:
        if str(current_user.id) != user_id:
            raise HTTPException(status_code=403, detail="權限不足")

    try:
        audit_svc = AuditService(db)
        activity = await audit_svc.get_user_activity(
            user_id=user_id,
            days=days,
            db=db
        )

        return UserActivityResponse(
            success=True,
            user_id=user_id,
            period_days=days,
            **activity
        )

    except Exception as e:
        logger.error("get_user_activity_error", error=str(e))
        raise HTTPException(status_code=500, detail="查詢失敗")


@router.get("/security-events", response_model=SecurityEventsResponse)
async def get_security_events(
    hours: int = Query(24, ge=1, le=168, description="最近幾小時"),
    limit: int = Query(100, ge=1, le=500, description="數量限制"),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    取得安全事件列表

    包含：登入失敗、帳號鎖定、可疑活動等

    **權限**: 只有 platform_admin/super_admin 可以查看
    """
    # 權限檢查
    if current_user.role not in ["platform_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="權限不足")

    try:
        audit_svc = AuditService(db)

        security_event_types = [
            AuditEventType.LOGIN_FAILED.value,
            AuditEventType.ACCOUNT_LOCK.value,
            AuditEventType.SUSPICIOUS_ACTIVITY.value,
            AuditEventType.SECURITY_ALERT.value,
            AuditEventType.MFA_VERIFY_FAILED.value,
            AuditEventType.SUPER_USER_ACTIVATE.value,
        ]

        start_time = datetime.utcnow() - timedelta(hours=hours)

        result = await audit_svc.query(
            event_types=security_event_types,
            start_time=start_time,
            limit=limit,
            db=db
        )

        events = [
            SecurityEventItem(
                id=str(log.id),
                event_type=log.event_type,
                event_result=log.event_result,
                user_email=log.user_email,
                ip_address=log.ip_address,
                metadata=log.event_metadata,
                created_at=log.created_at
            )
            for log in result["logs"]
        ]

        return SecurityEventsResponse(
            success=True,
            count=len(events),
            events=events
        )

    except Exception as e:
        logger.error("get_security_events_error", error=str(e))
        raise HTTPException(status_code=500, detail="查詢失敗")


@router.get("/my-activity", response_model=UserActivityResponse)
async def get_my_activity(
    days: int = Query(30, ge=1, le=365, description="統計天數"),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    取得當前用戶的活動摘要
    """
    try:
        audit_svc = AuditService(db)
        activity = await audit_svc.get_user_activity(
            user_id=str(current_user.id),
            days=days,
            db=db
        )

        return UserActivityResponse(
            success=True,
            user_id=str(current_user.id),
            period_days=days,
            **activity
        )

    except Exception as e:
        logger.error("get_my_activity_error", error=str(e))
        raise HTTPException(status_code=500, detail="查詢失敗")


@router.get("/event-types", response_model=EventTypesResponse)
async def get_event_types():
    """
    取得所有事件類型列表
    """
    event_types = [
        {"value": e.value, "name": e.name}
        for e in AuditEventType
    ]

    return EventTypesResponse(
        success=True,
        event_types=event_types
    )


@router.get("/export")
async def export_audit_logs(
    user_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    format: str = Query("csv", enum=["csv", "json"]),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    匯出稽核日誌

    支援 CSV 和 JSON 格式

    **權限**: 只有 platform_admin/super_admin 可以匯出
    """
    # 權限檢查
    if current_user.role not in ["platform_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="權限不足")

    try:
        audit_svc = AuditService(db)
        result = await audit_svc.query(
            user_id=user_id,
            organization_id=organization_id,
            event_type=event_type,
            start_time=start_date,
            end_time=end_date,
            limit=10000,  # 最多匯出 10000 筆
            db=db
        )

        if format == "csv":
            # 生成 CSV
            output = io.StringIO()
            writer = csv.writer(output)

            # 標題列
            writer.writerow([
                "ID", "Event Type", "Result", "Action",
                "User Email", "IP Address", "Created At"
            ])

            # 資料列
            for log in result["logs"]:
                writer.writerow([
                    str(log.id),
                    log.event_type,
                    log.event_result,
                    log.action or "",
                    log.user_email or "",
                    log.ip_address or "",
                    log.created_at.isoformat()
                ])

            output.seek(0)

            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=audit_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
                }
            )

        else:  # JSON
            import json

            logs = [
                {
                    "id": str(log.id),
                    "event_type": log.event_type,
                    "event_result": log.event_result,
                    "action": log.action,
                    "user_email": log.user_email,
                    "ip_address": log.ip_address,
                    "metadata": log.event_metadata,
                    "created_at": log.created_at.isoformat()
                }
                for log in result["logs"]
            ]

            return StreamingResponse(
                iter([json.dumps(logs, indent=2, ensure_ascii=False)]),
                media_type="application/json",
                headers={
                    "Content-Disposition": f"attachment; filename=audit_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
                }
            )

    except Exception as e:
        logger.error("export_audit_logs_error", error=str(e))
        raise HTTPException(status_code=500, detail="匯出失敗")
