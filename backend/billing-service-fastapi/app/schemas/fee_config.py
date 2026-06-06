"""
Fee Config Schemas
Pydantic schemas for fee configuration (依 PRD-Billing-Master.md)
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Dict, Any
from pydantic import Field, field_validator
from app.models.enums import FeeType, PricingModel, BillingCycle, WhoPays

# Import shared schema utilities from core library
from libs.orderly_fastapi_core import CamelCaseModel


class FeeConfigBase(CamelCaseModel):
    """費率配置基礎 Schema"""
    fee_type: str = Field(..., description="費用類型")
    pricing_model: str = Field(..., description="定價模式")
    who_pays: str = Field(..., description="付費方")
    billing_cycle: str = Field("per_order", description="計費週期")


class FeeConfigCreate(FeeConfigBase):
    """創建費率配置 Schema"""
    supplier_id: Optional[str] = Field(None, description="供應商 ID（空=全平台）")
    restaurant_id: Optional[str] = Field(None, description="餐廳 ID（空=全平台）")

    value: Optional[Decimal] = Field(None, description="費率值（percentage/fixed 使用）")
    value_json: Optional[Dict[str, Any]] = Field(None, description="費率結構（tiered/formula 使用）")

    effective_from: date = Field(..., description="生效日期")
    effective_to: Optional[date] = Field(None, description="失效日期")

    @field_validator('effective_to')
    @classmethod
    def validate_effective_to(cls, v: Optional[date], info) -> Optional[date]:
        effective_from = info.data.get('effective_from')
        if v and effective_from and v < effective_from:
            raise ValueError('effective_to must be >= effective_from')
        return v

    @field_validator('value')
    @classmethod
    def validate_value(cls, v: Optional[Decimal], info) -> Optional[Decimal]:
        pricing_model = info.data.get('pricing_model')
        if pricing_model in ['percentage', 'fixed'] and v is None:
            raise ValueError(f'value is required for {pricing_model} pricing model')
        return v

    @field_validator('value_json')
    @classmethod
    def validate_value_json(cls, v: Optional[Dict], info) -> Optional[Dict]:
        pricing_model = info.data.get('pricing_model')
        if pricing_model in ['tiered', 'formula'] and v is None:
            raise ValueError(f'value_json is required for {pricing_model} pricing model')
        return v


class FeeConfigUpdate(CamelCaseModel):
    """更新費率配置 Schema"""
    value: Optional[Decimal] = Field(None, description="費率值")
    value_json: Optional[Dict[str, Any]] = Field(None, description="費率結構")
    effective_to: Optional[date] = Field(None, description="失效日期")
    is_active: Optional[bool] = Field(None, description="是否啟用")


class FeeConfigResponse(FeeConfigBase):
    """費率配置回應 Schema"""
    id: str
    tenant_id: str
    supplier_id: Optional[str]
    restaurant_id: Optional[str]

    value: Optional[Decimal]
    value_json: Optional[Dict[str, Any]]

    effective_from: date
    effective_to: Optional[date]
    is_active: bool

    created_at: datetime
    updated_at: datetime
    created_by: Optional[str]


# ============ Fee Calculation Schemas ============

class FeeCalculationRequest(CamelCaseModel):
    """費用計算請求 Schema"""
    order_id: str = Field(..., description="訂單 ID")
    supplier_id: str = Field(..., description="供應商 ID")
    restaurant_id: str = Field(..., description="餐廳 ID")
    order_amount: Decimal = Field(..., description="訂單金額")
    order_date: date = Field(..., description="訂單日期")


class FeeCalculationResponse(CamelCaseModel):
    """費用計算回應 Schema"""
    order_id: str
    order_amount: Decimal
    fee_breakdown: Dict[str, Decimal] = Field(default_factory=dict, description="費用明細")
    total_fee: Decimal
    fee_configs_applied: list = Field(default_factory=list, description="套用的費率配置")


# ============ Tiered Pricing Structure ============

class TieredPricingTier(CamelCaseModel):
    """分層費率結構（依 PRD-Billing-Master.md:69-78）"""
    min_gmv: Decimal
    max_gmv: Optional[Decimal]
    rate: Decimal


class TieredPricingConfig(CamelCaseModel):
    """分層費率配置"""
    tiers: list[TieredPricingTier]
