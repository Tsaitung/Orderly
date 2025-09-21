"""
Customer Company model - Second level of hierarchy (公司)
Legal entity for billing and accounting
"""
import re
from typing import List, Optional, Dict, Any
from sqlalchemy import (
    Column, String, ForeignKey, Index, UniqueConstraint, 
    CheckConstraint, DECIMAL, Text
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.hybrid import hybrid_property
from .base import BaseModel
import structlog

logger = structlog.get_logger(__name__)


class CustomerCompany(BaseModel):
    """
    Customer Company (公司) - Legal entity for billing and accounting
    
    This represents a government registered legal entity that is used
    for invoicing and accounting purposes. If the business owner is an
    individual, use ID number instead of company tax number.
    """
    __tablename__ = "customer_companies"
    __table_args__ = (
        Index("idx_customer_companies_group", "group_id"),
        Index("idx_customer_companies_tax_id", "tax_id"),
        Index("idx_customer_companies_name", "name"),
        Index("idx_customer_companies_active", "is_active"),
        Index("idx_customer_companies_legacy", "legacy_organization_id"),
        UniqueConstraint("tax_id", name="uq_customer_company_tax_id"),
        UniqueConstraint("legacy_organization_id", name="uq_customer_company_legacy"),
        CheckConstraint(
            "tax_id_type IN ('company', 'individual', 'foreign')",
            name="check_tax_id_type"
        ),
    )

    # Hierarchy relationship
    group_id = Column(
        String, 
        ForeignKey("customer_groups.id", ondelete="SET NULL"), 
        nullable=True,
        comment="Parent group ID (可選的上級集團)"
    )
    
    # Basic company information
    name = Column(
        String(255), 
        nullable=False,
        comment="Company name (公司名稱)"
    )
    legal_name = Column(
        String(255), 
        nullable=True,
        comment="Legal registered name (法定名稱)"
    )
    
    # Tax identification
    tax_id = Column(
        String(50), 
        unique=True, 
        nullable=False,
        comment="Tax ID or personal ID (統一編號或身分證號碼)"
    )
    tax_id_type = Column(
        String(20), 
        nullable=False, 
        default='company',
        comment="Type of tax ID: company, individual, foreign"
    )
    
    # Billing information
    billing_address = Column(
        "billing_address",
        JSONB,
        nullable=False,
        default=dict,
        comment="Billing address details"
    )
    billing_contact = Column(
        "billing_contact", 
        JSONB,
        nullable=False,
        default=dict,
        comment="Billing contact information"
    )
    billing_email = Column(
        String(255),
        nullable=True,
        comment="Billing email address"
    )
    
    # Financial settings
    payment_terms = Column(
        String(50),
        nullable=True,
        comment="Payment terms (e.g., NET30, NET60)"
    )
    credit_limit = Column(
        DECIMAL(12, 2),
        nullable=True,
        comment="Credit limit for this company"
    )
    
    # Migration support
    legacy_organization_id = Column(
        String,
        nullable=True,
        unique=True,
        comment="Legacy organization ID for migration"
    )
    
    # Company settings
    settings = Column(
        "settings",
        JSONB,
        nullable=False,
        default=dict,
        comment="Company-specific settings"
    )
    
    # Relationships
    group = relationship(
        "CustomerGroup",
        back_populates="companies"
    )
    locations = relationship(
        "CustomerLocation",
        back_populates="company",
        cascade="all, delete-orphan",
        lazy="select"
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Set legal name if not provided
        if not self.legal_name and self.name:
            self.legal_name = self.name
    
    @validates('name')
    def validate_name(self, key, name):
        """Validate company name"""
        if not name or not name.strip():
            raise ValueError("Company name cannot be empty")
        
        name = name.strip()
        if len(name) < 2:
            raise ValueError("Company name must be at least 2 characters long")
        
        if len(name) > 255:
            raise ValueError("Company name cannot exceed 255 characters")
        
        return name
    
    @validates('legal_name')
    def validate_legal_name(self, key, legal_name):
        """Validate legal name"""
        if legal_name and len(legal_name) > 255:
            raise ValueError("Legal name cannot exceed 255 characters")
        return legal_name
    
    @validates('tax_id')
    def validate_tax_id(self, key, tax_id):
        """Validate tax ID based on type"""
        if not tax_id or not tax_id.strip():
            raise ValueError("Tax ID cannot be empty")
        
        tax_id = tax_id.strip().upper()
        
        if self.tax_id_type == 'company':
            # Taiwan company tax ID: 8 digits
            if not re.match(r'^\d{8}$', tax_id):
                raise ValueError(
                    "Company tax ID must be exactly 8 digits"
                )
        elif self.tax_id_type == 'individual':
            # Taiwan personal ID: 1 letter + 9 digits
            if not re.match(r'^[A-Z]\d{9}$', tax_id):
                raise ValueError(
                    "Individual ID must be 1 letter followed by 9 digits"
                )
        elif self.tax_id_type == 'foreign':
            # Foreign entity: more flexible validation
            if len(tax_id) < 3 or len(tax_id) > 50:
                raise ValueError(
                    "Foreign tax ID must be between 3 and 50 characters"
                )
        else:
            raise ValueError(
                "Invalid tax_id_type. Must be 'company', 'individual', or 'foreign'"
            )
        
        return tax_id
    
    @validates('tax_id_type')
    def validate_tax_id_type(self, key, tax_id_type):
        """Validate tax ID type"""
        valid_types = ['company', 'individual', 'foreign']
        if tax_id_type not in valid_types:
            raise ValueError(f"Tax ID type must be one of: {valid_types}")
        return tax_id_type
    
    @validates('billing_email')
    def validate_billing_email(self, key, email):
        """Validate billing email format"""
        if email and not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
            raise ValueError("Invalid email format")
        return email
    
    @validates('payment_terms')
    def validate_payment_terms(self, key, terms):
        """Validate payment terms format"""
        if terms:
            valid_patterns = [
                r'^NET\d{1,3}$',  # NET30, NET60, etc.
                r'^COD$',         # Cash on delivery
                r'^PREPAID$',     # Prepaid
                r'^EOM\d{1,2}$'   # End of month
            ]
            if not any(re.match(pattern, terms.upper()) for pattern in valid_patterns):
                raise ValueError(
                    "Invalid payment terms format. Examples: NET30, COD, PREPAID, EOM30"
                )
            return terms.upper()
        return terms
    
    @validates('credit_limit')
    def validate_credit_limit(self, key, limit):
        """Validate credit limit"""
        if limit is not None and limit < 0:
            raise ValueError("Credit limit cannot be negative")
        return limit
    
    @hybrid_property
    def location_count(self) -> int:
        """Get number of locations for this company"""
        return self.locations.filter_by(is_active=True).count()
    
    @hybrid_property
    def total_business_units(self) -> int:
        """Get total number of business units across all locations"""
        total = 0
        for location in self.locations.filter_by(is_active=True):
            total += location.business_units.filter_by(is_active=True).count()
        return total
    
    @hybrid_property
    def is_individual_business(self) -> bool:
        """Check if this is an individual business"""
        return self.tax_id_type == 'individual'
    
    @hybrid_property
    def is_foreign_entity(self) -> bool:
        """Check if this is a foreign entity"""
        return self.tax_id_type == 'foreign'
    
    @hybrid_property
    def full_hierarchy_path(self) -> str:
        """Get full hierarchy path from group to company"""
        path_parts = []
        if self.group:
            path_parts.append(self.group.name)
        path_parts.append(self.name)
        return " > ".join(path_parts)
    
    def get_hierarchy_summary(self) -> Dict[str, Any]:
        """Get summary of hierarchy under this company"""
        locations = list(self.locations.filter_by(is_active=True))
        
        summary = {
            'company_id': self.id,
            'company_name': self.name,
            'tax_id': self.tax_id,
            'tax_id_type': self.tax_id_type,
            'group_id': self.group_id,
            'group_name': self.group.name if self.group else None,
            'locations_count': len(locations),
            'total_business_units': 0,
            'locations': []
        }
        
        for location in locations:
            units = list(location.business_units.filter_by(is_active=True))
            location_data = {
                'location_id': location.id,
                'location_name': location.name,
                'address': location.address,
                'business_units_count': len(units),
                'business_units': [
                    {
                        'unit_id': unit.id,
                        'unit_name': unit.name,
                        'unit_code': unit.code,
                        'unit_type': unit.type
                    }
                    for unit in units
                ]
            }
            
            summary['locations'].append(location_data)
            summary['total_business_units'] += len(units)
        
        return summary
    
    def get_billing_info(self) -> Dict[str, Any]:
        """Get complete billing information"""
        return {
            'company_name': self.legal_name or self.name,
            'tax_id': self.tax_id,
            'tax_id_type': self.tax_id_type,
            'billing_address': self.billing_address,
            'billing_contact': self.billing_contact,
            'billing_email': self.billing_email,
            'payment_terms': self.payment_terms,
            'credit_limit': float(self.credit_limit) if self.credit_limit else None
        }
    
    def update_billing_info(self, billing_data: Dict[str, Any], updated_by: str):
        """Update billing information"""
        allowed_fields = [
            'billing_address', 'billing_contact', 'billing_email',
            'payment_terms', 'credit_limit'
        ]
        
        for field in allowed_fields:
            if field in billing_data:
                setattr(self, field, billing_data[field])
        
        self.updated_by = updated_by
        self.audit_log('billing_updated', updated_by, billing_data)
    
    def validate_business_rules(self) -> List[str]:
        """Validate business rules for this company"""
        errors = []
        
        # Check if company has at least one location
        if self.location_count == 0:
            errors.append("Company must have at least one location")
        
        # Validate billing information completeness
        if not self.billing_address:
            errors.append("Billing address is required")
        
        if not self.billing_contact:
            errors.append("Billing contact is required")
        
        # Check for required billing address fields
        if self.billing_address:
            required_address_fields = ['street', 'city', 'postal_code']
            missing_fields = [
                field for field in required_address_fields
                if not self.billing_address.get(field)
            ]
            if missing_fields:
                errors.append(f"Missing billing address fields: {missing_fields}")
        
        return errors
    
    def can_delete(self) -> tuple[bool, List[str]]:
        """Check if company can be deleted"""
        reasons = []
        
        # Check if has active locations
        active_locations = self.locations.filter_by(is_active=True).count()
        if active_locations > 0:
            reasons.append(f"Company has {active_locations} active locations")
        
        # Check if has recent orders (would need to check with order service)
        # This would be implemented as a service call
        
        return len(reasons) == 0, reasons
    
    def soft_delete_cascade(self, deleted_by: str) -> Dict[str, int]:
        """Soft delete company and all child entities"""
        counts = {
            'locations': 0,
            'business_units': 0
        }
        
        # Soft delete all locations (which will cascade to business units)
        for location in self.locations.filter_by(is_active=True):
            unit_count = location.soft_delete_cascade(deleted_by)
            counts['locations'] += 1
            counts['business_units'] += unit_count
        
        # Soft delete the company itself
        self.soft_delete(deleted_by)
        
        logger.info(
            "Company soft deleted with cascade",
            company_id=self.id,
            company_name=self.name,
            tax_id=self.tax_id,
            deleted_counts=counts,
            deleted_by=deleted_by
        )
        
        return counts
    
    def __str__(self):
        return f"CustomerCompany: {self.name} ({self.tax_id})"