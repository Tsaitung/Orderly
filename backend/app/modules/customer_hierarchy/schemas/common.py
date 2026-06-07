"""
Common schemas used across the hierarchy system
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
import re


class AddressSchema(BaseModel):
    """Standard address schema"""
    street: str = Field(..., min_length=1, max_length=255, description="Street address")
    district: Optional[str] = Field(None, max_length=100, description="District or area")
    city: str = Field(..., min_length=1, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=100, description="State or province")
    postal_code: Optional[str] = Field(None, pattern=r"^\d{3,5}$", description="Postal code (3-5 digits)")
    country: str = Field(default="Taiwan", max_length=100, description="Country")
    
    @validator('postal_code')
    def validate_postal_code(cls, v):
        if v and not re.match(r'^\d{3,5}$', v):
            raise ValueError('Postal code must be 3-5 digits')
        return v


class ContactSchema(BaseModel):
    """Standard contact information schema"""
    name: Optional[str] = Field(None, max_length=255, description="Contact person name")
    title: Optional[str] = Field(None, max_length=100, description="Job title")
    phone: Optional[str] = Field(None, max_length=50, description="Phone number")
    mobile: Optional[str] = Field(None, max_length=50, description="Mobile number")
    email: Optional[str] = Field(None, max_length=255, description="Email address")
    fax: Optional[str] = Field(None, max_length=50, description="Fax number")
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")
    
    @validator('email')
    def validate_email(cls, v):
        if v and not re.match(r'^[^@]+@[^@]+\.[^@]+$', v):
            raise ValueError('Invalid email format')
        return v
    
    @validator('phone', 'mobile')
    def validate_phone_format(cls, v):
        if v:
            # Remove common separators
            clean_phone = re.sub(r'[-\s\(\)]', '', v)
            
            # Taiwan phone patterns
            patterns = [
                r'^09\d{8}$',        # Mobile: 09xxxxxxxx
                r'^0\d{1,2}\d{7,8}$', # Landline: 0x-xxxxxxxx
                r'^\+886\d{9}$',     # International mobile
                r'^\+886\d{8,9}$'    # International landline
            ]
            
            if not any(re.match(pattern, clean_phone) for pattern in patterns):
                raise ValueError(
                    'Invalid phone format. Examples: 0912345678, 02-12345678, +886912345678'
                )
        return v


class CoordinatesSchema(BaseModel):
    """GPS coordinates schema"""
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")
    accuracy: Optional[float] = Field(None, ge=0, description="Accuracy in meters")
    source: Optional[str] = Field(None, max_length=50, description="Source of coordinates")


class OperatingHoursSchema(BaseModel):
    """Operating hours for a single day"""
    open: Optional[str] = Field(None, pattern=r'^([01]?\d|2[0-3]):[0-5]\d$', description="Opening time (HH:MM)")
    close: Optional[str] = Field(None, pattern=r'^([01]?\d|2[0-3]):[0-5]\d$', description="Closing time (HH:MM)")
    is_closed: bool = Field(default=False, description="Whether closed on this day")
    breaks: Optional[List[Dict[str, str]]] = Field(None, description="Break periods")


class WeeklyOperatingHoursSchema(BaseModel):
    """Operating hours for the week"""
    monday: Optional[OperatingHoursSchema] = None
    tuesday: Optional[OperatingHoursSchema] = None
    wednesday: Optional[OperatingHoursSchema] = None
    thursday: Optional[OperatingHoursSchema] = None
    friday: Optional[OperatingHoursSchema] = None
    saturday: Optional[OperatingHoursSchema] = None
    sunday: Optional[OperatingHoursSchema] = None


class PaginationSchema(BaseModel):
    """Pagination parameters"""
    skip: int = Field(default=0, ge=0, description="Number of records to skip")
    limit: int = Field(default=100, ge=1, le=1000, description="Maximum number of records to return")


class SortSchema(BaseModel):
    """Sorting parameters"""
    field: str = Field(..., description="Field to sort by")
    direction: str = Field(default="asc", pattern=r'^(asc|desc)$', description="Sort direction")


class FilterSchema(BaseModel):
    """Base filtering schema"""
    search: Optional[str] = Field(None, max_length=255, description="Search term")
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    created_after: Optional[datetime] = Field(None, description="Filter by creation date")
    created_before: Optional[datetime] = Field(None, description="Filter by creation date")


class BaseResponseSchema(BaseModel):
    """Base response schema with common fields"""
    id: str = Field(..., description="Unique identifier")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    created_by: str = Field(..., description="User who created the record")
    updated_by: Optional[str] = Field(None, description="User who last updated the record")
    is_active: bool = Field(..., description="Whether the record is active")
    extra_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional extra_data")
    notes: Optional[str] = Field(None, description="Notes")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }


class ErrorResponseSchema(BaseModel):
    """Standard error response schema"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.now, description="Error timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }


class SuccessResponseSchema(BaseModel):
    """Standard success response schema"""
    success: bool = Field(default=True, description="Success flag")
    message: str = Field(..., description="Success message")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")


class ValidationErrorSchema(BaseModel):
    """Validation error details"""
    field: str = Field(..., description="Field that failed validation")
    message: str = Field(..., description="Validation error message")
    value: Optional[Any] = Field(None, description="Value that failed validation")


class BulkOperationResponseSchema(BaseModel):
    """Response for bulk operations"""
    total_requested: int = Field(..., description="Total number of operations requested")
    successful: int = Field(..., description="Number of successful operations")
    failed: int = Field(..., description="Number of failed operations")
    errors: List[ValidationErrorSchema] = Field(default_factory=list, description="List of errors")
    results: List[Dict[str, Any]] = Field(default_factory=list, description="Operation results")


class AuditLogSchema(BaseModel):
    """Audit log entry schema"""
    action: str = Field(..., description="Action performed")
    entity_type: str = Field(..., description="Type of entity")
    entity_id: str = Field(..., description="Entity ID")
    user_id: str = Field(..., description="User who performed the action")
    timestamp: datetime = Field(..., description="When the action was performed")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")
    ip_address: Optional[str] = Field(None, description="IP address of the user")
    user_agent: Optional[str] = Field(None, description="User agent string")
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }