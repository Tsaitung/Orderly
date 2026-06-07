"""
Hierarchy Tree schemas - Frontend-first design with camelCase
"""
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class HierarchyNodeType(str, Enum):
    """Types of hierarchy nodes"""
    GROUP = "group"
    COMPANY = "company"
    LOCATION = "location"
    BUSINESS_UNIT = "business_unit"


class HierarchyNodeSchema(BaseModel):
    """Schema for a single hierarchy node - Frontend camelCase format"""
    id: str = Field(..., description="Node ID")
    name: str = Field(..., description="Node name")
    type: HierarchyNodeType = Field(..., description="Node type")
    code: Optional[str] = Field(None, description="Node code")
    
    # Frontend camelCase fields
    parent_id: Optional[str] = Field(None, alias="parentId", description="Parent node ID")
    is_active: bool = Field(..., alias="isActive", description="Whether the node is active")
    children: List['HierarchyNodeSchema'] = Field(default_factory=list, description="Child nodes")
    children_count: int = Field(default=0, alias="childrenCount", description="Number of direct children")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Node metadata")
    
    # Type-specific fields with camelCase aliases
    tax_id: Optional[str] = Field(None, alias="taxId", description="Tax ID (for companies)")
    tax_id_type: Optional[str] = Field(None, alias="taxIdType", description="Tax ID type (for companies)")
    address: Optional[Dict[str, Any]] = Field(None, description="Address (for locations)")
    coordinates: Optional[Dict[str, Any]] = Field(None, description="GPS coordinates (for locations)")
    unit_type: Optional[str] = Field(None, alias="unitType", description="Business unit type (for business units)")
    budget_monthly: Optional[float] = Field(None, alias="budgetMonthly", description="Monthly budget (for business units)")
    
    # Statistics
    descendant_count: int = Field(default=0, alias="descendantCount", description="Total number of descendants")
    parent_type: Optional[HierarchyNodeType] = Field(None, alias="parentType", description="Parent node type")
    
    # Timestamps with camelCase
    created_at: Optional[datetime] = Field(None, alias="createdAt", description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt", description="Last update timestamp")

    class Config:
        """Enable alias population and camelCase output"""
        populate_by_name = True
        by_alias = True


class HierarchyTreeRequestSchema(BaseModel):
    """Request schema for hierarchy tree"""
    root_id: Optional[str] = Field(None, description="Root node ID (if not provided, returns all roots)")
    root_type: Optional[HierarchyNodeType] = Field(None, description="Root node type")
    max_depth: int = Field(default=4, ge=1, le=4, description="Maximum tree depth")
    include_inactive: bool = Field(default=False, description="Include inactive nodes")
    expand_all: bool = Field(default=False, description="Expand all nodes by default")
    include_stats: bool = Field(default=False, description="Include node statistics")
    filter_by_type: Optional[List[HierarchyNodeType]] = Field(None, description="Filter by node types")


class TreeResponseSchema(BaseModel):
    """Frontend-compatible tree response schema"""
    data: List[HierarchyNodeSchema] = Field(..., description="Hierarchy tree nodes")
    total_count: int = Field(..., alias="totalCount", description="Total number of nodes")
    last_modified: str = Field(..., alias="lastModified", description="Last modification timestamp")
    
    class Config:
        populate_by_name = True
        by_alias = True


class HierarchyTreeResponseSchema(BaseModel):
    """Extended response schema for internal use"""
    tree: List[HierarchyNodeSchema] = Field(..., description="Hierarchy tree nodes")
    total_nodes: int = Field(..., description="Total number of nodes in tree")
    max_depth: int = Field(..., description="Maximum depth requested")
    actual_depth: int = Field(..., description="Actual depth of the tree")
    include_inactive: bool = Field(..., description="Whether inactive nodes are included")
    root_count: int = Field(..., description="Number of root nodes")
    
    # Statistics
    node_counts_by_type: Dict[str, int] = Field(..., description="Count of nodes by type")
    active_node_counts: Dict[str, int] = Field(..., description="Count of active nodes by type")


class HierarchyPathSchema(BaseModel):
    """Schema for hierarchy path"""
    entity_id: str = Field(..., description="Entity ID")
    entity_type: HierarchyNodeType = Field(..., description="Entity type")
    path: List[Dict[str, str]] = Field(..., description="Path from root to entity")
    full_path_string: str = Field(..., description="Full path as string")
    depth: int = Field(..., description="Depth in hierarchy")


class HierarchySearchRequestSchema(BaseModel):
    """Request schema for hierarchy search"""
    query: str = Field(..., min_length=1, max_length=255, description="Search query")
    search_types: List[HierarchyNodeType] = Field(
        default=[HierarchyNodeType.GROUP, HierarchyNodeType.COMPANY, HierarchyNodeType.LOCATION, HierarchyNodeType.BUSINESS_UNIT],
        description="Node types to search"
    )
    search_fields: List[str] = Field(
        default=["name", "code"],
        description="Fields to search in"
    )
    include_path: bool = Field(default=True, description="Include hierarchy path in results")
    limit: int = Field(default=20, ge=1, le=100, description="Maximum results")
    fuzzy: bool = Field(default=False, description="Use fuzzy search")
    include_inactive: bool = Field(default=False, description="Include inactive nodes")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Additional search filters")


class SearchResultSchema(BaseModel):
    """Frontend-compatible search result schema"""
    entity: HierarchyNodeSchema = Field(..., description="Matching hierarchy node")
    score: float = Field(..., description="Search match score")
    match_type: str = Field(..., alias="matchType", description="Type of match (name, code, etc)")
    breadcrumb: List[str] = Field(default_factory=list, description="Hierarchy breadcrumb")
    
    class Config:
        populate_by_name = True
        by_alias = True


class SearchResponseSchema(BaseModel):
    """Frontend-compatible search response schema"""
    results: List[SearchResultSchema] = Field(..., description="Search results")
    total_count: int = Field(..., alias="totalCount", description="Total number of matches")
    query_time: float = Field(..., alias="queryTime", description="Search execution time in ms")
    
    class Config:
        populate_by_name = True
        by_alias = True


class HierarchySearchResultSchema(BaseModel):
    """Schema for hierarchy search result item - Extended version"""
    node: HierarchyNodeSchema = Field(..., description="Matching node")
    path: Optional[HierarchyPathSchema] = Field(None, description="Hierarchy path")
    match_score: float = Field(..., description="Search match score")
    match_fields: List[str] = Field(..., description="Fields that matched")
    snippet: Optional[str] = Field(None, description="Search result snippet")


class HierarchySearchResponseSchema(BaseModel):
    """Response schema for hierarchy search - Extended version"""
    results: List[HierarchySearchResultSchema] = Field(..., description="Search results")
    total_matches: int = Field(..., description="Total number of matches")
    search_time_ms: float = Field(..., description="Search execution time")
    query: str = Field(..., description="Original search query")
    suggestions: List[str] = Field(default_factory=list, description="Search suggestions")


class HierarchyStatsSchema(BaseModel):
    """Hierarchy statistics schema"""
    total_nodes: int = Field(..., description="Total number of nodes")
    node_counts: Dict[str, int] = Field(..., description="Count by node type")
    active_counts: Dict[str, int] = Field(..., description="Active count by node type")
    inactive_counts: Dict[str, int] = Field(..., description="Inactive count by node type")
    max_depth: int = Field(..., description="Maximum depth in hierarchy")
    avg_depth: float = Field(..., description="Average depth of leaf nodes")
    orphaned_nodes: int = Field(..., description="Number of orphaned nodes")
    complete_hierarchies: int = Field(..., description="Number of complete 4-level hierarchies")
    incomplete_hierarchies: int = Field(..., description="Number of incomplete hierarchies")
    
    # Distribution statistics
    groups_with_companies: int = Field(..., description="Groups that have companies")
    companies_with_locations: int = Field(..., description="Companies that have locations")
    locations_with_units: int = Field(..., description="Locations that have business units")
    
    # Size statistics
    avg_companies_per_group: float = Field(..., description="Average companies per group")
    avg_locations_per_company: float = Field(..., description="Average locations per company")
    avg_units_per_location: float = Field(..., description="Average business units per location")


class HierarchyMoveRequestSchema(BaseModel):
    """Request schema for moving nodes in hierarchy"""
    node_id: str = Field(..., description="ID of node to move")
    node_type: HierarchyNodeType = Field(..., description="Type of node to move")
    new_parent_id: Optional[str] = Field(None, description="ID of new parent (null for root)")
    new_parent_type: Optional[HierarchyNodeType] = Field(None, description="Type of new parent")
    validate_only: bool = Field(default=False, description="Only validate the move, don't execute")


class HierarchyMoveResponseSchema(BaseModel):
    """Response schema for hierarchy move operation"""
    success: bool = Field(..., description="Whether the move was successful")
    node_id: str = Field(..., description="ID of moved node")
    old_parent_id: Optional[str] = Field(None, description="Previous parent ID")
    new_parent_id: Optional[str] = Field(None, description="New parent ID")
    validation_errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Warnings")
    affected_nodes: List[str] = Field(default_factory=list, description="IDs of affected nodes")


class HierarchyValidationRequestSchema(BaseModel):
    """Request schema for hierarchy validation"""
    node_id: Optional[str] = Field(None, description="Specific node to validate (null for all)")
    node_type: Optional[HierarchyNodeType] = Field(None, description="Type of node to validate")
    check_business_rules: bool = Field(default=True, description="Check business rules")
    check_data_integrity: bool = Field(default=True, description="Check data integrity")
    check_relationships: bool = Field(default=True, description="Check relationships")


class HierarchyValidationResultSchema(BaseModel):
    """Single validation result"""
    node_id: str = Field(..., description="Node ID")
    node_type: HierarchyNodeType = Field(..., description="Node type")
    is_valid: bool = Field(..., description="Whether the node is valid")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    business_rule_violations: List[str] = Field(default_factory=list, description="Business rule violations")


class HierarchyValidationResponseSchema(BaseModel):
    """Response schema for hierarchy validation"""
    overall_valid: bool = Field(..., description="Whether the entire hierarchy is valid")
    total_nodes_checked: int = Field(..., description="Total number of nodes checked")
    valid_nodes: int = Field(..., description="Number of valid nodes")
    invalid_nodes: int = Field(..., description="Number of invalid nodes")
    results: List[HierarchyValidationResultSchema] = Field(..., description="Detailed validation results")
    summary_errors: List[str] = Field(default_factory=list, description="Summary of all errors")
    summary_warnings: List[str] = Field(default_factory=list, description="Summary of all warnings")


class HierarchyExportRequestSchema(BaseModel):
    """Request schema for hierarchy export"""
    root_id: Optional[str] = Field(None, description="Root node ID for export")
    format: str = Field(default="json", description="Export format (json, csv, xlsx)")
    include_inactive: bool = Field(default=False, description="Include inactive nodes")
    include_metadata: bool = Field(default=True, description="Include metadata")
    max_depth: int = Field(default=4, ge=1, le=4, description="Maximum depth to export")
    fields: Optional[List[str]] = Field(None, description="Specific fields to export")


class HierarchyImportRequestSchema(BaseModel):
    """Request schema for hierarchy import"""
    data: Union[List[Dict[str, Any]], Dict[str, Any]] = Field(..., description="Data to import")
    format: str = Field(default="json", description="Import format")
    dry_run: bool = Field(default=True, description="Perform dry run validation")
    merge_strategy: str = Field(default="skip", description="Strategy for existing records (skip, update, error)")
    create_missing_parents: bool = Field(default=False, description="Create missing parent nodes")
    validate_business_rules: bool = Field(default=True, description="Validate business rules")


class HierarchyImportResponseSchema(BaseModel):
    """Response schema for hierarchy import"""
    success: bool = Field(..., description="Whether import was successful")
    dry_run: bool = Field(..., description="Whether this was a dry run")
    total_records: int = Field(..., description="Total records processed")
    created_records: int = Field(..., description="Number of records created")
    updated_records: int = Field(..., description="Number of records updated")
    skipped_records: int = Field(..., description="Number of records skipped")
    error_records: int = Field(..., description="Number of records with errors")
    errors: List[Dict[str, Any]] = Field(default_factory=list, description="Import errors")
    warnings: List[str] = Field(default_factory=list, description="Import warnings")


class HierarchySearchFilters(BaseModel):
    """Search filters for hierarchy queries"""
    region: Optional[str] = Field(None, description="Filter by region")
    status: Optional[str] = Field(None, description="Filter by status (active/inactive)")
    business_type: Optional[str] = Field(None, description="Filter by business type")
    created_after: Optional[str] = Field(None, description="Filter by creation date")
    created_before: Optional[str] = Field(None, description="Filter by creation date")
    has_children: Optional[bool] = Field(None, description="Filter by whether node has children")
    parent_id: Optional[str] = Field(None, description="Filter by parent ID")


# Primary aliases for frontend compatibility
TreeResponseSchema = TreeResponseSchema  # Main frontend response
SearchResponseSchema = SearchResponseSchema  # Main frontend search response

# Legacy aliases for backward compatibility
HierarchyTreeSchema = TreeResponseSchema  # Use frontend-compatible format
HierarchySearchSchema = SearchResponseSchema  # Use frontend-compatible format
HierarchyBreadcrumbSchema = HierarchyPathSchema
HierarchyMoveRequestSchema = HierarchyMoveRequestSchema
HierarchyValidationSchema = HierarchyValidationResponseSchema
HierarchyStatsSchema = HierarchyStatsSchema
HierarchyExportSchema = HierarchyImportResponseSchema  # Reuse for export
HierarchyImportSchema = HierarchyImportRequestSchema
HierarchyStructureSchema = HierarchyStatsSchema  # Reuse structure schema


# Update HierarchyNodeSchema to support forward references
HierarchyNodeSchema.model_rebuild()