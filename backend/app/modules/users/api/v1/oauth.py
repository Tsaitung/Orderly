"""
OAuth API endpoints.

The auth model is social-only: Line can create a new account, Google can only
log in after it is already bound, and platform users must be provisioned and
pass MFA before an access token is issued.
"""

import ipaddress
import os
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.api.v1.auth.core import (
    JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    _build_claims,
    create_access_token,
    create_refresh_token,
    get_current_user_from_token,
)
from app.modules.users.api.v1.mfa import create_mfa_challenge_token
from app.modules.users.core.database import get_async_session
from app.modules.users.models.audit_log import AuditEventResult, AuditLog
from app.modules.users.models.oauth_link import OAuthLink
from app.modules.users.models.organization import Organization
from app.modules.users.models.platform_provisioning import PlatformProvisioning
from app.modules.users.models.session import Session as UserSession
from app.modules.users.models.user import User
from app.modules.users.services.oauth_service import oauth_service

logger = structlog.get_logger()
router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])

SOCIAL_PROVIDERS = {"line", "google"}
PLATFORM_ROLES = {"platform_admin", "platform_support", "super_admin"}
PLATFORM_AUTH_ALLOWED_IPS_ENV = "PLATFORM_AUTH_ALLOWED_IPS"
PLATFORM_AUTH_LOCK_THRESHOLD = 3
PLATFORM_AUTH_LOCK_MINUTES = 15
PLATFORM_AUTH_MAX_ACTIVE_SESSIONS = 3
REGISTRATION_TICKET_EXPIRE_MINUTES = 10
LOCAL_ENVIRONMENTS = {"development", "dev", "local", "testing", "test"}


class OAuthProvidersResponse(BaseModel):
    providers: Dict[str, bool] = Field(..., description="Available OAuth providers")


class OAuthInitiateResponse(BaseModel):
    success: bool
    authorization_url: str = Field(..., description="Provider authorization URL")
    state: str = Field(..., description="CSRF state")
    code_verifier: Optional[str] = Field(None, description="PKCE verifier for Line")


class OAuthCallbackRequest(BaseModel):
    code: str = Field(..., description="Authorization code")
    state: str = Field(..., description="CSRF state")
    code_verifier: Optional[str] = Field(None, description="PKCE verifier for Line")
    redirect_uri: Optional[str] = Field(None, description="Frontend callback URI")


class OAuthCallbackResponse(BaseModel):
    success: bool
    message: str
    is_new_user: bool = False
    requires_registration: bool = False
    requires_mfa: bool = False
    challenge_token: Optional[str] = None
    mfa_method: Optional[str] = None
    user: Optional[Dict[str, Any]] = None
    token: Optional[str] = None
    refresh_token: Optional[str] = None
    oauth_data: Optional[Dict[str, Any]] = Field(None, description="OAuth profile for registration")


class OAuthLinkRequest(BaseModel):
    provider: str = Field(..., description="OAuth provider: line/google")
    code: str = Field(..., description="Authorization code")
    state: str = Field(..., description="CSRF state")
    code_verifier: Optional[str] = None
    redirect_uri: Optional[str] = None


class OAuthLinkResponse(BaseModel):
    success: bool
    message: str
    provider: str


class OAuthCompleteRegistrationRequest(BaseModel):
    provider: str
    registration_ticket: str = Field(..., min_length=16)
    email: Optional[EmailStr] = Field(None, description="Optional billing contact email")
    organization_name: str = Field(..., description="Organization name")
    organization_type: str = Field(..., description="restaurant or supplier")
    phone: Optional[str] = None


class OAuthCompleteRegistrationResponse(BaseModel):
    success: bool
    message: str
    user: Optional[Dict[str, Any]] = None
    token: Optional[str] = None
    refresh_token: Optional[str] = None


def _normalize_provider(provider: str) -> str:
    normalized = provider.lower().strip()
    if normalized not in SOCIAL_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"不支援的 OAuth 提供者: {provider}")
    return normalized


def _role_value(user: User) -> str:
    return str(user.role)


def _is_platform_user(user: User) -> bool:
    return _role_value(user) in PLATFORM_ROLES


def _is_active_user(user: User) -> bool:
    return user.status == "active" and bool(user.is_active)


def _mask_provider_user_id(provider_user_id: str) -> str:
    return f"{provider_user_id[:8]}***" if provider_user_id else ""


def _environment_family() -> str:
    return os.getenv("ENVIRONMENT") or os.getenv("ENV") or "development"


