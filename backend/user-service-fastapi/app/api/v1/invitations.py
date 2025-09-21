"""
Supplier Invitation API endpoints
Handles restaurant-to-supplier invitation workflows
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy import and_, or_

from ...core.database import get_async_session
from ...models.invitation import SupplierInvitation, InvitationStatus
from ...models.organization import Organization, OrganizationType, BusinessType, OnboardingStatus
from ...models.user import User
from ...schemas.invitation import (
    InvitationSendRequest,
    InvitationVerifyRequest,
    SupplierOnboardingRequest,
    SupplierProfileUpdateRequest,
    InvitationResponse,
    InvitationDetailResponse,
    InvitationListResponse,
    InvitationSendResponse,
    SupplierOnboardingResponse,
    OrganizationResponse,
    InvitationErrorResponse
)
from ...schemas.auth import UserCreate, Token
from ..auth import pwd_context, create_access_token


def get_password_hash(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)


def get_current_user():
    """Placeholder for current user - will be implemented with JWT middleware"""
    pass

router = APIRouter()


# Utility functions
async def validate_restaurant_permissions(current_user: User, db: AsyncSession) -> Organization:
    """Validate that current user belongs to a restaurant organization"""
    result = await db.execute(
        select(Organization).where(Organization.id == current_user.organization_id)
    )
    organization = result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="機構不存在"
        )
    
    if not organization.is_restaurant():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有餐廳可以發送供應商邀請"
        )
    
    return organization


@router.post("/send", response_model=InvitationSendResponse)
async def send_supplier_invitation(
    request: InvitationSendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send supplier invitation from restaurant to potential supplier
    """
    # Validate permissions
    restaurant_org = validate_restaurant_permissions(current_user, db)
    
    # Check if invitation already exists for this email
    existing_invitation = db.query(SupplierInvitation).filter(
        and_(
            SupplierInvitation.invitee_email == request.invitee_email,
            SupplierInvitation.status == InvitationStatus.PENDING
        )
    ).first()
    
    if existing_invitation and not existing_invitation.is_expired():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"已存在有效的邀請給 {request.invitee_email}"
        )
    
    # Check if supplier organization already exists with this email
    existing_user = db.query(User).filter(User.email == request.invitee_email).first()
    if existing_user:
        org = db.query(Organization).filter(Organization.id == existing_user.organization_id).first()
        if org and org.is_supplier():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="該電子郵件已經是供應商用戶"
            )
    
    # Create invitation
    invitation = SupplierInvitation.create_invitation(
        inviter_org_id=restaurant_org.id,
        inviter_user_id=current_user.id,
        invitee_email=request.invitee_email,
        invitee_company_name=request.invitee_company_name,
        invitee_contact_person=request.invitee_contact_person,
        invitee_phone=request.invitee_phone,
        invitation_message=request.invitation_message,
        expires_in_days=request.expires_in_days
    )
    
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    
    # TODO: Send email notification to supplier
    # await send_invitation_email(invitation)
    
    return InvitationSendResponse(
        invitation_id=invitation.id,
        invitation_code=invitation.code,
        invitee_email=invitation.invitee_email,
        expires_at=invitation.expires_at
    )


@router.get("/verify/{code}", response_model=InvitationDetailResponse)
async def verify_invitation_code(
    code: str,
    db: Session = Depends(get_db)
):
    """
    Verify invitation code and return invitation details
    """
    invitation = db.query(SupplierInvitation).filter(
        SupplierInvitation.code == code.upper()
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="無效的邀請代碼"
        )
    
    # Get inviter organization info
    inviter_org = db.query(Organization).filter(
        Organization.id == invitation.inviter_organization_id
    ).first()
    
    return InvitationDetailResponse(
        id=invitation.id,
        code=invitation.code,
        inviter_organization_name=inviter_org.name if inviter_org else "Unknown",
        inviter_organization_type=inviter_org.type.value if inviter_org else "unknown",
        invitee_email=invitation.invitee_email,
        invitee_company_name=invitation.invitee_company_name,
        invitee_contact_person=invitation.invitee_contact_person,
        status=invitation.status,
        expires_at=invitation.expires_at,
        invitation_message=invitation.invitation_message,
        is_expired=invitation.is_expired(),
        can_be_accepted=invitation.can_be_accepted()
    )


