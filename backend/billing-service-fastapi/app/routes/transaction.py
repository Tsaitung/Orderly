"""
Transaction Tracking API endpoints
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.services.transaction_service import TransactionService
from app.schemas.transaction import (
    BillingTransactionCreate, BillingTransactionUpdate, TransactionRefundRequest,
    BillingTransactionResponse, BillingTransactionListResponse, BillingTransactionSingleResponse
)
from app.schemas.base import PaginationParams, ErrorResponse

router = APIRouter(prefix="/api/billing/transactions", tags=["Transaction Tracking"])


@router.post("/", response_model=BillingTransactionSingleResponse, status_code=status.HTTP_201_CREATED)
async def record_transaction(
    transaction_data: BillingTransactionCreate,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Record new transaction
    
    Creates a new billing transaction record for commission tracking.
    """
    try:
        service = TransactionService(db)
        
        # Convert Pydantic model to dict for service layer
        transaction_dict = transaction_data.dict()
        
        transaction = await service.create_transaction(transaction_dict)
        
        return BillingTransactionSingleResponse(
            success=True,
            message="Transaction recorded successfully",
            data=BillingTransactionResponse.from_orm(transaction)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to record transaction: {str(e)}"
        )


@router.get("/supplier/{supplier_id}", response_model=BillingTransactionListResponse)
async def get_supplier_transactions(
    supplier_id: str,
    status_filter: Optional[str] = Query(None, pattern="^(pending|confirmed|cancelled|refunded)$"),
    billing_period: Optional[str] = Query(None, pattern="^\\d{4}-\\d{2}$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get supplier transactions
    
    Returns billing transactions for the specified supplier with optional filtering.
    """
    try:
        service = TransactionService(db)
        
        pagination = PaginationParams(page=page, page_size=page_size)
        
        transactions, total = await service.get_supplier_transactions(
            supplier_id=supplier_id,
            offset=pagination.offset,
            limit=pagination.limit
        )
        
        # Apply additional filters (simplified implementation)
        if status_filter:
            transactions = [t for t in transactions if t.status == status_filter]
            total = len(transactions)
        
        if billing_period:
            transactions = [t for t in transactions if t.billing_period == billing_period]
            total = len(transactions)
        
        return BillingTransactionListResponse(
            success=True,
            data=[BillingTransactionResponse.from_orm(transaction) for transaction in transactions],
            total=total,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve supplier transactions: {str(e)}"
        )


@router.get("/{transaction_id}", response_model=BillingTransactionSingleResponse)
async def get_transaction_details(
    transaction_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get transaction details
    
    Returns detailed information about a specific transaction.
    """
    # Placeholder implementation
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Transaction details endpoint not yet implemented"
    )


@router.post("/{transaction_id}/refund", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def process_transaction_refund():
    """
    Process transaction refund
    
    Processes a refund for the specified transaction. (Implementation pending)
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Transaction refund endpoint not yet implemented"
    )


@router.put("/{transaction_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def update_transaction():
    """
    Update transaction
    
    Updates transaction information such as status, scores, or adjustments. (Implementation pending)
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Transaction update endpoint not yet implemented"
    )


@router.get("/", response_model=BillingTransactionListResponse)
async def list_transactions(
    supplier_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, pattern="^(pending|confirmed|cancelled|refunded)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_async_session)
):
    """
    List transactions
    
    Returns transactions with optional filtering. Use supplier-specific endpoint for better performance.
    """
    if supplier_id:
        # Redirect to supplier-specific endpoint
        return await get_supplier_transactions(
            supplier_id=supplier_id,
            status_filter=status_filter,
            page=page,
            page_size=page_size,
            db=db
        )
    
    # General listing (simplified implementation)
    return BillingTransactionListResponse(
        success=True,
        data=[],
        total=0,
        page=page,
        page_size=page_size
    )