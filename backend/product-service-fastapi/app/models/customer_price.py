"""
CustomerPrice SQLAlchemy model
客戶專屬價格模型
"""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .base import BaseModel


class CustomerPrice(BaseModel):
    """
    客戶專屬價格模型
    支援為特定客戶設定特殊價格
    """
    __tablename__ = "customer_prices"

    # 多租戶隔離
    tenant_id = Column(String(36), nullable=True, index=True, comment='租戶ID')

    # 客戶資訊
    customer_id = Column(String(36), nullable=False, index=True, comment='客戶ID')
    customer_name = Column(String(200), nullable=True, comment='客戶名稱（冗餘存儲便於查詢）')

    # SKU 關聯
    sku_id = Column(String(36), ForeignKey("product_skus.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True)

    # 價格設定
    special_price = Column(Float, nullable=False, comment='專屬價格')
    original_price = Column(Float, nullable=True, comment='原價（記錄用）')
    discount_rate = Column(Float, nullable=True, comment='折扣率（計算用，如 0.15 表示 85折）')

    # 合約/協議資訊
    contract_number = Column(String(100), nullable=True, comment='合約編號')
    agreement_notes = Column(Text, nullable=True, comment='協議備註')

    # 生效期
    effective_from = Column(DateTime(timezone=True), nullable=False, comment='生效開始時間')
    effective_to = Column(DateTime(timezone=True), nullable=True, comment='生效結束時間（null 表示無期限）')

    # 數量限制
    min_quantity = Column(Integer, nullable=True, comment='最低購買數量（適用此價格）')
    max_quantity = Column(Integer, nullable=True, comment='最大購買數量限制')

    # 狀態
    is_active = Column(Boolean, nullable=False, default=True, comment='是否啟用')

    # 優先級（同客戶多個價格時）
    priority = Column(Integer, nullable=False, default=0, comment='優先級')

    # 審計
    created_by = Column(String(36), nullable=True)
    updated_by = Column(String(36), nullable=True)
    approved_by = Column(String(36), nullable=True, comment='核准人')
    approved_at = Column(DateTime(timezone=True), nullable=True, comment='核准時間')

    def __repr__(self):
        return f"<CustomerPrice(customer_id={self.customer_id}, sku_id={self.sku_id}, price={self.special_price})>"

    @property
    def is_valid(self) -> bool:
        """檢查價格是否有效（在有效期內且啟用）"""
        now = datetime.utcnow()
        if not self.is_active:
            return False
        if self.effective_from and now < self.effective_from:
            return False
        if self.effective_to and now > self.effective_to:
            return False
        return True

    @property
    def discount_percentage(self) -> float:
        """計算折扣百分比"""
        if self.original_price and self.original_price > 0:
            return round((1 - self.special_price / self.original_price) * 100, 2)
        return 0
