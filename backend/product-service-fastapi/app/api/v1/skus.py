"""
SKU management API routes
Provides comprehensive SKU variant management with allergen tracking,
nutrition information, and multi-supplier support
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, and_, or_, func

from app.core.database import get_async_session
from app.models import ProductSKU, ProductAllergen, ProductNutrition, SupplierSKU, Product
from app.schemas.sku import (
    SKUCreate, SKUUpdate, SKUResponse, SKUListResponse, SKUDetailResponse,
    AllergenCreate, AllergenUpdate, AllergenResponse, AllergenListResponse,
    NutritionCreate, NutritionUpdate, NutritionResponse, NutritionDetailResponse,
    SupplierSKUCreate, SupplierSKUUpdate, SupplierSKUResponse, SupplierSKUListResponse,
    SKUBatchCreate, SKUBatchResponse, SKUSearchParams
)
from app.core.exceptions import NotFoundError, ValidationError

router = APIRouter()


# =============================================================================
# SKU CRUD Operations
# =============================================================================

@router.get("/products/{product_id}/skus", response_model=SKUListResponse)
async def get_product_skus(
    product_id: str = Path(..., description="產品ID"),
    search_params: SKUSearchParams = Depends(),
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取產品的所有SKU變體
    支援多維度篩選和分頁
    """
    try:
        # Build query
        query = select(ProductSKU).where(ProductSKU.product_id == product_id)
        
        # Apply filters
        if search_params.packaging_type:
            query = query.where(ProductSKU.packaging_type == search_params.packaging_type)
        if search_params.quality_grade:
            query = query.where(ProductSKU.quality_grade == search_params.quality_grade)
        if search_params.processing_method:
            query = query.where(ProductSKU.processing_method == search_params.processing_method)
        if search_params.is_active is not None:
            query = query.where(ProductSKU.is_active == search_params.is_active)
        if search_params.min_price:
            query = query.where(ProductSKU.base_price >= search_params.min_price)
        if search_params.max_price:
            query = query.where(ProductSKU.base_price <= search_params.max_price)
        if search_params.search:
            search_term = f"%{search_params.search}%"
            query = query.where(
                or_(
                    ProductSKU.sku_code.ilike(search_term),
                    ProductSKU.notes.ilike(search_term)
                )
            )
        
        # Count total records
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply sorting and pagination
        if search_params.sort_order == "desc":
            query = query.order_by(getattr(ProductSKU, search_params.sort_by).desc())
        else:
            query = query.order_by(getattr(ProductSKU, search_params.sort_by).asc())
        
        offset = (search_params.page - 1) * search_params.page_size
        query = query.offset(offset).limit(search_params.page_size)
        
        # Execute query with eager loading
        query = query.options(selectinload(ProductSKU.product))
        result = await db.execute(query)
        skus = result.scalars().all()
        
        # Convert to response models
        sku_responses = []
        for sku in skus:
            sku_response = SKUResponse.from_orm(sku)
            sku_response.full_name = sku.full_name
            sku_responses.append(sku_response)
        
        total_pages = (total + search_params.page_size - 1) // search_params.page_size
        
        return SKUListResponse(
            data=sku_responses,
            total=total,
            page=search_params.page,
            page_size=search_params.page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch SKUs: {str(e)}"
        )


