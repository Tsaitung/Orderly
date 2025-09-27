"""
Product Pydantic schemas for API serialization
Maintains compatibility with existing frontend API calls
"""
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.product import ProductState, TaxStatus


class ProductStats(BaseModel):
    """Product statistics response schema"""
    totalProducts: int = Field(..., description="總產品數")
    activeProducts: int = Field(..., description="活躍產品數")
    categoriesCount: int = Field(..., description="類別數量")
    avgPrice: float = Field(..., description="平均價格")
    productsWithSKUs: Optional[int] = Field(None, description="有SKU的產品數")
    productsWithAllergenTracking: Optional[int] = Field(None, description="有過敏原追蹤的產品數")
    productsWithNutrition: Optional[int] = Field(None, description="有營養資訊的產品數")
    categoryBreakdown: Optional[Dict[str, int]] = Field(default_factory=dict, description="類別分布")
    stateBreakdown: Optional[Dict[str, int]] = Field(default_factory=dict, description="狀態分布")
    taxStatusBreakdown: Optional[Dict[str, int]] = Field(default_factory=dict, description="稅務狀態分布")


class ProductBase(BaseModel):
    """Base product schema"""
    code: str = Field(..., description="產品代碼")
    name: str = Field(..., description="產品名稱")
    nameEn: Optional[str] = Field(None, description="英文名稱", alias="name_en")
    description: Optional[str] = Field(None, description="描述")
    brand: Optional[str] = Field(None, description="品牌")
    origin: Optional[str] = Field(None, description="產地")
    productState: ProductState = Field(default=ProductState.raw, description="產品狀態", alias="product_state")
    taxStatus: TaxStatus = Field(default=TaxStatus.taxable, description="稅務狀態", alias="tax_status")
    baseUnit: str = Field(..., description="基本單位", alias="base_unit")
    pricingUnit: str = Field(..., description="定價單位", alias="pricing_unit")
    allergenTrackingEnabled: bool = Field(default=False, description="是否啟用過敏原追蹤", alias="allergen_tracking_enabled")
    isActive: bool = Field(default=True, description="是否啟用", alias="is_active")
    isPublic: bool = Field(default=True, description="是否公開", alias="is_public")
    specifications: Dict[str, Any] = Field(default_factory=dict, description="規格")
    certifications: List[Dict[str, Any]] = Field(default_factory=list, description="認證")
    safetyInfo: Dict[str, Any] = Field(default_factory=dict, description="安全資訊", alias="safety_info")


class ProductCreate(ProductBase):
    """Creating new product schema"""
    categoryId: str = Field(..., description="類別ID", alias="category_id")
    supplierId: Optional[str] = Field(None, description="供應商ID", alias="supplier_id")


