"""
Price History model for tracking SKU price changes
Aligned with migration add_price_history
"""
import enum
from decimal import Decimal
from sqlalchemy import Column, String, Text, Float, ForeignKey, DateTime, Numeric, Enum, func
from sqlalchemy.orm import relationship
from .base import BaseModel


class PriceType(str, enum.Enum):
    """價格類型枚舉"""
    BASE = "base"             # 基礎價格
    SELLING = "selling"       # 銷售價格
    COST = "cost"             # 成本價格
    PROMOTIONAL = "promotional"  # 促銷價格


class PriceHistory(BaseModel):
    """
    價格歷史記錄模型
    追蹤 SKU 價格變動歷史，支援：
    - 多種價格類型 (基礎/銷售/成本/促銷)
    - 有效期間管理
    - 變動原因記錄
    - 價格變動百分比計算
    """
    __tablename__ = "price_history"

    # Foreign Keys
    sku_id = Column("skuId", String, ForeignKey("product_skus.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id = Column("supplierId", String, nullable=True, index=True)

    # Price Information
    old_price = Column("oldPrice", Numeric(12, 2), nullable=True)
    new_price = Column("newPrice", Numeric(12, 2), nullable=False)
    price_type = Column("priceType", Enum(PriceType, name="pricetype", create_type=False), nullable=False, default=PriceType.BASE)
    currency = Column("currency", String(3), nullable=False, default='TWD')

    # Change Information
    change_reason = Column("changeReason", Text, nullable=True)
    changed_by = Column("changedBy", String(36), nullable=True)
    changed_at = Column("changedAt", DateTime(timezone=True), nullable=False, server_default=func.now())

    # Effective Period
    effective_from = Column("effectiveFrom", DateTime(timezone=True), nullable=True)
    effective_to = Column("effectiveTo", DateTime(timezone=True), nullable=True)

    # Calculated Fields
    change_percent = Column("changePercent", Float, nullable=True)

    # Relationship
    sku = relationship("ProductSKU", backref="price_history")

    def __repr__(self):
        return f"<PriceHistory(sku_id={self.sku_id}, old={self.old_price}, new={self.new_price}, type={self.price_type})>"

    @property
    def is_price_increase(self) -> bool:
        """是否為價格上漲"""
        if self.old_price is None:
            return False
        return self.new_price > self.old_price

    @property
    def is_price_decrease(self) -> bool:
        """是否為價格下降"""
        if self.old_price is None:
            return False
        return self.new_price < self.old_price

    @property
    def price_difference(self) -> Decimal:
        """價格差異"""
        if self.old_price is None:
            return Decimal('0')
        return Decimal(str(self.new_price)) - Decimal(str(self.old_price))

    @property
    def calculated_change_percent(self) -> float:
        """計算價格變動百分比"""
        if self.old_price is None or self.old_price == 0:
            return 0.0
        diff = float(self.new_price) - float(self.old_price)
        return round((diff / float(self.old_price)) * 100, 2)

    @property
    def is_active(self) -> bool:
        """是否在有效期間內"""
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        if self.effective_from and now < self.effective_from:
            return False
        if self.effective_to and now > self.effective_to:
            return False
        return True
