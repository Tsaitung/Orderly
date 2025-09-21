"""
Subscription Management API endpoints
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.services.subscription_service import SubscriptionService
from app.schemas.subscription import (
    SubscriptionPlanResponse, SupplierSubscriptionResponse,
    SubscriptionPlanListResponse, SupplierSubscriptionSingleResponse,
    SubscriptionUsageSingleResponse, SubscriptionBillingSingleResponse
)
from app.schemas.base import ErrorResponse

router = APIRouter(prefix="/api/billing/subscriptions", tags=["Subscription Management"])


@router.get("/plans", response_model=SubscriptionPlanListResponse)
async def list_subscription_plans(
    is_active: Optional[bool] = Query(None),
    is_public: Optional[bool] = Query(None),
    tier_level: Optional[int] = Query(None, ge=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_async_session)
):
    """
    List subscription plans
    
    Returns available subscription plans with optional filtering.
    """
    try:
        service = SubscriptionService(db)
        
        plans = await service.get_subscription_plans(
            is_active=is_active,
            is_public=is_public
        )
        
        # Apply tier level filter if specified
        if tier_level is not None:
            plans = [plan for plan in plans if plan.tier_level == tier_level]
        
        # Simple pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_plans = plans[start:end]
        
        return SubscriptionPlanListResponse(
            success=True,
            data=[SubscriptionPlanResponse.from_orm(plan) for plan in paginated_plans],
            total=len(plans),
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve subscription plans: {str(e)}"
        )


@router.post("/plans", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def create_subscription_plan():
    """
    Create subscription plan
    
    Creates a new subscription plan. (Implementation pending)
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Subscription plan creation endpoint not yet implemented"
    )


@router.get("/supplier/{supplier_id}", response_model=SupplierSubscriptionSingleResponse)
async def get_supplier_subscription(
    supplier_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get supplier subscription
    
    Returns the active subscription for the specified supplier.
    """
    try:
        service = SubscriptionService(db)
        
        subscription = await service.get_supplier_subscription(supplier_id)
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Active subscription not found for this supplier"
            )
        
        return SupplierSubscriptionSingleResponse(
            success=True,
            data=SupplierSubscriptionResponse.from_orm(subscription)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve supplier subscription: {str(e)}"
        )


@router.post("/supplier/{supplier_id}/subscribe", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def subscribe_supplier_to_plan():
    """
    Subscribe supplier to plan
    
    Creates a new subscription for the supplier. (Implementation pending)
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Supplier subscription endpoint not yet implemented"
    )


@router.put("/supplier/{supplier_id}/upgrade", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def upgrade_supplier_subscription():
    """
    Upgrade supplier subscription
    
    Upgrades the supplier's subscription to a higher tier. (Implementation pending)
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Subscription upgrade endpoint not yet implemented"
    )


@router.post("/supplier/{supplier_id}/cancel", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def cancel_supplier_subscription():
    """
    Cancel supplier subscription
    
    Cancels the supplier's active subscription. (Implementation pending)
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Subscription cancellation endpoint not yet implemented"
    )


@router.get("/supplier/{supplier_id}/usage", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def get_supplier_subscription_usage():
    """
    Get supplier subscription usage
    
    Returns current usage statistics for the supplier's subscription. (Implementation pending)
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Subscription usage endpoint not yet implemented"
    )


@router.get("/supplier/{supplier_id}/billing", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def get_supplier_subscription_billing():
    """
    Get supplier subscription billing
    
    Returns billing information for the supplier's subscription. (Implementation pending)
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Subscription billing endpoint not yet implemented"
    )