"""
Declarative base and common fields for User Service
"""
import uuid
from sqlalchemy import Column, DateTime, func, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class BaseModel(Base):
    __abstract__ = True

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), unique=True, nullable=False)
    created_at = Column("createdAt", DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column("updatedAt", DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False, default=func.now())

