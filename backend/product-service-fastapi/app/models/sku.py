"""
SKU (Stock Keeping Unit) management models
Based on PRD requirements for complete SKU variant management
"""
import enum
from decimal import Decimal
from sqlalchemy import Column, String, Boolean, Text, JSON, ForeignKey, Integer, Enum, Numeric, DateTime, func
from sqlalchemy.orm import relationship
from .base import BaseModel


class PackagingType(enum.Enum):
    """包裝規格枚舉"""
    bulk = "bulk"           # 散裝
    bag_500g = "500g"      # 500g包
    bag_1kg = "1kg"        # 1kg包
    box_5kg = "5kg"        # 5kg箱
    custom = "custom"       # 自定義


class QualityGrade(enum.Enum):
    """品質等級枚舉"""
    grade_a = "A"          # A級
    grade_b = "B"          # B級
    processing = "PROC"    # 加工級


class ProcessingMethod(enum.Enum):
    """處理方式枚舉"""
    raw = "RAW"            # 未處理
    washed = "WASH"        # 清洗
    cut = "CUT"            # 切段
    frozen = "FROZ"        # 冷凍


class PackagingMaterial(enum.Enum):
    """包裝材質枚舉"""
    vacuum = "VAC"         # 真空包
    fresh_box = "BOX"      # 保鮮盒
    cardboard = "CARD"     # 紙箱
    plastic_bag = "PBAG"   # 塑膠袋


class AllergenType(enum.Enum):
    """過敏原類型枚舉 (14類過敏原)"""
    gluten = "gluten"              # 麩質
    crustaceans = "crustaceans"    # 甲殼類
    eggs = "eggs"                  # 蛋類
    fish = "fish"                  # 魚類
    peanuts = "peanuts"            # 花生
    soybeans = "soybeans"          # 大豆
    dairy = "dairy"                # 乳製品
    nuts = "nuts"                  # 堅果類
    celery = "celery"              # 芹菜
    mustard = "mustard"            # 芥末
    sesame = "sesame"              # 芝麻
    sulfites = "sulfites"          # 亞硫酸鹽
    lupin = "lupin"                # 羽扇豆
    molluscs = "molluscs"          # 軟體動物


class AllergenRiskLevel(enum.Enum):
    """過敏原風險等級 (4級風險)"""
    none = 0        # 無風險
    low = 1         # 低風險
    medium = 2      # 中風險
    high = 3        # 高風險


