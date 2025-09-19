"""
SKU management Pydantic schemas
Defines data validation and serialization for SKU operations
"""
from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum


# Enum schemas matching model enums
class PackagingTypeEnum(str, Enum):
    bulk = "bulk"
    bag_500g = "500g"
    bag_1kg = "1kg"
    box_5kg = "5kg"
    custom = "custom"


class QualityGradeEnum(str, Enum):
    grade_a = "A"
    grade_b = "B"
    processing = "PROC"


class ProcessingMethodEnum(str, Enum):
    raw = "RAW"
    washed = "WASH"
    cut = "CUT"
    frozen = "FROZ"


class PackagingMaterialEnum(str, Enum):
    vacuum = "VAC"
    fresh_box = "BOX"
    cardboard = "CARD"
    plastic_bag = "PBAG"


class AllergenTypeEnum(str, Enum):
    gluten = "gluten"
    crustaceans = "crustaceans"
    eggs = "eggs"
    fish = "fish"
    peanuts = "peanuts"
    soybeans = "soybeans"
    dairy = "dairy"
    nuts = "nuts"
    celery = "celery"
    mustard = "mustard"
    sesame = "sesame"
    sulfites = "sulfites"
    lupin = "lupin"
    molluscs = "molluscs"


class AllergenRiskLevelEnum(int, Enum):
    none = 0
    low = 1
    medium = 2
    high = 3


# Base schemas
class SKUBase(BaseModel):
    """Base SKU schema with common fields"""
    packaging_type: PackagingTypeEnum
    packaging_size: Optional[str] = None
    quality_grade: QualityGradeEnum
    processing_method: ProcessingMethodEnum
    packaging_material: PackagingMaterialEnum
    base_price: Decimal = Field(..., gt=0, description="基礎價格")
    pricing_unit: str = Field(default="kg", description="定價單位")
    origin_country: Optional[str] = Field(None, description="產地國家")
    origin_region: Optional[str] = Field(None, description="產地區域")
    weight_grams: Optional[int] = Field(None, gt=0, description="重量(克)")
    dimensions: Dict[str, Any] = Field(default_factory=dict, description="尺寸資訊")
    minimum_order_quantity: int = Field(default=1, gt=0, description="最小訂購量")
    batch_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    is_active: bool = Field(default=True, description="是否啟用")
    notes: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_encoders = {
            Decimal: str
        }


class SKUCreate(SKUBase):
    """Create SKU schema"""
    product_id: str = Field(..., description="產品ID")
    
    def generate_sku_code(self, product_code: str) -> str:
        """Generate SKU code based on variant properties"""
        packaging_code = self.packaging_type.value.upper()
        quality_code = self.quality_grade.value
        processing_code = self.processing_method.value
        
        return f"{product_code}-{packaging_code}-{quality_code}-{processing_code}"


class SKUUpdate(BaseModel):
    """Update SKU schema - all fields optional"""
    packaging_type: Optional[PackagingTypeEnum] = None
    packaging_size: Optional[str] = None
    quality_grade: Optional[QualityGradeEnum] = None
    processing_method: Optional[ProcessingMethodEnum] = None
    packaging_material: Optional[PackagingMaterialEnum] = None
    base_price: Optional[Decimal] = Field(None, gt=0)
    pricing_unit: Optional[str] = None
    origin_country: Optional[str] = None
    origin_region: Optional[str] = None
    weight_grams: Optional[int] = Field(None, gt=0)
    dimensions: Optional[Dict[str, Any]] = None
    minimum_order_quantity: Optional[int] = Field(None, gt=0)
    batch_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        json_encoders = {
            Decimal: str
        }


class SKUResponse(SKUBase):
    """SKU response schema"""
    id: str
    sku_code: str
    product_id: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    
    # Computed properties
    full_name: Optional[str] = None

    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: str
        }


# Allergen schemas
class AllergenBase(BaseModel):
    """Base allergen schema"""
    allergen_type: AllergenTypeEnum
    risk_level: AllergenRiskLevelEnum
    source: Optional[str] = None
    cross_contamination_risk: bool = Field(default=False, description="交叉污染風險")
    notes: Optional[str] = None
    is_active: bool = Field(default=True, description="是否啟用")


class AllergenCreate(AllergenBase):
    """Create allergen schema"""
    sku_id: str


class AllergenUpdate(BaseModel):
    """Update allergen schema"""
    risk_level: Optional[AllergenRiskLevelEnum] = None
    source: Optional[str] = None
    cross_contamination_risk: Optional[bool] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class AllergenResponse(AllergenBase):
    """Allergen response schema"""
    id: str
    sku_id: str
    created_at: datetime
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


# Nutrition schemas
class NutritionBase(BaseModel):
    """Base nutrition schema"""
    calories_per_100g: Optional[Decimal] = Field(None, ge=0, description="每100g熱量")
    protein_g: Optional[Decimal] = Field(None, ge=0, description="蛋白質(g)")
    fat_g: Optional[Decimal] = Field(None, ge=0, description="脂肪(g)")
    carbs_g: Optional[Decimal] = Field(None, ge=0, description="碳水化合物(g)")
    fiber_g: Optional[Decimal] = Field(None, ge=0, description="膳食纖維(g)")
    sugar_g: Optional[Decimal] = Field(None, ge=0, description="糖分(g)")
    sodium_mg: Optional[Decimal] = Field(None, ge=0, description="鈉(mg)")
    calcium_mg: Optional[Decimal] = Field(None, ge=0, description="鈣(mg)")
    iron_mg: Optional[Decimal] = Field(None, ge=0, description="鐵(mg)")
    vitamin_c_mg: Optional[Decimal] = Field(None, ge=0, description="維生素C(mg)")
    nutrition_claims: List[str] = Field(default_factory=list, description="營養聲明")
    data_source: Optional[str] = None
    lab_report_url: Optional[str] = None

    class Config:
        json_encoders = {
            Decimal: str
        }


