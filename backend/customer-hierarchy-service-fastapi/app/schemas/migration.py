"""
Migration schemas for transitioning from old to new hierarchy

This module provides two sets of schemas:
- Legacy request/response schemas already used elsewhere in the app
- Additional plan/execute/preview/progress/status/report schemas expected by
  API v2 endpoints under `app/api/v2/endpoints/migration.py`
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum


class MigrationStatus(str, Enum):
    """Migration status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


class MigrationType(str, Enum):
    """Migration type enumeration"""
    AUTO = "auto"
    MANUAL = "manual"
    ASSISTED = "assisted"
    BULK = "bulk"


class MigrationRequestSchema(BaseModel):
    """Request schema for customer migration"""
    old_customer_id: str = Field(..., description="Original customer ID from old system")
    old_organization_id: str = Field(..., description="Original organization ID from old system")
    migration_type: MigrationType = Field(default=MigrationType.AUTO, description="Type of migration")
    
    # Migration configuration
    group_assignment: Optional[str] = Field(None, description="Group ID to assign company to")
    company_data: Dict[str, Any] = Field(..., description="Company creation data")
    location_data: Optional[Dict[str, Any]] = Field(None, description="Default location data")
    business_unit_data: Optional[Dict[str, Any]] = Field(None, description="Default business unit data")
    
    # Migration options
    auto_create_defaults: bool = Field(default=True, description="Auto-create default location and business unit")
    validate_data: bool = Field(default=True, description="Validate data before migration")
    dry_run: bool = Field(default=False, description="Perform dry run validation only")
    
    # Additional configuration
    data_mapping: Optional[Dict[str, Any]] = Field(None, description="Custom data mapping configuration")
    migration_notes: Optional[str] = Field(None, max_length=1000, description="Migration notes")


class MigrationResponseSchema(BaseModel):
    """Response schema for migration operation"""
    migration_id: str = Field(..., description="Migration record ID")
    old_customer_id: str = Field(..., description="Original customer ID")
    migration_status: MigrationStatus = Field(..., description="Current migration status")
    migration_type: MigrationType = Field(..., description="Type of migration")
    
    # Created entities
    new_company_id: Optional[str] = Field(None, description="Created company ID")
    new_location_id: Optional[str] = Field(None, description="Created location ID")
    new_business_unit_id: Optional[str] = Field(None, description="Created business unit ID")
    new_group_id: Optional[str] = Field(None, description="Assigned group ID")
    
    # Migration details
    migration_started_at: Optional[datetime] = Field(None, description="Migration start time")
    migration_completed_at: Optional[datetime] = Field(None, description="Migration completion time")
    processing_duration_seconds: Optional[float] = Field(None, description="Processing duration")
    
    # Validation results
    validation_errors: List[str] = Field(default_factory=list, description="Validation errors")
    validation_warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    
    # Additional info
    migrated_by: Optional[str] = Field(None, description="User who performed migration")
    message: str = Field(..., description="Migration result message")


class MigrationBatchRequestSchema(BaseModel):
    """Request schema for batch migration"""
    migrations: List[MigrationRequestSchema] = Field(..., min_items=1, max_items=100, description="Migrations to perform")
    batch_size: int = Field(default=10, ge=1, le=50, description="Number of migrations to process concurrently")
    continue_on_error: bool = Field(default=False, description="Continue batch if individual migrations fail")
    dry_run: bool = Field(default=False, description="Perform dry run for all migrations")


class MigrationBatchResponseSchema(BaseModel):
    """Response schema for batch migration"""
    batch_id: str = Field(..., description="Batch operation ID")
    total_migrations: int = Field(..., description="Total number of migrations")
    successful: int = Field(..., description="Number of successful migrations")
    failed: int = Field(..., description="Number of failed migrations")
    pending: int = Field(..., description="Number of pending migrations")
    
    # Timing
    batch_started_at: datetime = Field(..., description="Batch start time")
    batch_completed_at: Optional[datetime] = Field(None, description="Batch completion time")
    total_duration_seconds: Optional[float] = Field(None, description="Total batch duration")
    
    # Results
    migration_results: List[MigrationResponseSchema] = Field(..., description="Individual migration results")
    overall_errors: List[str] = Field(default_factory=list, description="Overall batch errors")


