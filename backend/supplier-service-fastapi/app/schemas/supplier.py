"""
Pydantic schemas for Supplier Service API requests and responses
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field, EmailStr, validator
from enum import Enum


class SupplierStatus(str, Enum):
    """Supplier status enumeration for API"""
    PENDING = "pending"
    VERIFIED = "verified"
    SUSPENDED = "suspended"
    DEACTIVATED = "deactivated"


class DeliveryCapacity(str, Enum):
    """Delivery capacity enumeration for API"""
    SMALL = "SMALL"
    MEDIUM = "MEDIUM"
    LARGE = "LARGE"


class BusinessType(str, Enum):
    """Business type enumeration for API"""
    COMPANY = "company"
    INDIVIDUAL = "individual"


# ============================================================================
# Request Schemas
# ============================================================================

class SupplierProfileCreateRequest(BaseModel):
    """Request schema for creating a supplier profile"""
    organization_id: str = Field(..., description="Organization ID from organizations table")
    delivery_capacity: DeliveryCapacity = Field(default=DeliveryCapacity.SMALL)
    delivery_capacity_kg_per_day: int = Field(default=500, ge=1, le=10000)
    operating_hours: Dict[str, Any] = Field(default_factory=dict)
    delivery_zones: List[str] = Field(default_factory=list)
    minimum_order_amount: Decimal = Field(default=Decimal("1000.00"), ge=0)
    payment_terms_days: int = Field(default=30, ge=1, le=180)
    quality_certifications: List[Dict[str, Any]] = Field(default_factory=list)
    contact_preferences: Dict[str, Any] = Field(default_factory=dict)
    public_description: Optional[str] = Field(None, max_length=500)

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class SupplierProfileUpdateRequest(BaseModel):
    """Request schema for updating a supplier profile"""
    delivery_capacity: Optional[DeliveryCapacity] = None
    delivery_capacity_kg_per_day: Optional[int] = Field(None, ge=1, le=10000)
    operating_hours: Optional[Dict[str, Any]] = None
    delivery_zones: Optional[List[str]] = None
    minimum_order_amount: Optional[Decimal] = Field(None, ge=0)
    payment_terms_days: Optional[int] = Field(None, ge=1, le=180)
    quality_certifications: Optional[List[Dict[str, Any]]] = None
    contact_preferences: Optional[Dict[str, Any]] = None
    public_description: Optional[str] = Field(None, max_length=500)
    settings: Optional[Dict[str, Any]] = None

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class SupplierCustomerCreateRequest(BaseModel):
    """Request schema for creating supplier-customer relationship"""
    supplier_id: str = Field(..., description="Supplier organization ID")
    customer_id: str = Field(..., description="Customer organization ID")
    relationship_type: str = Field(default="active")
    credit_limit_ntd: int = Field(default=0, ge=0)
    payment_terms_days: int = Field(default=30, ge=1, le=180)
    custom_pricing_rules: Dict[str, Any] = Field(default_factory=dict)
    special_delivery_instructions: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=1000)


class OnboardingStepUpdateRequest(BaseModel):
    """Request schema for updating onboarding step"""
    step_name: str = Field(..., description="Name of the onboarding step")
    step_data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class SupplierStatusUpdateRequest(BaseModel):
    """Request schema for updating supplier status"""
    status: SupplierStatus = Field(..., description="New supplier status")
    notes: Optional[str] = Field(None, max_length=1000, description="Admin notes for status change")


# ============================================================================
# Response Schemas
# ============================================================================

class SupplierProfileResponse(BaseModel):
    """Response schema for supplier profile data"""
    id: str
    organization_id: str
    status: SupplierStatus
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    delivery_capacity: DeliveryCapacity
    delivery_capacity_kg_per_day: int
    operating_hours: Dict[str, Any]
    delivery_zones: List[str]
    minimum_order_amount: Decimal
    payment_terms_days: int
    quality_certifications: List[Dict[str, Any]]
    contact_preferences: Dict[str, Any]
    public_description: Optional[str] = None
    settings: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class SupplierCustomerResponse(BaseModel):
    """Response schema for supplier-customer relationship"""
    id: str
    supplier_id: str
    customer_id: str
    relationship_type: str
    credit_limit_ntd: int
    payment_terms_days: int
    first_order_date: Optional[datetime] = None
    last_order_date: Optional[datetime] = None
    total_orders: int
    total_revenue_ntd: Decimal
    custom_pricing_rules: Dict[str, Any]
    special_delivery_instructions: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class OnboardingProgressResponse(BaseModel):
    """Response schema for onboarding progress"""
    id: str
    supplier_id: str
    step_company_info: bool
    step_company_info_completed_at: Optional[datetime] = None
    step_business_documents: bool
    step_business_documents_completed_at: Optional[datetime] = None
    step_delivery_setup: bool
    step_delivery_setup_completed_at: Optional[datetime] = None
    step_product_categories: bool
    step_product_categories_completed_at: Optional[datetime] = None
    step_verification: bool
    step_verification_completed_at: Optional[datetime] = None
    is_completed: bool
    completed_at: Optional[datetime] = None
    completion_percentage: int
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SupplierListResponse(BaseModel):
    """Response schema for paginated supplier list"""
    suppliers: List[SupplierProfileResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


class SupplierCustomerListResponse(BaseModel):
    """Response schema for paginated supplier customers list"""
    customers: List[SupplierCustomerResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


# ============================================================================
# Dashboard and Analytics Schemas
# ============================================================================

class SupplierDashboardMetrics(BaseModel):
    """Response schema for supplier dashboard metrics"""
    # Today's metrics
    today_orders: int = 0
    today_completed_orders: int = 0
    today_revenue: Decimal = Decimal("0.00")
    
    # Week metrics
    week_orders: int = 0
    week_revenue: Decimal = Decimal("0.00")
    
    # Month metrics
    month_orders: int = 0
    month_revenue: Decimal = Decimal("0.00")
    
    # Performance metrics
    active_customers: int = 0
    avg_order_value: Decimal = Decimal("0.00")
    on_time_delivery_rate: float = 0.0
    customer_satisfaction_rate: float = 0.0
    
    # Status counts
    pending_orders: int = 0
    in_progress_orders: int = 0
    completed_orders_today: int = 0

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class SupplierDashboardResponse(BaseModel):
    """Complete dashboard data for supplier portal"""
    supplier_profile: SupplierProfileResponse
    metrics: SupplierDashboardMetrics
    recent_orders: List[Dict[str, Any]] = Field(default_factory=list)
    top_customers: List[Dict[str, Any]] = Field(default_factory=list)
    alerts: List[Dict[str, Any]] = Field(default_factory=list)

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


# ============================================================================
# Common Response Schemas
# ============================================================================

class StandardResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = "healthy"
    service: str = "supplier-service-fastapi"
    version: str = "0.1.0"
    timestamp: datetime = Field(default_factory=datetime.now)


# ============================================================================
# Validation and Helper Functions
# ============================================================================

class PaginationParams(BaseModel):
    """Common pagination parameters"""
    page: int = Field(default=1, ge=1, description="Page number (1-based)")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    sort_by: Optional[str] = Field(default="created_at", description="Sort field")
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$", description="Sort direction")


class SupplierFilterParams(BaseModel):
    """Filter parameters for supplier listing"""
    status: Optional[SupplierStatus] = None
    delivery_capacity: Optional[DeliveryCapacity] = None
    delivery_zone: Optional[str] = None
    min_capacity_kg: Optional[int] = Field(None, ge=0)
    max_capacity_kg: Optional[int] = Field(None, ge=0)
    verified_only: bool = Field(default=False)
    search_query: Optional[str] = Field(None, max_length=100)