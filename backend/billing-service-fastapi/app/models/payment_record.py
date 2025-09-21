from sqlalchemy import Column, String, DECIMAL, Boolean, DateTime, Integer, Text, JSON, Index, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import BaseModel


class PaymentRecord(BaseModel):
    """
    付款記錄表
    Payment transaction records for supplier billing
    """
    __tablename__ = "payment_records"

    # 付款基本資訊
    payment_id = Column("paymentId", String, unique=True, nullable=False, comment="付款ID")
    statement_id = Column("statementId", String, ForeignKey("monthly_billing_statements.id"), nullable=True, comment="關聯帳單ID")
    supplier_id = Column("supplierId", String, nullable=False, comment="供應商ID")
    organization_id = Column("organizationId", String, nullable=False, comment="組織ID")
    
    # 付款金額
    payment_amount = Column("paymentAmount", DECIMAL(12, 2), nullable=False, comment="付款金額")
    currency = Column("currency", String, nullable=False, default="TWD", comment="幣種")
    
    # 付款方式
    payment_method = Column("paymentMethod", String, nullable=False, 
                           comment="付款方式: credit_card, bank_transfer, ecpay, newebpay, cash")
    payment_gateway = Column("paymentGateway", String, nullable=True, comment="付款閘道")
    
    # 外部參考
    external_transaction_id = Column("externalTransactionId", String, nullable=True, comment="外部交易ID")
    gateway_reference = Column("gatewayReference", String, nullable=True, comment="閘道參考號")
    bank_reference = Column("bankReference", String, nullable=True, comment="銀行參考號")
    
    # 付款狀態
    status = Column("status", String, nullable=False, default="pending", 
                   comment="付款狀態: pending, processing, completed, failed, cancelled, refunded")
    
    # 時間資訊
    payment_date = Column("paymentDate", DateTime(timezone=True), nullable=False, comment="付款日期")
    processed_date = Column("processedDate", DateTime(timezone=True), nullable=True, comment="處理日期")
    settled_date = Column("settledDate", DateTime(timezone=True), nullable=True, comment="清算日期")
    
    # 信用卡資訊（加密存儲）
    card_last_four = Column("cardLastFour", String, nullable=True, comment="卡號後四碼")
    card_brand = Column("cardBrand", String, nullable=True, comment="卡片品牌")
    card_expiry_month = Column("cardExpiryMonth", Integer, nullable=True, comment="到期月份")
    card_expiry_year = Column("cardExpiryYear", Integer, nullable=True, comment="到期年份")
    
    # 銀行轉帳資訊
    bank_code = Column("bankCode", String, nullable=True, comment="銀行代碼")
    bank_name = Column("bankName", String, nullable=True, comment="銀行名稱")
    account_number_masked = Column("accountNumberMasked", String, nullable=True, comment="帳號遮罩")
    
    # 手續費
    gateway_fee = Column("gatewayFee", DECIMAL(8, 2), nullable=True, default=0, comment="閘道手續費")
    bank_fee = Column("bankFee", DECIMAL(8, 2), nullable=True, default=0, comment="銀行手續費")
    total_fees = Column("totalFees", DECIMAL(8, 2), nullable=True, default=0, comment="總手續費")
    net_amount = Column("netAmount", DECIMAL(12, 2), nullable=True, comment="淨收金額")
    
    # 失敗處理
    failure_reason = Column("failureReason", String, nullable=True, comment="失敗原因")
    failure_code = Column("failureCode", String, nullable=True, comment="失敗代碼")
    retry_count = Column("retryCount", Integer, nullable=False, default=0, comment="重試次數")
    max_retries = Column("maxRetries", Integer, nullable=False, default=3, comment="最大重試次數")
    
    # 退款資訊
    refund_amount = Column("refundAmount", DECIMAL(12, 2), nullable=True, default=0, comment="退款金額")
    refund_date = Column("refundDate", DateTime(timezone=True), nullable=True, comment="退款日期")
    refund_reason = Column("refundReason", Text, nullable=True, comment="退款原因")
    refund_reference = Column("refundReference", String, nullable=True, comment="退款參考號")
    
    # 風控資訊
    risk_score = Column("riskScore", DECIMAL(5, 2), nullable=True, comment="風險評分")
    fraud_check_status = Column("fraudCheckStatus", String, nullable=True, comment="反欺詐檢查狀態")
    ip_address = Column("ipAddress", String, nullable=True, comment="IP地址")
    user_agent = Column("userAgent", Text, nullable=True, comment="用戶代理")
    
    # 分期付款
    installment_plan = Column("installmentPlan", String, nullable=True, comment="分期方案")
    installment_count = Column("installmentCount", Integer, nullable=True, comment="分期期數")
    current_installment = Column("currentInstallment", Integer, nullable=True, comment="當前期數")
    
    # 自動扣款
    is_auto_payment = Column("isAutoPayment", Boolean, nullable=False, default=False, comment="是否自動扣款")
    recurring_payment_id = Column("recurringPaymentId", String, nullable=True, comment="定期付款ID")
    
    # 通知狀態
    customer_notified = Column("customerNotified", Boolean, nullable=False, default=False, comment="是否已通知客戶")
    notification_sent_at = Column("notificationSentAt", DateTime(timezone=True), nullable=True, comment="通知發送時間")
    
    # 擴展資訊
    custom_metadata = Column("metadata", JSON, nullable=False, default=dict, comment="擴展元數據")
    gateway_response = Column("gatewayResponse", JSON, nullable=False, default=dict, comment="閘道回應")
    
    # 審計欄位
    processed_by = Column("processedBy", String, nullable=True, comment="處理人員")
    created_by = Column("createdBy", String, nullable=False, comment="建立者")
    updated_by = Column("updatedBy", String, nullable=True, comment="修改者")
    
    # 關聯
    # statement = relationship("MonthlyBillingStatement", back_populates="payments")
    
    # 添加索引
    __table_args__ = (
        Index('idx_payment_id', 'paymentId'),
        Index('idx_statement_id', 'statementId'),
        Index('idx_supplier_id', 'supplierId'),
        Index('idx_organization_id', 'organizationId'),
        Index('idx_status', 'status'),
        Index('idx_payment_date', 'paymentDate'),
        Index('idx_payment_method', 'paymentMethod'),
        Index('idx_external_transaction_id', 'externalTransactionId'),
        Index('idx_gateway_reference', 'gatewayReference'),
        Index('idx_supplier_date', 'supplierId', 'paymentDate'),
        Index('idx_supplier_status', 'supplierId', 'status'),
        Index('idx_processed_date', 'processedDate'),
    )
    
    def __repr__(self):
        return f"<PaymentRecord(id='{self.payment_id}', supplier='{self.supplier_id}', amount={self.payment_amount}, status='{self.status}')>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'payment_id': self.payment_id,
            'statement_id': self.statement_id,
            'supplier_id': self.supplier_id,
            'organization_id': self.organization_id,
            'payment_amount': float(self.payment_amount),
            'currency': self.currency,
            'payment_method': self.payment_method,
            'payment_gateway': self.payment_gateway,
            'external_transaction_id': self.external_transaction_id,
            'gateway_reference': self.gateway_reference,
            'bank_reference': self.bank_reference,
            'status': self.status,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'processed_date': self.processed_date.isoformat() if self.processed_date else None,
            'settled_date': self.settled_date.isoformat() if self.settled_date else None,
            'card_last_four': self.card_last_four,
            'card_brand': self.card_brand,
            'card_expiry_month': self.card_expiry_month,
            'card_expiry_year': self.card_expiry_year,
            'bank_code': self.bank_code,
            'bank_name': self.bank_name,
            'account_number_masked': self.account_number_masked,
            'gateway_fee': float(self.gateway_fee) if self.gateway_fee else 0,
            'bank_fee': float(self.bank_fee) if self.bank_fee else 0,
            'total_fees': float(self.total_fees) if self.total_fees else 0,
            'net_amount': float(self.net_amount) if self.net_amount else None,
            'failure_reason': self.failure_reason,
            'failure_code': self.failure_code,
            'retry_count': self.retry_count,
            'max_retries': self.max_retries,
            'refund_amount': float(self.refund_amount) if self.refund_amount else 0,
            'refund_date': self.refund_date.isoformat() if self.refund_date else None,
            'refund_reason': self.refund_reason,
            'refund_reference': self.refund_reference,
            'risk_score': float(self.risk_score) if self.risk_score else None,
            'fraud_check_status': self.fraud_check_status,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'installment_plan': self.installment_plan,
            'installment_count': self.installment_count,
            'current_installment': self.current_installment,
            'is_auto_payment': self.is_auto_payment,
            'recurring_payment_id': self.recurring_payment_id,
            'customer_notified': self.customer_notified,
            'notification_sent_at': self.notification_sent_at.isoformat() if self.notification_sent_at else None,
            'metadata': self.metadata,
            'gateway_response': self.gateway_response,
            'processed_by': self.processed_by,
            'created_by': self.created_by,
            'updated_by': self.updated_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def is_successful(self) -> bool:
        """檢查付款是否成功"""
        return self.status == 'completed'
    
    def is_pending(self) -> bool:
        """檢查付款是否待處理"""
        return self.status in ['pending', 'processing']
    
    def is_failed(self) -> bool:
        """檢查付款是否失敗"""
        return self.status in ['failed', 'cancelled']
    
    def can_retry(self) -> bool:
        """檢查是否可以重試"""
        return (self.is_failed() and 
                self.retry_count < self.max_retries)
    
    def can_refund(self) -> bool:
        """檢查是否可以退款"""
        return (self.is_successful() and 
                (not self.refund_amount or self.refund_amount == 0))
    
    def get_net_payment_amount(self) -> float:
        """獲取淨付款金額（扣除手續費）"""
        base_amount = float(self.payment_amount)
        fees = float(self.total_fees) if self.total_fees else 0
        return base_amount - fees
    
    def calculate_total_fees(self) -> float:
        """計算總手續費"""
        gateway_fee = float(self.gateway_fee) if self.gateway_fee else 0
        bank_fee = float(self.bank_fee) if self.bank_fee else 0
        return gateway_fee + bank_fee
    
    def mark_as_completed(self, gateway_reference: str = None, processed_by: str = None):
        """標記為完成"""
        self.status = 'completed'
        self.processed_date = func.now()
        if gateway_reference:
            self.gateway_reference = gateway_reference
        if processed_by:
            self.processed_by = processed_by
            self.updated_by = processed_by
        
        # 計算淨收金額
        self.total_fees = self.calculate_total_fees()
        self.net_amount = self.get_net_payment_amount()
    
    def mark_as_failed(self, failure_reason: str, failure_code: str = None, processed_by: str = None):
        """標記為失敗"""
        self.status = 'failed'
        self.processed_date = func.now()
        self.failure_reason = failure_reason
        if failure_code:
            self.failure_code = failure_code
        if processed_by:
            self.processed_by = processed_by
            self.updated_by = processed_by
    
    def increment_retry_count(self, updated_by: str = None):
        """增加重試次數"""
        self.retry_count += 1
        if updated_by:
            self.updated_by = updated_by
    
    def process_refund(self, refund_amount: float, reason: str, processed_by: str) -> bool:
        """處理退款"""
        if not self.can_refund():
            return False
        
        # 部分退款或全額退款
        total_refund = float(self.refund_amount) if self.refund_amount else 0
        new_total_refund = total_refund + refund_amount
        
        # 檢查退款金額不能超過原付款金額
        if new_total_refund > float(self.payment_amount):
            return False
        
        self.refund_amount = new_total_refund
        self.refund_date = func.now()
        self.refund_reason = reason
        self.processed_by = processed_by
        self.updated_by = processed_by
        
        # 如果全額退款，更新狀態
        if new_total_refund >= float(self.payment_amount):
            self.status = 'refunded'
        
        return True
    
    def set_installment_info(self, plan: str, total_count: int, current: int = 1):
        """設定分期資訊"""
        self.installment_plan = plan
        self.installment_count = total_count
        self.current_installment = current
    
    def update_risk_assessment(self, risk_score: float, fraud_status: str):
        """更新風險評估"""
        self.risk_score = risk_score
        self.fraud_check_status = fraud_status
    
    def send_notification(self, notification_service=None):
        """發送付款通知"""
        if not self.customer_notified:
            # 這裡會調用通知服務
            # if notification_service:
            #     notification_service.send_payment_notification(self)
            
            self.customer_notified = True
            self.notification_sent_at = func.now()
    
    def generate_payment_id(self, prefix: str = "PAY") -> str:
        """生成付款ID"""
        from datetime import datetime
        timestamp = int(datetime.utcnow().timestamp())
        return f"{prefix}-{timestamp}-{self.supplier_id[:8].upper()}"