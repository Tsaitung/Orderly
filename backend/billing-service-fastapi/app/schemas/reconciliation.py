"""
Reconciliation Schemas
Pydantic schemas for reconciliation API with camelCase conversion
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.models.enums import ReconciliationStatus, DiscrepancyType


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    components = string.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


class CamelCaseModel(BaseModel):
    """Base model with camelCase serialization."""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


# ============ Reconciliation Item Schemas ============

class ReconciliationItemBase(CamelCaseModel):
    """對帳明細基礎 Schema"""
    product_code: str = Field(..., description="商品代碼")
    product_name: Optional[str] = Field(None, description="商品名稱")
    sku_code: Optional[str] = Field(None, description="SKU 代碼")
    order_id: Optional[str] = Field(None, description="訂單 ID")

    expected_quantity: Decimal = Field(..., description="預期數量")
    actual_quantity: Decimal = Field(..., description="實際數量")
    expected_price: Decimal = Field(..., description="預期單價")
    actual_price: Decimal = Field(..., description="實際單價")


class ReconciliationItemCreate(ReconciliationItemBase):
    """創建對帳明細 Schema"""
    discrepancy_type: Optional[DiscrepancyType] = Field(None, description="差異類型")
    discrepancy_notes: Optional[str] = Field(None, description="差異說明")


class ReconciliationItemResponse(ReconciliationItemBase):
    """對帳明細回應 Schema"""
    id: str
    reconciliation_id: str

    # Calculated fields
    quantity_difference: Decimal
    price_difference: Decimal
    expected_amount: Decimal
    actual_amount: Decimal
    amount_difference: Decimal

    # Discrepancy info
    discrepancy_type: Optional[DiscrepancyType]
    discrepancy_notes: Optional[str]

    # Matching info
    is_matched: bool
    match_confidence: Optional[float]
    manually_adjusted: bool
    adjustment_reason: Optional[str]

    created_at: datetime
    updated_at: datetime


# ============ Reconciliation Summary ============

class ReconciliationSummary(CamelCaseModel):
    """對帳匯總 Schema (依 Database-Schema-Core.md summary structure)"""
    total_orders: int = Field(0, description="總訂單數")
    total_items: int = Field(0, description="總項目數")
    total_amount: Decimal = Field(Decimal("0.00"), description="總金額")
    matched_amount: Decimal = Field(Decimal("0.00"), description="已匹配金額")
    discrepancy_amount: Decimal = Field(Decimal("0.00"), description="差異金額")
    accuracy_rate: Decimal = Field(Decimal("0.00"), description="準確率")
    discrepancy_breakdown: Dict[str, int] = Field(default_factory=dict, description="差異類型分佈")


# ============ Reconciliation Schemas ============

class ReconciliationBase(CamelCaseModel):
    """對帳記錄基礎 Schema"""
    period_start: date = Field(..., description="對帳起始日期")
    period_end: date = Field(..., description="對帳結束日期")
    restaurant_id: str = Field(..., description="餐廳 ID")
    supplier_id: str = Field(..., description="供應商 ID")


class ReconciliationCreate(ReconciliationBase):
    """創建對帳記錄 Schema"""
    items: Optional[List[ReconciliationItemCreate]] = Field(None, description="對帳明細")

    @field_validator('period_end')
    @classmethod
    def validate_period_end(cls, v: date, info) -> date:
        period_start = info.data.get('period_start')
        if period_start and v < period_start:
            raise ValueError('period_end must be >= period_start')
        return v


class ReconciliationUpdate(CamelCaseModel):
    """更新對帳記錄 Schema"""
    status: Optional[ReconciliationStatus] = Field(None, description="對帳狀態")
    review_notes: Optional[str] = Field(None, description="審核備註")
    dispute_reason: Optional[str] = Field(None, description="爭議原因")
    resolution_notes: Optional[str] = Field(None, description="解決說明")


class ReconciliationResponse(ReconciliationBase):
    """對帳記錄回應 Schema"""
    id: str
    reconciliation_number: str
    tenant_id: str
    status: ReconciliationStatus

    # Summary
    summary: Dict[str, Any]
    total_orders: int
    total_items: int
    total_amount: Decimal
    matched_amount: Decimal
    discrepancy_amount: Decimal

    # Quality metrics
    confidence_score: Optional[float]
    auto_approved: bool

    # Review info
    reviewed_by: Optional[str]
    reviewed_at: Optional[datetime]
    review_notes: Optional[str]

    # Dispute handling
    dispute_reason: Optional[str]
    resolution_notes: Optional[str]
    resolved_by: Optional[str]
    resolved_at: Optional[datetime]

    # Audit
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str]
    updated_by: Optional[str]

    # Items (optional, for detail view)
    items: Optional[List[ReconciliationItemResponse]] = None


class ReconciliationListResponse(CamelCaseModel):
    """對帳記錄列表回應 Schema"""
    items: List[ReconciliationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============ Reconciliation Stats ============

class ReconciliationStats(CamelCaseModel):
    """對帳統計 Schema"""
    total_reconciliations: int
    pending_count: int
    approved_count: int
    disputed_count: int
    total_amount: Decimal
    total_discrepancy: Decimal
    average_accuracy_rate: Decimal
    average_confidence_score: Optional[float]


# ============ Reconciliation Actions ============

class ReconciliationApproveRequest(CamelCaseModel):
    """審核通過請求"""
    review_notes: Optional[str] = Field(None, description="審核備註")


class ReconciliationDisputeRequest(CamelCaseModel):
    """提出爭議請求"""
    dispute_reason: str = Field(..., description="爭議原因")


class ReconciliationResolveRequest(CamelCaseModel):
    """解決爭議請求"""
    resolution_notes: str = Field(..., description="解決說明")
