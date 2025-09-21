"""
End-to-end workflow tests for complete business scenarios
Tests the complete billing lifecycle from order to payment
"""
import pytest
import uuid
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, patch
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

from app.models.billing_rate_config import BillingRateConfig
from app.models.transaction_rate_tier import TransactionRateTier
from app.models.subscription_plan import SubscriptionPlan
from app.models.supplier_subscription import SupplierSubscription
from app.models.billing_transaction import BillingTransaction
from app.models.monthly_billing_statement import MonthlyBillingStatement
from app.models.payment_record import PaymentRecord
from app.models.supplier_rating import SupplierRating


class TestNewSupplierOnboarding:
    """Test complete new supplier onboarding workflow"""

    async def test_supplier_onboarding_to_first_payment(self, client: AsyncClient, test_session: AsyncSession, sample_subscription_plans, sample_rate_tiers):
        """
        Complete supplier onboarding workflow:
        1. Create supplier subscription (Free plan)
        2. Process first orders to build GMV
        3. Calculate initial rating
        4. Upgrade to Professional plan
        5. Generate first monthly statement
        6. Process payment
        """
        supplier_id = str(uuid.uuid4())
        
        # Step 1: Subscribe to Free plan
        free_plan = next(p for p in sample_subscription_plans if p.plan_type == "free")
        subscription_data = {
            "subscription_plan_id": str(free_plan.id),
            "auto_renew": True
        }
        
        response = await client.post(f"/api/billing/subscriptions/supplier/{supplier_id}/subscribe", json=subscription_data)
        assert response.status_code == 201
        subscription = response.json()
        assert subscription["status"] == "active"
        
        # Step 2: Process multiple orders throughout the month
        orders = [
            {"amount": 8000, "day_offset": 1},
            {"amount": 12000, "day_offset": 5},
            {"amount": 15000, "day_offset": 10},
            {"amount": 9000, "day_offset": 15},
            {"amount": 18000, "day_offset": 20},
            {"amount": 25000, "day_offset": 25}
        ]
        
        total_gmv = Decimal("0")
        transaction_ids = []
        
        for order in orders:
            transaction_data = {
                "supplier_id": supplier_id,
                "order_id": str(uuid.uuid4()),
                "transaction_type": "commission",
                "order_amount": order["amount"],
                "commission_rate": 0.025,  # Will be calculated based on tier
                "additional_details": {
                    "order_date": (datetime.utcnow() - timedelta(days=30-order["day_offset"])).isoformat()
                }
            }
            
            response = await client.post("/api/billing/transactions/", json=transaction_data)
            assert response.status_code == 201
            
            transaction = response.json()
            transaction_ids.append(transaction["id"])
            total_gmv += Decimal(str(order["amount"]))
        
        # Verify total GMV: NT$87,000 (should be in Tier 2: 2.5% commission)
        assert total_gmv == Decimal("87000")
        
        # Step 3: Calculate initial supplier rating
        rating_data = {
            "rating_period_start": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "rating_period_end": datetime.utcnow().isoformat(),
            "metrics": {
                "fulfillment_rate": 0.95,
                "on_time_delivery_rate": 0.92,
                "quality_score": 4.2,
                "customer_satisfaction_score": 4.0,
                "response_time_score": 3.8
            }
        }
        
        response = await client.post(f"/api/billing/ratings/supplier/{supplier_id}/calculate", json=rating_data)
        assert response.status_code == 201
        
        rating = response.json()
        assert rating["rating_tier"] in ["bronze", "silver", "gold"]
        
        # Step 4: Upgrade to Professional plan due to business growth
        professional_plan = next(p for p in sample_subscription_plans if p.plan_type == "professional")
        upgrade_data = {
            "subscription_plan_id": str(professional_plan.id),
            "auto_renew": True
        }
        
        response = await client.put(f"/api/billing/subscriptions/supplier/{supplier_id}", json=upgrade_data)
        assert response.status_code == 200
        
        updated_subscription = response.json()
        assert updated_subscription["monthly_fee"] == float(professional_plan.monthly_fee)
        
        # Step 5: Generate monthly billing statement
        statement_data = {
            "billing_period_start": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "billing_period_end": datetime.utcnow().isoformat(),
            "include_adjustments": True
        }
        
        response = await client.post(f"/api/billing/statements/generate/{supplier_id}", json=statement_data)
        assert response.status_code == 201
        
        statement = response.json()
        assert statement["total_gmv"] == float(total_gmv)
        assert statement["total_orders"] == len(orders)
        assert statement["commission_amount"] > 0
        assert statement["subscription_fee"] == float(professional_plan.monthly_fee)
        
        # Step 6: Process payment
        payment_data = {
            "supplier_id": supplier_id,
            "billing_statement_id": statement["id"],
            "payment_method": "credit_card",
            "payment_gateway": "ecpay",
            "payment_amount": statement["total_amount"]
        }
        
        response = await client.post("/api/billing/payments/", json=payment_data)
        assert response.status_code == 201
        
        payment = response.json()
        assert payment["status"] == "pending"
        assert payment["payment_amount"] == statement["total_amount"]
        
        # Verify complete workflow data consistency
        await self._verify_workflow_consistency(test_session, supplier_id, total_gmv, len(orders))

    async def _verify_workflow_consistency(self, test_session: AsyncSession, supplier_id: str, expected_gmv: Decimal, expected_order_count: int):
        """Verify data consistency across all billing tables"""
        # Verify subscription exists
        stmt = select(SupplierSubscription).where(SupplierSubscription.supplier_id == supplier_id)
        result = await test_session.execute(stmt)
        subscription = result.scalar_one()
        assert subscription is not None
        
        # Verify transactions
        stmt = select(func.sum(BillingTransaction.order_amount)).where(
            BillingTransaction.supplier_id == supplier_id
        )
        result = await test_session.execute(stmt)
        total_gmv = result.scalar()
        assert total_gmv == expected_gmv
        
        # Verify statement
        stmt = select(MonthlyBillingStatement).where(
            MonthlyBillingStatement.supplier_id == supplier_id
        )
        result = await test_session.execute(stmt)
        statement = result.scalar_one()
        assert statement.total_orders == expected_order_count
        
        # Verify payment record
        stmt = select(PaymentRecord).where(PaymentRecord.supplier_id == supplier_id)
        result = await test_session.execute(stmt)
        payment = result.scalar_one()
        assert payment.billing_statement_id == statement.id


