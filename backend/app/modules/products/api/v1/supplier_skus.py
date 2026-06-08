"""
Supplier SKU API endpoints
供應商-SKU 價格管理 API
"""
from typing import Optional, List
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import structlog

from app.modules.products.core.database import get_async_session
from app.modules.products.models.sku_simple import ProductSKU
from app.modules.products.models.supplier_sku import SupplierSKU
from app.modules.products.services.supplier_sku_service import SupplierSKUService

logger = structlog.get_logger()
router = APIRouter()


def _get_tenant_id_from_request(request: Request) -> Optional[str]:
    """從請求標頭取得租戶 ID"""
    return request.headers.get("X-Tenant-Id") or request.headers.get("X-Org-Id")


def _get_user_id_from_request(request: Request) -> Optional[str]:
    """從請求標頭取得用戶 ID"""
    return request.headers.get("X-User-ID")


@router.get("/skus/{sku_id}/suppliers")
async def get_sku_suppliers(
    sku_id: str,
    active_only: bool = Query(True, description="僅顯示有效供應商"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取 SKU 的所有供應商及其價格

    返回該 SKU 關聯的所有供應商，包含：
    - 供應商價格資訊
    - 階梯定價/批量折扣
    - 績效評分
    - 合約資訊
    """
    suppliers = await SupplierSKUService.get_sku_suppliers(db, sku_id, active_only)

    return {
        "success": True,
        "skuId": sku_id,
        "totalSuppliers": len(suppliers),
        "data": suppliers
    }


@router.get("/skus/{sku_id}/price-comparison")
async def compare_sku_prices(
    sku_id: str,
    quantity: float = Query(1, gt=0, description="購買數量"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    比較 SKU 的多供應商價格

    根據購買數量計算各供應商的有效價格（含階梯定價/批量折扣）
    返回：
    - 各供應商價格明細
    - 價格範圍統計
    - 最佳供應商推薦
    """
    comparison = await SupplierSKUService.compare_supplier_prices(db, sku_id, quantity)

    return {
        "success": True,
        **comparison
    }


@router.get("/suppliers/performance")
async def get_supplier_performance_matrix(
    supplier_ids: Optional[str] = Query(None, description="供應商 ID（逗號分隔）"),
    category_id: Optional[str] = Query(None, description="類別 ID"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取供應商績效矩陣

    聚合各供應商的 SKU 數據，包含：
    - SKU 數量
    - 平均價格
    - 品質/交期/服務評分
    - 整體評分排名
    """
    supplier_id_list = supplier_ids.split(",") if supplier_ids else None

    matrix = await SupplierSKUService.get_supplier_performance_matrix(
        db, supplier_id_list, category_id, limit
    )

    return {
        "success": True,
        "total": len(matrix),
        "data": matrix
    }


@router.get("/skus/{sku_id}/price-trends")
async def get_sku_price_trends(
    sku_id: str,
    supplier_id: Optional[str] = Query(None, description="特定供應商 ID"),
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_async_session)
):
    """獲取 SKU 價格趨勢"""
    trends = await SupplierSKUService.get_price_trends(db, sku_id, supplier_id, days)

    return {
        "success": True,
        **trends
    }


@router.post("/supplier-skus")
async def create_supplier_sku(
    request: Request,
    sku_id: str,
    supplier_id: str,
    supplier_sku_code: str,
    supplier_price: float,
    lead_time_days: int = 1,
    minimum_order_quantity: int = 1,
    is_preferred: bool = False,
    pricing_tiers: Optional[List[dict]] = None,
    bulk_discount_threshold: Optional[int] = None,
    bulk_discount_rate: Optional[float] = None,
    db: AsyncSession = Depends(get_async_session)
):
    """
    創建供應商-SKU 關聯

    建立 ProductSKU 與供應商的價格關聯，支援：
    - 基本定價
    - 階梯定價 (pricing_tiers)
    - 批量折扣
    """
    user_id = _get_user_id_from_request(request)

    # 驗證 SKU 存在
    sku_result = await db.execute(
        select(ProductSKU).where(ProductSKU.id == sku_id)
    )
    sku = sku_result.scalar_one_or_none()
    if not sku:
        raise HTTPException(status_code=404, detail=f"SKU ID '{sku_id}' 不存在")

    # 檢查是否已存在
    existing = await db.execute(
        select(SupplierSKU).where(
            and_(
                SupplierSKU.sku_id == sku_id,
                SupplierSKU.supplier_id == supplier_id
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"供應商 '{supplier_id}' 已關聯此 SKU"
        )

    supplier_sku = SupplierSKU(
        id=str(uuid4()),
        sku_id=sku_id,
        supplier_id=supplier_id,
        supplier_sku_code=supplier_sku_code,
        supplier_price=supplier_price,
        lead_time_days=lead_time_days,
        minimum_order_quantity=minimum_order_quantity,
        is_preferred=is_preferred,
        pricing_tiers=pricing_tiers or [],
        bulk_discount_threshold=bulk_discount_threshold,
        bulk_discount_rate=bulk_discount_rate,
        is_active=True,
        created_by=user_id
    )

    db.add(supplier_sku)
    await db.commit()
    await db.refresh(supplier_sku)

    logger.info("supplier_sku_created", sku_id=sku_id, supplier_id=supplier_id)

    return {
        "success": True,
        "message": "供應商-SKU 關聯創建成功",
        "data": {
            "id": supplier_sku.id,
            "skuId": sku_id,
            "supplierId": supplier_id,
            "supplierSkuCode": supplier_sku_code,
            "supplierPrice": supplier_price
        }
    }


@router.put("/supplier-skus/{supplier_sku_id}")
async def update_supplier_sku(
    request: Request,
    supplier_sku_id: str,
    supplier_price: Optional[float] = None,
    lead_time_days: Optional[int] = None,
    minimum_order_quantity: Optional[int] = None,
    is_preferred: Optional[bool] = None,
    pricing_tiers: Optional[List[dict]] = None,
    bulk_discount_threshold: Optional[int] = None,
    bulk_discount_rate: Optional[float] = None,
    quality_score: Optional[float] = None,
    delivery_score: Optional[float] = None,
    service_score: Optional[float] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_async_session)
):
    """更新供應商-SKU 關聯"""
    user_id = _get_user_id_from_request(request)

    result = await db.execute(
        select(SupplierSKU).where(SupplierSKU.id == supplier_sku_id)
    )
    supplier_sku = result.scalar_one_or_none()

    if not supplier_sku:
        raise HTTPException(status_code=404, detail=f"SupplierSKU ID '{supplier_sku_id}' 不存在")

    # 更新欄位
    if supplier_price is not None:
        supplier_sku.supplier_price = supplier_price
    if lead_time_days is not None:
        supplier_sku.lead_time_days = lead_time_days
    if minimum_order_quantity is not None:
        supplier_sku.minimum_order_quantity = minimum_order_quantity
    if is_preferred is not None:
        supplier_sku.is_preferred = is_preferred
    if pricing_tiers is not None:
        supplier_sku.pricing_tiers = pricing_tiers
    if bulk_discount_threshold is not None:
        supplier_sku.bulk_discount_threshold = bulk_discount_threshold
    if bulk_discount_rate is not None:
        supplier_sku.bulk_discount_rate = bulk_discount_rate
    if quality_score is not None:
        supplier_sku.quality_score = quality_score
    if delivery_score is not None:
        supplier_sku.delivery_score = delivery_score
    if service_score is not None:
        supplier_sku.service_score = service_score
    if is_active is not None:
        supplier_sku.is_active = is_active

    supplier_sku.updated_by = user_id

    await db.commit()
    await db.refresh(supplier_sku)

    logger.info("supplier_sku_updated", id=supplier_sku_id)

    return {
        "success": True,
        "message": "供應商-SKU 更新成功",
        "data": {
            "id": supplier_sku.id,
            "skuId": supplier_sku.sku_id,
            "supplierId": supplier_sku.supplier_id,
            "supplierPrice": float(supplier_sku.supplier_price) if supplier_sku.supplier_price else None,
            "isPreferred": supplier_sku.is_preferred,
            "isActive": supplier_sku.is_active
        }
    }


@router.delete("/supplier-skus/{supplier_sku_id}")
async def delete_supplier_sku(
    supplier_sku_id: str,
    hard_delete: bool = Query(False, description="是否永久刪除"),
    db: AsyncSession = Depends(get_async_session)
):
    """刪除供應商-SKU 關聯"""
    result = await db.execute(
        select(SupplierSKU).where(SupplierSKU.id == supplier_sku_id)
    )
    supplier_sku = result.scalar_one_or_none()

    if not supplier_sku:
        raise HTTPException(status_code=404, detail=f"SupplierSKU ID '{supplier_sku_id}' 不存在")

    if hard_delete:
        await db.delete(supplier_sku)
        message = "供應商-SKU 關聯已永久刪除"
    else:
        supplier_sku.is_active = False
        message = "供應商-SKU 關聯已停用"

    await db.commit()

    logger.info("supplier_sku_deleted", id=supplier_sku_id, hard_delete=hard_delete)

    return {
        "success": True,
        "message": message,
        "deletedId": supplier_sku_id
    }
