"""
Customer Group schemas (集團)
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from .common import BaseResponseSchema, FilterSchema, PaginationSchema
import re


class GroupCreateSchema(BaseModel):
    """Schema for creating a new customer group"""
    name: str = Field(..., min_length=2, max_length=255, description="Group name (集團名稱)")
    code: Optional[str] = Field(None, min_length=2, max_length=50, description="Unique group code (集團代碼)")
    description: Optional[str] = Field(None, max_length=1000, description="Group description (集團描述)")
    extra_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional extra_data")
    notes: Optional[str] = Field(None, max_length=1000, description="Notes")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Group name cannot be empty")
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Group name must be at least 2 characters long")
        return v
    
    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        if v is not None:
            v = v.strip().upper()
            if not re.match(r'^[A-Z0-9_-]+$', v):
                raise ValueError(
                    "Group code must contain only uppercase letters, numbers, underscore and hyphen"
                )
            if len(v) < 2:
                raise ValueError("Group code must be at least 2 characters long")
            if len(v) > 50:
                raise ValueError("Group code cannot exceed 50 characters")
        return v


class GroupUpdateSchema(BaseModel):
    """Schema for updating a customer group"""
    name: Optional[str] = Field(None, min_length=2, max_length=255, description="Group name (集團名稱)")
    code: Optional[str] = Field(None, min_length=2, max_length=50, description="Unique group code (集團代碼)")
    description: Optional[str] = Field(None, max_length=1000, description="Group description (集團描述)")
    extra_data: Optional[Dict[str, Any]] = Field(None, description="Additional extra_data")
    notes: Optional[str] = Field(None, max_length=1000, description="Notes")
    is_active: Optional[bool] = Field(None, description="Active status")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError("Group name cannot be empty")
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Group name must be at least 2 characters long")
        return v
    
    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        if v is not None:
            v = v.strip().upper()
            if not re.match(r'^[A-Z0-9_-]+$', v):
                raise ValueError(
                    "Group code must contain only uppercase letters, numbers, underscore and hyphen"
                )
            if len(v) < 2:
                raise ValueError("Group code must be at least 2 characters long")
            if len(v) > 50:
                raise ValueError("Group code cannot exceed 50 characters")
        return v


class GroupResponseSchema(BaseResponseSchema):
    """Schema for group response"""
    name: str = Field(..., description="Group name (集團名稱)")
    code: Optional[str] = Field(None, description="Unique group code (集團代碼)")
    description: Optional[str] = Field(None, description="Group description (集團描述)")
    
    # Statistics (computed fields)
    company_count: Optional[int] = Field(None, description="Number of companies in this group")
    total_locations: Optional[int] = Field(None, description="Total number of locations")
    total_business_units: Optional[int] = Field(None, description="Total number of business units")


class GroupDetailResponseSchema(GroupResponseSchema):
    """Detailed group response with related entities"""
    companies: Optional[List[Dict[str, Any]]] = Field(None, description="Companies in this group")
    hierarchy_summary: Optional[Dict[str, Any]] = Field(None, description="Complete hierarchy summary")


class GroupFilterSchema(FilterSchema):
    """Filter schema for groups"""
    name_contains: Optional[str] = Field(None, max_length=255, description="Filter by name containing")
    code: Optional[str] = Field(None, max_length=50, description="Filter by exact code")
    has_companies: Optional[bool] = Field(None, description="Filter by whether group has companies")
    min_companies: Optional[int] = Field(None, ge=0, description="Minimum number of companies")
    max_companies: Optional[int] = Field(None, ge=0, description="Maximum number of companies")


class GroupListRequestSchema(BaseModel):
    """Request schema for listing groups"""
    pagination: Optional[PaginationSchema] = Field(default_factory=PaginationSchema)
    filters: Optional[GroupFilterSchema] = Field(default_factory=GroupFilterSchema)
    include_stats: bool = Field(default=False, description="Include statistics")
    include_companies: bool = Field(default=False, description="Include company list")


class GroupListResponseSchema(BaseModel):
    """Response schema for group listing"""
    items: List[GroupResponseSchema] = Field(..., description="List of groups")
    total: int = Field(..., description="Total number of groups")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Items per page")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_prev: bool = Field(..., description="Whether there are previous pages")


class GroupStatsSchema(BaseModel):
    """Group statistics schema"""
    total_groups: int = Field(..., description="Total number of groups")
    active_groups: int = Field(..., description="Number of active groups")
    inactive_groups: int = Field(..., description="Number of inactive groups")
    groups_with_companies: int = Field(..., description="Groups that have companies")
    empty_groups: int = Field(..., description="Groups without companies")
    total_companies: int = Field(..., description="Total companies across all groups")
    total_locations: int = Field(..., description="Total locations across all groups")
    total_business_units: int = Field(..., description="Total business units across all groups")
    avg_companies_per_group: float = Field(..., description="Average companies per group")


class GroupHierarchySummarySchema(BaseModel):
    """Group hierarchy summary schema"""
    group_id: str = Field(..., description="Group ID")
    group_name: str = Field(..., description="Group name")
    group_code: Optional[str] = Field(None, description="Group code")
    companies_count: int = Field(..., description="Number of companies")
    total_locations: int = Field(..., description="Total locations")
    total_business_units: int = Field(..., description="Total business units")
    companies: List[Dict[str, Any]] = Field(..., description="Company summaries")


class GroupValidationSchema(BaseModel):
    """Group validation result schema"""
    is_valid: bool = Field(..., description="Whether the group is valid")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    business_rule_errors: List[str] = Field(default_factory=list, description="Business rule violations")


class GroupDeletionCheckSchema(BaseModel):
    """Group deletion feasibility check schema"""
    can_delete: bool = Field(..., description="Whether the group can be deleted")
    blocking_reasons: List[str] = Field(default_factory=list, description="Reasons preventing deletion")
    cascade_impact: Dict[str, int] = Field(..., description="Impact of cascade deletion")
    alternatives: List[str] = Field(default_factory=list, description="Alternative actions")


class GroupBulkCreateSchema(BaseModel):
    """Schema for bulk group creation"""
    groups: List[GroupCreateSchema] = Field(..., min_items=1, max_items=100, description="Groups to create")
    dry_run: bool = Field(default=False, description="Whether to perform a dry run")
    continue_on_error: bool = Field(default=False, description="Whether to continue if some groups fail")


class GroupBulkUpdateSchema(BaseModel):
    """Schema for bulk group updates"""
    group_ids: List[str] = Field(..., min_items=1, max_items=100, description="Group IDs to update")
    updates: GroupUpdateSchema = Field(..., description="Updates to apply to all groups")
    dry_run: bool = Field(default=False, description="Whether to perform a dry run")


class GroupSearchSchema(BaseModel):
    """Schema for group search"""
    query: str = Field(..., min_length=1, max_length=255, description="Search query")
    search_fields: List[str] = Field(
        default=["name", "code", "description"], 
        description="Fields to search in"
    )
    fuzzy: bool = Field(default=False, description="Whether to use fuzzy search")
    limit: int = Field(default=10, ge=1, le=100, description="Maximum results")


class GroupSearchResultSchema(BaseModel):
    """Schema for group search results"""
    groups: List[GroupResponseSchema] = Field(..., description="Matching groups")
    total_matches: int = Field(..., description="Total number of matches")
    search_time_ms: float = Field(..., description="Search execution time in milliseconds")
    suggestions: List[str] = Field(default_factory=list, description="Search suggestions")