class TestMonthlyBillingCycle:
    """Test complete monthly billing cycle workflow"""

    async def test_full_monthly_billing_cycle(self, client: AsyncClient, test_session: AsyncSession, sample_supplier_subscription, sample_rate_tiers):
        """
        Complete monthly billing cycle:
        1. Multiple order completions throughout month
        2. GMV accumulation and tier progression
        3. Rating recalculation based on performance
        4. Monthly statement generation with adjustments
        5. Payment processing and confirmation
        6. Next month initialization
        """
        supplier_id = sample_supplier_subscription.supplier_id
        
        # Step 1: Simulate month of order activity with tier progression
        monthly_orders = [
            # Week 1: Small orders (Tier 1)
            {"amount": 5000, "day": 2},
            {"amount": 8000, "day": 4},
            {"amount": 12000, "day": 6},
            # Week 2: Growing orders (Tier 1 → Tier 2)
            {"amount": 15000, "day": 9},
            {"amount": 18000, "day": 11},
            {"amount": 22000, "day": 13},
            # Week 3: Larger orders (Tier 2)
            {"amount": 28000, "day": 16},
            {"amount": 35000, "day": 18},
            {"amount": 40000, "day": 20},
            # Week 4: Major orders (Tier 2 → Tier 3)
            {"amount": 45000, "day": 23},
            {"amount": 55000, "day": 25},
            {"amount": 60000, "day": 27}
        ]
        
        total_monthly_gmv = Decimal("0")
        commission_total = Decimal("0")
        
        for order in monthly_orders:
            # Create transaction
            transaction_data = {
                "supplier_id": supplier_id,
                "order_id": str(uuid.uuid4()),
                "transaction_type": "commission",
                "order_amount": order["amount"],
                "commission_rate": 0.025,  # Base rate, will be adjusted by service
                "additional_details": {
                    "order_date": (datetime.utcnow() - timedelta(days=30-order["day"])).isoformat(),
                    "fulfillment_status": "completed",
                    "delivery_status": "delivered"
                }
            }
            
            response = await client.post("/api/billing/transactions/", json=transaction_data)
            assert response.status_code == 201
            
            transaction = response.json()
            total_monthly_gmv += Decimal(str(order["amount"]))
            commission_total += Decimal(str(transaction["commission_amount"]))
        
        # Verify tier progression: NT$343,000 total should be in Tier 3 (2.0%)
        assert total_monthly_gmv == Decimal("343000")
        
        # Step 2: Update supplier performance for rating calculation
        performance_update = {
            "fulfillment_rate": 0.97,  # Improved performance
            "on_time_delivery_rate": 0.95,
            "quality_score": 4.6,
            "customer_satisfaction_score": 4.4,
            "response_time_score": 4.2
        }
        
        rating_data = {
            "rating_period_start": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "rating_period_end": datetime.utcnow().isoformat(),
            "metrics": performance_update
        }
        
        response = await client.post(f"/api/billing/ratings/supplier/{supplier_id}/calculate", json=rating_data)
        assert response.status_code == 201
        
        rating = response.json()
        # Should achieve Gold tier with these metrics
        assert rating["rating_tier"] == "gold"
        assert rating["commission_discount_rate"] == 0.15
        
        # Step 3: Generate monthly statement
        statement_data = {
            "billing_period_start": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "billing_period_end": datetime.utcnow().isoformat(),
            "include_adjustments": True
        }
        
        response = await client.post(f"/api/billing/statements/generate/{supplier_id}", json=statement_data)
        assert response.status_code == 201
        
        statement = response.json()
        assert statement["total_gmv"] == float(total_monthly_gmv)
        assert statement["total_orders"] == len(monthly_orders)
        
        # Step 4: Add service credit adjustment
        adjustment_data = {
            "adjustment_type": "credit",
            "amount": -500.00,
            "reason": "Performance bonus for Gold tier achievement",
            "notes": "Monthly performance bonus"
        }
        
        response = await client.post(f"/api/billing/statements/{statement['id']}/adjustments", json=adjustment_data)
        assert response.status_code == 201
        
        adjusted_statement = response.json()
        assert adjusted_statement["adjustment_amount"] == -500.00
        
        # Step 5: Finalize statement
        response = await client.post(f"/api/billing/statements/{statement['id']}/finalize")
        assert response.status_code == 200
        
        finalized_statement = response.json()
        assert finalized_statement["status"] == "finalized"
        
        # Step 6: Process payment
        payment_data = {
            "supplier_id": supplier_id,
            "billing_statement_id": finalized_statement["id"],
            "payment_method": "bank_transfer",
            "payment_gateway": "ecpay",
            "payment_amount": finalized_statement["total_amount"]
        }
        
        response = await client.post("/api/billing/payments/", json=payment_data)
        assert response.status_code == 201
        
        payment = response.json()
        
        # Step 7: Simulate payment confirmation via webhook
        webhook_payload = {
            "merchant_trade_no": f"BS{finalized_statement['id']}",
            "trade_no": "EC" + str(uuid.uuid4()).replace("-", "")[:12],
            "payment_date": datetime.utcnow().strftime("%Y/%m/%d %H:%M:%S"),
            "payment_type": "Credit_CreditCard",
            "trade_amt": int(finalized_statement["total_amount"]),
            "rtn_code": "1",
            "rtn_msg": "付款成功"
        }
        
        # Update payment status
        payment_update = {
            "status": "completed",
            "gateway_response": webhook_payload,
            "notes": "Payment confirmed via webhook"
        }
        
        response = await client.put(f"/api/billing/payments/{payment['id']}/status", json=payment_update)
        assert response.status_code == 200
        
        completed_payment = response.json()
        assert completed_payment["status"] == "completed"
        
        # Verify end-to-end consistency
        await self._verify_monthly_cycle_consistency(test_session, supplier_id, total_monthly_gmv, len(monthly_orders))

    async def _verify_monthly_cycle_consistency(self, test_session: AsyncSession, supplier_id: str, expected_gmv: Decimal, expected_orders: int):
        """Verify monthly billing cycle data consistency"""
        # Verify all transactions are recorded
        stmt = select(func.count(BillingTransaction.id)).where(
            BillingTransaction.supplier_id == supplier_id,
            BillingTransaction.status == "completed"
        )
        result = await test_session.execute(stmt)
        transaction_count = result.scalar()
        assert transaction_count == expected_orders
        
        # Verify statement totals
        stmt = select(MonthlyBillingStatement).where(
            MonthlyBillingStatement.supplier_id == supplier_id,
            MonthlyBillingStatement.status == "finalized"
        )
        result = await test_session.execute(stmt)
        statement = result.scalar_one()
        assert statement.total_gmv == expected_gmv
        
        # Verify payment completion
        stmt = select(PaymentRecord).where(
            PaymentRecord.billing_statement_id == statement.id,
            PaymentRecord.status == "completed"
        )
        result = await test_session.execute(stmt)
        payment = result.scalar_one()
        assert payment.payment_amount == statement.total_amount


