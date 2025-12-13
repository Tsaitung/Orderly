"""
Promotions API endpoints
促銷價格管理 API
"""
from typing import Optional, List
from datetime import datetime
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
import structlog

from app.core.database import get_async_session
from app.models.promotion import Promotion, DiscountType, PromotionStatus
from app.models.sku_simple import ProductSKU
from app.schemas.promotion import (
    PromotionCreateRequest,
    PromotionUpdateRequest,
    PromotionResponse,
    PromotionListResponse,
    PromotionDetailResponse,
    PromotionCreateResponse,
    PromotionUpdateResponse,
    PromotionDeleteResponse,
)

logger = structlog.get_logger()
router = APIRouter()


def _get_tenant_id_from_request(request: Request) -> Optional[str]:
    """從請求標頭取得租戶 ID"""
    return request.headers.get("X-Tenant-Id") or request.headers.get("X-Org-Id")


def _get_user_id_from_request(request: Request) -> Optional[str]:
    """從請求標頭取得用戶 ID"""
    return request.headers.get("X-User-ID")


def _transform_promotion_to_response(promo: Promotion) -> PromotionResponse:
    """將 Promotion Model 轉換為 Response"""
    return PromotionResponse(
        id=promo.id,
        tenantId=promo.tenant_id,
        name=promo.name,
        description=promo.description,
        code=promo.code,
        skuId=promo.sku_id,
        productId=promo.product_id,
        discountType=promo.discount_type,
        discountValue=promo.discount_value,
        promotionalPrice=promo.promotional_price,
        originalPrice=promo.original_price,
        startDate=promo.start_date,
        endDate=promo.end_date,
        maxQuantity=promo.max_quantity,
        soldQuantity=promo.sold_quantity,
        minPurchaseQuantity=promo.min_purchase_quantity,
        status=promo.status,
        isActive=promo.is_active,
        priority=promo.priority,
        isValid=promo.is_valid,
        remainingQuantity=promo.remaining_quantity,
        createdAt=promo.created_at,
        updatedAt=promo.updated_at
    )


