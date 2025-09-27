"""
Simple SKU model that matches the existing database schema
Maps to the existing product_skus table with camelCase columns
"""
from sqlalchemy import Column, String, Boolean, Integer, Float, JSON, ForeignKey, DateTime, func, Enum
from sqlalchemy.orm import relationship
from .base import BaseModel
from .product import PricingMethod
import enum

class SKUType(str, enum.Enum):
    STANDARD = "STANDARD"
    VARIANT = "VARIANT"
    BUNDLE = "BUNDLE"
    CUSTOM = "CUSTOM"

class CreatorType(str, enum.Enum):
    SYSTEM = "SYSTEM"
    PLATFORM = "PLATFORM"
    SUPPLIER = "SUPPLIER"
    RESTAURANT = "RESTAURANT"

class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    DRAFT = "DRAFT"


class ProductSKU(BaseModel):
    """
    Simple Product SKU model matching existing database schema
    """
    __tablename__ = "product_skus"
    
    # Map Python snake_case attributes to database camelCase columns
    product_id = Column("productId", String, ForeignKey("products.id"), nullable=False)
    sku_code = Column("skuCode", String, nullable=False, index=True)
    name = Column("name", String, nullable=False)
    variant = Column("variant", JSON, nullable=False, default=dict)
    weight = Column("weight", Float, nullable=True)
    dimensions = Column("dimensions", JSON, nullable=True)
    package_type = Column("packageType", String, nullable=True)
    shelf_life_days = Column("shelfLifeDays", Integer, nullable=True)
    storage_conditions = Column("storageConditions", String, nullable=True)
    batch_tracking_enabled = Column("batchTrackingEnabled", Boolean, nullable=False, default=False)
    is_active = Column("isActive", Boolean, nullable=False, default=True)
    
    # SKU 共享機制欄位
    type = Column(Enum(SKUType), nullable=False, default=SKUType.STANDARD)
    creator_type = Column(Enum(CreatorType), nullable=False, default=CreatorType.SYSTEM)
    creator_id = Column(String(36), nullable=True)
    standard_info = Column(JSON, nullable=True, comment='共享型 SKU 的標準化資訊')
    approval_status = Column(Enum(ApprovalStatus), nullable=False, default=ApprovalStatus.DRAFT)
    approved_by = Column(String(36), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    
    # 計價相關欄位
    pricing_method = Column("pricingMethod", Enum(PricingMethod), nullable=True)  # 可繼承產品計價方式
    unit_price = Column("unitPrice", Float, nullable=True)  # 單位價格（每公斤或每個）
    min_order_quantity = Column("minOrderQuantity", Float, nullable=False, default=1.0)  # 最小訂購量
    quantity_increment = Column("quantityIncrement", Float, nullable=False, default=1.0)  # 數量增量
    
    # Relationship to products
    product = relationship("Product", back_populates="skus")
    
    def __repr__(self):
        return f"<ProductSKU(sku_code={self.sku_code}, name={self.name})>"
    
    @property
    def full_name(self) -> str:
        """Generate full SKU name"""
        return f"{self.name} ({self.sku_code})"
    
    @property
    def effective_pricing_method(self) -> PricingMethod:
        """獲取有效的計價方式（優先使用 SKU 的，否則使用產品的）"""
        return self.pricing_method or (self.product.pricing_method if self.product else PricingMethod.BY_ITEM)
    
    @property
    def display_unit(self) -> str:
        """根據計價方式返回顯示單位"""
        method = self.effective_pricing_method
        if method == PricingMethod.BY_WEIGHT:
            return "kg"
        else:
            return "個"
    
    @property
    def is_weight_based(self) -> bool:
        """是否為重量計價"""
        return self.effective_pricing_method == PricingMethod.BY_WEIGHT