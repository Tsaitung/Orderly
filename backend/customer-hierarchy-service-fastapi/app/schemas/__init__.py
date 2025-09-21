"""
Customer Hierarchy Service Schemas

This module contains all Pydantic schemas for the 4-level customer hierarchy system.
Schemas define the structure for API requests, responses, and data validation.
"""

# Common schemas
from .common import (
    AddressSchema,
    ContactSchema,
    CoordinatesSchema,
    OperatingHoursSchema,
    WeeklyOperatingHoursSchema,
    PaginationSchema,
    SortSchema,
    FilterSchema,
    BaseResponseSchema,
    ErrorResponseSchema,
    SuccessResponseSchema,
    ValidationErrorSchema,
    BulkOperationResponseSchema,
    AuditLogSchema
)

# Group schemas (Æ)
from .group import (
    GroupCreateSchema,
    GroupUpdateSchema,
    GroupResponseSchema,
    GroupDetailResponseSchema,
    GroupFilterSchema,
    GroupListRequestSchema,
    GroupListResponseSchema,
    GroupStatsSchema,
    GroupHierarchySummarySchema,
    GroupValidationSchema,
    GroupDeletionCheckSchema,
    GroupBulkCreateSchema,
    GroupBulkUpdateSchema,
    GroupSearchSchema,
    GroupSearchResultSchema
)

# Company schemas (lø)
from .company import (
    CompanyCreateSchema,
    CompanyUpdateSchema,
    CompanyResponseSchema,
    CompanyDetailResponseSchema,
    CompanyFilterSchema,
    CompanyListRequestSchema,
    CompanyListResponseSchema,
    CompanyBillingInfoSchema,
    CompanyBillingUpdateSchema,
    CompanyStatsSchema,
    CompanyValidationSchema,
    CompanyDeletionCheckSchema,
    CompanyMigrationSchema
)

# Location schemas (0Þ)
from .location import (
    LocationCreateSchema,
    LocationUpdateSchema,
    LocationResponseSchema,
    LocationDetailResponseSchema,
    LocationFilterSchema,
    LocationListRequestSchema,
    LocationListResponseSchema
)

# Business Unit schemas (mÙ®M)
from .business_unit import (
    BusinessUnitCreateSchema,
    BusinessUnitUpdateSchema,
    BusinessUnitResponseSchema,
    BusinessUnitDetailResponseSchema,
    BusinessUnitFilterSchema,
    BusinessUnitListRequestSchema,
    BusinessUnitListResponseSchema,
    BusinessUnitOrderingRestrictionsSchema,
    BusinessUnitBudgetStatusSchema
)

# Hierarchy schemas
from .hierarchy import (
    HierarchyNodeType,
    HierarchyNodeSchema,
    HierarchyTreeRequestSchema,
    HierarchyTreeResponseSchema,
    HierarchyPathSchema,
    HierarchySearchRequestSchema,
    HierarchySearchResultSchema,
    HierarchySearchResponseSchema,
    HierarchyStatsSchema,
    HierarchyMoveRequestSchema,
    HierarchyMoveResponseSchema,
    HierarchyValidationRequestSchema,
    HierarchyValidationResultSchema,
    HierarchyValidationResponseSchema,
    HierarchyExportRequestSchema,
    HierarchyImportRequestSchema,
    HierarchyImportResponseSchema
)

# Migration schemas
from .migration import (
    MigrationStatus,
    MigrationType,
    MigrationRequestSchema,
    MigrationResponseSchema,
    MigrationBatchRequestSchema,
    MigrationBatchResponseSchema,
    MigrationStatusRequestSchema,
    MigrationStatusResponseSchema,
    MigrationRollbackRequestSchema,
    MigrationRollbackResponseSchema,
    MigrationValidationRequestSchema,
    MigrationValidationResponseSchema,
    MigrationStatsSchema,
    MigrationReportRequestSchema,
    MigrationReportResponseSchema
)