def _extract_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        first_ip = forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    return request.client.host if request.client else ""


def _platform_allowed_ip_entries() -> list[str]:
    configured = os.getenv(PLATFORM_AUTH_ALLOWED_IPS_ENV, "")
    return [entry.strip() for entry in configured.split(",") if entry.strip()]


def _client_ip_allowed_for_platform(client_ip: str) -> bool:
    entries = _platform_allowed_ip_entries()
    env = _environment_family().lower()
    if not entries:
        return env in LOCAL_ENVIRONMENTS

    if "*" in entries:
        return env in LOCAL_ENVIRONMENTS

    try:
        parsed_ip = ipaddress.ip_address(client_ip)
    except ValueError:
        return False

    for entry in entries:
        try:
            if parsed_ip in ipaddress.ip_network(entry, strict=False):
                return True
        except ValueError:
            logger.warning("platform_ip_allowlist_invalid_entry", entry=entry)

    return False


def _platform_lock_seconds(user: User) -> int:
    if not user.locked_until:
        return 0
    remaining = (user.locked_until - datetime.utcnow()).total_seconds()
    return max(int(remaining), 0)


def _record_platform_failed_attempt(user: User) -> bool:
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    if user.failed_login_attempts >= PLATFORM_AUTH_LOCK_THRESHOLD:
        user.locked_until = datetime.utcnow() + timedelta(minutes=PLATFORM_AUTH_LOCK_MINUTES)
        return True
    return False


def _reset_platform_failed_attempts(user: User) -> None:
    user.failed_login_attempts = 0
    user.locked_until = None


async def _platform_active_session_count(db: AsyncSession, user: User) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(UserSession)
        .where(
            UserSession.user_id == str(user.id),
            UserSession.expires_at > datetime.utcnow(),
        )
    )
    return int(result.scalar_one() or 0)


def _user_payload(user: User, org: Organization) -> Dict[str, Any]:
    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "role": _role_value(user),
        "status": user.status,
        "permissions": user.permissions or [],
        "tenant": {
            "id": user.tenant_id or str(org.id),
            "type": user.tenant_type or org.type,
        },
        "organization": {
            "id": str(org.id),
            "name": org.name,
            "type": org.type,
        },
    }


async def _get_oauth_link(
    db: AsyncSession,
    provider: str,
    provider_user_id: str,
) -> OAuthLink | None:
    result = await db.execute(
        select(OAuthLink).where(
            OAuthLink.provider == provider,
            OAuthLink.provider_user_id == provider_user_id,
        )
    )
    return result.scalar_one_or_none()


async def _get_platform_provisioning(
    db: AsyncSession,
    provider: str,
    provider_user_id: str,
) -> PlatformProvisioning | None:
    result = await db.execute(
        select(PlatformProvisioning).where(
            PlatformProvisioning.provider == provider,
            PlatformProvisioning.external_id == provider_user_id,
        )
    )
    return result.scalar_one_or_none()


