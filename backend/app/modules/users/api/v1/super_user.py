"""
Super User API 端點

提供：
- POST /auth/super-user/activate - 啟用 Super User
- POST /auth/super-user/deactivate - 停用 Super User
- POST /auth/super-user/extend - 延長 Super User 時間
- GET /auth/super-user/status - 取得 Super User 狀態
- GET /auth/super-user/list - 列出所有活躍 Super User
- POST /auth/super-user/check-expiration - 檢查並處理過期（定期任務用）
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.modules.users.core.database import get_async_session
from app.modules.users.models.user import User
from app.modules.users.services.super_user_service import SuperUserService
from app.modules.users.api.v1.auth import get_current_user_from_token

logger = structlog.get_logger()
router = APIRouter(prefix="/auth/super-user", tags=["Super User"])


# ========== Schemas ==========

class ActivateSuperUserRequest(BaseModel):
    """啟用 Super User 請求"""
    reason: str = Field(..., min_length=10, description="啟用原因（至少 10 字）")
    duration_hours: int = Field(1, ge=1, le=24, description="持續時間（1-24 小時）")
    approver_id: Optional[str] = Field(None, description="核准者 ID（超過 1 小時必填）")


class ActivateSuperUserResponse(BaseModel):
    """啟用 Super User 回應"""
    success: bool
    message: str
    activated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    duration_hours: Optional[int] = None


class DeactivateSuperUserRequest(BaseModel):
    """停用 Super User 請求"""
    reason: Optional[str] = Field(None, description="停用原因")


class DeactivateSuperUserResponse(BaseModel):
    """停用 Super User 回應"""
    success: bool
    message: str
    deactivated_at: Optional[datetime] = None


class ExtendSuperUserRequest(BaseModel):
    """延長 Super User 請求"""
    additional_hours: int = Field(..., ge=1, le=12, description="額外時間（1-12 小時）")
    approver_id: str = Field(..., description="核准者 ID")


class ExtendSuperUserResponse(BaseModel):
    """延長 Super User 回應"""
    success: bool
    message: str
    new_expires_at: Optional[datetime] = None
    additional_hours: Optional[int] = None


class SuperUserStatusResponse(BaseModel):
    """Super User 狀態回應"""
    is_super_user: bool
    activated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    remaining_minutes: Optional[int] = None
    reason: Optional[str] = None


class ActiveSuperUserItem(BaseModel):
    """活躍 Super User 項目"""
    user_id: str
    email: str
    role: str
    activated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    reason: Optional[str] = None


class ListActiveSuperUsersResponse(BaseModel):
    """活躍 Super User 列表回應"""
    success: bool
    count: int
    super_users: List[ActiveSuperUserItem]


class CheckExpirationResponse(BaseModel):
    """檢查過期回應"""
    success: bool
    checked_at: datetime
    expired_count: int
    expired_users: List[str]


# ========== Endpoints ==========

@router.post("/activate", response_model=ActivateSuperUserResponse)
async def activate_super_user(
    request: ActivateSuperUserRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    啟用 Super User 權限

    規則：
    - 只有 platform_admin 或 super_admin 角色可以啟用
    - 必須已啟用 MFA
    - 最長持續時間 24 小時
    - 超過 1 小時需要核准者

    **安全警告**: 此操作會被記錄在稽核日誌中
    """
    try:
        result = await SuperUserService.activate(
            user_id=str(current_user.id),
            reason=request.reason,
            duration_hours=request.duration_hours,
            approver_id=request.approver_id,
            db=db
        )

        return ActivateSuperUserResponse(
            success=True,
            message=f"Super User 已啟用，將於 {result['expires_at']} 過期",
            activated_at=result["activated_at"],
            expires_at=result["expires_at"],
            duration_hours=result["duration_hours"]
        )

    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("super_user_activate_error", error=str(e))
        raise HTTPException(status_code=500, detail="啟用失敗")


