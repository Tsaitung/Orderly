"""
Product Categories API routes
Maintains complete compatibility with existing Node.js API
Matches the endpoints expected by CategoryManagement.tsx
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.crud.category import category_crud
from app.schemas.category import (
    ProductCategoryCreate,
    ProductCategoryUpdate,
    ProductCategoryResponse,
    CategoryListResponse,
    CategoryTreeResponse,
    CategoryDetailResponse,
    CategoryStatsResponse
)

router = APIRouter()


@router.get("/categories", response_model=CategoryListResponse)
async def get_categories(
    include_products: bool = Query(False, alias="includeProducts"),
    search: Optional[str] = Query(None),
    level: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None, alias="isActive"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取所有產品類別
    Compatible with: GET /api/products/categories?includeProducts=true
    """
    try:
        # Build filters
        filters = {}
        if level is not None:
            filters["level"] = level
        if is_active is not None:
            filters["is_active"] = is_active
        
        # Get categories with optional search
        categories = await category_crud.get_all_with_stats(
            db,
            include_products=include_products,
            search=search
        )
        
        # Transform to response format
        category_responses = []
        for category in categories:
            # Calculate actual product count safely
            product_count = 0
            products_data = []
            
            if hasattr(category, 'products') and category.products is not None:
                product_count = len(category.products)
                if include_products:
                    products_data = [
                        {
                            "id": str(product.id),
                            "name": product.name,
                            "code": product.code
                        }
                        for product in category.products
                    ]
            
            response_data = ProductCategoryResponse(
                id=category.id,
                code=category.code,
                name=category.name,
                nameEn=category.nameEn,
                parent_id=category.parentId,
                level=category.level,
                sort_order=category.sortOrder,
                description=category.description,
                is_active=category.isActive,
                metadata=category.meta_data,
                created_at=category.createdAt,
                updated_at=category.updatedAt,
                count={"products": product_count},
                _count={"products": product_count}
            )
            
            if include_products and products_data:
                response_data.products = products_data
            
            category_responses.append(response_data)
        
        # Calculate stats
        total_categories = len(category_responses)
        active_categories = len([c for c in category_responses if c.is_active])
        level1_count = len([c for c in category_responses if c.level == 1])
        level2_count = len([c for c in category_responses if c.level == 2])
        
        return CategoryListResponse(
            success=True,
            data=category_responses,
            meta={
                "total": total_categories,
                "activeCount": active_categories,
                "level1Count": level1_count,
                "level2Count": level2_count
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch categories: {str(e)}"
        )


@router.get("/categories/tree", response_model=CategoryTreeResponse)
async def get_category_tree(
    include_products: bool = Query(False, alias="includeProducts"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取類別樹狀結構
    Compatible with: GET /api/products/categories/tree
    """
    try:
        root_categories = await category_crud.get_tree_structure(
            db,
            include_products=include_products
        )
        
        # Transform to tree response format
        def build_tree(category):
            product_count = len(category.products) if category.products else 0
            
            tree_node = {
                "id": category.id,
                "code": category.code,
                "name": category.name,
                "nameEn": category.nameEn,
                "parent_id": category.parentId,
                "level": category.level,
                "sort_order": category.sortOrder,
                "description": category.description,
                "is_active": category.isActive,
                "metadata": category.meta_data,
                "created_at": category.createdAt,
                "updated_at": category.updatedAt,
                "_count": {"products": product_count},
                "children": []
            }
            
            if include_products and category.products:
                tree_node["products"] = [
                    {
                        "id": str(product.id),
                        "name": product.name,
                        "code": product.code
                    }
                    for product in category.products
                ]
            
            # Recursively build children
            if hasattr(category, 'children') and category.children:
                tree_node["children"] = [build_tree(child) for child in category.children]
            
            return tree_node
        
        tree_data = [build_tree(root) for root in root_categories]
        
        return CategoryTreeResponse(
            success=True,
            data=tree_data,
            meta={
                "rootCount": len(tree_data),
                "maxLevel": max([cat.level for cat in root_categories], default=0)
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch category tree: {str(e)}"
        )


@router.get("/categories/{category_id}", response_model=CategoryDetailResponse)
async def get_category_by_id(
    category_id: UUID,
    include_products: bool = Query(False, alias="includeProducts"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取單一類別詳細資訊
    Compatible with: GET /api/products/categories/:id
    """
    try:
        category = await category_crud.get_with_children(
            db,
            category_id=category_id,
            include_products=include_products
        )
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Transform to response format
        product_count = len(category.products) if category.products else 0
        
        response_data = ProductCategoryResponse(
            id=category.id,
            code=category.code,
            name=category.name,
            nameEn=category.nameEn,
            parent_id=category.parentId,
            level=category.level,
            sort_order=category.sortOrder,
            description=category.description,
            is_active=category.isActive,
            metadata=category.meta_data,
            created_at=category.createdAt,
            updated_at=category.updatedAt,
            count={"products": product_count}
        )
        
        if include_products and category.products:
            response_data.products = [
                {
                    "id": str(product.id),
                    "name": product.name,
                    "code": product.code
                }
                for product in category.products
            ]
        
        if category.children:
            response_data.children = [
                ProductCategoryResponse(
                    id=child.id,
                    code=child.code,
                    name=child.name,
                    nameEn=child.name_en,
                    parent_id=child.parent_id,
                    level=child.level,
                    sort_order=child.sort_order,
                    description=child.description,
                    is_active=child.is_active,
                    metadata=child.metadata,
                    created_at=child.created_at,
                    updated_at=child.updated_at
                )
                for child in category.children
            ]
        
        return CategoryDetailResponse(
            success=True,
            data=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch category: {str(e)}"
        )


@router.post("/categories", response_model=CategoryDetailResponse)
async def create_category(
    category_data: ProductCategoryCreate,
    db: AsyncSession = Depends(get_async_session)
):
    """
    創建新類別
    Compatible with: POST /api/products/categories
    """
    try:
        # Check if code already exists
        existing = await category_crud.get_by_code(db, code=category_data.code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category code already exists"
            )
        
        # Validate parent category if specified
        if category_data.parent_id:
            parent = await category_crud.get(db, id=category_data.parent_id)
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Parent category not found"
                )
            # Set level based on parent
            category_data.level = parent.level + 1
        else:
            category_data.level = 1
        
        # Create category
        category = await category_crud.create(db, obj_in=category_data)
        
        response_data = ProductCategoryResponse(
            id=category.id,
            code=category.code,
            name=category.name,
            nameEn=category.nameEn,
            parent_id=category.parentId,
            level=category.level,
            sort_order=category.sortOrder,
            description=category.description,
            is_active=category.isActive,
            metadata=category.meta_data,
            created_at=category.createdAt,
            updated_at=category.updatedAt,
            count={"products": 0}
        )
        
        return CategoryDetailResponse(
            success=True,
            data=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create category: {str(e)}"
        )


@router.put("/categories/{category_id}", response_model=CategoryDetailResponse)
async def update_category(
    category_id: UUID,
    category_data: ProductCategoryUpdate,
    db: AsyncSession = Depends(get_async_session)
):
    """
    更新類別
    Compatible with: PUT /api/products/categories/:id
    """
    try:
        category = await category_crud.get(db, id=category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Validate parent change
        if category_data.parent_id is not None:
            if category_data.parent_id == category_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Category cannot be its own parent"
                )
            
            if category_data.parent_id:
                parent = await category_crud.get(db, id=category_data.parent_id)
                if not parent:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Parent category not found"
                    )
                # Update level based on new parent
                category_data.level = parent.level + 1
            else:
                category_data.level = 1
        
        # Update category
        updated_category = await category_crud.update(
            db,
            db_obj=category,
            obj_in=category_data
        )
        
        response_data = ProductCategoryResponse(
            id=updated_category.id,
            code=updated_category.code,
            name=updated_category.name,
            nameEn=updated_category.nameEn,
            parent_id=updated_category.parentId,
            level=updated_category.level,
            sort_order=updated_category.sortOrder,
            description=updated_category.description,
            is_active=updated_category.isActive,
            metadata=updated_category.meta_data,
            created_at=updated_category.createdAt,
            updated_at=updated_category.updatedAt,
            count={"products": 0}
        )
        
        return CategoryDetailResponse(
            success=True,
            data=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update category: {str(e)}"
        )


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_async_session)
):
    """
    刪除類別
    Compatible with: DELETE /api/products/categories/:id
    """
    try:
        result = await category_crud.delete_with_validation(
            db,
            category_id=category_id
        )
        
        if not result["success"]:
            if "not found" in result["message"]:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=result["message"]
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=result["message"]
                )
        
        return {
            "success": True,
            "message": "Category deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete category: {str(e)}"
        )


@router.post("/categories/reorder")
async def reorder_categories(
    category_orders: List[Dict[str, Any]],
    db: AsyncSession = Depends(get_async_session)
):
    """
    重新排序類別
    Compatible with: POST /api/products/categories/reorder
    """
    try:
        success = await category_crud.update_sort_orders(
            db,
            category_orders=category_orders
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update category order"
            )
        
        return {
            "success": True,
            "message": "Categories reordered successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reorder categories: {str(e)}"
        )