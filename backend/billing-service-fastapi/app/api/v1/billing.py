from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_async_session
from app.models.invoice import Invoice


router = APIRouter()


@router.get("/health")
async def health(db: AsyncSession = Depends(get_async_session)):
    await db.execute(select(1))
    return {"status": "healthy", "service": "billing-service-fastapi"}


@router.get("/invoices")
async def list_invoices(limit: int = 50, db: AsyncSession = Depends(get_async_session)):
    res = await db.execute(select(Invoice).order_by(desc(Invoice.created_at)).limit(limit))
    items = res.scalars().all()
    return {"success": True, "data": items, "count": len(items)}


@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, db: AsyncSession = Depends(get_async_session)):
    res = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    inv = res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"success": True, "data": inv}


@router.post("/invoices", status_code=201)
async def create_invoice(payload: dict, db: AsyncSession = Depends(get_async_session)):
    required = ["organizationId", "totalAmount"]
    if any(k not in payload for k in required):
        raise HTTPException(status_code=400, detail="Missing required fields")
    invoice_number = f"INV-{int(datetime.utcnow().timestamp()*1000)}"
    inv = Invoice(
        invoice_number=invoice_number,
        organization_id=payload["organizationId"],
        order_id=payload.get("orderId"),
        status=payload.get("status", "draft"),
        subtotal=payload.get("subtotal", 0),
        tax_amount=payload.get("taxAmount", 0),
        total_amount=payload.get("totalAmount", 0),
        metadata=payload.get("metadata") or {},
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    return {"success": True, "data": inv}


@router.patch("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, payload: dict, db: AsyncSession = Depends(get_async_session)):
    res = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    inv = res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    status_val: Optional[str] = payload.get("status")
    if not status_val:
        raise HTTPException(status_code=400, detail="Status is required")
    inv.status = status_val
    await db.commit()
    await db.refresh(inv)
    return {"success": True, "data": inv}
