"""
Simple SKU model that matches the existing database schema
Maps to the existing product_skus table with camelCase columns
Aligned with migration f2fcfbdc3a33 (baseline_product_schema)
"""
from sqlalchemy import Column, String, Boolean, Integer, Float, JSON, ForeignKey, DateTime, func, Enum
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import relationship
from .base import BaseModel
import enum


class SKUType(str, enum.Enum):
    """SKU 類型枚舉"""
    STANDARD = "STANDARD"
    VARIANT = "VARIANT"
    BUNDLE = "BUNDLE"
    CUSTOM = "CUSTOM"
    PUBLIC = "PUBLIC"  # 公開共享型 SKU


class CreatorType(str, enum.Enum):
    """創建者類型枚舉"""
    SYSTEM = "SYSTEM"
    PLATFORM = "PLATFORM"
    SUPPLIER = "SUPPLIER"
    RESTAURANT = "RESTAURANT"


class ApprovalStatus(str, enum.Enum):
    """審核狀態枚舉"""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    DRAFT = "DRAFT"


class SKUPricingMethod(str, enum.Enum):
    """SKU 計價方式枚舉 - 與資料庫 pricingmethod ENUM 對應"""
    # 資料庫實際使用的值
    BY_ITEM = "BY_ITEM"     # 個數計價
    BY_WEIGHT = "BY_WEIGHT" # 重量計價
    # 原設計值（保留向後相容）
    UNIT = "UNIT"       # 單位計價
    BULK = "BULK"       # 批量計價
    TIERED = "TIERED"   # 階梯計價
    VOLUME = "VOLUME"   # 量價計價


class ProductSKU(BaseModel):
    """
    Simple Product SKU model matching existing database schema
    """
    __tablename__ = "product_skus"

    # 多租戶隔離（migration: 20251210_2000）
    tenant_id = Column(String(36), nullable=True, index=True, comment='租戶ID（組織ID）')

    # Map Python snake_case attributes to database camelCase columns
    product_id = Column("productId", String, ForeignKey("products.id"), nullable=False, index=True)
    sku_code = Column("skuCode", String, nullable=False, unique=True, index=True)
    name = Column("name", String, nullable=False)
    variant = Column("variant", JSON, nullable=False, default=dict)

    # Inventory management (from migration)
    stock_quantity = Column("stockQuantity", Integer, nullable=False, default=0)
    reserved_quantity = Column("reservedQuantity", Integer, nullable=False, default=0)
    min_stock = Column("minStock", Integer, nullable=False, default=0)
    max_stock = Column("maxStock", Integer, nullable=True)

    # Physical properties (from migration)
    weight = Column("weight", Float, nullable=True)
    dimensions = Column("dimensions", JSON, nullable=True)
    package_type = Column("packageType", String, nullable=True)
    shelf_life_days = Column("shelfLifeDays", Integer, nullable=True)
    storage_conditions = Column("storageConditions", String, nullable=True)
    batch_tracking_enabled = Column("batchTrackingEnabled", Boolean, nullable=False, default=False)
    is_active = Column("isActive", Boolean, nullable=False, default=True)
    
    # SKU 共享機制欄位
    type = Column(Enum(SKUType, name="skutype", create_type=False), nullable=False, default=SKUType.STANDARD)
    creator_type = Column(Enum(CreatorType, name="creatortype", create_type=False), nullable=False, default=CreatorType.SYSTEM)
    creator_id = Column(String(36), nullable=True)
    standard_info = Column(JSON, nullable=True, comment='共享型 SKU 的標準化資訊')
    approval_status = Column(Enum(ApprovalStatus, name="approvalstatus", create_type=False), nullable=False, default=ApprovalStatus.APPROVED)
    approved_by = Column(String(36), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    
    # 計價相關欄位（與遷移 pricingmethod ENUM 對應）
    pricing_method = Column("pricingMethod", Enum(SKUPricingMethod, name="pricingmethod", create_type=False), nullable=True)
    pricing_unit = Column("pricingUnit", String, nullable=False, default='unit')  # 計價單位
    unit_price = Column("unitPrice", Float, nullable=True)  # 單位價格
    min_order_quantity = Column("minOrderQuantity", Float, nullable=True)  # 最小訂購量
    quantity_increment = Column("quantityIncrement", Float, nullable=True)  # 數量增量

    # 注意：pricing_tiers, bulk_discount_threshold, bulk_discount_rate 欄位
    # 已從模型移除（資料庫中不存在這些欄位）
    # 未來需要階梯定價功能時，請先透過 Alembic 遷移添加欄位

    # 產地資訊
    origin_country = Column("originCountry", String, nullable=True)  # 產地國家
    origin_region = Column("originRegion", String, nullable=True)  # 產地區域

    # 注意：search_vector 欄位已從模型移除（資料庫中不存在）
    # 若需要全文搜尋功能，請先執行相關遷移

    # Relationship to products
    product = relationship("Product", back_populates="skus")
    
    def __repr__(self):
        return f"<ProductSKU(sku_code={self.sku_code}, name={self.name})>"
    
    @property
    def full_name(self) -> str:
        """Generate full SKU name"""
        return f"{self.name} ({self.sku_code})"

    @property
    def display_unit(self) -> str:
        """根據計價單位返回顯示單位"""
        return self.pricing_unit or "unit"

    # 注意：is_bulk_pricing 和 is_tiered_pricing 屬性已移除
    # 原因：依賴 pricing_tiers 等資料庫中不存在的欄位
