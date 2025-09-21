"""
Billing automation background tasks
"""
import asyncio
import structlog
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.core.database import AsyncSessionLocal
from app.models.billing_transaction import BillingTransaction
from app.models.monthly_billing_statement import MonthlyBillingStatement
from app.models.payment_record import PaymentRecord
from app.models.transaction_rate_tier import TransactionRateTier
from app.services.transaction_service import TransactionService
from app.services.statement_service import StatementService
from app.services.payment_service import PaymentService
from app.integrations.order_service_client import OrderServiceClient
from app.integrations.supplier_service_client import SupplierServiceClient

logger = structlog.get_logger()


class BillingTaskManager:
    """
    Billing automation task manager
    """
    
    def __init__(self):
        self.order_client = OrderServiceClient()
        self.supplier_client = SupplierServiceClient()
        self.transaction_service = TransactionService()
        self.statement_service = StatementService()
        self.payment_service = PaymentService()
    
    async def process_order_completion(self, order_data: Dict[str, Any]) -> bool:
        """
        Process completed order and create billing transaction
        """
        try:
            async with AsyncSessionLocal() as session:
                logger.info("Processing order completion for billing", order_id=order_data.get("order_id"))
                
                # Extract order information
                order_id = order_data.get("order_id")
                supplier_id = order_data.get("supplier_id")
                organization_id = order_data.get("organization_id")
                customer_id = order_data.get("customer_id")
                order_amount = Decimal(str(order_data.get("total_amount", 0)))
                product_category = order_data.get("product_category")
                delivery_region = order_data.get("delivery_region")
                
                # Get supplier's current monthly GMV for rate tier calculation
                current_month = datetime.now().strftime("%Y-%m")
                supplier_gmv = await self._get_supplier_monthly_gmv(session, supplier_id, current_month)
                
                # Determine applicable rate tier
                rate_tier = await self._get_applicable_rate_tier(session, supplier_gmv, supplier_id)
                if not rate_tier:
                    logger.error("No applicable rate tier found", supplier_id=supplier_id, gmv=supplier_gmv)
                    return False
                
                # Calculate commission
                commission_rate = rate_tier.get_effective_rate()
                commission_amount = order_amount * Decimal(str(commission_rate))
                
                # Create billing transaction
                transaction = BillingTransaction(
                    transaction_id=f"TXN_{order_id}_{int(datetime.now().timestamp())}",
                    order_id=order_id,
                    supplier_id=supplier_id,
                    organization_id=organization_id,
                    customer_id=customer_id,
                    order_amount=order_amount,
                    commission_rate=Decimal(str(commission_rate)),
                    commission_amount=commission_amount,
                    rate_tier_id=rate_tier.id,
                    transaction_date=datetime.now(),
                    billing_period=current_month,
                    status="confirmed",
                    product_category=product_category,
                    delivery_region=delivery_region,
                    created_by="system",
                    metadata={"order_data": order_data}
                )
                
                session.add(transaction)
                await session.commit()
                
                logger.info("Billing transaction created", 
                           transaction_id=transaction.transaction_id,
                           commission_amount=float(commission_amount))
                
                # Update supplier monthly GMV
                await self._update_supplier_monthly_gmv(session, supplier_id, current_month, order_amount)
                
                return True
                
        except Exception as e:
            logger.error("Failed to process order completion", error=str(e), order_id=order_data.get("order_id"))
            return False
    
    async def generate_monthly_statements(self, billing_period: str = None) -> Dict[str, Any]:
        """
        Generate monthly billing statements for all suppliers
        """
        try:
            if not billing_period:
                billing_period = (datetime.now() - timedelta(days=1)).strftime("%Y-%m")
            
            async with AsyncSessionLocal() as session:
                logger.info("Generating monthly statements", billing_period=billing_period)
                
                # Get all suppliers with transactions in the billing period
                suppliers_with_transactions = await session.execute(
                    session.query(BillingTransaction.supplier_id)
                    .filter(BillingTransaction.billing_period == billing_period)
                    .filter(BillingTransaction.status == "confirmed")
                    .distinct()
                )
                
                supplier_ids = [row[0] for row in suppliers_with_transactions]
                results = {"generated": 0, "failed": 0, "total_suppliers": len(supplier_ids)}
                
                for supplier_id in supplier_ids:
                    try:
                        # Generate statement for each supplier
                        statement = await self.statement_service.generate_monthly_statement(
                            session, supplier_id, billing_period
                        )
                        
                        if statement:
                            results["generated"] += 1
                            logger.info("Statement generated", 
                                       supplier_id=supplier_id, 
                                       statement_id=statement.id)
                        else:
                            results["failed"] += 1
                            
                    except Exception as e:
                        logger.error("Failed to generate statement", 
                                   supplier_id=supplier_id, error=str(e))
                        results["failed"] += 1
                
                logger.info("Monthly statement generation completed", **results)
                return results
                
        except Exception as e:
            logger.error("Failed to generate monthly statements", error=str(e))
            return {"error": str(e)}
    
    async def process_daily_billing_updates(self) -> Dict[str, Any]:
        """
        Daily billing updates: update GMV totals, process pending transactions
        """
        try:
            async with AsyncSessionLocal() as session:
                logger.info("Processing daily billing updates")
                
                results = {
                    "gmv_updates": 0,
                    "transactions_processed": 0,
                    "rate_adjustments": 0
                }
                
                # Update GMV totals for all active suppliers
                current_month = datetime.now().strftime("%Y-%m")
                suppliers = await self.supplier_client.get_active_suppliers()
                
                for supplier in suppliers:
                    supplier_id = supplier.get("id")
                    
                    # Recalculate monthly GMV
                    monthly_gmv = await self._calculate_supplier_monthly_gmv(session, supplier_id, current_month)
                    
                    # Check if rate tier needs adjustment
                    current_tier = await self._get_applicable_rate_tier(session, monthly_gmv, supplier_id)
                    
                    # Update supplier's current rate tier in metadata
                    await self._update_supplier_rate_tier(supplier_id, current_tier.id if current_tier else None)
                    
                    results["gmv_updates"] += 1
                    
                    # Check for any rate adjustments needed for pending transactions
                    adjustments = await self._process_rate_adjustments(session, supplier_id, current_month)
                    results["rate_adjustments"] += adjustments
                
                # Process any pending transactions
                pending_count = await self._process_pending_transactions(session)
                results["transactions_processed"] = pending_count
                
                logger.info("Daily billing updates completed", **results)
                return results
                
        except Exception as e:
            logger.error("Failed to process daily billing updates", error=str(e))
            return {"error": str(e)}
    
    async def send_billing_reminders(self, days_before_due: int = 7) -> Dict[str, Any]:
        """
        Send billing reminders to suppliers
        """
        try:
            async with AsyncSessionLocal() as session:
                logger.info("Sending billing reminders", days_before_due=days_before_due)
                
                # Get statements due within the specified days
                due_date = datetime.now() + timedelta(days=days_before_due)
                
                statements = await session.execute(
                    session.query(MonthlyBillingStatement)
                    .filter(MonthlyBillingStatement.payment_due_date <= due_date)
                    .filter(MonthlyBillingStatement.payment_status == "pending")
                )
                
                reminders_sent = 0
                
                for statement in statements:
                    try:
                        # Send reminder notification
                        await self._send_billing_reminder(statement)
                        reminders_sent += 1
                        
                    except Exception as e:
                        logger.error("Failed to send reminder", 
                                   statement_id=statement.id, error=str(e))
                
                logger.info("Billing reminders sent", count=reminders_sent)
                return {"reminders_sent": reminders_sent}
                
        except Exception as e:
            logger.error("Failed to send billing reminders", error=str(e))
            return {"error": str(e)}
    
    # Helper methods
    
    async def _get_supplier_monthly_gmv(self, session: Session, supplier_id: str, billing_period: str) -> float:
        """Get supplier's current monthly GMV"""
        result = await session.execute(
            session.query(func.sum(BillingTransaction.order_amount))
            .filter(BillingTransaction.supplier_id == supplier_id)
            .filter(BillingTransaction.billing_period == billing_period)
            .filter(BillingTransaction.status == "confirmed")
        )
        
        gmv = result.scalar() or 0
        return float(gmv)
    
    async def _calculate_supplier_monthly_gmv(self, session: Session, supplier_id: str, billing_period: str) -> float:
        """Calculate and return supplier's monthly GMV"""
        return await self._get_supplier_monthly_gmv(session, supplier_id, billing_period)
    
    async def _get_applicable_rate_tier(self, session: Session, monthly_gmv: float, supplier_id: str) -> Optional[TransactionRateTier]:
        """Get applicable rate tier for supplier based on GMV"""
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
    
    async def _update_supplier_monthly_gmv(self, session: Session, supplier_id: str, billing_period: str, order_amount: Decimal):
        """Update supplier's monthly GMV total"""
        # This would typically update a summary table or cache
        # For now, we'll just log it
        logger.info("Updated supplier monthly GMV", 
                   supplier_id=supplier_id, 
                   billing_period=billing_period,
                   order_amount=float(order_amount))
    
    async def _update_supplier_rate_tier(self, supplier_id: str, rate_tier_id: str):
        """Update supplier's current rate tier"""
        # This would update the supplier service
        await self.supplier_client.update_supplier_rate_tier(supplier_id, rate_tier_id)
    
    async def _process_rate_adjustments(self, session: Session, supplier_id: str, billing_period: str) -> int:
        """Process rate adjustments for supplier's transactions"""
        # Implementation would check for transactions that need rate adjustments
        # and apply them if necessary
        return 0
    
    async def _process_pending_transactions(self, session: Session) -> int:
        """Process pending transactions"""
        pending_transactions = await session.execute(
            session.query(BillingTransaction)
            .filter(BillingTransaction.status == "pending")
        )
        
        processed = 0
        for transaction in pending_transactions:
            try:
                # Process the transaction
                transaction.status = "confirmed"
                transaction.processed_at = datetime.now()
                transaction.processed_by = "system"
                processed += 1
                
            except Exception as e:
                logger.error("Failed to process transaction", 
                           transaction_id=transaction.transaction_id, error=str(e))
        
        await session.commit()
        return processed
    
    async def _send_billing_reminder(self, statement: MonthlyBillingStatement):
        """Send billing reminder notification"""
        # Implementation would send notification through notification service
        logger.info("Billing reminder sent", 
                   supplier_id=statement.supplier_id,
                   statement_id=statement.id,
                   amount_due=float(statement.total_amount_due))


# Task scheduler functions
billing_task_manager = BillingTaskManager()

async def process_order_completion_task(order_data: Dict[str, Any]) -> bool:
    """Background task for processing order completion"""
    return await billing_task_manager.process_order_completion(order_data)

async def generate_monthly_statements_task(billing_period: str = None) -> Dict[str, Any]:
    """Background task for generating monthly statements"""
    return await billing_task_manager.generate_monthly_statements(billing_period)

async def daily_billing_updates_task() -> Dict[str, Any]:
    """Background task for daily billing updates"""
    return await billing_task_manager.process_daily_billing_updates()

async def billing_reminders_task(days_before_due: int = 7) -> Dict[str, Any]:
    """Background task for sending billing reminders"""
    return await billing_task_manager.send_billing_reminders(days_before_due)