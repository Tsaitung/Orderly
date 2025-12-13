"""
Promotion SQLAlchemy model
促銷價格管理模型
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from .base import BaseModel


class DiscountType(str, enum.Enum):
    """折扣類型枚舉"""
    PERCENTAGE = "percentage"  # 百分比折扣
    FIXED_AMOUNT = "fixed_amount"  # 固定金額折扣
    FIXED_PRICE = "fixed_price"  # 固定價格


class PromotionStatus(str, enum.Enum):
    """促銷狀態枚舉"""
    DRAFT = "draft"  # 草稿
    SCHEDULED = "scheduled"  # 已排程
    ACTIVE = "active"  # 進行中
    PAUSED = "paused"  # 暫停
    ENDED = "ended"  # 已結束
    CANCELLED = "cancelled"  # 已取消


class Promotion(BaseModel):
    """
    促銷價格模型
    支援百分比折扣、固定金額折扣、固定價格
    """
    __tablename__ = "promotions"

    # 多租戶隔離
    tenant_id = Column(String(36), nullable=True, index=True, comment='租戶ID')

    # 基本資訊
    name = Column(String(200), nullable=False, comment='促銷名稱')
    description = Column(Text, nullable=True, comment='促銷描述')
    code = Column(String(50), nullable=True, index=True, comment='促銷代碼')

    # 關聯
    sku_id = Column(String(36), ForeignKey("product_skus.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True)

    # 折扣設定
    discount_type = Column(
        Enum(DiscountType, name="discounttype", create_type=True),
        nullable=False,
        default=DiscountType.PERCENTAGE,
        comment='折扣類型'
    )
    discount_value = Column(Float, nullable=False, comment='折扣值（百分比時為0.1=10%，固定金額/價格時為實際金額）')

    # 促銷價格（計算後的最終價格，便於查詢）
    promotional_price = Column(Float, nullable=True, comment='促銷價格')
    original_price = Column(Float, nullable=True, comment='原價')

    # 時間設定
    start_date = Column(DateTime(timezone=True), nullable=False, comment='開始時間')
    end_date = Column(DateTime(timezone=True), nullable=True, comment='結束時間（null 表示無期限）')

    # 數量限制
    max_quantity = Column(Integer, nullable=True, comment='最大銷售數量')
    sold_quantity = Column(Integer, nullable=False, default=0, comment='已銷售數量')
    min_purchase_quantity = Column(Integer, nullable=True, comment='最低購買數量')

    # 狀態
    status = Column(
        Enum(PromotionStatus, name="promotionstatus", create_type=True),
        nullable=False,
        default=PromotionStatus.DRAFT,
        comment='促銷狀態'
    )
    is_active = Column(Boolean, nullable=False, default=True, comment='是否啟用')

    # 優先級（同時多個促銷時）
    priority = Column(Integer, nullable=False, default=0, comment='優先級（數字越大優先級越高）')

    # 審計
    created_by = Column(String(36), nullable=True)
    updated_by = Column(String(36), nullable=True)

    def __repr__(self):
        return f"<Promotion(name={self.name}, sku_id={self.sku_id}, status={self.status})>"

    @property
    def is_valid(self) -> bool:
        """檢查促銷是否有效（在有效期內且啟用）"""
        now = datetime.utcnow()
        if not self.is_active:
            return False
        if self.status not in (PromotionStatus.ACTIVE, PromotionStatus.SCHEDULED):
            return False
        if self.start_date and now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        if self.max_quantity and self.sold_quantity >= self.max_quantity:
            return False
        return True

    @property
    def remaining_quantity(self) -> int | None:
        """剩餘可銷售數量"""
        if self.max_quantity is None:
            return None
        return max(0, self.max_quantity - self.sold_quantity)

    def calculate_discounted_price(self, original_price: float) -> float:
        """計算折扣後價格"""
        if self.discount_type == DiscountType.PERCENTAGE:
            return original_price * (1 - self.discount_value)
        elif self.discount_type == DiscountType.FIXED_AMOUNT:
            return max(0, original_price - self.discount_value)
        elif self.discount_type == DiscountType.FIXED_PRICE:
            return self.discount_value
        return original_price
