"""
Simple SKU model that matches the existing database schema
Maps to the existing product_skus table with camelCase columns
"""
from sqlalchemy import Column, String, Boolean, Integer, Float, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from .base import BaseModel


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
    stock_quantity = Column("stockQuantity", Integer, nullable=False, default=0)
    reserved_quantity = Column("reservedQuantity", Integer, nullable=False, default=0)
    min_stock = Column("minStock", Integer, nullable=False, default=0)
    max_stock = Column("maxStock", Integer, nullable=True)
    weight = Column("weight", Float, nullable=True)
    dimensions = Column("dimensions", JSON, nullable=True)
    package_type = Column("packageType", String, nullable=True)
    shelf_life_days = Column("shelfLifeDays", Integer, nullable=True)
    storage_conditions = Column("storageConditions", String, nullable=True)
    batch_tracking_enabled = Column("batchTrackingEnabled", Boolean, nullable=False, default=False)
    is_active = Column("isActive", Boolean, nullable=False, default=True)
    
    # Relationship to products
    product = relationship("Product", back_populates="skus")
    
    def __repr__(self):
        return f"<ProductSKU(sku_code={self.sku_code}, name={self.name})>"
    
    @property
    def full_name(self) -> str:
        """Generate full SKU name"""
        return f"{self.name} ({self.sku_code})"