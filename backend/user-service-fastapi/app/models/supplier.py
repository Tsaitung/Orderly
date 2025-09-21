"""
Supplier profile models for extended supplier information
"""
from sqlalchemy import Column, String, Boolean, JSON, DateTime, ForeignKey, Enum, Integer, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from typing import Optional, Dict, Any
from .base import BaseModel


class SupplierStatus(PyEnum):
    """Supplier status enumeration"""
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    SUSPENDED = "SUSPENDED"
    DEACTIVATED = "DEACTIVATED"


class DeliveryCapacity(PyEnum):
    """Supplier delivery capacity levels"""
    SMALL = "SMALL"
    MEDIUM = "MEDIUM"
    LARGE = "LARGE"


class SupplierProfile(BaseModel):
    """
    Extended supplier profile information
    Links to Organization table via organizationId
    """
    __tablename__ = "supplier_profiles"

    # Link to organization
    organization_id = Column("organizationId", String, ForeignKey("organizations.id"), nullable=False, unique=True, index=True)
    
    # Status and verification
    status = Column(Enum(SupplierStatus), nullable=False, default=SupplierStatus.PENDING)
    verified_at = Column("verifiedAt", DateTime(timezone=True), nullable=True)
    verified_by = Column("verifiedBy", String, nullable=True)
    
    # Delivery capabilities
    delivery_capacity = Column("deliveryCapacity", Enum(DeliveryCapacity), nullable=True)
    delivery_capacity_kg_per_day = Column("deliveryCapacityKgPerDay", Integer, nullable=False, default=0)
    operating_hours = Column("operatingHours", JSON, nullable=False, default=dict)
    delivery_zones = Column("deliveryZones", JSON, nullable=False, default=list)
    
    # Business terms
    minimum_order_amount = Column("minimumOrderAmount", Numeric(10, 2), nullable=False, default=0)
    payment_terms_days = Column("paymentTermsDays", Integer, nullable=False, default=30)
    bank_account_info = Column("bankAccountInfo", JSON, nullable=True)
    
    # Quality and certifications
    quality_certifications = Column("qualityCertifications", JSON, nullable=False, default=list)
    food_safety_license = Column("foodSafetyLicense", String, nullable=True)
    food_safety_expires_at = Column("foodSafetyExpiresAt", DateTime(timezone=True), nullable=True)
    
    # Communication preferences
    contact_preferences = Column("contactPreferences", JSON, nullable=False, default=dict)
    settings = Column(JSON, nullable=False, default=dict)
    
    # Admin notes and public description
    internal_notes = Column("internalNotes", String, nullable=True)
    public_description = Column("publicDescription", String, nullable=True)
    
    # Relationships
    organization = relationship("Organization", foreign_keys=[organization_id])
    
    def is_active(self) -> bool:
        """Check if supplier is active and verified"""
        return self.status == SupplierStatus.VERIFIED
    
    def is_pending(self) -> bool:
        """Check if supplier is pending verification"""
        return self.status == SupplierStatus.PENDING
    
    def is_suspended(self) -> bool:
        """Check if supplier is suspended"""
        return self.status == SupplierStatus.SUSPENDED
    
    def get_status_display(self) -> str:
        """Get localized status display"""
        status_map = {
            SupplierStatus.PENDING: "審核中",
            SupplierStatus.VERIFIED: "營運中",
            SupplierStatus.SUSPENDED: "暫停營運",
            SupplierStatus.DEACTIVATED: "已停用"
        }
        return status_map.get(self.status, "未知狀態")
    
    def get_capacity_display(self) -> str:
        """Get localized capacity display"""
        if not self.delivery_capacity:
            return "未設定"
        
        capacity_map = {
            DeliveryCapacity.SMALL: "小型",
            DeliveryCapacity.MEDIUM: "中型", 
            DeliveryCapacity.LARGE: "大型"
        }
        return capacity_map.get(self.delivery_capacity, "未知")
    
    def get_operating_status(self) -> str:
        """Get current operating status based on time"""
        # This would check current time against operating_hours
        # For now, return basic status
        if self.is_active():
            return "營業中"
        return "非營業時間"
    
    def get_payment_terms_display(self) -> str:
        """Get payment terms in readable format"""
        if self.payment_terms_days == 0:
            return "現金交易"
        elif self.payment_terms_days <= 15:
            return f"月結{self.payment_terms_days}天"
        elif self.payment_terms_days <= 30:
            return f"月結{self.payment_terms_days}天"
        else:
            return f"{self.payment_terms_days}天後付款"
    
    def update_verification(self, verified_by: str, status: SupplierStatus = SupplierStatus.VERIFIED):
        """Update supplier verification status"""
        self.status = status
        self.verified_by = verified_by
        self.verified_at = func.now()
    
    def __repr__(self):
        return f"<SupplierProfile(organization_id={self.organization_id}, status={self.status.value})>"