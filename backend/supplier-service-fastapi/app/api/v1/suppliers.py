"""
Supplier Management API Endpoints
Essential supplier features without inventory, ERP, or automation
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.models.supplier_profile import (
    SupplierProfile, 
    SupplierCustomer, 
    SupplierOnboardingProgress,
    SupplierStatus,
    DeliveryCapacity
)
from app.schemas.supplier import (
    SupplierProfileCreateRequest,
    SupplierProfileUpdateRequest,
    SupplierProfileResponse,
    SupplierCustomerCreateRequest,
    SupplierCustomerResponse,
    SupplierCustomerListResponse,
    SupplierListResponse,
    OnboardingStepUpdateRequest,
    OnboardingProgressResponse,
    SupplierStatusUpdateRequest,
    SupplierDashboardResponse,
    SupplierDashboardMetrics,
    StandardResponse,
    PaginationParams,
    SupplierFilterParams
)

router = APIRouter()


# ============================================================================
# Supplier Profile Management
# ============================================================================

@router.post("/suppliers", response_model=SupplierProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier_profile(
    request: SupplierProfileCreateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Create a new supplier profile.
    Organization must already exist in organizations table.
    """
    # Check if supplier profile already exists
    result = await db.execute(
        select(SupplierProfile).where(SupplierProfile.organization_id == request.organization_id)
    )
    existing_profile = result.scalar_one_or_none()
    
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Supplier profile already exists for this organization"
        )
    
    # Create new supplier profile
    supplier_profile = SupplierProfile(
        organization_id=request.organization_id,
        delivery_capacity=request.delivery_capacity,
        delivery_capacity_kg_per_day=request.delivery_capacity_kg_per_day,
        operating_hours=request.operating_hours,
        delivery_zones=request.delivery_zones,
        minimum_order_amount=request.minimum_order_amount,
        payment_terms_days=request.payment_terms_days,
        quality_certifications=request.quality_certifications,
        contact_preferences=request.contact_preferences,
        public_description=request.public_description
    )
    
    db.add(supplier_profile)
    
    # Also create onboarding progress tracker
    onboarding_progress = SupplierOnboardingProgress(
        supplier_id=request.organization_id
    )
    db.add(onboarding_progress)
    
    await db.commit()
    await db.refresh(supplier_profile)
    
    return supplier_profile


@router.get("/suppliers/{supplier_id}", response_model=SupplierProfileResponse)
async def get_supplier_profile(
    supplier_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """Get supplier profile by organization ID"""
    result = await db.execute(
        select(SupplierProfile).where(SupplierProfile.organization_id == supplier_id)
    )
    supplier_profile = result.scalar_one_or_none()
    
    if not supplier_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier profile not found"
        )
    
    return supplier_profile


@router.put("/suppliers/{supplier_id}", response_model=SupplierProfileResponse)
async def update_supplier_profile(
    supplier_id: str,
    request: SupplierProfileUpdateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """Update supplier profile"""
    result = await db.execute(
        select(SupplierProfile).where(SupplierProfile.organization_id == supplier_id)
    )
    supplier_profile = result.scalar_one_or_none()
    
    if not supplier_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier profile not found"
        )
    
    # Update fields that were provided
    update_data = request.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier_profile, field, value)
    
    await db.commit()
    await db.refresh(supplier_profile)
    
    return supplier_profile


@router.delete("/suppliers/{supplier_id}", response_model=StandardResponse)
async def deactivate_supplier_profile(
    supplier_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """Deactivate supplier profile (soft delete)"""
    result = await db.execute(
        select(SupplierProfile).where(SupplierProfile.organization_id == supplier_id)
    )
    supplier_profile = result.scalar_one_or_none()
    
    if not supplier_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier profile not found"
        )
    
    supplier_profile.status = SupplierStatus.DEACTIVATED
    await db.commit()
    
    return StandardResponse(
        success=True,
        message="Supplier profile deactivated successfully"
    )


