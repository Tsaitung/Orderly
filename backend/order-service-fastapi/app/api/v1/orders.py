"""
Order API Endpoints
訂單 API 端點
"""
from datetime import date
from typing import Optional, List
from dataclasses import dataclass
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.database import get_async_session
from app.models.enums import OrderStatus
from app.schemas.order import (
    OrderCreate, OrderUpdate, OrderResponse, OrderListResponse,
    OrderStatusUpdate, OrderConfirmRequest, OrderAdjustmentCreate,
    OrderAdjustmentResponse, OrderStatsResponse, OrderStatusHistoryResponse
)
from app.schemas.order_item import OrderItemCreate, OrderItemUpdate, OrderItemResponse
from app.services.order_service import OrderService
from app.services.order_state_machine import OrderStateMachine

logger = structlog.get_logger()
router = APIRouter()


# ==================== 依賴注入 ====================

@dataclass
class RequestContext:
    """請求上下文，包含租戶、用戶資訊"""
    tenant_id: str
    user_id: str
    role: Optional[str] = None


def get_tenant_id(
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-Id"),
    x_org_id: Optional[str] = Header(None, alias="X-Org-Id"),
) -> str:
    """從請求標頭取得租戶 ID（必填）"""
    tenant_id = x_tenant_id or x_org_id
    if not tenant_id:
        raise HTTPException(status_code=401, detail="缺少租戶 ID")
    return tenant_id


def get_user_id(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_id_upper: Optional[str] = Header(None, alias="X-User-ID"),
) -> str:
    """從請求標頭取得用戶 ID（預設為 system）"""
    return x_user_id or x_user_id_upper or "system"


def get_user_role(
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
) -> Optional[str]:
    """從請求標頭取得用戶角色"""
    return x_user_role


def get_request_context(
    tenant_id: str = Depends(get_tenant_id),
    user_id: str = Depends(get_user_id),
    role: Optional[str] = Depends(get_user_role),
) -> RequestContext:
    """取得完整請求上下文"""
    return RequestContext(tenant_id=tenant_id, user_id=user_id, role=role)


# ==================== 健康檢查 ====================

@router.get("/health")
async def health(db: AsyncSession = Depends(get_async_session)):
    """健康檢查"""
    from sqlalchemy import select
    try:
        await db.execute(select(1))
        return {"status": "healthy", "service": "order-service-fastapi", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DB error: {e}")


# ==================== 訂單 CRUD ====================

@router.get("/orders", response_model=OrderListResponse)
async def list_orders(
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=100, description="每頁數量"),
    status: Optional[OrderStatus] = Query(None, description="狀態過濾"),
    supplier_id: Optional[str] = Query(None, description="供應商 ID"),
    restaurant_id: Optional[str] = Query(None, description="餐廳 ID"),
    date_from: Optional[date] = Query(None, description="開始日期"),
    date_to: Optional[date] = Query(None, description="結束日期"),
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_async_session),
):
    """
    獲取訂單列表

    支援分頁和多種過濾條件
    """
    orders, total = await OrderService.list_orders(
        db=db,
        tenant_id=tenant_id,
        page=page,
        page_size=page_size,
        status=status,
        supplier_id=supplier_id,
        restaurant_id=restaurant_id,
        date_from=date_from,
        date_to=date_to,
    )

    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0

    return OrderListResponse(
        success=True,
        data=[OrderResponse.model_validate(order) for order in orders],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/orders/stats", response_model=OrderStatsResponse)
async def get_order_stats(
    date_from: Optional[date] = Query(None, description="開始日期"),
    date_to: Optional[date] = Query(None, description="結束日期"),
    supplier_id: Optional[str] = Query(None, description="供應商 ID"),
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_async_session),
):
    """獲取訂單統計"""
    stats = await OrderService.get_order_stats(
        db=db,
        tenant_id=tenant_id,
        date_from=date_from,
        date_to=date_to,
        supplier_id=supplier_id,
    )

    return OrderStatsResponse(**stats)


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_async_session),
):
    """獲取單一訂單詳情"""
    order = await OrderService.get_order_by_id(db, order_id, tenant_id)
    if not order:
        raise HTTPException(status_code=404, detail=f"訂單 ID '{order_id}' 不存在")

    return OrderResponse.model_validate(order)


