"""
Pydantic schemas for SKU Upload API
"""
from typing import List, Dict, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator


class UploadValidationResult(BaseModel):
    """CSV validation result"""
    is_valid: bool
    row_count: int
    errors: List[str] = []
    warnings: List[str] = []


class CSVTemplateResponse(BaseModel):
    """CSV template download response"""
    filename: str
    content_type: str
    size: int


class SKUUploadCreate(BaseModel):
    """Create upload request"""
    user_id: str = Field(..., description="User ID performing the upload")
    organization_id: Optional[str] = Field(None, description="Organization ID")
    filename: str = Field(..., description="Original filename")


class SKUUploadResponse(BaseModel):
    """Upload status response"""
    id: str
    filename: str
    status: str
    total_rows: int
    processed_rows: int = 0
    valid_rows: int = 0
    error_rows: int = 0
    duplicate_rows: int = 0
    category_corrections: int = 0
    progress_percentage: float = 0.0
    ai_validation_completed: bool = False
    started_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UploadProgressResponse(BaseModel):
    """Upload progress tracking"""
    upload_id: str
    current_step: str = Field(..., description="Current processing step")
    progress_percentage: float = Field(..., ge=0, le=100)
    items_processed: int = 0
    items_remaining: int = 0
    estimated_completion: Optional[datetime] = None
    status: str


class DuplicateCandidate(BaseModel):
    """Potential duplicate SKU candidate"""
    existing_sku_id: str
    existing_sku_code: str
    existing_product_name: str
    existing_variant: Dict[str, Any]
    similarity_score: float = Field(..., ge=0, le=1)
    match_type: str
    match_reason: str
    confidence_level: str


class CategorySuggestion(BaseModel):
    """Category suggestion from AI"""
    category_id: str
    category_name: str
    category_path: str
    confidence_score: float = Field(..., ge=0, le=1)
    match_reason: str
    keywords_matched: List[str] = []


class SKUUploadItemResponse(BaseModel):
    """Upload item with AI validation results"""
    id: str
    row_number: int
    status: str
    
    # System generated fields
    system_generated_sku_code: Optional[str]
    system_generated_product_id: Optional[str]
    
    # User provided data
    product_name: str
    category_name: str
    variant: Dict[str, Any] = {}
    stock_quantity: int
    min_stock: int
    max_stock: Optional[int]
    weight: Optional[float]
    package_type: Optional[str]
    shelf_life_days: Optional[int]
    storage_conditions: Optional[str]
    
    # AI validation results
    ai_duplicate_score: Optional[float] = Field(None, ge=0, le=1)
    ai_category_match_score: Optional[float] = Field(None, ge=0, le=1)
    suggested_category_id: Optional[str]
    suggested_category_path: Optional[str]
    duplicate_candidates: List[DuplicateCandidate] = []
    category_suggestions: List[CategorySuggestion] = []
    
    # Validation results
    validation_errors: List[str] = []
    validation_warnings: List[str] = []
    ai_validation_results: Dict[str, Any] = {}
    
    # Data snapshots
    original_data: Dict[str, Any] = {}
    processed_data: Optional[Dict[str, Any]] = None
    final_sku_data: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


class AIValidationResponse(BaseModel):
    """AI validation summary"""
    upload_id: str
    total_items_validated: int
    duplicates_detected: int
    category_corrections_needed: int
    high_risk_duplicates: int
    medium_risk_duplicates: int
    category_mismatches: int
    ai_processing_completed: bool
    validation_summary: Dict[str, Any] = {}
    recommendations: Dict[str, Any] = {}


class UploadItemsListResponse(BaseModel):
    """List of upload items"""
    upload_id: str
    items: List[SKUUploadItemResponse]
    total_items: int
    skip: int
    limit: int


class UploadApprovalRequest(BaseModel):
    """Approve upload request"""
    user_id: str = Field(..., description="User ID approving the upload")
    override_warnings: bool = Field(False, description="Override AI warnings")
    notes: Optional[str] = Field(None, description="Approval notes")


class UploadApprovalResponse(BaseModel):
    """Upload approval response"""
    upload_id: str
    status: str
    approved_at: datetime
    approved_by: str
    items_created: int
    message: str


class UploadListResponse(BaseModel):
    """List uploads response"""
    uploads: List[SKUUploadResponse]
    total_count: Optional[int] = None
    skip: int
    limit: int


class AIStatistics(BaseModel):
    """AI processing statistics"""
    total_processed: int
    duplicate_detection_accuracy: float = Field(..., ge=0, le=1)
    category_validation_accuracy: float = Field(..., ge=0, le=1)
    average_processing_time_ms: float
    confidence_distribution: Dict[str, int] = {}


class UploadAuditLog(BaseModel):
    """Audit log entry"""
    id: str
    upload_id: str
    upload_item_id: Optional[str]
    user_id: str
    action: str
    details: Dict[str, Any] = {}
    ai_decision: bool = False
    user_override: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True


class ErrorDetail(BaseModel):
    """Error detail for validation"""
    field: str
    message: str
    row_number: Optional[int] = None
    severity: str = "error"  # error, warning, info


class ValidationReport(BaseModel):
    """Comprehensive validation report"""
    upload_id: str
    validation_completed: bool
    total_items: int
    valid_items: int
    items_with_errors: int
    items_with_warnings: int
    duplicate_items: int
    category_corrections: int
    
    # Detailed breakdowns
    error_details: List[ErrorDetail] = []
    duplicate_details: List[DuplicateCandidate] = []
    category_details: List[CategorySuggestion] = []
    
    # AI performance metrics
    ai_statistics: Optional[AIStatistics] = None
    
    # Summary and recommendations
    ready_for_approval: bool
    requires_review: bool
    recommendations: List[str] = []


class BatchOperationRequest(BaseModel):
    """Batch operation on upload items"""
    upload_id: str
    item_ids: List[str] = Field(..., min_items=1)
    operation: str = Field(..., description="Operation to perform: approve, reject, skip")
    reason: Optional[str] = Field(None, description="Reason for the operation")
    user_id: str


class BatchOperationResponse(BaseModel):
    """Batch operation result"""
    upload_id: str
    operation: str
    items_processed: int
    items_successful: int
    items_failed: int
    failed_items: List[Dict[str, str]] = []  # item_id -> error_message
    message: str