"""
Customer Company schemas (公司)
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from decimal import Decimal
from .common import BaseResponseSchema, FilterSchema, PaginationSchema, AddressSchema, ContactSchema
import re


class CompanyCreateSchema(BaseModel):
    """Schema for creating a new customer company"""
    group_id: Optional[str] = Field(None, description="Parent group ID (可選的上級集團)")
    name: str = Field(..., min_length=2, max_length=255, description="Company name (公司名稱)")
    legal_name: Optional[str] = Field(None, max_length=255, description="Legal registered name (法定名稱)")
    tax_id: str = Field(..., min_length=3, max_length=50, description="Tax ID or personal ID (統一編號或身分證號碼)")
    tax_id_type: str = Field(default="company", description="Type of tax ID: company, individual, foreign")
    
    # Billing information
    billing_address: AddressSchema = Field(..., description="Billing address details")
    billing_contact: ContactSchema = Field(..., description="Billing contact information")
    billing_email: Optional[str] = Field(None, max_length=255, description="Billing email address")
    
    # Financial settings
    payment_terms: Optional[str] = Field(None, max_length=50, description="Payment terms (e.g., NET30, NET60)")
    credit_limit: Optional[Decimal] = Field(None, ge=0, description="Credit limit for this company")
    
    # Additional data
    extra_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional extra_data")
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Company-specific settings")
    notes: Optional[str] = Field(None, max_length=1000, description="Notes")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Company name cannot be empty")
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Company name must be at least 2 characters long")
        return v
    
    @validator('tax_id')
    def validate_tax_id(cls, v, values):
        if not v or not v.strip():
            raise ValueError("Tax ID cannot be empty")
        
        v = v.strip().upper()
        tax_id_type = values.get('tax_id_type', 'company')
        
        if tax_id_type == 'company':
            # Taiwan company tax ID: 8 digits
            if not re.match(r'^\d{8}$', v):
                raise ValueError("Company tax ID must be exactly 8 digits")
        elif tax_id_type == 'individual':
            # Taiwan personal ID: 1 letter + 9 digits
            if not re.match(r'^[A-Z]\d{9}$', v):
                raise ValueError("Individual ID must be 1 letter followed by 9 digits")
        elif tax_id_type == 'foreign':
            # Foreign entity: more flexible validation
            if len(v) < 3 or len(v) > 50:
                raise ValueError("Foreign tax ID must be between 3 and 50 characters")
        else:
            raise ValueError("Invalid tax_id_type. Must be 'company', 'individual', or 'foreign'")
        
        return v
    
    @validator('tax_id_type')
    def validate_tax_id_type(cls, v):
        valid_types = ['company', 'individual', 'foreign']
        if v not in valid_types:
            raise ValueError(f"Tax ID type must be one of: {valid_types}")
        return v
    
    @validator('billing_email')
    def validate_billing_email(cls, v):
        if v and not re.match(r'^[^@]+@[^@]+\.[^@]+$', v):
            raise ValueError("Invalid email format")
        return v
    
    @validator('payment_terms')
    def validate_payment_terms(cls, v):
        if v:
            valid_patterns = [
                r'^NET\d{1,3}$',  # NET30, NET60, etc.
                r'^COD$',         # Cash on delivery
                r'^PREPAID$',     # Prepaid
                r'^EOM\d{1,2}$'   # End of month
            ]
            if not any(re.match(pattern, v.upper()) for pattern in valid_patterns):
                raise ValueError(
                    "Invalid payment terms format. Examples: NET30, COD, PREPAID, EOM30"
                )
            return v.upper()
        return v


class CompanyUpdateSchema(BaseModel):
    """Schema for updating a customer company"""
    group_id: Optional[str] = Field(None, description="Parent group ID (可選的上級集團)")
    name: Optional[str] = Field(None, min_length=2, max_length=255, description="Company name (公司名稱)")
    legal_name: Optional[str] = Field(None, max_length=255, description="Legal registered name (法定名稱)")
    tax_id: Optional[str] = Field(None, min_length=3, max_length=50, description="Tax ID or personal ID")
    tax_id_type: Optional[str] = Field(None, description="Type of tax ID")
    
    # Billing information
    billing_address: Optional[AddressSchema] = Field(None, description="Billing address details")
    billing_contact: Optional[ContactSchema] = Field(None, description="Billing contact information")
    billing_email: Optional[str] = Field(None, max_length=255, description="Billing email address")
    
    # Financial settings
    payment_terms: Optional[str] = Field(None, max_length=50, description="Payment terms")
    credit_limit: Optional[Decimal] = Field(None, ge=0, description="Credit limit")
    
    # Additional data
    extra_data: Optional[Dict[str, Any]] = Field(None, description="Additional extra_data")
    settings: Optional[Dict[str, Any]] = Field(None, description="Company-specific settings")
    notes: Optional[str] = Field(None, max_length=1000, description="Notes")
    is_active: Optional[bool] = Field(None, description="Active status")
    
    # Apply same validators as create schema
    @validator('name')
    def validate_name(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError("Company name cannot be empty")
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Company name must be at least 2 characters long")
        return v
    
    # Additional validators would be similar to create schema...


class CompanyResponseSchema(BaseResponseSchema):
    """Schema for company response"""
    group_id: Optional[str] = Field(None, description="Parent group ID")
    name: str = Field(..., description="Company name (公司名稱)")
    legal_name: Optional[str] = Field(None, description="Legal registered name (法定名稱)")
    tax_id: str = Field(..., description="Tax ID or personal ID")
    tax_id_type: str = Field(..., description="Type of tax ID")
    
    # Billing information
    billing_address: Dict[str, Any] = Field(..., description="Billing address details")
    billing_contact: Dict[str, Any] = Field(..., description="Billing contact information")
    billing_email: Optional[str] = Field(None, description="Billing email address")
    
    # Financial settings
    payment_terms: Optional[str] = Field(None, description="Payment terms")
    credit_limit: Optional[Decimal] = Field(None, description="Credit limit")
    
    # Legacy support
    legacy_organization_id: Optional[str] = Field(None, description="Legacy organization ID")
    
    # Company settings
    settings: Dict[str, Any] = Field(default_factory=dict, description="Company-specific settings")
    
    # Statistics (computed fields)
    location_count: Optional[int] = Field(None, description="Number of locations")
    total_business_units: Optional[int] = Field(None, description="Total business units")
    
    # Relationships
    group_name: Optional[str] = Field(None, description="Parent group name")
    full_hierarchy_path: Optional[str] = Field(None, description="Full hierarchy path")


class CompanyDetailResponseSchema(CompanyResponseSchema):
    """Detailed company response with related entities"""
    group: Optional[Dict[str, Any]] = Field(None, description="Parent group details")
    locations: Optional[List[Dict[str, Any]]] = Field(None, description="Company locations")
    hierarchy_summary: Optional[Dict[str, Any]] = Field(None, description="Complete hierarchy summary")
    billing_info: Optional[Dict[str, Any]] = Field(None, description="Complete billing information")


class CompanyFilterSchema(FilterSchema):
    """Filter schema for companies"""
    group_id: Optional[str] = Field(None, description="Filter by group ID")
    name_contains: Optional[str] = Field(None, max_length=255, description="Filter by name containing")
    tax_id: Optional[str] = Field(None, max_length=50, description="Filter by exact tax ID")
    tax_id_type: Optional[str] = Field(None, description="Filter by tax ID type")
    payment_terms: Optional[str] = Field(None, description="Filter by payment terms")
    has_locations: Optional[bool] = Field(None, description="Filter by whether company has locations")
    min_locations: Optional[int] = Field(None, ge=0, description="Minimum number of locations")
    max_locations: Optional[int] = Field(None, ge=0, description="Maximum number of locations")
    city: Optional[str] = Field(None, description="Filter by billing city")
    is_individual: Optional[bool] = Field(None, description="Filter individual businesses")
    is_foreign: Optional[bool] = Field(None, description="Filter foreign entities")
    has_credit_limit: Optional[bool] = Field(None, description="Filter by credit limit existence")
    min_credit_limit: Optional[Decimal] = Field(None, ge=0, description="Minimum credit limit")


class CompanyListRequestSchema(BaseModel):
    """Request schema for listing companies"""
    pagination: Optional[PaginationSchema] = Field(default_factory=PaginationSchema)
    filters: Optional[CompanyFilterSchema] = Field(default_factory=CompanyFilterSchema)
    include_stats: bool = Field(default=False, description="Include statistics")
    include_locations: bool = Field(default=False, description="Include location list")
    include_group: bool = Field(default=False, description="Include group details")


class CompanyListResponseSchema(BaseModel):
    """Response schema for company listing"""
    items: List[CompanyResponseSchema] = Field(..., description="List of companies")
    total: int = Field(..., description="Total number of companies")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Items per page")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_prev: bool = Field(..., description="Whether there are previous pages")


class CompanyBillingInfoSchema(BaseModel):
    """Company billing information schema"""
    company_name: str = Field(..., description="Company name for billing")
    tax_id: str = Field(..., description="Tax ID")
    tax_id_type: str = Field(..., description="Tax ID type")
    billing_address: AddressSchema = Field(..., description="Billing address")
    billing_contact: ContactSchema = Field(..., description="Billing contact")
    billing_email: Optional[str] = Field(None, description="Billing email")
    payment_terms: Optional[str] = Field(None, description="Payment terms")
    credit_limit: Optional[Decimal] = Field(None, description="Credit limit")


class CompanyBillingUpdateSchema(BaseModel):
    """Schema for updating company billing information"""
    billing_address: Optional[AddressSchema] = Field(None, description="Billing address")
    billing_contact: Optional[ContactSchema] = Field(None, description="Billing contact")
    billing_email: Optional[str] = Field(None, description="Billing email")
    payment_terms: Optional[str] = Field(None, description="Payment terms")
    credit_limit: Optional[Decimal] = Field(None, ge=0, description="Credit limit")


class CompanyStatsSchema(BaseModel):
    """Company statistics schema"""
    total_companies: int = Field(..., description="Total number of companies")
    active_companies: int = Field(..., description="Number of active companies")
    inactive_companies: int = Field(..., description="Number of inactive companies")
    companies_with_groups: int = Field(..., description="Companies that belong to groups")
    standalone_companies: int = Field(..., description="Companies without groups")
    companies_by_type: Dict[str, int] = Field(..., description="Companies by tax ID type")
    total_locations: int = Field(..., description="Total locations across all companies")
    total_business_units: int = Field(..., description="Total business units")
    avg_locations_per_company: float = Field(..., description="Average locations per company")
    companies_with_credit_limit: int = Field(..., description="Companies with credit limits")
    total_credit_limit: Optional[Decimal] = Field(None, description="Total credit limits")


class CompanyValidationSchema(BaseModel):
    """Company validation result schema"""
    is_valid: bool = Field(..., description="Whether the company is valid")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    business_rule_errors: List[str] = Field(default_factory=list, description="Business rule violations")
    tax_id_validation: Dict[str, Any] = Field(..., description="Tax ID validation details")
    billing_validation: Dict[str, Any] = Field(..., description="Billing information validation")


class CompanyDeletionCheckSchema(BaseModel):
    """Company deletion feasibility check schema"""
    can_delete: bool = Field(..., description="Whether the company can be deleted")
    blocking_reasons: List[str] = Field(default_factory=list, description="Reasons preventing deletion")
    cascade_impact: Dict[str, int] = Field(..., description="Impact of cascade deletion")
    alternatives: List[str] = Field(default_factory=list, description="Alternative actions")
    related_orders_count: Optional[int] = Field(None, description="Number of related orders")
    recent_activity: Optional[Dict[str, Any]] = Field(None, description="Recent activity summary")


class CompanyMigrationSchema(BaseModel):
    """Schema for company migration from legacy system"""
    legacy_organization_id: str = Field(..., description="Legacy organization ID")
    migration_config: Dict[str, Any] = Field(..., description="Migration configuration")
    dry_run: bool = Field(default=False, description="Whether to perform a dry run")
    auto_create_location: bool = Field(default=True, description="Auto-create default location")
    auto_create_business_unit: bool = Field(default=True, description="Auto-create default business unit")
    
    # Data mapping
    group_assignment: Optional[str] = Field(None, description="Group to assign company to")
    location_data: Optional[Dict[str, Any]] = Field(None, description="Default location data")
    business_unit_data: Optional[Dict[str, Any]] = Field(None, description="Default business unit data")