"""
Customer Location schemas (地點)
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from .common import (
    BaseResponseSchema, FilterSchema, PaginationSchema, 
    AddressSchema, ContactSchema, CoordinatesSchema, WeeklyOperatingHoursSchema
)
import re


class LocationCreateSchema(BaseModel):
    """Schema for creating a new customer location"""
    company_id: str = Field(..., description="Parent company ID (所屬公司)")
    name: str = Field(..., min_length=2, max_length=255, description="Location name (地點名稱)")
    code: Optional[str] = Field(None, min_length=1, max_length=50, description="Location code (地點代碼)")
    
    # Address information
    address: AddressSchema = Field(..., description="Complete address details")
    
    # Contact information
    delivery_contact: ContactSchema = Field(..., description="Delivery contact information")
    delivery_phone: Optional[str] = Field(None, max_length=50, description="Primary delivery phone")
    delivery_instructions: Optional[str] = Field(None, max_length=1000, description="Special delivery instructions")
    
    # Operating information
    operating_hours: Optional[WeeklyOperatingHoursSchema] = Field(None, description="Operating hours")
    coordinates: Optional[CoordinatesSchema] = Field(None, description="GPS coordinates")
    timezone: str = Field(default="Asia/Taipei", max_length=50, description="Timezone")
    
    # Additional data
    extra_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional extra_data")
    notes: Optional[str] = Field(None, max_length=1000, description="Notes")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Location name cannot be empty")
        return v.strip()
    
    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        if v is not None:
            v = v.strip().upper()
            if not re.match(r'^[A-Z0-9_-]+$', v):
                raise ValueError("Location code must contain only uppercase letters, numbers, underscore and hyphen")
        return v


class LocationUpdateSchema(BaseModel):
    """Schema for updating a customer location"""
    name: Optional[str] = Field(None, min_length=2, max_length=255, description="Location name")
    code: Optional[str] = Field(None, min_length=1, max_length=50, description="Location code")
    address: Optional[AddressSchema] = Field(None, description="Address details")
    delivery_contact: Optional[ContactSchema] = Field(None, description="Delivery contact")
    delivery_phone: Optional[str] = Field(None, max_length=50, description="Delivery phone")
    delivery_instructions: Optional[str] = Field(None, max_length=1000, description="Delivery instructions")
    operating_hours: Optional[WeeklyOperatingHoursSchema] = Field(None, description="Operating hours")
    coordinates: Optional[CoordinatesSchema] = Field(None, description="GPS coordinates")
    timezone: Optional[str] = Field(None, max_length=50, description="Timezone")
    extra_data: Optional[Dict[str, Any]] = Field(None, description="Additional extra_data")
    notes: Optional[str] = Field(None, max_length=1000, description="Notes")
    is_active: Optional[bool] = Field(None, description="Active status")


class LocationResponseSchema(BaseResponseSchema):
    """Schema for location response"""
    company_id: str = Field(..., description="Parent company ID")
    name: str = Field(..., description="Location name")
    code: Optional[str] = Field(None, description="Location code")
    address: Dict[str, Any] = Field(..., description="Address details")
    city: Optional[str] = Field(None, description="City")
    delivery_contact: Dict[str, Any] = Field(..., description="Delivery contact")
    delivery_phone: Optional[str] = Field(None, description="Delivery phone")
    delivery_instructions: Optional[str] = Field(None, description="Delivery instructions")
    operating_hours: Optional[Dict[str, Any]] = Field(None, description="Operating hours")
    coordinates: Optional[Dict[str, Any]] = Field(None, description="GPS coordinates")
    timezone: Optional[str] = Field(None, description="Timezone")
    
    # Statistics
    business_unit_count: Optional[int] = Field(None, description="Number of business units")
    
    # Relationships
    company_name: Optional[str] = Field(None, description="Parent company name")
    full_address: Optional[str] = Field(None, description="Formatted full address")
    full_hierarchy_path: Optional[str] = Field(None, description="Full hierarchy path")


class LocationDetailResponseSchema(LocationResponseSchema):
    """Detailed location response with related entities"""
    company: Optional[Dict[str, Any]] = Field(None, description="Parent company details")
    business_units: Optional[List[Dict[str, Any]]] = Field(None, description="Business units at this location")
    hierarchy_summary: Optional[Dict[str, Any]] = Field(None, description="Complete hierarchy summary")


class LocationFilterSchema(FilterSchema):
    """Filter schema for locations"""
    company_id: Optional[str] = Field(None, description="Filter by company ID")
    name_contains: Optional[str] = Field(None, max_length=255, description="Filter by name containing")
    code: Optional[str] = Field(None, max_length=50, description="Filter by exact code")
    city: Optional[str] = Field(None, max_length=100, description="Filter by city")
    has_business_units: Optional[bool] = Field(None, description="Filter by business unit existence")
    min_business_units: Optional[int] = Field(None, ge=0, description="Minimum business units")
    has_coordinates: Optional[bool] = Field(None, description="Filter by GPS coordinates existence")
    within_radius_km: Optional[float] = Field(None, ge=0, description="Within radius (requires center coords)")
    center_lat: Optional[float] = Field(None, ge=-90, le=90, description="Center latitude for radius search")
    center_lng: Optional[float] = Field(None, ge=-180, le=180, description="Center longitude for radius search")


class LocationListRequestSchema(BaseModel):
    """Request schema for listing locations"""
    pagination: Optional[PaginationSchema] = Field(default_factory=PaginationSchema)
    filters: Optional[LocationFilterSchema] = Field(default_factory=LocationFilterSchema)
    include_stats: bool = Field(default=False, description="Include statistics")
    include_business_units: bool = Field(default=False, description="Include business unit list")
    include_company: bool = Field(default=False, description="Include company details")


class LocationListResponseSchema(BaseModel):
    """Response schema for location listing"""
    items: List[LocationResponseSchema] = Field(..., description="List of locations")
    total: int = Field(..., description="Total number of locations")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Items per page")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_prev: bool = Field(..., description="Whether there are previous pages")


class LocationStatsSchema(BaseModel):
    """Schema for location statistics"""
    location_id: str = Field(..., description="Location ID")
    total_business_units: int = Field(default=0, description="Total business units")
    active_business_units: int = Field(default=0, description="Active business units")
    total_orders: Optional[int] = Field(None, description="Total orders")
    recent_orders: Optional[int] = Field(None, description="Recent orders (last 30 days)")
    revenue_summary: Optional[Dict[str, Any]] = Field(None, description="Revenue statistics")
    performance_metrics: Optional[Dict[str, Any]] = Field(None, description="Performance metrics")


class LocationValidationSchema(BaseModel):
    """Schema for location validation results"""
    location_id: str = Field(..., description="Location ID")
    is_valid: bool = Field(..., description="Whether location is valid")
    validation_score: float = Field(..., ge=0, le=1, description="Validation score (0-1)")
    validation_details: Dict[str, Any] = Field(..., description="Detailed validation results")
    issues: List[str] = Field(default_factory=list, description="List of validation issues")
    suggestions: List[str] = Field(default_factory=list, description="Improvement suggestions")
    last_validated: Optional[str] = Field(None, description="Last validation timestamp")


class LocationGeocodeSchema(BaseModel):
    """Schema for location geocoding results"""
    location_id: str = Field(..., description="Location ID")
    original_address: str = Field(..., description="Original address input")
    formatted_address: Optional[str] = Field(None, description="Formatted address from geocoding")
    coordinates: Optional[CoordinatesSchema] = Field(None, description="GPS coordinates")
    accuracy: Optional[str] = Field(None, description="Geocoding accuracy level")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="Geocoding confidence score")
    geocoding_provider: Optional[str] = Field(None, description="Geocoding service provider")
    geocoded_at: Optional[str] = Field(None, description="Geocoding timestamp")