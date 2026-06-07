"""
Session 管理 API 端點

提供：
- GET /auth/sessions - 列出所有活躍 Session
- DELETE /auth/sessions/:id - 終止特定 Session
- DELETE /auth/sessions - 終止所有 Session（登出所有裝置）
- GET /auth/sessions/count - 取得活躍 Session 數量
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.modules.users.core.database import get_async_session
from app.modules.users.models.user import User
from app.modules.users.services.session_service import session_service
from app.modules.users.api.v1.auth import get_current_user_from_token

logger = structlog.get_logger()
router = APIRouter(prefix="/auth/sessions", tags=["Sessions"])


# ========== Schemas ==========

class SessionItem(BaseModel):
    """Session 項目"""
    id: str
    device_name: str
    browser: str
    os: str
    ip_address: Optional[str] = None
    created_at: Optional[str] = None
    last_activity: Optional[str] = None
    is_current: bool = False


class ListSessionsResponse(BaseModel):
    """Session 列表回應"""
    success: bool
    count: int
    sessions: List[SessionItem]


class TerminateSessionResponse(BaseModel):
    """終止 Session 回應"""
    success: bool
    message: str


class TerminateAllSessionsResponse(BaseModel):
    """終止所有 Session 回應"""
    success: bool
    message: str
    terminated_count: int


class SessionCountResponse(BaseModel):
    """Session 數量回應"""
    success: bool
    count: int


# ========== Helper Functions ==========

def get_session_id_from_request(request: Request) -> Optional[str]:
    """從請求中取得當前 Session ID"""
    # 嘗試從 header 取得
    session_id = request.headers.get("X-Session-ID")
    if session_id:
        return session_id

    # 嘗試從 cookie 取得
    session_id = request.cookies.get("session_id")
    return session_id


async def get_session_id_from_token(request: Request) -> Optional[str]:
    """從 JWT Token 取得 Session ID"""
    from jose import jwt
    import os

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ")[1]
    try:
        JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        jti = payload.get("jti")

        if jti:
            # 透過 JTI 查找 Session
            session = await session_service.get_session_by_jti(jti)
            if session:
                return session.get("session_id")

    except Exception:
        pass

    return None


# ========== Endpoints ==========

@router.get("", response_model=ListSessionsResponse)
async def list_sessions(
    request: Request,
    current_user: User = Depends(get_current_user_from_token)
):
    """
    列出當前用戶的所有活躍 Session

    返回所有裝置的 Session 資訊，包含：
    - 裝置名稱
    - 瀏覽器
    - 作業系統
    - IP 地址
    - 最後活動時間
    - 是否為當前 Session
    """
    try:
        # 取得當前 Session ID
        current_session_id = await get_session_id_from_token(request)

        sessions = await session_service.list_user_sessions(
            user_id=str(current_user.id),
            current_session_id=current_session_id
        )

        return ListSessionsResponse(
            success=True,
            count=len(sessions),
            sessions=[SessionItem(**s) for s in sessions]
        )

    except Exception as e:
        logger.error("list_sessions_error", error=str(e))
        raise HTTPException(status_code=500, detail="查詢失敗")


@router.delete("/{session_id}", response_model=TerminateSessionResponse)
async def terminate_session(
    session_id: str,
    request: Request,
    current_user: User = Depends(get_current_user_from_token)
):
    """
    終止指定的 Session

    可以用來登出特定裝置

    **注意**: 無法終止當前使用的 Session
    """
    try:
        # 檢查是否為當前 Session
        current_session_id = await get_session_id_from_token(request)
        if session_id == current_session_id:
            raise HTTPException(
                status_code=400,
                detail="無法終止當前 Session，請使用登出功能"
            )

        success = await session_service.terminate_session(
            session_id=session_id,
            user_id=str(current_user.id)
        )

        if not success:
            raise HTTPException(status_code=404, detail="Session 不存在或無權限")

        return TerminateSessionResponse(
            success=True,
            message="Session 已終止"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("terminate_session_error", error=str(e))
        raise HTTPException(status_code=500, detail="終止失敗")


@router.delete("", response_model=TerminateAllSessionsResponse)
async def terminate_all_sessions(
    request: Request,
    keep_current: bool = True,
    current_user: User = Depends(get_current_user_from_token)
):
    """
    終止所有 Session（登出所有裝置）

    Args:
        keep_current: 是否保留當前 Session（預設 True）

    **安全功能**: 當發現帳號可能被盜用時使用
    """
    try:
        current_session_id = None
        if keep_current:
            current_session_id = await get_session_id_from_token(request)

        count = await session_service.terminate_all_sessions(
            user_id=str(current_user.id),
            except_session_id=current_session_id
        )

        message = f"已登出 {count} 個裝置"
        if keep_current:
            message += "（保留當前裝置）"

        return TerminateAllSessionsResponse(
            success=True,
            message=message,
            terminated_count=count
        )

    except Exception as e:
        logger.error("terminate_all_sessions_error", error=str(e))
        raise HTTPException(status_code=500, detail="登出失敗")


@router.get("/count", response_model=SessionCountResponse)
async def get_session_count(
    current_user: User = Depends(get_current_user_from_token)
):
    """
    取得活躍 Session 數量

    用於顯示「在 N 個裝置上登入」
    """
    try:
        count = await session_service.get_active_session_count(
            user_id=str(current_user.id)
        )

        return SessionCountResponse(
            success=True,
            count=count
        )

    except Exception as e:
        logger.error("get_session_count_error", error=str(e))
        raise HTTPException(status_code=500, detail="查詢失敗")


@router.get("/{session_id}")
async def get_session_detail(
    session_id: str,
    current_user: User = Depends(get_current_user_from_token)
):
    """
    取得特定 Session 的詳細資訊
    """
    try:
        session = await session_service.get_session(session_id)

        if not session:
            raise HTTPException(status_code=404, detail="Session 不存在")

        # 驗證 Session 屬於該用戶
        if session.get("user_id") != str(current_user.id):
            raise HTTPException(status_code=403, detail="無權限查看此 Session")

        return {
            "success": True,
            "session": {
                "id": session["session_id"],
                "device_name": session.get("device_name"),
                "browser": session.get("browser"),
                "os": session.get("os"),
                "ip_address": session.get("ip_address"),
                "user_agent": session.get("user_agent"),
                "created_at": session.get("created_at"),
                "last_activity": session.get("last_activity")
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_session_detail_error", error=str(e))
        raise HTTPException(status_code=500, detail="查詢失敗")


@router.post("/refresh-activity")
async def refresh_session_activity(
    request: Request,
    current_user: User = Depends(get_current_user_from_token)
):
    """
    更新當前 Session 的最後活動時間

    前端可以定期調用此端點來保持 Session 活躍
    """
    try:
        session_id = await get_session_id_from_token(request)

        if not session_id:
            return {"success": True, "message": "No session to update"}

        success = await session_service.update_activity(session_id)

        return {
            "success": success,
            "message": "Activity updated" if success else "Session not found"
        }

    except Exception as e:
        logger.error("refresh_activity_error", error=str(e))
        return {"success": False, "message": "Update failed"}
