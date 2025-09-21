from sqlalchemy import Column, String, DECIMAL, Boolean, DateTime, Integer, Text, JSON, Index, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import BaseModel


class BillingTransaction(BaseModel):
    """
    計費交易明細表
    Individual billing transaction records for commission tracking
    """
    __tablename__ = "billing_transactions"

    # 交易基本資訊
    transaction_id = Column("transactionId", String, unique=True, nullable=False, comment="交易ID")
    order_id = Column("orderId", String, nullable=False, comment="訂單ID")
    supplier_id = Column("supplierId", String, nullable=False, comment="供應商ID")
    organization_id = Column("organizationId", String, nullable=False, comment="組織ID")
    customer_id = Column("customerId", String, nullable=True, comment="客戶ID")
    
    # 交易金額
    order_amount = Column("orderAmount", DECIMAL(12, 2), nullable=False, comment="訂單金額")
    commission_rate = Column("commissionRate", DECIMAL(5, 4), nullable=False, comment="適用抽成費率")
    commission_amount = Column("commissionAmount", DECIMAL(12, 2), nullable=False, comment="抽成金額")
    
    # 費率資訊
    rate_tier_id = Column("rateTierId", String, ForeignKey("transaction_rate_tiers.id"), nullable=True, comment="費率分級ID")
    rate_config_id = Column("rateConfigId", String, ForeignKey("billing_rate_configs.id"), nullable=True, comment="費率配置ID")
    
    # 交易時間
    transaction_date = Column("transactionDate", DateTime(timezone=True), nullable=False, comment="交易日期")
    billing_period = Column("billingPeriod", String, nullable=False, comment="計費周期 (YYYY-MM)")
    
    # 交易狀態
    status = Column("status", String, nullable=False, default="pending", 
                   comment="狀態: pending, confirmed, cancelled, refunded")
    
    # 產品分類
    product_category = Column("productCategory", String, nullable=True, comment="產品類別")
    business_unit = Column("businessUnit", String, nullable=True, comment="業務單位")
    
    # 地理資訊
    delivery_region = Column("deliveryRegion", String, nullable=True, comment="配送地區")
    supplier_region = Column("supplierRegion", String, nullable=True, comment="供應商所在地區")
    
    # 折扣與調整
    discount_amount = Column("discountAmount", DECIMAL(10, 2), nullable=True, default=0, comment="折扣金額")
    adjustment_amount = Column("adjustmentAmount", DECIMAL(10, 2), nullable=True, default=0, comment="調整金額")
    adjustment_reason = Column("adjustmentReason", String, nullable=True, comment="調整原因")
    
    # 退款處理
    refund_amount = Column("refundAmount", DECIMAL(10, 2), nullable=True, default=0, comment="退款金額")
    refund_date = Column("refundDate", DateTime(timezone=True), nullable=True, comment="退款日期")
    refund_reason = Column("refundReason", Text, nullable=True, comment="退款原因")
    
    # 結算狀態
    settlement_status = Column("settlementStatus", String, nullable=False, default="unsettled", 
                              comment="結算狀態: unsettled, settled, disputed")
    settlement_date = Column("settlementDate", DateTime(timezone=True), nullable=True, comment="結算日期")
    statement_id = Column("statementId", String, nullable=True, comment="對應帳單ID")
    
    # 標記與分類
    is_promotional = Column("isPromotional", Boolean, nullable=False, default=False, comment="是否為促銷交易")
    is_first_order = Column("isFirstOrder", Boolean, nullable=False, default=False, comment="是否為首單")
    payment_method = Column("paymentMethod", String, nullable=True, comment="付款方式")
    
    # 質量指標
    delivery_score = Column("deliveryScore", DECIMAL(3, 2), nullable=True, comment="配送評分")
    quality_score = Column("qualityScore", DECIMAL(3, 2), nullable=True, comment="品質評分")
    service_score = Column("serviceScore", DECIMAL(3, 2), nullable=True, comment="服務評分")
    
    # 擴展資訊
    custom_metadata = Column("metadata", JSON, nullable=False, default=dict, comment="擴展元數據")
    external_ref = Column("externalRef", String, nullable=True, comment="外部參考號")
    
    # 審計與追蹤
    processed_by = Column("processedBy", String, nullable=True, comment="處理人員")
    processed_at = Column("processedAt", DateTime(timezone=True), nullable=True, comment="處理時間")
    
    # 審計欄位
    created_by = Column("createdBy", String, nullable=False, comment="建立者")
    updated_by = Column("updatedBy", String, nullable=True, comment="修改者")
    
    # 關聯
    # rate_tier = relationship("TransactionRateTier", back_populates="transactions")
    # rate_config = relationship("BillingRateConfig", back_populates="transactions")
    
    # 添加索引
    __table_args__ = (
        Index('idx_transaction_id', 'transactionId'),
        Index('idx_order_id', 'orderId'),
        Index('idx_supplier_id', 'supplierId'),
        Index('idx_organization_id', 'organizationId'),
        Index('idx_transaction_date', 'transactionDate'),
        Index('idx_billing_period', 'billingPeriod'),
        Index('idx_status', 'status'),
        Index('idx_settlement_status', 'settlementStatus'),
        Index('idx_supplier_period', 'supplierId', 'billingPeriod'),
        Index('idx_supplier_date', 'supplierId', 'transactionDate'),
        Index('idx_settlement_date', 'settlementDate'),
        Index('idx_statement_id', 'statementId'),
    )
    
    def __repr__(self):
        return f"<BillingTransaction(id='{self.transaction_id}', supplier='{self.supplier_id}', amount={self.commission_amount})>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'transaction_id': self.transaction_id,
            'order_id': self.order_id,
            'supplier_id': self.supplier_id,
            'organization_id': self.organization_id,
            'customer_id': self.customer_id,
            'order_amount': float(self.order_amount),
            'commission_rate': float(self.commission_rate),
            'commission_amount': float(self.commission_amount),
            'rate_tier_id': self.rate_tier_id,
            'rate_config_id': self.rate_config_id,
            'transaction_date': self.transaction_date.isoformat() if self.transaction_date else None,
            'billing_period': self.billing_period,
            'status': self.status,
            'product_category': self.product_category,
            'business_unit': self.business_unit,
            'delivery_region': self.delivery_region,
            'supplier_region': self.supplier_region,
            'discount_amount': float(self.discount_amount) if self.discount_amount else 0,
            'adjustment_amount': float(self.adjustment_amount) if self.adjustment_amount else 0,
            'adjustment_reason': self.adjustment_reason,
            'refund_amount': float(self.refund_amount) if self.refund_amount else 0,
            'refund_date': self.refund_date.isoformat() if self.refund_date else None,
            'refund_reason': self.refund_reason,
            'settlement_status': self.settlement_status,
            'settlement_date': self.settlement_date.isoformat() if self.settlement_date else None,
            'statement_id': self.statement_id,
            'is_promotional': self.is_promotional,
            'is_first_order': self.is_first_order,
            'payment_method': self.payment_method,
            'delivery_score': float(self.delivery_score) if self.delivery_score else None,
            'quality_score': float(self.quality_score) if self.quality_score else None,
            'service_score': float(self.service_score) if self.service_score else None,
            'metadata': self.metadata,
            'external_ref': self.external_ref,
            'processed_by': self.processed_by,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'created_by': self.created_by,
            'updated_by': self.updated_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def get_net_commission(self) -> float:
        """獲取淨抽成金額（扣除折扣和調整）"""
        base_commission = float(self.commission_amount)
        discount = float(self.discount_amount) if self.discount_amount else 0
        adjustment = float(self.adjustment_amount) if self.adjustment_amount else 0
        refund = float(self.refund_amount) if self.refund_amount else 0
        
        return max(0, base_commission - discount + adjustment - refund)
    
    def is_settled(self) -> bool:
        """檢查是否已結算"""
        return self.settlement_status == 'settled'
    
    def is_disputed(self) -> bool:
        """檢查是否有爭議"""
        return self.settlement_status == 'disputed'
    
    def can_refund(self) -> bool:
        """檢查是否可以退款"""
        return (self.status in ['confirmed'] and 
                self.settlement_status != 'disputed' and
                (not self.refund_amount or self.refund_amount == 0))
    
    def can_adjust(self) -> bool:
        """檢查是否可以調整"""
        return (self.status in ['confirmed', 'pending'] and 
                self.settlement_status == 'unsettled')
    
    def calculate_commission_with_rate(self, new_rate: float) -> float:
        """使用新費率計算抽成"""
        return float(self.order_amount) * new_rate
    
    def get_quality_score_average(self) -> float:
        """獲取平均質量評分"""
        scores = [
            self.delivery_score,
            self.quality_score,
            self.service_score
        ]
        valid_scores = [float(score) for score in scores if score is not None]
        
        if not valid_scores:
            return 0.0
        
        return sum(valid_scores) / len(valid_scores)
    
    def mark_as_settled(self, statement_id: str, settled_by: str):
        """標記為已結算"""
        self.settlement_status = 'settled'
        self.settlement_date = func.now()
        self.statement_id = statement_id
        self.processed_by = settled_by
        self.processed_at = func.now()
        self.updated_by = settled_by
    
    def apply_refund(self, refund_amount: float, reason: str, processed_by: str):
        """應用退款"""
        if not self.can_refund():
            raise ValueError("Transaction cannot be refunded")
        
        self.refund_amount = refund_amount
        self.refund_date = func.now()
        self.refund_reason = reason
        self.processed_by = processed_by
        self.processed_at = func.now()
        self.updated_by = processed_by
        
        # 如果全額退款，更新狀態
        if refund_amount >= float(self.commission_amount):
            self.status = 'refunded'
    
    def apply_adjustment(self, adjustment_amount: float, reason: str, processed_by: str):
        """應用調整"""
        if not self.can_adjust():
            raise ValueError("Transaction cannot be adjusted")
        
        self.adjustment_amount = adjustment_amount
        self.adjustment_reason = reason
        self.processed_by = processed_by
        self.processed_at = func.now()
        self.updated_by = processed_by