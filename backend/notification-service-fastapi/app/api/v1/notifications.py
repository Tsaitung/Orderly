from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_async_session
import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..', 'libs')))
from orderly_fastapi_core.pagination import pagination_params, Pagination
from app.models.notification import Notification


router = APIRouter()


@router.get("/health")
async def health(db: AsyncSession = Depends(get_async_session)):
    await db.execute(select(1))
    return {"status": "healthy", "service": "notification-service-fastapi"}


@router.get("/notifications")
async def list_notifications(p: Pagination = Depends(pagination_params), db: AsyncSession = Depends(get_async_session)):
    res = await db.execute(
        select(Notification)
        .order_by(desc(Notification.created_at))
        .offset(p["offset"]).limit(p["limit"]) 
    )
    items = res.scalars().all()
    return {"success": True, "data": items, "count": len(items), "page": p["page"], "page_size": p["page_size"]}


@router.post("/notifications", status_code=201)
async def create_notification(payload: dict, db: AsyncSession = Depends(get_async_session)):
    required = ["userId", "title", "message", "type"]
    if any(k not in payload for k in required):
        raise HTTPException(status_code=400, detail="Missing required fields")
    notif = Notification(
        user_id=payload["userId"],
        type=payload["type"],
        title=payload["title"],
        message=payload["message"],
        data=payload.get("data") or {},
        priority=payload.get("priority", "medium"),
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return {"success": True, "data": notif}


@router.patch("/notifications/{notification_id}/read")
async def mark_read(notification_id: str, db: AsyncSession = Depends(get_async_session)):
    res = await db.execute(select(Notification).where(Notification.id == notification_id))
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.read = True
    notif.read_at = datetime.utcnow()
    await db.commit()
    await db.refresh(notif)
    return {"success": True, "data": notif}
