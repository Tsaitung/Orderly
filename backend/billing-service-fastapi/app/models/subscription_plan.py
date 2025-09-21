from sqlalchemy import Column, String, DECIMAL, Boolean, DateTime, Integer, Text, JSON, Index
from sqlalchemy.sql import func
from .base import BaseModel


class SubscriptionPlan(BaseModel):
    """
    訂閱方案定義表
    Subscription plan definitions for suppliers
    """
    __tablename__ = "subscription_plans"

    plan_code = Column("planCode", String, unique=True, nullable=False, comment="方案代碼")
    plan_name = Column("planName", String, nullable=False, comment="方案名稱")
    plan_name_en = Column("planNameEn", String, nullable=True, comment="英文方案名稱")
    description = Column("description", Text, nullable=True, comment="方案描述")
    
    # 定價資訊
    monthly_price = Column("monthlyPrice", DECIMAL(10, 2), nullable=False, default=0, comment="月費")
    annual_price = Column("annualPrice", DECIMAL(10, 2), nullable=True, comment="年費")
    setup_fee = Column("setupFee", DECIMAL(10, 2), nullable=True, default=0, comment="設定費")
    
    # 方案層級
    tier_level = Column("tierLevel", Integer, nullable=False, comment="方案層級 (1=免費, 2=專業, 3=企業, 4=集團)")
    display_order = Column("displayOrder", Integer, nullable=False, comment="顯示順序")
    
    # 限制與配額
    max_monthly_orders = Column("maxMonthlyOrders", Integer, nullable=True, comment="月訂單數限制")
    max_products = Column("maxProducts", Integer, nullable=True, comment="產品數限制")
    max_locations = Column("maxLocations", Integer, nullable=True, comment="配送地點限制")
    max_api_calls = Column("maxApiCalls", Integer, nullable=True, comment="API 呼叫次數限制")
    storage_quota_gb = Column("storageQuotaGB", Integer, nullable=True, comment="存儲空間限制 (GB)")
    
    # 功能開關
    features = Column("features", JSON, nullable=False, default=dict, comment="包含功能列表")
    restrictions = Column("restrictions", JSON, nullable=False, default=dict, comment="限制設定")
    
    # 狀態控制
    is_active = Column("isActive", Boolean, nullable=False, default=True, comment="是否啟用")
    is_public = Column("isPublic", Boolean, nullable=False, default=True, comment="是否公開顯示")
    is_popular = Column("isPopular", Boolean, nullable=False, default=False, comment="是否為熱門方案")
    
    # 銷售相關
    commission_rate_override = Column("commissionRateOverride", DECIMAL(5, 4), nullable=True, 
                                    comment="覆蓋抽成費率")
    free_trial_days = Column("freeTrialDays", Integer, nullable=True, default=0, comment="免費試用天數")
    
    # 促銷設定
    promotional_price = Column("promotionalPrice", DECIMAL(10, 2), nullable=True, comment="促銷價格")
    promo_start_date = Column("promoStartDate", DateTime(timezone=True), nullable=True, comment="促銷開始日期")
    promo_end_date = Column("promoEndDate", DateTime(timezone=True), nullable=True, comment="促銷結束日期")
    
    # 生效期間
    effective_from = Column("effectiveFrom", DateTime(timezone=True), nullable=False, 
                          server_default=func.now(), comment="生效開始時間")
    effective_to = Column("effectiveTo", DateTime(timezone=True), nullable=True, comment="生效結束時間")
    
    # 審計欄位
    created_by = Column("createdBy", String, nullable=False, comment="建立者")
    updated_by = Column("updatedBy", String, nullable=True, comment="修改者")
    
    # 添加索引
    __table_args__ = (
        Index('idx_plan_code', 'planCode'),
        Index('idx_tier_level', 'tierLevel'),
        Index('idx_display_order', 'displayOrder'),
        Index('idx_active_public', 'isActive', 'isPublic'),
    )
    
    def __repr__(self):
        return f"<SubscriptionPlan(code='{self.plan_code}', name='{self.plan_name}', tier={self.tier_level})>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'plan_code': self.plan_code,
            'plan_name': self.plan_name,
            'plan_name_en': self.plan_name_en,
            'description': self.description,
            'monthly_price': float(self.monthly_price),
            'annual_price': float(self.annual_price) if self.annual_price else None,
            'setup_fee': float(self.setup_fee) if self.setup_fee else 0,
            'tier_level': self.tier_level,
            'display_order': self.display_order,
            'max_monthly_orders': self.max_monthly_orders,
            'max_products': self.max_products,
            'max_locations': self.max_locations,
            'max_api_calls': self.max_api_calls,
            'storage_quota_gb': self.storage_quota_gb,
            'features': self.features,
            'restrictions': self.restrictions,
            'is_active': self.is_active,
            'is_public': self.is_public,
            'is_popular': self.is_popular,
            'commission_rate_override': float(self.commission_rate_override) if self.commission_rate_override else None,
            'free_trial_days': self.free_trial_days,
            'promotional_price': float(self.promotional_price) if self.promotional_price else None,
            'promo_start_date': self.promo_start_date.isoformat() if self.promo_start_date else None,
            'promo_end_date': self.promo_end_date.isoformat() if self.promo_end_date else None,
            'effective_from': self.effective_from.isoformat() if self.effective_from else None,
            'effective_to': self.effective_to.isoformat() if self.effective_to else None,
            'created_by': self.created_by,
            'updated_by': self.updated_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def get_effective_price(self, billing_cycle: str = 'monthly', current_date=None) -> float:
        """獲取有效價格（考慮促銷）"""
        if current_date is None:
            current_date = func.now()
            
        # 檢查是否在促銷期間
        if (self.promotional_price and 
            self.promo_start_date and 
            self.promo_end_date and
            self.promo_start_date <= current_date <= self.promo_end_date):
            return float(self.promotional_price)
        
        # 返回正常價格
        if billing_cycle == 'annual' and self.annual_price:
            return float(self.annual_price)
        else:
            return float(self.monthly_price)
    
    def has_feature(self, feature_name: str) -> bool:
        """檢查是否包含指定功能"""
        return self.features.get(feature_name, False) if self.features else False
    
    def get_restriction_value(self, restriction_name: str, default=None):
        """獲取限制值"""
        return self.restrictions.get(restriction_name, default) if self.restrictions else default
    
    def is_within_quota(self, quota_type: str, current_usage: int) -> bool:
        """檢查是否在配額範圍內"""
        quota_mapping = {
            'monthly_orders': self.max_monthly_orders,
            'products': self.max_products,
            'locations': self.max_locations,
            'api_calls': self.max_api_calls,
            'storage_gb': self.storage_quota_gb
        }
        
        quota_limit = quota_mapping.get(quota_type)
        if quota_limit is None:  # 無限制
            return True
        
        return current_usage <= quota_limit
    
    def get_annual_discount_percentage(self) -> float:
        """計算年費折扣百分比"""
        if not self.annual_price or not self.monthly_price:
            return 0.0
            
        monthly_equivalent = float(self.monthly_price) * 12
        annual_price = float(self.annual_price)
        
        if monthly_equivalent <= annual_price:
            return 0.0
            
        discount = (monthly_equivalent - annual_price) / monthly_equivalent
        return discount * 100
    
    def can_upgrade_to(self, target_plan: 'SubscriptionPlan') -> bool:
        """檢查是否可以升級到指定方案"""
        return target_plan.tier_level > self.tier_level
    
    def can_downgrade_to(self, target_plan: 'SubscriptionPlan') -> bool:
        """檢查是否可以降級到指定方案"""
        return target_plan.tier_level < self.tier_level