from sqlalchemy import Column, String, Boolean, JSON, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from .base import BaseModel


class OrganizationType(PyEnum):
    """Organization type enumeration"""
    RESTAURANT = "restaurant"
    SUPPLIER = "supplier"


class BusinessType(PyEnum):
    """Business entity type for suppliers"""
    COMPANY = "company"  # 公司 (有統編)
    INDIVIDUAL = "individual"  # 個人商號 (身分證字號)


class OnboardingStatus(PyEnum):
    """Supplier onboarding progress"""
    INVITED = "invited"
    COMPANY_INFO = "company_info"
    PRODUCT_CATEGORIES = "product_categories"
    SKU_SETUP = "sku_setup"
    PRICING_CONFIG = "pricing_config"
    COMPLETED = "completed"


# Create PostgreSQL native enum types (referencing existing DB enums)
organization_type_enum = PgEnum('restaurant', 'supplier', name='OrganizationType', create_type=False)
business_type_enum = PgEnum('company', 'individual', name='businesstype', create_type=False)
onboarding_status_enum = PgEnum('invited', 'company_info', 'product_categories', 'sku_setup', 'pricing_config', 'completed', name='onboardingstatus', create_type=False)


class Organization(BaseModel):
    __tablename__ = "organizations"

    name = Column(String, nullable=False)
    type = Column(organization_type_enum, nullable=False)
    settings = Column(JSON, nullable=False, default=dict)
    is_active = Column("isActive", Boolean, nullable=False, default=True)
    
    # Business information for suppliers
    business_type = Column("businessType", business_type_enum, nullable=True)
    tax_id = Column("taxId", String(8), nullable=True, index=True)  # 統一編號 (8 digits)
    personal_id = Column("personalId", String(10), nullable=True, index=True)  # 身分證字號 (10 chars)
    business_license_number = Column("businessLicenseNumber", String, nullable=True)
    
    # Contact information
    contact_person = Column("contactPerson", String, nullable=True)
    contact_phone = Column("contactPhone", String, nullable=True)
    contact_email = Column("contactEmail", String, nullable=True)
    address = Column(String, nullable=True)
    
    # Invitation and onboarding tracking
    invited_by_organization_id = Column(
        "invitedByOrganizationId",
        String,
        ForeignKey("organizations.id"),
        nullable=True
    )
    invitation_accepted_at = Column("invitationAcceptedAt", DateTime(timezone=True), nullable=True)
    onboarding_status = Column(
        "onboardingStatus",
        onboarding_status_enum,
        default='invited',
        nullable=True
    )
    onboarding_progress = Column("onboardingProgress", JSON, nullable=False, default=dict)
    onboarding_completed_at = Column("onboardingCompletedAt", DateTime(timezone=True), nullable=True)
    
    # Business capabilities for suppliers
    delivery_zones = Column("deliveryZones", JSON, nullable=False, default=list)
    product_categories = Column("productCategories", JSON, nullable=False, default=list)
    certifications = Column(JSON, nullable=False, default=list)

    # Verification (from migration 005)
    verification_level = Column("verificationLevel", Integer, default=1, nullable=False)
    verified_at = Column("verifiedAt", DateTime(timezone=True), nullable=True)
    verification_documents = Column("verificationDocuments", JSON, default=list, nullable=False)
    
    # Relationships
    invited_by = relationship(
        "Organization",
        remote_side="Organization.id",
        foreign_keys=[invited_by_organization_id],
        backref="invited_suppliers"
    )
    
    def is_supplier(self) -> bool:
        """Check if organization is a supplier"""
        return self.type == 'supplier'

    def is_restaurant(self) -> bool:
        """Check if organization is a restaurant"""
        return self.type == 'restaurant'

    def get_type_enum(self) -> OrganizationType:
        """Get the type as enum value"""
        return OrganizationType(self.type) if self.type else None
    
    def has_valid_tax_id(self) -> bool:
        """Validate tax ID format (8 digits for Taiwan business)"""
        if self.tax_id:
            return len(self.tax_id) == 8 and self.tax_id.isdigit()
        return False
    
    def has_valid_personal_id(self) -> bool:
        """Validate personal ID format (basic length check)"""
        if self.personal_id:
            return len(self.personal_id) == 10 and self.personal_id[0].isalpha()
        return False
    
    def get_business_identifier(self) -> str:
        """Get the appropriate business identifier"""
        if self.business_type == 'company' and self.tax_id:
            return f"統編: {self.tax_id}"
        elif self.business_type == 'individual' and self.personal_id:
            return f"個人: {self.personal_id[:3]}***{self.personal_id[-2:]}"
        return "未設定"
    
    def is_onboarding_complete(self) -> bool:
        """Check if supplier onboarding is complete"""
        return self.onboarding_status == 'completed'

    def update_onboarding_progress(self, step: str, data: dict = None) -> None:
        """Update onboarding progress"""
        if not self.onboarding_progress:
            self.onboarding_progress = {}

        self.onboarding_progress[step] = {
            "completed_at": func.now(),
            "data": data or {}
        }

        # Update status based on completed steps
        steps = self.onboarding_progress.keys()
        if all(step in steps for step in ["company_info", "product_categories", "sku_setup", "pricing_config"]):
            self.onboarding_status = 'completed'
            self.onboarding_completed_at = func.now()
    
    def __repr__(self):
        return f"<Organization(name={self.name}, type={self.type}, tax_id={self.tax_id})>"

