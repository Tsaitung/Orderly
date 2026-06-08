"""
Platform social-login provisioning allowlist endpoints.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.core.database import get_async_session
from app.modules.users.models.platform_provisioning import PlatformProvisioning
from app.modules.users.models.user import User

from .core import get_current_user_from_token

router = APIRouter()

ADMIN_ROLES = {"platform_admin", "super_admin"}
SOCIAL_PROVIDERS = {"line", "google"}


class PlatformProvisioningCreateRequest(BaseModel):
    provider: str = Field(..., description="line 或 google")
    external_id: str = Field(..., min_length=1, description="社群 provider user id")
    user_id: str = Field(..., description="預建平台使用者 ID")
    require_mfa: bool = True


class PlatformProvisioningResponse(BaseModel):
    success: bool
    id: str
    provider: str
    external_id: str
    user_id: str
    require_mfa: bool
    created_at: datetime


async def _require_platform_admin(current_user: User) -> None:
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要平台管理員權限",
        )


@router.post("/auth/admin/platform-provisioning", response_model=PlatformProvisioningResponse)
async def create_platform_provisioning(
    payload: PlatformProvisioningCreateRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_session),
) -> PlatformProvisioningResponse:
    """Create or update an allowlisted platform social identity."""
    await _require_platform_admin(current_user)

    provider = payload.provider.lower().strip()
    if provider not in SOCIAL_PROVIDERS:
        raise HTTPException(status_code=400, detail="不支援的社群登入提供者")

    target_user = await db.get(User, payload.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="找不到預建平台使用者")
    if target_user.role not in {"platform_admin", "platform_support", "super_admin"}:
        raise HTTPException(status_code=400, detail="供裝目標必須是平台角色")
    if target_user.status != "active" or not target_user.is_active:
        raise HTTPException(status_code=400, detail="供裝目標必須是啟用中的平台帳號")
    if not payload.require_mfa:
        raise HTTPException(status_code=400, detail="平台社群登入必須強制 MFA")

    result = await db.execute(
        select(PlatformProvisioning).where(
            PlatformProvisioning.provider == provider,
            PlatformProvisioning.external_id == payload.external_id,
        )
    )
    provisioning = result.scalar_one_or_none()

    if provisioning:
        provisioning.user_id = payload.user_id
        provisioning.require_mfa = payload.require_mfa
    else:
        provisioning = PlatformProvisioning(
            provider=provider,
            external_id=payload.external_id,
            user_id=payload.user_id,
            require_mfa=payload.require_mfa,
        )
        db.add(provisioning)

    await db.commit()
    await db.refresh(provisioning)

    return PlatformProvisioningResponse(
        success=True,
        id=str(provisioning.id),
        provider=provisioning.provider,
        external_id=provisioning.external_id,
        user_id=str(provisioning.user_id),
        require_mfa=provisioning.require_mfa,
        created_at=provisioning.created_at,
    )
