from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_async_session
import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..', 'libs')))
from orderly_fastapi_core.pagination import pagination_params, Pagination
from app.models.acceptance import Acceptance, AcceptanceItem


router = APIRouter()


@router.get("/acceptance/health")
async def health(db: AsyncSession = Depends(get_async_session)):
    await db.execute(select(1))
    return {"status": "healthy", "service": "acceptance-service-fastapi"}


@router.get("/acceptance")
async def list_acceptances(p: Pagination = Depends(pagination_params), db: AsyncSession = Depends(get_async_session)):
    res = await db.execute(
        select(Acceptance)
        .order_by(desc(Acceptance.created_at))
        .offset(p["offset"]).limit(p["limit"]) 
    )
    items = res.scalars().all()
    return {"success": True, "data": items, "count": len(items), "page": p["page"], "page_size": p["page_size"]}


@router.get("/acceptance/{acceptance_id}")
async def get_acceptance(acceptance_id: str, db: AsyncSession = Depends(get_async_session)):
    res = await db.execute(select(Acceptance).where(Acceptance.id == acceptance_id))
    ac = res.scalar_one_or_none()
    if not ac:
        raise HTTPException(status_code=404, detail="Acceptance not found")
    return {"success": True, "data": ac}


@router.post("/acceptance", status_code=201)
async def create_acceptance(payload: dict, db: AsyncSession = Depends(get_async_session)):
    required = ["orderId", "restaurantId", "supplierId", "items"]
    if any(k not in payload for k in required):
        raise HTTPException(status_code=400, detail="Missing required fields")
    ac = Acceptance(
        order_id=payload["orderId"],
        restaurant_id=payload["restaurantId"],
        supplier_id=payload["supplierId"],
        status="pending",
        accepted_date=date.today(),
        notes=payload.get("notes"),
        discrepancies=payload.get("discrepancies") or [],
    )
    db.add(ac)
    await db.flush()
    for i in payload["items"]:
        db.add(AcceptanceItem(
            acceptance_id=str(ac.id),
            product_code=i.get("productCode", "UNKNOWN"),
            product_name=i["productName"],
            delivered_qty=str(i.get("deliveredQty", 0)),
            accepted_qty=str(i.get("acceptedQty", 0)),
            unit=i.get("unit"),
            reason=i.get("reason"),
        ))
    await db.commit()
    await db.refresh(ac)
    return {"success": True, "data": ac}


@router.patch("/acceptance/{acceptance_id}/status")
async def update_acceptance_status(acceptance_id: str, payload: dict, db: AsyncSession = Depends(get_async_session)):
    status_val: Optional[str] = payload.get("status")
    if not status_val:
        raise HTTPException(status_code=400, detail="Status is required")
    res = await db.execute(select(Acceptance).where(Acceptance.id == acceptance_id))
    ac = res.scalar_one_or_none()
    if not ac:
        raise HTTPException(status_code=404, detail="Acceptance not found")
    ac.status = status_val
    await db.commit()
    await db.refresh(ac)
    return {"success": True, "data": ac}
