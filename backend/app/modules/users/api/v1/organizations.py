"""
Organizations API - List all organizations for platform admin view switching
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel

from app.modules.users.core.database import get_async_session
from app.modules.users.models.user import User
from app.modules.users.models.organization import Organization
from app.modules.users.api.v1.auth import get_current_user_from_token

router = APIRouter()


class OrganizationResponse(BaseModel):
    """Response schema for organization data"""
    id: str
    name: str
    type: str  # 'restaurant' | 'supplier'
    isActive: bool
    contactPerson: Optional[str] = None
    contactPhone: Optional[str] = None
    contactEmail: Optional[str] = None

    class Config:
        from_attributes = True


class OrganizationListResponse(BaseModel):
    """Response schema for organization list"""
    organizations: List[OrganizationResponse]
    total_count: int


@router.get("/organizations", response_model=OrganizationListResponse)
async def list_organizations(
    current_user: User = Depends(get_current_user_from_token),
    org_type: Optional[str] = Query(None, alias="type", description="Filter by type: restaurant, supplier"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    List all organizations for platform admin view switching.

    Returns restaurants and suppliers from the organizations table.
    Used by the ViewSwitcher component in the platform admin dashboard.
    """
    if current_user.role != "platform_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    query = select(Organization)

    if org_type:
        query = query.where(Organization.type == org_type)
    if is_active is not None:
        query = query.where(Organization.is_active == is_active)

    result = await db.execute(query)
    orgs = result.scalars().all()

    return OrganizationListResponse(
        organizations=[
            OrganizationResponse(
                id=org.id,
                name=org.name,
                type=org.type,
                isActive=org.is_active,
                contactPerson=org.contact_person,
                contactPhone=org.contact_phone,
                contactEmail=org.contact_email
            )
            for org in orgs
        ],
        total_count=len(orgs)
    )
