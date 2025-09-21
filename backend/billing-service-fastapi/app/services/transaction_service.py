"""
Transaction tracking service for billing logic
"""

from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, func
from datetime import datetime
from decimal import Decimal

from app.models.billing_transaction import BillingTransaction


class TransactionService:
    """Service for managing billing transactions"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_transaction(self, transaction_data: Dict[str, Any]) -> BillingTransaction:
        """Create a new billing transaction"""
        transaction = BillingTransaction(**transaction_data)
        self.db.add(transaction)
        await self.db.commit()
        await self.db.refresh(transaction)
        return transaction
    
    async def get_supplier_transactions(
        self, 
        supplier_id: str, 
        offset: int = 0, 
        limit: int = 50
    ) -> Tuple[List[BillingTransaction], int]:
        """Get transactions for a supplier"""
        query = select(BillingTransaction).where(BillingTransaction.supplier_id == supplier_id)
        count_query = select(func.count(BillingTransaction.id)).where(BillingTransaction.supplier_id == supplier_id)
        
        query = query.order_by(desc(BillingTransaction.transaction_date))
        query = query.offset(offset).limit(limit)
        
        result = await self.db.execute(query)
        transactions = result.scalars().all()
        
        count_result = await self.db.execute(count_query)
        total = count_result.scalar()
        
        return transactions, total
    
    # Additional methods will be implemented as needed