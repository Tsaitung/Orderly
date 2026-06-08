"""
管理員端點模組

包含帳號解鎖、登入統計等管理功能
"""

from datetime import datetime
from typing import Any, Dict

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.core.database import get_async_session
from app.modules.users.models.user import User
from app.modules.users.services.login_attempts_service import LoginAttemptsService

from .core import get_current_user_from_token

logger = structlog.get_logger()

router = APIRouter()


@router.get("/auth/login-stats")
async def get_login_stats(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    """
    取得當前用戶的登入統計（需要登入）

    返回：
    - 失敗嘗試次數
    - 是否被鎖定
    - 鎖定時間
    - 最後登入時間
    """
    try:
        current_user = await get_current_user_from_token(request, db)
        stats = await LoginAttemptsService.get_login_stats(current_user)

        return {
            "success": True,
            "data": stats
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error("get_login_stats_error", error=str(e))
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/auth/admin/unlock-account/{user_id}")
async def admin_unlock_account(
    user_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    """
    管理員手動解鎖用戶帳號

    需要：
    - 管理員權限（platform_admin 或 super_admin 角色）

    流程：
    1. 驗證管理員身份
    2. 解鎖目標用戶帳號
    3. 記錄審計日誌
    """
    client_ip = request.client.host if request.client else "unknown"

    try:
        # 驗證管理員身份
        admin_user = await get_current_user_from_token(request, db)

        # 檢查管理員權限
        admin_roles = ["platform_admin", "super_admin"]
        if admin_user.role not in admin_roles:
            logger.warn(
                "admin_unlock_unauthorized",
                admin_user_id=str(admin_user.id),
                admin_role=admin_user.role,
                target_user_id=user_id
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="需要管理員權限"
            )

        # 查找目標用戶
        result = await db.execute(select(User).where(User.id == user_id))
        target_user = result.scalar_one_or_none()

        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )

        # 執行解鎖
        unlock_result = await LoginAttemptsService.admin_unlock_account(
            user=target_user,
            db=db,
            admin_user_id=str(admin_user.id),
            ip_address=client_ip
        )

        return {
            "success": unlock_result["success"],
            "message": unlock_result["message"],
            "data": {
                "user_id": user_id,
                "unlocked_by": str(admin_user.id),
                "unlocked_at": datetime.utcnow().isoformat()
            }
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            "admin_unlock_account_error",
            user_id=user_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="解鎖失敗"
        )


@router.get("/auth/admin/user/{user_id}/login-stats")
async def admin_get_user_login_stats(
    user_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    """
    管理員查看特定用戶的登入統計

    需要管理員權限
    """
    try:
        # 驗證管理員身份
        admin_user = await get_current_user_from_token(request, db)

        admin_roles = ["platform_admin", "super_admin"]
        if admin_user.role not in admin_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="需要管理員權限"
            )

        # 查找目標用戶
        result = await db.execute(select(User).where(User.id == user_id))
        target_user = result.scalar_one_or_none()

        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )

        stats = await LoginAttemptsService.get_login_stats(target_user)

        return {
            "success": True,
            "data": {
                "user_id": user_id,
                "email": target_user.email,
                **stats
            }
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            "admin_get_user_login_stats_error",
            user_id=user_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="查詢失敗"
        )
