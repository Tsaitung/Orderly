"""
Platform provisioning allowlist model.

Maps an approved social provider identity to a pre-created platform user.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, UniqueConstraint

from app.modules.users.models.base import Base


class PlatformProvisioning(Base):
    """Allowlisted platform social identity."""

    __tablename__ = "platform_provisioning"
    __table_args__ = (
        UniqueConstraint("provider", "externalId", name="uq_platform_provisioning_provider_external"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), nullable=False)
    provider = Column(String(20), nullable=False, index=True)
    external_id = Column("externalId", String, nullable=False, index=True)
    user_id = Column("userId", String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    require_mfa = Column("requireMfa", Boolean, nullable=False, default=True)
    created_at = Column("createdAt", DateTime(timezone=True), default=datetime.utcnow, nullable=False)
