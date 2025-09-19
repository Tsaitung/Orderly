"""
ProductCategory Pydantic schemas for API serialization
Maintains compatibility with existing frontend API calls
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
import uuid


class ProductCategoryBase(BaseModel):
    """Base schema with common fields"""
    code: str = Field(..., description="4字元分類碼", max_length=4)
    name: str = Field(..., description="中文名稱")
    nameEn: str = Field(..., description="英文名稱", alias="name_en")  # 支援前端 camelCase
    parent_id: Optional[str] = Field(None, description="上層類別ID")
    level: int = Field(1, description="層級")
    sort_order: int = Field(0, description="排序")
    description: Optional[str] = Field(None, description="描述")
    is_active: bool = Field(True, description="是否啟用")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="額外資訊")


class ProductCategoryCreate(ProductCategoryBase):
    """Creating new category schema"""
    pass


class ProductCategoryUpdate(BaseModel):
    """Updating category schema - all fields optional"""
    name: Optional[str] = None
    nameEn: Optional[str] = Field(None, alias="name_en")
    parent_id: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class ProductCategoryInDB(ProductCategoryBase):
    """Database representation"""
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True  # Enable ORM mode
        populate_by_name = True  # Support both alias and field name


class ProductCategoryResponse(ProductCategoryInDB):
    """
    API response schema - compatible with existing frontend
    Matches the structure expected by CategoryManagement.tsx
    """
    children: Optional[List["ProductCategoryResponse"]] = Field(default_factory=list)
    products: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="關聯產品")
    count: Optional[Dict[str, int]] = Field(default_factory=dict, description="統計資訊")
    product_count: Optional[Dict[str, int]] = Field(default_factory=dict, description="統計資訊 (前端相容性)", alias="_count")
    
    # 支援前端既有欄位
    parentId: Optional[str] = Field(None, alias="parent_id")
    isActive: bool = Field(True, alias="is_active")
    sortOrder: int = Field(0, alias="sort_order")
    
    class Config:
        from_attributes = True
        populate_by_name = True


class ProductCategoryTree(ProductCategoryResponse):
    """Tree structure for hierarchical display"""
    children: List["ProductCategoryTree"] = Field(default_factory=list)


class CategoryListResponse(BaseModel):
    """List API response matching existing frontend expectations"""
    success: bool = Field(True, description="操作成功")
    data: List[ProductCategoryResponse] = Field(..., description="類別數據")
    meta: Optional[Dict[str, Any]] = Field(default_factory=dict, description="元數據")
    
    class Config:
        from_attributes = True


class CategoryTreeResponse(BaseModel):
    """Tree API response"""
    success: bool = Field(True)
    data: List[ProductCategoryTree] = Field(..., description="樹狀結構數據")
    meta: Optional[Dict[str, Any]] = Field(default_factory=dict)


class CategoryDetailResponse(BaseModel):
    """Single category detail response"""
    success: bool = Field(True)
    data: ProductCategoryResponse = Field(..., description="類別詳細資訊")


class CategoryStatsResponse(BaseModel):
    """Category statistics response"""
    success: bool = Field(True)
    data: Dict[str, Any] = Field(..., description="統計數據")


# Update forward references
ProductCategoryResponse.model_rebuild()
ProductCategoryTree.model_rebuild()
