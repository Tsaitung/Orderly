"""
Reconciliation API Endpoints
對帳 API 端點
"""

import structlog
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.billing.core.database import get_async_session
from app.modules.billing.models.enums import ReconciliationStatus
from app.modules.billing.schemas.reconciliation import (
    ReconciliationCreate,
    ReconciliationUpdate,
    ReconciliationResponse,
    ReconciliationListResponse,
    ReconciliationItemCreate,
    ReconciliationItemResponse,
    ReconciliationStats,
    ReconciliationApproveRequest,
    ReconciliationDisputeRequest,
    ReconciliationResolveRequest,
)
from app.modules.billing.services.reconciliation_service import ReconciliationService
from app.modules.billing.services.reconciliation_engine import ReconciliationEngine

logger = structlog.get_logger()

router = APIRouter(prefix="/reconciliations", tags=["Reconciliations"])


def get_tenant_id(x_tenant_id: str = Header(None, alias="X-Tenant-Id")) -> str:
    """從 Header 取得 tenant_id"""
    if not x_tenant_id:
        raise HTTPException(status_code=400, detail="X-Tenant-Id header is required")
    return x_tenant_id


def get_user_id(x_user_id: str = Header(None, alias="X-User-Id")) -> Optional[str]:
    """從 Header 取得 user_id"""
    return x_user_id


# ============ CRUD Endpoints ============

@router.post("", response_model=ReconciliationResponse, status_code=201)
async def create_reconciliation(
    data: ReconciliationCreate,
    tenant_id: str = Depends(get_tenant_id),
    user_id: Optional[str] = Depends(get_user_id),
    session: AsyncSession = Depends(get_async_session),
):
    """創建對帳記錄"""
    service = ReconciliationService(session)
    reconciliation = await service.create_reconciliation(tenant_id, data, user_id)
    return ReconciliationResponse.model_validate(reconciliation)


