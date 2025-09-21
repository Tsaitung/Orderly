"""
Migration Log model - Tracks migration from old to new hierarchy
"""
from typing import List, Optional, Dict, Any
from sqlalchemy import (
    Column, String, ForeignKey, Index, CheckConstraint, 
    Text, DateTime, func
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, validates
from .base import BaseModel
import structlog

logger = structlog.get_logger(__name__)


class CustomerMigrationLog(BaseModel):
    """
    Customer Migration Log - Tracks migration from old customer/organization to new hierarchy
    
    This model tracks the migration process from the existing single-level customer
    system to the new 4-level hierarchy system. It provides audit trail and
    rollback capabilities.
    """
    __tablename__ = "customer_migration_logs"
    __table_args__ = (
        Index("idx_migration_old_customer", "old_customer_id"),
        Index("idx_migration_old_organization", "old_organization_id"),
        Index("idx_migration_status", "migration_status"),
        Index("idx_migration_type", "migration_type"),
        Index("idx_migration_date", "migration_date"),
        Index("idx_migration_migrated_by", "migrated_by"),
        CheckConstraint(
            "migration_status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')",
            name="check_migration_status"
        ),
        CheckConstraint(
            "migration_type IN ('auto', 'manual', 'assisted', 'bulk')",
            name="check_migration_type"
        ),
    )

    # Source system identifiers
    old_customer_id = Column(
        String,
        nullable=False,
        comment="Original customer ID from old system"
    )
    old_organization_id = Column(
        String,
        nullable=False,
        comment="Original organization ID from old system"
    )
    
    # Source data snapshot
    old_customer_data = Column(
        "old_customer_data",
        JSONB,
        nullable=True,
        comment="Snapshot of original customer data"
    )
    old_organization_data = Column(
        "old_organization_data", 
        JSONB,
        nullable=True,
        comment="Snapshot of original organization data"
    )
    
    # New hierarchy entity references
    new_group_id = Column(
        String,
        ForeignKey("customer_groups.id", ondelete="SET NULL"),
        nullable=True,
        comment="Created/assigned group ID"
    )
    new_company_id = Column(
        String,
        ForeignKey("customer_companies.id", ondelete="SET NULL"),
        nullable=True,
        comment="Created company ID"
    )
    new_location_id = Column(
        String,
        ForeignKey("customer_locations.id", ondelete="SET NULL"),
        nullable=True,
        comment="Created location ID"
    )
    new_business_unit_id = Column(
        String,
        ForeignKey("business_units.id", ondelete="SET NULL"),
        nullable=True,
        comment="Created business unit ID"
    )
    
    # Migration tracking
    migration_status = Column(
        String(20),
        nullable=False,
        default='pending',
        comment="Migration status"
    )
    migration_type = Column(
        String(20),
        nullable=False,
        default='auto',
        comment="Type of migration performed"
    )
    migration_date = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When migration was completed"
    )
    migration_started_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When migration was started"
    )
    migration_completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When migration was completed"
    )
    
    # Rollback tracking
    rollback_date = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When migration was rolled back"
    )
    rollback_reason = Column(
        Text,
        nullable=True,
        comment="Reason for rollback"
    )
    rolled_back_by = Column(
        String,
        nullable=True,
        comment="User who performed rollback"
    )
    
    # Validation and error tracking
    validation_errors = Column(
        "validation_errors",
        JSONB,
        nullable=True,
        comment="Validation errors encountered during migration"
    )
    validation_warnings = Column(
        "validation_warnings",
        JSONB,
        nullable=True,
        comment="Validation warnings during migration"
    )
    
    # Data mapping configuration
    data_mapping = Column(
        "data_mapping",
        JSONB,
        nullable=True,
        comment="Configuration used for data mapping"
    )
    migration_config = Column(
        "migration_config",
        JSONB,
        nullable=True,
        comment="Migration configuration and options"
    )
    
    # Processing metadata
    processing_duration_seconds = Column(
        String,
        nullable=True,
        comment="How long migration took to complete"
    )
    records_processed = Column(
        String,
        nullable=True,
        comment="Number of records processed"
    )
    
    # User tracking
    migrated_by = Column(
        String,
        nullable=True,
        comment="User who initiated the migration"
    )
    reviewed_by = Column(
        String,
        nullable=True,
        comment="User who reviewed/approved the migration"
    )
    
    # Relationships
    new_group = relationship(
        "CustomerGroup",
        foreign_keys=[new_group_id]
    )
    new_company = relationship(
        "CustomerCompany",
        foreign_keys=[new_company_id]
    )
    new_location = relationship(
        "CustomerLocation",
        foreign_keys=[new_location_id]
    )
    new_business_unit = relationship(
        "BusinessUnit",
        foreign_keys=[new_business_unit_id]
    )
    
    @validates('migration_status')
    def validate_migration_status(self, key, status):
        """Validate migration status transitions"""
        valid_statuses = ['pending', 'in_progress', 'completed', 'failed', 'rolled_back']
        if status not in valid_statuses:
            raise ValueError(f"Invalid migration status. Must be one of: {valid_statuses}")
        
        # Validate status transitions
        if hasattr(self, 'migration_status') and self.migration_status:
            current = self.migration_status
            
            valid_transitions = {
                'pending': ['in_progress', 'failed'],
                'in_progress': ['completed', 'failed'],
                'completed': ['rolled_back'],
                'failed': ['pending', 'in_progress'],  # Allow retry
                'rolled_back': ['pending']  # Allow re-migration
            }
            
            if current in valid_transitions and status not in valid_transitions[current]:
                raise ValueError(
                    f"Invalid status transition from {current} to {status}. "
                    f"Valid transitions: {valid_transitions[current]}"
                )
        
        return status
    
    @validates('migration_type')
    def validate_migration_type(self, key, migration_type):
        """Validate migration type"""
        valid_types = ['auto', 'manual', 'assisted', 'bulk']
        if migration_type not in valid_types:
            raise ValueError(f"Invalid migration type. Must be one of: {valid_types}")
        return migration_type
    
    def start_migration(self, migrated_by: str, migration_config: Dict[str, Any] = None):
        """Mark migration as started"""
        self.migration_status = 'in_progress'
        self.migration_started_at = func.now()
        self.migrated_by = migrated_by
        if migration_config:
            self.migration_config = migration_config
        
        self.audit_log('migration_started', migrated_by, {
            'old_customer_id': self.old_customer_id,
            'migration_type': self.migration_type
        })
    
    def complete_migration(
        self,
        new_company_id: str,
        new_location_id: str = None,
        new_business_unit_id: str = None,
        new_group_id: str = None,
        duration_seconds: float = None,
        records_processed: int = None
    ):
        """Mark migration as completed"""
        self.migration_status = 'completed'
        self.migration_date = func.now()
        self.migration_completed_at = func.now()
        self.new_company_id = new_company_id
        self.new_location_id = new_location_id
        self.new_business_unit_id = new_business_unit_id
        self.new_group_id = new_group_id
        
        if duration_seconds is not None:
            self.processing_duration_seconds = str(duration_seconds)
        if records_processed is not None:
            self.records_processed = str(records_processed)
        
        self.audit_log('migration_completed', self.migrated_by, {
            'old_customer_id': self.old_customer_id,
            'new_company_id': new_company_id,
            'new_location_id': new_location_id,
            'new_business_unit_id': new_business_unit_id,
            'duration_seconds': duration_seconds
        })
        
        logger.info(
            "Migration completed successfully",
            old_customer_id=self.old_customer_id,
            new_company_id=new_company_id,
            migration_type=self.migration_type,
            duration_seconds=duration_seconds
        )
    
    def fail_migration(self, errors: List[str], migrated_by: str = None):
        """Mark migration as failed"""
        self.migration_status = 'failed'
        self.validation_errors = errors
        if migrated_by:
            self.migrated_by = migrated_by
        
        self.audit_log('migration_failed', migrated_by or 'system', {
            'old_customer_id': self.old_customer_id,
            'errors': errors
        })
        
        logger.error(
            "Migration failed",
            old_customer_id=self.old_customer_id,
            errors=errors
        )
    
    def rollback_migration(self, rolled_back_by: str, reason: str = None):
        """Mark migration as rolled back"""
        if self.migration_status != 'completed':
            raise ValueError("Can only rollback completed migrations")
        
        self.migration_status = 'rolled_back'
        self.rollback_date = func.now()
        self.rolled_back_by = rolled_back_by
        self.rollback_reason = reason
        
        self.audit_log('migration_rolled_back', rolled_back_by, {
            'old_customer_id': self.old_customer_id,
            'reason': reason
        })
        
        logger.info(
            "Migration rolled back",
            old_customer_id=self.old_customer_id,
            rolled_back_by=rolled_back_by,
            reason=reason
        )
    
    def add_validation_error(self, error: str, field: str = None):
        """Add validation error"""
        if not self.validation_errors:
            self.validation_errors = []
        
        error_entry = {'message': error, 'timestamp': func.now().isoformat()}
        if field:
            error_entry['field'] = field
        
        self.validation_errors.append(error_entry)
    
    def add_validation_warning(self, warning: str, field: str = None):
        """Add validation warning"""
        if not self.validation_warnings:
            self.validation_warnings = []
        
        warning_entry = {'message': warning, 'timestamp': func.now().isoformat()}
        if field:
            warning_entry['field'] = field
        
        self.validation_warnings.append(warning_entry)
    
    def get_migration_summary(self) -> Dict[str, Any]:
        """Get migration summary"""
        return {
            'migration_id': self.id,
            'old_customer_id': self.old_customer_id,
            'old_organization_id': self.old_organization_id,
            'migration_status': self.migration_status,
            'migration_type': self.migration_type,
            'migration_date': self.migration_date.isoformat() if self.migration_date else None,
            'duration_seconds': float(self.processing_duration_seconds) if self.processing_duration_seconds else None,
            'records_processed': int(self.records_processed) if self.records_processed else None,
            'new_hierarchy': {
                'group_id': self.new_group_id,
                'company_id': self.new_company_id,
                'location_id': self.new_location_id,
                'business_unit_id': self.new_business_unit_id
            },
            'validation': {
                'error_count': len(self.validation_errors) if self.validation_errors else 0,
                'warning_count': len(self.validation_warnings) if self.validation_warnings else 0,
                'errors': self.validation_errors,
                'warnings': self.validation_warnings
            },
            'rollback': {
                'rolled_back': self.migration_status == 'rolled_back',
                'rollback_date': self.rollback_date.isoformat() if self.rollback_date else None,
                'rollback_reason': self.rollback_reason,
                'rolled_back_by': self.rolled_back_by
            },
            'migrated_by': self.migrated_by,
            'reviewed_by': self.reviewed_by
        }
    
    def get_created_entities(self) -> Dict[str, str]:
        """Get IDs of created entities"""
        return {
            'group_id': self.new_group_id,
            'company_id': self.new_company_id,
            'location_id': self.new_location_id,
            'business_unit_id': self.new_business_unit_id
        }
    
    def has_errors(self) -> bool:
        """Check if migration has errors"""
        return bool(self.validation_errors)
    
    def has_warnings(self) -> bool:
        """Check if migration has warnings"""
        return bool(self.validation_warnings)
    
    def is_completed(self) -> bool:
        """Check if migration is completed"""
        return self.migration_status == 'completed'
    
    def is_failed(self) -> bool:
        """Check if migration is failed"""
        return self.migration_status == 'failed'
    
    def is_rolled_back(self) -> bool:
        """Check if migration is rolled back"""
        return self.migration_status == 'rolled_back'
    
    def can_rollback(self) -> bool:
        """Check if migration can be rolled back"""
        return self.migration_status == 'completed'
    
    def can_retry(self) -> bool:
        """Check if migration can be retried"""
        return self.migration_status in ['failed', 'rolled_back']
    
    @classmethod
    def get_migration_stats(cls) -> Dict[str, int]:
        """Get migration statistics"""
        # This would need to be implemented with proper session handling
        # For now, return structure
        return {
            'total_migrations': 0,
            'completed': 0,
            'failed': 0,
            'in_progress': 0,
            'rolled_back': 0,
            'pending': 0
        }
    
    def __str__(self):
        return f"Migration: {self.old_customer_id} -> {self.migration_status}"