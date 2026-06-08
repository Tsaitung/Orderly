from sqlalchemy import Column, String, Boolean, Integer, JSON, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.orm import relationship
from .base import BaseModel


# Create PostgreSQL native enum type (referencing existing DB enum)
user_role_enum = PgEnum(
    'restaurant_admin', 'restaurant_manager', 'restaurant_operator',
    'supplier_admin', 'supplier_manager', 'platform_admin',
    'platform_support', 'super_admin',
    name='UserRole', create_type=False
)


class User(BaseModel):
    __tablename__ = "users"

    email = Column(String, nullable=True, index=True)
    # Deprecated for auth: retained only for historical rows and migration safety.
    password_hash = Column("passwordHash", String, nullable=True)
    organization_id = Column("organizationId", String, ForeignKey("organizations.id"), nullable=False)
    role = Column(user_role_enum, nullable=False)
    tenant_id = Column("tenantId", String, nullable=True)
    tenant_type = Column("tenantType", String, nullable=True)
    permissions = Column("permissions", JSON, nullable=False, default=list)
    status = Column("status", String, nullable=False, default="active")
    display_name = Column("displayName", String, nullable=True)
    locale = Column("locale", String, nullable=True)
    timezone = Column("timezone", String, nullable=True)
    is_active = Column("isActive", Boolean, nullable=False, default=True)
    last_login_at = Column("lastLoginAt", DateTime(timezone=True), nullable=True)
    user_metadata = Column("metadata", JSON, nullable=False, default=dict)
    token_version = Column("tokenVersion", Integer, nullable=False, default=0)
    mfa_enabled = Column("mfaEnabled", Boolean, nullable=False, default=False)
    mfa_secret = Column("mfaSecret", String, nullable=True)

    # Auth related (subset of fields to start)
    is_super_user = Column("isSuperUser", Boolean, default=False, nullable=False)
    # Deprecated for auth: email is a billing/contact field, not an identity proof.
    email_verified = Column("emailVerified", Boolean, default=False, nullable=False)
    email_verified_at = Column("emailVerifiedAt", DateTime(timezone=True), nullable=True)

    # Phone verification (from migration 005)
    phone = Column("phone", String(20), nullable=True)
    phone_verified = Column("phoneVerified", Boolean, default=False, nullable=False)
    phone_verified_at = Column("phoneVerifiedAt", DateTime(timezone=True), nullable=True)

    # MFA extended (from migration 005)
    mfa_method = Column("mfaMethod", String(20), nullable=True)  # TOTP/SMS only
    mfa_backup_codes = Column("mfaBackupCodes", JSON, default=list, nullable=False)
    mfa_enforced_at = Column("mfaEnforcedAt", DateTime(timezone=True), nullable=True)

    # Verification level (from migration 005)
    verification_level = Column("verificationLevel", Integer, default=0, nullable=False)

    # Login lockout. Password timestamp is deprecated for auth.
    failed_login_attempts = Column("failedLoginAttempts", Integer, default=0, nullable=False)
    locked_until = Column("lockedUntil", DateTime(timezone=True), nullable=True)
    password_changed_at = Column("passwordChangedAt", DateTime(timezone=True), nullable=True)

    # Super User (from migration 005)
    super_user_activated_at = Column("superUserActivatedAt", DateTime(timezone=True), nullable=True)
    super_user_expires_at = Column("superUserExpiresAt", DateTime(timezone=True), nullable=True)
    super_user_reason = Column("superUserReason", String, nullable=True)

    organization = relationship("Organization")
