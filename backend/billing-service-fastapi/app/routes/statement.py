"""
Billing Statements API endpoints
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session

router = APIRouter(prefix="/api/billing/statements", tags=["Billing Statements"])


@router.get("/supplier/{supplier_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def get_supplier_statements():
    """Get supplier statements (Implementation pending)"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Supplier statements endpoint not yet implemented"
    )


@router.post("/generate/{supplier_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def generate_monthly_statement():
    """Generate monthly statement (Implementation pending)"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Statement generation endpoint not yet implemented"
    )


@router.get("/{statement_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def get_statement_details():
    """Get statement details (Implementation pending)"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Statement details endpoint not yet implemented"
    )


@router.post("/{statement_id}/send", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def send_statement_to_supplier():
    """Send statement to supplier (Implementation pending)"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Statement sending endpoint not yet implemented"
    )