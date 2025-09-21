"""
Pydantic schemas for rate configuration APIs
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from decimal import Decimal
from .base import BaseResponse, ListResponse, PaginationParams, FilterParams


# Request schemas
class RateConfigCreate(BaseModel):
    """Create rate configuration request"""
    config_name: str = Field(..., min_length=1, max_length=100, description="Configuration name")
    config_type: str = Field(..., pattern="^(commission|subscription|addon)$", description="Configuration type")
    base_rate: Optional[Decimal] = Field(None, ge=0, le=1, description="Base rate (0.0-1.0)")
    min_amount: Optional[Decimal] = Field(None, ge=0, description="Minimum amount")
    max_amount: Optional[Decimal] = Field(None, ge=0, description="Maximum amount")
    effective_from: datetime = Field(..., description="Effective start date")
    effective_to: Optional[datetime] = Field(None, description="Effective end date")
    target_supplier_type: Optional[str] = Field(None, max_length=50, description="Target supplier type")
    target_product_category: Optional[str] = Field(None, max_length=50, description="Target product category")
    min_monthly_gmv: Optional[Decimal] = Field(None, ge=0, description="Minimum monthly GMV")
    max_monthly_gmv: Optional[Decimal] = Field(None, ge=0, description="Maximum monthly GMV")
    additional_config: Dict[str, Any] = Field(default_factory=dict, description="Additional configuration")
    created_by: str = Field(..., description="Creator user ID")
    
    
    


class RateConfigUpdate(BaseModel):
    """Update rate configuration request"""
    config_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Configuration name")
    base_rate: Optional[Decimal] = Field(None, ge=0, le=1, description="Base rate (0.0-1.0)")
    min_amount: Optional[Decimal] = Field(None, ge=0, description="Minimum amount")
    max_amount: Optional[Decimal] = Field(None, ge=0, description="Maximum amount")
    effective_to: Optional[datetime] = Field(None, description="Effective end date")
    target_supplier_type: Optional[str] = Field(None, max_length=50, description="Target supplier type")
    target_product_category: Optional[str] = Field(None, max_length=50, description="Target product category")
    min_monthly_gmv: Optional[Decimal] = Field(None, ge=0, description="Minimum monthly GMV")
    max_monthly_gmv: Optional[Decimal] = Field(None, ge=0, description="Maximum monthly GMV")
    additional_config: Optional[Dict[str, Any]] = Field(None, description="Additional configuration")
    updated_by: str = Field(..., description="Updater user ID")


class RateConfigActivate(BaseModel):
    """Activate rate configuration request"""
    approval_status: str = Field("approved", pattern="^(approved|rejected)$", description="Approval status")
    approved_by: str = Field(..., description="Approver user ID")
    approval_comments: Optional[str] = Field(None, max_length=500, description="Approval comments")


class RateConfigFilter(FilterParams):
    """Rate configuration filter parameters"""
    config_type: Optional[str] = Field(None, pattern="^(commission|subscription|addon)$", description="Configuration type")
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    target_supplier_type: Optional[str] = Field(None, description="Target supplier type")
    approval_status: Optional[str] = Field(None, pattern="^(draft|pending|approved|rejected)$", description="Approval status")
    effective_from: Optional[datetime] = Field(None, description="Effective from date")
    effective_to: Optional[datetime] = Field(None, description="Effective to date")


class TransactionRateTierCreate(BaseModel):
    """Create transaction rate tier request"""
    tier_name: str = Field(..., min_length=1, max_length=100, description="Tier name")
    min_monthly_gmv: Decimal = Field(..., ge=0, description="Minimum monthly GMV")
    max_monthly_gmv: Optional[Decimal] = Field(None, ge=0, description="Maximum monthly GMV")
    commission_rate: Decimal = Field(..., ge=0, le=1, description="Commission rate")
    tier_level: int = Field(..., ge=1, description="Tier level")
    is_active: bool = Field(True, description="Active status")
    description: Optional[str] = Field(None, max_length=500, description="Tier description")
    benefits: Dict[str, Any] = Field(default_factory=dict, description="Tier benefits")
    created_by: str = Field(..., description="Creator user ID")
    


class TransactionRateTierUpdate(BaseModel):
    """Update transaction rate tier request"""
    tier_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Tier name")
    max_monthly_gmv: Optional[Decimal] = Field(None, ge=0, description="Maximum monthly GMV")
    commission_rate: Optional[Decimal] = Field(None, ge=0, le=1, description="Commission rate")
    is_active: Optional[bool] = Field(None, description="Active status")
    description: Optional[str] = Field(None, max_length=500, description="Tier description")
    benefits: Optional[Dict[str, Any]] = Field(None, description="Tier benefits")
    updated_by: str = Field(..., description="Updater user ID")


# Response schemas
class RateConfigResponse(BaseModel):
    """Rate configuration response"""
    id: str
    config_name: str
    config_type: str
    is_active: bool
    base_rate: Optional[float]
    min_amount: Optional[float]
    max_amount: Optional[float]
    effective_from: datetime
    effective_to: Optional[datetime]
    target_supplier_type: Optional[str]
    target_product_category: Optional[str]
    min_monthly_gmv: Optional[float]
    max_monthly_gmv: Optional[float]
    additional_config: Dict[str, Any]
    created_by: str
    updated_by: Optional[str]
    approval_status: str
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    version: int
    parent_config_id: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class TransactionRateTierResponse(BaseModel):
    """Transaction rate tier response"""
    id: str
    tier_name: str
    min_monthly_gmv: float
    max_monthly_gmv: Optional[float]
    commission_rate: float
    tier_level: int
    is_active: bool
    description: Optional[str]
    benefits: Dict[str, Any]
    created_by: str
    updated_by: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class RateCalculationRequest(BaseModel):
    """Rate calculation request"""
    supplier_id: str = Field(..., description="Supplier ID")
    transaction_amount: Decimal = Field(..., ge=0, description="Transaction amount")
    product_category: Optional[str] = Field(None, description="Product category")
    supplier_type: Optional[str] = Field(None, description="Supplier type")
    monthly_gmv: Optional[Decimal] = Field(None, ge=0, description="Monthly GMV")


class RateCalculationResponse(BaseModel):
    """Rate calculation response"""
    applicable_rate: float = Field(..., description="Applicable commission rate")
    commission_amount: float = Field(..., description="Calculated commission amount")
    rate_config_id: Optional[str] = Field(None, description="Applied rate configuration ID")
    rate_tier_id: Optional[str] = Field(None, description="Applied rate tier ID")
    calculation_details: Dict[str, Any] = Field(default_factory=dict, description="Calculation breakdown")


# API Response types
RateConfigListResponse = ListResponse[RateConfigResponse]
RateConfigSingleResponse = BaseResponse[RateConfigResponse]
TransactionRateTierListResponse = ListResponse[TransactionRateTierResponse]
TransactionRateTierSingleResponse = BaseResponse[TransactionRateTierResponse]
RateCalculationSingleResponse = BaseResponse[RateCalculationResponse]