"""
Product Images API endpoints
Handles image upload, deletion, and management for products
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.products.core.database import get_async_session
from app.modules.products.services.image_service import ImageService

router = APIRouter(prefix="/images", tags=["Product Images"])


# ============= Pydantic Schemas =============

class ProductImageResponse(BaseModel):
    """圖片響應模型"""
    id: str
    product_id: str
    url: str
    thumbnail_url: Optional[str] = None
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    display_order: int
    is_primary: bool
    alt_text: Optional[str] = None
    uploaded_by: Optional[str] = None

    class Config:
        from_attributes = True


class ImageListResponse(BaseModel):
    """圖片列表響應"""
    images: List[ProductImageResponse]
    total: int


class ReorderRequest(BaseModel):
    """重排序請求"""
    image_ids: List[str] = Field(..., description="排序後的圖片 ID 列表")


class UpdateAltTextRequest(BaseModel):
    """更新替代文字請求"""
    alt_text: str = Field(..., max_length=255, description="圖片替代文字")


class SetPrimaryRequest(BaseModel):
    """設置主圖請求"""
    image_id: str = Field(..., description="要設為主圖的圖片 ID")


# ============= API Endpoints =============

@router.post("/products/{product_id}", response_model=ProductImageResponse, status_code=201)
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(..., description="圖片文件"),
    is_primary: bool = Form(False, description="是否設為主圖"),
    alt_text: Optional[str] = Form(None, description="圖片替代文字"),
    uploaded_by: Optional[str] = Form(None, description="上傳者 ID"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    上傳產品圖片

    - **product_id**: 產品 ID (必填)
    - **file**: 圖片文件 (必填，支援 JPEG/PNG/WebP/GIF，最大 5MB)
    - **is_primary**: 是否設為主圖
    - **alt_text**: 圖片替代文字 (SEO 用途)

    限制：
    - 每個產品最多 10 張圖片
    - 單個文件最大 5MB
    - 支援格式：JPEG, PNG, WebP, GIF
    """
    image = await ImageService.upload_image(
        db=db,
        product_id=product_id,
        file=file,
        is_primary=is_primary,
        alt_text=alt_text,
        uploaded_by=uploaded_by
    )

    return ProductImageResponse(
        id=image.id,
        product_id=image.product_id,
        url=image.url,
        thumbnail_url=image.thumbnail_url,
        original_filename=image.original_filename,
        file_size=image.file_size,
        mime_type=image.mime_type,
        width=image.width,
        height=image.height,
        display_order=image.display_order,
        is_primary=image.is_primary,
        alt_text=image.alt_text,
        uploaded_by=image.uploaded_by
    )


@router.get("/products/{product_id}", response_model=ImageListResponse)
async def get_product_images(
    product_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取產品的所有圖片

    - **product_id**: 產品 ID

    返回按 display_order 排序的圖片列表
    """
    images = await ImageService.get_product_images(db, product_id)

    return ImageListResponse(
        images=[
            ProductImageResponse(
                id=img.id,
                product_id=img.product_id,
                url=img.url,
                thumbnail_url=img.thumbnail_url,
                original_filename=img.original_filename,
                file_size=img.file_size,
                mime_type=img.mime_type,
                width=img.width,
                height=img.height,
                display_order=img.display_order,
                is_primary=img.is_primary,
                alt_text=img.alt_text,
                uploaded_by=img.uploaded_by
            )
            for img in images
        ],
        total=len(images)
    )


@router.get("/{image_id}", response_model=ProductImageResponse)
async def get_image_by_id(
    image_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    根據 ID 獲取單張圖片詳情

    - **image_id**: 圖片 ID
    """
    image = await ImageService.get_image_by_id(db, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    return ProductImageResponse(
        id=image.id,
        product_id=image.product_id,
        url=image.url,
        thumbnail_url=image.thumbnail_url,
        original_filename=image.original_filename,
        file_size=image.file_size,
        mime_type=image.mime_type,
        width=image.width,
        height=image.height,
        display_order=image.display_order,
        is_primary=image.is_primary,
        alt_text=image.alt_text,
        uploaded_by=image.uploaded_by
    )


@router.delete("/{image_id}", status_code=204)
async def delete_image(
    image_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    刪除圖片

    - **image_id**: 圖片 ID

    同時刪除原始文件、縮圖和數據庫記錄。
    如果刪除的是主圖，會自動將第一張圖片設為新主圖。
    """
    success = await ImageService.delete_image(db, image_id)
    if not success:
        raise HTTPException(status_code=404, detail="Image not found")
    return None


@router.post("/products/{product_id}/reorder", response_model=ImageListResponse)
async def reorder_images(
    product_id: str,
    payload: ReorderRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    重新排序產品圖片

    - **product_id**: 產品 ID
    - **image_ids**: 排序後的圖片 ID 列表

    傳入的 image_ids 順序即為新的 display_order
    """
    images = await ImageService.reorder_images(
        db=db,
        product_id=product_id,
        image_ids=payload.image_ids
    )

    return ImageListResponse(
        images=[
            ProductImageResponse(
                id=img.id,
                product_id=img.product_id,
                url=img.url,
                thumbnail_url=img.thumbnail_url,
                original_filename=img.original_filename,
                file_size=img.file_size,
                mime_type=img.mime_type,
                width=img.width,
                height=img.height,
                display_order=img.display_order,
                is_primary=img.is_primary,
                alt_text=img.alt_text,
                uploaded_by=img.uploaded_by
            )
            for img in images
        ],
        total=len(images)
    )


@router.post("/products/{product_id}/primary", response_model=dict)
async def set_primary_image(
    product_id: str,
    payload: SetPrimaryRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    設置產品主圖

    - **product_id**: 產品 ID
    - **image_id**: 要設為主圖的圖片 ID
    """
    success = await ImageService.set_primary_image(
        db=db,
        product_id=product_id,
        image_id=payload.image_id
    )

    if not success:
        raise HTTPException(status_code=404, detail="Image not found or doesn't belong to this product")

    return {"success": True, "message": "Primary image set successfully"}


@router.patch("/{image_id}/alt-text", response_model=ProductImageResponse)
async def update_image_alt_text(
    image_id: str,
    payload: UpdateAltTextRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    更新圖片替代文字

    - **image_id**: 圖片 ID
    - **alt_text**: 新的替代文字
    """
    image = await ImageService.update_alt_text(
        db=db,
        image_id=image_id,
        alt_text=payload.alt_text
    )

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    return ProductImageResponse(
        id=image.id,
        product_id=image.product_id,
        url=image.url,
        thumbnail_url=image.thumbnail_url,
        original_filename=image.original_filename,
        file_size=image.file_size,
        mime_type=image.mime_type,
        width=image.width,
        height=image.height,
        display_order=image.display_order,
        is_primary=image.is_primary,
        alt_text=image.alt_text,
        uploaded_by=image.uploaded_by
    )


@router.delete("/products/{product_id}/all", status_code=200)
async def delete_all_product_images(
    product_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    刪除產品的所有圖片

    - **product_id**: 產品 ID

    用於產品刪除或批量清理場景。
    同時刪除所有文件和數據庫記錄。
    """
    count = await ImageService.delete_all_product_images(db, product_id)
    return {"success": True, "deleted_count": count}