class MigrationStatusRequestSchema(BaseModel):
    """Request schema for migration status"""
    migration_id: Optional[str] = Field(None, description="Specific migration ID")
    old_customer_id: Optional[str] = Field(None, description="Filter by old customer ID")
    status: Optional[MigrationStatus] = Field(None, description="Filter by status")
    migration_type: Optional[MigrationType] = Field(None, description="Filter by type")
    migrated_by: Optional[str] = Field(None, description="Filter by user")
    date_from: Optional[datetime] = Field(None, description="Filter by date range start")
    date_to: Optional[datetime] = Field(None, description="Filter by date range end")
    limit: int = Field(default=100, ge=1, le=1000, description="Maximum results")
    offset: int = Field(default=0, ge=0, description="Results offset")


class MigrationStatusResponseSchema(BaseModel):
    """Response schema for migration status"""
    migrations: List[MigrationResponseSchema] = Field(..., description="Migration records")
    total_count: int = Field(..., description="Total number of migrations")
    status_summary: Dict[str, int] = Field(..., description="Count by status")
    type_summary: Dict[str, int] = Field(..., description="Count by type")


class MigrationRollbackRequestSchema(BaseModel):
    """Request schema for migration rollback"""
    migration_id: Optional[str] = Field(None, description="Specific migration to rollback")
    old_customer_id: Optional[str] = Field(None, description="Customer to rollback by old ID")
    rollback_reason: str = Field(..., min_length=1, max_length=500, description="Reason for rollback")
    force_rollback: bool = Field(default=False, description="Force rollback even if there are dependencies")
    
    @validator('rollback_reason')
    def validate_rollback_reason(cls, v):
        if not v or not v.strip():
            raise ValueError("Rollback reason cannot be empty")
        return v.strip()


class MigrationRollbackResponseSchema(BaseModel):
    """Response schema for migration rollback"""
    success: bool = Field(..., description="Whether rollback was successful")
    migration_id: str = Field(..., description="Migration record ID")
    old_customer_id: str = Field(..., description="Original customer ID")
    rollback_date: datetime = Field(..., description="Rollback timestamp")
    rolled_back_by: str = Field(..., description="User who performed rollback")
    rollback_reason: str = Field(..., description="Reason for rollback")
    
    # Cleanup results
    deleted_entities: Dict[str, List[str]] = Field(..., description="Entities deleted during rollback")
    cleanup_errors: List[str] = Field(default_factory=list, description="Errors during cleanup")
    message: str = Field(..., description="Rollback result message")


class MigrationValidationRequestSchema(BaseModel):
    """Request schema for migration validation"""
    old_customer_data: Dict[str, Any] = Field(..., description="Old customer data")
    old_organization_data: Dict[str, Any] = Field(..., description="Old organization data")
    migration_config: Dict[str, Any] = Field(..., description="Migration configuration")
    check_duplicates: bool = Field(default=True, description="Check for duplicate tax IDs")
    validate_addresses: bool = Field(default=True, description="Validate address formats")
    check_business_rules: bool = Field(default=True, description="Check business rules")


class MigrationValidationResponseSchema(BaseModel):
    """Response schema for migration validation"""
    is_valid: bool = Field(..., description="Whether migration data is valid")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    data_quality_score: float = Field(..., ge=0, le=100, description="Data quality score (0-100)")
    
    # Detailed validation results
    customer_validation: Dict[str, Any] = Field(..., description="Customer data validation")
    organization_validation: Dict[str, Any] = Field(..., description="Organization data validation")
    mapping_validation: Dict[str, Any] = Field(..., description="Data mapping validation")
    business_rule_validation: Dict[str, Any] = Field(..., description="Business rule validation")
    
    # Suggestions
    data_suggestions: List[str] = Field(default_factory=list, description="Data improvement suggestions")
    mapping_suggestions: List[str] = Field(default_factory=list, description="Mapping improvement suggestions")