@router.post("/orders", response_model=OrderResponse, status_code=201)
async def create_order(
    order_data: OrderCreate,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """
    創建新訂單

    訂單創建後狀態為 draft（草稿）
    """
    order = await OrderService.create_order(
        db=db,
        order_data=order_data,
        tenant_id=ctx.tenant_id,
        user_id=ctx.user_id,
    )

    return OrderResponse.model_validate(order)


@router.put("/orders/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: str,
    order_data: OrderUpdate,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """
    更新訂單

    只有草稿狀態的訂單可以修改
    """
    order = await OrderService.update_order(
        db=db,
        order_id=order_id,
        tenant_id=ctx.tenant_id,
        order_data=order_data,
        user_id=ctx.user_id,
    )

    return OrderResponse.model_validate(order)


@router.delete("/orders/{order_id}")
async def cancel_order(
    order_id: str,
    reason: str = Query(..., description="取消原因"),
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """
    取消訂單

    需要提供取消原因，已完成或已取消的訂單不可取消
    """

    order = await OrderService.cancel_order(
        db=db,
        order_id=order_id,
        tenant_id=ctx.tenant_id,
        reason=reason,
        user_id=ctx.user_id,
    )

    return {
        "success": True,
        "message": "訂單已取消",
        "data": OrderResponse.model_validate(order),
    }


# ==================== 狀態流轉 ====================

@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: str,
    status_data: OrderStatusUpdate,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """
    更新訂單狀態

    狀態轉換需符合狀態機規則
    """
    order = await OrderService.update_order_status(
        db=db,
        order_id=order_id,
        tenant_id=ctx.tenant_id,
        status_data=status_data,
        user_id=ctx.user_id,
        role=ctx.role,
    )

    return OrderResponse.model_validate(order)


@router.put("/orders/{order_id}/submit", response_model=OrderResponse)
async def submit_order(
    order_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """
    提交訂單

    將訂單從草稿狀態提交給供應商
    """
    status_data = OrderStatusUpdate(status=OrderStatus.SUBMITTED, reason="餐廳提交訂單")
    order = await OrderService.update_order_status(
        db=db,
        order_id=order_id,
        tenant_id=ctx.tenant_id,
        status_data=status_data,
        user_id=ctx.user_id,
        role="restaurant",
    )

    return OrderResponse.model_validate(order)


@router.put("/orders/{order_id}/confirm", response_model=OrderResponse)
async def confirm_order(
    order_id: str,
    confirm_data: OrderConfirmRequest,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """
    供應商確認訂單

    可以調整確認數量和時價商品價格
    """
    order = await OrderService.confirm_order(
        db=db,
        order_id=order_id,
        tenant_id=ctx.tenant_id,
        confirm_data=confirm_data,
        user_id=ctx.user_id,
    )

    return OrderResponse.model_validate(order)


@router.put("/orders/{order_id}/prepare", response_model=OrderResponse)
async def start_preparing(
    order_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """開始備貨"""
    status_data = OrderStatusUpdate(status=OrderStatus.PREPARING, reason="開始備貨")
    order = await OrderService.update_order_status(
        db=db,
        order_id=order_id,
        tenant_id=ctx.tenant_id,
        status_data=status_data,
        user_id=ctx.user_id,
        role="supplier",
    )

    return OrderResponse.model_validate(order)


@router.put("/orders/{order_id}/ship", response_model=OrderResponse)
async def ship_order(
    order_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """標記出貨"""
    status_data = OrderStatusUpdate(status=OrderStatus.SHIPPED, reason="已出貨")
    order = await OrderService.update_order_status(
        db=db,
        order_id=order_id,
        tenant_id=ctx.tenant_id,
        status_data=status_data,
        user_id=ctx.user_id,
        role="supplier",
    )

    return OrderResponse.model_validate(order)


@router.put("/orders/{order_id}/deliver", response_model=OrderResponse)
async def deliver_order(
    order_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """標記送達"""
    status_data = OrderStatusUpdate(status=OrderStatus.DELIVERED, reason="已送達")
    order = await OrderService.update_order_status(
        db=db,
        order_id=order_id,
        tenant_id=ctx.tenant_id,
        status_data=status_data,
        user_id=ctx.user_id,
        role="supplier",
    )

    return OrderResponse.model_validate(order)


@router.put("/orders/{order_id}/accept", response_model=OrderResponse)
async def accept_order(
    order_id: str,
    notes: Optional[str] = Query(None, description="驗收備註"),
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """驗收確認"""
    status_data = OrderStatusUpdate(status=OrderStatus.ACCEPTED, reason="驗收通過", notes=notes)
    order = await OrderService.update_order_status(
        db=db,
        order_id=order_id,
        tenant_id=ctx.tenant_id,
        status_data=status_data,
        user_id=ctx.user_id,
        role="restaurant",
    )

    return OrderResponse.model_validate(order)


@router.put("/orders/{order_id}/complete", response_model=OrderResponse)
async def complete_order(
    order_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """標記完成"""
    status_data = OrderStatusUpdate(status=OrderStatus.COMPLETED, reason="訂單完成")
    order = await OrderService.update_order_status(
        db=db,
        order_id=order_id,
        tenant_id=ctx.tenant_id,
        status_data=status_data,
        user_id=ctx.user_id,
        role="admin",
    )

    return OrderResponse.model_validate(order)


# ==================== 訂單歷史 ====================

@router.get("/orders/{order_id}/history", response_model=List[OrderStatusHistoryResponse])
async def get_order_history(
    order_id: str,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_async_session),
):
    """獲取訂單狀態歷史"""
    history = await OrderService.get_order_history(db, order_id, tenant_id)
    return [OrderStatusHistoryResponse.model_validate(h) for h in history]


# ==================== 訂單項目 ====================

@router.post("/orders/{order_id}/items", response_model=OrderResponse)
async def add_order_item(
    order_id: str,
    item_data: OrderItemCreate,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """添加訂單項目"""
    order = await OrderService.add_order_item(
        db=db,
        order_id=order_id,
        tenant_id=ctx.tenant_id,
        item_data=item_data,
        user_id=ctx.user_id,
    )

    return OrderResponse.model_validate(order)


@router.put("/orders/{order_id}/items/{item_id}", response_model=OrderResponse)
async def update_order_item(
    order_id: str,
    item_id: str,
    item_data: OrderItemUpdate,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """更新訂單項目"""
    order = await OrderService.update_order_item(
        db=db,
        order_id=order_id,
        item_id=item_id,
        tenant_id=ctx.tenant_id,
        item_data=item_data,
        user_id=ctx.user_id,
    )

    return OrderResponse.model_validate(order)


@router.delete("/orders/{order_id}/items/{item_id}", response_model=OrderResponse)
async def delete_order_item(
    order_id: str,
    item_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """刪除訂單項目"""
    order = await OrderService.delete_order_item(
        db=db,
        order_id=order_id,
        item_id=item_id,
        tenant_id=ctx.tenant_id,
        user_id=ctx.user_id,
    )

    return OrderResponse.model_validate(order)


# ==================== 狀態機資訊 ====================

@router.get("/orders/{order_id}/next-statuses")
async def get_next_statuses(
    order_id: str,
    tenant_id: str = Depends(get_tenant_id),
    role: Optional[str] = Depends(get_user_role),
    db: AsyncSession = Depends(get_async_session),
):
    """獲取訂單可轉換的下一個狀態"""
    order = await OrderService.get_order_by_id(db, order_id, tenant_id)
    if not order:
        raise HTTPException(status_code=404, detail=f"訂單 ID '{order_id}' 不存在")

    next_statuses = OrderStateMachine.get_next_valid_statuses(order.status, role)

    return {
        "success": True,
        "currentStatus": order.status.value,
        "currentStatusDisplay": OrderStateMachine.get_status_display(order.status),
        "nextStatuses": [
            {
                "status": s.value,
                "display": OrderStateMachine.get_status_display(s)
            }
            for s in next_statuses
        ],
        "isTerminal": OrderStateMachine.is_terminal_status(order.status),
        "isCancellable": OrderStateMachine.is_cancellable(order.status),
    }


# ==================== 批量操作 ====================

@router.post("/orders/bulk-status")
async def bulk_update_status(
    order_ids: List[str] = Query(..., description="訂單 ID 列表"),
    status: OrderStatus = Query(..., description="目標狀態"),
    reason: Optional[str] = Query(None, description="變更原因"),
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_async_session),
):
    """批量更新訂單狀態"""
    if len(order_ids) > 100:
        raise HTTPException(status_code=400, detail="批量操作最多支援 100 筆訂單")

    results = {"success": [], "failed": []}

    for order_id in order_ids:
        try:
            status_data = OrderStatusUpdate(status=status, reason=reason)
            await OrderService.update_order_status(
                db=db,
                order_id=order_id,
                tenant_id=ctx.tenant_id,
                status_data=status_data,
                user_id=ctx.user_id,
                role=ctx.role,
            )
            results["success"].append(order_id)
        except HTTPException as e:
            results["failed"].append({"orderId": order_id, "error": e.detail})
        except Exception as e:
            results["failed"].append({"orderId": order_id, "error": str(e)})

    return {
        "success": True,
        "message": f"成功 {len(results['success'])} 筆，失敗 {len(results['failed'])} 筆",
        "results": results,
    }
