"""
Supplier management API endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.services.supplier_service import SupplierService
from app.schemas.supplier import (
    SupplierCard, SupplierDetail, SupplierStats, SupplierListResponse,
    SupplierFilterRequest, SupplierUpdateRequest, SupplierStatusEnum,
    DeliveryCapacityEnum
)

router = APIRouter()


@router.get("/suppliers/stats", response_model=SupplierStats)
async def get_supplier_stats(
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get overall supplier statistics and metrics
    """
    try:
        stats = await SupplierService.get_supplier_stats(db)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get supplier stats: {str(e)}"
        )


@router.get("/suppliers", response_model=SupplierListResponse)
async def list_suppliers(
    # Search and filtering
    search: Optional[str] = Query(None, description="搜尋供應商名稱、聯絡人或Email"),
    status_filter: Optional[SupplierStatusEnum] = Query(None, alias="status", description="按狀態篩選"),
    delivery_capacity: Optional[DeliveryCapacityEnum] = Query(None, description="按配送能力篩選"),
    min_order_amount: Optional[float] = Query(None, description="最小訂購金額下限"),
    max_order_amount: Optional[float] = Query(None, description="最小訂購金額上限"),
    activity_level: Optional[str] = Query(None, description="活躍程度: high, moderate, low"),
    
    # Pagination and sorting
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=100, description="每頁數量"),
    sort_by: Optional[str] = Query("created_at", description="排序欄位"),
    sort_order: Optional[str] = Query("desc", description="排序方向: asc, desc"),
    
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get paginated list of suppliers with filtering and sorting
    """
    try:
        # Build filter request
        filters = SupplierFilterRequest(
            search=search,
            status=status_filter,
            delivery_capacity=delivery_capacity,
            min_order_amount=min_order_amount,
            max_order_amount=max_order_amount,
            activity_level=activity_level,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        # Get suppliers and total count
        suppliers, total = await SupplierService.list_suppliers(db, filters)
        
        # Get overall stats
        stats = await SupplierService.get_supplier_stats(db)
        
        # Calculate pagination info
        total_pages = (total + page_size - 1) // page_size
        
        return SupplierListResponse(
            suppliers=suppliers,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            stats=stats
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list suppliers: {str(e)}"
        )


@router.get("/suppliers/{supplier_id}", response_model=SupplierDetail)
async def get_supplier_detail(
    supplier_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get detailed information for a specific supplier
    """
    try:
        supplier = await SupplierService.get_supplier_detail(db, supplier_id)
        
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found"
            )
        
        return supplier
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get supplier detail: {str(e)}"
        )


@router.patch("/suppliers/{supplier_id}", response_model=SupplierDetail)
async def update_supplier_status(
    supplier_id: str,
    update_data: SupplierUpdateRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Update supplier status and verification information
    """
    try:
        # For now, use a default "admin" user - would get from JWT token
        updated_by = "admin"
        
        supplier = await SupplierService.update_supplier_status(
            db, supplier_id, update_data, updated_by
        )
        
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found"
            )
        
        return supplier
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update supplier: {str(e)}"
        )


@router.get("/suppliers/{supplier_id}/activity")
async def get_supplier_activity(
    supplier_id: str,
    days: int = Query(30, ge=1, le=365, description="查詢天數"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get supplier activity history and metrics
    """
    try:
        # This would query actual activity data from orders/logs
        # For now, return mock activity data
        
        from datetime import datetime, timedelta
        import random
        
        # Generate mock activity data
        activity_data = {
            "supplier_id": supplier_id,
            "period_days": days,
            "total_orders": random.randint(50, 200),
            "completed_orders": random.randint(45, 190),
            "cancelled_orders": random.randint(0, 10),
            "avg_response_time_hours": round(random.uniform(0.5, 4.0), 1),
            "fulfillment_rate": round(random.uniform(92.0, 99.0), 1),
            "quality_incidents": random.randint(0, 3),
            "last_login": datetime.now() - timedelta(days=random.randint(1, 7)),
            "activity_trend": "increasing" if random.random() > 0.5 else "stable",
            "peak_hours": ["09:00-11:00", "14:00-16:00"],
            "busiest_days": ["Tuesday", "Thursday", "Friday"]
        }
        
        return {
            "success": True,
            "data": activity_data
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get supplier activity: {str(e)}"
        )


# Health check endpoint for suppliers module
@router.get("/suppliers/health")
async def suppliers_health():
    """Health check for suppliers API"""
    return {
        "status": "healthy",
        "service": "suppliers-api",
        "timestamp": datetime.now().isoformat()
    }