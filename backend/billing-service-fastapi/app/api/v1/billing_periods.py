"""
Billing Period API Endpoints
計費週期 API 端點
"""

import structlog
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.schemas.billing_period import (
    BillingPeriodCreate,
    BillingPeriodUpdate,
    BillingPeriodResponse,
    BillingPeriodCloseRequest,
)
from app.services.billing_period_service import BillingPeriodService

logger = structlog.get_logger()

router = APIRouter(prefix="/billing-periods", tags=["Billing Periods"])


def get_tenant_id(x_tenant_id: str = Header(None, alias="X-Tenant-Id")) -> str:
    """從 Header 取得 tenant_id"""
    if not x_tenant_id:
        raise HTTPException(status_code=400, detail="X-Tenant-Id header is required")
    return x_tenant_id


def get_user_id(x_user_id: str = Header(None, alias="X-User-Id")) -> Optional[str]:
    """從 Header 取得 user_id"""
    return x_user_id


@router.post("", response_model=BillingPeriodResponse, status_code=201)
async def create_billing_period(
    data: BillingPeriodCreate,
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """創建計費週期"""
    service = BillingPeriodService(session)
    period = await service.create_billing_period(tenant_id, data)
    return BillingPeriodResponse.model_validate(period)


@router.get("")
async def list_billing_periods(
    restaurant_id: Optional[str] = Query(None, alias="restaurantId"),
    supplier_id: Optional[str] = Query(None, alias="supplierId"),
    is_closed: Optional[bool] = Query(None, alias="isClosed"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """列出計費週期"""
    service = BillingPeriodService(session)
    items, total = await service.list_billing_periods(
        tenant_id=tenant_id,
        restaurant_id=restaurant_id,
        supplier_id=supplier_id,
        is_closed=is_closed,
        page=page,
        page_size=page_size,
    )

    total_pages = (total + page_size - 1) // page_size

    return {
        "items": [BillingPeriodResponse.model_validate(item) for item in items],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
    }


@router.get("/current", response_model=BillingPeriodResponse)
async def get_current_billing_period(
    restaurant_id: str = Query(..., alias="restaurantId"),
    supplier_id: str = Query(..., alias="supplierId"),
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """取得或創建當前計費週期"""
    service = BillingPeriodService(session)
    period = await service.get_or_create_current_period(
        tenant_id, restaurant_id, supplier_id
    )
    return BillingPeriodResponse.model_validate(period)


@router.get("/{period_id}", response_model=BillingPeriodResponse)
async def get_billing_period(
    period_id: str,
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """取得計費週期詳情"""
    service = BillingPeriodService(session)
    period = await service.get_billing_period_by_id(period_id, tenant_id)
    if not period:
        raise HTTPException(status_code=404, detail="Billing period not found")
    return BillingPeriodResponse.model_validate(period)


@router.put("/{period_id}", response_model=BillingPeriodResponse)
async def update_billing_period(
    period_id: str,
    data: BillingPeriodUpdate,
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """更新計費週期"""
    service = BillingPeriodService(session)
    period = await service.update_billing_period(period_id, tenant_id, data)
    if not period:
        raise HTTPException(status_code=404, detail="Billing period not found or already closed")
    return BillingPeriodResponse.model_validate(period)


@router.post("/{period_id}/close", response_model=BillingPeriodResponse)
async def close_billing_period(
    period_id: str,
    data: BillingPeriodCloseRequest,
    tenant_id: str = Depends(get_tenant_id),
    user_id: Optional[str] = Depends(get_user_id),
    session: AsyncSession = Depends(get_async_session),
):
    """結案計費週期"""
    if not user_id:
        raise HTTPException(status_code=400, detail="X-User-Id header is required")

    service = BillingPeriodService(session)
    period = await service.close_billing_period(
        period_id, tenant_id, user_id, data.create_reconciliation
    )
    if not period:
        raise HTTPException(status_code=404, detail="Billing period not found")
    return BillingPeriodResponse.model_validate(period)
