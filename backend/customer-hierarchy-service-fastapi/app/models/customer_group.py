"""
Customer Group model - Top level of hierarchy (集團)
Virtual umbrella entity for managing multiple companies
"""
import re
from typing import List, Optional, Dict, Any
from sqlalchemy import Column, String, Text, Index, UniqueConstraint
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.hybrid import hybrid_property
from .base import BaseModel
import structlog

logger = structlog.get_logger(__name__)


class CustomerGroup(BaseModel):
    """
    Customer Group (集團) - Virtual umbrella entity for managing multiple companies
    
    This is the top level of the hierarchy and is optional. Groups allow
    managing multiple companies under a single umbrella organization.
    """
    __tablename__ = "customer_groups"
    __table_args__ = (
        Index("idx_customer_groups_code", "code"),
        Index("idx_customer_groups_name", "name"),
        Index("idx_customer_groups_active", "is_active"),
        Index("idx_customer_groups_created_by", "created_by"),
        UniqueConstraint("code", name="uq_customer_group_code"),
    )

    # Basic information
    name = Column(String(255), nullable=False, comment="Group name (集團名稱)")
    code = Column(
        String(50), 
        unique=True, 
        nullable=True,
        comment="Unique group code for identification (集團代碼)"
    )
    description = Column(
        Text, 
        nullable=True,
        comment="Group description (集團描述)"
    )
    
    # Relationships
    companies = relationship(
        "CustomerCompany",
        back_populates="group",
        cascade="all, delete-orphan",
        lazy="select"
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Auto-generate code if not provided
        if not self.code and self.name:
            self.code = self._generate_code_from_name()
    
    @validates('name')
    def validate_name(self, key, name):
        """Validate group name"""
        if not name or not name.strip():
            raise ValueError("Group name cannot be empty")
        
        name = name.strip()
        if len(name) < 2:
            raise ValueError("Group name must be at least 2 characters long")
        
        if len(name) > 255:
            raise ValueError("Group name cannot exceed 255 characters")
        
        return name
    
    @validates('code')
    def validate_code(self, key, code):
        """Validate group code format"""
        if code is None:
            return code
            
        code = code.strip().upper()
        
        # Code pattern: alphanumeric, underscore, hyphen only
        if not re.match(r'^[A-Z0-9_-]+$', code):
            raise ValueError(
                "Group code must contain only uppercase letters, numbers, "
                "underscore and hyphen"
            )
        
        if len(code) < 2:
            raise ValueError("Group code must be at least 2 characters long")
        
        if len(code) > 50:
            raise ValueError("Group code cannot exceed 50 characters")
        
        return code
    
    @validates('description')
    def validate_description(self, key, description):
        """Validate description length"""
        if description and len(description) > 1000:
            raise ValueError("Description cannot exceed 1000 characters")
        return description
    
    def _generate_code_from_name(self) -> str:
        """Generate code from name"""
        if not self.name:
            return None
        
        # Convert Chinese/English name to code
        import unicodedata
        
        # Remove special characters and convert to uppercase
        code = re.sub(r'[^\w\s-]', '', self.name)
        code = re.sub(r'[-\s]+', '_', code)
        code = code.upper().strip('_')
        
        # If mostly Chinese characters, use initials
        chinese_chars = sum(1 for c in self.name if '\u4e00' <= c <= '\u9fff')
        if chinese_chars > len(self.name) / 2:
            # For Chinese names, try to extract meaningful characters
            # This is a simplified approach
            code = ''.join([c for c in self.name if '\u4e00' <= c <= '\u9fff'])[:10]
            if not code:
                code = 'GROUP'
        
        # Ensure minimum length
        if len(code) < 2:
            code = 'GROUP_' + code
        
        # Ensure maximum length
        if len(code) > 50:
            code = code[:50]
        
        return code
    
    @hybrid_property
    def company_count(self) -> int:
        """Get number of companies in this group"""
        return self.companies.filter_by(is_active=True).count()
    
    @hybrid_property
    def total_locations(self) -> int:
        """Get total number of locations across all companies"""
        from .customer_location import CustomerLocation
        from .customer_company import CustomerCompany
        
        total = 0
        for company in self.companies.filter_by(is_active=True):
            total += company.locations.filter_by(is_active=True).count()
        return total
    
    @hybrid_property
    def total_business_units(self) -> int:
        """Get total number of business units across all companies"""
        from .business_unit import BusinessUnit
        from .customer_location import CustomerLocation
        from .customer_company import CustomerCompany
        
        total = 0
        for company in self.companies.filter_by(is_active=True):
            for location in company.locations.filter_by(is_active=True):
                total += location.business_units.filter_by(is_active=True).count()
        return total
    
    def get_hierarchy_summary(self) -> Dict[str, Any]:
        """Get summary of entire hierarchy under this group"""
        companies = list(self.companies.filter_by(is_active=True))
        
        summary = {
            'group_id': self.id,
            'group_name': self.name,
            'group_code': self.code,
            'companies_count': len(companies),
            'total_locations': 0,
            'total_business_units': 0,
            'companies': []
        }
        
        for company in companies:
            locations = list(company.locations.filter_by(is_active=True))
            total_units = sum(
                len(list(loc.business_units.filter_by(is_active=True)))
                for loc in locations
            )
            
            company_data = {
                'company_id': company.id,
                'company_name': company.name,
                'tax_id': company.tax_id,
                'locations_count': len(locations),
                'business_units_count': total_units
            }
            
            summary['companies'].append(company_data)
            summary['total_locations'] += len(locations)
            summary['total_business_units'] += total_units
        
        return summary
    
    def get_all_companies(self, include_inactive: bool = False) -> List:
        """Get all companies in this group"""
        query = self.companies
        if not include_inactive:
            query = query.filter_by(is_active=True)
        return list(query.all())
    
    def validate_business_rules(self) -> List[str]:
        """Validate business rules for this group"""
        errors = []
        
        # Check if group has any companies
        if self.company_count == 0:
            errors.append("Group must have at least one company")
        
        # Check for duplicate company names within group
        company_names = [c.name for c in self.get_all_companies()]
        if len(company_names) != len(set(company_names)):
            errors.append("Company names within group must be unique")
        
        return errors
    
    def can_delete(self) -> tuple[bool, List[str]]:
        """Check if group can be deleted"""
        reasons = []
        
        # Check if has active companies
        active_companies = self.companies.filter_by(is_active=True).count()
        if active_companies > 0:
            reasons.append(f"Group has {active_companies} active companies")
        
        return len(reasons) == 0, reasons
    
    def soft_delete_cascade(self, deleted_by: str) -> Dict[str, int]:
        """Soft delete group and all child entities"""
        counts = {
            'companies': 0,
            'locations': 0,
            'business_units': 0
        }
        
        # Soft delete all companies (which will cascade)
        for company in self.get_all_companies():
            cascade_counts = company.soft_delete_cascade(deleted_by)
            counts['companies'] += 1
            counts['locations'] += cascade_counts['locations']
            counts['business_units'] += cascade_counts['business_units']
        
        # Soft delete the group itself
        self.soft_delete(deleted_by)
        
        logger.info(
            "Group soft deleted with cascade",
            group_id=self.id,
            group_name=self.name,
            deleted_counts=counts,
            deleted_by=deleted_by
        )
        
        return counts
    
    def __str__(self):
        return f"CustomerGroup: {self.name} ({self.code or 'No Code'})"