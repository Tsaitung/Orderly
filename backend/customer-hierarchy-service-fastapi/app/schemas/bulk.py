"""
Bulk operation schemas used by API v2 bulk endpoints and services.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class BulkEntityCreateSchema(BaseModel):
    """Single entity to be created in bulk operations."""
    entity_type: str = Field(..., description="Entity type: group, company, location, unit")
    data: Dict[str, Any] = Field(..., description="Payload for creating the entity")


class BulkEntityUpdateSchema(BaseModel):
    """Single entity to be updated in bulk operations."""
    entity_type: str = Field(..., description="Entity type: group, company, location, unit")
    id: str = Field(..., description="Entity ID to update")
    data: Dict[str, Any] = Field(..., description="Partial fields to update")


class BulkEntityRefSchema(BaseModel):
    """Reference to an existing entity, used for delete operations."""
    entity_type: str = Field(..., description="Entity type: group, company, location, unit")
    id: str = Field(..., description="Entity ID")


class BulkMoveOperationSchema(BaseModel):
    """A single move operation for hierarchy nodes."""
    source_id: str = Field(..., description="ID of the node to move")
    source_type: str = Field(..., description="Type of node being moved")
    target_parent_id: Optional[str] = Field(None, description="New parent ID (None for root)")
    target_parent_type: Optional[str] = Field(None, description="New parent type")


# Requests

class BulkCreateRequestSchema(BaseModel):
    entities: List[BulkEntityCreateSchema] = Field(..., min_items=1, description="Entities to create")
    batch_size: int = Field(default=50, ge=1, le=1000, description="Batch size for processing")
    continue_on_error: bool = Field(default=False, description="Continue even if some fail")


class BulkUpdateRequestSchema(BaseModel):
    updates: List[BulkEntityUpdateSchema] = Field(..., min_items=1, description="Entities to update")
    batch_size: int = Field(default=50, ge=1, le=1000, description="Batch size for processing")
    continue_on_error: bool = Field(default=False, description="Continue even if some fail")


class BulkDeleteRequestSchema(BaseModel):
    entities: List[BulkEntityRefSchema] = Field(..., min_items=1, description="Entities to delete")
    batch_size: int = Field(default=50, ge=1, le=1000, description="Batch size for processing")
    force_delete: bool = Field(default=False, description="Force delete ignoring dependencies when supported")


class BulkValidationRequestSchema(BaseModel):
    entities: List[Dict[str, Any]] = Field(..., min_items=1, description="Entities to validate (generic)")
    operation: str = Field(default="create", description="Operation context: create/update/delete/move")


class BulkMoveRequestSchema(BaseModel):
    moves: List[BulkMoveOperationSchema] = Field(..., min_items=1, description="Move operations")
    batch_size: int = Field(default=50, ge=1, le=1000, description="Batch size for processing")


class BulkImportRequestSchema(BaseModel):
    format: str = Field(..., description="Import format: csv, xlsx, json")
    data: Optional[Any] = Field(None, description="Structured data for import (json)")
    file_content: Optional[str] = Field(None, description="Raw file content (base64 or text)")
    options: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Importer options")


class BulkExportRequestSchema(BaseModel):
    format: str = Field(..., description="Export format: csv, xlsx, json")
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Filter criteria for export")


# Responses

class BulkCreateResponseSchema(BaseModel):
    operation_id: str = Field(..., description="Bulk operation ID")
    status: str = Field(..., description="Operation status")
    entity_count: Optional[int] = Field(None, ge=0, description="Total entities considered")
    created_count: Optional[int] = Field(None, ge=0, description="Entities created")
    failed_count: Optional[int] = Field(None, ge=0, description="Entities failed")
    estimated_duration: Optional[str] = Field(None, description="Estimated duration")
    processing_in_background: Optional[bool] = Field(None, description="Whether processed in background")
    created_at: Optional[str] = Field(None, description="Creation timestamp")


class BulkUpdateResponseSchema(BaseModel):
    operation_id: str = Field(..., description="Bulk operation ID")
    status: str = Field(..., description="Operation status")
    entity_count: Optional[int] = Field(None, ge=0, description="Entities considered")
    updated_count: Optional[int] = Field(None, ge=0, description="Entities updated")
    failed_count: Optional[int] = Field(None, ge=0, description="Entities failed")
    estimated_duration: Optional[str] = Field(None, description="Estimated duration")
    processing_in_background: Optional[bool] = Field(None, description="Whether processed in background")
    created_at: Optional[str] = Field(None, description="Creation timestamp")


class BulkDeleteResponseSchema(BaseModel):
    operation_id: str = Field(..., description="Bulk operation ID")
    status: str = Field(..., description="Operation status")
    entity_count: Optional[int] = Field(None, ge=0, description="Entities considered")
    deleted_count: Optional[int] = Field(None, ge=0, description="Entities deleted")
    failed_count: Optional[int] = Field(None, ge=0, description="Entities failed")
    estimated_duration: Optional[str] = Field(None, description="Estimated duration")
    processing_in_background: Optional[bool] = Field(None, description="Whether processed in background")
    created_at: Optional[str] = Field(None, description="Creation timestamp")


class BulkMoveResponseSchema(BaseModel):
    operation_id: str = Field(..., description="Bulk operation ID")
    status: str = Field(..., description="Operation status")
    move_count: Optional[int] = Field(None, ge=0, description="Moves requested")
    estimated_duration: Optional[str] = Field(None, description="Estimated duration")
    processing_in_background: Optional[bool] = Field(None, description="Whether processed in background")
    created_at: Optional[str] = Field(None, description="Creation timestamp")


class BulkImportResponseSchema(BaseModel):
    operation_id: str = Field(..., description="Bulk operation ID")
    status: str = Field(..., description="Operation status")
    format: Optional[str] = Field(None, description="Import format")
    estimated_duration: Optional[str] = Field(None, description="Estimated duration")
    created_at: Optional[str] = Field(None, description="Creation timestamp")


class BulkExportResponseSchema(BaseModel):
    operation_id: str = Field(..., description="Bulk operation ID")
    status: str = Field(..., description="Operation status")
    format: Optional[str] = Field(None, description="Export format")
    estimated_duration: Optional[str] = Field(None, description="Estimated duration")
    created_at: Optional[str] = Field(None, description="Creation timestamp")


class BulkValidationResponseSchema(BaseModel):
    is_valid: bool = Field(..., description="Overall validity of bulk request")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    entity_validation_failures: List[Dict[str, Any]] = Field(default_factory=list, description="Per-entity failures")
    estimated_duration: Optional[str] = Field(None, description="Estimated duration if executed")
    will_process_in_background: Optional[bool] = Field(None, description="Whether processing will happen in background")


class BulkOperationStatusSchema(BaseModel):
    operation_id: str = Field(..., description="Bulk operation ID")
    operation_type: Optional[str] = Field(None, description="Operation type")
    status: str = Field(..., description="Operation status")
    progress: Dict[str, Any] = Field(default_factory=dict, description="Progress counters and details")
    created_at: Optional[str] = Field(None, description="Creation timestamp")
    started_processing_at: Optional[str] = Field(None, description="Processing start time")
    completed_at: Optional[str] = Field(None, description="Completion time")
    failed_at: Optional[str] = Field(None, description="Failure time")
    final_results: Optional[Dict[str, Any]] = Field(None, description="Final summarized results")
    error_details: Optional[str] = Field(None, description="Error details if failed")


class BulkOperationProgressSchema(BaseModel):
    operation_id: str = Field(..., description="Bulk operation ID")
    status: str = Field(..., description="Operation status")
    progress: Dict[str, Any] = Field(default_factory=dict, description="Progress details including processed/total/errors")
    execution_log: Optional[List[Dict[str, Any]]] = Field(default=None, description="Execution log entries if available")