@router.get("/suppliers", response_model=SupplierListResponse)
async def list_suppliers(
    pagination: PaginationParams = Depends(),
    filters: SupplierFilterParams = Depends(),
    db: AsyncSession = Depends(get_async_session)
):
    """List suppliers with pagination and filtering"""
    # Build query with filters
    query = select(SupplierProfile)
    
    if filters.status:
        query = query.where(SupplierProfile.status == filters.status)
    
    if filters.delivery_capacity:
        query = query.where(SupplierProfile.delivery_capacity == filters.delivery_capacity)
    
    if filters.verified_only:
        query = query.where(SupplierProfile.status == SupplierStatus.VERIFIED)
    
    if filters.min_capacity_kg:
        query = query.where(SupplierProfile.delivery_capacity_kg_per_day >= filters.min_capacity_kg)
    
    if filters.max_capacity_kg:
        query = query.where(SupplierProfile.delivery_capacity_kg_per_day <= filters.max_capacity_kg)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_count_result = await db.execute(count_query)
    total_count = total_count_result.scalar()
    
    # Add pagination
    offset = (pagination.page - 1) * pagination.page_size
    query = query.offset(offset).limit(pagination.page_size)
    
    # Add sorting
    if pagination.sort_by == "created_at":
        if pagination.sort_order == "desc":
            query = query.order_by(SupplierProfile.created_at.desc())
        else:
            query = query.order_by(SupplierProfile.created_at.asc())
    
    # Execute query
    result = await db.execute(query)
    suppliers = result.scalars().all()
    
    # Calculate pagination info
    total_pages = (total_count + pagination.page_size - 1) // pagination.page_size
    has_next = pagination.page < total_pages
    has_previous = pagination.page > 1
    
    return SupplierListResponse(
        suppliers=suppliers,
        total_count=total_count,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=total_pages,
        has_next=has_next,
        has_previous=has_previous
    )


# ============================================================================
# Supplier-Customer Relationship Management
# ============================================================================

@router.post("/suppliers/{supplier_id}/customers", response_model=SupplierCustomerResponse, status_code=status.HTTP_201_CREATED)
async def add_supplier_customer(
    supplier_id: str,
    request: SupplierCustomerCreateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """Add a customer relationship for a supplier"""
    # Validate supplier_id matches request
    if request.supplier_id != supplier_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supplier ID in URL must match request body"
        )
    
    # Check if relationship already exists
    result = await db.execute(
        select(SupplierCustomer).where(
            SupplierCustomer.supplier_id == supplier_id,
            SupplierCustomer.customer_id == request.customer_id
        )
    )
    existing_relationship = result.scalar_one_or_none()
    
    if existing_relationship:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer relationship already exists"
        )
    
    # Create new relationship
    supplier_customer = SupplierCustomer(
        supplier_id=request.supplier_id,
        customer_id=request.customer_id,
        relationship_type=request.relationship_type,
        credit_limit_ntd=request.credit_limit_ntd,
        payment_terms_days=request.payment_terms_days,
        custom_pricing_rules=request.custom_pricing_rules,
        special_delivery_instructions=request.special_delivery_instructions,
        notes=request.notes
    )
    
    db.add(supplier_customer)
    await db.commit()
    await db.refresh(supplier_customer)
    
    return supplier_customer


@router.get("/suppliers/{supplier_id}/customers", response_model=SupplierCustomerListResponse)
async def list_supplier_customers(
    supplier_id: str,
    pagination: PaginationParams = Depends(),
    relationship_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_session)
):
    """List customers for a supplier"""
    query = select(SupplierCustomer).where(SupplierCustomer.supplier_id == supplier_id)
    
    if relationship_type:
        query = query.where(SupplierCustomer.relationship_type == relationship_type)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_count_result = await db.execute(count_query)
    total_count = total_count_result.scalar()
    
    # Add pagination
    offset = (pagination.page - 1) * pagination.page_size
    query = query.offset(offset).limit(pagination.page_size)
    query = query.order_by(SupplierCustomer.created_at.desc())
    
    # Execute query
    result = await db.execute(query)
    customers = result.scalars().all()
    
    # Calculate pagination info
    total_pages = (total_count + pagination.page_size - 1) // pagination.page_size
    has_next = pagination.page < total_pages
    has_previous = pagination.page > 1
    
    return SupplierCustomerListResponse(
        customers=customers,
        total_count=total_count,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=total_pages,
        has_next=has_next,
        has_previous=has_previous
    )


@router.delete("/suppliers/{supplier_id}/customers/{customer_id}", response_model=StandardResponse)
async def remove_supplier_customer(
    supplier_id: str,
    customer_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """Remove customer relationship (sets to inactive)"""
    result = await db.execute(
        select(SupplierCustomer).where(
            SupplierCustomer.supplier_id == supplier_id,
            SupplierCustomer.customer_id == customer_id
        )
    )
    relationship = result.scalar_one_or_none()
    
    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer relationship not found"
        )
    
    relationship.relationship_type = "inactive"
    await db.commit()
    
    return StandardResponse(
        success=True,
        message="Customer relationship deactivated successfully"
    )