async def _issue_tokens(db: AsyncSession, user: User) -> tuple[str, str, Organization]:
    if not _is_active_user(user):
        raise HTTPException(status_code=403, detail="帳號已停用")

    org = await db.get(Organization, user.organization_id)
    if not org:
        raise HTTPException(status_code=400, detail="使用者缺少組織")

    claims = _build_claims(user, org)
    access = create_access_token(claims)
    refresh = create_refresh_token({"sub": str(user.id), "token_version": user.token_version})
    db.add(
        UserSession(
            user_id=str(user.id),
            token=refresh,
            expires_at=datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    return access, refresh, org


def _audit(
    event_type: str,
    result: str,
    user: User | None = None,
    action: str | None = None,
    metadata: Dict[str, Any] | None = None,
    entity_type: str = "AUTH",
    entity_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    return AuditLog(
        event_type=event_type,
        event_result=result,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id or (str(user.id) if user else ""),
        user_id=str(user.id) if user else None,
        user_email=user.email if user else None,
        organization_id=str(user.organization_id) if user else None,
        ip_address=ip_address,
        user_agent=user_agent,
        event_metadata=metadata or {},
        created_at=datetime.utcnow(),
    )


async def _issue_registration_ticket(db: AsyncSession, oauth_data: Dict[str, Any]) -> str:
    ticket = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=REGISTRATION_TICKET_EXPIRE_MINUTES)
    db.add(
        AuditLog(
            event_type="OAUTH_REGISTRATION_TICKET",
            event_result=AuditEventResult.PENDING.value,
            action="line_registration_ticket_issued",
            entity_type="OAUTH_REGISTRATION",
            entity_id=ticket,
            event_metadata={
                "provider": oauth_data["provider"],
                "provider_user_id": oauth_data["provider_user_id"],
                "email": oauth_data.get("email"),
                "name": oauth_data.get("name"),
                "avatar_url": oauth_data.get("avatar_url"),
                "expires_at": expires_at.isoformat(),
            },
            created_at=datetime.utcnow(),
        )
    )
    await db.commit()
    return ticket


async def _consume_registration_ticket(db: AsyncSession, ticket: str) -> Dict[str, Any]:
    result = await db.execute(
        select(AuditLog)
        .where(
            AuditLog.entity_type == "OAUTH_REGISTRATION",
            AuditLog.entity_id == ticket,
            AuditLog.event_result == AuditEventResult.PENDING.value,
        )
        .with_for_update()
    )
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=400, detail="社群註冊票據無效或已使用")

    metadata = dict(audit.event_metadata or {})
    expires_at_raw = metadata.get("expires_at")
    try:
        expires_at = datetime.fromisoformat(str(expires_at_raw))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="社群註冊票據無效") from None

    if expires_at < datetime.utcnow():
        audit.event_result = AuditEventResult.FAILED.value
        audit.action = "line_registration_ticket_expired"
        audit.event_metadata = {**metadata, "expired_at": datetime.utcnow().isoformat()}
        await db.commit()
        raise HTTPException(status_code=400, detail="社群註冊票據已過期")

    if metadata.get("provider") != "line" or not metadata.get("provider_user_id"):
        raise HTTPException(status_code=400, detail="社群註冊票據無效")

    audit.event_result = AuditEventResult.SUCCESS.value
    audit.action = "line_registration_ticket_consumed"
    audit.event_metadata = {**metadata, "consumed_at": datetime.utcnow().isoformat()}
    return metadata


async def _platform_mfa_or_token_response(
    db: AsyncSession,
    request: Request,
    user: User,
    provider: str,
    provider_user_id: str,
    message: str,
) -> OAuthCallbackResponse:
    client_ip = _extract_client_ip(request)
    user_agent = request.headers.get("user-agent")

    if not _is_active_user(user):
        db.add(
            _audit(
                "OAUTH_LOGIN",
                AuditEventResult.BLOCKED.value,
                user=user,
                action="platform_social_login_inactive_user",
                metadata={"provider": provider},
                ip_address=client_ip,
                user_agent=user_agent,
            )
        )
        await db.commit()
        raise HTTPException(status_code=403, detail="帳號已停用")

    lock_seconds = _platform_lock_seconds(user)
    if lock_seconds > 0:
        db.add(
            _audit(
                "OAUTH_LOGIN",
                AuditEventResult.BLOCKED.value,
                user=user,
                action="platform_social_login_locked",
                metadata={"provider": provider, "locked_seconds": lock_seconds},
                ip_address=client_ip,
                user_agent=user_agent,
            )
        )
        await db.commit()
        raise HTTPException(status_code=423, detail="平台帳號暫時鎖定，請稍後再試")

    provisioning = await _get_platform_provisioning(db, provider, provider_user_id)
    if not provisioning or str(provisioning.user_id) != str(user.id):
        locked = _record_platform_failed_attempt(user)
        db.add(
            _audit(
                "OAUTH_LOGIN",
                AuditEventResult.BLOCKED.value,
                user=user,
                action="platform_social_login_not_allowlisted",
                metadata={
                    "provider": provider,
                    "failed_attempts": user.failed_login_attempts,
                    "locked": locked,
                },
                ip_address=client_ip,
                user_agent=user_agent,
            )
        )
        await db.commit()
        raise HTTPException(status_code=403, detail="平台帳號未在社群登入供裝允許名單")

    if not _client_ip_allowed_for_platform(client_ip):
        locked = _record_platform_failed_attempt(user)
        db.add(
            _audit(
                "OAUTH_LOGIN",
                AuditEventResult.BLOCKED.value,
                user=user,
                action="platform_social_login_ip_not_allowed",
                metadata={
                    "provider": provider,
                    "failed_attempts": user.failed_login_attempts,
                    "locked": locked,
                },
                ip_address=client_ip,
                user_agent=user_agent,
            )
        )
        await db.commit()
        raise HTTPException(status_code=403, detail="平台登入來源 IP 不在允許名單")

    if not provisioning.require_mfa:
        locked = _record_platform_failed_attempt(user)
        db.add(
            _audit(
                "OAUTH_LOGIN",
                AuditEventResult.BLOCKED.value,
                user=user,
                action="platform_social_login_mfa_policy_disabled",
                metadata={
                    "provider": provider,
                    "failed_attempts": user.failed_login_attempts,
                    "locked": locked,
                },
                ip_address=client_ip,
                user_agent=user_agent,
            )
        )
        await db.commit()
        raise HTTPException(status_code=403, detail="平台帳號必須強制 MFA")

    if not user.mfa_enabled:
        locked = _record_platform_failed_attempt(user)
        db.add(
            _audit(
                "OAUTH_LOGIN",
                AuditEventResult.BLOCKED.value,
                user=user,
                action="platform_social_login_mfa_not_configured",
                metadata={
                    "provider": provider,
                    "failed_attempts": user.failed_login_attempts,
                    "locked": locked,
                },
                ip_address=client_ip,
                user_agent=user_agent,
            )
        )
        await db.commit()
        raise HTTPException(status_code=403, detail="平台帳號必須先啟用 MFA")

    active_sessions = await _platform_active_session_count(db, user)
    if active_sessions >= PLATFORM_AUTH_MAX_ACTIVE_SESSIONS:
        db.add(
            _audit(
                "OAUTH_LOGIN",
                AuditEventResult.BLOCKED.value,
                user=user,
                action="platform_social_login_session_limit",
                metadata={"provider": provider, "active_sessions": active_sessions},
                ip_address=client_ip,
                user_agent=user_agent,
            )
        )
        await db.commit()
        raise HTTPException(status_code=429, detail="平台帳號已達同時登入上限")

    user.last_login_at = datetime.utcnow()
    db.add(
        _audit(
            "OAUTH_LOGIN",
            AuditEventResult.PENDING.value,
            user=user,
            action="platform_social_login_requires_mfa",
            metadata={"provider": provider},
            ip_address=client_ip,
            user_agent=user_agent,
        )
    )
    await db.commit()
    return OAuthCallbackResponse(
        success=True,
        message="需要 MFA 驗證",
        requires_mfa=True,
        challenge_token=create_mfa_challenge_token(str(user.id), user.email or ""),
        mfa_method=user.mfa_method or "totp",
    )


