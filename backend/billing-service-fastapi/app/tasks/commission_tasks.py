"""
Commission rate management and calculation tasks
"""
import structlog
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.core.database import AsyncSessionLocal
from app.models.transaction_rate_tier import TransactionRateTier
from app.models.billing_rate_config import BillingRateConfig
from app.models.supplier_rating import SupplierRating
from app.models.billing_transaction import BillingTransaction

logger = structlog.get_logger()


class CommissionRateManager:
    """
    Commission rate calculation and management
    """
    
    # Taiwan market commission rate tiers (based on monthly GMV)
    DEFAULT_RATE_TIERS = [
        {
            "tier_name": "新手供應商 (Tier 1)",
            "tier_order": 1,
            "min_monthly_gmv": Decimal("0"),
            "max_monthly_gmv": Decimal("50000"),
            "commission_rate": Decimal("0.030"),  # 3.0%
            "fixed_fee": Decimal("0")
        },
        {
            "tier_name": "成長供應商 (Tier 2)", 
            "tier_order": 2,
            "min_monthly_gmv": Decimal("50001"),
            "max_monthly_gmv": Decimal("200000"),
            "commission_rate": Decimal("0.025"),  # 2.5%
            "fixed_fee": Decimal("0")
        },
        {
            "tier_name": "穩定供應商 (Tier 3)",
            "tier_order": 3,
            "min_monthly_gmv": Decimal("200001"),
            "max_monthly_gmv": Decimal("500000"),
            "commission_rate": Decimal("0.020"),  # 2.0%
            "fixed_fee": Decimal("0")
        },
        {
            "tier_name": "優質供應商 (Tier 4)",
            "tier_order": 4,
            "min_monthly_gmv": Decimal("500001"),
            "max_monthly_gmv": Decimal("1000000"),
            "commission_rate": Decimal("0.015"),  # 1.5%
            "fixed_fee": Decimal("0")
        },
        {
            "tier_name": "戰略供應商 (Tier 5)",
            "tier_order": 5,
            "min_monthly_gmv": Decimal("1000001"),
            "max_monthly_gmv": None,  # No upper limit
            "commission_rate": Decimal("0.012"),  # 1.2%
            "fixed_fee": Decimal("0")
        }
    ]
    
    # Rating-based discount rates
    RATING_DISCOUNTS = {
        "bronze": Decimal("0.05"),    # 5% discount
        "silver": Decimal("0.10"),    # 10% discount  
        "gold": Decimal("0.15"),      # 15% discount
        "platinum": Decimal("0.20")   # 20% discount
    }
    
    async def initialize_default_rate_tiers(self) -> Dict[str, Any]:
        """
        Initialize default commission rate tiers for Taiwan market
        """
        try:
            async with AsyncSessionLocal() as session:
                logger.info("Initializing default commission rate tiers")
                
                created_tiers = []
                
                for tier_data in self.DEFAULT_RATE_TIERS:
                    # Check if tier already exists
                    existing_tier = await session.execute(
                        session.query(TransactionRateTier)
                        .filter(TransactionRateTier.tier_name == tier_data["tier_name"])
                        .filter(TransactionRateTier.is_active == True)
                    )
                    
                    if existing_tier.first():
                        logger.info("Rate tier already exists", tier_name=tier_data["tier_name"])
                        continue
                    
                    # Create new rate tier
                    rate_tier = TransactionRateTier(
                        tier_name=tier_data["tier_name"],
                        tier_order=tier_data["tier_order"],
                        min_monthly_gmv=tier_data["min_monthly_gmv"],
                        max_monthly_gmv=tier_data["max_monthly_gmv"],
                        commission_rate=tier_data["commission_rate"],
                        fixed_fee=tier_data["fixed_fee"],
                        is_active=True,
                        effective_from=datetime.now(),
                        supplier_type="standard",
                        region="taiwan",
                        created_by="system"
                    )
                    
                    session.add(rate_tier)
                    created_tiers.append(tier_data["tier_name"])
                
                await session.commit()
                
                logger.info("Default rate tiers initialized", created_count=len(created_tiers))
                return {
                    "created_tiers": created_tiers,
                    "total_tiers": len(self.DEFAULT_RATE_TIERS)
                }
                
        except Exception as e:
            logger.error("Failed to initialize default rate tiers", error=str(e))
            return {"error": str(e)}
    
    async def calculate_supplier_commission_rate(self, supplier_id: str, monthly_gmv: float, rating: str = None) -> Dict[str, Any]:
        """
        Calculate effective commission rate for supplier based on GMV and rating
        """
        try:
            async with AsyncSessionLocal() as session:
                logger.info("Calculating commission rate", 
                           supplier_id=supplier_id, 
                           monthly_gmv=monthly_gmv,
                           rating=rating)
                
                # Get applicable rate tier based on GMV
                base_tier = await self._get_rate_tier_by_gmv(session, monthly_gmv)
                if not base_tier:
                    logger.error("No applicable rate tier found", monthly_gmv=monthly_gmv)
                    return {"error": "No applicable rate tier found"}
                
                # Calculate base commission rate
                base_rate = float(base_tier.commission_rate)
                
                # Apply rating discount if applicable
                rating_discount = Decimal("0")
                if rating and rating.lower() in self.RATING_DISCOUNTS:
                    rating_discount = self.RATING_DISCOUNTS[rating.lower()]
                
                # Calculate effective rate
                effective_rate = base_rate * (1 - float(rating_discount))
                
                result = {
                    "supplier_id": supplier_id,
                    "monthly_gmv": monthly_gmv,
                    "base_tier": {
                        "id": base_tier.id,
                        "name": base_tier.tier_name,
                        "order": base_tier.tier_order,
                        "rate": base_rate
                    },
                    "rating": rating,
                    "rating_discount": float(rating_discount),
                    "effective_rate": effective_rate,
                    "calculated_at": datetime.now().isoformat()
                }
                
                logger.info("Commission rate calculated", **result)
                return result
                
        except Exception as e:
            logger.error("Failed to calculate commission rate", error=str(e))
            return {"error": str(e)}
    
    async def update_all_supplier_commission_rates(self) -> Dict[str, Any]:
        """
        Update commission rates for all suppliers based on current GMV and ratings
        """
        try:
            async with AsyncSessionLocal() as session:
                logger.info("Updating commission rates for all suppliers")
                
                current_month = datetime.now().strftime("%Y-%m")
                
                # Get all suppliers with billing transactions
                supplier_ids = await session.execute(
                    session.query(BillingTransaction.supplier_id)
                    .filter(BillingTransaction.billing_period == current_month)
                    .distinct()
                )
                
                supplier_ids = [row[0] for row in supplier_ids]
                
                results = {
                    "updated_suppliers": 0,
                    "failed_updates": 0,
                    "total_suppliers": len(supplier_ids)
                }
                
                for supplier_id in supplier_ids:
                    try:
                        # Calculate current monthly GMV
                        monthly_gmv = await self._calculate_supplier_gmv(session, supplier_id, current_month)
                        
                        # Get supplier rating
                        supplier_rating = await self._get_supplier_rating(session, supplier_id)
                        rating = supplier_rating.rating_tier if supplier_rating else None
                        
                        # Calculate new commission rate
                        rate_info = await self.calculate_supplier_commission_rate(
                            supplier_id, monthly_gmv, rating
                        )
                        
                        if "error" not in rate_info:
                            # Update supplier's commission rate in external system
                            await self._update_supplier_rate(supplier_id, rate_info)
                            results["updated_suppliers"] += 1
                        else:
                            results["failed_updates"] += 1
                            
                    except Exception as e:
                        logger.error("Failed to update supplier rate", 
                                   supplier_id=supplier_id, error=str(e))
                        results["failed_updates"] += 1
                
                logger.info("Commission rate update completed", **results)
                return results
                
        except Exception as e:
            logger.error("Failed to update supplier commission rates", error=str(e))
            return {"error": str(e)}
    
    async def create_promotional_rate_tier(self, tier_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create promotional rate tier for special campaigns
        """
        try:
            async with AsyncSessionLocal() as session:
                logger.info("Creating promotional rate tier", tier_name=tier_data.get("tier_name"))
                
                promotional_tier = TransactionRateTier(
                    tier_name=tier_data["tier_name"],
                    tier_order=tier_data.get("tier_order", 999),  # High order for promotions
                    min_monthly_gmv=Decimal(str(tier_data["min_monthly_gmv"])),
                    max_monthly_gmv=Decimal(str(tier_data["max_monthly_gmv"])) if tier_data.get("max_monthly_gmv") else None,
                    commission_rate=Decimal(str(tier_data["commission_rate"])),
                    promotional_rate=Decimal(str(tier_data["promotional_rate"])),
                    promo_start_date=datetime.fromisoformat(tier_data["promo_start_date"]),
                    promo_end_date=datetime.fromisoformat(tier_data["promo_end_date"]),
                    fixed_fee=Decimal(str(tier_data.get("fixed_fee", 0))),
                    is_active=True,
                    effective_from=datetime.now(),
                    supplier_type=tier_data.get("supplier_type"),
                    region=tier_data.get("region", "taiwan"),
                    created_by=tier_data.get("created_by", "system")
                )
                
                session.add(promotional_tier)
                await session.commit()
                
                logger.info("Promotional rate tier created", tier_id=promotional_tier.id)
                return {"tier_id": promotional_tier.id, "tier_name": promotional_tier.tier_name}
                
        except Exception as e:
            logger.error("Failed to create promotional rate tier", error=str(e))
            return {"error": str(e)}
    
    async def recalculate_historical_commissions(self, billing_period: str) -> Dict[str, Any]:
        """
        Recalculate commissions for a specific billing period
        """
        try:
            async with AsyncSessionLocal() as session:
                logger.info("Recalculating historical commissions", billing_period=billing_period)
                
                # Get all transactions for the billing period
                transactions = await session.execute(
                    session.query(BillingTransaction)
                    .filter(BillingTransaction.billing_period == billing_period)
                    .filter(BillingTransaction.status == "confirmed")
                )
                
                results = {
                    "recalculated_transactions": 0,
                    "total_adjustment_amount": Decimal("0"),
                    "failed_recalculations": 0
                }
                
                for transaction in transactions:
                    try:
                        # Get supplier's GMV for that period
                        supplier_gmv = await self._calculate_supplier_gmv(
                            session, transaction.supplier_id, billing_period
                        )
                        
                        # Get applicable rate tier for that GMV
                        rate_tier = await self._get_rate_tier_by_gmv(session, supplier_gmv)
                        if not rate_tier:
                            continue
                        
                        # Calculate new commission
                        new_rate = rate_tier.get_effective_rate()
                        new_commission = float(transaction.order_amount) * new_rate
                        
                        # Calculate adjustment
                        adjustment = new_commission - float(transaction.commission_amount)
                        
                        if abs(adjustment) > 0.01:  # Only adjust if difference > 1 cent
                            # Apply adjustment
                            transaction.apply_adjustment(
                                adjustment, 
                                f"Rate recalculation for {billing_period}",
                                "system"
                            )
                            
                            results["total_adjustment_amount"] += Decimal(str(adjustment))
                            results["recalculated_transactions"] += 1
                        
                    except Exception as e:
                        logger.error("Failed to recalculate transaction", 
                                   transaction_id=transaction.transaction_id, error=str(e))
                        results["failed_recalculations"] += 1
                
                await session.commit()
                
                logger.info("Historical commission recalculation completed", **results)
                return results
                
        except Exception as e:
            logger.error("Failed to recalculate historical commissions", error=str(e))
            return {"error": str(e)}
    
    # Helper methods
    
    async def _get_rate_tier_by_gmv(self, session: Session, monthly_gmv: float) -> Optional[TransactionRateTier]:
        """Get applicable rate tier for given GMV"""
        tiers = await session.execute(
            session.query(TransactionRateTier)
            .filter(TransactionRateTier.is_active == True)
            .filter(TransactionRateTier.effective_from <= datetime.now())
            .filter(
                and_(
                    TransactionRateTier.effective_to.is_(None),
                    TransactionRateTier.effective_to > datetime.now()
                )
            )
            .order_by(TransactionRateTier.tier_order)
        )
        
        for tier in tiers:
            if tier.is_in_gmv_range(monthly_gmv):
                return tier
        
        return None
    
    async def _calculate_supplier_gmv(self, session: Session, supplier_id: str, billing_period: str) -> float:
        """Calculate supplier's GMV for billing period"""
        result = await session.execute(
            session.query(func.sum(BillingTransaction.order_amount))
            .filter(BillingTransaction.supplier_id == supplier_id)
            .filter(BillingTransaction.billing_period == billing_period)
            .filter(BillingTransaction.status == "confirmed")
        )
        
        gmv = result.scalar() or 0
        return float(gmv)
    
    async def _get_supplier_rating(self, session: Session, supplier_id: str) -> Optional[SupplierRating]:
        """Get supplier's current rating"""
        result = await session.execute(
            session.query(SupplierRating)
            .filter(SupplierRating.supplier_id == supplier_id)
            .filter(SupplierRating.is_active == True)
            .order_by(SupplierRating.rating_date.desc())
            .limit(1)
        )
        
        return result.first()
    
    async def _update_supplier_rate(self, supplier_id: str, rate_info: Dict[str, Any]):
        """Update supplier's commission rate in external system"""
        # This would call the supplier service to update the rate
        logger.info("Updating supplier rate", supplier_id=supplier_id, rate_info=rate_info)


# Task functions
commission_rate_manager = CommissionRateManager()

async def initialize_default_rate_tiers_task() -> Dict[str, Any]:
    """Background task to initialize default rate tiers"""
    return await commission_rate_manager.initialize_default_rate_tiers()

async def update_commission_rates_task() -> Dict[str, Any]:
    """Background task to update all supplier commission rates"""
    return await commission_rate_manager.update_all_supplier_commission_rates()

async def recalculate_historical_commissions_task(billing_period: str) -> Dict[str, Any]:
    """Background task to recalculate historical commissions"""
    return await commission_rate_manager.recalculate_historical_commissions(billing_period)