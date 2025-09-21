from sqlalchemy import Column, String, DECIMAL, Boolean, DateTime, Integer, Index
from sqlalchemy.sql import func
from .base import BaseModel


class TransactionRateTier(BaseModel):
    """
    交易量分級費率表
    Transaction volume-based rate tiers for supplier billing
    """
    __tablename__ = "transaction_rate_tiers"

    tier_name = Column("tierName", String, nullable=False, comment="分級名稱")
    tier_order = Column("tierOrder", Integer, nullable=False, comment="分級順序")
    
    # GMV 範圍定義
    min_monthly_gmv = Column("minMonthlyGMV", DECIMAL(15, 2), nullable=False, comment="最低月 GMV")
    max_monthly_gmv = Column("maxMonthlyGMV", DECIMAL(15, 2), nullable=True, comment="最高月 GMV (NULL = 無上限)")
    
    # 費率設定
    commission_rate = Column("commissionRate", DECIMAL(5, 4), nullable=False, comment="抽成費率 (例: 0.012 = 1.2%)")
    
    # 固定費用（可選）
    fixed_fee = Column("fixedFee", DECIMAL(10, 2), nullable=True, default=0, comment="固定月費")
    
    # 優惠設定
    discount_rate = Column("discountRate", DECIMAL(5, 4), nullable=True, comment="折扣率")
    promotional_rate = Column("promotionalRate", DECIMAL(5, 4), nullable=True, comment="促銷費率")
    promo_start_date = Column("promoStartDate", DateTime(timezone=True), nullable=True, comment="促銷開始日期")
    promo_end_date = Column("promoEndDate", DateTime(timezone=True), nullable=True, comment="促銷結束日期")
    
    # 狀態控制
    is_active = Column("isActive", Boolean, nullable=False, default=True, comment="是否啟用")
    effective_from = Column("effectiveFrom", DateTime(timezone=True), nullable=False, 
                          server_default=func.now(), comment="生效開始時間")
    effective_to = Column("effectiveTo", DateTime(timezone=True), nullable=True, comment="生效結束時間")
    
    # 適用條件
    supplier_type = Column("supplierType", String, nullable=True, comment="適用供應商類型")
    region = Column("region", String, nullable=True, comment="適用地區")
    
    # 審計欄位
    created_by = Column("createdBy", String, nullable=False, comment="建立者")
    updated_by = Column("updatedBy", String, nullable=True, comment="修改者")
    
    # 添加索引
    __table_args__ = (
        Index('idx_tier_order', 'tierOrder'),
        Index('idx_gmv_range', 'minMonthlyGMV', 'maxMonthlyGMV'),
        Index('idx_effective_period', 'effectiveFrom', 'effectiveTo'),
        Index('idx_supplier_type', 'supplierType'),
    )
    
    def __repr__(self):
        return f"<TransactionRateTier(name='{self.tier_name}', rate={self.commission_rate}, min_gmv={self.min_monthly_gmv})>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'tier_name': self.tier_name,
            'tier_order': self.tier_order,
            'min_monthly_gmv': float(self.min_monthly_gmv),
            'max_monthly_gmv': float(self.max_monthly_gmv) if self.max_monthly_gmv else None,
            'commission_rate': float(self.commission_rate),
            'fixed_fee': float(self.fixed_fee) if self.fixed_fee else 0,
            'discount_rate': float(self.discount_rate) if self.discount_rate else None,
            'promotional_rate': float(self.promotional_rate) if self.promotional_rate else None,
            'promo_start_date': self.promo_start_date.isoformat() if self.promo_start_date else None,
            'promo_end_date': self.promo_end_date.isoformat() if self.promo_end_date else None,
            'is_active': self.is_active,
            'effective_from': self.effective_from.isoformat() if self.effective_from else None,
            'effective_to': self.effective_to.isoformat() if self.effective_to else None,
            'supplier_type': self.supplier_type,
            'region': self.region,
            'created_by': self.created_by,
            'updated_by': self.updated_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def is_in_gmv_range(self, monthly_gmv: float) -> bool:
        """檢查指定 GMV 是否在此分級範圍內"""
        if monthly_gmv < float(self.min_monthly_gmv):
            return False
        if self.max_monthly_gmv and monthly_gmv > float(self.max_monthly_gmv):
            return False
        return True
    
    def get_effective_rate(self, current_date=None) -> float:
        """獲取有效費率（考慮促銷）"""
        if current_date is None:
            current_date = func.now()
            
        # 檢查是否在促銷期間
        if (self.promotional_rate and 
            self.promo_start_date and 
            self.promo_end_date and
            self.promo_start_date <= current_date <= self.promo_end_date):
            return float(self.promotional_rate)
        
        # 應用折扣
        base_rate = float(self.commission_rate)
        if self.discount_rate:
            base_rate *= (1 - float(self.discount_rate))
            
        return base_rate
    
    def calculate_commission(self, transaction_amount: float, current_date=None) -> float:
        """計算抽成金額"""
        effective_rate = self.get_effective_rate(current_date)
        return transaction_amount * effective_rate
    
    def get_tier_description(self) -> str:
        """獲取分級描述"""
        min_gmv = f"NT$ {self.min_monthly_gmv:,.0f}"
        if self.max_monthly_gmv:
            max_gmv = f"NT$ {self.max_monthly_gmv:,.0f}"
            gmv_range = f"{min_gmv} - {max_gmv}"
        else:
            gmv_range = f"{min_gmv}+"
            
        rate_pct = f"{float(self.commission_rate) * 100:.1f}%"
        
        return f"{self.tier_name}: {gmv_range} (費率: {rate_pct})"