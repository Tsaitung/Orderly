"""
Account recovery endpoints for the social-only auth model.

Recovery is intentionally narrow:
- If one bound social account is still available, the user can prove control of
  that provider and continue with normal OAuth login.
- If both social identities are lost, the public endpoint only records a
  support request with audit evidence; it does not auto-restore access.
"""

from datetime import datetime
from typing import Any, Dict, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.core.database import get_async_session
from app.modules.users.models.audit_log import AuditEventResult, AuditLog
from app.modules.users.models.oauth_link import OAuthLink
from app.modules.users.services.oauth_service import oauth_service

logger = structlog.get_logger()
router = APIRouter()

SOCIAL_PROVIDERS = {"line", "google"}


class OAuthRecoverRequest(BaseModel):
    provider: str = Field(..., description="Available provider controlled by the user")
    code: str
    state: str
    code_verifier: Optional[str] = None
    redirect_uri: Optional[str] = None


class OAuthRecoverResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[str] = None
    available_providers: list[str] = []


class AccountRecoveryRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    organization_name: Optional[str] = None
    evidence: Dict[str, Any] = Field(default_factory=dict)
    note: Optional[str] = None


class AccountRecoveryResponse(BaseModel):
    success: bool
    message: str
    recovery_id: str


def _normalize_provider(provider: str) -> str:
    normalized = provider.lower().strip()
    if normalized not in SOCIAL_PROVIDERS:
        raise HTTPException(status_code=400, detail="不支援的社群登入提供者")
    return normalized


@router.post("/auth/oauth/recover", response_model=OAuthRecoverResponse)
async def recover_with_bound_social(
    payload: OAuthRecoverRequest,
    db: AsyncSession = Depends(get_async_session),
) -> OAuthRecoverResponse:
    """Verify a bound social provider and return the user's linked providers."""
    provider = _normalize_provider(payload.provider)
    try:
        oauth_data = await oauth_service.handle_oauth_callback(
            provider=provider,
            code=payload.code,
            state=payload.state,
            code_verifier=payload.code_verifier,
            redirect_uri=payload.redirect_uri,
        )

        result = await db.execute(
            select(OAuthLink).where(
                OAuthLink.provider == provider,
                OAuthLink.provider_user_id == oauth_data["provider_user_id"],
            )
        )
        link = result.scalar_one_or_none()
        if not link:
            db.add(
                AuditLog(
                    event_type="ACCOUNT_RECOVERY",
                    event_result=AuditEventResult.BLOCKED.value,
                    action="recovery_social_not_bound",
                    entity_type="ACCOUNT_RECOVERY",
                    entity_id="",
                    event_metadata={"provider": provider},
                    created_at=datetime.utcnow(),
                )
            )
            await db.commit()
            raise HTTPException(status_code=404, detail="此社群帳號尚未綁定任何使用者")

        providers_result = await db.execute(
            select(OAuthLink.provider).where(OAuthLink.user_id == link.user_id).order_by(OAuthLink.provider)
        )
        providers = list(providers_result.scalars().all())

        db.add(
            AuditLog(
                event_type="ACCOUNT_RECOVERY",
                event_result=AuditEventResult.SUCCESS.value,
                action="recovery_social_verified",
                entity_type="ACCOUNT_RECOVERY",
                entity_id=str(link.user_id),
                user_id=str(link.user_id),
                event_metadata={"provider": provider, "available_providers": providers},
                created_at=datetime.utcnow(),
            )
        )
        await db.commit()

        return OAuthRecoverResponse(
            success=True,
            message="社群帳號已驗證，請使用仍可用的綁定登入方式完成登入",
            user_id=str(link.user_id),
            available_providers=providers,
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        await db.rollback()
        logger.error("oauth_recovery_error", error=str(e))
        raise HTTPException(status_code=500, detail="帳號恢復驗證失敗") from e


@router.post("/auth/account-recovery", response_model=AccountRecoveryResponse)
async def request_manual_account_recovery(
    payload: AccountRecoveryRequest,
    db: AsyncSession = Depends(get_async_session),
) -> AccountRecoveryResponse:
    """Record a manual support recovery request with audit evidence."""
    evidence_points = [
        bool(payload.email),
        bool(payload.phone),
        bool(payload.organization_name),
        bool(payload.evidence),
    ]
    if sum(1 for item in evidence_points if item) < 2:
        raise HTTPException(status_code=400, detail="請至少提供兩項帳號恢復證據")

    audit = AuditLog(
        event_type="ACCOUNT_RECOVERY",
        event_result=AuditEventResult.PENDING.value,
        action="manual_recovery_requested",
        entity_type="ACCOUNT_RECOVERY",
        entity_id="manual-support",
        target_user_email=str(payload.email) if payload.email else None,
        event_metadata={
            "phone": payload.phone,
            "organization_name": payload.organization_name,
            "evidence": payload.evidence,
            "note": payload.note,
        },
        created_at=datetime.utcnow(),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(audit)

    return AccountRecoveryResponse(
        success=True,
        message="已建立人工帳號恢復請求，平台支援人員會依證據審核",
        recovery_id=str(audit.id),
    )
