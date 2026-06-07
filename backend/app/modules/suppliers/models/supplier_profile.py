"""Supplier-owned relationship tables plus canonical supplier profile exports."""

from sqlalchemy import Column, String, Boolean, JSON, DateTime, ForeignKey, Integer
from sqlalchemy.sql.sqltypes import Numeric
from sqlalchemy.sql import func

from app.modules.users.models.supplier import DeliveryCapacity, SupplierProfile, SupplierStatus

from .base import BaseModel


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
