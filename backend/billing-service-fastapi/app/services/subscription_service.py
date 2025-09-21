"""
Subscription management service for billing logic
"""

from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, func
from datetime import datetime, timedelta
from decimal import Decimal

from app.models.subscription_plan import SubscriptionPlan
from app.models.supplier_subscription import SupplierSubscription


class SubscriptionService:
    """Service for managing subscription plans and supplier subscriptions"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_subscription_plans(self, is_active: Optional[bool] = None, is_public: Optional[bool] = None) -> List[SubscriptionPlan]:
        """Get subscription plans"""
        query = select(SubscriptionPlan)
        
        conditions = []
        if is_active is not None:
            conditions.append(SubscriptionPlan.is_active == is_active)
        if is_public is not None:
            conditions.append(SubscriptionPlan.is_public == is_public)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(SubscriptionPlan.tier_level, SubscriptionPlan.display_order)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_supplier_subscription(self, supplier_id: str) -> Optional[SupplierSubscription]:
        """Get active supplier subscription"""
        query = select(SupplierSubscription).where(
            and_(
                SupplierSubscription.supplier_id == supplier_id,
                SupplierSubscription.status == "active"
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    # Additional methods will be implemented as needed