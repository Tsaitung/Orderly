"""
Product CRUD operations
"""
from typing import Dict, List, Optional, Any, Union
from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select
from fastapi import HTTPException
import structlog

from app.models.product import Product, ProductState, TaxStatus
from app.models.category import ProductCategory
from app.schemas.product import ProductCreate, ProductUpdate, ProductStats, ProductSearchParams, ProductCreateRequest, ProductUpdateRequest
from app.crud.base import CRUDBase

logger = structlog.get_logger()


class CRUDProduct(CRUDBase[Product, ProductCreate, ProductUpdate]):
    
    async def get_stats(
        self,
        db: AsyncSession,
        supplier_id: Optional[str] = None
    ) -> ProductStats:
        """
        獲取產品統計資料
        Compatible with Node.js getProductStats endpoint
        """
        try:
            # Base where condition
            where_conditions = [Product.is_active == True]
            if supplier_id:
                where_conditions.append(Product.supplier_id == supplier_id)
            
            base_where = and_(*where_conditions)
            
            # Total products count
            total_products_query = select(func.count(Product.id)).where(base_where)
            total_products_result = await db.execute(total_products_query)
            total_products = total_products_result.scalar() or 0
            
            # Active products count (public)
            active_products_query = select(func.count(Product.id)).where(
                and_(base_where, Product.is_public == True)
            )
            active_products_result = await db.execute(active_products_query)
            active_products = active_products_result.scalar() or 0
            
            # Products with allergen tracking
            allergen_tracking_query = select(func.count(Product.id)).where(
                and_(base_where, Product.allergen_tracking_enabled == True)
            )
            allergen_tracking_result = await db.execute(allergen_tracking_query)
            products_with_allergen_tracking = allergen_tracking_result.scalar() or 0
            
            # Get unique categories count
            unique_categories_query = select(func.count(func.distinct(Product.category_id))).where(base_where)
            unique_categories_result = await db.execute(unique_categories_query)
            categories_count = unique_categories_result.scalar() or 0
            
            # Category breakdown
            category_breakdown_query = select(
                Product.category_id,
                func.count(Product.id).label('count')
            ).where(base_where).group_by(Product.category_id)
            category_breakdown_result = await db.execute(category_breakdown_query)
            category_breakdown = {
                str(row.category_id): row.count 
                for row in category_breakdown_result.fetchall()
            }
            
            # State breakdown
            state_breakdown_query = select(
                Product.product_state,
                func.count(Product.id).label('count')
            ).where(base_where).group_by(Product.product_state)
            state_breakdown_result = await db.execute(state_breakdown_query)
            state_breakdown = {
                row.product_state.value if row.product_state else "未設定": row.count 
                for row in state_breakdown_result.fetchall()
            }
            
            # Tax status breakdown
            tax_breakdown_query = select(
                Product.tax_status,
                func.count(Product.id).label('count')
            ).where(base_where).group_by(Product.tax_status)
            tax_breakdown_result = await db.execute(tax_breakdown_query)
            tax_status_breakdown = {
                row.tax_status.value if row.tax_status else "未設定": row.count 
                for row in tax_breakdown_result.fetchall()
            }
            
            # Since we don't have SKU table yet, use dummy values
            products_with_skus = total_products  # Temporary
            products_with_nutrition = 0  # Temporary
            avg_price = 0  # Temporary - will be calculated from SKU when available
            
            return ProductStats(
                totalProducts=total_products,
                activeProducts=active_products,
                categoriesCount=categories_count,
                avgPrice=avg_price,
                productsWithSKUs=products_with_skus,
                productsWithAllergenTracking=products_with_allergen_tracking,
                productsWithNutrition=products_with_nutrition,
                categoryBreakdown=category_breakdown,
                stateBreakdown=state_breakdown,
                taxStatusBreakdown=tax_status_breakdown
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch product stats: {str(e)}")
    
    async def search_products(
        self,
        db: AsyncSession,
        params: ProductSearchParams
    ) -> Dict[str, Any]:
        """
        搜尋產品
        Compatible with Node.js searchProducts endpoint
        """
        try:
            # Build where conditions
            where_conditions = []
            
            # Basic filters
            if params.isActive is not None:
                where_conditions.append(Product.is_active == params.isActive)
            
            if params.isPublic is not None:
                where_conditions.append(Product.is_public == params.isPublic)
            
            if params.supplierId:
                where_conditions.append(Product.supplier_id == params.supplierId)
            
            if params.categoryId:
                where_conditions.append(Product.category_id == params.categoryId)
            
            # Text search
            if params.search:
                search_term = f"%{params.search}%"
                search_conditions = [
                    Product.name.ilike(search_term),
                    Product.name_en.ilike(search_term),
                    Product.code.ilike(search_term),
                    Product.brand.ilike(search_term),
                    Product.description.ilike(search_term)
                ]
                where_conditions.append(or_(*search_conditions))
            
            # Brand filter
            if params.brand:
                if isinstance(params.brand, list):
                    where_conditions.append(Product.brand.in_(params.brand))
                else:
                    where_conditions.append(Product.brand == params.brand)
            
            # Origin filter
            if params.origin:
                if isinstance(params.origin, list):
                    where_conditions.append(Product.origin.in_(params.origin))
                else:
                    where_conditions.append(Product.origin == params.origin)
            
            # Product state filter
            if params.productState:
                if isinstance(params.productState, list):
                    where_conditions.append(Product.product_state.in_(params.productState))
                else:
                    where_conditions.append(Product.product_state == params.productState)
            
            # Tax status filter
            if params.taxStatus:
                if isinstance(params.taxStatus, list):
                    where_conditions.append(Product.tax_status.in_(params.taxStatus))
                else:
                    where_conditions.append(Product.tax_status == params.taxStatus)
            
            # Build the base query
            base_query = select(Product).where(and_(*where_conditions))
            
            # Count total items
            count_query = select(func.count()).select_from(base_query.subquery())
            total_items_result = await db.execute(count_query)
            total_items = total_items_result.scalar() or 0
            
            # Apply sorting
            if params.sortBy:
                sort_column = getattr(Product, params.sortBy, Product.created_at)
                if params.sortOrder == "asc":
                    base_query = base_query.order_by(sort_column.asc())
                else:
                    base_query = base_query.order_by(sort_column.desc())
            
            # Apply pagination
            offset = (params.page - 1) * params.limit
            base_query = base_query.offset(offset).limit(params.limit)
            
            # Execute query with category relationship
            base_query = base_query.options(selectinload(Product.category))
            products_result = await db.execute(base_query)
            products = products_result.scalars().all()
            
            # Calculate pagination info
            total_pages = (total_items + params.limit - 1) // params.limit
            
            # Format products for response
            products_data = []
            for product in products:
                product_data = {
                    "id": str(product.id),
                    "code": product.code,
                    "name": product.name,
                    "nameEn": product.name_en,
                    "description": product.description,
                    "brand": product.brand,
                    "origin": product.origin,
                    "productState": product.product_state.value if product.product_state else None,
                    "taxStatus": product.tax_status.value if product.tax_status else None,
                    "categoryId": str(product.category_id) if product.category_id else None,
                    "baseUnit": product.base_unit,
                    "pricingUnit": product.pricing_unit,
                    "allergenTrackingEnabled": product.allergen_tracking_enabled,
                    "isActive": product.is_active,
                    "isPublic": product.is_public,
                    "specifications": product.specifications,
                    "certifications": product.certifications,
                    "safetyInfo": product.safety_info,
                    "version": product.version,
                    "createdAt": product.created_at.isoformat() if product.created_at else None,
                    "updatedAt": product.updated_at.isoformat() if product.updated_at else None,
                    "supplierId": str(product.supplier_id) if product.supplier_id else None,
                    "createdBy": str(product.created_by) if product.created_by else None,
                    "updatedBy": str(product.updated_by) if product.updated_by else None,
                }
                products_data.append(product_data)
            
            return {
                "products": products_data,
                "pagination": {
                    "currentPage": params.page,
                    "totalPages": total_pages,
                    "totalItems": total_items,
                    "itemsPerPage": params.limit
                }
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to search products: {str(e)}")
    
    async def get_by_id(
        self,
        db: AsyncSession,
        product_id: str
    ) -> Optional[Product]:
        """
        Get product by ID with category relationship
        """
        try:
            query = select(Product).where(Product.id == product_id).options(
                selectinload(Product.category)
            )
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch product: {str(e)}")


    async def create_product(
        self,
        db: AsyncSession,
        data: ProductCreateRequest,
        created_by: Optional[str] = None,
        tenant_id: Optional[str] = None
    ) -> Product:
        """
        創建新產品

        Args:
            db: 資料庫會話
            data: 產品創建請求資料
            created_by: 創建者 ID

        Returns:
            Product: 創建的產品實例
        """
        try:
            # 檢查產品代碼是否已存在
            existing = await db.execute(
                select(Product).where(Product.code == data.code)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=400,
                    detail=f"產品代碼 '{data.code}' 已存在"
                )

            # 驗證類別是否存在
            category_check = await db.execute(
                select(ProductCategory).where(ProductCategory.id == data.categoryId)
            )
            if not category_check.scalar_one_or_none():
                raise HTTPException(
                    status_code=400,
                    detail=f"類別 ID '{data.categoryId}' 不存在"
                )

            # 創建產品實例
            product = Product(
                id=str(uuid4()),
                tenant_id=tenant_id,  # 多租戶隔離
                code=data.code,
                name=data.name,
                name_en=data.nameEn,
                description=data.description,
                category_id=data.categoryId,
                supplier_id=data.supplierId,
                unit_of_measure=data.unitOfMeasure,
                origin_country=data.originCountry,
                origin_region=data.originRegion,
                min_stock=data.minStock,
                max_stock=data.maxStock,
                lead_time_days=data.leadTimeDays,
                is_active=data.isActive,
                allergens=data.allergens or [],
                nutritional_info=data.nutritionalInfo or {},
                certifications=data.certifications or [],
                tags=data.tags or [],
                images=data.images or [],
                status='active' if data.isActive else 'inactive',
            )

            db.add(product)
            await db.commit()
            await db.refresh(product)

            logger.info(
                "product_created",
                product_id=product.id,
                code=product.code,
                name=product.name,
                created_by=created_by
            )

            return product

        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error("product_create_failed", error=str(e))
            raise HTTPException(
                status_code=500,
                detail=f"創建產品失敗: {str(e)}"
            )

    async def update_product(
        self,
        db: AsyncSession,
        product_id: str,
        data: ProductUpdateRequest,
        updated_by: Optional[str] = None
    ) -> Product:
        """
        更新產品

        Args:
            db: 資料庫會話
            product_id: 產品 ID
            data: 更新資料
            updated_by: 更新者 ID

        Returns:
            Product: 更新後的產品實例
        """
        try:
            # 獲取現有產品
            result = await db.execute(
                select(Product).where(Product.id == product_id)
            )
            product = result.scalar_one_or_none()

            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"產品 ID '{product_id}' 不存在"
                )

            # 如果更新類別，驗證新類別是否存在
            if data.categoryId:
                category_check = await db.execute(
                    select(ProductCategory).where(ProductCategory.id == data.categoryId)
                )
                if not category_check.scalar_one_or_none():
                    raise HTTPException(
                        status_code=400,
                        detail=f"類別 ID '{data.categoryId}' 不存在"
                    )

            # 更新欄位（僅更新有值的欄位）
            update_data = data.model_dump(exclude_unset=True)

            # 欄位名稱映射（camelCase -> snake_case）
            field_mapping = {
                'nameEn': 'name_en',
                'categoryId': 'category_id',
                'supplierId': 'supplier_id',
                'unitOfMeasure': 'unit_of_measure',
                'originCountry': 'origin_country',
                'originRegion': 'origin_region',
                'minStock': 'min_stock',
                'maxStock': 'max_stock',
                'leadTimeDays': 'lead_time_days',
                'isActive': 'is_active',
                'nutritionalInfo': 'nutritional_info',
            }

            for key, value in update_data.items():
                if value is not None:
                    # 轉換欄位名稱
                    db_field = field_mapping.get(key, key)
                    setattr(product, db_field, value)

            # 更新狀態欄位
            if data.isActive is not None:
                product.status = 'active' if data.isActive else 'inactive'

            await db.commit()
            await db.refresh(product)

            logger.info(
                "product_updated",
                product_id=product.id,
                updated_fields=list(update_data.keys()),
                updated_by=updated_by
            )

            return product

        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error("product_update_failed", product_id=product_id, error=str(e))
            raise HTTPException(
                status_code=500,
                detail=f"更新產品失敗: {str(e)}"
            )

    async def delete_product(
        self,
        db: AsyncSession,
        product_id: str,
        soft_delete: bool = True
    ) -> str:
        """
        刪除產品

        Args:
            db: 資料庫會話
            product_id: 產品 ID
            soft_delete: 是否軟刪除（預設為軟刪除，設為 is_active=False）

        Returns:
            str: 刪除的產品 ID
        """
        try:
            # 獲取現有產品
            result = await db.execute(
                select(Product).where(Product.id == product_id)
            )
            product = result.scalar_one_or_none()

            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"產品 ID '{product_id}' 不存在"
                )

            if soft_delete:
                # 軟刪除：設為非活躍
                product.is_active = False
                product.status = 'deleted'
                await db.commit()
                logger.info("product_soft_deleted", product_id=product_id)
            else:
                # 硬刪除
                await db.delete(product)
                await db.commit()
                logger.info("product_hard_deleted", product_id=product_id)

            return product_id

        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error("product_delete_failed", product_id=product_id, error=str(e))
            raise HTTPException(
                status_code=500,
                detail=f"刪除產品失敗: {str(e)}"
            )

    async def activate_product(
        self,
        db: AsyncSession,
        product_id: str
    ) -> Product:
        """啟用產品"""
        try:
            result = await db.execute(
                select(Product).where(Product.id == product_id)
            )
            product = result.scalar_one_or_none()

            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"產品 ID '{product_id}' 不存在"
                )

            product.is_active = True
            product.status = 'active'
            await db.commit()
            await db.refresh(product)

            logger.info("product_activated", product_id=product_id)
            return product

        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"啟用產品失敗: {str(e)}"
            )

    async def deactivate_product(
        self,
        db: AsyncSession,
        product_id: str
    ) -> Product:
        """停用產品"""
        try:
            result = await db.execute(
                select(Product).where(Product.id == product_id)
            )
            product = result.scalar_one_or_none()

            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"產品 ID '{product_id}' 不存在"
                )

            product.is_active = False
            product.status = 'inactive'
            await db.commit()
            await db.refresh(product)

            logger.info("product_deactivated", product_id=product_id)
            return product

        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"停用產品失敗: {str(e)}"
            )


# Create instance
product_crud = CRUDProduct(Product)