@router.post("/products/{product_id}/skus", response_model=SKUDetailResponse)
async def create_sku(
    product_id: str = Path(..., description="產品ID"),
    sku_data: SKUCreate = ...,
    db: AsyncSession = Depends(get_async_session)
):
    """
    為產品創建新的SKU變體
    自動生成SKU編碼：{產品代碼}-{包裝代碼}-{品質代碼}-{處理代碼}
    """
    try:
        # Verify product exists
        product_query = select(Product).where(Product.id == product_id)
        product_result = await db.execute(product_query)
        product = product_result.scalar_first()
        if not product:
            raise NotFoundError(f"Product with ID {product_id} not found")
        
        # Generate SKU code
        sku_code = sku_data.generate_sku_code(product.code)
        
        # Check for duplicate SKU code
        existing_query = select(ProductSKU).where(ProductSKU.sku_code == sku_code)
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_first():
            raise ValidationError(f"SKU code {sku_code} already exists")
        
        # Create new SKU
        sku = ProductSKU(
            sku_code=sku_code,
            product_id=product_id,
            **sku_data.dict(exclude={"product_id"})
        )
        
        db.add(sku)
        await db.commit()
        await db.refresh(sku)
        
        # Load relationships
        await db.refresh(sku, ["product"])
        
        # Create response
        sku_response = SKUResponse.from_orm(sku)
        sku_response.full_name = sku.full_name
        # sku_response.is_low_stock = sku.is_low_stock  # 移除庫存相關功能
        
        return SKUDetailResponse(data=sku_response)
        
    except (NotFoundError, ValidationError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create SKU: {str(e)}"
        )


@router.get("/skus/{sku_id}", response_model=SKUDetailResponse)
async def get_sku(
    sku_id: str = Path(..., description="SKU ID"),
    db: AsyncSession = Depends(get_async_session)
):
    """獲取單個SKU詳細資訊"""
    try:
        query = select(ProductSKU).where(ProductSKU.id == sku_id)
        query = query.options(selectinload(ProductSKU.product))
        result = await db.execute(query)
        sku = result.scalar_first()
        
        if not sku:
            raise NotFoundError(f"SKU with ID {sku_id} not found")
        
        sku_response = SKUResponse.from_orm(sku)
        sku_response.full_name = sku.full_name
        # sku_response.is_low_stock = sku.is_low_stock  # 移除庫存相關功能
        
        return SKUDetailResponse(data=sku_response)
        
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch SKU: {str(e)}"
        )


@router.put("/skus/{sku_id}", response_model=SKUDetailResponse)
async def update_sku(
    sku_id: str = Path(..., description="SKU ID"),
    sku_data: SKUUpdate = ...,
    db: AsyncSession = Depends(get_async_session)
):
    """更新SKU資訊"""
    try:
        query = select(ProductSKU).where(ProductSKU.id == sku_id)
        result = await db.execute(query)
        sku = result.scalar_first()
        
        if not sku:
            raise NotFoundError(f"SKU with ID {sku_id} not found")
        
        # Update fields
        update_data = sku_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(sku, field, value)
        
        await db.commit()
        await db.refresh(sku, ["product"])
        
        sku_response = SKUResponse.from_orm(sku)
        sku_response.full_name = sku.full_name
        # sku_response.is_low_stock = sku.is_low_stock  # 移除庫存相關功能
        
        return SKUDetailResponse(data=sku_response)
        
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update SKU: {str(e)}"
        )


@router.delete("/skus/{sku_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sku(
    sku_id: str = Path(..., description="SKU ID"),
    db: AsyncSession = Depends(get_async_session)
):
    """刪除SKU（軟刪除 - 設置為不啟用）"""
    try:
        query = select(ProductSKU).where(ProductSKU.id == sku_id)
        result = await db.execute(query)
        sku = result.scalar_first()
        
        if not sku:
            raise NotFoundError(f"SKU with ID {sku_id} not found")
        
        # Soft delete
        sku.is_active = False
        await db.commit()
        
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete SKU: {str(e)}"
        )


# =============================================================================
# Allergen Management
# =============================================================================

@router.get("/skus/{sku_id}/allergens", response_model=AllergenListResponse)
async def get_sku_allergens(
    sku_id: str = Path(..., description="SKU ID"),
    db: AsyncSession = Depends(get_async_session)
):
    """獲取SKU的過敏原資訊"""
    try:
        query = select(ProductAllergen).where(
            and_(
                ProductAllergen.sku_id == sku_id,
                ProductAllergen.is_active == True
            )
        ).order_by(ProductAllergen.allergen_type)
        
        result = await db.execute(query)
        allergens = result.scalars().all()
        
        allergen_responses = [AllergenResponse.from_orm(allergen) for allergen in allergens]
        
        return AllergenListResponse(data=allergen_responses)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch allergens: {str(e)}"
        )