class MigrationStatsSchema(BaseModel):
    """Migration statistics schema"""
    total_migrations: int = Field(..., description="Total number of migrations")
    status_counts: Dict[str, int] = Field(..., description="Count by migration status")
    type_counts: Dict[str, int] = Field(..., description="Count by migration type")
    
    # Success metrics
    success_rate: float = Field(..., description="Overall success rate percentage")
    avg_processing_time: float = Field(..., description="Average processing time in seconds")
    
    # Timeline stats
    migrations_today: int = Field(..., description="Migrations performed today")
    migrations_this_week: int = Field(..., description="Migrations this week")
    migrations_this_month: int = Field(..., description="Migrations this month")
    
    # Quality metrics
    avg_data_quality_score: float = Field(..., description="Average data quality score")
    manual_interventions: int = Field(..., description="Number requiring manual intervention")
    rollback_count: int = Field(..., description="Number of rollbacks performed")
    rollback_rate: float = Field(..., description="Rollback rate percentage")


class MigrationReportRequestSchema(BaseModel):
    """Request schema for migration report"""
    date_from: Optional[datetime] = Field(None, description="Report period start")
    date_to: Optional[datetime] = Field(None, description="Report period end")
    include_details: bool = Field(default=False, description="Include detailed migration records")
    format: str = Field(default="json", description="Report format (json, csv, xlsx)")
    group_by: Optional[str] = Field(None, description="Group results by field")


class MigrationReportResponseSchema(BaseModel):
    """Response schema for migration report"""
    report_id: str = Field(..., description="Report ID")
    generated_at: datetime = Field(..., description="Report generation time")
    period_start: Optional[datetime] = Field(None, description="Report period start")
    period_end: Optional[datetime] = Field(None, description="Report period end")
    
    # Summary statistics
    summary: MigrationStatsSchema = Field(..., description="Summary statistics")
    
    # Detailed data (if requested)
    migrations: Optional[List[MigrationResponseSchema]] = Field(None, description="Detailed migration records")
    
    # Analysis
    trends: Dict[str, Any] = Field(..., description="Migration trends analysis")
    recommendations: List[str] = Field(default_factory=list, description="Process improvement recommendations")
    
    # Export info
    download_url: Optional[str] = Field(None, description="Download URL for formatted report")
    expires_at: Optional[datetime] = Field(None, description="Download URL expiration")


# ---------------------------------------------------------------------------
# Additional schemas required by API v2 endpoints
# ---------------------------------------------------------------------------

class MigrationConfigSchema(BaseModel):
    """Generic configuration for migration sources/targets."""
    connection: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Connection details")
    credentials: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Credential details (masked)")
    options: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional options and flags")


class MigrationMappingSchema(BaseModel):
    """Describes field mappings and rules for transformation/validation."""
    field_mappings: Dict[str, Any] = Field(default_factory=dict, description="Source -> Target field mappings")
    transformation_rules: Dict[str, Any] = Field(default_factory=dict, description="Transformation rules")
    validation_rules: Dict[str, Any] = Field(default_factory=dict, description="Validation rules")


class MigrationCreatePlanSchema(BaseModel):
    """Request schema to create a migration plan."""
    migration_type: str = Field(..., description="Type of migration, e.g., legacy_hierarchy, erp_import, csv_import")
    source_config: Dict[str, Any] = Field(..., description="Source system/configuration")
    target_config: Dict[str, Any] = Field(default_factory=dict, description="Target configuration")
    batch_size: Optional[int] = Field(default=None, ge=1, le=1000, description="Preferred batch size")
    include_preview: bool = Field(default=False, description="Generate preview after plan creation")


