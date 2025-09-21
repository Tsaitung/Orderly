"""
Supplier-related Pydantic schemas for API serialization
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class SupplierStatusEnum(str, Enum):
    """Supplier status for API responses"""
    PENDING = "PENDING"
    VERIFIED = "VERIFIED" 
    SUSPENDED = "SUSPENDED"
    DEACTIVATED = "DEACTIVATED"


class DeliveryCapacityEnum(str, Enum):
    """Delivery capacity levels"""
    SMALL = "SMALL"
    MEDIUM = "MEDIUM"
    LARGE = "LARGE"


class OrganizationTypeEnum(str, Enum):
    """Organization type"""
    RESTAURANT = "restaurant"
    SUPPLIER = "supplier"


class BusinessTypeEnum(str, Enum):
    """Business entity type"""
    COMPANY = "company"
    INDIVIDUAL = "individual"


class OrganizationBase(BaseModel):
    """Basic organization information"""
    id: str
    name: str
    type: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True
    tax_id: Optional[str] = None
    business_type: Optional[str] = None
    delivery_zones: List[str] = []
    product_categories: List[str] = []
    certifications: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SupplierProfileBase(BaseModel):
    """Base supplier profile information"""
    organization_id: str
    status: SupplierStatusEnum
    delivery_capacity: Optional[DeliveryCapacityEnum] = None
    delivery_capacity_kg_per_day: int = 0
    operating_hours: Dict[str, Any] = {}
    delivery_zones: List[str] = []
    minimum_order_amount: float = 0
    payment_terms_days: int = 30
    quality_certifications: List[str] = []
    food_safety_license: Optional[str] = None
    food_safety_expires_at: Optional[datetime] = None
    contact_preferences: Dict[str, Any] = {}
    settings: Dict[str, Any] = {}
    public_description: Optional[str] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SupplierActivityMetrics(BaseModel):
    """Supplier activity and performance metrics"""
    total_orders: int = 0
    monthly_orders: int = 0
    total_gmv: float = 0
    monthly_gmv: float = 0
    avg_order_value: float = 0
    fulfillment_rate: float = 0
    on_time_delivery_rate: float = 0
    quality_score: float = 0
    customer_rating: float = 0
    response_time_hours: float = 0
    last_order_date: Optional[datetime] = None
    last_login_date: Optional[datetime] = None
    orders_growth_rate: float = 0
    gmv_growth_rate: float = 0


class SupplierDetail(BaseModel):
    """Complete supplier information with organization and metrics"""
    # Organization info
    id: str
    name: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    business_type: Optional[str] = None
    tax_id: Optional[str] = None
    product_categories: List[str] = []
    certifications: List[str] = []
    
    # Supplier profile info
    status: SupplierStatusEnum
    status_display: str
    delivery_capacity: Optional[DeliveryCapacityEnum] = None
    capacity_display: str
    delivery_capacity_kg_per_day: int = 0
    operating_hours: Dict[str, Any] = {}
    delivery_zones: List[str] = []
    minimum_order_amount: float = 0
    payment_terms_days: int = 30
    payment_terms_display: str
    quality_certifications: List[str] = []
    food_safety_license: Optional[str] = None
    food_safety_expires_at: Optional[datetime] = None
    public_description: Optional[str] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    
    # Activity metrics
    metrics: SupplierActivityMetrics
    
    # Timestamps
    join_date: datetime
    created_at: datetime
    updated_at: datetime
    
    # Activity status
    is_active: bool
    operating_status: str
    activity_level: str

    class Config:
        from_attributes = True


class SupplierCard(BaseModel):
    """Simplified supplier info for card display"""
    id: str
    name: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    status: SupplierStatusEnum
    status_display: str
    delivery_capacity: Optional[DeliveryCapacityEnum] = None
    capacity_display: str
    minimum_order_amount: float = 0
    payment_terms_display: str
    product_categories: List[str] = []
    certifications: List[str] = []
    
    # Key metrics for card
    monthly_gmv: float = 0
    monthly_orders: int = 0
    fulfillment_rate: float = 0
    quality_score: float = 0
    gmv_growth_rate: float = 0
    orders_growth_rate: float = 0
    
    # Activity info
    last_order_date: Optional[datetime] = None
    activity_level: str
    is_active: bool
    
    # Timestamps
    join_date: datetime

    class Config:
        from_attributes = True


class SupplierStats(BaseModel):
    """Overall supplier statistics"""
    total_suppliers: int = 0
    active_suppliers: int = 0
    pending_suppliers: int = 0
    suspended_suppliers: int = 0
    deactivated_suppliers: int = 0
    total_gmv: float = 0
    monthly_gmv: float = 0
    avg_fulfillment_rate: float = 0
    avg_quality_score: float = 0
    total_orders: int = 0
    monthly_orders: int = 0
    
    # Growth metrics
    supplier_growth_rate: float = 0
    gmv_growth_rate: float = 0
    orders_growth_rate: float = 0
    
    # Distribution
    capacity_distribution: Dict[str, int] = {}
    region_distribution: Dict[str, int] = {}
    category_distribution: Dict[str, int] = {}


class SupplierListResponse(BaseModel):
    """Paginated supplier list response"""
    suppliers: List[SupplierCard]
    total: int
    page: int
    page_size: int
    total_pages: int
    stats: SupplierStats


class SupplierUpdateRequest(BaseModel):
    """Request schema for updating supplier status"""
    status: SupplierStatusEnum
    internal_notes: Optional[str] = None
    verified_by: Optional[str] = None


class SupplierFilterRequest(BaseModel):
    """Request schema for filtering suppliers"""
    search: Optional[str] = None
    status: Optional[SupplierStatusEnum] = None
    delivery_capacity: Optional[DeliveryCapacityEnum] = None
    min_order_amount: Optional[float] = None
    max_order_amount: Optional[float] = None
    delivery_zones: Optional[List[str]] = None
    product_categories: Optional[List[str]] = None
    activity_level: Optional[str] = None  # active, moderate, inactive
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    sort_by: Optional[str] = "created_at"
    sort_order: Optional[str] = "desc"  # asc, desc