class TestRatingBasedDiscountProgression:
    """Test supplier rating improvement and commission discount progression"""

    async def test_rating_progression_workflow(self, client: AsyncClient, test_session: AsyncSession, sample_supplier_subscription):
        """
        Test supplier performance improvement over time:
        1. Start with Bronze rating (poor performance)
        2. Gradual improvement over quarters
        3. Rating tier progression: Bronze → Silver → Gold → Platinum
        4. Commission discount increases with better rating
        5. Verify financial impact of rating improvements
        """
        supplier_id = sample_supplier_subscription.supplier_id
        
        # Quarter 1: Poor performance (Bronze tier)
        q1_metrics = {
            "fulfillment_rate": 0.82,
            "on_time_delivery_rate": 0.78,
            "quality_score": 3.2,
            "customer_satisfaction_score": 3.0,
            "response_time_score": 2.8
        }
        
        q1_rating_data = {
            "rating_period_start": (datetime.utcnow() - timedelta(days=120)).isoformat(),
            "rating_period_end": (datetime.utcnow() - timedelta(days=90)).isoformat(),
            "metrics": q1_metrics
        }
        
        response = await client.post(f"/api/billing/ratings/supplier/{supplier_id}/calculate", json=q1_rating_data)
        assert response.status_code == 201
        
        q1_rating = response.json()
        assert q1_rating["rating_tier"] == "bronze"
        assert q1_rating["commission_discount_rate"] == 0.05
        
        # Generate Q1 orders and statement
        q1_orders = [{"amount": 25000, "day": i*7} for i in range(12)]  # Weekly orders
        q1_commission_total = await self._process_quarter_orders(client, supplier_id, q1_orders, -120)
        
        # Quarter 2: Improving performance (Silver tier)
        q2_metrics = {
            "fulfillment_rate": 0.89,
            "on_time_delivery_rate": 0.86,
            "quality_score": 3.8,
            "customer_satisfaction_score": 3.6,
            "response_time_score": 3.4
        }
        
        q2_rating_data = {
            "rating_period_start": (datetime.utcnow() - timedelta(days=90)).isoformat(),
            "rating_period_end": (datetime.utcnow() - timedelta(days=60)).isoformat(),
            "metrics": q2_metrics
        }
        
        response = await client.post(f"/api/billing/ratings/supplier/{supplier_id}/calculate", json=q2_rating_data)
        q2_rating = response.json()
        assert q2_rating["rating_tier"] == "silver"
        assert q2_rating["commission_discount_rate"] == 0.10
        
        q2_orders = [{"amount": 28000, "day": i*7} for i in range(12)]
        q2_commission_total = await self._process_quarter_orders(client, supplier_id, q2_orders, -90)
        
        # Quarter 3: Good performance (Gold tier)
        q3_metrics = {
            "fulfillment_rate": 0.95,
            "on_time_delivery_rate": 0.92,
            "quality_score": 4.3,
            "customer_satisfaction_score": 4.1,
            "response_time_score": 3.9
        }
        
        q3_rating_data = {
            "rating_period_start": (datetime.utcnow() - timedelta(days=60)).isoformat(),
            "rating_period_end": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "metrics": q3_metrics
        }
        
        response = await client.post(f"/api/billing/ratings/supplier/{supplier_id}/calculate", json=q3_rating_data)
        q3_rating = response.json()
        assert q3_rating["rating_tier"] == "gold"
        assert q3_rating["commission_discount_rate"] == 0.15
        
        q3_orders = [{"amount": 32000, "day": i*7} for i in range(12)]
        q3_commission_total = await self._process_quarter_orders(client, supplier_id, q3_orders, -60)
        
        # Quarter 4: Excellent performance (Platinum tier)
        q4_metrics = {
            "fulfillment_rate": 0.98,
            "on_time_delivery_rate": 0.96,
            "quality_score": 4.7,
            "customer_satisfaction_score": 4.6,
            "response_time_score": 4.4
        }
        
        q4_rating_data = {
            "rating_period_start": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "rating_period_end": datetime.utcnow().isoformat(),
            "metrics": q4_metrics
        }
        
        response = await client.post(f"/api/billing/ratings/supplier/{supplier_id}/calculate", json=q4_rating_data)
        q4_rating = response.json()
        assert q4_rating["rating_tier"] == "platinum"
        assert q4_rating["commission_discount_rate"] == 0.20
        
        q4_orders = [{"amount": 35000, "day": i*7} for i in range(12)]
        q4_commission_total = await self._process_quarter_orders(client, supplier_id, q4_orders, -30)
        
        # Verify progression and savings
        assert q1_commission_total > q2_commission_total  # Same GMV, better discount
        assert q2_commission_total > q3_commission_total
        assert q3_commission_total > q4_commission_total
        
        # Calculate total savings from rating improvements
        base_commission = (q1_commission_total / 0.95)  # Remove bronze discount
        total_savings = (base_commission * 4) - (q1_commission_total + q2_commission_total + q3_commission_total + q4_commission_total)
        assert total_savings > 0
        
        # Verify rating history
        response = await client.get(f"/api/billing/ratings/supplier/{supplier_id}/history")
        assert response.status_code == 200
        
        rating_history = response.json()
        assert len(rating_history["ratings"]) == 4
        
        # Verify tier progression
        tiers = [r["rating_tier"] for r in rating_history["ratings"]]
        assert tiers == ["bronze", "silver", "gold", "platinum"]

    async def _process_quarter_orders(self, client: AsyncClient, supplier_id: str, orders: list, day_offset: int) -> Decimal:
        """Process orders for a quarter and return total commission"""
        total_commission = Decimal("0")
        
        for i, order in enumerate(orders):
            transaction_data = {
                "supplier_id": supplier_id,
                "order_id": str(uuid.uuid4()),
                "transaction_type": "commission",
                "order_amount": order["amount"],
                "commission_rate": 0.025,
                "additional_details": {
                    "order_date": (datetime.utcnow() + timedelta(days=day_offset + order["day"])).isoformat()
                }
            }
            
            response = await client.post("/api/billing/transactions/", json=transaction_data)
            assert response.status_code == 201
            
            transaction = response.json()
            total_commission += Decimal(str(transaction["commission_amount"]))
        
        return total_commission