# Export all schemas for convenience
__all__ = [
    # Common
    "AddressSchema",
    "ContactSchema",
    "CoordinatesSchema",
    "OperatingHoursSchema",
    "WeeklyOperatingHoursSchema",
    "PaginationSchema",
    "SortSchema",
    "FilterSchema",
    "BaseResponseSchema",
    "ErrorResponseSchema",
    "SuccessResponseSchema",
    "ValidationErrorSchema",
    "BulkOperationResponseSchema",
    "AuditLogSchema",
    
    # Groups
    "GroupCreateSchema",
    "GroupUpdateSchema",
    "GroupResponseSchema",
    "GroupDetailResponseSchema",
    "GroupFilterSchema",
    "GroupListRequestSchema",
    "GroupListResponseSchema",
    "GroupStatsSchema",
    "GroupHierarchySummarySchema",
    "GroupValidationSchema",
    "GroupDeletionCheckSchema",
    "GroupBulkCreateSchema",
    "GroupBulkUpdateSchema",
    "GroupSearchSchema",
    "GroupSearchResultSchema",
    
    # Companies
    "CompanyCreateSchema",
    "CompanyUpdateSchema",
    "CompanyResponseSchema",
    "CompanyDetailResponseSchema",
    "CompanyFilterSchema",
    "CompanyListRequestSchema",
    "CompanyListResponseSchema",
    "CompanyBillingInfoSchema",
    "CompanyBillingUpdateSchema",
    "CompanyStatsSchema",
    "CompanyValidationSchema",
    "CompanyDeletionCheckSchema",
    "CompanyMigrationSchema",
    
    # Locations
    "LocationCreateSchema",
    "LocationUpdateSchema",
    "LocationResponseSchema",
    "LocationDetailResponseSchema",
    "LocationFilterSchema",
    "LocationListRequestSchema",
    "LocationListResponseSchema",
    
    # Business Units
    "BusinessUnitCreateSchema",
    "BusinessUnitUpdateSchema",
    "BusinessUnitResponseSchema",
    "BusinessUnitDetailResponseSchema",
    "BusinessUnitFilterSchema",
    "BusinessUnitListRequestSchema",
    "BusinessUnitListResponseSchema",
    "BusinessUnitOrderingRestrictionsSchema",
    "BusinessUnitBudgetStatusSchema",
    
    # Hierarchy
    "HierarchyNodeType",
    "HierarchyNodeSchema",
    "HierarchyTreeRequestSchema",
    "HierarchyTreeResponseSchema",
    "HierarchyPathSchema",
    "HierarchySearchRequestSchema",
    "HierarchySearchResultSchema",
    "HierarchySearchResponseSchema",
    "HierarchyStatsSchema",
    "HierarchyMoveRequestSchema",
    "HierarchyMoveResponseSchema",
    "HierarchyValidationRequestSchema",
    "HierarchyValidationResultSchema",
    "HierarchyValidationResponseSchema",
    "HierarchyExportRequestSchema",
    "HierarchyImportRequestSchema",
    "HierarchyImportResponseSchema",
    
    # Migration
    "MigrationStatus",
    "MigrationType",
    "MigrationRequestSchema",
    "MigrationResponseSchema",
    "MigrationBatchRequestSchema",
    "MigrationBatchResponseSchema",
    "MigrationStatusRequestSchema",
    "MigrationStatusResponseSchema",
    "MigrationRollbackRequestSchema",
    "MigrationRollbackResponseSchema",
    "MigrationValidationRequestSchema",
    "MigrationValidationResponseSchema",
    "MigrationStatsSchema",
    "MigrationReportRequestSchema",
    "MigrationReportResponseSchema",
]

# Schema groups for convenience
HIERARCHY_SCHEMAS = [
    GroupCreateSchema, GroupUpdateSchema, GroupResponseSchema,
    CompanyCreateSchema, CompanyUpdateSchema, CompanyResponseSchema,
    LocationCreateSchema, LocationUpdateSchema, LocationResponseSchema,
    BusinessUnitCreateSchema, BusinessUnitUpdateSchema, BusinessUnitResponseSchema
]

TREE_SCHEMAS = [
    HierarchyNodeSchema, HierarchyTreeRequestSchema, HierarchyTreeResponseSchema,
    HierarchySearchRequestSchema, HierarchySearchResponseSchema
]

MIGRATION_SCHEMAS = [
    MigrationRequestSchema, MigrationResponseSchema, MigrationBatchRequestSchema,
    MigrationStatusRequestSchema, MigrationRollbackRequestSchema
]