@router.get("", response_model=PromotionListResponse)
async def list_promotions(
    request: Request,
    sku_id: Optional[str] = Query(None, description="篩選特定 SKU 的促銷"),
    status_filter: Optional[PromotionStatus] = Query(None, alias="status", description="篩選狀態"),
    active_only: bool = Query(False, description="僅顯示有效促銷"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取促銷列表

    - **sku_id**: 篩選特定 SKU 的促銷
    - **status**: 篩選狀態 (draft/scheduled/active/paused/ended/cancelled)
    - **active_only**: 僅顯示當前有效的促銷
    """
    tenant_id = _get_tenant_id_from_request(request)

    query = select(Promotion)

    # 建立篩選條件
    conditions = []
    if tenant_id:
        conditions.append(Promotion.tenant_id == tenant_id)
    if sku_id:
        conditions.append(Promotion.sku_id == sku_id)
    if status_filter:
        conditions.append(Promotion.status == status_filter)
    if active_only:
        now = datetime.utcnow()
        conditions.append(Promotion.is_active == True)
        conditions.append(Promotion.status.in_([PromotionStatus.ACTIVE, PromotionStatus.SCHEDULED]))
        conditions.append(Promotion.start_date <= now)
        conditions.append(or_(Promotion.end_date.is_(None), Promotion.end_date >= now))

    if conditions:
        query = query.where(and_(*conditions))

    # 排序：優先級高的在前，然後按開始時間
    query = query.order_by(Promotion.priority.desc(), Promotion.start_date.desc())

    # 分頁
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    promotions = result.scalars().all()

    # 計算總數
    count_query = select(Promotion)
    if conditions:
        count_query = count_query.where(and_(*conditions))
    count_result = await db.execute(count_query)
    total = len(count_result.scalars().all())

    return PromotionListResponse(
        success=True,
        data=[_transform_promotion_to_response(p) for p in promotions],
        pagination={
            "page": page,
            "pageSize": page_size,
            "total": total,
            "totalPages": (total + page_size - 1) // page_size
        }
    )


@router.get("/{promotion_id}", response_model=PromotionDetailResponse)
async def get_promotion(
    promotion_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """獲取單一促銷詳情"""
    result = await db.execute(
        select(Promotion).where(Promotion.id == promotion_id)
    )
    promo = result.scalar_one_or_none()

    if not promo:
        raise HTTPException(status_code=404, detail=f"促銷 ID '{promotion_id}' 不存在")

    return PromotionDetailResponse(
        success=True,
        data=_transform_promotion_to_response(promo)
    )


@router.post("", response_model=PromotionCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    request: Request,
    data: PromotionCreateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    創建促銷

    - **discountType**: percentage (百分比), fixed_amount (固定金額), fixed_price (固定價格)
    - **discountValue**: 折扣值（百分比時 0.2 = 20% off，固定金額/價格時為實際金額）
    """
    tenant_id = _get_tenant_id_from_request(request)
    user_id = _get_user_id_from_request(request)

    # 驗證 SKU 存在
    sku_result = await db.execute(
        select(ProductSKU).where(ProductSKU.id == data.skuId)
    )
    sku = sku_result.scalar_one_or_none()

    if not sku:
        raise HTTPException(status_code=404, detail=f"SKU ID '{data.skuId}' 不存在")

    # 計算促銷價格
    original_price = sku.unit_price or 0
    if data.discountType == DiscountType.PERCENTAGE:
        promotional_price = original_price * (1 - data.discountValue)
    elif data.discountType == DiscountType.FIXED_AMOUNT:
        promotional_price = max(0, original_price - data.discountValue)
    else:  # FIXED_PRICE
        promotional_price = data.discountValue

    # 判斷初始狀態
    now = datetime.utcnow()
    if data.startDate > now:
        initial_status = PromotionStatus.SCHEDULED
    else:
        initial_status = PromotionStatus.ACTIVE

    promo = Promotion(
        id=str(uuid4()),
        tenant_id=tenant_id,
        name=data.name,
        description=data.description,
        code=data.code,
        sku_id=data.skuId,
        product_id=data.productId or sku.product_id,
        discount_type=data.discountType,
        discount_value=data.discountValue,
        promotional_price=promotional_price,
        original_price=original_price,
        start_date=data.startDate,
        end_date=data.endDate,
        max_quantity=data.maxQuantity,
        min_purchase_quantity=data.minPurchaseQuantity,
        priority=data.priority,
        status=initial_status,
        is_active=True,
        created_by=user_id,
    )

    db.add(promo)
    await db.commit()
    await db.refresh(promo)

    logger.info("promotion_created", promotion_id=promo.id, sku_id=data.skuId, tenant_id=tenant_id)

    return PromotionCreateResponse(
        success=True,
        message="促銷創建成功",
        data=_transform_promotion_to_response(promo)
    )


@router.put("/{promotion_id}", response_model=PromotionUpdateResponse)
async def update_promotion(
    request: Request,
    promotion_id: str,
    data: PromotionUpdateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """更新促銷"""
    user_id = _get_user_id_from_request(request)

    result = await db.execute(
        select(Promotion).where(Promotion.id == promotion_id)
    )
    promo = result.scalar_one_or_none()

    if not promo:
        raise HTTPException(status_code=404, detail=f"促銷 ID '{promotion_id}' 不存在")

    # 更新欄位
    update_data = data.model_dump(exclude_unset=True)
    field_mapping = {
        'discountType': 'discount_type',
        'discountValue': 'discount_value',
        'startDate': 'start_date',
        'endDate': 'end_date',
        'maxQuantity': 'max_quantity',
        'minPurchaseQuantity': 'min_purchase_quantity',
        'isActive': 'is_active',
    }

    for key, value in update_data.items():
        db_field = field_mapping.get(key, key)
        if hasattr(promo, db_field):
            setattr(promo, db_field, value)

    # 重新計算促銷價格（如果折扣設定改變）
    if 'discountType' in update_data or 'discountValue' in update_data:
        if promo.original_price:
            if promo.discount_type == DiscountType.PERCENTAGE:
                promo.promotional_price = promo.original_price * (1 - promo.discount_value)
            elif promo.discount_type == DiscountType.FIXED_AMOUNT:
                promo.promotional_price = max(0, promo.original_price - promo.discount_value)
            else:
                promo.promotional_price = promo.discount_value

    promo.updated_by = user_id

    await db.commit()
    await db.refresh(promo)

    logger.info("promotion_updated", promotion_id=promotion_id)

    return PromotionUpdateResponse(
        success=True,
        message="促銷更新成功",
        data=_transform_promotion_to_response(promo)
    )


@router.delete("/{promotion_id}", response_model=PromotionDeleteResponse)
async def delete_promotion(
    promotion_id: str,
    hard_delete: bool = Query(False, description="是否永久刪除"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    刪除促銷

    - **hard_delete=false**: 軟刪除（設為已取消）
    - **hard_delete=true**: 永久刪除
    """
    result = await db.execute(
        select(Promotion).where(Promotion.id == promotion_id)
    )
    promo = result.scalar_one_or_none()

    if not promo:
        raise HTTPException(status_code=404, detail=f"促銷 ID '{promotion_id}' 不存在")

    if hard_delete:
        await db.delete(promo)
        message = "促銷已永久刪除"
    else:
        promo.status = PromotionStatus.CANCELLED
        promo.is_active = False
        message = "促銷已取消"

    await db.commit()

    logger.info("promotion_deleted", promotion_id=promotion_id, hard_delete=hard_delete)

    return PromotionDeleteResponse(
        success=True,
        message=message,
        deletedId=promotion_id
    )


@router.post("/{promotion_id}/activate", response_model=PromotionUpdateResponse)
async def activate_promotion(
    promotion_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """啟用促銷"""
    result = await db.execute(
        select(Promotion).where(Promotion.id == promotion_id)
    )
    promo = result.scalar_one_or_none()

    if not promo:
        raise HTTPException(status_code=404, detail=f"促銷 ID '{promotion_id}' 不存在")

    promo.is_active = True
    promo.status = PromotionStatus.ACTIVE

    await db.commit()
    await db.refresh(promo)

    return PromotionUpdateResponse(
        success=True,
        message="促銷已啟用",
        data=_transform_promotion_to_response(promo)
    )


@router.post("/{promotion_id}/pause", response_model=PromotionUpdateResponse)
async def pause_promotion(
    promotion_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """暫停促銷"""
    result = await db.execute(
        select(Promotion).where(Promotion.id == promotion_id)
    )
    promo = result.scalar_one_or_none()

    if not promo:
        raise HTTPException(status_code=404, detail=f"促銷 ID '{promotion_id}' 不存在")

    promo.status = PromotionStatus.PAUSED

    await db.commit()
    await db.refresh(promo)

    return PromotionUpdateResponse(
        success=True,
        message="促銷已暫停",
        data=_transform_promotion_to_response(promo)
    )


@router.get("/sku/{sku_id}/active")
async def get_active_promotions_for_sku(
    sku_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取 SKU 當前有效的促銷

    返回當前時間有效且啟用的所有促銷，按優先級排序
    """
    now = datetime.utcnow()

    result = await db.execute(
        select(Promotion)
        .where(
            and_(
                Promotion.sku_id == sku_id,
                Promotion.is_active == True,
                Promotion.status.in_([PromotionStatus.ACTIVE, PromotionStatus.SCHEDULED]),
                Promotion.start_date <= now,
                or_(Promotion.end_date.is_(None), Promotion.end_date >= now)
            )
        )
        .order_by(Promotion.priority.desc())
    )
    promotions = result.scalars().all()

    # 過濾數量限制
    valid_promotions = [
        p for p in promotions
        if p.max_quantity is None or p.sold_quantity < p.max_quantity
    ]

    return {
        "success": True,
        "skuId": sku_id,
        "activePromotions": [_transform_promotion_to_response(p) for p in valid_promotions],
        "bestPromotion": _transform_promotion_to_response(valid_promotions[0]) if valid_promotions else None
    }
