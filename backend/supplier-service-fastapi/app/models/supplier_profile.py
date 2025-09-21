"""
Supplier Profile Models - Extended supplier information beyond organizations table
"""
from sqlalchemy import Column, String, Boolean, JSON, DateTime, ForeignKey, Enum, Integer
from sqlalchemy.sql.sqltypes import Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from .base import BaseModel


class SupplierStatus(PyEnum):
    """Supplier verification and operational status"""
    PENDING = "pending"           # Awaiting verification
    VERIFIED = "verified"         # Verified and can operate
    SUSPENDED = "suspended"       # Temporarily suspended
    DEACTIVATED = "deactivated"  # Permanently deactivated


class DeliveryCapacity(PyEnum):
    """Delivery capacity levels"""
    SMALL = "SMALL"      # < 500kg/day
    MEDIUM = "MEDIUM"    # 500-2000kg/day
    LARGE = "LARGE"      # > 2000kg/day


class SupplierProfile(BaseModel):
    """
    Extended supplier information that supplements the organizations table.
    This table contains supplier-specific operational data.
    """
    __tablename__ = "supplier_profiles"

    # Link to organization (supplier must exist in organizations table)
    organization_id = Column(
        "organizationId",
        String,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Operational status
    status = Column(Enum(SupplierStatus), default=SupplierStatus.PENDING, nullable=False)
    verified_at = Column("verifiedAt", DateTime(timezone=True), nullable=True)
    verified_by = Column("verifiedBy", String, nullable=True)  # Admin user ID
    
    # Business capabilities
    delivery_capacity = Column("deliveryCapacity", Enum(DeliveryCapacity), default=DeliveryCapacity.SMALL)
    delivery_capacity_kg_per_day = Column(
        "deliveryCapacityKgPerDay",
        Integer,
        default=500,
        nullable=False
    )
    
    # Operating information
    operating_hours = Column("operatingHours", JSON, nullable=False, default=dict)
    # Example: {"monday": {"open": "06:00", "close": "18:00", "is_closed": false}, ...}
    
    delivery_zones = Column("deliveryZones", JSON, nullable=False, default=list)
    # Example: ["台北市大安區", "台北市信義區", "新北市板橋區"]
    
    minimum_order_amount = Column(
        "minimumOrderAmount",
        Numeric(10, 2),
        default=1000.00,
        nullable=False
    )
    
    # Payment and billing
    payment_terms_days = Column("paymentTermsDays", Integer, default=30, nullable=False)
    bank_account_info = Column("bankAccountInfo", JSON, nullable=True)  # Encrypted in production
    # Example: {"bank_name": "台灣銀行", "account_number": "***1234", "account_name": "供應商名稱"}
    
    # Quality and certifications
    quality_certifications = Column("qualityCertifications", JSON, nullable=False, default=list)
    # Example: [{"name": "HACCP", "number": "HACCP123", "expires_at": "2024-12-31"}]
    
    food_safety_license = Column("foodSafetyLicense", String, nullable=True)
    food_safety_expires_at = Column("foodSafetyExpiresAt", DateTime(timezone=True), nullable=True)
    
    # Contact preferences
    contact_preferences = Column("contactPreferences", JSON, nullable=False, default=dict)
    # Example: {"email_notifications": true, "sms_notifications": false, "whatsapp": true}
    
    # Business settings
    settings = Column(JSON, nullable=False, default=dict)
    # Example: {"auto_accept_orders": false, "require_photo_confirmation": true}
    
    # Notes and admin fields
    internal_notes = Column("internalNotes", String, nullable=True)  # Admin-only notes
    public_description = Column("publicDescription", String, nullable=True)  # Customer-visible
    
    # Relationships (will be established via foreign keys to organizations table)
    
    def is_active(self) -> bool:
        """Check if supplier is active and can receive orders"""
        return self.status == SupplierStatus.VERIFIED
    
    def can_deliver_to_zone(self, zone: str) -> bool:
        """Check if supplier delivers to a specific zone"""
        return zone in self.delivery_zones
    
    def is_operating_now(self) -> bool:
        """Check if supplier is currently operating (simplified)"""
        # This would be enhanced with actual time checking in production
        return self.status == SupplierStatus.VERIFIED
    
    def update_status(self, new_status: SupplierStatus, verified_by: str = None):
        """Update supplier status with audit trail"""
        self.status = new_status
        if new_status == SupplierStatus.VERIFIED:
            self.verified_at = func.now()
            self.verified_by = verified_by
    
    def __repr__(self):
        return f"<SupplierProfile(org_id={self.organization_id}, status={self.status.value})>"


class SupplierCustomer(BaseModel):
    """
    Supplier-Customer relationship tracking for business management
    """
    __tablename__ = "supplier_customers"

    supplier_id = Column(
        "supplierId",
        String,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    customer_id = Column(
        "customerId",
        String,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Relationship type
    relationship_type = Column("relationshipType", String, default="active", nullable=False)
    # Values: active, inactive, blocked, pending
    
    # Business terms
    credit_limit_ntd = Column("creditLimitNtd", Integer, default=0, nullable=False)
    payment_terms_days = Column("paymentTermsDays", Integer, default=30, nullable=False)
    
    # Relationship metrics
    first_order_date = Column("firstOrderDate", DateTime(timezone=True), nullable=True)
    last_order_date = Column("lastOrderDate", DateTime(timezone=True), nullable=True)
    total_orders = Column("totalOrders", Integer, default=0, nullable=False)
    total_revenue_ntd = Column("totalRevenueNtd", Numeric(12, 2), default=0.00, nullable=False)
    
    # Custom pricing and terms
    custom_pricing_rules = Column("customPricingRules", JSON, nullable=False, default=dict)
    special_delivery_instructions = Column("specialDeliveryInstructions", String, nullable=True)
    
    # Admin and notes
    notes = Column(String, nullable=True)
    
    def is_active_customer(self) -> bool:
        """Check if customer relationship is active"""
        return self.relationship_type == "active"
    
    def update_order_stats(self, order_amount):
        """Update order statistics when new order is placed"""
        self.total_orders += 1
        self.total_revenue_ntd += order_amount
        self.last_order_date = func.now()
        
        if not self.first_order_date:
            self.first_order_date = func.now()
    
    def __repr__(self):
        return f"<SupplierCustomer(supplier={self.supplier_id[:8]}, customer={self.customer_id[:8]}, type={self.relationship_type})>"


class SupplierOnboardingProgress(BaseModel):
    """
    Detailed onboarding progress tracking for suppliers
    This supplements the basic onboarding_progress JSON in organizations table
    """
    __tablename__ = "supplier_onboarding_progress"

    supplier_id = Column(
        "supplierId",
        String,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Step completion tracking
    step_company_info = Column("stepCompanyInfo", Boolean, default=False, nullable=False)
    step_company_info_completed_at = Column("stepCompanyInfoCompletedAt", DateTime(timezone=True), nullable=True)
    
    step_business_documents = Column("stepBusinessDocuments", Boolean, default=False, nullable=False)
    step_business_documents_completed_at = Column("stepBusinessDocumentsCompletedAt", DateTime(timezone=True), nullable=True)
    
    step_delivery_setup = Column("stepDeliverySetup", Boolean, default=False, nullable=False)
    step_delivery_setup_completed_at = Column("stepDeliverySetupCompletedAt", DateTime(timezone=True), nullable=True)
    
    step_product_categories = Column("stepProductCategories", Boolean, default=False, nullable=False)
    step_product_categories_completed_at = Column("stepProductCategoriesCompletedAt", DateTime(timezone=True), nullable=True)
    
    step_verification = Column("stepVerification", Boolean, default=False, nullable=False)
    step_verification_completed_at = Column("stepVerificationCompletedAt", DateTime(timezone=True), nullable=True)
    
    # Overall completion
    is_completed = Column("isCompleted", Boolean, default=False, nullable=False)
    completed_at = Column("completedAt", DateTime(timezone=True), nullable=True)
    
    # Admin tracking
    reviewed_by = Column("reviewedBy", String, nullable=True)  # Admin user ID
    reviewed_at = Column("reviewedAt", DateTime(timezone=True), nullable=True)
    review_notes = Column("reviewNotes", String, nullable=True)
    
    def get_completion_percentage(self) -> int:
        """Calculate onboarding completion percentage"""
        steps = [
            self.step_company_info,
            self.step_business_documents,
            self.step_delivery_setup,
            self.step_product_categories,
            self.step_verification
        ]
        completed_steps = sum(1 for step in steps if step)
        return int((completed_steps / len(steps)) * 100)
    
    def mark_step_completed(self, step_name: str):
        """Mark a specific onboarding step as completed"""
        step_attr = f"step_{step_name}"
        completed_attr = f"step_{step_name}_completed_at"
        
        if hasattr(self, step_attr):
            setattr(self, step_attr, True)
            setattr(self, completed_attr, func.now())
            
            # Check if all steps are completed
            if self.get_completion_percentage() == 100:
                self.is_completed = True
                self.completed_at = func.now()
    
    def __repr__(self):
        return f"<SupplierOnboardingProgress(supplier={self.supplier_id[:8]}, completion={self.get_completion_percentage()}%)>"