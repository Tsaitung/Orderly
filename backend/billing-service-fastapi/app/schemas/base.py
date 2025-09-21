"""
Base Pydantic schemas for common response patterns
"""

from typing import Generic, TypeVar, List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal

T = TypeVar('T')


class BaseResponse(BaseModel, Generic[T]):
    """Standard API response format"""
    success: bool = Field(True, description="Request success status")
    message: Optional[str] = Field(None, description="Response message")
    data: Optional[T] = Field(None, description="Response data")


class ListResponse(BaseModel, Generic[T]):
    """Standard list response format"""
    success: bool = Field(True, description="Request success status")
    message: Optional[str] = Field(None, description="Response message")
    data: List[T] = Field(default_factory=list, description="List of items")
    total: int = Field(0, description="Total count of items")
    page: int = Field(1, description="Current page number")
    page_size: int = Field(50, description="Items per page")


class ErrorResponse(BaseModel):
    """Error response format"""
    success: bool = Field(False, description="Request success status")
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")


class PaginationParams(BaseModel):
    """Common pagination parameters"""
    page: int = Field(1, ge=1, description="Page number (starts from 1)")
    page_size: int = Field(50, ge=1, le=1000, description="Items per page")
    
    @property
    def offset(self) -> int:
        """Calculate offset for database queries"""
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        """Get limit for database queries"""
        return self.page_size


class FilterParams(BaseModel):
    """Common filter parameters"""
    search: Optional[str] = Field(None, description="Search query")
    sort_by: Optional[str] = Field(None, description="Sort field")
    sort_order: Optional[str] = Field("desc", pattern="^(asc|desc)$", description="Sort order")
    created_from: Optional[datetime] = Field(None, description="Filter from creation date")
    created_to: Optional[datetime] = Field(None, description="Filter to creation date")


class BulkOperationRequest(BaseModel):
    """Request for bulk operations"""
    ids: List[str] = Field(..., min_items=1, description="List of entity IDs")
    operation: str = Field(..., description="Operation to perform")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Operation parameters")


class BulkOperationResponse(BaseModel):
    """Response for bulk operations"""
    success: bool = Field(True, description="Overall operation success")
    total_processed: int = Field(0, description="Total items processed")
    successful: int = Field(0, description="Successfully processed items")
    failed: int = Field(0, description="Failed items")
    errors: List[Dict[str, str]] = Field(default_factory=list, description="Individual errors")


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str = Field("healthy", description="Service health status")
    service: str = Field(..., description="Service name")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Check timestamp")
    version: Optional[str] = Field(None, description="Service version")
    dependencies: Optional[Dict[str, str]] = Field(None, description="Dependencies health status")


class AuditInfo(BaseModel):
    """Audit information"""
    created_by: str = Field(..., description="Created by user ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_by: Optional[str] = Field(None, description="Last updated by user ID")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")


class AmountField(BaseModel):
    """Standardized amount field with currency support"""
    amount: Decimal = Field(..., ge=0, description="Amount value")
    currency: str = Field("TWD", description="Currency code")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class StatusUpdate(BaseModel):
    """Generic status update request"""
    status: str = Field(..., description="New status")
    reason: Optional[str] = Field(None, description="Reason for status change")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class SearchRequest(BaseModel):
    """Advanced search request"""
    query: str = Field(..., min_length=1, description="Search query")
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Search filters")
    fields: Optional[List[str]] = Field(None, description="Fields to search in")
    highlight: bool = Field(False, description="Enable result highlighting")


class ExportRequest(BaseModel):
    """Data export request"""
    format: str = Field("csv", pattern="^(csv|xlsx|pdf)$", description="Export format")
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Export filters")
    fields: Optional[List[str]] = Field(None, description="Fields to export")
    date_range: Optional[Dict[str, datetime]] = Field(None, description="Date range filter")


class ExportResponse(BaseModel):
    """Data export response"""
    file_url: str = Field(..., description="Download URL for exported file")
    file_name: str = Field(..., description="Generated file name")
    file_size: int = Field(..., description="File size in bytes")
    record_count: int = Field(..., description="Number of records exported")
    expires_at: datetime = Field(..., description="URL expiration time")


class NotificationPreference(BaseModel):
    """Notification preference settings"""
    email: bool = Field(True, description="Enable email notifications")
    sms: bool = Field(False, description="Enable SMS notifications")
    push: bool = Field(True, description="Enable push notifications")
    frequency: str = Field("immediate", pattern="^(immediate|daily|weekly)$", description="Notification frequency")