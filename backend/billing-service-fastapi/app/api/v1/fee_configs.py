"""
Fee Config API Endpoints
費率配置 API 端點
"""

import structlog
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.schemas.fee_config import (
    FeeConfigCreate,
    FeeConfigUpdate,
    FeeConfigResponse,
    FeeCalculationRequest,
    FeeCalculationResponse,
)
from app.services.fee_config_service import FeeConfigService

logger = structlog.get_logger()

router = APIRouter(prefix="/fee-configs", tags=["Fee Configs"])


def get_tenant_id(x_tenant_id: str = Header(None, alias="X-Tenant-Id")) -> str:
    """從 Header 取得 tenant_id"""
    if not x_tenant_id:
        raise HTTPException(status_code=400, detail="X-Tenant-Id header is required")
    return x_tenant_id


def get_user_id(x_user_id: str = Header(None, alias="X-User-Id")) -> Optional[str]:
    """從 Header 取得 user_id"""
    return x_user_id


@router.post("", response_model=FeeConfigResponse, status_code=201)
async def create_fee_config(
    data: FeeConfigCreate,
    tenant_id: str = Depends(get_tenant_id),
    user_id: Optional[str] = Depends(get_user_id),
    session: AsyncSession = Depends(get_async_session),
):
    """創建費率配置"""
    service = FeeConfigService(session)
    config = await service.create_fee_config(tenant_id, data, user_id)
    return FeeConfigResponse.model_validate(config)


@router.get("")
async def list_fee_configs(
    supplier_id: Optional[str] = Query(None, alias="supplierId"),
    restaurant_id: Optional[str] = Query(None, alias="restaurantId"),
    fee_type: Optional[str] = Query(None, alias="feeType"),
    is_active: Optional[bool] = Query(True, alias="isActive"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """列出費率配置"""
    service = FeeConfigService(session)
    items, total = await service.list_fee_configs(
        tenant_id=tenant_id,
        supplier_id=supplier_id,
        restaurant_id=restaurant_id,
        fee_type=fee_type,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )

    total_pages = (total + page_size - 1) // page_size

    return {
        "items": [FeeConfigResponse.model_validate(item) for item in items],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
    }


@router.get("/applicable")
async def get_applicable_fee_configs(
    supplier_id: str = Query(..., alias="supplierId"),
    restaurant_id: str = Query(..., alias="restaurantId"),
    fee_date: Optional[date] = Query(None, alias="feeDate"),
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """取得適用的費率配置"""
    service = FeeConfigService(session)
    configs = await service.get_applicable_fee_configs(
        tenant_id=tenant_id,
        supplier_id=supplier_id,
        restaurant_id=restaurant_id,
        fee_date=fee_date or date.today(),
    )
    return {
        "items": [FeeConfigResponse.model_validate(config) for config in configs],
        "total": len(configs),
    }


@router.get("/{config_id}", response_model=FeeConfigResponse)
async def get_fee_config(
    config_id: str,
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """取得費率配置詳情"""
    service = FeeConfigService(session)
    config = await service.get_fee_config_by_id(config_id, tenant_id)
    if not config:
        raise HTTPException(status_code=404, detail="Fee config not found")
    return FeeConfigResponse.model_validate(config)


@router.put("/{config_id}", response_model=FeeConfigResponse)
async def update_fee_config(
    config_id: str,
    data: FeeConfigUpdate,
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """更新費率配置"""
    service = FeeConfigService(session)
    config = await service.update_fee_config(config_id, tenant_id, data)
    if not config:
        raise HTTPException(status_code=404, detail="Fee config not found")
    return FeeConfigResponse.model_validate(config)


@router.delete("/{config_id}", response_model=FeeConfigResponse)
async def deactivate_fee_config(
    config_id: str,
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """停用費率配置"""
    service = FeeConfigService(session)
    config = await service.deactivate_fee_config(config_id, tenant_id)
    if not config:
        raise HTTPException(status_code=404, detail="Fee config not found")
    return FeeConfigResponse.model_validate(config)


# ============ Fee Calculation ============

@router.post("/calculate", response_model=FeeCalculationResponse)
async def calculate_fee(
    data: FeeCalculationRequest,
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """計算訂單費用"""
    service = FeeConfigService(session)
    result = await service.calculate_fee(
        tenant_id=tenant_id,
        supplier_id=data.supplier_id,
        restaurant_id=data.restaurant_id,
        order_amount=data.order_amount,
        order_date=data.order_date,
    )

    return FeeCalculationResponse(
        order_id=data.order_id,
        order_amount=data.order_amount,
        fee_breakdown=result["fee_breakdown"],
        total_fee=result["total_fee"],
        fee_configs_applied=result["fee_configs_applied"],
    )


@router.get("/default-rate")
async def get_default_transaction_fee_rate(
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """取得預設交易佣金費率"""
    service = FeeConfigService(session)
    rate = await service.get_default_transaction_fee_rate(tenant_id)
    return {
        "defaultRate": float(rate),
        "percentage": f"{float(rate) * 100:.1f}%",
    }
