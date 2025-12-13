"""
OAuth Link Model

記錄用戶的 OAuth 連結（LINE、Google 等）
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSON as PGJSON

from app.models.base import Base


class OAuthLink(Base):
    """OAuth 連結表"""
    __tablename__ = "oauth_links"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column("userId", String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # OAuth provider info
    provider = Column(String(20), nullable=False)  # line, google
    provider_user_id = Column("providerUserId", String, nullable=False)
    provider_email = Column("providerEmail", String, nullable=True)
    provider_data = Column("providerData", JSON, default=dict, nullable=False)

    # Timestamps
    linked_at = Column("linkedAt", DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    last_used_at = Column("lastUsedAt", DateTime(timezone=True), nullable=True)
    created_at = Column("createdAt", DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column("updatedAt", DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<OAuthLink provider={self.provider} user_id={self.user_id}>"
