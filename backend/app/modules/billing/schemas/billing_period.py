"""
Billing Period Schemas
Pydantic schemas for billing period management
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import Field, field_validator

# Import shared schema utilities from core library
from orderly_fastapi_core import CamelCaseModel


class BillingPeriodBase(CamelCaseModel):
    """計費週期基礎 Schema"""
    restaurant_id: str = Field(..., description="餐廳 ID")
    supplier_id: str = Field(..., description="供應商 ID")
    period_name: str = Field(..., description="週期名稱")
    period_start: date = Field(..., description="週期起始日期")
    period_end: date = Field(..., description="週期結束日期")


class BillingPeriodCreate(BillingPeriodBase):
    """創建計費週期 Schema"""

    @field_validator('period_end')
    @classmethod
    def validate_period_end(cls, v: date, info) -> date:
        period_start = info.data.get('period_start')
        if period_start and v < period_start:
            raise ValueError('period_end must be >= period_start')
        return v


class BillingPeriodUpdate(CamelCaseModel):
    """更新計費週期 Schema"""
    period_name: Optional[str] = Field(None, description="週期名稱")
    is_closed: Optional[bool] = Field(None, description="是否已結案")


class BillingPeriodResponse(BillingPeriodBase):
    """計費週期回應 Schema"""
    id: str
    tenant_id: str

    # Status
    is_closed: bool
    closed_at: Optional[datetime]
    closed_by: Optional[str]

    # Summary
    total_orders: int
    total_amount: Decimal
    reconciliation_id: Optional[str]

    # Audit
    created_at: datetime
    updated_at: datetime


class BillingPeriodCloseRequest(CamelCaseModel):
    """結案計費週期請求"""
    create_reconciliation: bool = Field(True, description="是否自動創建對帳記錄")
