import uuid
from sqlalchemy import Column, DateTime, String, func

from app.db.base import Base


class BaseModel(Base):
    __abstract__ = True
    # orders alembic migration creates id/order_id as String(36); the model PK was
    # declared UUID, which made varchar->uuid FKs (order_items.order_id etc.)
    # impossible to build. Align the model to the migration's String(36).
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