class TestSubscriptionUpgradeDowngradeWorkflow:
    """Test subscription plan changes and their billing impact"""

    async def test_subscription_lifecycle_workflow(self, client: AsyncClient, test_session: AsyncSession, sample_subscription_plans):
        """
        Test complete subscription lifecycle:
        1. Start with Free plan
        2. Usage growth triggers upgrade to Professional
        3. Business expansion requires Enterprise upgrade
        4. Seasonal downturn leads to Professional downgrade
        5. Pro-rated billing for plan changes
        """
        supplier_id = str(uuid.uuid4())
        
        # Step 1: Start with Free plan
        free_plan = next(p for p in sample_subscription_plans if p.plan_type == "free")
        
        subscription_data = {
            "subscription_plan_id": str(free_plan.id),
            "auto_renew": True
        }
        
        response = await client.post(f"/api/billing/subscriptions/supplier/{supplier_id}/subscribe", json=subscription_data)
        assert response.status_code == 201
        
        # Step 2: Simulate usage growth on Free plan
        for i in range(80):  # Near the 100 transaction limit
            usage_data = {
                "usage_increment": 1,
                "usage_type": "transaction",
                "metadata": {"transaction_id": str(uuid.uuid4())}
            }
            
            response = await client.post(f"/api/billing/subscriptions/supplier/{supplier_id}/usage", json=usage_data)
            assert response.status_code == 200
        
        # Check current usage
        response = await client.get(f"/api/billing/subscriptions/supplier/{supplier_id}")
        subscription = response.json()
        assert subscription["usage_count"] == 80
        
        # Step 3: Upgrade to Professional (mid-month)
        professional_plan = next(p for p in sample_subscription_plans if p.plan_type == "professional")
        upgrade_date = datetime.utcnow()
        
        upgrade_data = {
            "subscription_plan_id": str(professional_plan.id),
            "auto_renew": True,
            "effective_date": upgrade_date.isoformat()
        }
        
        response = await client.put(f"/api/billing/subscriptions/supplier/{supplier_id}", json=upgrade_data)
        assert response.status_code == 200
        
        upgraded_subscription = response.json()
        assert upgraded_subscription["monthly_fee"] == float(professional_plan.monthly_fee)
        
        # Step 4: High usage on Professional plan
        for i in range(500):  # Using Professional features heavily
            usage_data = {
                "usage_increment": 1,
                "usage_type": "api_call",
                "metadata": {"endpoint": "/api/analytics/advanced"}
            }
            
            response = await client.post(f"/api/billing/subscriptions/supplier/{supplier_id}/usage", json=usage_data)
            assert response.status_code == 200
        
        # Step 5: Upgrade to Enterprise for unlimited usage
        enterprise_plan = next(p for p in sample_subscription_plans if p.plan_type == "enterprise")
        
        enterprise_upgrade_data = {
            "subscription_plan_id": str(enterprise_plan.id),
            "auto_renew": True
        }
        
        response = await client.put(f"/api/billing/subscriptions/supplier/{supplier_id}", json=enterprise_upgrade_data)
        assert response.status_code == 200
        
        enterprise_subscription = response.json()
        assert enterprise_subscription["monthly_fee"] == float(enterprise_plan.monthly_fee)
        
        # Step 6: Simulate business downturn - downgrade to Professional
        downgrade_data = {
            "subscription_plan_id": str(professional_plan.id),
            "auto_renew": False,  # Manual renewal due to uncertainty
            "downgrade_reason": "Business downturn - cost optimization"
        }
        
        response = await client.put(f"/api/billing/subscriptions/supplier/{supplier_id}", json=downgrade_data)
        assert response.status_code == 200
        
        downgraded_subscription = response.json()
        assert downgraded_subscription["monthly_fee"] == float(professional_plan.monthly_fee)
        assert downgraded_subscription["auto_renew"] is False
        
        # Step 7: Generate pro-rated billing statement
        statement_data = {
            "billing_period_start": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "billing_period_end": datetime.utcnow().isoformat(),
            "include_adjustments": True,
            "pro_rate_plan_changes": True
        }
        
        response = await client.post(f"/api/billing/statements/generate/{supplier_id}", json=statement_data)
        assert response.status_code == 201
        
        statement = response.json()
        # Should include pro-rated charges for plan changes
        assert statement["subscription_fee"] > 0
        assert "pro_rated_charges" in statement.get("additional_details", {})


