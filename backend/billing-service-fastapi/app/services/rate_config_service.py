"""
Rate configuration service for billing logic
"""

from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, func
from sqlalchemy.orm import selectinload
from datetime import datetime
from decimal import Decimal

from app.models.billing_rate_config import BillingRateConfig
from app.models.transaction_rate_tier import TransactionRateTier
from app.schemas.rate_config import (
    RateConfigCreate, RateConfigUpdate, RateConfigFilter,
    TransactionRateTierCreate, TransactionRateTierUpdate,
    RateCalculationRequest
)


class RateConfigService:
    """Service for managing billing rate configurations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_rate_config(self, config_data: RateConfigCreate) -> BillingRateConfig:
        """Create a new rate configuration"""
        config = BillingRateConfig(
            config_name=config_data.config_name,
            config_type=config_data.config_type,
            base_rate=config_data.base_rate,
            min_amount=config_data.min_amount,
            max_amount=config_data.max_amount,
            effective_from=config_data.effective_from,
            effective_to=config_data.effective_to,
            target_supplier_type=config_data.target_supplier_type,
            target_product_category=config_data.target_product_category,
            min_monthly_gmv=config_data.min_monthly_gmv,
            max_monthly_gmv=config_data.max_monthly_gmv,
            additional_config=config_data.additional_config,
            created_by=config_data.created_by,
            approval_status="draft"
        )
        
        self.db.add(config)
        await self.db.commit()
        await self.db.refresh(config)
        return config
    
    async def get_rate_configs(
        self, 
        filters: RateConfigFilter, 
        offset: int = 0, 
        limit: int = 50
    ) -> Tuple[List[BillingRateConfig], int]:
        """Get rate configurations with filtering"""
        query = select(BillingRateConfig)
        count_query = select(func.count(BillingRateConfig.id))
        
        # Apply filters
        conditions = []
        
        if filters.config_type:
            conditions.append(BillingRateConfig.config_type == filters.config_type)
        
        if filters.is_active is not None:
            conditions.append(BillingRateConfig.is_active == filters.is_active)
        
        if filters.target_supplier_type:
            conditions.append(BillingRateConfig.target_supplier_type == filters.target_supplier_type)
        
        if filters.approval_status:
            conditions.append(BillingRateConfig.approval_status == filters.approval_status)
        
        if filters.effective_from:
            conditions.append(BillingRateConfig.effective_from >= filters.effective_from)
        
        if filters.effective_to:
            conditions.append(
                or_(
                    BillingRateConfig.effective_to.is_(None),
                    BillingRateConfig.effective_to <= filters.effective_to
                )
            )
        
        if filters.search:
            conditions.append(
                or_(
                    BillingRateConfig.config_name.ilike(f"%{filters.search}%"),
                    BillingRateConfig.target_supplier_type.ilike(f"%{filters.search}%"),
                    BillingRateConfig.target_product_category.ilike(f"%{filters.search}%")
                )
            )
        
        if conditions:
            query = query.where(and_(*conditions))
            count_query = count_query.where(and_(*conditions))
        
        # Apply sorting
        if filters.sort_by:
            sort_column = getattr(BillingRateConfig, filters.sort_by, None)
            if sort_column:
                if filters.sort_order == "asc":
                    query = query.order_by(sort_column)
                else:
                    query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(desc(BillingRateConfig.created_at))
        
        # Execute queries
        query = query.offset(offset).limit(limit)
        result = await self.db.execute(query)
        configs = result.scalars().all()
        
        count_result = await self.db.execute(count_query)
        total = count_result.scalar()
        
        return configs, total
    
    async def get_rate_config_by_id(self, config_id: str) -> Optional[BillingRateConfig]:
        """Get rate configuration by ID"""
        query = select(BillingRateConfig).where(BillingRateConfig.id == config_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def update_rate_config(
        self, 
        config_id: str, 
        update_data: RateConfigUpdate
    ) -> Optional[BillingRateConfig]:
        """Update rate configuration"""
        config = await self.get_rate_config_by_id(config_id)
        if not config:
            return None
        
        # Update fields
        for field, value in update_data.dict(exclude_unset=True).items():
            if hasattr(config, field):
                setattr(config, field, value)
        
        config.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(config)
        return config
    
    async def activate_rate_config(
        self, 
        config_id: str, 
        approved_by: str, 
        approval_status: str = "approved"
    ) -> Optional[BillingRateConfig]:
        """Activate/approve rate configuration"""
        config = await self.get_rate_config_by_id(config_id)
        if not config:
            return None
        
        config.approval_status = approval_status
        config.approved_by = approved_by
        config.approved_at = datetime.utcnow()
        
        if approval_status == "approved":
            config.is_active = True
        
        await self.db.commit()
        await self.db.refresh(config)
        return config
    
    async def create_rate_tier(self, tier_data: TransactionRateTierCreate) -> TransactionRateTier:
        """Create a new transaction rate tier"""
        tier = TransactionRateTier(
            tier_name=tier_data.tier_name,
            min_monthly_gmv=tier_data.min_monthly_gmv,
            max_monthly_gmv=tier_data.max_monthly_gmv,
            commission_rate=tier_data.commission_rate,
            tier_level=tier_data.tier_level,
            is_active=tier_data.is_active,
            description=tier_data.description,
            benefits=tier_data.benefits,
            created_by=tier_data.created_by
        )
        
        self.db.add(tier)
        await self.db.commit()
        await self.db.refresh(tier)
        return tier
    
    async def get_rate_tiers(
        self, 
        is_active: Optional[bool] = None,
        offset: int = 0, 
        limit: int = 50
    ) -> Tuple[List[TransactionRateTier], int]:
        """Get transaction rate tiers"""
        query = select(TransactionRateTier)
        count_query = select(func.count(TransactionRateTier.id))
        
        if is_active is not None:
            query = query.where(TransactionRateTier.is_active == is_active)
            count_query = count_query.where(TransactionRateTier.is_active == is_active)
        
        query = query.order_by(TransactionRateTier.tier_level)
        query = query.offset(offset).limit(limit)
        
        result = await self.db.execute(query)
        tiers = result.scalars().all()
        
        count_result = await self.db.execute(count_query)
        total = count_result.scalar()
        
        return tiers, total
    
    async def update_rate_tier(
        self, 
        tier_id: str, 
        update_data: TransactionRateTierUpdate
    ) -> Optional[TransactionRateTier]:
        """Update transaction rate tier"""
        query = select(TransactionRateTier).where(TransactionRateTier.id == tier_id)
        result = await self.db.execute(query)
        tier = result.scalar_one_or_none()
        
        if not tier:
            return None
        
        # Update fields
        for field, value in update_data.dict(exclude_unset=True).items():
            if hasattr(tier, field):
                setattr(tier, field, value)
        
        tier.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(tier)
        return tier
    
    async def calculate_applicable_rate(
        self, 
        calculation_request: RateCalculationRequest
    ) -> Dict[str, Any]:
        """Calculate applicable commission rate for a transaction"""
        supplier_id = calculation_request.supplier_id
        transaction_amount = calculation_request.transaction_amount
        product_category = calculation_request.product_category
        supplier_type = calculation_request.supplier_type
        monthly_gmv = calculation_request.monthly_gmv
        
        # Get active rate configurations
        query = select(BillingRateConfig).where(
            and_(
                BillingRateConfig.is_active == True,
                BillingRateConfig.approval_status == "approved",
                BillingRateConfig.effective_from <= datetime.utcnow()
            )
        ).where(
            or_(
                BillingRateConfig.effective_to.is_(None),
                BillingRateConfig.effective_to > datetime.utcnow()
            )
        )
        
        result = await self.db.execute(query)
        configs = result.scalars().all()
        
        # Find most specific applicable configuration
        applicable_config = None
        best_specificity_score = -1
        
        for config in configs:
            if config.is_applicable_to_supplier(supplier_type, float(monthly_gmv) if monthly_gmv else None):
                # Calculate specificity score
                specificity_score = 0
                if config.target_supplier_type == supplier_type:
                    specificity_score += 10
                if config.target_product_category == product_category:
                    specificity_score += 10
                if config.min_monthly_gmv or config.max_monthly_gmv:
                    specificity_score += 5
                
                if specificity_score > best_specificity_score:
                    best_specificity_score = specificity_score
                    applicable_config = config
        
        # If no specific config found, use default
        if not applicable_config:
            default_query = select(BillingRateConfig).where(
                and_(
                    BillingRateConfig.is_active == True,
                    BillingRateConfig.approval_status == "approved",
                    BillingRateConfig.config_type == "commission",
                    BillingRateConfig.target_supplier_type.is_(None),
                    BillingRateConfig.target_product_category.is_(None)
                )
            ).order_by(desc(BillingRateConfig.created_at)).limit(1)
            
            result = await self.db.execute(default_query)
            applicable_config = result.scalar_one_or_none()
        
        if not applicable_config:
            return {
                "applicable_rate": 0.0,
                "commission_amount": 0.0,
                "rate_config_id": None,
                "rate_tier_id": None,
                "calculation_details": {
                    "error": "No applicable rate configuration found"
                }
            }
        
        # Check if rate tier applies
        rate_tier = None
        if monthly_gmv:
            tier_query = select(TransactionRateTier).where(
                and_(
                    TransactionRateTier.is_active == True,
                    TransactionRateTier.min_monthly_gmv <= monthly_gmv
                )
            ).where(
                or_(
                    TransactionRateTier.max_monthly_gmv.is_(None),
                    TransactionRateTier.max_monthly_gmv > monthly_gmv
                )
            ).order_by(desc(TransactionRateTier.tier_level)).limit(1)
            
            result = await self.db.execute(tier_query)
            rate_tier = result.scalar_one_or_none()
        
        # Calculate final rate
        final_rate = float(applicable_config.base_rate) if applicable_config.base_rate else 0.0
        if rate_tier:
            final_rate = float(rate_tier.commission_rate)
        
        # Calculate commission amount
        commission_amount = applicable_config.calculate_fee(float(transaction_amount))
        if rate_tier:
            commission_amount = float(transaction_amount) * final_rate
            
            # Apply min/max limits from config
            if applicable_config.min_amount:
                commission_amount = max(commission_amount, float(applicable_config.min_amount))
            if applicable_config.max_amount:
                commission_amount = min(commission_amount, float(applicable_config.max_amount))
        
        return {
            "applicable_rate": final_rate,
            "commission_amount": commission_amount,
            "rate_config_id": applicable_config.id,
            "rate_tier_id": rate_tier.id if rate_tier else None,
            "calculation_details": {
                "config_name": applicable_config.config_name,
                "config_type": applicable_config.config_type,
                "base_rate": float(applicable_config.base_rate) if applicable_config.base_rate else 0.0,
                "tier_name": rate_tier.tier_name if rate_tier else None,
                "tier_level": rate_tier.tier_level if rate_tier else None,
                "transaction_amount": float(transaction_amount),
                "monthly_gmv": float(monthly_gmv) if monthly_gmv else None,
                "supplier_type": supplier_type,
                "product_category": product_category
            }
        }
    
    async def get_active_configs_for_supplier(
        self, 
        supplier_type: Optional[str] = None,
        product_category: Optional[str] = None
    ) -> List[BillingRateConfig]:
        """Get active rate configurations applicable to a supplier"""
        query = select(BillingRateConfig).where(
            and_(
                BillingRateConfig.is_active == True,
                BillingRateConfig.approval_status == "approved",
                BillingRateConfig.effective_from <= datetime.utcnow()
            )
        ).where(
            or_(
                BillingRateConfig.effective_to.is_(None),
                BillingRateConfig.effective_to > datetime.utcnow()
            )
        )
        
        # Add supplier-specific filters
        if supplier_type:
            query = query.where(
                or_(
                    BillingRateConfig.target_supplier_type.is_(None),
                    BillingRateConfig.target_supplier_type == supplier_type
                )
            )
        
        if product_category:
            query = query.where(
                or_(
                    BillingRateConfig.target_product_category.is_(None),
                    BillingRateConfig.target_product_category == product_category
                )
            )
        
        query = query.order_by(desc(BillingRateConfig.created_at))
        result = await self.db.execute(query)
        return result.scalars().all()