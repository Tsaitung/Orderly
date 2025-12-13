"""
Image Service for Product Image Management
Handles local storage, thumbnail generation, and image management
"""
import os
import uuid
import shutil
from pathlib import Path
from typing import List, Optional, Tuple
from datetime import datetime
from io import BytesIO

from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from PIL import Image

from app.models.product_image import ProductImage
from app.core.config import settings


class ImageService:
    """
    圖片管理服務
    支援：
    - 本地存儲（預設）
    - 自動縮圖生成
    - 圖片排序管理
    - 主圖設定
    """

    MAX_IMAGES_PER_PRODUCT = 10
    MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB
    ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    THUMBNAIL_SIZE = (200, 200)

    # 本地存儲目錄
    BASE_UPLOAD_DIR = Path(getattr(settings, 'local_upload_dir', '/tmp/uploads/products'))

    @classmethod
    def _ensure_upload_dirs(cls, product_id: str) -> Tuple[Path, Path]:
        """確保上傳目錄存在"""
        product_dir = cls.BASE_UPLOAD_DIR / product_id
        original_dir = product_dir / "original"
        thumbnail_dir = product_dir / "thumbnails"

        original_dir.mkdir(parents=True, exist_ok=True)
        thumbnail_dir.mkdir(parents=True, exist_ok=True)

        return original_dir, thumbnail_dir

    @classmethod
    def _generate_filename(cls, original_filename: str) -> str:
        """生成唯一文件名"""
        ext = Path(original_filename).suffix.lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
            ext = '.jpg'
        return f"{uuid.uuid4().hex}{ext}"

    @classmethod
    async def _generate_thumbnail(cls, image_data: bytes, output_path: Path) -> Tuple[int, int]:
        """
        生成縮圖
        返回: (width, height)
        """
        try:
            img = Image.open(BytesIO(image_data))

            # 保持原始模式或轉換為 RGB
            if img.mode in ('RGBA', 'LA', 'P'):
                # 有透明通道的轉為 RGBA
                img = img.convert('RGBA')
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            # 等比例縮放
            img.thumbnail(cls.THUMBNAIL_SIZE, Image.Resampling.LANCZOS)

            # 保存縮圖
            if output_path.suffix.lower() in ['.jpg', '.jpeg']:
                # JPEG 不支持透明，轉為 RGB
                if img.mode == 'RGBA':
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[3])
                    img = background
                img.save(output_path, 'JPEG', quality=85)
            elif output_path.suffix.lower() == '.png':
                img.save(output_path, 'PNG', optimize=True)
            elif output_path.suffix.lower() == '.webp':
                img.save(output_path, 'WEBP', quality=85)
            else:
                img.save(output_path)

            return img.size
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to generate thumbnail: {str(e)}")

    @classmethod
    async def _get_image_dimensions(cls, image_data: bytes) -> Tuple[int, int]:
        """獲取圖片尺寸"""
        try:
            img = Image.open(BytesIO(image_data))
            return img.size
        except Exception:
            return (0, 0)

    @classmethod
    async def upload_image(
        cls,
        db: AsyncSession,
        product_id: str,
        file: UploadFile,
        is_primary: bool = False,
        alt_text: Optional[str] = None,
        uploaded_by: Optional[str] = None
    ) -> ProductImage:
        """
        上傳產品圖片

        Args:
            db: 數據庫會話
            product_id: 產品 ID
            file: 上傳的文件
            is_primary: 是否設為主圖
            alt_text: 圖片替代文字
            uploaded_by: 上傳者 ID

        Returns:
            ProductImage 記錄
        """
        # 驗證文件類型
        if file.content_type not in cls.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(cls.ALLOWED_MIME_TYPES)}"
            )

        # 讀取文件內容
        content = await file.read()
        file_size = len(content)

        # 驗證文件大小
        if file_size > cls.MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size: {cls.MAX_FILE_SIZE_BYTES // (1024*1024)}MB"
            )

        # 檢查圖片數量限制
        count_stmt = select(func.count(ProductImage.id)).where(ProductImage.product_id == product_id)
        result = await db.execute(count_stmt)
        current_count = result.scalar() or 0

        if current_count >= cls.MAX_IMAGES_PER_PRODUCT:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum {cls.MAX_IMAGES_PER_PRODUCT} images allowed per product"
            )

        # 確保目錄存在
        original_dir, thumbnail_dir = cls._ensure_upload_dirs(product_id)

        # 生成文件名
        filename = cls._generate_filename(file.filename or "image.jpg")
        original_path = original_dir / filename
        thumbnail_filename = f"{Path(filename).stem}_200x200{Path(filename).suffix}"
        thumbnail_path = thumbnail_dir / thumbnail_filename

        # 保存原始文件
        with open(original_path, 'wb') as f:
            f.write(content)

        # 獲取圖片尺寸
        width, height = await cls._get_image_dimensions(content)

        # 生成縮圖
        try:
            await cls._generate_thumbnail(content, thumbnail_path)
        except Exception as e:
            # 縮圖生成失敗不應該阻止上傳
            thumbnail_path = None

        # 計算排序順序
        max_order_stmt = select(func.max(ProductImage.display_order)).where(
            ProductImage.product_id == product_id
        )
        result = await db.execute(max_order_stmt)
        max_order = result.scalar() or -1
        display_order = max_order + 1

        # 如果設為主圖，先取消其他主圖
        if is_primary:
            await db.execute(
                update(ProductImage)
                .where(ProductImage.product_id == product_id)
                .values(is_primary=False)
            )

        # 如果是第一張圖片，自動設為主圖
        if current_count == 0:
            is_primary = True

        # 構建 URL (相對路徑，可配置基礎 URL)
        base_url = getattr(settings, 'image_base_url', '/static/uploads/products')
        url = f"{base_url}/{product_id}/original/{filename}"
        thumbnail_url = f"{base_url}/{product_id}/thumbnails/{thumbnail_filename}" if thumbnail_path else None

        # 創建數據庫記錄
        image = ProductImage(
            product_id=product_id,
            url=url,
            thumbnail_url=thumbnail_url,
            original_filename=file.filename,
            file_size=file_size,
            mime_type=file.content_type,
            width=width,
            height=height,
            display_order=display_order,
            is_primary=is_primary,
            alt_text=alt_text,
            uploaded_by=uploaded_by
        )

        db.add(image)
        await db.commit()
        await db.refresh(image)

        return image

    @classmethod
    async def get_product_images(
        cls,
        db: AsyncSession,
        product_id: str
    ) -> List[ProductImage]:
        """
        獲取產品的所有圖片
        按 display_order 排序
        """
        stmt = (
            select(ProductImage)
            .where(ProductImage.product_id == product_id)
            .order_by(ProductImage.display_order)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @classmethod
    async def get_image_by_id(
        cls,
        db: AsyncSession,
        image_id: str
    ) -> Optional[ProductImage]:
        """根據 ID 獲取圖片"""
        stmt = select(ProductImage).where(ProductImage.id == image_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @classmethod
    async def delete_image(
        cls,
        db: AsyncSession,
        image_id: str
    ) -> bool:
        """
        刪除圖片
        同時刪除文件和數據庫記錄
        """
        # 獲取圖片記錄
        image = await cls.get_image_by_id(db, image_id)
        if not image:
            return False

        product_id = image.product_id
        was_primary = image.is_primary

        # 刪除文件
        try:
            # 解析文件路徑
            if image.url:
                # URL 格式: /static/uploads/products/{product_id}/original/{filename}
                url_parts = image.url.split('/')
                if len(url_parts) >= 2:
                    filename = url_parts[-1]
                    original_path = cls.BASE_UPLOAD_DIR / product_id / "original" / filename
                    if original_path.exists():
                        original_path.unlink()

            if image.thumbnail_url:
                url_parts = image.thumbnail_url.split('/')
                if len(url_parts) >= 2:
                    thumbnail_filename = url_parts[-1]
                    thumbnail_path = cls.BASE_UPLOAD_DIR / product_id / "thumbnails" / thumbnail_filename
                    if thumbnail_path.exists():
                        thumbnail_path.unlink()
        except Exception:
            pass  # 文件刪除失敗不阻止數據庫記錄刪除

        # 刪除數據庫記錄
        await db.execute(delete(ProductImage).where(ProductImage.id == image_id))
        await db.commit()

        # 如果刪除的是主圖，設置第一張為主圖
        if was_primary:
            stmt = (
                select(ProductImage)
                .where(ProductImage.product_id == product_id)
                .order_by(ProductImage.display_order)
                .limit(1)
            )
            result = await db.execute(stmt)
            first_image = result.scalar_one_or_none()
            if first_image:
                first_image.is_primary = True
                await db.commit()

        return True

    @classmethod
    async def set_primary_image(
        cls,
        db: AsyncSession,
        product_id: str,
        image_id: str
    ) -> bool:
        """設置主圖"""
        # 先取消所有主圖
        await db.execute(
            update(ProductImage)
            .where(ProductImage.product_id == product_id)
            .values(is_primary=False)
        )

        # 設置新主圖
        result = await db.execute(
            update(ProductImage)
            .where(ProductImage.id == image_id, ProductImage.product_id == product_id)
            .values(is_primary=True)
        )

        await db.commit()
        return result.rowcount > 0

    @classmethod
    async def reorder_images(
        cls,
        db: AsyncSession,
        product_id: str,
        image_ids: List[str]
    ) -> List[ProductImage]:
        """
        重新排序圖片

        Args:
            db: 數據庫會話
            product_id: 產品 ID
            image_ids: 排序後的圖片 ID 列表

        Returns:
            排序後的圖片列表
        """
        # 驗證所有圖片屬於該產品
        stmt = select(ProductImage).where(
            ProductImage.product_id == product_id,
            ProductImage.id.in_(image_ids)
        )
        result = await db.execute(stmt)
        existing_images = {img.id: img for img in result.scalars().all()}

        if len(existing_images) != len(image_ids):
            raise HTTPException(
                status_code=400,
                detail="Some image IDs are invalid or don't belong to this product"
            )

        # 更新排序
        for order, image_id in enumerate(image_ids):
            await db.execute(
                update(ProductImage)
                .where(ProductImage.id == image_id)
                .values(display_order=order)
            )

        await db.commit()

        # 返回排序後的列表
        return await cls.get_product_images(db, product_id)

    @classmethod
    async def update_alt_text(
        cls,
        db: AsyncSession,
        image_id: str,
        alt_text: str
    ) -> Optional[ProductImage]:
        """更新圖片替代文字"""
        stmt = (
            update(ProductImage)
            .where(ProductImage.id == image_id)
            .values(alt_text=alt_text)
        )
        result = await db.execute(stmt)
        await db.commit()

        if result.rowcount > 0:
            return await cls.get_image_by_id(db, image_id)
        return None

    @classmethod
    async def delete_all_product_images(
        cls,
        db: AsyncSession,
        product_id: str
    ) -> int:
        """
        刪除產品的所有圖片
        用於產品刪除時清理
        """
        # 獲取所有圖片
        images = await cls.get_product_images(db, product_id)

        # 刪除文件目錄
        try:
            product_dir = cls.BASE_UPLOAD_DIR / product_id
            if product_dir.exists():
                shutil.rmtree(product_dir)
        except Exception:
            pass

        # 刪除數據庫記錄
        result = await db.execute(
            delete(ProductImage).where(ProductImage.product_id == product_id)
        )
        await db.commit()

        return result.rowcount