# ============================================================================
# Onboarding Management
# ============================================================================

@router.get("/suppliers/{supplier_id}/onboarding", response_model=OnboardingProgressResponse)
async def get_onboarding_progress(
    supplier_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """Get supplier onboarding progress"""
    result = await db.execute(
        select(SupplierOnboardingProgress).where(SupplierOnboardingProgress.supplier_id == supplier_id)
    )
    progress = result.scalar_one_or_none()
    
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Onboarding progress not found"
        )
    
    # Add calculated completion percentage
    response_data = OnboardingProgressResponse.from_orm(progress)
    response_data.completion_percentage = progress.get_completion_percentage()
    
    return response_data


@router.put("/suppliers/{supplier_id}/onboarding", response_model=OnboardingProgressResponse)
async def update_onboarding_step(
    supplier_id: str,
    request: OnboardingStepUpdateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """Update a specific onboarding step"""
    result = await db.execute(
        select(SupplierOnboardingProgress).where(SupplierOnboardingProgress.supplier_id == supplier_id)
    )
    progress = result.scalar_one_or_none()
    
    if not progress:
        # Create if doesn't exist
        progress = SupplierOnboardingProgress(supplier_id=supplier_id)
        db.add(progress)
    
    # Update the specific step
    progress.mark_step_completed(request.step_name)
    
    await db.commit()
    await db.refresh(progress)
    
    # Return with calculated completion percentage
    response_data = OnboardingProgressResponse.from_orm(progress)
    response_data.completion_percentage = progress.get_completion_percentage()
    
    return response_data


# ============================================================================
# Status Management (Admin Functions)
# ============================================================================

@router.put("/suppliers/{supplier_id}/status", response_model=SupplierProfileResponse)
async def update_supplier_status(
    supplier_id: str,
    request: SupplierStatusUpdateRequest,
    db: AsyncSession = Depends(get_async_session)
    # TODO: Add admin authentication dependency
):
    """Update supplier verification status (admin only)"""
    result = await db.execute(
        select(SupplierProfile).where(SupplierProfile.organization_id == supplier_id)
    )
    supplier_profile = result.scalar_one_or_none()
    
    if not supplier_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier profile not found"
        )
    
    # Update status with audit trail
    supplier_profile.update_status(request.status, verified_by="admin")  # TODO: Get actual admin ID
    
    if request.notes:
        supplier_profile.internal_notes = request.notes
    
    await db.commit()
    await db.refresh(supplier_profile)
    
    return supplier_profile


# ============================================================================
# Dashboard and Analytics
# ============================================================================

@router.get("/suppliers/{supplier_id}/dashboard", response_model=SupplierDashboardResponse)
async def get_supplier_dashboard(
    supplier_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """Get complete dashboard data for supplier portal"""
    # Get supplier profile
    result = await db.execute(
        select(SupplierProfile).where(SupplierProfile.organization_id == supplier_id)
    )
    supplier_profile = result.scalar_one_or_none()
    
    if not supplier_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier profile not found"
        )
    
    # Get customer count
    customer_count_result = await db.execute(
        select(func.count()).select_from(
            select(SupplierCustomer).where(
                SupplierCustomer.supplier_id == supplier_id,
                SupplierCustomer.relationship_type == "active"
            ).subquery()
        )
    )
    active_customers = customer_count_result.scalar() or 0
    
    # Create metrics (placeholder data - would be calculated from orders in production)
    metrics = SupplierDashboardMetrics(
        today_orders=0,
        today_completed_orders=0,
        today_revenue=0.00,
        week_orders=0,
        week_revenue=0.00,
        month_orders=0,
        month_revenue=0.00,
        active_customers=active_customers,
        avg_order_value=0.00,
        on_time_delivery_rate=0.0,
        customer_satisfaction_rate=0.0,
        pending_orders=0,
        in_progress_orders=0,
        completed_orders_today=0
    )
    
    return SupplierDashboardResponse(
        supplier_profile=supplier_profile,
        metrics=metrics,
        recent_orders=[],  # TODO: Integrate with order service
        top_customers=[],  # TODO: Calculate from customer relationships
        alerts=[]  # TODO: Generate relevant alerts
    )