@router.post("/skus/{sku_id}/allergens", response_model=AllergenListResponse)
async def create_sku_allergen(
    sku_id: str = Path(..., description="SKU ID"),
    allergen_data: AllergenCreate = ...,
    db: AsyncSession = Depends(get_async_session)
):
    """為SKU添加過敏原資訊"""
    try:
        # Check if allergen already exists for this SKU
        existing_query = select(ProductAllergen).where(
            and_(
                ProductAllergen.sku_id == sku_id,
                ProductAllergen.allergen_type == allergen_data.allergen_type,
                ProductAllergen.is_active == True
            )
        )
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_first():
            raise ValidationError(f"Allergen {allergen_data.allergen_type} already exists for this SKU")
        
        # Create new allergen
        allergen = ProductAllergen(
            sku_id=sku_id,
            **allergen_data.dict(exclude={"sku_id"})
        )
        
        db.add(allergen)
        await db.commit()
        
        # Return updated allergen list
        return await get_sku_allergens(sku_id, db)
        
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create allergen: {str(e)}"
        )


# =============================================================================
# Nutrition Management
# =============================================================================

@router.get("/products/{product_id}/nutrition", response_model=NutritionDetailResponse)
async def get_product_nutrition(
    product_id: str = Path(..., description="產品ID"),
    db: AsyncSession = Depends(get_async_session)
):
    """獲取產品的營養資訊"""
    try:
        query = select(ProductNutrition).where(ProductNutrition.product_id == product_id)
        result = await db.execute(query)
        nutrition = result.scalar_first()
        
        if nutrition:
            nutrition_response = NutritionResponse.from_orm(nutrition)
            return NutritionDetailResponse(data=nutrition_response)
        else:
            return NutritionDetailResponse(data=None)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch nutrition: {str(e)}"
        )


@router.put("/products/{product_id}/nutrition", response_model=NutritionDetailResponse)
async def update_product_nutrition(
    product_id: str = Path(..., description="產品ID"),
    nutrition_data: NutritionUpdate = ...,
    db: AsyncSession = Depends(get_async_session)
):
    """更新產品的營養資訊"""
    try:
        # Check if nutrition record exists
        query = select(ProductNutrition).where(ProductNutrition.product_id == product_id)
        result = await db.execute(query)
        nutrition = result.scalar_first()
        
        if nutrition:
            # Update existing record
            update_data = nutrition_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(nutrition, field, value)
        else:
            # Create new record
            nutrition = ProductNutrition(
                product_id=product_id,
                **nutrition_data.dict(exclude_unset=True)
            )
            db.add(nutrition)
        
        await db.commit()
        await db.refresh(nutrition)
        
        nutrition_response = NutritionResponse.from_orm(nutrition)
        return NutritionDetailResponse(data=nutrition_response)
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update nutrition: {str(e)}"
        )


# =============================================================================
# Supplier SKU Management
# =============================================================================

@router.get("/skus/{sku_id}/suppliers", response_model=SupplierSKUListResponse)
async def get_sku_suppliers(
    sku_id: str = Path(..., description="SKU ID"),
    db: AsyncSession = Depends(get_async_session)
):
    """獲取SKU的所有供應商資訊"""
    try:
        query = select(SupplierSKU).where(
            and_(
                SupplierSKU.sku_id == sku_id,
                SupplierSKU.is_active == True
            )
        ).order_by(SupplierSKU.is_preferred.desc(), SupplierSKU.supplier_price.asc())
        
        result = await db.execute(query)
        supplier_skus = result.scalars().all()
        
        supplier_responses = []
        for supplier_sku in supplier_skus:
            response = SupplierSKUResponse.from_orm(supplier_sku)
            response.overall_score = supplier_sku.overall_score
            response.effective_price = supplier_sku.effective_price
            supplier_responses.append(response)
        
        return SupplierSKUListResponse(data=supplier_responses)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch supplier SKUs: {str(e)}"
        )