@router.get("", response_model=ReconciliationListResponse)
async def list_reconciliations(
    restaurant_id: Optional[str] = Query(None, alias="restaurantId"),
    supplier_id: Optional[str] = Query(None, alias="supplierId"),
    status: Optional[ReconciliationStatus] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """列出對帳記錄"""
    service = ReconciliationService(session)
    items, total = await service.list_reconciliations(
        tenant_id=tenant_id,
        restaurant_id=restaurant_id,
        supplier_id=supplier_id,
        status=status,
        page=page,
        page_size=page_size,
    )

    total_pages = (total + page_size - 1) // page_size

    return ReconciliationListResponse(
        items=[ReconciliationResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/stats", response_model=ReconciliationStats)
async def get_reconciliation_stats(
    restaurant_id: Optional[str] = Query(None, alias="restaurantId"),
    supplier_id: Optional[str] = Query(None, alias="supplierId"),
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """取得對帳統計"""
    service = ReconciliationService(session)
    stats = await service.get_reconciliation_stats(
        tenant_id=tenant_id,
        restaurant_id=restaurant_id,
        supplier_id=supplier_id,
    )
    return stats


@router.get("/{reconciliation_id}", response_model=ReconciliationResponse)
async def get_reconciliation(
    reconciliation_id: str,
    include_items: bool = Query(False, alias="includeItems"),
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """取得對帳記錄詳情"""
    service = ReconciliationService(session)
    reconciliation = await service.get_reconciliation_by_id(
        reconciliation_id, tenant_id, include_items=include_items
    )
    if not reconciliation:
        raise HTTPException(status_code=404, detail="Reconciliation not found")

    response = ReconciliationResponse.model_validate(reconciliation)
    if include_items and reconciliation.items:
        response.items = [
            ReconciliationItemResponse.model_validate(item)
            for item in reconciliation.items
        ]
    return response


@router.put("/{reconciliation_id}", response_model=ReconciliationResponse)
async def update_reconciliation(
    reconciliation_id: str,
    data: ReconciliationUpdate,
    tenant_id: str = Depends(get_tenant_id),
    user_id: Optional[str] = Depends(get_user_id),
    session: AsyncSession = Depends(get_async_session),
):
    """更新對帳記錄"""
    service = ReconciliationService(session)
    reconciliation = await service.update_reconciliation(
        reconciliation_id, tenant_id, data, user_id
    )
    if not reconciliation:
        raise HTTPException(status_code=404, detail="Reconciliation not found")
    return ReconciliationResponse.model_validate(reconciliation)


# ============ Status Flow Endpoints ============

@router.post("/{reconciliation_id}/approve", response_model=ReconciliationResponse)
async def approve_reconciliation(
    reconciliation_id: str,
    data: ReconciliationApproveRequest,
    tenant_id: str = Depends(get_tenant_id),
    user_id: Optional[str] = Depends(get_user_id),
    session: AsyncSession = Depends(get_async_session),
):
    """審核通過對帳記錄"""
    if not user_id:
        raise HTTPException(status_code=400, detail="X-User-Id header is required")

    service = ReconciliationService(session)
    reconciliation = await service.approve_reconciliation(
        reconciliation_id, tenant_id, user_id, data.review_notes
    )
    if not reconciliation:
        raise HTTPException(status_code=404, detail="Reconciliation not found or cannot be approved")
    return ReconciliationResponse.model_validate(reconciliation)


@router.post("/{reconciliation_id}/dispute", response_model=ReconciliationResponse)
async def dispute_reconciliation(
    reconciliation_id: str,
    data: ReconciliationDisputeRequest,
    tenant_id: str = Depends(get_tenant_id),
    user_id: Optional[str] = Depends(get_user_id),
    session: AsyncSession = Depends(get_async_session),
):
    """提出對帳爭議"""
    if not user_id:
        raise HTTPException(status_code=400, detail="X-User-Id header is required")

    service = ReconciliationService(session)
    reconciliation = await service.dispute_reconciliation(
        reconciliation_id, tenant_id, user_id, data.dispute_reason
    )
    if not reconciliation:
        raise HTTPException(status_code=404, detail="Reconciliation not found or cannot be disputed")
    return ReconciliationResponse.model_validate(reconciliation)


@router.post("/{reconciliation_id}/resolve", response_model=ReconciliationResponse)
async def resolve_reconciliation(
    reconciliation_id: str,
    data: ReconciliationResolveRequest,
    tenant_id: str = Depends(get_tenant_id),
    user_id: Optional[str] = Depends(get_user_id),
    session: AsyncSession = Depends(get_async_session),
):
    """解決對帳爭議"""
    if not user_id:
        raise HTTPException(status_code=400, detail="X-User-Id header is required")

    service = ReconciliationService(session)
    reconciliation = await service.resolve_reconciliation(
        reconciliation_id, tenant_id, user_id, data.resolution_notes
    )
    if not reconciliation:
        raise HTTPException(status_code=404, detail="Reconciliation not found or is not disputed")
    return ReconciliationResponse.model_validate(reconciliation)


# ============ Items Endpoints ============

@router.get("/{reconciliation_id}/items", response_model=list[ReconciliationItemResponse])
async def get_reconciliation_items(
    reconciliation_id: str,
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """取得對帳明細列表"""
    service = ReconciliationService(session)
    items = await service.get_reconciliation_items(reconciliation_id, tenant_id)
    return [ReconciliationItemResponse.model_validate(item) for item in items]


@router.post("/{reconciliation_id}/items", response_model=ReconciliationItemResponse, status_code=201)
async def add_reconciliation_item(
    reconciliation_id: str,
    data: ReconciliationItemCreate,
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """添加對帳明細"""
    service = ReconciliationService(session)
    item = await service.add_reconciliation_item(reconciliation_id, tenant_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Reconciliation not found or is not pending")
    return ReconciliationItemResponse.model_validate(item)


# ============ Auto Reconciliation Endpoints ============

@router.post("/auto", response_model=ReconciliationResponse, status_code=201)
async def run_auto_reconciliation(
    restaurant_id: str = Query(..., alias="restaurantId"),
    supplier_id: str = Query(..., alias="supplierId"),
    period_start: date = Query(..., alias="periodStart"),
    period_end: date = Query(..., alias="periodEnd"),
    tenant_id: str = Depends(get_tenant_id),
    user_id: Optional[str] = Depends(get_user_id),
    session: AsyncSession = Depends(get_async_session),
):
    """執行自動對帳"""
    engine = ReconciliationEngine(session)
    reconciliation = await engine.run_auto_reconciliation(
        tenant_id=tenant_id,
        restaurant_id=restaurant_id,
        supplier_id=supplier_id,
        period_start=period_start,
        period_end=period_end,
        created_by=user_id,
    )
    return ReconciliationResponse.model_validate(reconciliation)


@router.get("/candidates", response_model=dict)
async def find_reconciliation_candidates(
    restaurant_id: str = Query(..., alias="restaurantId"),
    supplier_id: str = Query(..., alias="supplierId"),
    period_start: date = Query(..., alias="periodStart"),
    period_end: date = Query(..., alias="periodEnd"),
    tenant_id: str = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_async_session),
):
    """查找對帳候選訂單"""
    engine = ReconciliationEngine(session)
    result = await engine.find_candidates(
        tenant_id=tenant_id,
        restaurant_id=restaurant_id,
        supplier_id=supplier_id,
        period_start=period_start,
        period_end=period_end,
    )
    return result
