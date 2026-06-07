"""
Bulk Operations API endpoints
批量操作 API
"""
from typing import Optional, List
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel, Field
import structlog

from app.modules.products.core.database import get_async_session
from app.modules.products.models.product import Product
from app.modules.products.models.sku_simple import ProductSKU, SKUPricingMethod
from app.modules.products.models.price_history import PriceHistory, PriceType
from app.modules.products.models.category import ProductCategory

logger = structlog.get_logger()
router = APIRouter()


# ============= Schemas =============

class BulkProductCreate(BaseModel):
    """批量產品創建項目"""
    code: str = Field(..., description="產品代碼")
    name: str = Field(..., description="產品名稱")
    nameEn: Optional[str] = None
    categoryId: str = Field(..., description="類別 ID")
    unitOfMeasure: str = Field(..., description="計量單位")
    supplierId: Optional[str] = None
    description: Optional[str] = None
    isActive: bool = True


class BulkProductCreateRequest(BaseModel):
    """批量產品創建請求"""
    products: List[BulkProductCreate] = Field(..., min_length=1, max_length=100, description="產品列表（最多100個）")


class BulkSKUCreate(BaseModel):
    """批量 SKU 創建項目"""
    productId: str = Field(..., description="產品 ID")
    skuCode: str = Field(..., description="SKU 代碼")
    name: str = Field(..., description="SKU 名稱")
    pricingMethod: Optional[str] = "UNIT"
    pricingUnit: str = "unit"
    unitPrice: Optional[float] = None
    stockQuantity: int = 0
    isActive: bool = True


class BulkSKUCreateRequest(BaseModel):
    """批量 SKU 創建請求"""
    skus: List[BulkSKUCreate] = Field(..., min_length=1, max_length=100, description="SKU 列表（最多100個）")


class BulkPriceUpdate(BaseModel):
    """批量價格更新項目"""
    skuId: str = Field(..., description="SKU ID")
    newPrice: float = Field(..., gt=0, description="新價格")
    priceType: str = "base"
    changeReason: Optional[str] = None


class BulkPriceUpdateRequest(BaseModel):
    """批量價格更新請求"""
    updates: List[BulkPriceUpdate] = Field(..., min_length=1, max_length=500, description="價格更新列表（最多500個）")


class BulkResult(BaseModel):
    """批量操作結果"""
    id: str
    success: bool
    message: str
    data: Optional[dict] = None


# ============= Helper Functions =============

def _get_tenant_id_from_request(request: Request) -> Optional[str]:
    return request.headers.get("X-Tenant-Id") or request.headers.get("X-Org-Id")


def _get_user_id_from_request(request: Request) -> Optional[str]:
    return request.headers.get("X-User-ID")


# ============= API Endpoints =============

