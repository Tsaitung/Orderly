"""Explicit BFF endpoints for product and SKU data."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.products import (
    ProductDetailResponse,
    ProductSearchResponse,
    ProductStatsResponse,
    _get_product_stats,
    _search_products,
    get_product_by_id as v1_get_product_by_id,
)
from app.api.v1.skus_simple import (
    get_sku_by_id as v1_get_sku_by_id,
    get_sku_stats as v1_get_sku_stats,
    search_skus as v1_search_skus,
)
from app.core.database import get_async_session

router = APIRouter(tags=["BFF Products"], include_in_schema=False)


@router.get("/stats", response_model=ProductStatsResponse)
async def get_product_stats(  # pragma: no cover - exercised via integration tests
    supplierId: Optional[str] = Query(None, alias="supplierId"),
    db: AsyncSession = Depends(get_async_session),
):
    """Return aggregated product statistics for dashboards."""
    return await _get_product_stats(db=db, supplier_id=supplierId)


@router.get("", response_model=ProductSearchResponse)
async def search_products(  # pragma: no cover - exercised via integration tests
    page: int = Query(1, ge=1, description="頁碼"),
    limit: int = Query(20, ge=1, le=100, description="每頁數量"),
    search: Optional[str] = Query(None, description="搜尋關鍵字"),
    categoryId: Optional[str] = Query(None, alias="categoryId", description="類別ID"),
    brand: Optional[str] = Query(None, description="品牌"),
    origin: Optional[str] = Query(None, description="產地"),
    productState: Optional[str] = Query(None, alias="productState", description="產品狀態"),
    taxStatus: Optional[str] = Query(None, alias="taxStatus", description="稅務狀態"),
    isActive: Optional[bool] = Query(None, alias="isActive", description="是否啟用"),
    isPublic: Optional[bool] = Query(None, alias="isPublic", description="是否公開"),
    supplierId: Optional[str] = Query(None, alias="supplierId", description="供應商ID"),
    sortBy: str = Query("createdAt", alias="sortBy", description="排序欄位"),
    sortOrder: str = Query("desc", alias="sortOrder", regex="^(asc|desc)$", description="排序方向"),
    db: AsyncSession = Depends(get_async_session),
):
    return await _search_products(
        page=page,
        limit=limit,
        search=search,
        categoryId=categoryId,
        brand=brand,
        origin=origin,
        productState=productState,
        taxStatus=taxStatus,
        isActive=isActive,
        isPublic=isPublic,
        supplierId=supplierId,
        sortBy=sortBy,
        sortOrder=sortOrder,
        db=db,
    )


@router.get("/skus/search")
async def search_skus(  # pragma: no cover - exercised via integration tests
    search: Optional[str] = Query(None, description="搜尋SKU代碼、產品名稱"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, alias="page_size", ge=1, le=100, description="每頁數量"),
    is_active: Optional[bool] = Query(None, alias="is_active", description="是否啟用"),
    db: AsyncSession = Depends(get_async_session),
):
    return await v1_search_skus(
        search=search,
        page=page,
        page_size=page_size,
        is_active=is_active,
        db=db,
    )


@router.get("/skus/stats")
async def get_sku_stats(  # pragma: no cover - exercised via integration tests
    db: AsyncSession = Depends(get_async_session),
):
    return await v1_get_sku_stats(db=db)


@router.get("/skus/{sku_id}")
async def get_sku_detail(  # pragma: no cover - exercised via integration tests
    sku_id: str,
    db: AsyncSession = Depends(get_async_session),
):
    return await v1_get_sku_by_id(sku_id=sku_id, db=db)


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product_detail(  # pragma: no cover - exercised via integration tests
    product_id: str,
    db: AsyncSession = Depends(get_async_session),
):
    response = await v1_get_product_by_id(product_id=product_id, db=db)
    if not response.success:
        raise HTTPException(status_code=404, detail="Product not found")
    return response


__all__ = ["router"]
