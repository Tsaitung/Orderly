"""
Product API routes
Maintains complete compatibility with existing Node.js API
Matches the endpoints expected by ProductManagement.tsx and ProductService.ts
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.crud.product import product_crud
from app.schemas.product import (
    ProductSearchParams,
    ProductSearchResponse, 
    ProductStatsResponse,
    ProductDetailResponse,
    ProductResponse
)

router = APIRouter()


async def _get_product_stats(
    db: AsyncSession,
    supplier_id: Optional[str] = None,
) -> ProductStatsResponse:
    try:
        stats = await product_crud.get_stats(db, supplier_id=supplier_id)
        return ProductStatsResponse(success=True, data=stats)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch product stats: {str(exc)}"
        ) from exc


@router.get("/stats", response_model=ProductStatsResponse)
async def get_product_stats(
    supplierId: Optional[str] = Query(None, alias="supplierId"),
    db: AsyncSession = Depends(get_async_session)
):
    """現行端點：GET /api/products/stats"""
    return await _get_product_stats(db, supplier_id=supplierId)


@router.get("/products/stats", response_model=ProductStatsResponse, include_in_schema=False)
async def get_product_stats_legacy(
    supplierId: Optional[str] = Query(None, alias="supplierId"),
    db: AsyncSession = Depends(get_async_session)
):
    """相容舊版端點：GET /api/products/products/stats"""
    return await _get_product_stats(db, supplier_id=supplierId)


async def _search_products(
    page: Optional[int] = Query(1, ge=1, description="頁碼"),
    limit: Optional[int] = Query(20, ge=1, le=100, description="每頁數量"),
    search: Optional[str] = Query(None, description="搜尋關鍵字"),
    categoryId: Optional[str] = Query(None, description="類別ID"),
    brand: Optional[str] = Query(None, description="品牌"),
    origin: Optional[str] = Query(None, description="產地"),
    productState: Optional[str] = Query(None, description="產品狀態"),
    taxStatus: Optional[str] = Query(None, description="稅務狀態"),
    isActive: Optional[bool] = Query(None, description="是否啟用"),
    isPublic: Optional[bool] = Query(None, description="是否公開"),
    supplierId: Optional[str] = Query(None, description="供應商ID"),
    sortBy: Optional[str] = Query("createdAt", description="排序欄位"),
    sortOrder: Optional[str] = Query("desc", pattern="^(asc|desc)$", description="排序方向"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    搜尋產品
    Compatible with: GET /api/products/products
    Node.js equivalent: getProducts in productController.ts
    """
    try:
        search_params = ProductSearchParams(
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
            sortOrder=sortOrder
        )

        results = await product_crud.search_products(db, search_params)
        return ProductSearchResponse(success=True, data=results)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search products: {str(exc)}"
        ) from exc


@router.get("/products", response_model=ProductSearchResponse, include_in_schema=False)
async def search_products_legacy(
    page: Optional[int] = Query(1, ge=1, description="頁碼"),
    limit: Optional[int] = Query(20, ge=1, le=100, description="每頁數量"),
    search: Optional[str] = Query(None, description="搜尋關鍵字"),
    categoryId: Optional[str] = Query(None, description="類別ID"),
    brand: Optional[str] = Query(None, description="品牌"),
    origin: Optional[str] = Query(None, description="產地"),
    productState: Optional[str] = Query(None, description="產品狀態"),
    taxStatus: Optional[str] = Query(None, description="稅務狀態"),
    isActive: Optional[bool] = Query(None, description="是否啟用"),
    isPublic: Optional[bool] = Query(None, description="是否公開"),
    supplierId: Optional[str] = Query(None, description="供應商ID"),
    sortBy: Optional[str] = Query("createdAt", description="排序欄位"),
    sortOrder: Optional[str] = Query("desc", pattern="^(asc|desc)$", description="排序方向"),
    db: AsyncSession = Depends(get_async_session)
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


@router.get("", response_model=ProductSearchResponse)
async def search_products(
    page: Optional[int] = Query(1, ge=1, description="頁碼"),
    limit: Optional[int] = Query(20, ge=1, le=100, description="每頁數量"),
    search: Optional[str] = Query(None, description="搜尋關鍵字"),
    categoryId: Optional[str] = Query(None, description="類別ID"),
    brand: Optional[str] = Query(None, description="品牌"),
    origin: Optional[str] = Query(None, description="產地"),
    productState: Optional[str] = Query(None, description="產品狀態"),
    taxStatus: Optional[str] = Query(None, description="稅務狀態"),
    isActive: Optional[bool] = Query(None, description="是否啟用"),
    isPublic: Optional[bool] = Query(None, description="是否公開"),
    supplierId: Optional[str] = Query(None, description="供應商ID"),
    sortBy: Optional[str] = Query("createdAt", description="排序欄位"),
    sortOrder: Optional[str] = Query("desc", pattern="^(asc|desc)$", description="排序方向"),
    db: AsyncSession = Depends(get_async_session)
):
    """現行端點：GET /api/products"""
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


@router.get("/products/{product_id}", response_model=ProductDetailResponse, include_in_schema=False)
async def get_product_by_id_legacy(
    product_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取單一產品詳細資訊
    Compatible with: GET /api/products/products/:id
    Node.js equivalent: getProductById in productController.ts
    """
    try:
        product = await product_crud.get_by_id(db, product_id=product_id)
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # Transform to response format
        product_data = ProductResponse(
            id=str(product.id),
            code=product.code,
            name=product.name,
            nameEn=product.name_en,
            description=product.description,
            brand=product.brand,
            origin=product.origin,
            productState=product.product_state,
            taxStatus=product.tax_status,
            categoryId=str(product.category_id),
            baseUnit=product.base_unit,
            pricingUnit=product.pricing_unit,
            allergenTrackingEnabled=product.allergen_tracking_enabled,
            isActive=product.is_active,
            isPublic=product.is_public,
            specifications=product.specifications,
            certifications=product.certifications,
            safetyInfo=product.safety_info,
            version=product.version,
            createdAt=product.created_at,
            updatedAt=product.updated_at,
            supplierId=str(product.supplier_id) if product.supplier_id else None,
            createdBy=str(product.created_by) if product.created_by else None,
            updatedBy=str(product.updated_by) if product.updated_by else None
        )
        
        return ProductDetailResponse(success=True, data=product_data)
        
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch product: {str(exc)}"
        ) from exc


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product_by_id(
    product_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """現行端點：GET /api/products/{product_id}"""
    return await get_product_by_id_legacy(product_id=product_id, db=db)


# Health check for product endpoints
@router.get("/products/health")
async def products_health():
    """Products health check endpoint"""
    return {
        "status": "healthy",
        "service": "products",
        "framework": "FastAPI",
        "endpoints": [
            "GET /products/stats",
            "GET /products",
            "GET /products/{id}"
        ]
    }
