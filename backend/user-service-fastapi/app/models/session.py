from sqlalchemy import Column, String, Boolean, JSON, DateTime, ForeignKey
from .base import BaseModel


class Session(BaseModel):
    __tablename__ = "sessions"

    user_id = Column("userId", String, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    refresh_token = Column("refreshToken", String, unique=True, nullable=True)
    device_info = Column("deviceInfo", JSON, nullable=False, default=dict)
    ip_address = Column("ipAddress", String, nullable=True)
    user_agent = Column("userAgent", String, nullable=True)
    location = Column(JSON, nullable=True)
    is_trusted = Column("isTrusted", Boolean, nullable=False, default=False)
    last_activity = Column("lastActivity", DateTime(timezone=True), nullable=False, server_default="now()")
    expires_at = Column("expiresAt", DateTime(timezone=True), nullable=False)