class MigrationPlanSchema(BaseModel):
    """Response schema for a created migration plan."""
    id: str = Field(..., description="Plan ID")
    migration_type: str = Field(..., description="Migration type")
    status: str = Field(..., description="Plan status: draft, validated, executing, completed, failed, rolled_back")
    mapping_strategy: Dict[str, Any] = Field(default_factory=dict, description="Mapping strategy details")
    execution_strategy: Dict[str, Any] = Field(default_factory=dict, description="Execution strategy details")
    created_at: Optional[datetime] = Field(None, description="Plan creation time")
    created_by: Optional[str] = Field(None, description="User who created the plan")


class MigrationValidationSchema(BaseModel):
    """Validation result for a migration plan before execution."""
    plan_id: str = Field(..., description="Plan ID")
    is_valid: bool = Field(..., description="Whether plan is valid for execution")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    validation_timestamp: Optional[datetime] = Field(None, description="Validation timestamp")
    validated_by: Optional[str] = Field(None, description="User who validated the plan")


class MigrationPreviewSchema(BaseModel):
    """Preview of transformation results without executing the migration."""
    plan_id: str = Field(..., description="Plan ID")
    sample_size: int = Field(..., ge=1, description="Number of records previewed")
    success_count: int = Field(..., ge=0, description="Number of successful previews")
    error_count: int = Field(..., ge=0, description="Number of failed previews")
    success_rate: float = Field(..., ge=0, le=1, description="Success ratio in [0,1]")
    preview_results: List[Dict[str, Any]] = Field(default_factory=list, description="Per-record preview results")
    preview_timestamp: Optional[datetime] = Field(None, description="Preview time")


class MigrationExecuteSchema(BaseModel):
    """Execution initialization response for a migration plan."""
    plan_id: str = Field(..., description="Plan ID")
    execution_id: str = Field(..., description="Execution tracking ID")
    status: str = Field(..., description="initialized, executing, completed, failed")
    estimated_duration: Optional[str] = Field(None, description="Estimated duration (human-readable)")
    total_entities: Optional[int] = Field(None, ge=0, description="Total entities expected to process")
    started_at: Optional[datetime] = Field(None, description="Execution start time")


class MigrationStatusSchema(BaseModel):
    """High-level migration execution status."""
    plan_id: str = Field(..., description="Plan ID")
    execution_id: Optional[str] = Field(None, description="Execution ID, if available")
    status: str = Field(..., description="Plan/execution status")
    started_at: Optional[datetime] = Field(None, description="Start time")
    completed_at: Optional[datetime] = Field(None, description="Completion time")
    error_details: Optional[Dict[str, Any]] = Field(None, description="Error details if failed")


class MigrationProgressSchema(BaseModel):
    """Detailed migration progress information including progress breakdown and logs."""
    plan_id: str = Field(..., description="Plan ID")
    execution_id: Optional[str] = Field(None, description="Execution ID")
    status: str = Field(..., description="Current status")
    progress: Dict[str, Any] = Field(default_factory=dict, description="Progress metrics and counters")
    execution_log: Optional[List[Dict[str, Any]]] = Field(default=None, description="Execution log entries")
    last_updated: Optional[datetime] = Field(None, description="Last update timestamp")
    started_at: Optional[datetime] = Field(None, description="Start time (if known)")
    completed_at: Optional[datetime] = Field(None, description="Completion time (if known)")


class MigrationRollbackSchema(BaseModel):
    """Rollback result details."""
    plan_id: str = Field(..., description="Plan ID")
    rollback_id: str = Field(..., description="Rollback operation ID")
    entities_restored: int = Field(..., ge=0, description="Number of entities restored")
    rollback_timestamp: datetime = Field(..., description="Rollback time")
    status: str = Field(..., description="Rollback status")


class MigrationReportSchema(BaseModel):
    """Comprehensive migration report structure."""
    plan_id: str = Field(..., description="Plan ID")
    execution_id: Optional[str] = Field(None, description="Execution ID")
    include_details: Optional[bool] = Field(default=True, description="Whether detailed steps are included")
    summary: Dict[str, Any] = Field(default_factory=dict, description="High-level summary")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="Key metrics collected")
    details: Optional[List[Dict[str, Any]]] = Field(default=None, description="Detailed step-by-step records")
