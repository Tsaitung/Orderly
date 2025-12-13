"""
Product Image model for managing product images
Aligned with migration add_product_images
"""
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from .base import BaseModel


class ProductImage(BaseModel):
    """
    產品圖片模型
    支援：
    - 多圖片上傳（每產品最多 10 張）
    - 自動生成縮圖
    - 圖片排序管理
    - 主圖設定
    """
    __tablename__ = "product_images"

    # Foreign Key
    product_id = Column("productId", String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)

    # Image Information
    url = Column("url", String(500), nullable=False)
    thumbnail_url = Column("thumbnailUrl", String(500), nullable=True)
    original_filename = Column("originalFilename", String(255), nullable=True)
    file_size = Column("fileSize", Integer, nullable=True)
    mime_type = Column("mimeType", String(50), nullable=True)
    width = Column("width", Integer, nullable=True)
    height = Column("height", Integer, nullable=True)

    # Management Fields
    display_order = Column("displayOrder", Integer, nullable=False, default=0)
    is_primary = Column("isPrimary", Boolean, nullable=False, default=False)
    alt_text = Column("altText", String(255), nullable=True)

    # Audit Fields
    uploaded_by = Column("uploadedBy", String(36), nullable=True)

    # Relationship
    product = relationship("Product", backref="product_images")

    def __repr__(self):
        return f"<ProductImage(product_id={self.product_id}, url={self.url}, is_primary={self.is_primary})>"

    @property
    def is_valid_image(self) -> bool:
        """檢查是否為有效圖片"""
        valid_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        return self.mime_type in valid_types if self.mime_type else False

    @property
    def file_size_mb(self) -> float:
        """取得檔案大小（MB）"""
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return 0.0

    @property
    def dimensions(self) -> str:
        """取得圖片尺寸字串"""
        if self.width and self.height:
            return f"{self.width}x{self.height}"
        return "unknown"