@router.get("/providers", response_model=OAuthProvidersResponse)
async def get_providers() -> OAuthProvidersResponse:
    return OAuthProvidersResponse(providers=oauth_service.get_available_providers())


@router.get("/{provider}/initiate", response_model=OAuthInitiateResponse)
async def initiate_oauth(provider: str, redirect_uri: Optional[str] = None) -> OAuthInitiateResponse:
    provider = _normalize_provider(provider)
    try:
        if provider == "line":
            if not oauth_service.is_line_available():
                raise HTTPException(status_code=503, detail="Line OAuth 未配置")
            result = await oauth_service.get_line_authorization_url(redirect_uri)
            return OAuthInitiateResponse(
                success=True,
                authorization_url=result["authorization_url"],
                state=result["state"],
                code_verifier=result["code_verifier"],
            )

        if not oauth_service.is_google_available():
            raise HTTPException(status_code=503, detail="Google OAuth 未配置")
        result = await oauth_service.get_google_authorization_url(redirect_uri)
        return OAuthInitiateResponse(
            success=True,
            authorization_url=result["authorization_url"],
            state=result["state"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except HTTPException:
        raise
    except Exception as e:
        logger.error("oauth_initiate_error", provider=provider, error=str(e))
        raise HTTPException(status_code=500, detail="OAuth 初始化失敗") from e


@router.post("/{provider}/callback", response_model=OAuthCallbackResponse)
async def oauth_callback(
    provider: str,
    request: OAuthCallbackRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> OAuthCallbackResponse:
    provider = _normalize_provider(provider)
    try:
        oauth_data = await oauth_service.handle_oauth_callback(
            provider=provider,
            code=request.code,
            state=request.state,
            code_verifier=request.code_verifier,
            redirect_uri=request.redirect_uri,
        )
        provider_user_id = oauth_data["provider_user_id"]

        link = await _get_oauth_link(db, provider, provider_user_id)
        if link:
            user = await db.get(User, link.user_id)
            if not user or not _is_active_user(user):
                raise HTTPException(status_code=403, detail="帳號已停用")

            link.last_used_at = datetime.utcnow()
            if _is_platform_user(user):
                return await _platform_mfa_or_token_response(
                    db, http_request, user, provider, provider_user_id, "登入成功"
                )

            access, refresh, org = await _issue_tokens(db, user)
            user.last_login_at = datetime.utcnow()
            db.add(
                _audit(
                    "OAUTH_LOGIN",
                    AuditEventResult.SUCCESS.value,
                    user=user,
                    action="social_login_success",
                    metadata={"provider": provider},
                )
            )
            await db.commit()
            return OAuthCallbackResponse(
                success=True,
                message="登入成功",
                user=_user_payload(user, org),
                token=access,
                refresh_token=refresh,
            )

        provisioning = await _get_platform_provisioning(db, provider, provider_user_id)
        if provisioning:
            user = await db.get(User, provisioning.user_id)
            if not user or not _is_platform_user(user) or not _is_active_user(user):
                raise HTTPException(status_code=403, detail="平台供裝目標無效")
            link = OAuthLink(
                user_id=str(user.id),
                provider=provider,
                provider_user_id=provider_user_id,
                provider_email=oauth_data.get("email"),
                provider_data=oauth_data,
                linked_at=datetime.utcnow(),
                last_used_at=datetime.utcnow(),
            )
            db.add(link)
            await db.flush()
            return await _platform_mfa_or_token_response(
                db, http_request, user, provider, provider_user_id, "平台帳號已供裝，請完成 MFA"
            )

        if provider == "google":
            db.add(
                _audit(
                    "OAUTH_LOGIN",
                    AuditEventResult.BLOCKED.value,
                    action="google_login_without_binding",
                    metadata={"provider_user_id": provider_user_id[:8]},
                )
            )
            await db.commit()
            raise HTTPException(status_code=403, detail="Google 登入需先以 Line 登入後綁定")

        registration_ticket = await _issue_registration_ticket(db, oauth_data)
        return OAuthCallbackResponse(
            success=True,
            message="請完成註冊",
            is_new_user=True,
            requires_registration=True,
            oauth_data={
                "provider": provider,
                "registration_ticket": registration_ticket,
                "email": oauth_data.get("email"),
                "name": oauth_data.get("name"),
                "avatar_url": oauth_data.get("avatar_url"),
            },
        )
    except ValueError as e:
        logger.error("oauth_callback_error", provider=provider, error=str(e))
        raise HTTPException(status_code=400, detail=str(e)) from e
    except IntegrityError as e:
        await db.rollback()
        logger.warning("oauth_callback_integrity_conflict", provider=provider, error=str(e))
        raise HTTPException(status_code=409, detail="社群帳號已被綁定") from e
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("oauth_callback_error", provider=provider, error=str(e))
        raise HTTPException(status_code=500, detail="OAuth 回調處理失敗") from e


@router.post("/complete-registration", response_model=OAuthCompleteRegistrationResponse)
async def complete_oauth_registration(
    request: OAuthCompleteRegistrationRequest,
    db: AsyncSession = Depends(get_async_session),
) -> OAuthCompleteRegistrationResponse:
    provider = _normalize_provider(request.provider)
    if provider != "line":
        raise HTTPException(status_code=403, detail="首次註冊必須使用 Line")

    organization_type = request.organization_type.lower().strip()
    if organization_type not in {"restaurant", "supplier"}:
        raise HTTPException(status_code=400, detail="組織類型必須是 restaurant 或 supplier")

    try:
        ticket_data = await _consume_registration_ticket(db, request.registration_ticket)
        provider_user_id = str(ticket_data["provider_user_id"])
        existing_link = await _get_oauth_link(db, provider, provider_user_id)
        if existing_link:
            raise HTTPException(status_code=409, detail="此 Line 帳號已完成註冊")

        organization = Organization(
            name=request.organization_name,
            type=organization_type,
            contact_email=str(request.email) if request.email else None,
            contact_phone=request.phone,
        )
        db.add(organization)
        await db.flush()

        user = User(
            email=str(request.email) if request.email else None,
            password_hash=None,
            organization_id=str(organization.id),
            tenant_id=str(organization.id),
            tenant_type=organization_type,
            role=f"{organization_type}_admin",
            status="active",
            phone=request.phone,
            email_verified=False,
        )
        db.add(user)
        await db.flush()

        db.add(
            OAuthLink(
                user_id=str(user.id),
                provider=provider,
                provider_user_id=provider_user_id,
                provider_email=str(request.email) if request.email else ticket_data.get("email"),
                provider_data={
                    "name": ticket_data.get("name"),
                    "avatar_url": ticket_data.get("avatar_url"),
                },
                linked_at=datetime.utcnow(),
                last_used_at=datetime.utcnow(),
            )
        )

        access, refresh, org = await _issue_tokens(db, user)
        db.add(
            _audit(
                "REGISTER",
                AuditEventResult.SUCCESS.value,
                user=user,
                action="line_registration_completed",
                metadata={"provider": provider, "registration_ticket": request.registration_ticket},
            )
        )
        await db.commit()

        return OAuthCompleteRegistrationResponse(
            success=True,
            message="註冊成功",
            user=_user_payload(user, org),
            token=access,
            refresh_token=refresh,
        )
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status_code=409, detail="此 Line 帳號已完成註冊") from e
    except Exception as e:
        await db.rollback()
        logger.error("oauth_registration_error", error=str(e))
        raise HTTPException(status_code=500, detail="註冊失敗") from e


@router.post("/link", response_model=OAuthLinkResponse)
async def link_oauth_account(
    request: OAuthLinkRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session),
) -> OAuthLinkResponse:
    provider = _normalize_provider(request.provider)
    try:
        oauth_data = await oauth_service.handle_oauth_callback(
            provider=provider,
            code=request.code,
            state=request.state,
            code_verifier=request.code_verifier,
            redirect_uri=request.redirect_uri,
        )
        provider_user_id = oauth_data["provider_user_id"]

        existing_link = await _get_oauth_link(db, provider, provider_user_id)
        if existing_link:
            if str(existing_link.user_id) == str(current_user.id):
                return OAuthLinkResponse(success=True, message="此帳號已綁定", provider=provider)
            raise HTTPException(status_code=400, detail="此 OAuth 帳號已被其他用戶綁定")

        db.add(
            OAuthLink(
                user_id=str(current_user.id),
                provider=provider,
                provider_user_id=provider_user_id,
                provider_email=oauth_data.get("email"),
                provider_data=oauth_data,
                linked_at=datetime.utcnow(),
            )
        )
        db.add(
            _audit(
                "OAUTH_LINK",
                AuditEventResult.SUCCESS.value,
                user=current_user,
                action="social_account_linked",
                metadata={"provider": provider},
            )
        )
        await db.commit()

        return OAuthLinkResponse(success=True, message=f"成功綁定 {provider} 帳號", provider=provider)
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status_code=409, detail="此 OAuth 帳號已被其他用戶綁定") from e
    except Exception as e:
        await db.rollback()
        logger.error("oauth_link_error", error=str(e))
        raise HTTPException(status_code=500, detail="綁定失敗") from e


