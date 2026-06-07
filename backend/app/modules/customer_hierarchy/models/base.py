"""
Base model with common fields and utilities for Customer Hierarchy Service
"""
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, DateTime, String, Boolean, func, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.hybrid import hybrid_property
import structlog

logger = structlog.get_logger(__name__)

Base = declarative_base()


class BaseModel(Base):
    """Abstract base model with common fields for hierarchy entities"""
    __abstract__ = True
    
    # Primary key
    id = Column(
        String,
        primary_key=True,
        unique=True,
        nullable=False,
        default=lambda: str(uuid.uuid4())
    )
    
    # Audit timestamps
    created_at = Column(
        "createdAt",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        "updatedAt", 
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Audit fields for tracking changes
    created_by = Column(String, nullable=False)
    updated_by = Column(String, nullable=True)
    
    # Soft delete support
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Flexible metadata storage
    extra_data = Column(JSONB, nullable=False, default=dict, server_default='{}')
    
    # Optional notes field
    notes = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<{self.__class__.__name__}(id={self.id}, name={getattr(self, 'name', 'N/A')})>"
    
    def __str__(self):
        return f"{self.__class__.__name__}: {getattr(self, 'name', self.id)}"
    
    @hybrid_property
    def is_deleted(self) -> bool:
        """Check if entity is soft deleted"""
        return not self.is_active
    
    def soft_delete(self, deleted_by: str) -> None:
        """Soft delete the entity"""
        self.is_active = False
        self.updated_by = deleted_by
        self.extra_data = self.extra_data or {}
        self.extra_data['deleted_at'] = datetime.utcnow().isoformat()
        self.extra_data['deleted_by'] = deleted_by
        
    def restore(self, restored_by: str) -> None:
        """Restore a soft deleted entity"""
        self.is_active = True
        self.updated_by = restored_by
        self.extra_data = self.extra_data or {}
        if 'deleted_at' in self.extra_data:
            del self.extra_data['deleted_at']
        if 'deleted_by' in self.extra_data:
            del self.extra_data['deleted_by']
        self.extra_data['restored_at'] = datetime.utcnow().isoformat()
        self.extra_data['restored_by'] = restored_by
    
    def update_metadata(self, key: str, value: Any) -> None:
        """Update metadata field"""
        if self.extra_data is None:
            self.extra_data = {}
        self.extra_data[key] = value
    
    def get_metadata(self, key: str, default: Any = None) -> Any:
        """Get metadata field value"""
        if self.extra_data is None:
            return default
        return self.extra_data.get(key, default)
    
    def to_dict(self, include_metadata: bool = True) -> Dict[str, Any]:
        """Convert model to dictionary"""
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            
            # Handle datetime serialization
            if isinstance(value, datetime):
                result[column.name] = value.isoformat()
            # Handle JSONB fields
            elif column.name == 'extra_data' and not include_metadata:
                continue
            else:
                result[column.name] = value
                
        return result
    
    @classmethod
    def generate_id(cls) -> str:
        """Generate new UUID for entity"""
        return str(uuid.uuid4())
    
    def audit_log(self, action: str, user_id: str, details: Optional[Dict] = None):
        """Log audit information"""
        audit_data = {
            'entity_type': self.__class__.__name__,
            'entity_id': self.id,
            'action': action,
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details or {}
        }
        
        # Update metadata with audit trail
        self.extra_data = self.extra_data or {}
        if 'audit_trail' not in self.extra_data:
            self.extra_data['audit_trail'] = []
        
        self.extra_data['audit_trail'].append(audit_data)
        
        # Keep only last 10 audit entries to prevent metadata bloat
        if len(self.extra_data['audit_trail']) > 10:
            self.extra_data['audit_trail'] = self.extra_data['audit_trail'][-10:]
        
        logger.info(
            "Entity audit log",
            entity_type=self.__class__.__name__,
            entity_id=self.id,
            action=action,
            user_id=user_id
        )