@router.post("/accept", response_model=SupplierOnboardingResponse)
async def accept_invitation_and_onboard(
    request: SupplierOnboardingRequest,
    db: Session = Depends(get_db)
):
    """
    Accept invitation and complete supplier onboarding
    """
    # Find and validate invitation
    invitation = db.query(SupplierInvitation).filter(
        SupplierInvitation.code == request.invitation_code.upper()
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="無效的邀請代碼"
        )
    
    if not invitation.can_be_accepted():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邀請已過期或無法接受"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="該電子郵件已被使用"
        )
    
    # Check tax ID uniqueness
    if request.tax_id:
        existing_org_with_tax_id = db.query(Organization).filter(
            Organization.tax_id == request.tax_id
        ).first()
        if existing_org_with_tax_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="該統一編號已被使用"
            )
    
    # Check personal ID uniqueness
    if request.personal_id:
        existing_org_with_personal_id = db.query(Organization).filter(
            Organization.personal_id == request.personal_id
        ).first()
        if existing_org_with_personal_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="該身分證字號已被使用"
            )
    
    try:
        # Create supplier organization
        supplier_org = Organization(
            name=request.organization_name,
            type=OrganizationType.SUPPLIER,
            business_type=request.business_type,
            tax_id=request.tax_id,
            personal_id=request.personal_id,
            business_license_number=request.business_license_number,
            contact_person=request.contact_person,
            contact_phone=request.contact_phone,
            contact_email=request.contact_email,
            address=request.address,
            invited_by_organization_id=invitation.inviter_organization_id,
            invitation_accepted_at=datetime.utcnow(),
            onboarding_status=OnboardingStatus.COMPANY_INFO,
            settings={}
        )
        
        db.add(supplier_org)
        db.flush()  # Get organization ID
        
        # Create user account
        user = User(
            email=request.email,
            password_hash=get_password_hash(request.password),
            organization_id=supplier_org.id,
            role="supplier_admin",
            user_metadata={
                "first_name": request.first_name,
                "last_name": request.last_name,
                "phone": request.phone,
                "onboarded_via_invitation": True,
                "invitation_id": invitation.id
            }
        )
        
        db.add(user)
        
        # Accept the invitation
        invitation.accept(supplier_org.id)
        
        # Mark company info step as complete
        supplier_org.update_onboarding_progress("company_info", {
            "business_type": request.business_type.value,
            "tax_id": request.tax_id,
            "personal_id": request.personal_id,
            "contact_info": {
                "person": request.contact_person,
                "phone": request.contact_phone,
                "email": request.contact_email,
                "address": request.address
            }
        })
        
        db.commit()
        db.refresh(supplier_org)
        db.refresh(user)
        
        # Generate access tokens
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id, "org_id": supplier_org.id}
        )
        refresh_token = create_access_token(
            data={"sub": user.email, "type": "refresh"},
            expires_delta=timedelta(days=30)
        )
        
        return SupplierOnboardingResponse(
            user_id=user.id,
            organization_id=supplier_org.id,
            invitation_id=invitation.id,
            access_token=access_token,
            refresh_token=refresh_token,
            organization=OrganizationResponse(
                id=supplier_org.id,
                name=supplier_org.name,
                type=supplier_org.type.value,
                business_type=supplier_org.business_type,
                business_identifier=supplier_org.get_business_identifier(),
                contact_person=supplier_org.contact_person,
                contact_phone=supplier_org.contact_phone,
                contact_email=supplier_org.contact_email,
                address=supplier_org.address,
                onboarding_status=supplier_org.onboarding_status.value,
                is_onboarding_complete=supplier_org.is_onboarding_complete(),
                created_at=supplier_org.created_at
            )
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"註冊過程中發生錯誤: {str(e)}"
        )