@router.post("/deactivate", response_model=DeactivateSuperUserResponse)
async def deactivate_super_user(
    request: DeactivateSuperUserRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    停用 Super User 權限

    可以停用自己的 Super User 權限
    """
    try:
        result = await SuperUserService.deactivate(
            user_id=str(current_user.id),
            db=db,
            deactivated_by=str(current_user.id),
            reason=request.reason
        )

        return DeactivateSuperUserResponse(
            success=True,
            message="Super User 已停用",
            deactivated_at=result["deactivated_at"]
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("super_user_deactivate_error", error=str(e))
        raise HTTPException(status_code=500, detail="停用失敗")


@router.post("/extend", response_model=ExtendSuperUserResponse)
async def extend_super_user(
    request: ExtendSuperUserRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    延長 Super User 時間

    規則：
    - 必須有核准者
    - 總時間不能超過 24 小時
    - 不能自我核准
    """
    try:
        result = await SuperUserService.extend(
            user_id=str(current_user.id),
            additional_hours=request.additional_hours,
            approver_id=request.approver_id,
            db=db
        )

        return ExtendSuperUserResponse(
            success=True,
            message=f"已延長 {request.additional_hours} 小時",
            new_expires_at=result["new_expires_at"],
            additional_hours=result["additional_hours"]
        )

    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("super_user_extend_error", error=str(e))
        raise HTTPException(status_code=500, detail="延長失敗")


@router.get("/status", response_model=SuperUserStatusResponse)
async def get_super_user_status(
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    取得當前用戶的 Super User 狀態
    """
    try:
        status = await SuperUserService.get_status(
            user_id=str(current_user.id),
            db=db
        )

        return SuperUserStatusResponse(**status)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("super_user_status_error", error=str(e))
        raise HTTPException(status_code=500, detail="查詢失敗")


@router.get("/list", response_model=ListActiveSuperUsersResponse)
async def list_active_super_users(
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    列出所有活躍的 Super User

    只有 platform_admin 或 super_admin 可以查看
    """
    # 權限檢查
    if current_user.role not in ["platform_admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="權限不足")

    try:
        users = await SuperUserService.list_active(db)

        return ListActiveSuperUsersResponse(
            success=True,
            count=len(users),
            super_users=[ActiveSuperUserItem(**u) for u in users]
        )

    except Exception as e:
        logger.error("super_user_list_error", error=str(e))
        raise HTTPException(status_code=500, detail="查詢失敗")


@router.post("/check-expiration", response_model=CheckExpirationResponse)
async def check_super_user_expiration(
    db: AsyncSession = Depends(get_async_session)
):
    """
    檢查並停用過期的 Super User

    此端點應由定期任務（如 Cloud Scheduler）調用

    **注意**: 建議每分鐘調用一次
    """
    try:
        result = await SuperUserService.check_expiration(db)

        return CheckExpirationResponse(
            success=True,
            checked_at=result["checked_at"],
            expired_count=result["expired_count"],
            expired_users=result["expired_users"]
        )

    except Exception as e:
        logger.error("super_user_check_expiration_error", error=str(e))
        raise HTTPException(status_code=500, detail="檢查失敗")


@router.post("/force-deactivate/{user_id}", response_model=DeactivateSuperUserResponse)
async def force_deactivate_super_user(
    user_id: str,
    request: DeactivateSuperUserRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    強制停用指定用戶的 Super User 權限

    只有 super_admin 可以強制停用其他用戶
    """
    # 權限檢查
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="只有 super_admin 可以強制停用")

    try:
        result = await SuperUserService.deactivate(
            user_id=user_id,
            db=db,
            deactivated_by=str(current_user.id),
            reason=request.reason or "Force deactivated by admin"
        )

        return DeactivateSuperUserResponse(
            success=True,
            message=f"用戶 {user_id[:8]}... 的 Super User 已強制停用",
            deactivated_at=result["deactivated_at"]
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("super_user_force_deactivate_error", error=str(e))
        raise HTTPException(status_code=500, detail="強制停用失敗")
