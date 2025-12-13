"""
Price History API endpoints
Provides endpoints for SKU price history tracking and analysis
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.models.price_history import PriceType
from app.services.price_history_service import PriceHistoryService

router = APIRouter(prefix="/price-history", tags=["Price History"])


# ============= Pydantic Schemas =============

class PriceChangeCreate(BaseModel):
    """創建價格變動記錄請求"""
    sku_id: str = Field(..., description="SKU ID")
    old_price: Optional[float] = Field(None, description="舊價格")
    new_price: float = Field(..., description="新價格", gt=0)
    price_type: str = Field("base", description="價格類型: base/selling/cost/promotional")
    supplier_id: Optional[str] = Field(None, description="供應商 ID")
    change_reason: Optional[str] = Field(None, description="變動原因")
    changed_by: Optional[str] = Field(None, description="變動者 ID")
    effective_from: Optional[datetime] = Field(None, description="生效開始時間")
    effective_to: Optional[datetime] = Field(None, description="生效結束時間")
    currency: str = Field("TWD", description="貨幣代碼")


class PriceHistoryResponse(BaseModel):
    """價格歷史記錄響應"""
    id: str
    sku_id: str
    supplier_id: Optional[str]
    old_price: Optional[float]
    new_price: float
    price_type: str
    currency: str
    change_reason: Optional[str]
    changed_by: Optional[str]
    changed_at: datetime
    effective_from: Optional[datetime]
    effective_to: Optional[datetime]
    change_percent: Optional[float]

    class Config:
        from_attributes = True


class PriceHistoryListResponse(BaseModel):
    """價格歷史列表響應"""
    items: List[PriceHistoryResponse]
    total: int
    page: int
    limit: int


class PriceTrendResponse(BaseModel):
    """價格趨勢分析響應"""
    period: str
    total_changes: int
    avg_price: Optional[float]
    min_price: Optional[float]
    max_price: Optional[float]
    price_volatility: Optional[float]
    trend_direction: str
    total_change_percent: Optional[float]


class RecentPriceChangeResponse(BaseModel):
    """近期價格變動響應"""
    sku_id: str
    sku_code: str
    sku_name: str
    old_price: Optional[float]
    new_price: float
    change_percent: Optional[float]
    change_reason: Optional[str]
    changed_at: Optional[str]
    price_type: Optional[str]


# ============= API Endpoints =============

@router.post("", response_model=PriceHistoryResponse, status_code=201)
async def create_price_change(
    payload: PriceChangeCreate,
    db: AsyncSession = Depends(get_async_session)
):
    """
    記錄價格變動

    - **sku_id**: SKU ID (必填)
    - **new_price**: 新價格 (必填，必須大於0)
    - **old_price**: 舊價格 (選填)
    - **price_type**: 價格類型 (base/selling/cost/promotional)
    - **change_reason**: 變動原因
    """
    try:
        price_type = PriceType(payload.price_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid price_type: {payload.price_type}")

    record = await PriceHistoryService.record_price_change(
        db=db,
        sku_id=payload.sku_id,
        old_price=Decimal(str(payload.old_price)) if payload.old_price else None,
        new_price=Decimal(str(payload.new_price)),
        price_type=price_type,
        supplier_id=payload.supplier_id,
        change_reason=payload.change_reason,
        changed_by=payload.changed_by,
        effective_from=payload.effective_from,
        effective_to=payload.effective_to,
        currency=payload.currency
    )

    return PriceHistoryResponse(
        id=record.id,
        sku_id=record.sku_id,
        supplier_id=record.supplier_id,
        old_price=float(record.old_price) if record.old_price else None,
        new_price=float(record.new_price),
        price_type=record.price_type.value if record.price_type else "base",
        currency=record.currency,
        change_reason=record.change_reason,
        changed_by=record.changed_by,
        changed_at=record.changed_at,
        effective_from=record.effective_from,
        effective_to=record.effective_to,
        change_percent=record.change_percent
    )


@router.get("/sku/{sku_id}", response_model=PriceHistoryListResponse)
async def get_sku_price_history(
    sku_id: str,
    start_date: Optional[datetime] = Query(None, description="開始日期"),
    end_date: Optional[datetime] = Query(None, description="結束日期"),
    price_type: Optional[str] = Query(None, description="價格類型"),
    page: int = Query(1, ge=1, description="頁碼"),
    limit: int = Query(50, ge=1, le=100, description="每頁數量"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取 SKU 價格歷史

    - **sku_id**: SKU ID (必填)
    - **start_date**: 開始日期 (選填)
    - **end_date**: 結束日期 (選填)
    - **price_type**: 價格類型篩選 (選填)
    """
    pt = None
    if price_type:
        try:
            pt = PriceType(price_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid price_type: {price_type}")

    offset = (page - 1) * limit
    records, total = await PriceHistoryService.get_price_history(
        db=db,
        sku_id=sku_id,
        start_date=start_date,
        end_date=end_date,
        price_type=pt,
        limit=limit,
        offset=offset
    )

    items = [
        PriceHistoryResponse(
            id=r.id,
            sku_id=r.sku_id,
            supplier_id=r.supplier_id,
            old_price=float(r.old_price) if r.old_price else None,
            new_price=float(r.new_price),
            price_type=r.price_type.value if r.price_type else "base",
            currency=r.currency,
            change_reason=r.change_reason,
            changed_by=r.changed_by,
            changed_at=r.changed_at,
            effective_from=r.effective_from,
            effective_to=r.effective_to,
            change_percent=r.change_percent
        )
        for r in records
    ]

    return PriceHistoryListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit
    )


@router.get("/sku/{sku_id}/trend", response_model=PriceTrendResponse)
async def get_sku_price_trend(
    sku_id: str,
    period: str = Query("30d", description="時間段: 7d/30d/90d/365d"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取 SKU 價格趨勢分析

    - **sku_id**: SKU ID (必填)
    - **period**: 分析時間段 (7d/30d/90d/365d)

    返回:
    - 平均價格、最高價、最低價
    - 價格波動率
    - 趨勢方向 (increasing/decreasing/stable)
    - 總變動百分比
    """
    if period not in ['7d', '30d', '90d', '365d']:
        raise HTTPException(status_code=400, detail="Invalid period. Use: 7d, 30d, 90d, or 365d")

    trend = await PriceHistoryService.get_price_trend(
        db=db,
        sku_id=sku_id,
        period=period
    )

    return PriceTrendResponse(**trend)


@router.get("/recent-changes", response_model=List[RecentPriceChangeResponse])
async def get_recent_price_changes(
    supplier_id: Optional[str] = Query(None, description="供應商 ID 篩選"),
    change_threshold: float = Query(10.0, description="變動幅度閾值 (百分比)"),
    days: int = Query(7, ge=1, le=90, description="查詢天數"),
    limit: int = Query(50, ge=1, le=100, description="返回數量限制"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取近期重大價格變動

    用於價格異常監控和預警

    - **supplier_id**: 供應商 ID 篩選 (選填)
    - **change_threshold**: 變動幅度閾值，默認 10%
    - **days**: 查詢最近天數，默認 7 天
    """
    changes = await PriceHistoryService.get_recent_price_changes(
        db=db,
        supplier_id=supplier_id,
        change_threshold=change_threshold,
        days=days,
        limit=limit
    )

    return [RecentPriceChangeResponse(**c) for c in changes]
