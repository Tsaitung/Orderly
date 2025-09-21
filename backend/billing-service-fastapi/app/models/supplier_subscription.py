from sqlalchemy import Column, String, DECIMAL, Boolean, DateTime, Integer, Text, JSON, Index, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import BaseModel


class SupplierSubscription(BaseModel):
    """
    供應商訂閱記錄表
    Tracks supplier subscription history and current status
    """
    __tablename__ = "supplier_subscriptions"

    # 關聯資訊
    supplier_id = Column("supplierId", String, nullable=False, comment="供應商ID")
    organization_id = Column("organizationId", String, nullable=False, comment="組織ID")
    plan_id = Column("planId", String, ForeignKey("subscription_plans.id"), nullable=False, comment="訂閱方案ID")
    
    # 訂閱狀態
    status = Column("status", String, nullable=False, default="active", 
                   comment="訂閱狀態: active, paused, cancelled, expired, trial")
    
    # 計費週期
    billing_cycle = Column("billingCycle", String, nullable=False, default="monthly", 
                          comment="計費週期: monthly, annual")
    
    # 時間資訊
    start_date = Column("startDate", DateTime(timezone=True), nullable=False, comment="訂閱開始日期")
    end_date = Column("endDate", DateTime(timezone=True), nullable=True, comment="訂閱結束日期")
    trial_end_date = Column("trialEndDate", DateTime(timezone=True), nullable=True, comment="試用結束日期")
    next_billing_date = Column("nextBillingDate", DateTime(timezone=True), nullable=True, comment="下次計費日期")
    cancelled_at = Column("cancelledAt", DateTime(timezone=True), nullable=True, comment="取消時間")
    
    # 價格資訊
    monthly_price = Column("monthlyPrice", DECIMAL(10, 2), nullable=False, comment="月費價格")
    setup_fee_paid = Column("setupFeePaid", DECIMAL(10, 2), nullable=True, default=0, comment="已付設定費")
    discount_amount = Column("discountAmount", DECIMAL(10, 2), nullable=True, default=0, comment="折扣金額")
    
    # 使用統計
    current_month_orders = Column("currentMonthOrders", Integer, nullable=False, default=0, comment="本月訂單數")
    current_month_gmv = Column("currentMonthGMV", DECIMAL(15, 2), nullable=False, default=0, comment="本月GMV")
    total_orders = Column("totalOrders", Integer, nullable=False, default=0, comment="總訂單數")
    total_gmv = Column("totalGMV", DECIMAL(15, 2), nullable=False, default=0, comment="總GMV")
    
    # 配額使用情況
    used_products = Column("usedProducts", Integer, nullable=False, default=0, comment="已使用產品數")
    used_locations = Column("usedLocations", Integer, nullable=False, default=0, comment="已使用配送地點數")
    used_api_calls = Column("usedApiCalls", Integer, nullable=False, default=0, comment="已使用API呼叫次數")
    used_storage_gb = Column("usedStorageGB", DECIMAL(8, 2), nullable=False, default=0, comment="已使用存儲空間")
    
    # 自動續費設定
    auto_renew = Column("autoRenew", Boolean, nullable=False, default=True, comment="自動續費")
    payment_method_id = Column("paymentMethodId", String, nullable=True, comment="付款方式ID")
    
    # 取消相關
    cancellation_reason = Column("cancellationReason", String, nullable=True, comment="取消原因")
    cancellation_notes = Column("cancellationNotes", Text, nullable=True, comment="取消備註")
    cancelled_by = Column("cancelledBy", String, nullable=True, comment="取消操作人")
    
    # 促銷相關
    promo_code = Column("promoCode", String, nullable=True, comment="促銷代碼")
    referral_id = Column("referralId", String, nullable=True, comment="推薦人ID")
    
    # 擴展資訊
    custom_metadata = Column("metadata", JSON, nullable=False, default=dict, comment="擴展元數據")
    
    # 審計欄位
    created_by = Column("createdBy", String, nullable=False, comment="建立者")
    updated_by = Column("updatedBy", String, nullable=True, comment="修改者")
    
    # 關聯
    # plan = relationship("SubscriptionPlan", back_populates="subscriptions")
    
    # 添加索引
    __table_args__ = (
        Index('idx_supplier_id', 'supplierId'),
        Index('idx_organization_id', 'organizationId'),
        Index('idx_status', 'status'),
        Index('idx_billing_cycle', 'billingCycle'),
        Index('idx_next_billing_date', 'nextBillingDate'),
        Index('idx_supplier_status', 'supplierId', 'status'),
        Index('idx_start_end_date', 'startDate', 'endDate'),
    )
    
    def __repr__(self):
        return f"<SupplierSubscription(supplier_id='{self.supplier_id}', plan_id='{self.plan_id}', status='{self.status}')>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'supplier_id': self.supplier_id,
            'organization_id': self.organization_id,
            'plan_id': self.plan_id,
            'status': self.status,
            'billing_cycle': self.billing_cycle,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'trial_end_date': self.trial_end_date.isoformat() if self.trial_end_date else None,
            'next_billing_date': self.next_billing_date.isoformat() if self.next_billing_date else None,
            'cancelled_at': self.cancelled_at.isoformat() if self.cancelled_at else None,
            'monthly_price': float(self.monthly_price),
            'setup_fee_paid': float(self.setup_fee_paid) if self.setup_fee_paid else 0,
            'discount_amount': float(self.discount_amount) if self.discount_amount else 0,
            'current_month_orders': self.current_month_orders,
            'current_month_gmv': float(self.current_month_gmv),
            'total_orders': self.total_orders,
            'total_gmv': float(self.total_gmv),
            'used_products': self.used_products,
            'used_locations': self.used_locations,
            'used_api_calls': self.used_api_calls,
            'used_storage_gb': float(self.used_storage_gb),
            'auto_renew': self.auto_renew,
            'payment_method_id': self.payment_method_id,
            'cancellation_reason': self.cancellation_reason,
            'cancellation_notes': self.cancellation_notes,
            'cancelled_by': self.cancelled_by,
            'promo_code': self.promo_code,
            'referral_id': self.referral_id,
            'metadata': self.custom_metadata,
            'created_by': self.created_by,
            'updated_by': self.updated_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def is_active(self) -> bool:
        """檢查訂閱是否為活躍狀態"""
        return self.status == 'active'
    
    def is_trial(self) -> bool:
        """檢查是否為試用期"""
        return self.status == 'trial'
    
    def is_expired(self) -> bool:
        """檢查是否已過期"""
        if self.status == 'expired':
            return True
        if self.end_date and self.end_date < func.now():
            return True
        return False
    
    def days_until_expiry(self) -> int:
        """計算距離到期天數"""
        if not self.end_date:
            return -1  # 無到期日
        
        from datetime import datetime
        now = datetime.utcnow()
        if self.end_date < now:
            return 0  # 已過期
        
        delta = self.end_date - now
        return delta.days
    
    def get_effective_monthly_price(self) -> float:
        """獲取有效月費（扣除折扣）"""
        base_price = float(self.monthly_price)
        discount = float(self.discount_amount) if self.discount_amount else 0
        return max(0, base_price - discount)
    
    def can_upgrade_to_plan(self, target_plan_id: str) -> bool:
        """檢查是否可以升級到指定方案"""
        if not self.is_active():
            return False
        # 這裡可以添加更多業務邏輯檢查
        return True
    
    def update_usage_stats(self, orders_delta: int = 0, gmv_delta: float = 0):
        """更新使用統計"""
        self.current_month_orders += orders_delta
        self.total_orders += orders_delta
        self.current_month_gmv += gmv_delta
        self.total_gmv += gmv_delta
    
    def reset_monthly_usage(self):
        """重置月度使用統計（月初調用）"""
        self.current_month_orders = 0
        self.current_month_gmv = 0
        self.used_api_calls = 0  # 如果API限制是月度的話
    
    def get_quota_usage_percentage(self, quota_type: str) -> float:
        """獲取配額使用百分比"""
        # 這裡需要與 SubscriptionPlan 關聯來獲取限制
        # 暫時返回 0，實際實現時需要注入 plan 資訊
        return 0.0
    
    def is_within_quota(self, quota_type: str) -> bool:
        """檢查是否在配額範圍內"""
        # 這裡需要與 SubscriptionPlan 關聯來檢查限制
        # 暫時返回 True，實際實現時需要注入 plan 資訊
        return True