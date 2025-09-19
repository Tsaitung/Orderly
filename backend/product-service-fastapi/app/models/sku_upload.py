"""
SKU Upload models for batch processing with AI validation
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, Float, JSON, ForeignKey, DateTime, func, Text, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from .base import BaseModel


class UploadStatus(enum.Enum):
    """Upload processing status"""
    pending = "pending"
    processing = "processing"
    ai_validating = "ai_validating"
    review_required = "review_required"
    approved = "approved"
    rejected = "rejected"
    failed = "failed"
    cancelled = "cancelled"


class UploadType(enum.Enum):
    """Upload operation type"""
    create = "create"
    update = "update"
    upsert = "upsert"


class ItemStatus(enum.Enum):
    """Individual item processing status"""
    pending = "pending"
    validating = "validating"
    valid = "valid"
    error = "error"
    warning = "warning"
    duplicate_detected = "duplicate_detected"
    category_mismatch = "category_mismatch"
    processed = "processed"
    skipped = "skipped"


class SKUUpload(BaseModel):
    """
    Main upload tracking table for SKU batch operations
    Supports AI validation and up to 200 SKUs per upload
    """
    __tablename__ = "sku_uploads"
    
    # User and organization info
    user_id = Column(String, nullable=False)
    organization_id = Column(String, nullable=True)
    
    # File information
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_url = Column(Text, nullable=True)
    
    # Processing statistics
    total_rows = Column(Integer, nullable=False)
    processed_rows = Column(Integer, default=0, nullable=False)
    valid_rows = Column(Integer, default=0, nullable=False)
    error_rows = Column(Integer, default=0, nullable=False)
    duplicate_rows = Column(Integer, default=0, nullable=False)
    category_corrections = Column(Integer, default=0, nullable=False)
    
    # Status and type
    status = Column(String(50), default=UploadStatus.pending.value, nullable=False)
    upload_type = Column(String(50), default=UploadType.create.value, nullable=False)
    
    # AI validation results
    ai_validation_completed = Column(Boolean, default=False, nullable=False)
    ai_validation_results = Column(JSONB, nullable=True)
    duplicate_detection_results = Column(JSONB, nullable=True)
    category_validation_results = Column(JSONB, nullable=True)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(String, nullable=True)
    
    # Error and metadata
    error_summary = Column(JSONB, nullable=True)
    processing_metadata = Column(JSONB, nullable=True)
    
    # Relationships
    items = relationship("SKUUploadItem", back_populates="upload", cascade="all, delete-orphan")
    audit_logs = relationship("SKUUploadAuditLog", back_populates="upload", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('total_rows <= 200', name='sku_uploads_max_rows_check'),
        CheckConstraint('file_size <= 5242880', name='sku_uploads_max_file_size_check'),  # 5MB
    )
    
    def __repr__(self):
        return f"<SKUUpload(id={self.id}, filename={self.filename}, status={self.status}, rows={self.total_rows})>"
    
    @property
    def progress_percentage(self) -> float:
        """Calculate processing progress percentage"""
        if self.total_rows == 0:
            return 0.0
        return (self.processed_rows / self.total_rows) * 100.0
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate of processed items"""
        if self.processed_rows == 0:
            return 0.0
        return (self.valid_rows / self.processed_rows) * 100.0
    
    def get_summary(self) -> dict:
        """Get upload summary statistics"""
        return {
            'id': str(self.id),
            'filename': self.original_filename,
            'status': self.status,
            'total_rows': self.total_rows,
            'processed_rows': self.processed_rows,
            'valid_rows': self.valid_rows,
            'error_rows': self.error_rows,
            'duplicate_rows': self.duplicate_rows,
            'category_corrections': self.category_corrections,
            'progress_percentage': self.progress_percentage,
            'success_rate': self.success_rate,
            'ai_validation_completed': self.ai_validation_completed,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }


