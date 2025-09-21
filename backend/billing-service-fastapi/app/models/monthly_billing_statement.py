from sqlalchemy import Column, String, DECIMAL, Boolean, DateTime, Integer, Text, JSON, Index
from sqlalchemy.sql import func
from .base import BaseModel


class MonthlyBillingStatement(BaseModel):
    """
    月結帳單表
    Monthly billing statements for suppliers
    """
    __tablename__ = "monthly_billing_statements"

    # 基本資訊
    statement_number = Column("statementNumber", String, unique=True, nullable=False, comment="帳單編號")
    supplier_id = Column("supplierId", String, nullable=False, comment="供應商ID")
    organization_id = Column("organizationId", String, nullable=False, comment="組織ID")
    
    # 計費周期
    billing_period = Column("billingPeriod", String, nullable=False, comment="計費周期 (YYYY-MM)")
    period_start = Column("periodStart", DateTime(timezone=True), nullable=False, comment="周期開始日期")
    period_end = Column("periodEnd", DateTime(timezone=True), nullable=False, comment="周期結束日期")
    
    # 訂閱費用
    subscription_fee = Column("subscriptionFee", DECIMAL(10, 2), nullable=False, default=0, comment="訂閱月費")
    setup_fee = Column("setupFee", DECIMAL(10, 2), nullable=False, default=0, comment="設定費用")
    
    # 交易統計
    total_orders = Column("totalOrders", Integer, nullable=False, default=0, comment="總訂單數")
    total_gmv = Column("totalGMV", DECIMAL(15, 2), nullable=False, default=0, comment="總交易額")
    confirmed_orders = Column("confirmedOrders", Integer, nullable=False, default=0, comment="確認訂單數")
    confirmed_gmv = Column("confirmedGMV", DECIMAL(15, 2), nullable=False, default=0, comment="確認交易額")
    
    # 抽成計算
    gross_commission = Column("grossCommission", DECIMAL(12, 2), nullable=False, default=0, comment="總抽成金額")
    commission_adjustments = Column("commissionAdjustments", DECIMAL(12, 2), nullable=False, default=0, comment="抽成調整")
    commission_discounts = Column("commissionDiscounts", DECIMAL(12, 2), nullable=False, default=0, comment="抽成折扣")
    commission_refunds = Column("commissionRefunds", DECIMAL(12, 2), nullable=False, default=0, comment="抽成退款")
    net_commission = Column("netCommission", DECIMAL(12, 2), nullable=False, default=0, comment="淨抽成金額")
    
    # 增值服務費用
    addon_services_fee = Column("addonServicesFee", DECIMAL(10, 2), nullable=False, default=0, comment="增值服務費")
    storage_fee = Column("storageFee", DECIMAL(8, 2), nullable=False, default=0, comment="倉儲費用")
    api_overage_fee = Column("apiOverageFee", DECIMAL(8, 2), nullable=False, default=0, comment="API超量費用")
    
    # 總計金額
    subtotal = Column("subtotal", DECIMAL(12, 2), nullable=False, comment="小計")
    tax_rate = Column("taxRate", DECIMAL(5, 4), nullable=False, default=0.05, comment="稅率")
    tax_amount = Column("taxAmount", DECIMAL(10, 2), nullable=False, default=0, comment="稅額")
    total_amount = Column("totalAmount", DECIMAL(12, 2), nullable=False, comment="總金額")
    
    # 帳單狀態
    status = Column("status", String, nullable=False, default="draft", 
                   comment="帳單狀態: draft, sent, paid, overdue, cancelled, disputed")
    
    # 時間追蹤
    generated_date = Column("generatedDate", DateTime(timezone=True), nullable=False, 
                           server_default=func.now(), comment="生成日期")
    sent_date = Column("sentDate", DateTime(timezone=True), nullable=True, comment="發送日期")
    due_date = Column("dueDate", DateTime(timezone=True), nullable=True, comment="到期日期")
    paid_date = Column("paidDate", DateTime(timezone=True), nullable=True, comment="付款日期")
    
    # 付款資訊
    payment_method = Column("paymentMethod", String, nullable=True, comment="付款方式")
    payment_reference = Column("paymentReference", String, nullable=True, comment="付款參考號")
    paid_amount = Column("paidAmount", DECIMAL(12, 2), nullable=True, default=0, comment="已付金額")
    
    # 逾期處理
    overdue_days = Column("overdueDays", Integer, nullable=False, default=0, comment="逾期天數")
    late_fee = Column("lateFee", DECIMAL(8, 2), nullable=False, default=0, comment="滯納金")
    
    # 爭議處理
    dispute_reason = Column("disputeReason", Text, nullable=True, comment="爭議原因")
    dispute_amount = Column("disputeAmount", DECIMAL(10, 2), nullable=True, comment="爭議金額")
    dispute_resolved_date = Column("disputeResolvedDate", DateTime(timezone=True), nullable=True, comment="爭議解決日期")
    
    # 費率資訊
    applied_rate_tier = Column("appliedRateTier", String, nullable=True, comment="適用費率分級")
    average_commission_rate = Column("averageCommissionRate", DECIMAL(5, 4), nullable=True, comment="平均抽成費率")
    
    # 質量指標
    average_delivery_score = Column("averageDeliveryScore", DECIMAL(3, 2), nullable=True, comment="平均配送評分")
    average_quality_score = Column("averageQualityScore", DECIMAL(3, 2), nullable=True, comment="平均品質評分")
    average_service_score = Column("averageServiceScore", DECIMAL(3, 2), nullable=True, comment="平均服務評分")
    
    # 分類統計
    category_breakdown = Column("categoryBreakdown", JSON, nullable=False, default=dict, comment="分類明細")
    region_breakdown = Column("regionBreakdown", JSON, nullable=False, default=dict, comment="地區明細")
    
    # 備註與附件
    notes = Column("notes", Text, nullable=True, comment="備註")
    attachment_urls = Column("attachmentUrls", JSON, nullable=False, default=list, comment="附件URLs")
    
    # 處理記錄
    generated_by = Column("generatedBy", String, nullable=False, comment="生成者")
    approved_by = Column("approvedBy", String, nullable=True, comment="審批者")
    approved_date = Column("approvedDate", DateTime(timezone=True), nullable=True, comment="審批日期")
    
    # 審計欄位
    created_by = Column("createdBy", String, nullable=False, comment="建立者")
    updated_by = Column("updatedBy", String, nullable=True, comment="修改者")
    
    # 添加索引
    __table_args__ = (
        Index('idx_statement_number', 'statementNumber'),
        Index('idx_supplier_id', 'supplierId'),
        Index('idx_organization_id', 'organizationId'),
        Index('idx_billing_period', 'billingPeriod'),
        Index('idx_status', 'status'),
        Index('idx_due_date', 'dueDate'),
        Index('idx_generated_date', 'generatedDate'),
        Index('idx_supplier_period', 'supplierId', 'billingPeriod'),
        Index('idx_supplier_status', 'supplierId', 'status'),
        Index('idx_period_dates', 'periodStart', 'periodEnd'),
    )
    
    def __repr__(self):
        return f"<MonthlyBillingStatement(number='{self.statement_number}', supplier='{self.supplier_id}', period='{self.billing_period}')>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'statement_number': self.statement_number,
            'supplier_id': self.supplier_id,
            'organization_id': self.organization_id,
            'billing_period': self.billing_period,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'subscription_fee': float(self.subscription_fee),
            'setup_fee': float(self.setup_fee),
            'total_orders': self.total_orders,
            'total_gmv': float(self.total_gmv),
            'confirmed_orders': self.confirmed_orders,
            'confirmed_gmv': float(self.confirmed_gmv),
            'gross_commission': float(self.gross_commission),
            'commission_adjustments': float(self.commission_adjustments),
            'commission_discounts': float(self.commission_discounts),
            'commission_refunds': float(self.commission_refunds),
            'net_commission': float(self.net_commission),
            'addon_services_fee': float(self.addon_services_fee),
            'storage_fee': float(self.storage_fee),
            'api_overage_fee': float(self.api_overage_fee),
            'subtotal': float(self.subtotal),
            'tax_rate': float(self.tax_rate),
            'tax_amount': float(self.tax_amount),
            'total_amount': float(self.total_amount),
            'status': self.status,
            'generated_date': self.generated_date.isoformat() if self.generated_date else None,
            'sent_date': self.sent_date.isoformat() if self.sent_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'paid_date': self.paid_date.isoformat() if self.paid_date else None,
            'payment_method': self.payment_method,
            'payment_reference': self.payment_reference,
            'paid_amount': float(self.paid_amount) if self.paid_amount else 0,
            'overdue_days': self.overdue_days,
            'late_fee': float(self.late_fee),
            'dispute_reason': self.dispute_reason,
            'dispute_amount': float(self.dispute_amount) if self.dispute_amount else None,
            'dispute_resolved_date': self.dispute_resolved_date.isoformat() if self.dispute_resolved_date else None,
            'applied_rate_tier': self.applied_rate_tier,
            'average_commission_rate': float(self.average_commission_rate) if self.average_commission_rate else None,
            'average_delivery_score': float(self.average_delivery_score) if self.average_delivery_score else None,
            'average_quality_score': float(self.average_quality_score) if self.average_quality_score else None,
            'average_service_score': float(self.average_service_score) if self.average_service_score else None,
            'category_breakdown': self.category_breakdown,
            'region_breakdown': self.region_breakdown,
            'notes': self.notes,
            'attachment_urls': self.attachment_urls,
            'generated_by': self.generated_by,
            'approved_by': self.approved_by,
            'approved_date': self.approved_date.isoformat() if self.approved_date else None,
            'created_by': self.created_by,
            'updated_by': self.updated_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def is_overdue(self) -> bool:
        """檢查是否逾期"""
        if not self.due_date or self.status in ['paid', 'cancelled']:
            return False
        
        from datetime import datetime
        return datetime.utcnow() > self.due_date
    
    def calculate_overdue_days(self) -> int:
        """計算逾期天數"""
        if not self.is_overdue():
            return 0
        
        from datetime import datetime
        now = datetime.utcnow()
        delta = now - self.due_date
        return delta.days
    
    def get_outstanding_amount(self) -> float:
        """獲取未付金額"""
        total = float(self.total_amount) + float(self.late_fee)
        paid = float(self.paid_amount) if self.paid_amount else 0
        return max(0, total - paid)
    
    def is_fully_paid(self) -> bool:
        """檢查是否已全額付款"""
        return self.get_outstanding_amount() <= 0.01  # 允許1分錢的誤差
    
    def can_apply_late_fee(self) -> bool:
        """檢查是否可以收取滯納金"""
        return (self.is_overdue() and 
                self.status != 'paid' and 
                self.late_fee == 0)
    
    def calculate_late_fee(self, daily_rate: float = 0.001) -> float:
        """計算滯納金"""
        if not self.can_apply_late_fee():
            return 0
        
        overdue_days = self.calculate_overdue_days()
        outstanding = self.get_outstanding_amount()
        return outstanding * daily_rate * overdue_days
    
    def mark_as_sent(self, sent_by: str):
        """標記為已發送"""
        self.status = 'sent'
        self.sent_date = func.now()
        self.updated_by = sent_by
    
    def mark_as_paid(self, payment_method: str, payment_reference: str, paid_amount: float, paid_by: str):
        """標記為已付款"""
        self.status = 'paid'
        self.paid_date = func.now()
        self.payment_method = payment_method
        self.payment_reference = payment_reference
        self.paid_amount = paid_amount
        self.updated_by = paid_by
    
    def create_dispute(self, reason: str, amount: float, created_by: str):
        """建立爭議"""
        self.status = 'disputed'
        self.dispute_reason = reason
        self.dispute_amount = amount
        self.updated_by = created_by
    
    def resolve_dispute(self, resolved_by: str):
        """解決爭議"""
        if self.status == 'disputed':
            self.status = 'sent'  # 或其他適當狀態
            self.dispute_resolved_date = func.now()
            self.updated_by = resolved_by
    
    def generate_statement_number(self, supplier_code: str = None) -> str:
        """生成帳單編號"""
        if supplier_code:
            prefix = f"STMT-{supplier_code}-{self.billing_period}"
        else:
            prefix = f"STMT-{self.billing_period}"
        
        from datetime import datetime
        timestamp = int(datetime.utcnow().timestamp())
        return f"{prefix}-{timestamp}"