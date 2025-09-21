from sqlalchemy import Column, String, DECIMAL, Boolean, DateTime, JSON, Integer
from sqlalchemy.sql import func
from .base import BaseModel


class BillingRateConfig(BaseModel):
    """
    平台費率配置表
    Platform rate configuration for supplier billing
    """
    __tablename__ = "billing_rate_configs"

    config_name = Column("configName", String, nullable=False, comment="配置名稱")
    config_type = Column("configType", String, nullable=False, comment="配置類型: commission, subscription, addon")
    is_active = Column("isActive", Boolean, nullable=False, default=True, comment="是否啟用")
    
    # 基本費率設定
    base_rate = Column("baseRate", DECIMAL(5, 4), nullable=True, comment="基礎費率 (例: 0.012 = 1.2%)")
    min_amount = Column("minAmount", DECIMAL(12, 2), nullable=True, comment="最低收費金額")
    max_amount = Column("maxAmount", DECIMAL(12, 2), nullable=True, comment="最高收費金額")
    
    # 生效時間
    effective_from = Column("effectiveFrom", DateTime(timezone=True), nullable=False, 
                          server_default=func.now(), comment="生效開始時間")
    effective_to = Column("effectiveTo", DateTime(timezone=True), nullable=True, comment="生效結束時間")
    
    # 適用條件
    target_supplier_type = Column("targetSupplierType", String, nullable=True, comment="適用供應商類型")
    target_product_category = Column("targetProductCategory", String, nullable=True, comment="適用產品類別")
    min_monthly_gmv = Column("minMonthlyGMV", DECIMAL(15, 2), nullable=True, comment="最低月 GMV 要求")
    max_monthly_gmv = Column("maxMonthlyGMV", DECIMAL(15, 2), nullable=True, comment="最高月 GMV 限制")
    
    # 擴展設定
    additional_config = Column("additionalConfig", JSON, nullable=False, default=dict, 
                             comment="額外配置參數")
    
    # 審計欄位
    created_by = Column("createdBy", String, nullable=False, comment="建立者")
    updated_by = Column("updatedBy", String, nullable=True, comment="修改者")
    approval_status = Column("approvalStatus", String, nullable=False, default="draft", 
                           comment="審批狀態: draft, pending, approved, rejected")
    approved_by = Column("approvedBy", String, nullable=True, comment="審批者")
    approved_at = Column("approvedAt", DateTime(timezone=True), nullable=True, comment="審批時間")
    
    # 版本控制
    version = Column(Integer, nullable=False, default=1, comment="版本號")
    parent_config_id = Column("parentConfigId", String, nullable=True, comment="父配置ID")
    
    def __repr__(self):
        return f"<BillingRateConfig(name='{self.config_name}', type='{self.config_type}', rate={self.base_rate})>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'config_name': self.config_name,
            'config_type': self.config_type,
            'is_active': self.is_active,
            'base_rate': float(self.base_rate) if self.base_rate else None,
            'min_amount': float(self.min_amount) if self.min_amount else None,
            'max_amount': float(self.max_amount) if self.max_amount else None,
            'effective_from': self.effective_from.isoformat() if self.effective_from else None,
            'effective_to': self.effective_to.isoformat() if self.effective_to else None,
            'target_supplier_type': self.target_supplier_type,
            'target_product_category': self.target_product_category,
            'min_monthly_gmv': float(self.min_monthly_gmv) if self.min_monthly_gmv else None,
            'max_monthly_gmv': float(self.max_monthly_gmv) if self.max_monthly_gmv else None,
            'additional_config': self.additional_config,
            'created_by': self.created_by,
            'updated_by': self.updated_by,
            'approval_status': self.approval_status,
            'approved_by': self.approved_by,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'version': self.version,
            'parent_config_id': self.parent_config_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def is_applicable_to_supplier(self, supplier_type: str = None, monthly_gmv: float = None) -> bool:
        """檢查費率配置是否適用於指定供應商"""
        if not self.is_active:
            return False
            
        # 檢查供應商類型
        if self.target_supplier_type and supplier_type:
            if self.target_supplier_type != supplier_type:
                return False
                
        # 檢查月 GMV 範圍
        if monthly_gmv is not None:
            if self.min_monthly_gmv and monthly_gmv < float(self.min_monthly_gmv):
                return False
            if self.max_monthly_gmv and monthly_gmv > float(self.max_monthly_gmv):
                return False
                
        return True
    
    def calculate_fee(self, transaction_amount: float) -> float:
        """根據配置計算費用"""
        if not self.base_rate:
            return 0.0
            
        # 計算基礎費用
        fee = transaction_amount * float(self.base_rate)
        
        # 應用最低/最高限制
        if self.min_amount:
            fee = max(fee, float(self.min_amount))
        if self.max_amount:
            fee = min(fee, float(self.max_amount))
            
        return fee