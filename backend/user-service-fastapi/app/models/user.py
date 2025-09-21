from sqlalchemy import Column, String, Boolean, Integer, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel


class User(BaseModel):
    __tablename__ = "users"

    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column("passwordHash", String, nullable=True)
    organization_id = Column("organizationId", String, ForeignKey("organizations.id"), nullable=False)
    role = Column(String, nullable=False)
    is_active = Column("isActive", Boolean, nullable=False, default=True)
    last_login_at = Column("lastLoginAt", DateTime(timezone=True), nullable=True)
    user_metadata = Column("metadata", JSON, nullable=False, default=dict)
    token_version = Column("tokenVersion", Integer, nullable=False, default=0)

    # Auth related (subset of fields to start)
    is_super_user = Column("isSuperUser", Boolean, default=False, nullable=False)
    email_verified = Column("emailVerified", Boolean, default=False, nullable=False)

    organization = relationship("Organization")