@router.delete("/{provider}/unlink", response_model=OAuthLinkResponse)
async def unlink_oauth_account(
    provider: str,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session),
) -> OAuthLinkResponse:
    provider = _normalize_provider(provider)
    try:
        result = await db.execute(select(OAuthLink).where(OAuthLink.user_id == str(current_user.id)))
        links = result.scalars().all()
        if len(links) <= 1:
            raise HTTPException(status_code=400, detail="至少必須保留一個社群登入綁定")

        target = next((link for link in links if link.provider == provider), None)
        if not target:
            raise HTTPException(status_code=404, detail="未找到此 OAuth 綁定")

        await db.delete(target)
        db.add(
            _audit(
                "OAUTH_UNLINK",
                AuditEventResult.SUCCESS.value,
                user=current_user,
                action="social_account_unlinked",
                metadata={"provider": provider},
            )
        )
        await db.commit()

        return OAuthLinkResponse(success=True, message=f"已解除 {provider} 綁定", provider=provider)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("oauth_unlink_error", error=str(e))
        raise HTTPException(status_code=500, detail="解除綁定失敗") from e


@router.get("/linked-accounts")
async def get_linked_accounts(
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session),
) -> Dict[str, Any]:
    result = await db.execute(
        select(OAuthLink).where(OAuthLink.user_id == str(current_user.id)).order_by(OAuthLink.linked_at)
    )
    links = result.scalars().all()
    return {
        "success": True,
        "linked_accounts": [
            {
                "provider": link.provider,
                "provider_user_id": _mask_provider_user_id(link.provider_user_id),
                "linked_at": link.linked_at.isoformat() if link.linked_at else None,
            }
            for link in links
        ],
    }
