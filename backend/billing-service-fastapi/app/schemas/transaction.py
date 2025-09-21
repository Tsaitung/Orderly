"""
Pydantic schemas for transaction tracking APIs
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from decimal import Decimal
from .base import BaseResponse, ListResponse, PaginationParams, FilterParams


# Request schemas
class BillingTransactionCreate(BaseModel):
    """Create billing transaction request"""
    transaction_id: str = Field(..., min_length=1, max_length=100, description="Unique transaction ID")
    order_id: str = Field(..., description="Order ID")
    supplier_id: str = Field(..., description="Supplier ID")
    organization_id: str = Field(..., description="Organization ID")
    customer_id: Optional[str] = Field(None, description="Customer ID")
    order_amount: Decimal = Field(..., ge=0, description="Order amount")
    commission_rate: Decimal = Field(..., ge=0, le=1, description="Commission rate")
    commission_amount: Decimal = Field(..., ge=0, description="Commission amount")
    rate_tier_id: Optional[str] = Field(None, description="Rate tier ID")
    rate_config_id: Optional[str] = Field(None, description="Rate configuration ID")
    transaction_date: datetime = Field(..., description="Transaction date")
    billing_period: str = Field(..., pattern="^\\d{4}-\\d{2}$", description="Billing period (YYYY-MM)")
    product_category: Optional[str] = Field(None, max_length=100, description="Product category")
    business_unit: Optional[str] = Field(None, max_length=100, description="Business unit")
    delivery_region: Optional[str] = Field(None, max_length=100, description="Delivery region")
    supplier_region: Optional[str] = Field(None, max_length=100, description="Supplier region")
    is_promotional: bool = Field(False, description="Is promotional transaction")
    is_first_order: bool = Field(False, description="Is first order")
    payment_method: Optional[str] = Field(None, max_length=50, description="Payment method")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    external_ref: Optional[str] = Field(None, max_length=100, description="External reference")
    created_by: str = Field(..., description="Creator user ID")
    


class BillingTransactionUpdate(BaseModel):
    """Update billing transaction request"""
    status: Optional[str] = Field(None, pattern="^(pending|confirmed|cancelled|refunded)$", description="Transaction status")
    discount_amount: Optional[Decimal] = Field(None, ge=0, description="Discount amount")
    adjustment_amount: Optional[Decimal] = Field(None, description="Adjustment amount")
    adjustment_reason: Optional[str] = Field(None, max_length=500, description="Adjustment reason")
    delivery_score: Optional[Decimal] = Field(None, ge=0, le=5, description="Delivery score (0-5)")
    quality_score: Optional[Decimal] = Field(None, ge=0, le=5, description="Quality score (0-5)")
    service_score: Optional[Decimal] = Field(None, ge=0, le=5, description="Service score (0-5)")
    settlement_status: Optional[str] = Field(None, pattern="^(unsettled|settled|disputed)$", description="Settlement status")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    updated_by: str = Field(..., description="Updater user ID")


class TransactionRefundRequest(BaseModel):
    """Transaction refund request"""
    refund_amount: Decimal = Field(..., ge=0, description="Refund amount")
    refund_reason: str = Field(..., min_length=1, max_length=1000, description="Refund reason")
    refund_type: str = Field("partial", pattern="^(full|partial)$", description="Refund type")
    processed_by: str = Field(..., description="Processor user ID")
    


class TransactionFilter(FilterParams):
    """Transaction filter parameters"""
    supplier_id: Optional[str] = Field(None, description="Filter by supplier ID")
    organization_id: Optional[str] = Field(None, description="Filter by organization ID")
    customer_id: Optional[str] = Field(None, description="Filter by customer ID")
    status: Optional[str] = Field(None, pattern="^(pending|confirmed|cancelled|refunded)$", description="Transaction status")
    settlement_status: Optional[str] = Field(None, pattern="^(unsettled|settled|disputed)$", description="Settlement status")
    billing_period: Optional[str] = Field(None, pattern="^\\d{4}-\\d{2}$", description="Billing period (YYYY-MM)")
    product_category: Optional[str] = Field(None, description="Product category")
    business_unit: Optional[str] = Field(None, description="Business unit")
    delivery_region: Optional[str] = Field(None, description="Delivery region")
    supplier_region: Optional[str] = Field(None, description="Supplier region")
    is_promotional: Optional[bool] = Field(None, description="Filter promotional transactions")
    is_first_order: Optional[bool] = Field(None, description="Filter first orders")
    payment_method: Optional[str] = Field(None, description="Payment method")
    transaction_date_from: Optional[datetime] = Field(None, description="Transaction date from")
    transaction_date_to: Optional[datetime] = Field(None, description="Transaction date to")
    amount_min: Optional[Decimal] = Field(None, ge=0, description="Minimum order amount")
    amount_max: Optional[Decimal] = Field(None, ge=0, description="Maximum order amount")
    commission_min: Optional[Decimal] = Field(None, ge=0, description="Minimum commission amount")
    commission_max: Optional[Decimal] = Field(None, ge=0, description="Maximum commission amount")


class TransactionBulkUpdate(BaseModel):
    """Bulk transaction update request"""
    transaction_ids: List[str] = Field(..., min_items=1, description="List of transaction IDs")
    updates: Dict[str, Any] = Field(..., description="Fields to update")
    updated_by: str = Field(..., description="Updater user ID")


class TransactionAggregationRequest(BaseModel):
    """Transaction aggregation request"""
    group_by: List[str] = Field(..., min_items=1, description="Fields to group by")
    metrics: List[str] = Field(..., min_items=1, description="Metrics to calculate")
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Filter conditions")
    date_range: Optional[Dict[str, datetime]] = Field(None, description="Date range filter")


# Response schemas
class BillingTransactionResponse(BaseModel):
    """Billing transaction response"""
    id: str
    transaction_id: str
    order_id: str
    supplier_id: str
    organization_id: str
    customer_id: Optional[str]
    order_amount: float
    commission_rate: float
    commission_amount: float
    rate_tier_id: Optional[str]
    rate_config_id: Optional[str]
    transaction_date: datetime
    billing_period: str
    status: str
    product_category: Optional[str]
    business_unit: Optional[str]
    delivery_region: Optional[str]
    supplier_region: Optional[str]
    discount_amount: Optional[float]
    adjustment_amount: Optional[float]
    adjustment_reason: Optional[str]
    refund_amount: Optional[float]
    refund_date: Optional[datetime]
    refund_reason: Optional[str]
    settlement_status: str
    settlement_date: Optional[datetime]
    statement_id: Optional[str]
    is_promotional: bool
    is_first_order: bool
    payment_method: Optional[str]
    delivery_score: Optional[float]
    quality_score: Optional[float]
    service_score: Optional[float]
    metadata: Dict[str, Any]
    external_ref: Optional[str]
    processed_by: Optional[str]
    processed_at: Optional[datetime]
    created_by: str
    updated_by: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class TransactionSummaryResponse(BaseModel):
    """Transaction summary response"""
    total_transactions: int = Field(0, description="Total number of transactions")
    total_order_amount: float = Field(0.0, description="Total order amount")
    total_commission_amount: float = Field(0.0, description="Total commission amount")
    average_commission_rate: float = Field(0.0, description="Average commission rate")
    total_refund_amount: float = Field(0.0, description="Total refund amount")
    net_commission_amount: float = Field(0.0, description="Net commission amount")
    pending_transactions: int = Field(0, description="Pending transactions count")
    confirmed_transactions: int = Field(0, description="Confirmed transactions count")
    cancelled_transactions: int = Field(0, description="Cancelled transactions count")
    refunded_transactions: int = Field(0, description="Refunded transactions count")
    unsettled_amount: float = Field(0.0, description="Unsettled commission amount")
    settled_amount: float = Field(0.0, description="Settled commission amount")
    disputed_amount: float = Field(0.0, description="Disputed commission amount")


class TransactionStatsResponse(BaseModel):
    """Transaction statistics response"""
    period: str = Field(..., description="Statistics period")
    supplier_id: Optional[str] = Field(None, description="Supplier ID if filtered")
    stats: TransactionSummaryResponse = Field(..., description="Transaction statistics")
    period_comparison: Optional[Dict[str, float]] = Field(None, description="Comparison with previous period")
    top_categories: List[Dict[str, Any]] = Field(default_factory=list, description="Top performing categories")
    quality_metrics: Dict[str, float] = Field(default_factory=dict, description="Quality score metrics")


class TransactionAggregationResponse(BaseModel):
    """Transaction aggregation response"""
    groups: List[Dict[str, Any]] = Field(default_factory=list, description="Aggregated groups")
    total_groups: int = Field(0, description="Total number of groups")
    aggregation_period: str = Field(..., description="Aggregation period")
    metrics_summary: Dict[str, float] = Field(default_factory=dict, description="Overall metrics summary")


# API Response types
BillingTransactionListResponse = ListResponse[BillingTransactionResponse]
BillingTransactionSingleResponse = BaseResponse[BillingTransactionResponse]
TransactionSummaryResponse = BaseResponse[TransactionSummaryResponse]
TransactionStatsResponse = BaseResponse[TransactionStatsResponse]
TransactionAggregationListResponse = BaseResponse[TransactionAggregationResponse]