class TestPaymentFailureRecoveryWorkflow:
    """Test payment failure and recovery scenarios"""

    async def test_payment_failure_recovery_workflow(self, client: AsyncClient, test_session: AsyncSession, sample_monthly_statement):
        """
        Test payment failure and recovery:
        1. Initial payment attempt fails
        2. Retry with different payment method
        3. Partial payment processing
        4. Payment plan setup for large amounts
        5. Successful final payment and account restoration
        """
        supplier_id = sample_monthly_statement.supplier_id
        statement_id = sample_monthly_statement.id
        statement_amount = float(sample_monthly_statement.total_amount)
        
        # Step 1: Initial payment attempt fails
        payment_data = {
            "supplier_id": supplier_id,
            "billing_statement_id": str(statement_id),
            "payment_method": "credit_card",
            "payment_gateway": "ecpay",
            "payment_amount": statement_amount
        }
        
        response = await client.post("/api/billing/payments/", json=payment_data)
        assert response.status_code == 201
        
        initial_payment = response.json()
        
        # Simulate payment failure
        failure_update = {
            "status": "failed",
            "gateway_response": {
                "error_code": "INSUFFICIENT_FUNDS",
                "error_message": "信用卡餘額不足"
            },
            "notes": "Payment failed - insufficient funds"
        }
        
        response = await client.put(f"/api/billing/payments/{initial_payment['id']}/status", json=failure_update)
        assert response.status_code == 200
        
        failed_payment = response.json()
        assert failed_payment["status"] == "failed"
        
        # Step 2: Retry with bank transfer
        retry_payment_data = {
            "supplier_id": supplier_id,
            "billing_statement_id": str(statement_id),
            "payment_method": "bank_transfer",
            "payment_gateway": "manual",
            "payment_amount": statement_amount,
            "related_payment_id": initial_payment["id"]
        }
        
        response = await client.post("/api/billing/payments/", json=retry_payment_data)
        assert response.status_code == 201
        
        retry_payment = response.json()
        
        # Step 3: Process partial payment (60% of total)
        partial_amount = statement_amount * 0.6
        partial_payment_data = {
            "supplier_id": supplier_id,
            "billing_statement_id": str(statement_id),
            "payment_method": "bank_transfer",
            "payment_gateway": "manual",
            "payment_amount": partial_amount,
            "payment_type": "partial"
        }
        
        response = await client.post("/api/billing/payments/", json=partial_payment_data)
        assert response.status_code == 201
        
        partial_payment = response.json()
        
        # Update partial payment as completed
        partial_update = {
            "status": "completed",
            "gateway_response": {"bank_reference": "TF20240115001"},
            "notes": "Partial payment received via bank transfer"
        }
        
        response = await client.put(f"/api/billing/payments/{partial_payment['id']}/status", json=partial_update)
        assert response.status_code == 200
        
        # Step 4: Setup payment plan for remaining amount
        remaining_amount = statement_amount - partial_amount
        payment_plan_data = {
            "remaining_amount": remaining_amount,
            "installments": 2,
            "installment_frequency": "monthly",
            "first_installment_date": (datetime.utcnow() + timedelta(days=30)).isoformat()
        }
        
        response = await client.post(f"/api/billing/statements/{statement_id}/payment-plan", json=payment_plan_data)
        assert response.status_code == 201
        
        payment_plan = response.json()
        assert payment_plan["total_installments"] == 2
        assert payment_plan["installment_amount"] == remaining_amount / 2
        
        # Step 5: Process first installment
        first_installment_data = {
            "supplier_id": supplier_id,
            "billing_statement_id": str(statement_id),
            "payment_method": "credit_card",
            "payment_gateway": "newebpay",
            "payment_amount": remaining_amount / 2,
            "payment_type": "installment",
            "installment_number": 1
        }
        
        response = await client.post("/api/billing/payments/", json=first_installment_data)
        assert response.status_code == 201
        
        first_installment = response.json()
        
        # Complete first installment
        installment_update = {
            "status": "completed",
            "gateway_response": {"transaction_id": "NP20240215001"},
            "notes": "First installment completed"
        }
        
        response = await client.put(f"/api/billing/payments/{first_installment['id']}/status", json=installment_update)
        assert response.status_code == 200
        
        # Step 6: Complete final installment
        final_installment_data = {
            "supplier_id": supplier_id,
            "billing_statement_id": str(statement_id),
            "payment_method": "credit_card",
            "payment_gateway": "newebpay",
            "payment_amount": remaining_amount / 2,
            "payment_type": "installment",
            "installment_number": 2
        }
        
        response = await client.post("/api/billing/payments/", json=final_installment_data)
        assert response.status_code == 201
        
        final_installment = response.json()
        
        final_update = {
            "status": "completed",
            "gateway_response": {"transaction_id": "NP20240315001"},
            "notes": "Final installment completed - account fully settled"
        }
        
        response = await client.put(f"/api/billing/payments/{final_installment['id']}/status", json=final_update)
        assert response.status_code == 200
        
        # Step 7: Verify complete payment of statement
        response = await client.get(f"/api/billing/statements/{statement_id}")
        assert response.status_code == 200
        
        final_statement = response.json()
        # Should show as fully paid through various payment methods
        
        response = await client.get(f"/api/billing/payments/supplier/{supplier_id}")
        all_payments = response.json()
        
        total_paid = sum(p["payment_amount"] for p in all_payments["payments"] if p["status"] == "completed")
        assert abs(total_paid - statement_amount) < 0.01  # Account for rounding


