"""
Pydantic schemas for billing statements APIs
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from decimal import Decimal
from .base import BaseResponse, ListResponse, PaginationParams, FilterParams


# Request schemas
class BillingStatementGenerate(BaseModel):
    """Generate billing statement request"""
    supplier_id: str = Field(..., description="Supplier ID")
    billing_period: str = Field(..., pattern="^\\d{4}-\\d{2}$", description="Billing period (YYYY-MM)")
    include_adjustments: bool = Field(True, description="Include manual adjustments")
    include_refunds: bool = Field(True, description="Include refunds")
    generate_pdf: bool = Field(True, description="Generate PDF version")
    send_notification: bool = Field(False, description="Send notification to supplier")
    generated_by: str = Field(..., description="Generator user ID")


class BillingStatementUpdate(BaseModel):
    """Update billing statement request"""
    status: Optional[str] = Field(None, pattern="^(draft|pending|sent|paid|overdue|disputed)$", description="Statement status")
    due_date: Optional[datetime] = Field(None, description="Payment due date")
    payment_terms: Optional[str] = Field(None, max_length=200, description="Payment terms")
    notes: Optional[str] = Field(None, max_length=1000, description="Additional notes")
    adjustment_amount: Optional[Decimal] = Field(None, description="Manual adjustment amount")
    adjustment_reason: Optional[str] = Field(None, max_length=500, description="Adjustment reason")
    updated_by: str = Field(..., description="Updater user ID")


class BillingStatementSend(BaseModel):
    """Send billing statement request"""
    delivery_method: str = Field("email", pattern="^(email|portal|both)$", description="Delivery method")
    email_addresses: Optional[List[str]] = Field(None, description="Email addresses to send to")
    include_attachments: bool = Field(True, description="Include PDF attachment")
    custom_message: Optional[str] = Field(None, max_length=1000, description="Custom message")
    send_copy_to_admin: bool = Field(False, description="Send copy to admin")
    sent_by: str = Field(..., description="Sender user ID")


class StatementFilter(FilterParams):
    """Statement filter parameters"""
    supplier_id: Optional[str] = Field(None, description="Filter by supplier ID")
    billing_period: Optional[str] = Field(None, pattern="^\\d{4}-\\d{2}$", description="Billing period (YYYY-MM)")
    status: Optional[str] = Field(None, pattern="^(draft|pending|sent|paid|overdue|disputed)$", description="Statement status")
    due_date_from: Optional[datetime] = Field(None, description="Due date from")
    due_date_to: Optional[datetime] = Field(None, description="Due date to")
    amount_min: Optional[Decimal] = Field(None, ge=0, description="Minimum amount")
    amount_max: Optional[Decimal] = Field(None, ge=0, description="Maximum amount")
    is_overdue: Optional[bool] = Field(None, description="Filter overdue statements")
    has_disputes: Optional[bool] = Field(None, description="Filter statements with disputes")


class StatementItemAdjustment(BaseModel):
    """Statement item adjustment request"""
    transaction_id: str = Field(..., description="Transaction ID")
    adjustment_type: str = Field(..., pattern="^(discount|fee|refund|correction)$", description="Adjustment type")
    adjustment_amount: Decimal = Field(..., description="Adjustment amount")
    adjustment_reason: str = Field(..., min_length=1, max_length=500, description="Adjustment reason")
    approved_by: str = Field(..., description="Approver user ID")


# Response schemas
class BillingStatementResponse(BaseModel):
    """Billing statement response"""
    id: str
    statement_number: str
    supplier_id: str
    supplier_name: str
    billing_period: str
    statement_date: datetime
    due_date: datetime
    status: str
    subtotal_amount: float
    tax_amount: float
    adjustment_amount: float
    total_amount: float
    paid_amount: float
    outstanding_amount: float
    transaction_count: int
    payment_terms: Optional[str]
    notes: Optional[str]
    pdf_url: Optional[str]
    sent_date: Optional[datetime]
    paid_date: Optional[datetime]
    last_reminder_date: Optional[datetime]
    dispute_count: int
    currency: str
    generated_by: str
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class StatementItemResponse(BaseModel):
    """Statement item (transaction) response"""
    id: str
    transaction_id: str
    order_id: str
    transaction_date: datetime
    order_amount: float
    commission_rate: float
    commission_amount: float
    discount_amount: Optional[float]
    adjustment_amount: Optional[float]
    net_amount: float
    product_category: Optional[str]
    description: Optional[str]
    status: str


class BillingStatementDetailResponse(BaseModel):
    """Detailed billing statement response"""
    statement: BillingStatementResponse
    items: List[StatementItemResponse] = Field(default_factory=list, description="Statement line items")
    payment_history: List[Dict[str, Any]] = Field(default_factory=list, description="Payment history")
    adjustments: List[Dict[str, Any]] = Field(default_factory=list, description="Manual adjustments")
    disputes: List[Dict[str, Any]] = Field(default_factory=list, description="Disputes")


class StatementSummaryResponse(BaseModel):
    """Statement summary response"""
    total_statements: int = Field(0, description="Total number of statements")
    total_amount: float = Field(0.0, description="Total statement amount")
    paid_amount: float = Field(0.0, description="Total paid amount")
    outstanding_amount: float = Field(0.0, description="Total outstanding amount")
    overdue_amount: float = Field(0.0, description="Total overdue amount")
    disputed_amount: float = Field(0.0, description="Total disputed amount")
    draft_statements: int = Field(0, description="Draft statements count")
    sent_statements: int = Field(0, description="Sent statements count")
    paid_statements: int = Field(0, description="Paid statements count")
    overdue_statements: int = Field(0, description="Overdue statements count")
    disputed_statements: int = Field(0, description="Disputed statements count")
    average_payment_days: Optional[float] = Field(None, description="Average payment days")


class StatementDeliveryStatus(BaseModel):
    """Statement delivery status"""
    statement_id: str
    delivery_method: str
    delivery_status: str
    delivered_at: Optional[datetime]
    recipient_email: Optional[str]
    tracking_id: Optional[str]
    delivery_attempts: int
    last_attempt_at: Optional[datetime]
    failure_reason: Optional[str]
    opened_at: Optional[datetime]
    downloaded_at: Optional[datetime]


class StatementAnalyticsResponse(BaseModel):
    """Statement analytics response"""
    period: str
    supplier_id: Optional[str]
    metrics: StatementSummaryResponse
    trends: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict, description="Trend data")
    comparisons: Dict[str, float] = Field(default_factory=dict, description="Period comparisons")
    top_suppliers: List[Dict[str, Any]] = Field(default_factory=list, description="Top suppliers by amount")
    payment_patterns: Dict[str, Any] = Field(default_factory=dict, description="Payment pattern analysis")


# API Response types
BillingStatementListResponse = ListResponse[BillingStatementResponse]
BillingStatementSingleResponse = BaseResponse[BillingStatementResponse]
BillingStatementDetailSingleResponse = BaseResponse[BillingStatementDetailResponse]
StatementSummaryResponse = BaseResponse[StatementSummaryResponse]
StatementAnalyticsResponse = BaseResponse[StatementAnalyticsResponse]
StatementDeliveryStatusResponse = BaseResponse[StatementDeliveryStatus]