"""
Simple SKU API endpoints for live data
Matches frontend expectations and existing database schema
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, and_, or_, func, text

from app.core.database import get_async_session
from app.models.sku_simple import ProductSKU
from app.models.product import Product

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
        
        # Transform to frontend format
        sku_data = []
        for sku in skus:
            sku_item = {
                "id": sku.id,
                "code": sku.sku_code,
                "name": sku.name,
                "nameEn": sku.name,  # Using same name for English
                "isActive": sku.is_active,
                "isPublic": True,  # Default to public
                "stockQuantity": sku.stock_quantity,
                "minStock": sku.min_stock,
                "maxStock": sku.max_stock,
                "weight": sku.weight,
                "packageType": sku.package_type,
                "variant": sku.variant or {},
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
        
        # Get low stock count (where stock_quantity <= min_stock)
        low_stock_query = select(func.count()).select_from(ProductSKU).where(
            and_(
                ProductSKU.is_active == True,
                ProductSKU.stock_quantity <= ProductSKU.min_stock
            )
        )
        low_stock_result = await db.execute(low_stock_query)
        low_stock_count = low_stock_result.scalar()
        
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
                "stockQuantity": sku.stock_quantity,
                "minStock": sku.min_stock,
                "maxStock": sku.max_stock,
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