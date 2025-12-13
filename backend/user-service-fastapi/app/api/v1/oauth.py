"""
OAuth API 端點

提供：
- GET /auth/oauth/providers - 取得可用的 OAuth 提供者
- GET /auth/oauth/{provider}/initiate - 啟動 OAuth 流程
- POST /auth/oauth/{provider}/callback - OAuth 回調處理
- POST /auth/oauth/link - 綁定 OAuth 帳號到現有用戶
- DELETE /auth/oauth/{provider}/unlink - 解除 OAuth 綁定
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from jose import jwt
import structlog

from app.core.database import get_async_session
from app.models.user import User
from app.services.oauth_service import oauth_service
from app.api.v1.auth import get_current_user_from_token

logger = structlog.get_logger()
router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])

# JWT 配置（與 auth.py 共用）
import os
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


# ========== Schemas ==========

class OAuthProvidersResponse(BaseModel):
    """可用的 OAuth 提供者回應"""
    providers: Dict[str, bool] = Field(..., description="各提供者的可用狀態")


class OAuthInitiateResponse(BaseModel):
    """OAuth 啟動回應"""
    success: bool
    authorization_url: str = Field(..., description="重定向的授權 URL")
    state: str = Field(..., description="CSRF 防護 state")
    code_verifier: Optional[str] = Field(None, description="PKCE code_verifier（僅 Line）")


class OAuthCallbackRequest(BaseModel):
    """OAuth 回調請求"""
    code: str = Field(..., description="授權碼")
    state: str = Field(..., description="state 參數")
    code_verifier: Optional[str] = Field(None, description="PKCE code_verifier（僅 Line）")
    redirect_uri: Optional[str] = Field(None, description="自定義回調 URL")


class OAuthCallbackResponse(BaseModel):
    """OAuth 回調回應"""
    success: bool
    message: str
    is_new_user: bool = Field(False, description="是否為新用戶")
    requires_registration: bool = Field(False, description="是否需要完成註冊")
    user: Optional[Dict[str, Any]] = None
    token: Optional[str] = None
    refresh_token: Optional[str] = None
    oauth_data: Optional[Dict[str, Any]] = Field(None, description="OAuth 用戶資料（需要註冊時提供）")


class OAuthLinkRequest(BaseModel):
    """綁定 OAuth 請求"""
    provider: str = Field(..., description="OAuth 提供者（line/google）")
    code: str = Field(..., description="授權碼")
    state: str = Field(..., description="state 參數")
    code_verifier: Optional[str] = None
    redirect_uri: Optional[str] = None


class OAuthLinkResponse(BaseModel):
    """綁定 OAuth 回應"""
    success: bool
    message: str
    provider: str


class OAuthCompleteRegistrationRequest(BaseModel):
    """完成 OAuth 註冊請求"""
    provider: str
    provider_user_id: str
    email: str = Field(..., description="用戶 Email")
    organization_name: str = Field(..., description="組織名稱")
    organization_type: str = Field(..., description="組織類型")
    phone: Optional[str] = None


class OAuthCompleteRegistrationResponse(BaseModel):
    """完成 OAuth 註冊回應"""
    success: bool
    message: str
    user: Optional[Dict[str, Any]] = None
    token: Optional[str] = None
    refresh_token: Optional[str] = None


# ========== Endpoints ==========

@router.get("/providers", response_model=OAuthProvidersResponse)
async def get_providers():
    """
    取得可用的 OAuth 提供者

    返回各 OAuth 提供者的配置狀態
    """
    return OAuthProvidersResponse(
        providers=oauth_service.get_available_providers()
    )


@router.get("/{provider}/initiate", response_model=OAuthInitiateResponse)
async def initiate_oauth(
    provider: str,
    redirect_uri: Optional[str] = None
):
    """
    啟動 OAuth 授權流程

    Args:
        provider: OAuth 提供者（line/google）
        redirect_uri: 自定義回調 URL（可選）

    Returns:
        authorization_url: 前端應重定向到此 URL
        state: 用於驗證回調
        code_verifier: PKCE code_verifier（Line 需要）
    """
    try:
        if provider == "line":
            if not oauth_service.is_line_available():
                raise HTTPException(status_code=503, detail="Line OAuth 未配置")

            result = await oauth_service.get_line_authorization_url(redirect_uri)
            return OAuthInitiateResponse(
                success=True,
                authorization_url=result["authorization_url"],
                state=result["state"],
                code_verifier=result["code_verifier"]
            )

        elif provider == "google":
            if not oauth_service.is_google_available():
                raise HTTPException(status_code=503, detail="Google OAuth 未配置")

            result = await oauth_service.get_google_authorization_url(redirect_uri)
            return OAuthInitiateResponse(
                success=True,
                authorization_url=result["authorization_url"],
                state=result["state"],
                code_verifier=None
            )

        else:
            raise HTTPException(status_code=400, detail=f"不支援的 OAuth 提供者: {provider}")

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("oauth_initiate_error", provider=provider, error=str(e))
        raise HTTPException(status_code=500, detail="OAuth 初始化失敗")


@router.post("/{provider}/callback", response_model=OAuthCallbackResponse)
async def oauth_callback(
    provider: str,
    request: OAuthCallbackRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    處理 OAuth 回調

    流程：
    1. 用授權碼換取 access token
    2. 取得 OAuth 用戶資料
    3. 查找是否已有綁定的用戶
    4. 如有則登入，否則返回需要註冊的資料

    Args:
        provider: OAuth 提供者
        request: 包含 code、state、code_verifier
    """
    try:
        # 處理 OAuth 回調，取得用戶資料
        oauth_data = await oauth_service.handle_oauth_callback(
            provider=provider,
            code=request.code,
            state=request.state,
            code_verifier=request.code_verifier,
            redirect_uri=request.redirect_uri
        )

        logger.info(
            "oauth_callback_processed",
            provider=provider,
            provider_user_id=oauth_data["provider_user_id"][:8]
        )

        # 查找已綁定的用戶
        # 先嘗試用 oauth_links 表查找
        from sqlalchemy import text
        result = await db.execute(
            text("""
                SELECT u.* FROM users u
                JOIN oauth_links o ON u.id = o.user_id
                WHERE o.provider = :provider AND o.provider_user_id = :provider_user_id
            """),
            {"provider": provider, "provider_user_id": oauth_data["provider_user_id"]}
        )
        existing_link = result.fetchone()

        if existing_link:
            # 已有綁定，直接登入
            user = await db.get(User, existing_link.id)

            if not user or user.status != "active":
                raise HTTPException(status_code=403, detail="帳號已停用")

            # 更新最後登入時間
            user.last_login_at = datetime.utcnow()
            await db.commit()

            # 生成 JWT
            token_data = {
                "sub": str(user.id),
                "email": user.email,
                "role": user.role,
                "organization_id": str(user.organization_id) if user.organization_id else None,
                "exp": datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
            }
            access_token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)

            return OAuthCallbackResponse(
                success=True,
                message="登入成功",
                is_new_user=False,
                requires_registration=False,
                user={
                    "id": str(user.id),
                    "email": user.email,
                    "display_name": user.display_name,
                    "role": user.role
                },
                token=access_token
            )

        else:
            # 沒有綁定，檢查 email 是否已存在
            if oauth_data.get("email"):
                result = await db.execute(
                    select(User).where(User.email == oauth_data["email"])
                )
                existing_user = result.scalar_one_or_none()

                if existing_user:
                    # Email 已存在但未綁定 OAuth
                    return OAuthCallbackResponse(
                        success=True,
                        message="此 Email 已註冊，請使用密碼登入後綁定 OAuth",
                        is_new_user=False,
                        requires_registration=False,
                        oauth_data={
                            "provider": provider,
                            "provider_user_id": oauth_data["provider_user_id"],
                            "email": oauth_data.get("email"),
                            "name": oauth_data.get("name"),
                            "avatar_url": oauth_data.get("avatar_url")
                        }
                    )

            # 需要完成註冊
            return OAuthCallbackResponse(
                success=True,
                message="請完成註冊",
                is_new_user=True,
                requires_registration=True,
                oauth_data={
                    "provider": provider,
                    "provider_user_id": oauth_data["provider_user_id"],
                    "email": oauth_data.get("email"),
                    "name": oauth_data.get("name"),
                    "avatar_url": oauth_data.get("avatar_url")
                }
            )

    except ValueError as e:
        logger.error("oauth_callback_error", provider=provider, error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error("oauth_callback_error", provider=provider, error=str(e))
        raise HTTPException(status_code=500, detail="OAuth 回調處理失敗")


@router.post("/complete-registration", response_model=OAuthCompleteRegistrationResponse)
async def complete_oauth_registration(
    request: OAuthCompleteRegistrationRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    完成 OAuth 用戶註冊

    當 OAuth 回調返回 requires_registration=True 時調用
    """
    from app.models.organization import Organization
    from passlib.context import CryptContext
    import uuid

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    try:
        # 檢查 email 是否已存在
        result = await db.execute(
            select(User).where(User.email == request.email)
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email 已被註冊")

        # 創建組織
        organization = Organization(
            name=request.organization_name,
            type=request.organization_type,
            status="active"
        )
        db.add(organization)
        await db.flush()

        # 創建用戶（無密碼，僅 OAuth 登入）
        user = User(
            email=request.email,
            password_hash=pwd_context.hash(uuid.uuid4().hex),  # 隨機密碼
            organization_id=organization.id,
            role=f"{request.organization_type}_admin",
            status="active",
            phone=request.phone,
            email_verified=request.provider == "google",  # Google 提供已驗證的 email
            created_at=datetime.utcnow()
        )
        db.add(user)
        await db.flush()

        # 創建 OAuth 綁定
        from sqlalchemy import text
        await db.execute(
            text("""
                INSERT INTO oauth_links (user_id, provider, provider_user_id, created_at)
                VALUES (:user_id, :provider, :provider_user_id, :created_at)
            """),
            {
                "user_id": user.id,
                "provider": request.provider,
                "provider_user_id": request.provider_user_id,
                "created_at": datetime.utcnow()
            }
        )

        await db.commit()

        # 生成 JWT
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "organization_id": str(user.organization_id),
            "exp": datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        }
        access_token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)

        logger.info(
            "oauth_registration_completed",
            provider=request.provider,
            user_id=str(user.id)[:8]
        )

        return OAuthCompleteRegistrationResponse(
            success=True,
            message="註冊成功",
            user={
                "id": str(user.id),
                "email": user.email,
                "role": user.role,
                "organization_id": str(organization.id)
            },
            token=access_token
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("oauth_registration_error", error=str(e))
        raise HTTPException(status_code=500, detail="註冊失敗")


@router.post("/link", response_model=OAuthLinkResponse)
async def link_oauth_account(
    request: OAuthLinkRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    將 OAuth 帳號綁定到當前用戶

    需要先登入，然後綁定 OAuth 帳號
    """
    try:
        # 處理 OAuth 回調
        oauth_data = await oauth_service.handle_oauth_callback(
            provider=request.provider,
            code=request.code,
            state=request.state,
            code_verifier=request.code_verifier,
            redirect_uri=request.redirect_uri
        )

        # 檢查是否已被其他用戶綁定
        from sqlalchemy import text
        result = await db.execute(
            text("""
                SELECT user_id FROM oauth_links
                WHERE provider = :provider AND provider_user_id = :provider_user_id
            """),
            {"provider": request.provider, "provider_user_id": oauth_data["provider_user_id"]}
        )
        existing_link = result.fetchone()

        if existing_link:
            if existing_link.user_id == current_user.id:
                return OAuthLinkResponse(
                    success=True,
                    message="此帳號已綁定",
                    provider=request.provider
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail="此 OAuth 帳號已被其他用戶綁定"
                )

        # 創建綁定
        await db.execute(
            text("""
                INSERT INTO oauth_links (user_id, provider, provider_user_id, created_at)
                VALUES (:user_id, :provider, :provider_user_id, :created_at)
            """),
            {
                "user_id": current_user.id,
                "provider": request.provider,
                "provider_user_id": oauth_data["provider_user_id"],
                "created_at": datetime.utcnow()
            }
        )
        await db.commit()

        logger.info(
            "oauth_account_linked",
            user_id=str(current_user.id)[:8],
            provider=request.provider
        )

        return OAuthLinkResponse(
            success=True,
            message=f"成功綁定 {request.provider} 帳號",
            provider=request.provider
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("oauth_link_error", error=str(e))
        raise HTTPException(status_code=500, detail="綁定失敗")


@router.delete("/{provider}/unlink", response_model=OAuthLinkResponse)
async def unlink_oauth_account(
    provider: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    解除 OAuth 帳號綁定

    注意：如果用戶沒有設定密碼，且只有一個 OAuth 綁定，將無法解除
    """
    try:
        from sqlalchemy import text

        # 檢查用戶是否有密碼
        has_password = current_user.password_hash is not None

        # 計算 OAuth 綁定數量
        result = await db.execute(
            text("SELECT COUNT(*) FROM oauth_links WHERE user_id = :user_id"),
            {"user_id": current_user.id}
        )
        oauth_count = result.scalar()

        if not has_password and oauth_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="無法解除綁定：您沒有設定密碼且只有一個 OAuth 登入方式"
            )

        # 刪除綁定
        result = await db.execute(
            text("""
                DELETE FROM oauth_links
                WHERE user_id = :user_id AND provider = :provider
            """),
            {"user_id": current_user.id, "provider": provider}
        )

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="未找到此 OAuth 綁定")

        await db.commit()

        logger.info(
            "oauth_account_unlinked",
            user_id=str(current_user.id)[:8],
            provider=provider
        )

        return OAuthLinkResponse(
            success=True,
            message=f"已解除 {provider} 綁定",
            provider=provider
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("oauth_unlink_error", error=str(e))
        raise HTTPException(status_code=500, detail="解除綁定失敗")


@router.get("/linked-accounts")
async def get_linked_accounts(
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session)
):
    """
    取得當前用戶已綁定的 OAuth 帳號
    """
    from sqlalchemy import text

    result = await db.execute(
        text("""
            SELECT provider, provider_user_id, created_at
            FROM oauth_links
            WHERE user_id = :user_id
        """),
        {"user_id": current_user.id}
    )
    links = result.fetchall()

    return {
        "success": True,
        "linked_accounts": [
            {
                "provider": link.provider,
                "provider_user_id": link.provider_user_id[:8] + "***",
                "linked_at": link.created_at.isoformat() if link.created_at else None
            }
            for link in links
        ]
    }