@router.post("/products/bulk", status_code=status.HTTP_201_CREATED)
async def bulk_create_products(
    request: Request,
    data: BulkProductCreateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    批量創建產品

    一次最多創建 100 個產品。
    返回每個產品的創建結果，包含成功/失敗狀態。
    """
    tenant_id = _get_tenant_id_from_request(request)
    user_id = _get_user_id_from_request(request)

    results: List[BulkResult] = []
    created_count = 0
    failed_count = 0

    # 預先獲取所有類別 ID 進行驗證
    category_ids = list(set(p.categoryId for p in data.products))
    category_result = await db.execute(
        select(ProductCategory.id).where(ProductCategory.id.in_(category_ids))
    )
    valid_category_ids = set(row[0] for row in category_result.fetchall())

    # 預先獲取現有的產品代碼
    existing_codes = set(p.code for p in data.products)
    code_result = await db.execute(
        select(Product.code).where(Product.code.in_(existing_codes))
    )
    existing_code_set = set(row[0] for row in code_result.fetchall())

    for item in data.products:
        try:
            # 檢查代碼唯一性
            if item.code in existing_code_set:
                results.append(BulkResult(
                    id=item.code,
                    success=False,
                    message=f"產品代碼 '{item.code}' 已存在"
                ))
                failed_count += 1
                continue

            # 檢查類別存在
            if item.categoryId not in valid_category_ids:
                results.append(BulkResult(
                    id=item.code,
                    success=False,
                    message=f"類別 ID '{item.categoryId}' 不存在"
                ))
                failed_count += 1
                continue

            # 創建產品
            product = Product(
                id=str(uuid4()),
                tenant_id=tenant_id,
                code=item.code,
                name=item.name,
                name_en=item.nameEn,
                category_id=item.categoryId,
                supplier_id=item.supplierId,
                unit_of_measure=item.unitOfMeasure,
                description=item.description,
                is_active=item.isActive,
                status='active' if item.isActive else 'inactive'
            )

            db.add(product)
            existing_code_set.add(item.code)  # 防止同批次重複

            results.append(BulkResult(
                id=item.code,
                success=True,
                message="創建成功",
                data={"productId": product.id}
            ))
            created_count += 1

        except Exception as e:
            results.append(BulkResult(
                id=item.code,
                success=False,
                message=str(e)
            ))
            failed_count += 1

    await db.commit()

    logger.info(
        "bulk_products_created",
        total=len(data.products),
        created=created_count,
        failed=failed_count,
        tenant_id=tenant_id
    )

    return {
        "success": True,
        "summary": {
            "total": len(data.products),
            "created": created_count,
            "failed": failed_count
        },
        "results": [r.model_dump() for r in results]
    }


@router.post("/skus/bulk", status_code=status.HTTP_201_CREATED)
async def bulk_create_skus(
    request: Request,
    data: BulkSKUCreateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    批量創建 SKU

    一次最多創建 100 個 SKU。
    """
    tenant_id = _get_tenant_id_from_request(request)
    user_id = _get_user_id_from_request(request)

    results: List[BulkResult] = []
    created_count = 0
    failed_count = 0

    # 預先獲取所有產品 ID 進行驗證
    product_ids = list(set(s.productId for s in data.skus))
    product_result = await db.execute(
        select(Product.id).where(Product.id.in_(product_ids))
    )
    valid_product_ids = set(row[0] for row in product_result.fetchall())

    # 預先獲取現有的 SKU 代碼
    existing_codes = set(s.skuCode for s in data.skus)
    sku_result = await db.execute(
        select(ProductSKU.sku_code).where(ProductSKU.sku_code.in_(existing_codes))
    )
    existing_code_set = set(row[0] for row in sku_result.fetchall())

    for item in data.skus:
        try:
            # 檢查 SKU 代碼唯一性
            if item.skuCode in existing_code_set:
                results.append(BulkResult(
                    id=item.skuCode,
                    success=False,
                    message=f"SKU 代碼 '{item.skuCode}' 已存在"
                ))
                failed_count += 1
                continue

            # 檢查產品存在
            if item.productId not in valid_product_ids:
                results.append(BulkResult(
                    id=item.skuCode,
                    success=False,
                    message=f"產品 ID '{item.productId}' 不存在"
                ))
                failed_count += 1
                continue

            # 解析計價方式
            pricing_method = None
            if item.pricingMethod:
                try:
                    pricing_method = SKUPricingMethod(item.pricingMethod)
                except ValueError:
                    pass

            # 創建 SKU
            sku = ProductSKU(
                id=str(uuid4()),
                tenant_id=tenant_id,
                product_id=item.productId,
                sku_code=item.skuCode,
                name=item.name,
                pricing_method=pricing_method,
                pricing_unit=item.pricingUnit,
                unit_price=item.unitPrice,
                stock_quantity=item.stockQuantity,
                is_active=item.isActive
            )

            db.add(sku)
            existing_code_set.add(item.skuCode)

            results.append(BulkResult(
                id=item.skuCode,
                success=True,
                message="創建成功",
                data={"skuId": sku.id}
            ))
            created_count += 1

        except Exception as e:
            results.append(BulkResult(
                id=item.skuCode,
                success=False,
                message=str(e)
            ))
            failed_count += 1

    await db.commit()

    logger.info(
        "bulk_skus_created",
        total=len(data.skus),
        created=created_count,
        failed=failed_count,
        tenant_id=tenant_id
    )

    return {
        "success": True,
        "summary": {
            "total": len(data.skus),
            "created": created_count,
            "failed": failed_count
        },
        "results": [r.model_dump() for r in results]
    }


@router.put("/skus/bulk-price-update")
async def bulk_update_prices(
    request: Request,
    data: BulkPriceUpdateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    批量更新 SKU 價格

    一次最多更新 500 個 SKU 的價格。
    自動記錄價格歷史。
    """
    user_id = _get_user_id_from_request(request)

    results: List[BulkResult] = []
    updated_count = 0
    failed_count = 0

    # 預先獲取所有 SKU
    sku_ids = list(set(u.skuId for u in data.updates))
    sku_result = await db.execute(
        select(ProductSKU).where(ProductSKU.id.in_(sku_ids))
    )
    sku_map = {sku.id: sku for sku in sku_result.scalars().all()}

    for item in data.updates:
        try:
            sku = sku_map.get(item.skuId)
            if not sku:
                results.append(BulkResult(
                    id=item.skuId,
                    success=False,
                    message=f"SKU ID '{item.skuId}' 不存在"
                ))
                failed_count += 1
                continue

            old_price = sku.unit_price or 0
            new_price = item.newPrice

            # 計算變動百分比
            change_percent = 0
            if old_price > 0:
                change_percent = ((new_price - old_price) / old_price) * 100

            # 創建價格歷史記錄
            price_type_enum = PriceType.BASE
            if item.priceType:
                try:
                    price_type_enum = PriceType(item.priceType)
                except ValueError:
                    pass

            price_history = PriceHistory(
                id=str(uuid4()),
                sku_id=item.skuId,
                old_price=old_price,
                new_price=new_price,
                change_percent=round(change_percent, 2),
                price_type=price_type_enum,
                change_reason=item.changeReason or "批量價格更新",
                changed_by=user_id
            )
            db.add(price_history)

            # 更新 SKU 價格
            sku.unit_price = new_price

            results.append(BulkResult(
                id=item.skuId,
                success=True,
                message="更新成功",
                data={
                    "oldPrice": old_price,
                    "newPrice": new_price,
                    "changePercent": round(change_percent, 2)
                }
            ))
            updated_count += 1

        except Exception as e:
            results.append(BulkResult(
                id=item.skuId,
                success=False,
                message=str(e)
            ))
            failed_count += 1

    await db.commit()

    logger.info(
        "bulk_prices_updated",
        total=len(data.updates),
        updated=updated_count,
        failed=failed_count
    )

    return {
        "success": True,
        "summary": {
            "total": len(data.updates),
            "updated": updated_count,
            "failed": failed_count
        },
        "results": [r.model_dump() for r in results]
    }


@router.put("/products/bulk-status")
async def bulk_update_product_status(
    request: Request,
    product_ids: List[str] = [],
    is_active: bool = True,
    db: AsyncSession = Depends(get_async_session)
):
    """批量更新產品狀態（啟用/停用）"""
    if not product_ids:
        raise HTTPException(status_code=400, detail="product_ids 不可為空")

    result = await db.execute(
        select(Product).where(Product.id.in_(product_ids))
    )
    products = result.scalars().all()

    found_ids = set(p.id for p in products)
    not_found = [pid for pid in product_ids if pid not in found_ids]

    for product in products:
        product.is_active = is_active
        product.status = 'active' if is_active else 'inactive'

    await db.commit()

    return {
        "success": True,
        "message": f"已{'啟用' if is_active else '停用'} {len(products)} 個產品",
        "updatedCount": len(products),
        "notFoundIds": not_found
    }


@router.put("/skus/bulk-status")
async def bulk_update_sku_status(
    request: Request,
    sku_ids: List[str] = [],
    is_active: bool = True,
    db: AsyncSession = Depends(get_async_session)
):
    """批量更新 SKU 狀態（啟用/停用）"""
    if not sku_ids:
        raise HTTPException(status_code=400, detail="sku_ids 不可為空")

    result = await db.execute(
        select(ProductSKU).where(ProductSKU.id.in_(sku_ids))
    )
    skus = result.scalars().all()

    found_ids = set(s.id for s in skus)
    not_found = [sid for sid in sku_ids if sid not in found_ids]

    for sku in skus:
        sku.is_active = is_active

    await db.commit()

    return {
        "success": True,
        "message": f"已{'啟用' if is_active else '停用'} {len(skus)} 個 SKU",
        "updatedCount": len(skus),
        "notFoundIds": not_found
    }
