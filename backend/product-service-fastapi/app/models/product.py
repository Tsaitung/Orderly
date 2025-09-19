"""
Product SQLAlchemy model
"""
import enum
from sqlalchemy import Column, String, Boolean, Text, JSON, ForeignKey, Integer, Enum
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


class Product(BaseModel):
    """
    Product model with comprehensive field support
    Maps to products table
    """
    __tablename__ = "products"
    
    # Foreign Keys
    supplier_id = Column("supplierId", String, nullable=True)  # TODO: Will add FK when organizations table exists
    category_id = Column("categoryId", String, ForeignKey("product_categories.id"), nullable=False)
    
    # Core Product Information
    code = Column(String, nullable=False, index=True)  # 產品代碼
    name = Column(String, nullable=False)  # 產品名稱
    name_en = Column("nameEn", String, nullable=True)  # 英文名稱
    description = Column(Text, nullable=True)
    
    # 新增欄位 (from PRD requirements)
    brand = Column(String, nullable=True)  # 品牌
    origin = Column(String, nullable=True)  # 產地
    product_state = Column("productState", Enum(ProductState), default=ProductState.raw, nullable=False)  # 產品狀態
    tax_status = Column("taxStatus", Enum(TaxStatus), default=TaxStatus.taxable, nullable=False)  # 稅務狀態
    
    # 過敏原追蹤 (可開關)
    allergen_tracking_enabled = Column("allergenTrackingEnabled", Boolean, default=False, nullable=False)
    
    # 規格與定價
    base_unit = Column("baseUnit", String, nullable=False)  # 基本單位 (kg, 個, 包)
    pricing_unit = Column("pricingUnit", String, nullable=False)  # 定價單位
    specifications = Column(JSON, default={}, nullable=False)
    
    # 產品狀態
    version = Column(Integer, default=1, nullable=False)
    is_active = Column("isActive", Boolean, default=True, nullable=False)
    is_public = Column("isPublic", Boolean, default=True, nullable=False)  # 是否公開可見
    
    # 認證與安全
    certifications = Column(JSON, default=[], nullable=False)  # 認證標章
    safety_info = Column("safetyInfo", JSON, default={}, nullable=False)  # 食安資訊
    
    # 審計字段
    created_by = Column("createdBy", String, nullable=True)
    updated_by = Column("updatedBy", String, nullable=True)
    
    # Relationships
    category = relationship("ProductCategory", back_populates="products")
    skus = relationship("ProductSKU", back_populates="product", cascade="all, delete-orphan")
    # TODO: Add other relationships when corresponding tables exist
    # supplier = relationship("Organization", back_populates="supplied_products")
    # supplier_products = relationship("SupplierProduct", back_populates="product")
    # order_items = relationship("OrderItem", back_populates="product")
    
    def __repr__(self):
        return f"<Product(code={self.code}, name={self.name}, category={self.category_id})>"
    
    @property
    def display_name(self) -> str:
        """Display name with brand if available"""
        if self.brand:
            return f"{self.brand} {self.name}"
        return self.name
    
    @property
    def is_food_item(self) -> bool:
        """Check if this is a food item requiring allergen tracking"""
        return self.allergen_tracking_enabled