@router.post("/skus/{sku_id}/suppliers", response_model=SupplierSKUListResponse)
async def create_supplier_sku(
    sku_id: str = Path(..., description="SKU ID"),
    supplier_data: SupplierSKUCreate = ...,
    db: AsyncSession = Depends(get_async_session)
):
    """為SKU添加供應商資訊"""
    try:
        # Check if supplier already exists for this SKU
        existing_query = select(SupplierSKU).where(
            and_(
                SupplierSKU.sku_id == sku_id,
                SupplierSKU.supplier_id == supplier_data.supplier_id,
                SupplierSKU.is_active == True
            )
        )
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_first():
            raise ValidationError(f"Supplier {supplier_data.supplier_id} already exists for this SKU")
        
        # Create new supplier SKU
        supplier_sku = SupplierSKU(
            sku_id=sku_id,
            **supplier_data.dict(exclude={"sku_id"})
        )
        
        db.add(supplier_sku)
        await db.commit()
        
        # Return updated supplier list
        return await get_sku_suppliers(sku_id, db)
        
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create supplier SKU: {str(e)}"
        )


# =============================================================================
# Batch Operations
# =============================================================================

@router.post("/products/{product_id}/skus/batch", response_model=SKUBatchResponse)
async def batch_create_skus(
    product_id: str = Path(..., description="產品ID"),
    batch_data: SKUBatchCreate = ...,
    db: AsyncSession = Depends(get_async_session)
):
    """批量創建SKU（最多1000個）"""
    try:
        # Verify product exists
        product_query = select(Product).where(Product.id == product_id)
        product_result = await db.execute(product_query)
        product = product_result.scalar_first()
        if not product:
            raise NotFoundError(f"Product with ID {product_id} not found")
        
        created_skus = []
        errors = []
        
        for i, sku_data in enumerate(batch_data.skus):
            try:
                # Generate SKU code
                sku_code = sku_data.generate_sku_code(product.code)
                
                # Check for duplicate
                existing_query = select(ProductSKU).where(ProductSKU.sku_code == sku_code)
                existing_result = await db.execute(existing_query)
                if existing_result.scalar_first():
                    errors.append({
                        "index": i,
                        "error": f"SKU code {sku_code} already exists"
                    })
                    continue
                
                # Create SKU
                sku = ProductSKU(
                    sku_code=sku_code,
                    product_id=product_id,
                    **sku_data.dict(exclude={"product_id"})
                )
                
                db.add(sku)
                created_skus.append(sku)
                
            except Exception as e:
                errors.append({
                    "index": i,
                    "error": str(e)
                })
        
        if created_skus:
            await db.commit()
            
            # Refresh and prepare responses
            sku_responses = []
            for sku in created_skus:
                await db.refresh(sku, ["product"])
                sku_response = SKUResponse.from_orm(sku)
                sku_response.full_name = sku.full_name
                sku_responses.append(sku_response)
        else:
            sku_responses = []
        
        return SKUBatchResponse(
            created_count=len(created_skus),
            failed_count=len(errors),
            errors=errors,
            data=sku_responses
        )
        
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to batch create SKUs: {str(e)}"
        )


# =============================================================================
# Multi-Supplier Comparison
# =============================================================================

