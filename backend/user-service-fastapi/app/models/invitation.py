"""
Supplier Invitation SQLAlchemy model
Handles restaurant-to-supplier invitation system
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
import secrets
import string
from enum import Enum as PyEnum
from .base import BaseModel


class InvitationStatus(PyEnum):
    """Invitation status enumeration"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class SupplierInvitation(BaseModel):
    """
    Supplier invitation model for restaurant-to-supplier onboarding
    """
    __tablename__ = "supplier_invitations"
    
    # Unique invitation code (8 characters, alphanumeric)
    code = Column(String(8), unique=True, nullable=False, index=True)
    
    # Inviter information (restaurant)
    inviter_organization_id = Column(
        "inviterOrganizationId", 
        String, 
        ForeignKey("organizations.id"), 
        nullable=False
    )
    inviter_user_id = Column(
        "inviterUserId", 
        String, 
        ForeignKey("users.id"), 
        nullable=False
    )
    
    # Invitee information
    invitee_email = Column("inviteeEmail", String, nullable=False, index=True)
    invitee_company_name = Column("inviteeCompanyName", String, nullable=False)
    invitee_contact_person = Column("inviteeContactPerson", String, nullable=True)
    invitee_phone = Column("inviteePhone", String, nullable=True)
    
    # Invitation status and timestamps
    status = Column(
        Enum(InvitationStatus),
        default=InvitationStatus.PENDING,
        nullable=False
    )
    
    # Invitation lifecycle
    sent_at = Column("sentAt", DateTime(timezone=True), server_default=func.now())
    expires_at = Column("expiresAt", DateTime(timezone=True), nullable=False)
    accepted_at = Column("acceptedAt", DateTime(timezone=True), nullable=True)
    
    # Resulting organization ID after acceptance
    accepted_organization_id = Column(
        "acceptedOrganizationId",
        String,
        ForeignKey("organizations.id"),
        nullable=True
    )
    
    # Optional invitation message
    invitation_message = Column("invitationMessage", Text, nullable=True)
    
    # Relationships
    inviter_organization = relationship(
        "Organization",
        foreign_keys=[inviter_organization_id],
        backref="sent_invitations"
    )
    
    inviter_user = relationship(
        "User",
        foreign_keys=[inviter_user_id],
        backref="sent_invitations"
    )
    
    accepted_organization = relationship(
        "Organization",
        foreign_keys=[accepted_organization_id],
        backref="invitation_accepted"
    )
    
    @classmethod
    def generate_invitation_code(cls) -> str:
        """Generate unique 8-character invitation code"""
        characters = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(characters) for _ in range(8))
    
    @classmethod
    def create_invitation(
        cls,
        inviter_org_id: str,
        inviter_user_id: str,
        invitee_email: str,
        invitee_company_name: str,
        invitee_contact_person: str = None,
        invitee_phone: str = None,
        invitation_message: str = None,
        expires_in_days: int = 30
    ):
        """
        Create a new supplier invitation
        
        Args:
            inviter_org_id: Restaurant organization ID
            inviter_user_id: User who sent the invitation
            invitee_email: Supplier email address
            invitee_company_name: Supplier company name
            invitee_contact_person: Contact person name
            invitee_phone: Contact phone number
            invitation_message: Optional custom message
            expires_in_days: Invitation expiration (default 30 days)
        """
        code = cls.generate_invitation_code()
        expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
        
        return cls(
            code=code,
            inviter_organization_id=inviter_org_id,
            inviter_user_id=inviter_user_id,
            invitee_email=invitee_email,
            invitee_company_name=invitee_company_name,
            invitee_contact_person=invitee_contact_person,
            invitee_phone=invitee_phone,
            invitation_message=invitation_message,
            expires_at=expires_at
        )
    
    def is_expired(self) -> bool:
        """Check if invitation has expired"""
        return datetime.utcnow() > self.expires_at
    
    def can_be_accepted(self) -> bool:
        """Check if invitation can be accepted"""
        return (
            self.status == InvitationStatus.PENDING and
            not self.is_expired()
        )
    
    def accept(self, organization_id: str) -> bool:
        """
        Accept the invitation
        
        Args:
            organization_id: ID of the created supplier organization
            
        Returns:
            bool: True if successfully accepted
        """
        if not self.can_be_accepted():
            return False
            
        self.status = InvitationStatus.ACCEPTED
        self.accepted_at = datetime.utcnow()
        self.accepted_organization_id = organization_id
        return True
    
    def cancel(self) -> None:
        """Cancel the invitation"""
        if self.status == InvitationStatus.PENDING:
            self.status = InvitationStatus.CANCELLED
    
    def __repr__(self):
        return f"<SupplierInvitation(code={self.code}, invitee={self.invitee_email}, status={self.status.value})>"