class TestSeasonalBusinessVariationWorkflow:
    """Test billing adaptation to seasonal business variations"""

    async def test_seasonal_variation_workflow(self, client: AsyncClient, test_session: AsyncSession, sample_supplier_subscription, sample_rate_tiers):
        """
        Test seasonal business patterns:
        1. High season: Massive order volumes, tier upgrades
        2. Low season: Reduced volumes, potential downgrades
        3. Holiday peaks: Special promotions and adjustments
        4. Recovery period: Gradual volume restoration
        """
        supplier_id = sample_supplier_subscription.supplier_id
        
        # High Season (Q4): Restaurant peak season
        high_season_orders = [
            {"amount": 85000, "day": 1, "type": "holiday_catering"},
            {"amount": 92000, "day": 3, "type": "wedding_event"},
            {"amount": 78000, "day": 5, "type": "corporate_event"},
            {"amount": 105000, "day": 8, "type": "festival_supply"},
            {"amount": 98000, "day": 10, "type": "hotel_contract"},
            {"amount": 115000, "day": 12, "type": "chain_restaurant"},
            {"amount": 87000, "day": 15, "type": "catering_service"},
            {"amount": 103000, "day": 17, "type": "event_planning"},
            {"amount": 125000, "day": 20, "type": "holiday_special"},
            {"amount": 95000, "day": 22, "type": "bulk_order"},
            {"amount": 140000, "day": 25, "type": "new_year_prep"},
            {"amount": 160000, "day": 28, "type": "year_end_event"}
        ]
        
        high_season_gmv = await self._process_seasonal_orders(client, supplier_id, high_season_orders, "high_season")
        
        # Should reach Tier 5 (1.2% commission) with this volume
        assert high_season_gmv > Decimal("1000000")  # Over NT$1M
        
        # Generate high season statement with volume bonus
        high_season_statement = await self._generate_seasonal_statement(
            client, supplier_id, "High Season Q4", 
            adjustment_amount=-5000.00,  # Volume bonus
            adjustment_reason="High volume achievement bonus"
        )
        
        # Low Season (Q1): Post-holiday slowdown
        low_season_orders = [
            {"amount": 25000, "day": 1, "type": "regular_supply"},
            {"amount": 18000, "day": 5, "type": "maintenance_order"},
            {"amount": 22000, "day": 10, "type": "basic_ingredients"},
            {"amount": 15000, "day": 15, "type": "minimal_stock"},
            {"amount": 28000, "day": 20, "type": "gradual_recovery"},
            {"amount": 32000, "day": 25, "type": "small_event"}
        ]
        
        low_season_gmv = await self._process_seasonal_orders(client, supplier_id, low_season_orders, "low_season")
        
        # Should drop to Tier 2 (2.5% commission)
        assert low_season_gmv < Decimal("200000")
        
        # Generate low season statement with support credit
        low_season_statement = await self._generate_seasonal_statement(
            client, supplier_id, "Low Season Q1",
            adjustment_amount=-1000.00,  # Support credit
            adjustment_reason="Low season business support credit"
        )
        
        # Holiday Peak: Chinese New Year special orders
        holiday_orders = [
            {"amount": 55000, "day": 1, "type": "cny_preparation"},
            {"amount": 68000, "day": 3, "type": "family_gathering"},
            {"amount": 72000, "day": 5, "type": "restaurant_special"},
            {"amount": 45000, "day": 7, "type": "gift_packages"},
            {"amount": 58000, "day": 10, "type": "celebration_feast"},
            {"amount": 63000, "day": 12, "type": "traditional_items"}
        ]
        
        holiday_gmv = await self._process_seasonal_orders(client, supplier_id, holiday_orders, "holiday_peak")
        
        # Recovery Period: Business normalizing
        recovery_orders = [
            {"amount": 35000, "day": 1, "type": "recovery_order"},
            {"amount": 42000, "day": 5, "type": "new_contracts"},
            {"amount": 48000, "day": 10, "type": "expanding_business"},
            {"amount": 52000, "day": 15, "type": "steady_growth"},
            {"amount": 47000, "day": 20, "type": "market_return"},
            {"amount": 55000, "day": 25, "type": "confidence_building"}
        ]
        
        recovery_gmv = await self._process_seasonal_orders(client, supplier_id, recovery_orders, "recovery")
        
        # Verify seasonal impact on commissions
        await self._verify_seasonal_impact(test_session, supplier_id, {
            "high_season": high_season_gmv,
            "low_season": low_season_gmv,
            "holiday_peak": holiday_gmv,
            "recovery": recovery_gmv
        })

    async def _process_seasonal_orders(self, client: AsyncClient, supplier_id: str, orders: list, season: str) -> Decimal:
        """Process orders for a specific season"""
        total_gmv = Decimal("0")
        
        for order in orders:
            transaction_data = {
                "supplier_id": supplier_id,
                "order_id": str(uuid.uuid4()),
                "transaction_type": "commission",
                "order_amount": order["amount"],
                "commission_rate": 0.025,  # Will be adjusted by service
                "additional_details": {
                    "season": season,
                    "order_type": order["type"],
                    "order_date": (datetime.utcnow() - timedelta(days=order["day"])).isoformat()
                }
            }
            
            response = await client.post("/api/billing/transactions/", json=transaction_data)
            assert response.status_code == 201
            
            total_gmv += Decimal(str(order["amount"]))
        
        return total_gmv

    async def _generate_seasonal_statement(self, client: AsyncClient, supplier_id: str, period_name: str, adjustment_amount: float, adjustment_reason: str):
        """Generate statement for seasonal period with adjustments"""
        statement_data = {
            "billing_period_start": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "billing_period_end": datetime.utcnow().isoformat(),
            "include_adjustments": True,
            "period_name": period_name
        }
        
        response = await client.post(f"/api/billing/statements/generate/{supplier_id}", json=statement_data)
        assert response.status_code == 201
        
        statement = response.json()
        
        # Add seasonal adjustment
        adjustment_data = {
            "adjustment_type": "credit" if adjustment_amount < 0 else "charge",
            "amount": adjustment_amount,
            "reason": adjustment_reason,
            "notes": f"Seasonal adjustment for {period_name}"
        }
        
        response = await client.post(f"/api/billing/statements/{statement['id']}/adjustments", json=adjustment_data)
        assert response.status_code == 201
        
        return response.json()

    async def _verify_seasonal_impact(self, test_session: AsyncSession, supplier_id: str, seasonal_gmv: dict):
        """Verify the impact of seasonal variations on billing"""
        # High season should have lowest effective commission rate
        # Low season should have highest effective commission rate
        # This tests the tier system's response to volume changes
        
        stmt = select(BillingTransaction).where(
            BillingTransaction.supplier_id == supplier_id
        )
        result = await test_session.execute(stmt)
        transactions = result.scalars().all()
        
        # Group by season
        seasonal_transactions = {}
        for transaction in transactions:
            season = transaction.additional_details.get("season", "unknown")
            if season not in seasonal_transactions:
                seasonal_transactions[season] = []
            seasonal_transactions[season].append(transaction)
        
        # Verify commission rates reflect volume tiers
        for season, txns in seasonal_transactions.items():
            if season in seasonal_gmv:
                avg_commission_rate = sum(t.commission_rate for t in txns) / len(txns)
                # Higher volume should result in lower commission rates
                assert avg_commission_rate > 0