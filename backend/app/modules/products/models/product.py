"""
Product SQLAlchemy model
Aligned with actual database schema (2025-12-11)
"""
import enum
from sqlalchemy import Column, String, Boolean, Text, JSON, ForeignKey, Integer, Float, Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from .base import BaseModel


class ProductState(enum.Enum):
    """產品狀態枚舉"""
    raw = "raw"           # 原材料
    processed = "processed"  # 加工品


class TaxStatus(enum.Enum):
    """稅務狀態枚舉"""
    taxable = "taxable"       # 應稅
    tax_exempt = "tax_exempt"  # 免稅


class PricingMethod(enum.Enum):
    """計價方式枚舉"""
    BY_WEIGHT = "BY_WEIGHT"   # 重量計價（蔬菜、肉品等）
    BY_ITEM = "BY_ITEM"       # 個數計價（罐裝、瓶裝等）


class Product(BaseModel):
    """
    Product model aligned with actual database schema
    Columns match the existing PostgreSQL products table
    """
    __tablename__ = "products"

    # Foreign Keys
    supplier_id = Column("supplierId", String, nullable=True, index=True)
    category_id = Column("categoryId", String, ForeignKey("product_categories.id"), nullable=False, index=True)

    # Core Product Information
    code = Column(String, nullable=False, index=True)  # 產品代碼 (unique with version)
    name = Column(String, nullable=False)  # 產品名稱
    name_en = Column("nameEn", String, nullable=True)  # 英文名稱
    description = Column(String, nullable=True)  # 產品描述
    brand = Column(String, nullable=True, index=True)  # 品牌
    origin = Column(String, nullable=True, index=True)  # 產地

    # Product State & Tax
    product_state = Column("productState", Enum(ProductState, name='ProductState', create_type=False),
                          default=ProductState.raw, nullable=False)
    tax_status = Column("taxStatus", Enum(TaxStatus, name='TaxStatus', create_type=False),
                       default=TaxStatus.taxable, nullable=False)
    allergen_tracking_enabled = Column("allergenTrackingEnabled", Boolean, default=False, nullable=False)

    # Unit & Measurement
    base_unit = Column("baseUnit", String, nullable=False)  # 基本單位
    pricing_unit = Column("pricingUnit", String, nullable=False)  # 計價單位
    pricing_method = Column("pricingMethod", Enum(PricingMethod, name='pricingmethod', create_type=False),
                           default=PricingMethod.BY_ITEM, nullable=True)

    # Specifications
    specifications = Column(JSONB, nullable=False, default=dict)  # 規格資訊

    # Version & Status
    version = Column(Integer, default=1, nullable=False)
    is_active = Column("isActive", Boolean, default=True, nullable=False, index=True)
    is_public = Column("isPublic", Boolean, default=True, nullable=False)

    # Food Safety
    certifications = Column(JSONB, nullable=False, default=list)  # 認證標章
    safety_info = Column("safetyInfo", JSONB, nullable=False, default=dict)  # 安全資訊

    # Audit Fields
    created_by = Column("createdBy", String, nullable=True)
    updated_by = Column("updatedBy", String, nullable=True)

    # Multi-tenancy (added by migration 20251210_2000)
    tenant_id = Column(String, nullable=True, index=True)

    # Relationships
    category = relationship("ProductCategory", back_populates="products")
    skus = relationship("ProductSKU", back_populates="product", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Product(code={self.code}, name={self.name}, category={self.category_id})>"

    @property
    def display_name(self) -> str:
        """Display name"""
        return self.name

    @property
    def has_allergens(self) -> bool:
        """Check if this product has allergen information"""
        return bool(self.allergens)

    @property
    def has_nutritional_info(self) -> bool:
        """Check if this product has nutritional information"""
        return bool(self.nutritional_info)

    @property
    def is_certified(self) -> bool:
        """Check if this product has certifications"""
        return bool(self.certifications)