class SKUUploadItem(BaseModel):
    """
    Individual SKU items within an upload batch
    Contains AI validation results and user data
    """
    __tablename__ = "sku_upload_items"
    
    # Upload reference
    upload_id = Column(String, ForeignKey("sku_uploads.id", ondelete="CASCADE"), nullable=False)
    row_number = Column(Integer, nullable=False)
    
    # System-generated fields (auto-created by system)
    system_generated_sku_code = Column(String(100), nullable=True)
    system_generated_product_id = Column(String, nullable=True)
    
    # User-provided fields (from CSV upload)
    product_name = Column(String(500), nullable=False)
    category_name = Column(String(255), nullable=False)
    variant = Column(JSONB, nullable=True)
    stock_quantity = Column(Integer, nullable=False)
    min_stock = Column(Integer, nullable=False)
    max_stock = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)
    package_type = Column(String(100), nullable=True)
    shelf_life_days = Column(Integer, nullable=True)
    storage_conditions = Column(String(200), nullable=True)
    
    # AI validation results
    ai_duplicate_score = Column(Float, nullable=True)  # 0-1 confidence score
    ai_category_match_score = Column(Float, nullable=True)  # 0-1 confidence score
    suggested_category_id = Column(String, nullable=True)
    suggested_category_path = Column(String(500), nullable=True)
    duplicate_candidates = Column(JSONB, nullable=True)  # List of potential duplicates
    category_suggestions = Column(JSONB, nullable=True)  # Alternative category suggestions
    
    # Processing status and validation results
    status = Column(String(50), default=ItemStatus.pending.value, nullable=False)
    validation_errors = Column(JSONB, nullable=True)
    validation_warnings = Column(JSONB, nullable=True)
    ai_validation_results = Column(JSONB, nullable=True)
    
    # Data storage
    original_data = Column(JSONB, nullable=False)  # Original CSV row data
    processed_data = Column(JSONB, nullable=True)  # Cleaned/transformed data
    final_sku_data = Column(JSONB, nullable=True)  # Final data for SKU creation
    
    # Relationships
    upload = relationship("SKUUpload", back_populates="items")
    audit_logs = relationship("SKUUploadAuditLog", back_populates="upload_item", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('stock_quantity >= 0', name='sku_upload_items_stock_positive'),
        CheckConstraint('min_stock >= 0', name='sku_upload_items_min_stock_positive'),
        CheckConstraint('max_stock IS NULL OR max_stock >= min_stock', name='sku_upload_items_max_stock_valid'),
        CheckConstraint('weight IS NULL OR weight > 0', name='sku_upload_items_weight_positive'),
        CheckConstraint('shelf_life_days IS NULL OR shelf_life_days > 0', name='sku_upload_items_shelf_life_positive'),
        CheckConstraint('ai_duplicate_score IS NULL OR (ai_duplicate_score >= 0 AND ai_duplicate_score <= 1)', name='sku_upload_items_duplicate_score_range'),
        CheckConstraint('ai_category_match_score IS NULL OR (ai_category_match_score >= 0 AND ai_category_match_score <= 1)', name='sku_upload_items_category_score_range'),
    )
    
    def __repr__(self):
        return f"<SKUUploadItem(id={self.id}, upload_id={self.upload_id}, row={self.row_number}, status={self.status})>"
    
    @property
    def is_duplicate_detected(self) -> bool:
        """Check if AI detected potential duplicates"""
        return self.ai_duplicate_score is not None and self.ai_duplicate_score > 0.85
    
    @property
    def needs_category_review(self) -> bool:
        """Check if category needs manual review"""
        return self.ai_category_match_score is not None and self.ai_category_match_score < 0.7
    
    @property
    def has_ai_suggestions(self) -> bool:
        """Check if AI has provided suggestions"""
        return bool(self.duplicate_candidates or self.category_suggestions)
    
    def get_ai_summary(self) -> dict:
        """Get AI validation summary for this item"""
        return {
            'duplicate_score': self.ai_duplicate_score,
            'category_match_score': self.ai_category_match_score,
            'is_duplicate_detected': self.is_duplicate_detected,
            'needs_category_review': self.needs_category_review,
            'has_suggestions': self.has_ai_suggestions,
            'duplicate_candidates_count': len(self.duplicate_candidates) if self.duplicate_candidates else 0,
            'category_suggestions_count': len(self.category_suggestions) if self.category_suggestions else 0
        }


class SKUUploadAuditLog(BaseModel):
    """
    Comprehensive audit trail for upload operations
    Tracks both user actions and AI decisions
    """
    __tablename__ = "sku_upload_audit_logs"
    
    # References
    upload_id = Column(String, ForeignKey("sku_uploads.id", ondelete="CASCADE"), nullable=False)
    upload_item_id = Column(String, ForeignKey("sku_upload_items.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(String, nullable=False)
    
    # Action details
    action = Column(String(100), nullable=False)
    details = Column(JSONB, nullable=True)
    
    # AI vs Human decision tracking
    ai_decision = Column(Boolean, default=False, nullable=False)
    user_override = Column(Boolean, default=False, nullable=False)
    
    # Request context
    ip_address = Column(String(45), nullable=True)  # IPv6 support
    user_agent = Column(Text, nullable=True)
    
    # Relationships
    upload = relationship("SKUUpload", back_populates="audit_logs")
    upload_item = relationship("SKUUploadItem", back_populates="audit_logs")
    
    def __repr__(self):
        return f"<SKUUploadAuditLog(id={self.id}, upload_id={self.upload_id}, action={self.action})>"


class SKUCodeSequence(BaseModel):
    """
    Sequence generator for unique SKU codes
    Ensures uniqueness per category per day
    """
    __tablename__ = "sku_code_sequences"
    
    # Sequence components
    category_code = Column(String(10), nullable=False)
    date_code = Column(String(8), nullable=False)  # YYYYMMDD format
    sequence_number = Column(Integer, default=1, nullable=False)
    last_used_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('sequence_number > 0', name='sku_code_sequences_positive_sequence'),
    )
    
    def __repr__(self):
        return f"<SKUCodeSequence(category={self.category_code}, date={self.date_code}, seq={self.sequence_number})>"
    
    def generate_sku_code(self, product_code: str, variant_code: str = "") -> str:
        """Generate a complete SKU code"""
        variant_part = f"-{variant_code}" if variant_code else ""
        return f"{self.category_code}-{product_code}{variant_part}-{self.date_code}-{self.sequence_number:04d}"
    
    @classmethod
    def get_next_sequence(cls, category_code: str, date_code: str) -> int:
        """Get the next sequence number for a category/date combination"""
        # This would be implemented in the service layer
        pass