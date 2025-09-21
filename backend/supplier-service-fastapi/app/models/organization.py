"""
Organization Model - Minimal model for foreign key reference
This is a reference model for the organizations table that exists in the shared database.
The actual organizations are managed by other services.
"""
from sqlalchemy import Column, String, Boolean, DateTime, JSON
from .base import BaseModel


class Organization(BaseModel):
    """
    Minimal Organization model for foreign key reference.
    This table is managed by other services - this is just for reference.
    """
    __tablename__ = "organizations"

    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # Simplified from enum
    settings = Column(JSON, nullable=False, default=dict)
    isActive = Column("isActive", Boolean, nullable=False, default=True)
    
    # Additional fields that exist in the real table but not needed for FK reference
    # These are optional since other services manage them
    businessType = Column("businessType", String)
    contactEmail = Column("contactEmail", String)
    contactPhone = Column("contactPhone", String)
    address = Column(String)
    
    def __repr__(self):
        return f"<Organization(id={self.id}, name={self.name}, type={self.type})>"