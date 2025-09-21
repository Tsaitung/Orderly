"""
SKU Sharing System API endpoints
支援共享型(public)和獨占型(private) SKU 管理
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, and_, or_, func, text
from pydantic import BaseModel

from app.core.database import get_async_session
from app.models.sku_simple import ProductSKU

router = APIRouter()


class SKUTypeFilter:
    """SKU 類型篩選器"""
    PUBLIC = "public"
    PRIVATE = "private"
    ALL = "all"


class SKUShareRequest(BaseModel):
    """將私有 SKU 轉為共享 SKU 的請求"""
    sku_id: str
    standard_info: dict
    reason: str


class SKUParticipationRequest(BaseModel):
    """供應商參與共享 SKU 的請求"""
    sku_id: str
    custom_name: Optional[str] = None
    selling_price: float
    cost_price: Optional[float] = None
    min_order_quantity: int = 1
    max_order_quantity: Optional[int] = None
    lead_time_days: int = 1
    delivery_zones: List[str] = []
    custom_attributes: dict = {}
    supplier_notes: Optional[str] = None


@router.get("/skus/search")
async def search_skus_with_sharing(
    search: Optional[str] = Query(None, description="搜尋SKU代碼、產品名稱"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=100, description="每頁數量"),
    is_active: Optional[bool] = Query(None, description="是否啟用"),
    sku_type: Optional[str] = Query(None, description="SKU類型: public, private, all"),
    supplier_id: Optional[str] = Query(None, description="供應商ID篩選"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    搜尋SKU - 支援共享機制篩選
    """
    try:
        # Build base query
        query = select(ProductSKU).options(selectinload(ProductSKU.product))
        
        # Apply filters
        if is_active is not None:
            query = query.where(ProductSKU.is_active == is_active)
        
        # SKU類型篩選 (暫時使用 mock 邏輯，因為還需要遷移資料庫)
        # TODO: 在完成資料庫遷移後，使用實際的 type 欄位
        
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    ProductSKU.sku_code.ilike(search_term),
                    ProductSKU.name.ilike(search_term)
                )
            )
        
        # Count total records
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        # Execute query
        result = await db.execute(query)
        skus = result.scalars().all()
        
        # Transform to frontend format with sharing info
        sku_data = []
        for i, sku in enumerate(skus):
            # Mock sharing data (40% 機率為共享型)
            is_shared = (hash(sku.id) % 10) < 4
            supplier_count = 3 if is_shared else 1
            
            sku_item = {
                "id": sku.id,
                "code": sku.sku_code,
                "name": sku.name,
                "nameEn": sku.name,
                "isActive": sku.is_active,
                "weight": sku.weight,
                "packageType": sku.package_type,
                "variant": sku.variant or {},
                # 新增共享機制相關欄位
                "type": "public" if is_shared else "private",
                "creatorType": "platform" if is_shared else "supplier",
                "approvalStatus": "approved",
                "supplierCount": supplier_count,
                "product": {
                    "id": sku.product.id if sku.product else None,
                    "name": sku.product.name if sku.product else "Unknown Product",
                    "code": sku.product.code if sku.product else None
                } if sku.product else None
            }
            sku_data.append(sku_item)
        
        # 根據 sku_type 篩選
        if sku_type and sku_type != "all":
            sku_data = [s for s in sku_data if s["type"] == sku_type]
        
        total_pages = (total + page_size - 1) // page_size
        
        return {
            "success": True,
            "data": sku_data,
            "total": len(sku_data),
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "meta": {
                "totalSKUs": len(sku_data),
                "publicSKUs": len([s for s in sku_data if s["type"] == "public"]),
                "privateSKUs": len([s for s in sku_data if s["type"] == "private"]),
                "activeSKUs": len([s for s in sku_data if s["isActive"]]),
                "page": page,
                "totalPages": total_pages
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search SKUs: {str(e)}"
        )


@router.post("/skus/{sku_id}/share")
async def convert_sku_to_shared(
    sku_id: str,
    request: SKUShareRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    將私有 SKU 轉換為共享 SKU
    需要審核流程
    """
    try:
        # 檢查 SKU 是否存在
        query = select(ProductSKU).where(ProductSKU.id == sku_id)
        result = await db.execute(query)
        sku = result.scalar_one_or_none()
        
        if not sku:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SKU not found"
            )
        
        # TODO: 實際的轉換邏輯
        # 1. 更新 SKU 類型為 public
        # 2. 記錄審核請求
        # 3. 發送審核通知
        
        return {
            "success": True,
            "message": "SKU sharing request submitted for approval",
            "data": {
                "sku_id": sku_id,
                "status": "pending_approval",
                "request_id": f"SHARE-{sku_id[:8]}"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to convert SKU to shared: {str(e)}"
        )


@router.post("/skus/{sku_id}/participate")
async def participate_in_shared_sku(
    sku_id: str,
    request: SKUParticipationRequest,
    supplier_id: str = Query(..., description="供應商ID"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    供應商參與銷售共享 SKU
    """
    try:
        # 檢查 SKU 是否存在且為共享型
        query = select(ProductSKU).where(ProductSKU.id == sku_id)
        result = await db.execute(query)
        sku = result.scalar_one_or_none()
        
        if not sku:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SKU not found"
            )
        
        # TODO: 實際的參與邏輯
        # 1. 檢查 SKU 是否為 public 類型
        # 2. 檢查供應商是否已參與
        # 3. 創建 supplier_sku_participations 記錄
        
        return {
            "success": True,
            "message": "Successfully joined shared SKU",
            "data": {
                "sku_id": sku_id,
                "supplier_id": supplier_id,
                "participation_id": f"PART-{sku_id[:8]}-{supplier_id[:8]}",
                "selling_price": request.selling_price,
                "status": "active"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to participate in shared SKU: {str(e)}"
        )


@router.get("/skus/{sku_id}/suppliers")
async def get_sku_suppliers(
    sku_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取 SKU 的所有供應商資訊
    用於供應商比較功能
    """
    try:
        # 檢查 SKU 是否存在
        query = select(ProductSKU).where(ProductSKU.id == sku_id)
        result = await db.execute(query)
        sku = result.scalar_one_or_none()
        
        if not sku:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SKU not found"
            )
        
        # TODO: 查詢實際的供應商資料
        # 現在返回 mock 資料
        mock_suppliers = [
            {
                "supplier_id": "supplier-1",
                "supplier_name": "綠野農場",
                "selling_price": 120.50,
                "min_order_quantity": 5,
                "lead_time_days": 2,
                "rating": 4.8,
                "certifications": ["有機認證", "HACCP"],
                "delivery_zones": ["台北", "新北", "桃園"],
                "is_preferred": True
            },
            {
                "supplier_id": "supplier-2", 
                "supplier_name": "有機生活",
                "selling_price": 115.00,
                "min_order_quantity": 10,
                "lead_time_days": 1,
                "rating": 4.6,
                "certifications": ["有機認證"],
                "delivery_zones": ["台北", "新北"],
                "is_preferred": False
            }
        ]
        
        return {
            "success": True,
            "data": {
                "sku_id": sku_id,
                "sku_name": sku.name,
                "sku_type": "public",  # Mock 資料
                "supplier_count": len(mock_suppliers),
                "suppliers": mock_suppliers,
                "price_range": {
                    "min": min(s["selling_price"] for s in mock_suppliers),
                    "max": max(s["selling_price"] for s in mock_suppliers),
                    "avg": sum(s["selling_price"] for s in mock_suppliers) / len(mock_suppliers)
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get SKU suppliers: {str(e)}"
        )


@router.get("/skus/sharing/stats")
async def get_sharing_stats(
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取 SKU 共享統計資訊
    """
    try:
        # 獲取總 SKU 數量
        total_query = select(func.count()).select_from(ProductSKU)
        total_result = await db.execute(total_query)
        total_skus = total_result.scalar()
        
        # Mock 統計資料
        public_skus = int(total_skus * 0.4)  # 40% 為共享型
        private_skus = total_skus - public_skus
        
        return {
            "success": True,
            "data": {
                "total_skus": total_skus,
                "public_skus": public_skus,
                "private_skus": private_skus,
                "shared_percentage": round((public_skus / total_skus * 100), 1) if total_skus > 0 else 0,
                "pending_approvals": 3,  # Mock 資料
                "total_participations": 28,  # Mock 資料
                "avg_suppliers_per_public_sku": 2.3  # Mock 資料
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sharing stats: {str(e)}"
        )