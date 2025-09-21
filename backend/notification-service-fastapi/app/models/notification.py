from sqlalchemy import Column, String, Boolean, JSON, DateTime
from .base import BaseModel


class Notification(BaseModel):
    __tablename__ = "notifications"

    user_id = Column("userId", String, nullable=False, index=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    data = Column(JSON, nullable=False, default=dict)
    read = Column(Boolean, nullable=False, default=False)
    read_at = Column("readAt", DateTime(timezone=True), nullable=True)
    priority = Column(String, nullable=False, default="medium")

