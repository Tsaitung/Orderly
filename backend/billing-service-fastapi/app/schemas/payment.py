"""
Pydantic schemas for payment processing APIs
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from decimal import Decimal
from .base import BaseResponse, ListResponse, PaginationParams, FilterParams


# Request schemas
class PaymentProcessRequest(BaseModel):
    """Process payment request"""
    statement_id: str = Field(..., description="Statement ID")
    payment_amount: Decimal = Field(..., ge=0, description="Payment amount")
    payment_method: str = Field(..., pattern="^(bank_transfer|credit_card|digital_wallet|check|cash)$", description="Payment method")
    payment_reference: Optional[str] = Field(None, max_length=100, description="Payment reference number")
    payment_date: Optional[datetime] = Field(None, description="Payment date (defaults to now)")
    payer_bank_account: Optional[str] = Field(None, max_length=100, description="Payer bank account")
    payee_bank_account: Optional[str] = Field(None, max_length=100, description="Payee bank account")
    exchange_rate: Optional[Decimal] = Field(None, gt=0, description="Exchange rate if different currency")
    payment_currency: str = Field("TWD", max_length=3, description="Payment currency")
    transaction_fee: Optional[Decimal] = Field(None, ge=0, description="Transaction fee")
    notes: Optional[str] = Field(None, max_length=1000, description="Payment notes")
    external_payment_id: Optional[str] = Field(None, max_length=100, description="External payment system ID")
    processed_by: str = Field(..., description="Processor user ID")


class PaymentUpdateRequest(BaseModel):
    """Update payment request"""
    status: Optional[str] = Field(None, pattern="^(pending|processing|completed|failed|cancelled|refunded)$", description="Payment status")
    failure_reason: Optional[str] = Field(None, max_length=500, description="Failure reason")
    confirmation_number: Optional[str] = Field(None, max_length=100, description="Confirmation number")
    cleared_date: Optional[datetime] = Field(None, description="Payment cleared date")
    bank_reference: Optional[str] = Field(None, max_length=100, description="Bank reference")
    notes: Optional[str] = Field(None, max_length=1000, description="Payment notes")
    updated_by: str = Field(..., description="Updater user ID")


class PaymentRetryRequest(BaseModel):
    """Retry failed payment request"""
    retry_reason: str = Field(..., min_length=1, max_length=500, description="Retry reason")
    new_payment_method: Optional[str] = Field(None, pattern="^(bank_transfer|credit_card|digital_wallet|check|cash)$", description="New payment method")
    new_payment_reference: Optional[str] = Field(None, max_length=100, description="New payment reference")
    retry_amount: Optional[Decimal] = Field(None, ge=0, description="Retry amount (if different)")
    retried_by: str = Field(..., description="Retrier user ID")


class PaymentRefundRequest(BaseModel):
    """Payment refund request"""
    refund_amount: Decimal = Field(..., ge=0, description="Refund amount")
    refund_reason: str = Field(..., min_length=1, max_length=1000, description="Refund reason")
    refund_method: str = Field("original", pattern="^(original|bank_transfer|check|cash)$", description="Refund method")
    refund_reference: Optional[str] = Field(None, max_length=100, description="Refund reference")
    processed_by: str = Field(..., description="Processor user ID")
    


class PaymentFilter(FilterParams):
    """Payment filter parameters"""
    supplier_id: Optional[str] = Field(None, description="Filter by supplier ID")
    statement_id: Optional[str] = Field(None, description="Filter by statement ID")
    status: Optional[str] = Field(None, pattern="^(pending|processing|completed|failed|cancelled|refunded)$", description="Payment status")
    payment_method: Optional[str] = Field(None, pattern="^(bank_transfer|credit_card|digital_wallet|check|cash)$", description="Payment method")
    payment_date_from: Optional[datetime] = Field(None, description="Payment date from")
    payment_date_to: Optional[datetime] = Field(None, description="Payment date to")
    amount_min: Optional[Decimal] = Field(None, ge=0, description="Minimum payment amount")
    amount_max: Optional[Decimal] = Field(None, ge=0, description="Maximum payment amount")
    currency: Optional[str] = Field(None, max_length=3, description="Payment currency")
    has_failures: Optional[bool] = Field(None, description="Filter payments with failures")
    is_refunded: Optional[bool] = Field(None, description="Filter refunded payments")


class PaymentBatchProcess(BaseModel):
    """Batch payment processing request"""
    statement_ids: List[str] = Field(..., min_items=1, description="List of statement IDs")
    payment_method: str = Field(..., pattern="^(bank_transfer|credit_card|digital_wallet|check|cash)$", description="Payment method")
    payment_date: Optional[datetime] = Field(None, description="Payment date")
    batch_reference: Optional[str] = Field(None, max_length=100, description="Batch reference")
    notes: Optional[str] = Field(None, max_length=1000, description="Batch notes")
    processed_by: str = Field(..., description="Processor user ID")


class PaymentReconciliation(BaseModel):
    """Payment reconciliation request"""
    bank_statement_file: str = Field(..., description="Bank statement file path/URL")
    reconciliation_date: datetime = Field(..., description="Reconciliation date")
    auto_match: bool = Field(True, description="Enable automatic matching")
    tolerance_amount: Optional[Decimal] = Field(None, ge=0, description="Amount tolerance for matching")
    reconciled_by: str = Field(..., description="Reconciler user ID")


# Response schemas
class PaymentRecordResponse(BaseModel):
    """Payment record response"""
    id: str
    payment_number: str
    statement_id: str
    supplier_id: str
    payment_amount: float
    payment_currency: str
    payment_method: str
    payment_reference: Optional[str]
    payment_date: datetime
    status: str
    confirmation_number: Optional[str]
    cleared_date: Optional[datetime]
    bank_reference: Optional[str]
    payer_bank_account: Optional[str]
    payee_bank_account: Optional[str]
    exchange_rate: Optional[float]
    transaction_fee: Optional[float]
    net_amount: float
    failure_reason: Optional[str]
    retry_count: int
    last_retry_date: Optional[datetime]
    notes: Optional[str]
    external_payment_id: Optional[str]
    is_reconciled: bool
    reconciled_date: Optional[datetime]
    refund_amount: Optional[float]
    refund_date: Optional[datetime]
    refund_reason: Optional[str]
    processed_by: str
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PaymentSummaryResponse(BaseModel):
    """Payment summary response"""
    total_payments: int = Field(0, description="Total number of payments")
    total_amount: float = Field(0.0, description="Total payment amount")
    pending_payments: int = Field(0, description="Pending payments count")
    pending_amount: float = Field(0.0, description="Pending payment amount")
    completed_payments: int = Field(0, description="Completed payments count")
    completed_amount: float = Field(0.0, description="Completed payment amount")
    failed_payments: int = Field(0, description="Failed payments count")
    failed_amount: float = Field(0.0, description="Failed payment amount")
    refunded_payments: int = Field(0, description="Refunded payments count")
    refunded_amount: float = Field(0.0, description="Refunded payment amount")
    average_payment_amount: float = Field(0.0, description="Average payment amount")
    total_transaction_fees: float = Field(0.0, description="Total transaction fees")
    success_rate: float = Field(0.0, description="Payment success rate percentage")


class PaymentMethodStatsResponse(BaseModel):
    """Payment method statistics response"""
    payment_method: str
    usage_count: int
    usage_percentage: float
    total_amount: float
    average_amount: float
    success_rate: float
    average_processing_time: Optional[float]
    total_fees: float


class PaymentAnalyticsResponse(BaseModel):
    """Payment analytics response"""
    period: str
    supplier_id: Optional[str]
    summary: PaymentSummaryResponse
    method_stats: List[PaymentMethodStatsResponse] = Field(default_factory=list, description="Payment method statistics")
    trends: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict, description="Payment trends")
    comparisons: Dict[str, float] = Field(default_factory=dict, description="Period comparisons")
    top_suppliers: List[Dict[str, Any]] = Field(default_factory=list, description="Top suppliers by payment volume")
    processing_times: Dict[str, float] = Field(default_factory=dict, description="Average processing times")


class PaymentReconciliationResponse(BaseModel):
    """Payment reconciliation response"""
    reconciliation_id: str
    total_bank_records: int
    matched_payments: int
    unmatched_payments: int
    disputed_payments: int
    total_matched_amount: float
    total_unmatched_amount: float
    reconciliation_rate: float
    discrepancies: List[Dict[str, Any]] = Field(default_factory=list, description="Reconciliation discrepancies")
    processing_time: float
    reconciled_by: str
    reconciled_at: datetime


class PaymentBatchResponse(BaseModel):
    """Payment batch processing response"""
    batch_id: str
    total_statements: int
    successful_payments: int
    failed_payments: int
    total_amount: float
    successful_amount: float
    failed_amount: float
    processing_time: float
    batch_status: str
    errors: List[Dict[str, str]] = Field(default_factory=list, description="Processing errors")
    processed_by: str
    processed_at: datetime


# API Response types
PaymentRecordListResponse = ListResponse[PaymentRecordResponse]
PaymentRecordSingleResponse = BaseResponse[PaymentRecordResponse]
PaymentSummaryResponse = BaseResponse[PaymentSummaryResponse]
PaymentAnalyticsResponse = BaseResponse[PaymentAnalyticsResponse]
PaymentReconciliationResponse = BaseResponse[PaymentReconciliationResponse]
PaymentBatchResponse = BaseResponse[PaymentBatchResponse]