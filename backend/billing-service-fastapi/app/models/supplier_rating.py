from sqlalchemy import Column, String, DECIMAL, Boolean, DateTime, Integer, Text, JSON, Index
from sqlalchemy.sql import func
from .base import BaseModel


class SupplierRating(BaseModel):
    """
    供應商評級表
    Supplier rating and performance tracking for billing adjustments
    """
    __tablename__ = "supplier_ratings"

    # 基本資訊
    supplier_id = Column("supplierId", String, nullable=False, comment="供應商ID")
    organization_id = Column("organizationId", String, nullable=False, comment="組織ID")
    
    # 評級周期
    rating_period = Column("ratingPeriod", String, nullable=False, comment="評級周期 (YYYY-MM)")
    period_start = Column("periodStart", DateTime(timezone=True), nullable=False, comment="周期開始日期")
    period_end = Column("periodEnd", DateTime(timezone=True), nullable=False, comment="周期結束日期")
    
    # 綜合評級
    overall_rating = Column("overallRating", String, nullable=False, comment="綜合評級: Platinum, Gold, Silver, Bronze")
    overall_score = Column("overallScore", DECIMAL(5, 2), nullable=False, comment="綜合評分 (0-100)")
    previous_rating = Column("previousRating", String, nullable=True, comment="上期評級")
    rating_change = Column("ratingChange", String, nullable=True, comment="評級變化: upgraded, downgraded, maintained")
    
    # 業務指標評分
    order_fulfillment_rate = Column("orderFulfillmentRate", DECIMAL(5, 2), nullable=False, comment="訂單履約率")
    on_time_delivery_rate = Column("onTimeDeliveryRate", DECIMAL(5, 2), nullable=False, comment="準時交付率")
    quality_score = Column("qualityScore", DECIMAL(5, 2), nullable=False, comment="品質評分")
    customer_satisfaction = Column("customerSatisfaction", DECIMAL(5, 2), nullable=False, comment="客戶滿意度")
    response_time_score = Column("responseTimeScore", DECIMAL(5, 2), nullable=False, comment="響應時間評分")
    
    # 交易數據
    total_orders = Column("totalOrders", Integer, nullable=False, default=0, comment="總訂單數")
    total_gmv = Column("totalGMV", DECIMAL(15, 2), nullable=False, default=0, comment="總交易額")
    average_order_value = Column("averageOrderValue", DECIMAL(10, 2), nullable=False, default=0, comment="平均訂單價值")
    order_growth_rate = Column("orderGrowthRate", DECIMAL(5, 2), nullable=True, comment="訂單增長率")
    
    # 品質指標
    return_rate = Column("returnRate", DECIMAL(5, 2), nullable=False, default=0, comment="退貨率")
    complaint_rate = Column("complaintRate", DECIMAL(5, 2), nullable=False, default=0, comment="投訴率")
    defect_rate = Column("defectRate", DECIMAL(5, 2), nullable=False, default=0, comment="缺陷率")
    
    # 服務指標
    avg_response_time_hours = Column("avgResponseTimeHours", DECIMAL(6, 2), nullable=True, comment="平均響應時間(小時)")
    order_cancellation_rate = Column("orderCancellationRate", DECIMAL(5, 2), nullable=False, default=0, comment="訂單取消率")
    inventory_accuracy = Column("inventoryAccuracy", DECIMAL(5, 2), nullable=False, default=0, comment="庫存準確率")
    
    # 合規指標
    compliance_score = Column("complianceScore", DECIMAL(5, 2), nullable=False, default=0, comment="合規評分")
    document_completeness = Column("documentCompleteness", DECIMAL(5, 2), nullable=False, default=0, comment="文件完整性")
    certification_status = Column("certificationStatus", String, nullable=True, comment="認證狀態")
    
    # 財務指標
    payment_timeliness = Column("paymentTimeliness", DECIMAL(5, 2), nullable=False, default=0, comment="付款及時性")
    credit_score = Column("creditScore", DECIMAL(5, 2), nullable=True, comment="信用評分")
    financial_stability = Column("financialStability", String, nullable=True, comment="財務穩定性")
    
    # 等級權益
    commission_discount_rate = Column("commissionDiscountRate", DECIMAL(5, 4), nullable=True, comment="抽成折扣率")
    priority_support = Column("prioritySupport", Boolean, nullable=False, default=False, comment="優先客服")
    featured_listing = Column("featuredListing", Boolean, nullable=False, default=False, comment="推薦展示")
    extended_payment_terms = Column("extendedPaymentTerms", Integer, nullable=True, comment="延長付款期限(天)")
    
    # 改進建議
    improvement_areas = Column("improvementAreas", JSON, nullable=False, default=list, comment="改進領域")
    recommendations = Column("recommendations", JSON, nullable=False, default=list, comment="改進建議")
    action_items = Column("actionItems", JSON, nullable=False, default=list, comment="行動項目")
    
    # 獎懲記錄
    awards = Column("awards", JSON, nullable=False, default=list, comment="獲獎記錄")
    penalties = Column("penalties", JSON, nullable=False, default=list, comment="懲罰記錄")
    bonus_earned = Column("bonusEarned", DECIMAL(10, 2), nullable=False, default=0, comment="獲得獎金")
    penalty_amount = Column("penaltyAmount", DECIMAL(10, 2), nullable=False, default=0, comment="懲罰金額")
    
    # 趨勢分析
    score_trend = Column("scoreTrend", String, nullable=True, comment="評分趨勢: improving, declining, stable")
    risk_level = Column("riskLevel", String, nullable=False, default="low", comment="風險等級: low, medium, high")
    
    # 狀態控制
    is_active = Column("isActive", Boolean, nullable=False, default=True, comment="是否啟用")
    is_published = Column("isPublished", Boolean, nullable=False, default=False, comment="是否已發布")
    published_date = Column("publishedDate", DateTime(timezone=True), nullable=True, comment="發布日期")
    
    # 審計欄位
    calculated_by = Column("calculatedBy", String, nullable=False, comment="計算者")
    reviewed_by = Column("reviewedBy", String, nullable=True, comment="審核者")
    approved_by = Column("approvedBy", String, nullable=True, comment="批准者")
    created_by = Column("createdBy", String, nullable=False, comment="建立者")
    updated_by = Column("updatedBy", String, nullable=True, comment="修改者")
    
    # 添加索引
    __table_args__ = (
        Index('idx_supplier_id', 'supplierId'),
        Index('idx_organization_id', 'organizationId'),
        Index('idx_rating_period', 'ratingPeriod'),
        Index('idx_overall_rating', 'overallRating'),
        Index('idx_overall_score', 'overallScore'),
        Index('idx_supplier_period', 'supplierId', 'ratingPeriod'),
        Index('idx_period_dates', 'periodStart', 'periodEnd'),
        Index('idx_published', 'isPublished', 'publishedDate'),
    )
    
    def __repr__(self):
        return f"<SupplierRating(supplier='{self.supplier_id}', period='{self.rating_period}', rating='{self.overall_rating}', score={self.overall_score})>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'supplier_id': self.supplier_id,
            'organization_id': self.organization_id,
            'rating_period': self.rating_period,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'overall_rating': self.overall_rating,
            'overall_score': float(self.overall_score),
            'previous_rating': self.previous_rating,
            'rating_change': self.rating_change,
            'order_fulfillment_rate': float(self.order_fulfillment_rate),
            'on_time_delivery_rate': float(self.on_time_delivery_rate),
            'quality_score': float(self.quality_score),
            'customer_satisfaction': float(self.customer_satisfaction),
            'response_time_score': float(self.response_time_score),
            'total_orders': self.total_orders,
            'total_gmv': float(self.total_gmv),
            'average_order_value': float(self.average_order_value),
            'order_growth_rate': float(self.order_growth_rate) if self.order_growth_rate else None,
            'return_rate': float(self.return_rate),
            'complaint_rate': float(self.complaint_rate),
            'defect_rate': float(self.defect_rate),
            'avg_response_time_hours': float(self.avg_response_time_hours) if self.avg_response_time_hours else None,
            'order_cancellation_rate': float(self.order_cancellation_rate),
            'inventory_accuracy': float(self.inventory_accuracy),
            'compliance_score': float(self.compliance_score),
            'document_completeness': float(self.document_completeness),
            'certification_status': self.certification_status,
            'payment_timeliness': float(self.payment_timeliness),
            'credit_score': float(self.credit_score) if self.credit_score else None,
            'financial_stability': self.financial_stability,
            'commission_discount_rate': float(self.commission_discount_rate) if self.commission_discount_rate else None,
            'priority_support': self.priority_support,
            'featured_listing': self.featured_listing,
            'extended_payment_terms': self.extended_payment_terms,
            'improvement_areas': self.improvement_areas,
            'recommendations': self.recommendations,
            'action_items': self.action_items,
            'awards': self.awards,
            'penalties': self.penalties,
            'bonus_earned': float(self.bonus_earned),
            'penalty_amount': float(self.penalty_amount),
            'score_trend': self.score_trend,
            'risk_level': self.risk_level,
            'is_active': self.is_active,
            'is_published': self.is_published,
            'published_date': self.published_date.isoformat() if self.published_date else None,
            'calculated_by': self.calculated_by,
            'reviewed_by': self.reviewed_by,
            'approved_by': self.approved_by,
            'created_by': self.created_by,
            'updated_by': self.updated_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def get_rating_tier_number(self) -> int:
        """獲取評級數字等級"""
        rating_map = {
            'Platinum': 4,
            'Gold': 3,
            'Silver': 2,
            'Bronze': 1
        }
        return rating_map.get(self.overall_rating, 1)
    
    def is_top_tier(self) -> bool:
        """檢查是否為頂級供應商"""
        return self.overall_rating in ['Platinum', 'Gold']
    
    def has_improved(self) -> bool:
        """檢查是否有改進"""
        return self.rating_change == 'upgraded'
    
    def has_declined(self) -> bool:
        """檢查是否有下降"""
        return self.rating_change == 'downgraded'
    
    def get_commission_discount(self) -> float:
        """獲取抽成折扣率"""
        if self.commission_discount_rate:
            return float(self.commission_discount_rate)
        
        # 根據評級設定默認折扣
        discount_map = {
            'Platinum': 0.20,  # 20% 折扣
            'Gold': 0.15,      # 15% 折扣
            'Silver': 0.10,    # 10% 折扣
            'Bronze': 0.05     # 5% 折扣
        }
        return discount_map.get(self.overall_rating, 0.0)
    
    def calculate_weighted_score(self) -> float:
        """計算加權綜合評分"""
        weights = {
            'order_fulfillment': 0.25,
            'on_time_delivery': 0.20,
            'quality': 0.20,
            'customer_satisfaction': 0.15,
            'response_time': 0.10,
            'compliance': 0.10
        }
        
        weighted_score = (
            float(self.order_fulfillment_rate) * weights['order_fulfillment'] +
            float(self.on_time_delivery_rate) * weights['on_time_delivery'] +
            float(self.quality_score) * weights['quality'] +
            float(self.customer_satisfaction) * weights['customer_satisfaction'] +
            float(self.response_time_score) * weights['response_time'] +
            float(self.compliance_score) * weights['compliance']
        )
        
        return weighted_score
    
    def determine_rating_from_score(self, score: float = None) -> str:
        """根據評分確定評級"""
        if score is None:
            score = float(self.overall_score)
        
        if score >= 90:
            return 'Platinum'
        elif score >= 80:
            return 'Gold'
        elif score >= 70:
            return 'Silver'
        else:
            return 'Bronze'
    
    def get_benefits_summary(self) -> dict:
        """獲取評級權益摘要"""
        return {
            'commission_discount': self.get_commission_discount(),
            'priority_support': self.priority_support,
            'featured_listing': self.featured_listing,
            'extended_payment_terms': self.extended_payment_terms or 0,
            'rating_tier': self.get_rating_tier_number()
        }
    
    def add_improvement_recommendation(self, area: str, description: str, priority: str = 'medium'):
        """添加改進建議"""
        if not self.recommendations:
            self.recommendations = []
        
        recommendation = {
            'area': area,
            'description': description,
            'priority': priority,
            'added_date': func.now().isoformat()
        }
        
        self.recommendations.append(recommendation)
    
    def add_award(self, award_type: str, description: str, bonus_amount: float = 0):
        """添加獎項"""
        if not self.awards:
            self.awards = []
        
        award = {
            'type': award_type,
            'description': description,
            'bonus_amount': bonus_amount,
            'award_date': func.now().isoformat()
        }
        
        self.awards.append(award)
        self.bonus_earned += bonus_amount
    
    def add_penalty(self, penalty_type: str, description: str, penalty_amount: float = 0):
        """添加懲罰"""
        if not self.penalties:
            self.penalties = []
        
        penalty = {
            'type': penalty_type,
            'description': description,
            'penalty_amount': penalty_amount,
            'penalty_date': func.now().isoformat()
        }
        
        self.penalties.append(penalty)
        self.penalty_amount += penalty_amount
    
    def publish_rating(self, published_by: str):
        """發布評級"""
        self.is_published = True
        self.published_date = func.now()
        self.approved_by = published_by
        self.updated_by = published_by
    
    def calculate_risk_level(self) -> str:
        """計算風險等級"""
        risk_factors = 0
        
        # 檢查各項風險因素
        if float(self.overall_score) < 70:
            risk_factors += 2
        elif float(self.overall_score) < 80:
            risk_factors += 1
        
        if float(self.return_rate) > 5:
            risk_factors += 1
        
        if float(self.complaint_rate) > 3:
            risk_factors += 1
        
        if float(self.order_cancellation_rate) > 10:
            risk_factors += 1
        
        if float(self.payment_timeliness) < 90:
            risk_factors += 1
        
        # 確定風險等級
        if risk_factors >= 4:
            return 'high'
        elif risk_factors >= 2:
            return 'medium'
        else:
            return 'low'