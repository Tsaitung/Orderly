"""
Password History Model

記錄用戶密碼歷史，防止重複使用舊密碼
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class PasswordHistory(Base):
    """密碼歷史記錄表"""
    __tablename__ = "password_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column("userId", String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    password_hash = Column("passwordHash", String, nullable=False)
    changed_at = Column("changedAt", DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    created_at = Column("createdAt", DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column("updatedAt", DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<PasswordHistory user_id={self.user_id} changed_at={self.changed_at}>"
