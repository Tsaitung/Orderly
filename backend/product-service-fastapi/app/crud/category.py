"""
ProductCategory CRUD operations
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.category import ProductCategory
from app.schemas.category import ProductCategoryCreate, ProductCategoryUpdate


class CRUDProductCategory(CRUDBase[ProductCategory, ProductCategoryCreate, ProductCategoryUpdate]):
    
    async def get_by_code(self, db: AsyncSession, *, code: str) -> Optional[ProductCategory]:
        """Get category by unique code"""
        result = await db.execute(
            select(ProductCategory).where(ProductCategory.code == code)
        )
        return result.scalar_one_or_none()
    
    async def get_with_children(
        self,
        db: AsyncSession,
        *,
        category_id: UUID,
        include_products: bool = False
    ) -> Optional[ProductCategory]:
        """Get category with its children loaded"""
        query = select(ProductCategory).where(ProductCategory.id == category_id)
        
        # Eagerly load children
        query = query.options(selectinload(ProductCategory.children))
        
        # Optionally load products
        if include_products:
            query = query.options(selectinload(ProductCategory.products))
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_tree_structure(
        self,
        db: AsyncSession,
        *,
        include_products: bool = False
    ) -> List[ProductCategory]:
        """
        Get hierarchical tree structure
        Returns root categories with children loaded
        """
        query = select(ProductCategory).where(ProductCategory.parentId.is_(None))
        
        # Order by sortOrder and name
        query = query.order_by(ProductCategory.sortOrder, ProductCategory.name)
        
        # Eagerly load children and their children
        query = query.options(selectinload(ProductCategory.children))
        
        if include_products:
            query = query.options(selectinload(ProductCategory.products))
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_all_with_stats(
        self,
        db: AsyncSession,
        *,
        include_products: bool = False,
        search: Optional[str] = None
    ) -> List[ProductCategory]:
        """
        Get all categories with statistics
        Compatible with existing frontend API calls
        """
        query = select(ProductCategory)
        
        # Apply search filter
        if search:
            search_filter = f"%{search.lower()}%"
            query = query.where(
                or_(
                    func.lower(ProductCategory.name).contains(search_filter),
                    func.lower(ProductCategory.nameEn).contains(search_filter),
                    func.lower(ProductCategory.code).contains(search_filter)
                )
            )
        
        # Order by level, sortOrder, and name
        query = query.order_by(
            ProductCategory.level,
            ProductCategory.sortOrder,
            ProductCategory.name
        )
        
        # Always eagerly load products to avoid lazy loading issues
        query = query.options(selectinload(ProductCategory.products))
        
        result = await db.execute(query)
        categories = result.scalars().all()
        
        # Convert to list to avoid lazy loading issues
        return list(categories)
    
    async def get_children(
        self,
        db: AsyncSession,
        *,
        parent_id: UUID
    ) -> List[ProductCategory]:
        """Get direct children of a category"""
        result = await db.execute(
            select(ProductCategory)
            .where(ProductCategory.parent_id == parent_id)
            .order_by(ProductCategory.sort_order, ProductCategory.name)
        )
        return result.scalars().all()
    
    async def get_root_categories(self, db: AsyncSession) -> List[ProductCategory]:
        """Get all root categories (level 1)"""
        result = await db.execute(
            select(ProductCategory)
            .where(ProductCategory.parent_id.is_(None))
            .order_by(ProductCategory.sort_order, ProductCategory.name)
        )
        return result.scalars().all()
    
    async def check_code_exists(
        self,
        db: AsyncSession,
        *,
        code: str,
        exclude_id: Optional[UUID] = None
    ) -> bool:
        """Check if category code already exists"""
        query = select(func.count(ProductCategory.id)).where(ProductCategory.code == code)
        
        if exclude_id:
            query = query.where(ProductCategory.id != exclude_id)
        
        result = await db.execute(query)
        count = result.scalar()
        return count > 0
    
    async def update_sort_orders(
        self,
        db: AsyncSession,
        *,
        category_orders: List[Dict[str, Any]]
    ) -> bool:
        """
        Batch update sort orders for categories
        category_orders: [{"id": "uuid", "sort_order": 1}, ...]
        """
        try:
            for order_data in category_orders:
                category_id = order_data.get("id")
                sort_order = order_data.get("sort_order", 0)
                
                if category_id:
                    category = await self.get(db, id=category_id)
                    if category:
                        category.sort_order = sort_order
                        db.add(category)
            
            await db.commit()
            return True
        except Exception:
            await db.rollback()
            return False
    
    async def delete_with_validation(
        self,
        db: AsyncSession,
        *,
        category_id: UUID
    ) -> Dict[str, Any]:
        """
        Delete category with business rule validation
        Returns: {"success": bool, "message": str, "details": dict}
        """
        category = await self.get(db, id=category_id)
        if not category:
            return {
                "success": False,
                "message": "Category not found",
                "details": {}
            }
        
        # Check for child categories
        children = await self.get_children(db, parent_id=category_id)
        if children:
            return {
                "success": False,
                "message": "Cannot delete category with subcategories",
                "details": {"children_count": len(children)}
            }
        
        # Check for associated products
        # Note: This assumes we have a Product model relationship
        if hasattr(category, 'products') and category.products:
            return {
                "success": False,
                "message": "Cannot delete category with associated products",
                "details": {"products_count": len(category.products)}
            }
        
        # Proceed with deletion
        try:
            await db.delete(category)
            await db.commit()
            return {
                "success": True,
                "message": "Category deleted successfully",
                "details": {"deleted_id": str(category_id)}
            }
        except Exception as e:
            await db.rollback()
            return {
                "success": False,
                "message": "Failed to delete category",
                "details": {"error": str(e)}
            }


# Create instance
category_crud = CRUDProductCategory(ProductCategory)