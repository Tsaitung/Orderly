"""
Simple SKU API endpoints for live data
Matches frontend expectations and existing database schema
"""
from typing import List, Optional
from uuid import uuid4
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, and_, or_, func, text
import structlog

from app.core.database import get_async_session
from app.models.sku_simple import ProductSKU, SKUPricingMethod
from app.models.product import Product
from app.models.price_history import PriceHistory, PriceType
from app.schemas.sku import (
    SKUSimpleCreateRequest,
    SKUSimpleUpdateRequest,
    SKUSimpleResponse,
    SKUSimpleCreateResponse,
    SKUSimpleUpdateResponse,
    SKUSimpleDeleteResponse,
    SKUPriceUpdateRequest,
    SKUPriceUpdateResponse,
)
from app.services.pricing_service import PricingService

logger = structlog.get_logger()
router = APIRouter()


@router.get("/skus/search")
async def search_skus(
    search: Optional[str] = Query(None, description="搜尋SKU代碼、產品名稱"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=100, description="每頁數量"),
    is_active: Optional[bool] = Query(None, description="是否啟用"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    搜尋SKU - 支援分頁和篩選
    返回格式符合前端期望
    """
    try:
        # Build query
        query = select(ProductSKU).options(selectinload(ProductSKU.product))
        
        # Apply filters
        if is_active is not None:
            query = query.where(ProductSKU.is_active == is_active)
        
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    ProductSKU.sku_code.ilike(search_term),
                    ProductSKU.name.ilike(search_term)
                )
            )
        
        # Count total records
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        # Execute query
        result = await db.execute(query)
        skus = result.scalars().all()
        
        # Transform to frontend format with sharing mechanism
        sku_data = []
        for sku in skus:
            # 計算供應商數量 (如果是共享型 SKU)
            supplier_count = 1
            if hasattr(sku, 'type') and sku.type == 'public':
                # TODO: 從 supplier_product_sku_participations 查詢實際數量
                supplier_count = 3  # Mock data for now
            
            sku_item = {
                "id": sku.id,
                "code": sku.sku_code,
                "name": sku.name,
                "nameEn": sku.name,  # Using same name for English
                "isActive": sku.is_active,
                "weight": sku.weight,
                "packageType": sku.package_type,
                "variant": sku.variant or {},
                # 新增共享機制相關欄位
                "type": getattr(sku, 'type', 'private'),
                "creatorType": getattr(sku, 'creator_type', 'supplier'),
                "approvalStatus": getattr(sku, 'approval_status', 'approved'),
                "supplierCount": supplier_count,
                "product": {
                    "id": sku.product.id if sku.product else None,
                    "name": sku.product.name if sku.product else "Unknown Product",
                    "code": sku.product.code if sku.product else None
                } if sku.product else None
            }
            sku_data.append(sku_item)
        
        total_pages = (total + page_size - 1) // page_size
        
        return {
            "success": True,
            "data": sku_data,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "meta": {
                "totalSKUs": total,
                "activeSKUs": len([s for s in sku_data if s["isActive"]]),
                "page": page,
                "totalPages": total_pages
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search SKUs: {str(e)}"
        )


@router.get("/skus/stats")
async def get_sku_stats(
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取SKU統計資料
    用於儀表板顯示
    """
    try:
        # Get total SKU count
        total_query = select(func.count()).select_from(ProductSKU)
        total_result = await db.execute(total_query)
        total_skus = total_result.scalar()
        
        # Get active SKU count
        active_query = select(func.count()).select_from(ProductSKU).where(ProductSKU.is_active == True)
        active_result = await db.execute(active_query)
        active_skus = active_result.scalar()
        
        # Set low stock count to 0 (inventory removed)
        low_stock_count = 0
        
        # Calculate simple stats
        return {
            "success": True,
            "data": {
                "totalSKUs": total_skus,
                "activeSKUs": active_skus,
                "inactiveSKUs": total_skus - active_skus,
                "lowStockSKUs": low_stock_count,
                "supplierCount": 2,  # Mock data for now
                "avgPrice": 0,  # Mock data for now
                "priceRange": "NT$ 0"  # Mock data for now
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get SKU stats: {str(e)}"
        )


@router.get("/skus/{sku_id}")
async def get_sku_by_id(
    sku_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取單一SKU詳細資訊
    """
    try:
        query = select(ProductSKU).options(selectinload(ProductSKU.product)).where(ProductSKU.id == sku_id)
        result = await db.execute(query)
        sku = result.scalar_one_or_none()

        if not sku:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SKU not found"
            )

        return {
            "success": True,
            "data": {
                "id": sku.id,
                "code": sku.sku_code,
                "name": sku.name,
                "nameEn": sku.name,
                "isActive": sku.is_active,
                "weight": sku.weight,
                "packageType": sku.package_type,
                "variant": sku.variant or {},
                "product": {
                    "id": sku.product.id if sku.product else None,
                    "name": sku.product.name if sku.product else "Unknown Product",
                    "code": sku.product.code if sku.product else None
                } if sku.product else None
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get SKU: {str(e)}"
        )


# ============= SKU CRUD 端點 =============

def _get_user_id_from_request(request: Request) -> Optional[str]:
    """從請求標頭取得用戶 ID（由 Gateway 轉發）"""
    return request.headers.get("X-User-ID")


def _get_tenant_id_from_request(request: Request) -> Optional[str]:
    """從請求標頭取得租戶 ID（由 Gateway 轉發）"""
    return request.headers.get("X-Tenant-Id") or request.headers.get("X-Org-Id")


def _transform_sku_to_response(sku: ProductSKU) -> SKUSimpleResponse:
    """將 ProductSKU Model 轉換為 Response Schema"""
    return SKUSimpleResponse(
        id=str(sku.id),
        productId=str(sku.product_id),
        skuCode=sku.sku_code,
        name=sku.name,
        variant=sku.variant or {},
        stockQuantity=sku.stock_quantity or 0,
        reservedQuantity=sku.reserved_quantity or 0,
        minStock=sku.min_stock or 0,
        maxStock=sku.max_stock,
        weight=sku.weight,
        dimensions=sku.dimensions,
        packageType=sku.package_type,
        shelfLifeDays=sku.shelf_life_days,
        storageConditions=sku.storage_conditions,
        batchTrackingEnabled=sku.batch_tracking_enabled or False,
        isActive=sku.is_active,
        type=sku.type.value if sku.type else "STANDARD",
        creatorType=sku.creator_type.value if sku.creator_type else "SYSTEM",
        approvalStatus=sku.approval_status.value if sku.approval_status else "APPROVED",
        pricingMethod=sku.pricing_method.value if sku.pricing_method else None,
        pricingUnit=sku.pricing_unit or "unit",
        unitPrice=sku.unit_price,
        minOrderQuantity=sku.min_order_quantity,
        quantityIncrement=sku.quantity_increment,
        originCountry=sku.origin_country,
        originRegion=sku.origin_region,
        createdAt=sku.created_at,
        updatedAt=sku.updated_at,
    )


@router.post("/skus", response_model=SKUSimpleCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_sku(
    request: Request,
    data: SKUSimpleCreateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    創建新 SKU

    - **productId**: 產品 ID（必填）
    - **skuCode**: SKU 代碼（必填，唯一）
    - **name**: SKU 名稱（必填）
    """
    try:
        # 檢查 SKU 代碼是否已存在
        existing = await db.execute(
            select(ProductSKU).where(ProductSKU.sku_code == data.skuCode)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"SKU 代碼 '{data.skuCode}' 已存在"
            )

        # 驗證產品是否存在
        product_check = await db.execute(
            select(Product).where(Product.id == data.productId)
        )
        if not product_check.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"產品 ID '{data.productId}' 不存在"
            )

        # 解析計價方式
        pricing_method = None
        if data.pricingMethod:
            try:
                pricing_method = SKUPricingMethod(data.pricingMethod)
            except ValueError:
                pass  # 使用預設值

        # 取得 tenant_id
        tenant_id = _get_tenant_id_from_request(request)

        # 創建 SKU 實例
        sku = ProductSKU(
            id=str(uuid4()),
            tenant_id=tenant_id,  # 多租戶隔離
            product_id=data.productId,
            sku_code=data.skuCode,
            name=data.name,
            variant=data.variant or {},
            stock_quantity=data.stockQuantity,
            min_stock=data.minStock,
            max_stock=data.maxStock,
            weight=data.weight,
            dimensions=data.dimensions,
            package_type=data.packageType,
            shelf_life_days=data.shelfLifeDays,
            storage_conditions=data.storageConditions,
            batch_tracking_enabled=data.batchTrackingEnabled,
            is_active=data.isActive,
            pricing_method=pricing_method,
            pricing_unit=data.pricingUnit,
            unit_price=data.unitPrice,
            min_order_quantity=data.minOrderQuantity,
            quantity_increment=data.quantityIncrement,
            origin_country=data.originCountry,
            origin_region=data.originRegion,
        )

        db.add(sku)
        await db.commit()
        await db.refresh(sku)

        logger.info(
            "sku_created",
            sku_id=sku.id,
            sku_code=sku.sku_code,
            product_id=data.productId
        )

        return SKUSimpleCreateResponse(
            success=True,
            message="SKU 創建成功",
            data=_transform_sku_to_response(sku)
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("sku_create_failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"創建 SKU 失敗: {str(e)}"
        )


@router.put("/skus/{sku_id}", response_model=SKUSimpleUpdateResponse)
async def update_sku(
    sku_id: str,
    request: Request,
    data: SKUSimpleUpdateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    更新 SKU

    僅更新請求中提供的欄位
    """
    try:
        # 獲取現有 SKU
        result = await db.execute(
            select(ProductSKU).where(ProductSKU.id == sku_id)
        )
        sku = result.scalar_one_or_none()

        if not sku:
            raise HTTPException(
                status_code=404,
                detail=f"SKU ID '{sku_id}' 不存在"
            )

        # 更新欄位（僅更新有值的欄位）
        update_data = data.model_dump(exclude_unset=True)

        # 欄位名稱映射（camelCase -> snake_case）
        field_mapping = {
            'stockQuantity': 'stock_quantity',
            'minStock': 'min_stock',
            'maxStock': 'max_stock',
            'packageType': 'package_type',
            'shelfLifeDays': 'shelf_life_days',
            'storageConditions': 'storage_conditions',
            'batchTrackingEnabled': 'batch_tracking_enabled',
            'isActive': 'is_active',
            'pricingMethod': 'pricing_method',
            'pricingUnit': 'pricing_unit',
            'unitPrice': 'unit_price',
            'minOrderQuantity': 'min_order_quantity',
            'quantityIncrement': 'quantity_increment',
            'originCountry': 'origin_country',
            'originRegion': 'origin_region',
        }

        for key, value in update_data.items():
            if value is not None:
                db_field = field_mapping.get(key, key)

                # 特殊處理計價方式
                if key == 'pricingMethod':
                    try:
                        value = SKUPricingMethod(value)
                    except ValueError:
                        continue

                setattr(sku, db_field, value)

        await db.commit()
        await db.refresh(sku)

        logger.info(
            "sku_updated",
            sku_id=sku.id,
            updated_fields=list(update_data.keys())
        )

        return SKUSimpleUpdateResponse(
            success=True,
            message="SKU 更新成功",
            data=_transform_sku_to_response(sku)
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("sku_update_failed", sku_id=sku_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"更新 SKU 失敗: {str(e)}"
        )


@router.delete("/skus/{sku_id}", response_model=SKUSimpleDeleteResponse)
async def delete_sku(
    sku_id: str,
    hard_delete: bool = Query(False, description="是否硬刪除（永久刪除）"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    刪除 SKU

    預設為軟刪除（設為非活躍），可選硬刪除
    """
    try:
        # 獲取現有 SKU
        result = await db.execute(
            select(ProductSKU).where(ProductSKU.id == sku_id)
        )
        sku = result.scalar_one_or_none()

        if not sku:
            raise HTTPException(
                status_code=404,
                detail=f"SKU ID '{sku_id}' 不存在"
            )

        if hard_delete:
            # 硬刪除
            await db.delete(sku)
            await db.commit()
            logger.info("sku_hard_deleted", sku_id=sku_id)
        else:
            # 軟刪除：設為非活躍
            sku.is_active = False
            await db.commit()
            logger.info("sku_soft_deleted", sku_id=sku_id)

        return SKUSimpleDeleteResponse(
            success=True,
            message="SKU 刪除成功" if hard_delete else "SKU 已停用",
            deletedId=sku_id
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("sku_delete_failed", sku_id=sku_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"刪除 SKU 失敗: {str(e)}"
        )


@router.put("/skus/{sku_id}/price", response_model=SKUPriceUpdateResponse)
async def update_sku_price(
    sku_id: str,
    request: Request,
    data: SKUPriceUpdateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    更新 SKU 價格（自動記錄價格歷史）

    - **newPrice**: 新價格（必填）
    - **priceType**: 價格類型 (base/selling/cost/promotional)
    - **changeReason**: 變動原因
    """
    try:
        user_id = _get_user_id_from_request(request)

        # 獲取現有 SKU
        result = await db.execute(
            select(ProductSKU).where(ProductSKU.id == sku_id)
        )
        sku = result.scalar_one_or_none()

        if not sku:
            raise HTTPException(
                status_code=404,
                detail=f"SKU ID '{sku_id}' 不存在"
            )

        # 記錄舊價格
        old_price = sku.unit_price

        # 更新價格
        sku.unit_price = data.newPrice

        # 計算變動百分比
        change_percent = None
        if old_price and old_price > 0:
            change_percent = round(((data.newPrice - old_price) / old_price) * 100, 2)

        # 解析價格類型
        try:
            price_type = PriceType(data.priceType)
        except ValueError:
            price_type = PriceType.BASE

        # 創建價格歷史記錄
        price_history = PriceHistory(
            id=str(uuid4()),
            sku_id=sku_id,
            old_price=Decimal(str(old_price)) if old_price else None,
            new_price=Decimal(str(data.newPrice)),
            price_type=price_type,
            currency=data.currency,
            change_reason=data.changeReason,
            changed_by=user_id,
            effective_from=data.effectiveFrom,
            effective_to=data.effectiveTo,
            change_percent=change_percent,
        )

        db.add(price_history)
        await db.commit()
        await db.refresh(sku)
        await db.refresh(price_history)

        logger.info(
            "sku_price_updated",
            sku_id=sku_id,
            old_price=old_price,
            new_price=data.newPrice,
            change_percent=change_percent,
            changed_by=user_id
        )

        return SKUPriceUpdateResponse(
            success=True,
            message="SKU 價格更新成功",
            data=_transform_sku_to_response(sku),
            priceHistory={
                "id": price_history.id,
                "oldPrice": float(old_price) if old_price else None,
                "newPrice": float(data.newPrice),
                "changePercent": change_percent,
                "priceType": price_type.value,
                "changeReason": data.changeReason,
                "changedAt": price_history.changed_at.isoformat() if price_history.changed_at else None
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("sku_price_update_failed", sku_id=sku_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"更新 SKU 價格失敗: {str(e)}"
        )


# ============= 價格計算端點 =============

@router.get("/skus/{sku_id}/calculate-price")
async def calculate_sku_price(
    sku_id: str,
    quantity: float = Query(..., gt=0, description="購買數量"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    計算 SKU 價格（根據定價方式）

    - **UNIT**: 單位計價
    - **BULK**: 批量折扣（達門檻全部享折扣）
    - **TIERED**: 階梯定價（所有數量使用同一階層價格）
    - **VOLUME**: 量價定價（累進式，不同區間使用不同價格）
    """
    result = await PricingService.calculate_price(db, sku_id, quantity)
    return {
        "success": True,
        "data": result.to_dict()
    }


# 注意：pricing-tiers 端點已移除
# 原因：資料庫中不存在 pricing_tiers, bulk_discount_threshold, bulk_discount_rate 欄位
# 若未來需要階梯定價功能，請先透過 Alembic 遷移添加相關欄位
#
# 已移除的端點：
# - GET /skus/{sku_id}/pricing-tiers
# - PUT /skus/{sku_id}/pricing-tiers