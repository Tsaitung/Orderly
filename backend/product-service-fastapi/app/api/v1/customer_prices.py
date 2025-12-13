"""
Customer Prices API endpoints
客戶專屬價格管理 API
"""
from typing import Optional, List
from datetime import datetime
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from pydantic import BaseModel, Field
import structlog

from app.core.database import get_async_session
from app.models.customer_price import CustomerPrice
from app.models.sku_simple import ProductSKU

logger = structlog.get_logger()
router = APIRouter()


# ============= Schemas =============

class CustomerPriceCreateRequest(BaseModel):
    """客戶價格創建請求"""
    customerId: str = Field(..., description="客戶 ID")
    customerName: Optional[str] = Field(None, description="客戶名稱")
    skuId: str = Field(..., description="SKU ID")
    productId: Optional[str] = Field(None, description="產品 ID")
    specialPrice: float = Field(..., gt=0, description="專屬價格")
    discountRate: Optional[float] = Field(None, ge=0, le=1, description="折扣率")
    contractNumber: Optional[str] = Field(None, description="合約編號")
    agreementNotes: Optional[str] = Field(None, description="協議備註")
    effectiveFrom: datetime = Field(..., description="生效開始時間")
    effectiveTo: Optional[datetime] = Field(None, description="生效結束時間")
    minQuantity: Optional[int] = Field(None, ge=1, description="最低購買數量")
    maxQuantity: Optional[int] = Field(None, ge=1, description="最大購買數量")
    priority: int = Field(0, description="優先級")


class CustomerPriceUpdateRequest(BaseModel):
    """客戶價格更新請求"""
    customerName: Optional[str] = None
    specialPrice: Optional[float] = Field(None, gt=0)
    discountRate: Optional[float] = Field(None, ge=0, le=1)
    contractNumber: Optional[str] = None
    agreementNotes: Optional[str] = None
    effectiveFrom: Optional[datetime] = None
    effectiveTo: Optional[datetime] = None
    minQuantity: Optional[int] = Field(None, ge=1)
    maxQuantity: Optional[int] = Field(None, ge=1)
    isActive: Optional[bool] = None
    priority: Optional[int] = None


class CustomerPriceResponse(BaseModel):
    """客戶價格響應"""
    id: str
    tenantId: Optional[str] = None
    customerId: str
    customerName: Optional[str] = None
    skuId: str
    productId: Optional[str] = None
    specialPrice: float
    originalPrice: Optional[float] = None
    discountRate: Optional[float] = None
    discountPercentage: float = 0
    contractNumber: Optional[str] = None
    agreementNotes: Optional[str] = None
    effectiveFrom: datetime
    effectiveTo: Optional[datetime] = None
    minQuantity: Optional[int] = None
    maxQuantity: Optional[int] = None
    isActive: bool
    isValid: bool = False
    priority: int
    approvedBy: Optional[str] = None
    approvedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


# ============= Helper Functions =============

def _get_tenant_id_from_request(request: Request) -> Optional[str]:
    """從請求標頭取得租戶 ID"""
    return request.headers.get("X-Tenant-Id") or request.headers.get("X-Org-Id")


def _get_user_id_from_request(request: Request) -> Optional[str]:
    """從請求標頭取得用戶 ID"""
    return request.headers.get("X-User-ID")


def _transform_to_response(cp: CustomerPrice) -> CustomerPriceResponse:
    """轉換為響應格式"""
    return CustomerPriceResponse(
        id=cp.id,
        tenantId=cp.tenant_id,
        customerId=cp.customer_id,
        customerName=cp.customer_name,
        skuId=cp.sku_id,
        productId=cp.product_id,
        specialPrice=cp.special_price,
        originalPrice=cp.original_price,
        discountRate=cp.discount_rate,
        discountPercentage=cp.discount_percentage,
        contractNumber=cp.contract_number,
        agreementNotes=cp.agreement_notes,
        effectiveFrom=cp.effective_from,
        effectiveTo=cp.effective_to,
        minQuantity=cp.min_quantity,
        maxQuantity=cp.max_quantity,
        isActive=cp.is_active,
        isValid=cp.is_valid,
        priority=cp.priority,
        approvedBy=cp.approved_by,
        approvedAt=cp.approved_at,
        createdAt=cp.created_at,
        updatedAt=cp.updated_at
    )


