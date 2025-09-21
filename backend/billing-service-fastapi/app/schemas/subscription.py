"""
Pydantic schemas for subscription management APIs
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from decimal import Decimal
from .base import BaseResponse, ListResponse, PaginationParams, FilterParams


# Request schemas
class SubscriptionPlanCreate(BaseModel):
    """Create subscription plan request"""
    plan_code: str = Field(..., min_length=1, max_length=50, description="Unique plan code")
    plan_name: str = Field(..., min_length=1, max_length=100, description="Plan name")
    plan_name_en: Optional[str] = Field(None, max_length=100, description="English plan name")
    description: Optional[str] = Field(None, max_length=1000, description="Plan description")
    monthly_price: Decimal = Field(..., ge=0, description="Monthly price")
    annual_price: Optional[Decimal] = Field(None, ge=0, description="Annual price")
    setup_fee: Optional[Decimal] = Field(None, ge=0, description="Setup fee")
    tier_level: int = Field(..., ge=1, le=10, description="Tier level")
    display_order: int = Field(..., ge=1, description="Display order")
    max_monthly_orders: Optional[int] = Field(None, ge=0, description="Maximum monthly orders")
    max_products: Optional[int] = Field(None, ge=0, description="Maximum products")
    max_locations: Optional[int] = Field(None, ge=0, description="Maximum locations")
    max_api_calls: Optional[int] = Field(None, ge=0, description="Maximum API calls")
    storage_quota_gb: Optional[int] = Field(None, ge=0, description="Storage quota in GB")
    features: Dict[str, Any] = Field(default_factory=dict, description="Included features")
    restrictions: Dict[str, Any] = Field(default_factory=dict, description="Plan restrictions")
    commission_rate_override: Optional[Decimal] = Field(None, ge=0, le=1, description="Commission rate override")
    free_trial_days: Optional[int] = Field(None, ge=0, description="Free trial days")
    effective_from: datetime = Field(..., description="Effective start date")
    effective_to: Optional[datetime] = Field(None, description="Effective end date")
    created_by: str = Field(..., description="Creator user ID")
    
    


class SubscriptionPlanUpdate(BaseModel):
    """Update subscription plan request"""
    plan_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Plan name")
    plan_name_en: Optional[str] = Field(None, max_length=100, description="English plan name")
    description: Optional[str] = Field(None, max_length=1000, description="Plan description")
    monthly_price: Optional[Decimal] = Field(None, ge=0, description="Monthly price")
    annual_price: Optional[Decimal] = Field(None, ge=0, description="Annual price")
    setup_fee: Optional[Decimal] = Field(None, ge=0, description="Setup fee")
    display_order: Optional[int] = Field(None, ge=1, description="Display order")
    max_monthly_orders: Optional[int] = Field(None, ge=0, description="Maximum monthly orders")
    max_products: Optional[int] = Field(None, ge=0, description="Maximum products")
    max_locations: Optional[int] = Field(None, ge=0, description="Maximum locations")
    max_api_calls: Optional[int] = Field(None, ge=0, description="Maximum API calls")
    storage_quota_gb: Optional[int] = Field(None, ge=0, description="Storage quota in GB")
    features: Optional[Dict[str, Any]] = Field(None, description="Included features")
    restrictions: Optional[Dict[str, Any]] = Field(None, description="Plan restrictions")
    is_active: Optional[bool] = Field(None, description="Active status")
    is_public: Optional[bool] = Field(None, description="Public visibility")
    is_popular: Optional[bool] = Field(None, description="Popular plan flag")
    commission_rate_override: Optional[Decimal] = Field(None, ge=0, le=1, description="Commission rate override")
    free_trial_days: Optional[int] = Field(None, ge=0, description="Free trial days")
    effective_to: Optional[datetime] = Field(None, description="Effective end date")
    updated_by: str = Field(..., description="Updater user ID")


class SupplierSubscriptionCreate(BaseModel):
    """Create supplier subscription request"""
    supplier_id: str = Field(..., description="Supplier ID")
    plan_id: str = Field(..., description="Subscription plan ID")
    billing_cycle: str = Field("monthly", pattern="^(monthly|annual)$", description="Billing cycle")
    start_date: datetime = Field(..., description="Subscription start date")
    end_date: Optional[datetime] = Field(None, description="Subscription end date")
    auto_renew: bool = Field(True, description="Auto renewal flag")
    promo_code: Optional[str] = Field(None, max_length=50, description="Promotion code")
    payment_method_id: Optional[str] = Field(None, description="Payment method ID")
    created_by: str = Field(..., description="Creator user ID")


class SupplierSubscriptionUpdate(BaseModel):
    """Update supplier subscription request"""
    auto_renew: Optional[bool] = Field(None, description="Auto renewal flag")
    payment_method_id: Optional[str] = Field(None, description="Payment method ID")
    custom_features: Optional[Dict[str, Any]] = Field(None, description="Custom features")
    custom_limits: Optional[Dict[str, Any]] = Field(None, description="Custom limits")
    updated_by: str = Field(..., description="Updater user ID")


class SubscriptionUpgradeRequest(BaseModel):
    """Subscription upgrade request"""
    new_plan_id: str = Field(..., description="New plan ID")
    billing_cycle: Optional[str] = Field(None, pattern="^(monthly|annual)$", description="New billing cycle")
    effective_date: Optional[datetime] = Field(None, description="Upgrade effective date")
    prorate: bool = Field(True, description="Prorate charges")
    upgrade_reason: Optional[str] = Field(None, max_length=500, description="Upgrade reason")
    requested_by: str = Field(..., description="Requester user ID")


class SubscriptionCancelRequest(BaseModel):
    """Subscription cancellation request"""
    cancellation_date: Optional[datetime] = Field(None, description="Cancellation date (immediate if not provided)")
    cancellation_reason: str = Field(..., min_length=1, max_length=500, description="Cancellation reason")
    refund_eligible: bool = Field(False, description="Eligible for refund")
    cancelled_by: str = Field(..., description="Canceller user ID")


class SubscriptionFilter(FilterParams):
    """Subscription filter parameters"""
    supplier_id: Optional[str] = Field(None, description="Filter by supplier ID")
    plan_id: Optional[str] = Field(None, description="Filter by plan ID")
    status: Optional[str] = Field(None, pattern="^(active|cancelled|expired|trial|suspended)$", description="Subscription status")
    billing_cycle: Optional[str] = Field(None, pattern="^(monthly|annual)$", description="Billing cycle")
    tier_level: Optional[int] = Field(None, ge=1, description="Plan tier level")
    auto_renew: Optional[bool] = Field(None, description="Auto renewal status")
    expires_before: Optional[datetime] = Field(None, description="Expires before date")
    expires_after: Optional[datetime] = Field(None, description="Expires after date")


class PlanFilter(FilterParams):
    """Plan filter parameters"""
    tier_level: Optional[int] = Field(None, ge=1, description="Tier level")
    is_active: Optional[bool] = Field(None, description="Active status")
    is_public: Optional[bool] = Field(None, description="Public visibility")
    is_popular: Optional[bool] = Field(None, description="Popular plans only")
    price_min: Optional[Decimal] = Field(None, ge=0, description="Minimum price")
    price_max: Optional[Decimal] = Field(None, ge=0, description="Maximum price")


# Response schemas
class SubscriptionPlanResponse(BaseModel):
    """Subscription plan response"""
    id: str
    plan_code: str
    plan_name: str
    plan_name_en: Optional[str]
    description: Optional[str]
    monthly_price: float
    annual_price: Optional[float]
    setup_fee: Optional[float]
    tier_level: int
    display_order: int
    max_monthly_orders: Optional[int]
    max_products: Optional[int]
    max_locations: Optional[int]
    max_api_calls: Optional[int]
    storage_quota_gb: Optional[int]
    features: Dict[str, Any]
    restrictions: Dict[str, Any]
    is_active: bool
    is_public: bool
    is_popular: bool
    commission_rate_override: Optional[float]
    free_trial_days: Optional[int]
    promotional_price: Optional[float]
    promo_start_date: Optional[datetime]
    promo_end_date: Optional[datetime]
    effective_from: datetime
    effective_to: Optional[datetime]
    created_by: str
    updated_by: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class SupplierSubscriptionResponse(BaseModel):
    """Supplier subscription response"""
    id: str
    supplier_id: str
    plan_id: str
    plan_name: str
    status: str
    billing_cycle: str
    current_period_start: datetime
    current_period_end: datetime
    trial_start: Optional[datetime]
    trial_end: Optional[datetime]
    start_date: datetime
    end_date: Optional[datetime]
    cancelled_at: Optional[datetime]
    auto_renew: bool
    promo_code: Optional[str]
    monthly_fee: float
    setup_fee: Optional[float]
    discount_amount: Optional[float]
    payment_method_id: Optional[str]
    last_payment_date: Optional[datetime]
    next_payment_date: Optional[datetime]
    custom_features: Dict[str, Any]
    custom_limits: Dict[str, Any]
    usage_stats: Dict[str, Any]
    created_by: str
    updated_by: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class SubscriptionUsageResponse(BaseModel):
    """Subscription usage response"""
    subscription_id: str
    current_period_start: datetime
    current_period_end: datetime
    usage: Dict[str, int] = Field(default_factory=dict, description="Current usage metrics")
    limits: Dict[str, Optional[int]] = Field(default_factory=dict, description="Plan limits")
    usage_percentage: Dict[str, float] = Field(default_factory=dict, description="Usage percentages")
    warnings: List[str] = Field(default_factory=list, description="Usage warnings")


class SubscriptionBillingResponse(BaseModel):
    """Subscription billing response"""
    subscription_id: str
    billing_period: str
    amount_due: float
    due_date: datetime
    last_invoice_id: Optional[str]
    payment_status: str
    next_billing_date: Optional[datetime]
    payment_method: Optional[str]
    billing_history: List[Dict[str, Any]] = Field(default_factory=list, description="Recent billing history")


# API Response types
SubscriptionPlanListResponse = ListResponse[SubscriptionPlanResponse]
SubscriptionPlanSingleResponse = BaseResponse[SubscriptionPlanResponse]
SupplierSubscriptionListResponse = ListResponse[SupplierSubscriptionResponse]
SupplierSubscriptionSingleResponse = BaseResponse[SupplierSubscriptionResponse]
SubscriptionUsageSingleResponse = BaseResponse[SubscriptionUsageResponse]
SubscriptionBillingSingleResponse = BaseResponse[SubscriptionBillingResponse]