class NutritionCreate(NutritionBase):
    """Create nutrition schema"""
    product_id: str


class NutritionUpdate(NutritionBase):
    """Update nutrition schema - all fields optional"""
    pass


class NutritionResponse(NutritionBase):
    """Nutrition response schema"""
    id: str
    product_id: str
    is_verified: bool = False
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: str
        }


# Supplier SKU schemas
class SupplierSKUBase(BaseModel):
    """Base supplier SKU schema"""
    supplier_sku_code: str = Field(..., description="供應商SKU代碼")
    supplier_name_for_product: Optional[str] = None
    supplier_price: Decimal = Field(..., gt=0, description="供應商價格")
    bulk_discount_threshold: Optional[int] = Field(None, gt=0)
    bulk_discount_rate: Optional[Decimal] = Field(None, ge=0, le=1)
    pricing_tiers: List[Dict[str, Any]] = Field(default_factory=list, description="定價階層")
    lead_time_days: int = Field(default=1, gt=0, description="交期天數")
    minimum_order_quantity: int = Field(default=1, gt=0, description="最小訂購量")
    availability_status: str = Field(default="available", description="供貨狀態")
    supplier_quality_grade: Optional[str] = None
    certifications: List[str] = Field(default_factory=list)
    contract_start_date: Optional[datetime] = None
    contract_end_date: Optional[datetime] = None
    is_active: bool = Field(default=True, description="是否啟用")
    is_preferred: bool = Field(default=False, description="是否優先供應商")
    quality_score: Optional[Decimal] = Field(None, ge=0, le=5, description="品質評分 0-5")
    delivery_score: Optional[Decimal] = Field(None, ge=0, le=5, description="配送評分 0-5")
    service_score: Optional[Decimal] = Field(None, ge=0, le=5, description="服務評分 0-5")

    class Config:
        json_encoders = {
            Decimal: str
        }


class SupplierSKUCreate(SupplierSKUBase):
    """Create supplier SKU schema"""
    sku_id: str
    supplier_id: str


class SupplierSKUUpdate(BaseModel):
    """Update supplier SKU schema"""
    supplier_sku_code: Optional[str] = None
    supplier_name_for_product: Optional[str] = None
    supplier_price: Optional[Decimal] = Field(None, gt=0)
    bulk_discount_threshold: Optional[int] = Field(None, gt=0)
    bulk_discount_rate: Optional[Decimal] = Field(None, ge=0, le=1)
    pricing_tiers: Optional[List[Dict[str, Any]]] = None
    lead_time_days: Optional[int] = Field(None, gt=0)
    minimum_order_quantity: Optional[int] = Field(None, gt=0)
    availability_status: Optional[str] = None
    supplier_quality_grade: Optional[str] = None
    certifications: Optional[List[str]] = None
    contract_start_date: Optional[datetime] = None
    contract_end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    is_preferred: Optional[bool] = None
    quality_score: Optional[Decimal] = Field(None, ge=0, le=5)
    delivery_score: Optional[Decimal] = Field(None, ge=0, le=5)
    service_score: Optional[Decimal] = Field(None, ge=0, le=5)

    class Config:
        json_encoders = {
            Decimal: str
        }


class SupplierSKUResponse(SupplierSKUBase):
    """Supplier SKU response schema"""
    id: str
    sku_id: str
    supplier_id: str
    overall_score: float = 0.0
    effective_price: Decimal
    comparison_badges: List[str] = Field(default_factory=list, description="比較標籤")
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: str
        }


# Response wrappers
class SKUListResponse(BaseModel):
    """SKU list response"""
    success: bool = True
    data: List[SKUResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class SKUDetailResponse(BaseModel):
    """Single SKU response"""
    success: bool = True
    data: SKUResponse


class AllergenListResponse(BaseModel):
    """Allergen list response"""
    success: bool = True
    data: List[AllergenResponse]


class NutritionDetailResponse(BaseModel):
    """Nutrition response"""
    success: bool = True
    data: Optional[NutritionResponse] = None


class SupplierSKUListResponse(BaseModel):
    """Supplier SKU list response"""
    success: bool = True
    data: List[SupplierSKUResponse]


# Batch operation schemas
class SKUBatchCreate(BaseModel):
    """Batch create SKUs"""
    skus: List[SKUCreate] = Field(..., max_items=1000, description="最多1000個SKU")


class SKUBatchResponse(BaseModel):
    """Batch operation response"""
    success: bool = True
    created_count: int = 0
    failed_count: int = 0
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    data: List[SKUResponse] = Field(default_factory=list)


# Search and filter schemas
class SKUSearchParams(BaseModel):
    """SKU search parameters"""
    product_id: Optional[str] = None
    packaging_type: Optional[PackagingTypeEnum] = None
    quality_grade: Optional[QualityGradeEnum] = None
    processing_method: Optional[ProcessingMethodEnum] = None
    is_active: Optional[bool] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    search: Optional[str] = None  # Search in SKU code, notes
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="created_at")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")

    class Config:
        json_encoders = {
            Decimal: str
        }