# ============= API Endpoints =============

@router.get("")
async def list_customer_prices(
    request: Request,
    customer_id: Optional[str] = Query(None, description="客戶 ID"),
    sku_id: Optional[str] = Query(None, description="SKU ID"),
    active_only: bool = Query(False, description="僅顯示有效價格"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取客戶專屬價格列表

    - **customer_id**: 篩選特定客戶
    - **sku_id**: 篩選特定 SKU
    - **active_only**: 僅顯示當前有效的價格
    """
    tenant_id = _get_tenant_id_from_request(request)

    query = select(CustomerPrice)

    conditions = []
    if tenant_id:
        conditions.append(CustomerPrice.tenant_id == tenant_id)
    if customer_id:
        conditions.append(CustomerPrice.customer_id == customer_id)
    if sku_id:
        conditions.append(CustomerPrice.sku_id == sku_id)
    if active_only:
        now = datetime.utcnow()
        conditions.append(CustomerPrice.is_active == True)
        conditions.append(CustomerPrice.effective_from <= now)
        conditions.append(or_(CustomerPrice.effective_to.is_(None), CustomerPrice.effective_to >= now))

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(CustomerPrice.priority.desc(), CustomerPrice.created_at.desc())

    # 分頁
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    prices = result.scalars().all()

    # 計算總數
    count_query = select(CustomerPrice)
    if conditions:
        count_query = count_query.where(and_(*conditions))
    count_result = await db.execute(count_query)
    total = len(count_result.scalars().all())

    return {
        "success": True,
        "data": [_transform_to_response(p) for p in prices],
        "pagination": {
            "page": page,
            "pageSize": page_size,
            "total": total,
            "totalPages": (total + page_size - 1) // page_size
        }
    }


@router.get("/{price_id}")
async def get_customer_price(
    price_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """獲取單一客戶價格詳情"""
    result = await db.execute(
        select(CustomerPrice).where(CustomerPrice.id == price_id)
    )
    cp = result.scalar_one_or_none()

    if not cp:
        raise HTTPException(status_code=404, detail=f"客戶價格 ID '{price_id}' 不存在")

    return {
        "success": True,
        "data": _transform_to_response(cp)
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_customer_price(
    request: Request,
    data: CustomerPriceCreateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    創建客戶專屬價格

    為特定客戶設定特殊價格，支援：
    - 生效期設定
    - 數量限制
    - 合約資訊記錄
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

    # 檢查是否已存在相同的客戶-SKU 價格（有效期重疊）
    existing_query = select(CustomerPrice).where(
        and_(
            CustomerPrice.customer_id == data.customerId,
            CustomerPrice.sku_id == data.skuId,
            CustomerPrice.is_active == True
        )
    )
    existing_result = await db.execute(existing_query)
    existing = existing_result.scalar_one_or_none()

    if existing and existing.is_valid:
        logger.warning(
            "customer_price_overlap",
            customer_id=data.customerId,
            sku_id=data.skuId,
            existing_id=existing.id
        )
        # 可選：警告但仍允許創建（用優先級決定）

    cp = CustomerPrice(
        id=str(uuid4()),
        tenant_id=tenant_id,
        customer_id=data.customerId,
        customer_name=data.customerName,
        sku_id=data.skuId,
        product_id=data.productId or sku.product_id,
        special_price=data.specialPrice,
        original_price=sku.unit_price,
        discount_rate=data.discountRate,
        contract_number=data.contractNumber,
        agreement_notes=data.agreementNotes,
        effective_from=data.effectiveFrom,
        effective_to=data.effectiveTo,
        min_quantity=data.minQuantity,
        max_quantity=data.maxQuantity,
        priority=data.priority,
        is_active=True,
        created_by=user_id
    )

    db.add(cp)
    await db.commit()
    await db.refresh(cp)

    logger.info(
        "customer_price_created",
        id=cp.id,
        customer_id=data.customerId,
        sku_id=data.skuId,
        tenant_id=tenant_id
    )

    return {
        "success": True,
        "message": "客戶專屬價格創建成功",
        "data": _transform_to_response(cp)
    }


@router.put("/{price_id}")
async def update_customer_price(
    request: Request,
    price_id: str,
    data: CustomerPriceUpdateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """更新客戶專屬價格"""
    user_id = _get_user_id_from_request(request)

    result = await db.execute(
        select(CustomerPrice).where(CustomerPrice.id == price_id)
    )
    cp = result.scalar_one_or_none()

    if not cp:
        raise HTTPException(status_code=404, detail=f"客戶價格 ID '{price_id}' 不存在")

    # 更新欄位
    update_data = data.model_dump(exclude_unset=True)
    field_mapping = {
        'customerName': 'customer_name',
        'specialPrice': 'special_price',
        'discountRate': 'discount_rate',
        'contractNumber': 'contract_number',
        'agreementNotes': 'agreement_notes',
        'effectiveFrom': 'effective_from',
        'effectiveTo': 'effective_to',
        'minQuantity': 'min_quantity',
        'maxQuantity': 'max_quantity',
        'isActive': 'is_active',
    }

    for key, value in update_data.items():
        db_field = field_mapping.get(key, key)
        if hasattr(cp, db_field):
            setattr(cp, db_field, value)

    cp.updated_by = user_id

    await db.commit()
    await db.refresh(cp)

    logger.info("customer_price_updated", id=price_id)

    return {
        "success": True,
        "message": "客戶專屬價格更新成功",
        "data": _transform_to_response(cp)
    }


@router.delete("/{price_id}")
async def delete_customer_price(
    price_id: str,
    hard_delete: bool = Query(False, description="是否永久刪除"),
    db: AsyncSession = Depends(get_async_session)
):
    """刪除客戶專屬價格"""
    result = await db.execute(
        select(CustomerPrice).where(CustomerPrice.id == price_id)
    )
    cp = result.scalar_one_or_none()

    if not cp:
        raise HTTPException(status_code=404, detail=f"客戶價格 ID '{price_id}' 不存在")

    if hard_delete:
        await db.delete(cp)
        message = "客戶專屬價格已永久刪除"
    else:
        cp.is_active = False
        message = "客戶專屬價格已停用"

    await db.commit()

    logger.info("customer_price_deleted", id=price_id, hard_delete=hard_delete)

    return {
        "success": True,
        "message": message,
        "deletedId": price_id
    }


@router.post("/{price_id}/approve")
async def approve_customer_price(
    request: Request,
    price_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """核准客戶專屬價格"""
    user_id = _get_user_id_from_request(request)

    result = await db.execute(
        select(CustomerPrice).where(CustomerPrice.id == price_id)
    )
    cp = result.scalar_one_or_none()

    if not cp:
        raise HTTPException(status_code=404, detail=f"客戶價格 ID '{price_id}' 不存在")

    cp.approved_by = user_id
    cp.approved_at = datetime.utcnow()
    cp.is_active = True

    await db.commit()
    await db.refresh(cp)

    return {
        "success": True,
        "message": "客戶專屬價格已核准",
        "data": _transform_to_response(cp)
    }


@router.get("/customer/{customer_id}/active")
async def get_customer_active_prices(
    customer_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取客戶當前有效的所有專屬價格

    用於訂單計價時查詢客戶的優惠價格
    """
    now = datetime.utcnow()

    result = await db.execute(
        select(CustomerPrice)
        .where(
            and_(
                CustomerPrice.customer_id == customer_id,
                CustomerPrice.is_active == True,
                CustomerPrice.effective_from <= now,
                or_(CustomerPrice.effective_to.is_(None), CustomerPrice.effective_to >= now)
            )
        )
        .order_by(CustomerPrice.priority.desc())
    )
    prices = result.scalars().all()

    # 按 SKU 分組，返回每個 SKU 的最高優先級價格
    sku_prices = {}
    for p in prices:
        if p.sku_id not in sku_prices:
            sku_prices[p.sku_id] = _transform_to_response(p)

    return {
        "success": True,
        "customerId": customer_id,
        "totalActivePrices": len(sku_prices),
        "data": list(sku_prices.values())
    }