class ProductSKU(BaseModel):
    """
    Product SKU model for variant management
    Supports packaging, quality, processing variants
    """
    __tablename__ = "product_skus"
    
    # Core SKU information
    sku_code = Column(String, unique=True, nullable=False, index=True)  # SKU編碼
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    
    # Variant dimensions (變體維度)
    packaging_type = Column(Enum(PackagingType), nullable=False)
    packaging_size = Column(String, nullable=True)  # 自定義包裝尺寸
    quality_grade = Column(Enum(QualityGrade), nullable=False)
    processing_method = Column(Enum(ProcessingMethod), nullable=False)
    packaging_material = Column(Enum(PackagingMaterial), nullable=False)
    
    # Pricing
    base_price = Column(Numeric(10, 4), nullable=False)  # 基礎價格
    pricing_unit = Column(String, default="kg", nullable=False)  # 定價單位 (kg, box, piece, etc.)
    
    # Origin tracking
    origin_country = Column(String, nullable=True)  # 產地國家
    origin_region = Column(String, nullable=True)  # 產地區域
    
    # Physical properties
    weight_grams = Column(Integer, nullable=True)  # 重量(克)
    dimensions = Column(JSON, default={}, nullable=False)  # 尺寸 {"length": 10, "width": 5, "height": 3}
    
    # Business properties
    minimum_order_quantity = Column(Integer, default=1, nullable=False)
    batch_number = Column(String, nullable=True)  # 批次號
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Metadata
    notes = Column(Text, nullable=True)
    meta_data = Column(JSON, default={}, nullable=False)
    
    # Audit fields
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
    
    # Relationships
    product = relationship("Product", back_populates="skus")
    allergens = relationship("ProductAllergen", back_populates="sku", cascade="all, delete-orphan")
    supplier_skus = relationship("SupplierSKU", back_populates="sku", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ProductSKU(sku_code={self.sku_code}, product_id={self.product_id})>"
    
    @property
    def full_name(self) -> str:
        """生成完整的SKU名稱"""
        parts = [
            self.product.name if self.product else "Unknown Product",
            f"{self.packaging_type.value}",
            f"品質{self.quality_grade.value}",
            f"{self.processing_method.value}"
        ]
        return " - ".join(parts)
    
    
    @classmethod
    def generate_sku_code(cls, product_code: str, packaging: str, quality: str, processing: str) -> str:
        """生成SKU編碼
        格式: {產品代碼}-{包裝代碼}-{品質代碼}-{處理代碼}
        範例: ORD-VEGG-001-500G-A-WASH
        """
        return f"{product_code}-{packaging}-{quality}-{processing}"


class ProductAllergen(BaseModel):
    """
    Product allergen tracking (可開關功能)
    支援14類過敏原和4級風險評估
    """
    __tablename__ = "product_allergens"
    
    # Foreign keys
    sku_id = Column(String, ForeignKey("product_skus.id"), nullable=False)
    
    # Allergen information
    allergen_type = Column(Enum(AllergenType), nullable=False)
    risk_level = Column(Enum(AllergenRiskLevel), nullable=False)
    
    # Additional info
    source = Column(String, nullable=True)  # 過敏原來源
    cross_contamination_risk = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Audit
    created_by = Column(String, nullable=True)
    
    # Relationships
    sku = relationship("ProductSKU", back_populates="allergens")
    
    # Unique constraint
    __table_args__ = (
        {"comment": "Product allergen tracking with risk levels"}
    )
    
    def __repr__(self):
        return f"<ProductAllergen(sku_id={self.sku_id}, allergen={self.allergen_type.value}, risk={self.risk_level.value})>"


class ProductNutrition(BaseModel):
    """
    Product nutrition information
    營養成分資料標準化
    """
    __tablename__ = "product_nutrition"
    
    # Foreign key
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    
    # Basic nutrition (per 100g)
    calories_per_100g = Column(Numeric(8, 2), nullable=True)  # 熱量
    protein_g = Column(Numeric(8, 2), nullable=True)        # 蛋白質
    fat_g = Column(Numeric(8, 2), nullable=True)               # 脂肪
    carbs_g = Column(Numeric(8, 2), nullable=True)           # 碳水化合物
    fiber_g = Column(Numeric(8, 2), nullable=True)           # 膳食纖維
    sugar_g = Column(Numeric(8, 2), nullable=True)           # 糖分
    sodium_mg = Column(Numeric(8, 2), nullable=True)       # 鈉
    
    # Extended nutrition
    calcium_mg = Column(Numeric(8, 2), nullable=True)     # 鈣
    iron_mg = Column(Numeric(8, 2), nullable=True)           # 鐵
    vitamin_c_mg = Column(Numeric(8, 2), nullable=True)  # 維生素C
    
    # Nutrition claims
    nutrition_claims = Column(JSON, default=[], nullable=False)  # 營養聲明
    
    # Verification
    is_verified = Column(Boolean, default=False, nullable=False)
    verified_by = Column(String, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    
    # Data source
    data_source = Column(String, nullable=True)  # 數據來源
    lab_report_url = Column(String, nullable=True)  # 檢驗報告連結
    
    # Audit
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
    
    # Relationships
    product = relationship("Product", back_populates="nutrition")
    
    def __repr__(self):
        return f"<ProductNutrition(product_id={self.product_id}, calories={self.calories_per_100g})>"


class SupplierSKU(BaseModel):
    """
    Multi-supplier SKU mapping
    支援多供應商對應與差異化定價
    """
    __tablename__ = "supplier_skus"
    
    # Foreign keys
    sku_id = Column(String, ForeignKey("product_skus.id"), nullable=False)
    supplier_id = Column(String, nullable=False)  # TODO: Add FK when organizations table exists
    
    # Supplier-specific information
    supplier_sku_code = Column(String, nullable=False)  # 供應商內部SKU代碼
    supplier_name_for_product = Column(String, nullable=True)  # 供應商產品名稱
    
    # Pricing
    supplier_price = Column(Numeric(10, 4), nullable=False)
    bulk_discount_threshold = Column(Integer, nullable=True)
    bulk_discount_rate = Column(Numeric(5, 4), nullable=True)  # 0.1000 = 10%
    
    # Enhanced pricing tiers (JSON format for flexibility)
    pricing_tiers = Column(JSON, default=[], nullable=False)
    # Example: [{"min_qty": 100, "price": 9.50}, {"min_qty": 500, "price": 9.00}]
    
    # Supply information
    lead_time_days = Column(Integer, default=1, nullable=False)
    minimum_order_quantity = Column(Integer, default=1, nullable=False)
    availability_status = Column(String, default="available", nullable=False)
    
    # Quality & Certifications
    supplier_quality_grade = Column(String, nullable=True)
    certifications = Column(JSON, default=[], nullable=False)
    
    # Contract information
    contract_start_date = Column(DateTime(timezone=True), nullable=True)
    contract_end_date = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_preferred = Column(Boolean, default=False, nullable=False)  # 是否優先供應商
    
    # Performance metrics
    quality_score = Column(Numeric(3, 2), nullable=True)  # 0.00-5.00
    delivery_score = Column(Numeric(3, 2), nullable=True)  # 0.00-5.00
    service_score = Column(Numeric(3, 2), nullable=True)    # 0.00-5.00
    
    # Audit
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
    
    # Relationships
    sku = relationship("ProductSKU", back_populates="supplier_skus")
    
    # Unique constraint
    __table_args__ = (
        {"comment": "Multi-supplier SKU mapping with differential pricing"}
    )
    
    def __repr__(self):
        return f"<SupplierSKU(sku_id={self.sku_id}, supplier_id={self.supplier_id}, price={self.supplier_price})>"
    
    @property
    def overall_score(self) -> float:
        """計算綜合評分"""
        scores = [s for s in [self.quality_score, self.delivery_score, self.service_score] if s is not None]
        return sum(scores) / len(scores) if scores else 0.0
    
    @property
    def effective_price(self) -> Decimal:
        """根據數量計算有效價格"""
        # 此處可以加入更複雜的定價邏輯
        return self.supplier_price