@router.get("/skus/{sku_id}/suppliers/compare", response_model=SupplierSKUListResponse)
async def compare_sku_suppliers(
    sku_id: str = Path(..., description="SKU ID"),
    sort_by: str = Query("supplier_price", description="排序欄位: supplier_price, overall_score, lead_time_days"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="排序順序"),
    min_quantity: Optional[int] = Query(None, description="最小訂購量篩選"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    多供應商比較功能
    提供詳細的價格、品質、交期比較
    """
    try:
        # Base query for active suppliers
        query = select(SupplierSKU).where(
            and_(
                SupplierSKU.sku_id == sku_id,
                SupplierSKU.is_active == True
            )
        )
        
        # Apply minimum quantity filter
        if min_quantity:
            query = query.where(SupplierSKU.minimum_order_quantity <= min_quantity)
        
        # Apply sorting
        sort_field = getattr(SupplierSKU, sort_by, SupplierSKU.supplier_price)
        if sort_order == "desc":
            query = query.order_by(sort_field.desc())
        else:
            query = query.order_by(sort_field.asc())
        
        # Secondary sort by preferred suppliers
        query = query.order_by(SupplierSKU.is_preferred.desc())
        
        result = await db.execute(query)
        supplier_skus = result.scalars().all()
        
        # Enhanced response with comparison metrics
        supplier_responses = []
        for supplier_sku in supplier_skus:
            response = SupplierSKUResponse.from_orm(supplier_sku)
            response.overall_score = supplier_sku.overall_score
            response.effective_price = supplier_sku.effective_price
            
            # Add comparison badges for frontend
            response.comparison_badges = []
            if supplier_sku.is_preferred:
                response.comparison_badges.append("優先供應商")
            if supplier_sku.lead_time_days <= 1:
                response.comparison_badges.append("當日出貨")
            elif supplier_sku.lead_time_days <= 3:
                response.comparison_badges.append("快速出貨")
            if supplier_sku.overall_score >= 4.0:
                response.comparison_badges.append("高品質")
            if supplier_sku.certifications and len(supplier_sku.certifications) > 0:
                response.comparison_badges.append("有認證")
            
            supplier_responses.append(response)
        
        return SupplierSKUListResponse(data=supplier_responses)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compare supplier SKUs: {str(e)}"
        )


@router.get("/skus/{sku_id}/suppliers/pricing-analysis")
async def get_pricing_analysis(
    sku_id: str = Path(..., description="SKU ID"),
    quantity: int = Query(100, description="分析數量"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    供應商定價分析
    根據指定數量計算最優價格和批量折扣
    """
    try:
        # Get all active suppliers for this SKU
        query = select(SupplierSKU).where(
            and_(
                SupplierSKU.sku_id == sku_id,
                SupplierSKU.is_active == True,
                SupplierSKU.minimum_order_quantity <= quantity
            )
        )
        
        result = await db.execute(query)
        supplier_skus = result.scalars().all()
        
        pricing_analysis = []
        
        for supplier_sku in supplier_skus:
            # Calculate effective price based on quantity and pricing tiers
            effective_price = supplier_sku.supplier_price
            applied_tier = None
            
            # Check pricing tiers
            if supplier_sku.pricing_tiers:
                for tier in sorted(supplier_sku.pricing_tiers, key=lambda x: x.get('min_qty', 0), reverse=True):
                    if quantity >= tier.get('min_qty', 0):
                        effective_price = tier.get('price', supplier_sku.supplier_price)
                        applied_tier = tier
                        break
            
            # Check bulk discount
            elif (supplier_sku.bulk_discount_threshold and 
                  supplier_sku.bulk_discount_rate and 
                  quantity >= supplier_sku.bulk_discount_threshold):
                discount = supplier_sku.supplier_price * supplier_sku.bulk_discount_rate
                effective_price = supplier_sku.supplier_price - discount
                applied_tier = {
                    "type": "bulk_discount",
                    "min_qty": supplier_sku.bulk_discount_threshold,
                    "discount_rate": float(supplier_sku.bulk_discount_rate),
                    "price": effective_price
                }
            
            total_cost = effective_price * quantity
            
            analysis_item = {
                "supplier_id": supplier_sku.supplier_id,
                "supplier_sku_code": supplier_sku.supplier_sku_code,
                "base_price": float(supplier_sku.supplier_price),
                "effective_price": float(effective_price),
                "total_cost": float(total_cost),
                "quantity": quantity,
                "applied_tier": applied_tier,
                "lead_time_days": supplier_sku.lead_time_days,
                "minimum_order_quantity": supplier_sku.minimum_order_quantity,
                "overall_score": supplier_sku.overall_score,
                "is_preferred": supplier_sku.is_preferred,
                "availability_status": supplier_sku.availability_status,
                "savings": float(supplier_sku.supplier_price - effective_price) * quantity if effective_price < supplier_sku.supplier_price else 0
            }
            
            pricing_analysis.append(analysis_item)
        
        # Sort by total cost (lowest first)
        pricing_analysis.sort(key=lambda x: x["total_cost"])
        
        # Add ranking
        for i, item in enumerate(pricing_analysis):
            item["cost_rank"] = i + 1
        
        # Calculate summary statistics
        if pricing_analysis:
            costs = [item["total_cost"] for item in pricing_analysis]
            prices = [item["effective_price"] for item in pricing_analysis]
            
            summary = {
                "total_suppliers": len(pricing_analysis),
                "best_price": min(prices),
                "average_price": sum(prices) / len(prices),
                "price_range": max(prices) - min(prices),
                "best_total_cost": min(costs),
                "max_savings": max([item["savings"] for item in pricing_analysis]),
                "quantity_analyzed": quantity
            }
        else:
            summary = {
                "total_suppliers": 0,
                "message": "No suppliers available for the requested quantity"
            }
        
        return {
            "success": True,
            "data": {
                "summary": summary,
                "suppliers": pricing_analysis
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze pricing: {str(e)}"
        )


# =============================================================================
# Search and Analytics
# =============================================================================

@router.get("/skus/search", response_model=SKUListResponse)
async def search_skus(
    search_params: SKUSearchParams = Depends(),
    db: AsyncSession = Depends(get_async_session)
):
    """全局SKU搜索"""
    try:
        # Build base query
        query = select(ProductSKU)
        
        # Apply filters (reuse logic from get_product_skus)
        if search_params.packaging_type:
            query = query.where(ProductSKU.packaging_type == search_params.packaging_type)
        if search_params.quality_grade:
            query = query.where(ProductSKU.quality_grade == search_params.quality_grade)
        if search_params.processing_method:
            query = query.where(ProductSKU.processing_method == search_params.processing_method)
        if search_params.is_active is not None:
            query = query.where(ProductSKU.is_active == search_params.is_active)
        if search_params.min_price:
            query = query.where(ProductSKU.base_price >= search_params.min_price)
        if search_params.max_price:
            query = query.where(ProductSKU.base_price <= search_params.max_price)
        if search_params.search:
            search_term = f"%{search_params.search}%"
            query = query.where(
                or_(
                    ProductSKU.sku_code.ilike(search_term),
                    ProductSKU.notes.ilike(search_term)
                )
            )
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply sorting and pagination
        if search_params.sort_order == "desc":
            query = query.order_by(getattr(ProductSKU, search_params.sort_by).desc())
        else:
            query = query.order_by(getattr(ProductSKU, search_params.sort_by).asc())
        
        offset = (search_params.page - 1) * search_params.page_size
        query = query.offset(offset).limit(search_params.page_size)
        query = query.options(selectinload(ProductSKU.product))
        
        result = await db.execute(query)
        skus = result.scalars().all()
        
        # Convert to response
        sku_responses = []
        for sku in skus:
            sku_response = SKUResponse.from_orm(sku)
            sku_response.full_name = sku.full_name
            sku_responses.append(sku_response)
        
        total_pages = (total + search_params.page_size - 1) // search_params.page_size
        
        return SKUListResponse(
            data=sku_responses,
            total=total,
            page=search_params.page,
            page_size=search_params.page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search SKUs: {str(e)}"
        )