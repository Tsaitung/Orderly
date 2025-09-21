"""
Business Unit schemas (業務單位)
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from decimal import Decimal
from .common import BaseResponseSchema, FilterSchema, PaginationSchema, ContactSchema
import re


class BusinessUnitCreateSchema(BaseModel):
    """Schema for creating a new business unit"""
    location_id: str = Field(..., description="Parent location ID (所屬地點)")
    name: str = Field(..., min_length=2, max_length=255, description="Business unit name (業務單位名稱)")
    code: str = Field(..., min_length=1, max_length=50, description="Unique code within location (單位代碼)")
    type: Optional[str] = Field(None, max_length=50, description="Type of business unit")
    cost_center_code: Optional[str] = Field(None, max_length=50, description="Cost center code (成本中心代碼)")
    
    # Budget management
    budget_monthly: Optional[Decimal] = Field(None, ge=0, description="Monthly budget limit")
    budget_alert_threshold: Optional[Decimal] = Field(None, ge=0, le=100, description="Budget alert threshold %")
    
    # Contact information
    manager_contact: Optional[ContactSchema] = Field(None, description="Manager contact info")
    
    # Ordering permissions and restrictions
    ordering_permissions: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Ordering permissions")
    allowed_suppliers: Optional[List[str]] = Field(None, description="List of allowed supplier IDs")
    blocked_categories: Optional[List[str]] = Field(None, description="List of blocked category IDs")
    
    # Order limits and approval
    max_order_value: Optional[Decimal] = Field(None, ge=0, description="Maximum single order value")
    requires_approval: bool = Field(default=False, description="Whether orders require approval")
    approval_threshold: Optional[Decimal] = Field(None, ge=0, description="Order value threshold for approval")
    
    # Additional data
    extra_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional extra_data")
    notes: Optional[str] = Field(None, max_length=1000, description="Notes")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Business unit name cannot be empty")
        return v.strip()
    
    @validator('code')
    def validate_code(cls, v):
        if not v or not v.strip():
            raise ValueError("Business unit code cannot be empty")
        v = v.strip().upper()
        if not re.match(r'^[A-Z0-9_-]+$', v):
            raise ValueError("Business unit code must contain only uppercase letters, numbers, underscore and hyphen")
        return v


class BusinessUnitUpdateSchema(BaseModel):
    """Schema for updating a business unit"""
    name: Optional[str] = Field(None, min_length=2, max_length=255, description="Business unit name")
    code: Optional[str] = Field(None, min_length=1, max_length=50, description="Unit code")
    type: Optional[str] = Field(None, max_length=50, description="Type of business unit")
    cost_center_code: Optional[str] = Field(None, max_length=50, description="Cost center code")
    budget_monthly: Optional[Decimal] = Field(None, ge=0, description="Monthly budget limit")
    budget_alert_threshold: Optional[Decimal] = Field(None, ge=0, le=100, description="Budget alert threshold")
    manager_contact: Optional[ContactSchema] = Field(None, description="Manager contact info")
    ordering_permissions: Optional[Dict[str, Any]] = Field(None, description="Ordering permissions")
    allowed_suppliers: Optional[List[str]] = Field(None, description="Allowed supplier IDs")
    blocked_categories: Optional[List[str]] = Field(None, description="Blocked category IDs")
    max_order_value: Optional[Decimal] = Field(None, ge=0, description="Maximum order value")
    requires_approval: Optional[bool] = Field(None, description="Requires approval")
    approval_threshold: Optional[Decimal] = Field(None, ge=0, description="Approval threshold")
    extra_data: Optional[Dict[str, Any]] = Field(None, description="Additional extra_data")
    notes: Optional[str] = Field(None, max_length=1000, description="Notes")
    is_active: Optional[bool] = Field(None, description="Active status")


class BusinessUnitResponseSchema(BaseResponseSchema):
    """Schema for business unit response"""
    location_id: str = Field(..., description="Parent location ID")
    name: str = Field(..., description="Business unit name")
    code: str = Field(..., description="Unit code")
    type: Optional[str] = Field(None, description="Type of business unit")
    cost_center_code: Optional[str] = Field(None, description="Cost center code")
    budget_monthly: Optional[Decimal] = Field(None, description="Monthly budget limit")
    budget_alert_threshold: Optional[Decimal] = Field(None, description="Budget alert threshold")
    manager_contact: Optional[Dict[str, Any]] = Field(None, description="Manager contact info")
    ordering_permissions: Dict[str, Any] = Field(default_factory=dict, description="Ordering permissions")
    allowed_suppliers: Optional[List[str]] = Field(None, description="Allowed supplier IDs")
    blocked_categories: Optional[List[str]] = Field(None, description="Blocked category IDs")
    max_order_value: Optional[Decimal] = Field(None, description="Maximum order value")
    requires_approval: bool = Field(..., description="Requires approval")
    approval_threshold: Optional[Decimal] = Field(None, description="Approval threshold")
    
    # Relationships
    location_name: Optional[str] = Field(None, description="Parent location name")
    company_name: Optional[str] = Field(None, description="Company name")
    full_hierarchy_path: Optional[str] = Field(None, description="Full hierarchy path")


class BusinessUnitDetailResponseSchema(BusinessUnitResponseSchema):
    """Detailed business unit response with related entities"""
    location: Optional[Dict[str, Any]] = Field(None, description="Parent location details")
    ordering_restrictions: Optional[Dict[str, Any]] = Field(None, description="Complete ordering restrictions")
    budget_status: Optional[Dict[str, Any]] = Field(None, description="Current budget status")


class BusinessUnitFilterSchema(FilterSchema):
    """Filter schema for business units"""
    location_id: Optional[str] = Field(None, description="Filter by location ID")
    company_id: Optional[str] = Field(None, description="Filter by company ID")
    name_contains: Optional[str] = Field(None, max_length=255, description="Filter by name containing")
    code: Optional[str] = Field(None, max_length=50, description="Filter by exact code")
    type: Optional[str] = Field(None, max_length=50, description="Filter by business unit type")
    cost_center_code: Optional[str] = Field(None, max_length=50, description="Filter by cost center")
    has_budget: Optional[bool] = Field(None, description="Filter by budget existence")
    min_budget: Optional[Decimal] = Field(None, ge=0, description="Minimum budget")
    max_budget: Optional[Decimal] = Field(None, ge=0, description="Maximum budget")
    requires_approval: Optional[bool] = Field(None, description="Filter by approval requirement")
    has_supplier_restrictions: Optional[bool] = Field(None, description="Filter by supplier restrictions")
    has_category_restrictions: Optional[bool] = Field(None, description="Filter by category restrictions")


class BusinessUnitListRequestSchema(BaseModel):
    """Request schema for listing business units"""
    pagination: Optional[PaginationSchema] = Field(default_factory=PaginationSchema)
    filters: Optional[BusinessUnitFilterSchema] = Field(default_factory=BusinessUnitFilterSchema)
    include_location: bool = Field(default=False, description="Include location details")
    include_restrictions: bool = Field(default=False, description="Include ordering restrictions")
    include_budget_status: bool = Field(default=False, description="Include budget status")


class BusinessUnitListResponseSchema(BaseModel):
    """Response schema for business unit listing"""
    items: List[BusinessUnitResponseSchema] = Field(..., description="List of business units")
    total: int = Field(..., description="Total number of business units")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Items per page")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_prev: bool = Field(..., description="Whether there are previous pages")


class BusinessUnitOrderingRestrictionsSchema(BaseModel):
    """Business unit ordering restrictions schema"""
    can_order: bool = Field(..., description="Can place orders")
    can_modify_orders: bool = Field(..., description="Can modify orders")
    can_cancel_orders: bool = Field(..., description="Can cancel orders")
    max_order_value: Optional[Decimal] = Field(None, description="Maximum order value")
    requires_approval: bool = Field(..., description="Requires approval")
    approval_threshold: Optional[Decimal] = Field(None, description="Approval threshold")
    supplier_restrictions: bool = Field(..., description="Has supplier restrictions")
    allowed_suppliers: Optional[List[str]] = Field(None, description="Allowed suppliers")
    category_restrictions: bool = Field(..., description="Has category restrictions")
    blocked_categories: Optional[List[str]] = Field(None, description="Blocked categories")
    ordering_permissions: Dict[str, Any] = Field(..., description="Ordering permissions")


class BusinessUnitBudgetStatusSchema(BaseModel):
    """Business unit budget status schema"""
    has_budget: bool = Field(..., description="Has budget set")
    budget_monthly: Optional[Decimal] = Field(None, description="Monthly budget")
    current_spend: Decimal = Field(..., description="Current month spend")
    remaining: Optional[Decimal] = Field(None, description="Remaining budget")
    percentage_used: Optional[float] = Field(None, description="Percentage of budget used")
    alert_triggered: bool = Field(..., description="Whether alert threshold triggered")
    alert_threshold: Optional[float] = Field(None, description="Alert threshold percentage")


class BusinessUnitStatsSchema(BaseModel):
    """Schema for business unit statistics"""
    business_unit_id: str = Field(..., description="Business unit ID")
    total_orders: int = Field(default=0, description="Total orders")
    active_orders: int = Field(default=0, description="Active orders")
    completed_orders: int = Field(default=0, description="Completed orders")
    total_spend: Optional[Decimal] = Field(None, description="Total spend")
    monthly_spend: Optional[Decimal] = Field(None, description="Current month spend")
    budget_utilization: Optional[float] = Field(None, description="Budget utilization percentage")
    avg_order_value: Optional[Decimal] = Field(None, description="Average order value")
    performance_metrics: Optional[Dict[str, Any]] = Field(None, description="Performance metrics")


class BusinessUnitValidationSchema(BaseModel):
    """Schema for business unit validation results"""
    business_unit_id: str = Field(..., description="Business unit ID")
    is_valid: bool = Field(..., description="Whether business unit is valid")
    validation_score: float = Field(..., ge=0, le=1, description="Validation score (0-1)")
    validation_details: Dict[str, Any] = Field(..., description="Detailed validation results")
    issues: List[str] = Field(default_factory=list, description="List of validation issues")
    suggestions: List[str] = Field(default_factory=list, description="Improvement suggestions")
    compliance_status: Optional[Dict[str, Any]] = Field(None, description="Compliance status")
    last_validated: Optional[str] = Field(None, description="Last validation timestamp")


class BusinessUnitOrderingPermissionSchema(BaseModel):
    """Schema for business unit ordering permissions"""
    business_unit_id: str = Field(..., description="Business unit ID")
    can_order: bool = Field(default=True, description="Can place orders")
    can_modify_orders: bool = Field(default=True, description="Can modify orders")
    can_cancel_orders: bool = Field(default=True, description="Can cancel orders")
    max_order_value: Optional[Decimal] = Field(None, description="Maximum order value")
    requires_approval: bool = Field(default=False, description="Requires approval")
    approval_threshold: Optional[Decimal] = Field(None, description="Approval threshold")
    allowed_suppliers: Optional[List[str]] = Field(None, description="Allowed suppliers")
    blocked_categories: Optional[List[str]] = Field(None, description="Blocked categories")
    ordering_window: Optional[Dict[str, Any]] = Field(None, description="Ordering time window")
    permissions: Dict[str, Any] = Field(default_factory=dict, description="Additional permissions")


class BusinessUnitOrderingPermissionUpdateSchema(BaseModel):
    """Schema for updating business unit ordering permissions"""
    can_order: Optional[bool] = Field(None, description="Can place orders")
    can_modify_orders: Optional[bool] = Field(None, description="Can modify orders")
    can_cancel_orders: Optional[bool] = Field(None, description="Can cancel orders")
    max_order_value: Optional[Decimal] = Field(None, description="Maximum order value")
    requires_approval: Optional[bool] = Field(None, description="Requires approval")
    approval_threshold: Optional[Decimal] = Field(None, description="Approval threshold")
    allowed_suppliers: Optional[List[str]] = Field(None, description="Allowed suppliers")
    blocked_categories: Optional[List[str]] = Field(None, description="Blocked categories")
    ordering_window: Optional[Dict[str, Any]] = Field(None, description="Ordering time window")
    permissions: Optional[Dict[str, Any]] = Field(None, description="Additional permissions")


class BusinessUnitBudgetSchema(BaseModel):
    """Schema for business unit budget information"""
    business_unit_id: str = Field(..., description="Business unit ID")
    budget_monthly: Optional[Decimal] = Field(None, description="Monthly budget")
    budget_annual: Optional[Decimal] = Field(None, description="Annual budget")
    current_spend: Decimal = Field(default=0, description="Current period spend")
    remaining_budget: Optional[Decimal] = Field(None, description="Remaining budget")
    budget_utilization: Optional[float] = Field(None, description="Budget utilization %")
    alert_threshold: Optional[float] = Field(None, description="Alert threshold %")
    alert_triggered: bool = Field(default=False, description="Whether alert triggered")
    budget_period: str = Field(default="monthly", description="Budget period (monthly/annual)")
    last_updated: Optional[str] = Field(None, description="Last budget update")


class BusinessUnitBudgetUpdateSchema(BaseModel):
    """Schema for updating business unit budget"""
    budget_monthly: Optional[Decimal] = Field(None, description="Monthly budget")
    budget_annual: Optional[Decimal] = Field(None, description="Annual budget")
    alert_threshold: Optional[float] = Field(None, ge=0, le=100, description="Alert threshold %")
    budget_period: Optional[str] = Field(None, description="Budget period")