@router.get("/sent", response_model=InvitationListResponse)
async def get_sent_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[InvitationStatus] = Query(None)
):
    """
    Get invitations sent by current restaurant
    """
    restaurant_org = validate_restaurant_permissions(current_user, db)
    
    # Build query
    query = db.query(SupplierInvitation).filter(
        SupplierInvitation.inviter_organization_id == restaurant_org.id
    )
    
    if status_filter:
        query = query.filter(SupplierInvitation.status == status_filter)
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    invitations = query.order_by(SupplierInvitation.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()
    
    # Build response
    invitation_responses = []
    for inv in invitations:
        inviter_user = db.query(User).filter(User.id == inv.inviter_user_id).first()
        invitation_responses.append(InvitationResponse(
            id=inv.id,
            code=inv.code,
            inviter_organization_name=restaurant_org.name,
            inviter_user_name=f"{inviter_user.user_metadata.get('first_name', '')} {inviter_user.user_metadata.get('last_name', '')}" if inviter_user else "Unknown",
            invitee_email=inv.invitee_email,
            invitee_company_name=inv.invitee_company_name,
            invitee_contact_person=inv.invitee_contact_person,
            invitee_phone=inv.invitee_phone,
            status=inv.status,
            sent_at=inv.sent_at,
            expires_at=inv.expires_at,
            accepted_at=inv.accepted_at,
            invitation_message=inv.invitation_message
        ))
    
    return InvitationListResponse(
        data=invitation_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.delete("/{invitation_id}")
async def cancel_invitation(
    invitation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel a pending invitation
    """
    restaurant_org = validate_restaurant_permissions(current_user, db)
    
    invitation = db.query(SupplierInvitation).filter(
        and_(
            SupplierInvitation.id == invitation_id,
            SupplierInvitation.inviter_organization_id == restaurant_org.id
        )
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="邀請不存在"
        )
    
    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只能取消待處理的邀請"
        )
    
    invitation.cancel()
    db.commit()
    
    return {"message": "邀請已取消"}


@router.get("/profile", response_model=OrganizationResponse)
async def get_supplier_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current supplier's profile
    """
    result = await db.execute(
        select(Organization).where(Organization.id == current_user.organization_id)
    )
    organization = result.scalar_one_or_none()
    
    if not organization or not organization.is_supplier():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有供應商可以查看供應商資料"
        )
    
    return OrganizationResponse(
        id=organization.id,
        name=organization.name,
        type=organization.type.value,
        business_type=organization.business_type,
        business_identifier=organization.get_business_identifier(),
        contact_person=organization.contact_person,
        contact_phone=organization.contact_phone,
        contact_email=organization.contact_email,
        address=organization.address,
        onboarding_status=organization.onboarding_status.value if organization.onboarding_status else None,
        is_onboarding_complete=organization.is_onboarding_complete(),
        created_at=organization.created_at
    )


@router.put("/profile", response_model=OrganizationResponse)
async def update_supplier_profile(
    request: SupplierProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update supplier profile
    """
    result = await db.execute(
        select(Organization).where(Organization.id == current_user.organization_id)
    )
    organization = result.scalar_one_or_none()
    
    if not organization or not organization.is_supplier():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有供應商可以更新供應商資料"
        )
    
    # Update fields
    update_data = request.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(organization, field):
            setattr(organization, field, value)
    
    db.commit()
    db.refresh(organization)
    
    return OrganizationResponse(
        id=organization.id,
        name=organization.name,
        type=organization.type.value,
        business_type=organization.business_type,
        business_identifier=organization.get_business_identifier(),
        contact_person=organization.contact_person,
        contact_phone=organization.contact_phone,
        contact_email=organization.contact_email,
        address=organization.address,
        onboarding_status=organization.onboarding_status.value if organization.onboarding_status else None,
        is_onboarding_complete=organization.is_onboarding_complete(),
        created_at=organization.created_at
    )