class ProductUpdate(BaseModel):
    """Updating product schema - all fields optional"""
    name: Optional[str] = None
    nameEn: Optional[str] = Field(None, alias="name_en")
    description: Optional[str] = None
    brand: Optional[str] = None
    origin: Optional[str] = None
    productState: Optional[ProductState] = Field(None, alias="product_state")
    taxStatus: Optional[TaxStatus] = Field(None, alias="tax_status")
    baseUnit: Optional[str] = Field(None, alias="base_unit")
    pricingUnit: Optional[str] = Field(None, alias="pricing_unit")
    categoryId: Optional[str] = Field(None, alias="category_id")
    allergenTrackingEnabled: Optional[bool] = Field(None, alias="allergen_tracking_enabled")
    isActive: Optional[bool] = Field(None, alias="is_active")
    isPublic: Optional[bool] = Field(None, alias="is_public")
    specifications: Optional[Dict[str, Any]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    safetyInfo: Optional[Dict[str, Any]] = Field(None, alias="safety_info")


class ProductInDB(ProductBase):
    """Database representation"""
    id: str
    categoryId: str = Field(..., alias="category_id")
    supplierId: Optional[str] = Field(None, alias="supplier_id")
    version: int
    createdAt: datetime = Field(..., alias="created_at")
    updatedAt: datetime = Field(..., alias="updated_at")
    createdBy: Optional[str] = Field(None, alias="created_by")
    updatedBy: Optional[str] = Field(None, alias="updated_by")
    
    class Config:
        from_attributes = True
        populate_by_name = True


class ProductResponse(BaseModel):
    """
    API response schema - compatible with existing frontend
    Matches the structure expected by ProductManagement.tsx
    """
    id: str
    code: str = Field(..., description="產品代碼")
    name: str = Field(..., description="產品名稱")
    nameEn: Optional[str] = Field(None, description="英文名稱", alias="name_en")
    description: Optional[str] = Field(None, description="描述")
    brand: Optional[str] = Field(None, description="品牌")
    origin: Optional[str] = Field(None, description="產地")
    productState: Optional[ProductState] = Field(None, description="產品狀態", alias="product_state")
    taxStatus: Optional[TaxStatus] = Field(None, description="稅務狀態", alias="tax_status")
    categoryId: str = Field(..., description="類別ID", alias="category_id")
    baseUnit: Optional[str] = Field(None, description="基本單位", alias="base_unit")
    pricingUnit: Optional[str] = Field(None, description="定價單位", alias="pricing_unit")
    allergenTrackingEnabled: bool = Field(default=False, description="是否啟用過敏原追蹤", alias="allergen_tracking_enabled")
    isActive: bool = Field(default=True, description="是否啟用", alias="is_active")
    isPublic: bool = Field(default=True, description="是否公開", alias="is_public")
    specifications: Optional[Dict[str, Any]] = Field(None, description="規格")
    certifications: Optional[List[Dict[str, Any]]] = Field(None, description="認證")
    safetyInfo: Optional[Dict[str, Any]] = Field(None, description="安全資訊", alias="safety_info")
    supplierId: Optional[str] = Field(None, description="供應商ID", alias="supplier_id")
    version: int
    createdAt: datetime = Field(..., alias="created_at")
    updatedAt: datetime = Field(..., alias="updated_at")
    createdBy: Optional[str] = Field(None, alias="created_by")
    updatedBy: Optional[str] = Field(None, alias="updated_by")
    
    class Config:
        from_attributes = True
        populate_by_name = True


class ProductSearchParams(BaseModel):
    """Search parameters for products"""
    page: Optional[int] = Field(1, ge=1, description="頁碼")
    limit: Optional[int] = Field(20, ge=1, le=100, description="每頁數量")
    search: Optional[str] = Field(None, description="搜尋關鍵字")
    categoryId: Optional[str] = Field(None, description="類別ID", alias="category_id")
    brand: Optional[Union[str, List[str]]] = Field(None, description="品牌")
    origin: Optional[Union[str, List[str]]] = Field(None, description="產地")
    productState: Optional[Union[ProductState, List[ProductState]]] = Field(None, description="產品狀態", alias="product_state")
    taxStatus: Optional[Union[TaxStatus, List[TaxStatus]]] = Field(None, description="稅務狀態", alias="tax_status")
    isActive: Optional[bool] = Field(None, description="是否啟用", alias="is_active")
    isPublic: Optional[bool] = Field(None, description="是否公開", alias="is_public")
    supplierId: Optional[str] = Field(None, description="供應商ID", alias="supplier_id")
    sortBy: Optional[str] = Field("createdAt", description="排序欄位", alias="sort_by")
    sortOrder: Optional[str] = Field("desc", pattern="^(asc|desc)$", description="排序方向", alias="sort_order")


class ProductSearchResponse(BaseModel):
    """Product search API response"""
    success: bool = Field(True, description="操作成功")
    data: Dict[str, Any] = Field(..., description="搜尋結果")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "products": [],
                    "pagination": {
                        "currentPage": 1,
                        "totalPages": 1,
                        "totalItems": 0,
                        "itemsPerPage": 20
                    }
                }
            }
        }


class ProductStatsResponse(BaseModel):
    """Product statistics API response"""
    success: bool = Field(True, description="操作成功")
    data: ProductStats = Field(..., description="統計數據")


class ProductDetailResponse(BaseModel):
    """Single product detail response"""
    success: bool = Field(True, description="操作成功")
    data: ProductResponse = Field(..., description="產品詳細資訊")
