"""
Product Category SQLAlchemy model
"""
from sqlalchemy import Column, String, Integer, Boolean, Text, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base


class ProductCategory(Base):
    """
    Product Category model supporting hierarchical structure
    Maps to product_categories table
    """
    __tablename__ = "product_categories"
    
    # Primary key
    id = Column(String, primary_key=True)
    
    # Core fields (using existing column names)
    code = Column(String, unique=True, nullable=False, index=True)  # 4字元分類碼
    name = Column(String, nullable=False)  # 中文名稱
    nameEn = Column("nameEn", String, nullable=False)  # 英文名稱
    
    # Hierarchy fields
    parentId = Column("parentId", String, ForeignKey("product_categories.id"), nullable=True)
    level = Column(Integer, default=1, nullable=False)  # 1=一級, 2=二級, etc.
    sortOrder = Column("sortOrder", Integer, default=0, nullable=False)
    
    # Optional fields
    description = Column(Text, nullable=True)
    meta_data = Column("metadata", JSON, default={}, nullable=False)
    isActive = Column("isActive", Boolean, default=True, nullable=False)
    
    # Timestamps
    createdAt = Column("createdAt", DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column("updatedAt", DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships with async loading
    parent = relationship(
        "ProductCategory",
        remote_side="ProductCategory.id",
        back_populates="children",
        foreign_keys=[parentId],
        lazy="selectin"
    )
    children = relationship(
        "ProductCategory",
        back_populates="parent",
        lazy="selectin"
    )
    products = relationship(
        "Product", 
        back_populates="category",
        lazy="selectin"
    )
    
    def __repr__(self):
        return f"<ProductCategory(code={self.code}, name={self.name}, level={self.level})>"
    
    @property
    def is_root(self) -> bool:
        """Check if this is a root category (level 1)"""
        return self.parent_id is None
    
    @property
    def full_path(self) -> str:
        """Get the full path from root to this category"""
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name
