from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.models.order import Order, OrderItem


router = APIRouter()


@router.get("/health")
async def health(db: AsyncSession = Depends(get_async_session)):
    try:
        await db.execute(select(1))
        return {"status": "healthy", "service": "order-service-fastapi", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DB error: {e}")


@router.get("/orders")
async def list_orders(limit: int = 50, db: AsyncSession = Depends(get_async_session)):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))  # Eager load order items to prevent N+1 queries
        .order_by(desc(Order.created_at))
        .limit(limit)
    )
    orders = result.scalars().all()
    return {"success": True, "data": orders, "count": len(orders)}


@router.get("/orders/{order_id}")
async def get_order(order_id: str, db: AsyncSession = Depends(get_async_session)):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))  # Eager load order items
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"success": True, "data": order}


@router.post("/orders", status_code=201)
async def create_order(payload: dict, db: AsyncSession = Depends(get_async_session)):
    required = ["restaurantId", "supplierId", "items"]
    if any(k not in payload for k in required) or not isinstance(payload.get("items"), list) or len(payload.get("items")) == 0:
        raise HTTPException(status_code=400, detail="Missing required fields: restaurantId, supplierId, items")

    order_number = f"ORD-{int(datetime.utcnow().timestamp() * 1000)}"
    items = payload["items"]
    subtotal = sum(float(i.get("quantity", 0)) * float(i.get("unitPrice", 0)) for i in items)
    tax_amount = round(subtotal * 0.1, 2)
    total_amount = subtotal + tax_amount

    order = Order(
        order_number=order_number,
        restaurant_id=payload["restaurantId"],
        supplier_id=payload["supplierId"],
        status="draft",
        subtotal=subtotal,
        tax_amount=tax_amount,
        total_amount=total_amount,
        delivery_date=datetime.fromisoformat(payload.get("deliveryDate")) if payload.get("deliveryDate") else datetime.utcnow().date(),
        delivery_address=payload.get("deliveryAddress") or {},
        notes=payload.get("notes"),
        created_by=payload.get("createdBy") or "system",
    )
    db.add(order)
    await db.flush()

    for i in items:
        db.add(OrderItem(
            order_id=str(order.id),
            product_id=i["productId"],
            product_code=i.get("productCode", "UNKNOWN"),
            product_name=i["productName"],
            quantity=float(i["quantity"]),
            unit_price=float(i["unitPrice"]),
            line_total=float(i["quantity"]) * float(i["unitPrice"]),
            notes=i.get("notes"),
        ))
    await db.commit()
    await db.refresh(order)
    return {"success": True, "data": order}


@router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, payload: dict, db: AsyncSession = Depends(get_async_session)):
    status_value: Optional[str] = payload.get("status")
    if not status_value:
        raise HTTPException(status_code=400, detail="Status is required")
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status_value
    await db.commit()
    await db.refresh(order)
    return {"success": True, "data": order}

