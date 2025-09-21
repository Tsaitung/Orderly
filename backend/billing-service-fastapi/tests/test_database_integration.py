"""
Comprehensive database integration tests for all 8 billing tables
Tests CRUD operations, relationships, constraints, and business logic
"""
import pytest
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing_rate_config import BillingRateConfig
from app.models.transaction_rate_tier import TransactionRateTier
from app.models.subscription_plan import SubscriptionPlan
from app.models.supplier_subscription import SupplierSubscription
from app.models.billing_transaction import BillingTransaction
from app.models.monthly_billing_statement import MonthlyBillingStatement
from app.models.payment_record import PaymentRecord
from app.models.supplier_rating import SupplierRating


class TestBillingRateConfigModel:
    """Test billing_rate_configs table operations"""

    async def test_create_rate_config(self, test_session: AsyncSession):
        """Test creating a rate configuration"""
        config = BillingRateConfig(
            config_name="Test Commission Rate",
            config_type="commission",
            is_active=True,
            base_rate=Decimal("0.030"),
            min_amount=Decimal("5.00"),
            max_amount=Decimal("500.00"),
            effective_from=datetime.utcnow(),
            target_supplier_type="premium",
            min_monthly_gmv=Decimal("5000.00"),
            max_monthly_gmv=Decimal("50000.00"),
            additional_config={"auto_apply": True, "tier": "premium"},
            created_by="test_admin",
            approval_status="draft"
        )
        
        test_session.add(config)
        await test_session.commit()
        await test_session.refresh(config)
        
        assert config.id is not None
        assert config.config_name == "Test Commission Rate"
        assert config.base_rate == Decimal("0.030")
        assert config.is_active is True
        assert config.approval_status == "draft"

    async def test_rate_config_business_logic(self, test_session: AsyncSession):
        """Test rate configuration business logic methods"""
        config = BillingRateConfig(
            config_name="Premium Rate",
            config_type="commission",
            is_active=True,
            base_rate=Decimal("0.025"),
            min_amount=Decimal("10.00"),
            max_amount=Decimal("1000.00"),
            effective_from=datetime.utcnow(),
            target_supplier_type="premium",
            min_monthly_gmv=Decimal("10000.00"),
            max_monthly_gmv=Decimal("100000.00"),
            created_by="system",
            approval_status="approved"
        )
        test_session.add(config)
        await test_session.commit()
        await test_session.refresh(config)
        
        # Test applicability checks
        assert config.is_applicable_to_supplier("premium", 50000.0) is True
        assert config.is_applicable_to_supplier("standard", 50000.0) is False  # Wrong type
        assert config.is_applicable_to_supplier("premium", 5000.0) is False   # Below min GMV
        assert config.is_applicable_to_supplier("premium", 150000.0) is False # Above max GMV
        
        # Test fee calculation
        fee_1000 = config.calculate_fee(1000.0)  # 1000 * 0.025 = 25.0
        assert fee_1000 == 25.0
        
        fee_small = config.calculate_fee(200.0)  # 200 * 0.025 = 5.0, but min is 10.0
        assert fee_small == 10.0
        
        fee_large = config.calculate_fee(50000.0)  # 50000 * 0.025 = 1250.0, but max is 1000.0
        assert fee_large == 1000.0

    async def test_rate_config_validation(self, test_session: AsyncSession):
        """Test rate configuration validation and constraints"""
        # Test version increment
        config1 = BillingRateConfig(
            config_name="Versioned Rate",
            config_type="commission",
            base_rate=Decimal("0.020"),
            created_by="admin",
            approval_status="approved",
            version=1
        )
        test_session.add(config1)
        await test_session.commit()
        await test_session.refresh(config1)
        
        # Create new version
        config2 = BillingRateConfig(
            config_name="Versioned Rate v2",
            config_type="commission",
            base_rate=Decimal("0.022"),
            created_by="admin",
            approval_status="draft",
            version=2,
            parent_config_id=str(config1.id)
        )
        test_session.add(config2)
        await test_session.commit()
        await test_session.refresh(config2)
        
        assert config2.version == 2
        assert config2.parent_config_id == str(config1.id)


class TestTransactionRateTierModel:
    """Test transaction_rate_tiers table operations"""

    async def test_create_rate_tiers(self, test_session: AsyncSession):
        """Test creating commission rate tiers"""
        tier = TransactionRateTier(
            tier_name="Premium Tier",
            min_monthly_gmv=Decimal("100000"),
            max_monthly_gmv=Decimal("500000"),
            commission_rate=Decimal("0.018"),
            tier_order=3,
            is_active=True,
            effective_from=datetime.utcnow(),
            created_by="system"
        )
        
        test_session.add(tier)
        await test_session.commit()
        await test_session.refresh(tier)
        
        assert tier.id is not None
        assert tier.tier_name == "Premium Tier"
        assert tier.commission_rate == Decimal("0.018")
        assert tier.tier_order == 3

    async def test_tier_gmv_range_logic(self, test_session: AsyncSession):
        """Test GMV range validation and tier selection logic"""
        tiers = [
            TransactionRateTier(
                tier_name="Bronze",
                min_monthly_gmv=Decimal("0"),
                max_monthly_gmv=Decimal("50000"),
                commission_rate=Decimal("0.030"),
                tier_order=1,
                is_active=True,
                created_by="system"
            ),
            TransactionRateTier(
                tier_name="Silver",
                min_monthly_gmv=Decimal("50001"),
                max_monthly_gmv=Decimal("200000"),
                commission_rate=Decimal("0.025"),
                tier_order=2,
                is_active=True,
                created_by="system"
            ),
            TransactionRateTier(
                tier_name="Gold",
                min_monthly_gmv=Decimal("200001"),
                max_monthly_gmv=None,  # No upper limit
                commission_rate=Decimal("0.020"),
                tier_order=3,
                is_active=True,
                created_by="system"
            )
        ]
        
        for tier in tiers:
            test_session.add(tier)
        await test_session.commit()
        
        # Test tier selection by GMV
        stmt = select(TransactionRateTier).where(
            TransactionRateTier.is_active == True,
            TransactionRateTier.min_monthly_gmv <= 30000,
            (TransactionRateTier.max_monthly_gmv >= 30000) | (TransactionRateTier.max_monthly_gmv.is_(None))
        ).order_by(TransactionRateTier.tier_order)
        
        result = await test_session.execute(stmt)
        selected_tier = result.scalar_one_or_none()
        
        assert selected_tier is not None
        assert selected_tier.tier_name == "Bronze"
        assert selected_tier.commission_rate == Decimal("0.030")


class TestSubscriptionPlanModel:
    """Test subscription_plans table operations"""

    async def test_create_subscription_plans(self, test_session: AsyncSession):
        """Test creating subscription plans"""
        plan = SubscriptionPlan(
            plan_name="Ultimate Plan",
            plan_type="ultimate",
            monthly_fee=Decimal("19999.00"),
            transaction_limit=None,  # Unlimited
            feature_set={
                "everything": True,
                "white_label": True,
                "custom_development": True,
                "dedicated_account_manager": True
            },
            is_active=True,
            effective_from=datetime.utcnow(),
            created_by="product_team"
        )
        
        test_session.add(plan)
        await test_session.commit()
        await test_session.refresh(plan)
        
        assert plan.id is not None
        assert plan.plan_name == "Ultimate Plan"
        assert plan.monthly_fee == Decimal("19999.00")
        assert plan.transaction_limit is None
        assert plan.feature_set["white_label"] is True

    async def test_plan_feature_validation(self, test_session: AsyncSession, sample_subscription_plans):
        """Test subscription plan feature validation"""
        free_plan = next(p for p in sample_subscription_plans if p.plan_type == "free")
        enterprise_plan = next(p for p in sample_subscription_plans if p.plan_type == "enterprise")
        
        # Verify feature differences
        assert free_plan.feature_set.get("api_access") is None
        assert enterprise_plan.feature_set.get("api_access") is True
        assert enterprise_plan.feature_set.get("sla_guarantee") is True


class TestSupplierSubscriptionModel:
    """Test supplier_subscriptions table operations"""

    async def test_create_supplier_subscription(self, test_session: AsyncSession, sample_subscription_plans):
        """Test creating supplier subscription"""
        plan = sample_subscription_plans[1]  # Professional plan
        supplier_id = str(uuid.uuid4())
        
        subscription = SupplierSubscription(
            supplier_id=supplier_id,
            subscription_plan_id=plan.id,
            status="active",
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=365),
            auto_renew=True,
            monthly_fee=plan.monthly_fee,
            usage_count=0,
            created_by=supplier_id
        )
        
        test_session.add(subscription)
        await test_session.commit()
        await test_session.refresh(subscription)
        
        assert subscription.id is not None
        assert subscription.supplier_id == supplier_id
        assert subscription.status == "active"
        assert subscription.monthly_fee == plan.monthly_fee

    async def test_subscription_lifecycle(self, test_session: AsyncSession, sample_subscription_plans):
        """Test subscription status changes and lifecycle"""
        plan = sample_subscription_plans[0]  # Free plan
        supplier_id = str(uuid.uuid4())
        
        # Create subscription
        subscription = SupplierSubscription(
            supplier_id=supplier_id,
            subscription_plan_id=plan.id,
            status="pending",
            start_date=datetime.utcnow() + timedelta(days=1),  # Future start
            end_date=datetime.utcnow() + timedelta(days=366),
            auto_renew=False,
            monthly_fee=plan.monthly_fee,
            usage_count=0,
            created_by=supplier_id
        )
        test_session.add(subscription)
        await test_session.commit()
        await test_session.refresh(subscription)
        
        # Activate subscription
        subscription.status = "active"
        subscription.start_date = datetime.utcnow()
        await test_session.commit()
        
        # Test usage tracking
        subscription.usage_count += 50
        await test_session.commit()
        
        assert subscription.status == "active"
        assert subscription.usage_count == 50


class TestBillingTransactionModel:
    """Test billing_transactions table operations"""

    async def test_create_billing_transaction(self, test_session: AsyncSession):
        """Test creating billing transaction"""
        supplier_id = str(uuid.uuid4())
        order_id = str(uuid.uuid4())
        
        transaction = BillingTransaction(
            supplier_id=supplier_id,
            order_id=order_id,
            transaction_type="commission",
            order_amount=Decimal("25000.00"),
            commission_rate=Decimal("0.025"),
            commission_amount=Decimal("625.00"),
            net_amount=Decimal("24375.00"),
            status="completed",
            transaction_date=datetime.utcnow(),
            additional_details={
                "order_items": 15,
                "customer_type": "restaurant",
                "payment_method": "monthly_billing"
            },
            created_by="order_webhook"
        )
        
        test_session.add(transaction)
        await test_session.commit()
        await test_session.refresh(transaction)
        
        assert transaction.id is not None
        assert transaction.order_amount == Decimal("25000.00")
        assert transaction.commission_amount == Decimal("625.00")
        assert transaction.status == "completed"

    async def test_transaction_aggregation(self, test_session: AsyncSession, sample_billing_transactions):
        """Test transaction aggregation queries"""
        supplier_id = sample_billing_transactions[0].supplier_id
        
        # Test total GMV calculation
        stmt = select(func.sum(BillingTransaction.order_amount)).where(
            BillingTransaction.supplier_id == supplier_id,
            BillingTransaction.status == "completed"
        )
        result = await test_session.execute(stmt)
        total_gmv = result.scalar()
        
        assert total_gmv is not None
        assert total_gmv > 0
        
        # Test commission total
        stmt = select(func.sum(BillingTransaction.commission_amount)).where(
            BillingTransaction.supplier_id == supplier_id,
            BillingTransaction.status == "completed"
        )
        result = await test_session.execute(stmt)
        total_commission = result.scalar()
        
        assert total_commission is not None
        assert total_commission > 0

    async def test_transaction_status_workflow(self, test_session: AsyncSession):
        """Test transaction status changes"""
        supplier_id = str(uuid.uuid4())
        
        transaction = BillingTransaction(
            supplier_id=supplier_id,
            order_id=str(uuid.uuid4()),
            transaction_type="commission",
            order_amount=Decimal("10000.00"),
            commission_rate=Decimal("0.025"),
            commission_amount=Decimal("250.00"),
            net_amount=Decimal("9750.00"),
            status="pending",
            transaction_date=datetime.utcnow(),
            created_by="order_webhook"
        )
        test_session.add(transaction)
        await test_session.commit()
        await test_session.refresh(transaction)
        
        # Update status
        transaction.status = "processing"
        await test_session.commit()
        
        transaction.status = "completed"
        await test_session.commit()
        
        assert transaction.status == "completed"


class TestMonthlyBillingStatementModel:
    """Test monthly_billing_statements table operations"""

    async def test_create_monthly_statement(self, test_session: AsyncSession):
        """Test creating monthly billing statement"""
        supplier_id = str(uuid.uuid4())
        
        statement = MonthlyBillingStatement(
            supplier_id=supplier_id,
            billing_period_start=datetime.utcnow() - timedelta(days=30),
            billing_period_end=datetime.utcnow(),
            total_gmv=Decimal("150000.00"),
            total_orders=45,
            commission_amount=Decimal("3750.00"),
            subscription_fee=Decimal("3999.00"),
            adjustment_amount=Decimal("-200.00"),  # Credit adjustment
            total_amount=Decimal("7549.00"),
            status="draft",
            generated_by="monthly_job"
        )
        
        test_session.add(statement)
        await test_session.commit()
        await test_session.refresh(statement)
        
        assert statement.id is not None
        assert statement.total_gmv == Decimal("150000.00")
        assert statement.total_amount == Decimal("7549.00")
        assert statement.status == "draft"

    async def test_statement_finalization(self, test_session: AsyncSession, sample_monthly_statement):
        """Test statement finalization process"""
        # Initially should be finalized
        assert sample_monthly_statement.status == "finalized"
        
        # Test that finalized statements have required fields
        assert sample_monthly_statement.total_gmv is not None
        assert sample_monthly_statement.commission_amount is not None
        assert sample_monthly_statement.total_amount is not None
        assert sample_monthly_statement.billing_period_start is not None
        assert sample_monthly_statement.billing_period_end is not None


class TestPaymentRecordModel:
    """Test payment_records table operations"""

    async def test_create_payment_record(self, test_session: AsyncSession, sample_monthly_statement):
        """Test creating payment record"""
        payment = PaymentRecord(
            supplier_id=sample_monthly_statement.supplier_id,
            billing_statement_id=sample_monthly_statement.id,
            payment_method="credit_card",
            payment_gateway="newebpay",
            payment_amount=sample_monthly_statement.total_amount,
            gateway_transaction_id=f"NP{uuid.uuid4().hex[:12]}",
            gateway_fee=Decimal("75.00"),
            net_amount=sample_monthly_statement.total_amount - Decimal("75.00"),
            status="pending",
            payment_date=datetime.utcnow(),
            gateway_response={"status": "pending", "auth_code": "AUTH123"},
            processed_by="newebpay_webhook"
        )
        
        test_session.add(payment)
        await test_session.commit()
        await test_session.refresh(payment)
        
        assert payment.id is not None
        assert payment.payment_gateway == "newebpay"
        assert payment.status == "pending"
        assert payment.net_amount == sample_monthly_statement.total_amount - Decimal("75.00")

    async def test_payment_status_transitions(self, test_session: AsyncSession, sample_payment_record):
        """Test payment status transitions"""
        # Initially completed
        assert sample_payment_record.status == "completed"
        
        # Test refund scenario
        refund_payment = PaymentRecord(
            supplier_id=sample_payment_record.supplier_id,
            billing_statement_id=sample_payment_record.billing_statement_id,
            payment_method="refund",
            payment_gateway=sample_payment_record.payment_gateway,
            payment_amount=-sample_payment_record.payment_amount,  # Negative for refund
            gateway_transaction_id=f"REF{uuid.uuid4().hex[:8]}",
            status="completed",
            payment_date=datetime.utcnow(),
            related_payment_id=sample_payment_record.id,
            processed_by="admin_refund"
        )
        
        test_session.add(refund_payment)
        await test_session.commit()
        await test_session.refresh(refund_payment)
        
        assert refund_payment.payment_amount < 0
        assert refund_payment.related_payment_id == sample_payment_record.id


class TestSupplierRatingModel:
    """Test supplier_ratings table operations"""

    async def test_create_supplier_rating(self, test_session: AsyncSession):
        """Test creating supplier rating"""
        supplier_id = str(uuid.uuid4())
        
        rating = SupplierRating(
            supplier_id=supplier_id,
            rating_period_start=datetime.utcnow() - timedelta(days=30),
            rating_period_end=datetime.utcnow(),
            fulfillment_rate=Decimal("0.98"),
            on_time_delivery_rate=Decimal("0.95"),
            quality_score=Decimal("4.7"),
            customer_satisfaction_score=Decimal("4.5"),
            response_time_score=Decimal("4.2"),
            overall_rating=Decimal("4.50"),
            rating_tier="platinum",
            commission_discount_rate=Decimal("0.20"),
            improvement_areas=["response_time"],
            is_active=True,
            calculated_by="rating_engine_v2"
        )
        
        test_session.add(rating)
        await test_session.commit()
        await test_session.refresh(rating)
        
        assert rating.id is not None
        assert rating.overall_rating == Decimal("4.50")
        assert rating.rating_tier == "platinum"
        assert rating.commission_discount_rate == Decimal("0.20")

    async def test_rating_tier_calculation(self, test_session: AsyncSession):
        """Test rating tier assignment based on scores"""
        test_cases = [
            {
                "scores": [Decimal("0.85"), Decimal("0.80"), Decimal("3.5"), Decimal("3.2"), Decimal("3.0")],
                "expected_tier": "bronze",
                "expected_discount": Decimal("0.05")
            },
            {
                "scores": [Decimal("0.90"), Decimal("0.88"), Decimal("4.0"), Decimal("4.0"), Decimal("3.8")],
                "expected_tier": "silver",
                "expected_discount": Decimal("0.10")
            },
            {
                "scores": [Decimal("0.95"), Decimal("0.92"), Decimal("4.5"), Decimal("4.3"), Decimal("4.0")],
                "expected_tier": "gold",
                "expected_discount": Decimal("0.15")
            },
            {
                "scores": [Decimal("0.98"), Decimal("0.96"), Decimal("4.8"), Decimal("4.7"), Decimal("4.5")],
                "expected_tier": "platinum",
                "expected_discount": Decimal("0.20")
            }
        ]
        
        for i, case in enumerate(test_cases):
            supplier_id = str(uuid.uuid4())
            fulfillment, delivery, quality, satisfaction, response = case["scores"]
            
            # Calculate overall rating (weighted average)
            overall = (fulfillment * Decimal("0.25") + 
                      delivery * Decimal("0.25") + 
                      (quality / 5) * Decimal("0.20") + 
                      (satisfaction / 5) * Decimal("0.20") + 
                      (response / 5) * Decimal("0.10"))
            
            rating = SupplierRating(
                supplier_id=supplier_id,
                rating_period_start=datetime.utcnow() - timedelta(days=30),
                rating_period_end=datetime.utcnow(),
                fulfillment_rate=fulfillment,
                on_time_delivery_rate=delivery,
                quality_score=quality,
                customer_satisfaction_score=satisfaction,
                response_time_score=response,
                overall_rating=overall,
                rating_tier=case["expected_tier"],
                commission_discount_rate=case["expected_discount"],
                is_active=True,
                calculated_by=f"test_case_{i}"
            )
            
            test_session.add(rating)
            await test_session.commit()
            await test_session.refresh(rating)
            
            assert rating.rating_tier == case["expected_tier"]
            assert rating.commission_discount_rate == case["expected_discount"]


class TestDatabaseRelationships:
    """Test relationships between tables"""

    async def test_subscription_to_plan_relationship(self, test_session: AsyncSession, sample_supplier_subscription, sample_subscription_plans):
        """Test supplier subscription to plan relationship"""
        # Load subscription with plan
        stmt = select(SupplierSubscription).where(
            SupplierSubscription.id == sample_supplier_subscription.id
        )
        result = await test_session.execute(stmt)
        subscription = result.scalar_one()
        
        # Load related plan
        stmt = select(SubscriptionPlan).where(
            SubscriptionPlan.id == subscription.subscription_plan_id
        )
        result = await test_session.execute(stmt)
        plan = result.scalar_one()
        
        assert plan.plan_type == "professional"
        assert subscription.monthly_fee == plan.monthly_fee

    async def test_statement_to_payment_relationship(self, test_session: AsyncSession, sample_payment_record, sample_monthly_statement):
        """Test billing statement to payment relationship"""
        assert sample_payment_record.billing_statement_id == sample_monthly_statement.id
        assert sample_payment_record.supplier_id == sample_monthly_statement.supplier_id

    async def test_supplier_data_consistency(self, test_session: AsyncSession, sample_supplier_subscription, sample_billing_transactions, sample_supplier_rating):
        """Test data consistency across supplier-related tables"""
        supplier_id = sample_supplier_subscription.supplier_id
        
        # Verify all records belong to same supplier
        assert all(t.supplier_id == supplier_id for t in sample_billing_transactions)
        assert sample_supplier_rating.supplier_id == supplier_id
        
        # Verify transaction count matches expectations
        stmt = select(func.count(BillingTransaction.id)).where(
            BillingTransaction.supplier_id == supplier_id
        )
        result = await test_session.execute(stmt)
        transaction_count = result.scalar()
        
        assert transaction_count == len(sample_billing_transactions)


class TestDatabaseConstraints:
    """Test database constraints and validation"""

    async def test_unique_constraints(self, test_session: AsyncSession):
        """Test unique constraints"""
        # This would test unique constraints if they exist
        # For now, we test logical uniqueness
        supplier_id = str(uuid.uuid4())
        period_start = datetime.utcnow() - timedelta(days=30)
        period_end = datetime.utcnow()
        
        # Create first rating
        rating1 = SupplierRating(
            supplier_id=supplier_id,
            rating_period_start=period_start,
            rating_period_end=period_end,
            fulfillment_rate=Decimal("0.95"),
            on_time_delivery_rate=Decimal("0.92"),
            quality_score=Decimal("4.5"),
            customer_satisfaction_score=Decimal("4.3"),
            response_time_score=Decimal("4.0"),
            overall_rating=Decimal("4.36"),
            rating_tier="gold",
            commission_discount_rate=Decimal("0.15"),
            is_active=True,
            calculated_by="test"
        )
        test_session.add(rating1)
        await test_session.commit()
        
        # Deactivate first rating before creating second
        rating1.is_active = False
        await test_session.commit()
        
        # Create second rating for same period
        rating2 = SupplierRating(
            supplier_id=supplier_id,
            rating_period_start=period_start,
            rating_period_end=period_end,
            fulfillment_rate=Decimal("0.96"),
            on_time_delivery_rate=Decimal("0.93"),
            quality_score=Decimal("4.6"),
            customer_satisfaction_score=Decimal("4.4"),
            response_time_score=Decimal("4.1"),
            overall_rating=Decimal("4.42"),
            rating_tier="gold",
            commission_discount_rate=Decimal("0.15"),
            is_active=True,
            calculated_by="test"
        )
        test_session.add(rating2)
        await test_session.commit()
        
        # Should succeed because first rating is inactive
        assert rating1.is_active is False
        assert rating2.is_active is True

    async def test_null_constraints(self, test_session: AsyncSession):
        """Test NOT NULL constraints"""
        # Test that required fields are enforced
        with pytest.raises(Exception):  # Should fail due to missing required field
            incomplete_config = BillingRateConfig(
                # Missing config_name and config_type
                base_rate=Decimal("0.025"),
                created_by="test"
            )
            test_session.add(incomplete_config)
            await test_session.commit()


class TestDatabasePerformance:
    """Test database performance with larger datasets"""

    async def test_bulk_transaction_insert(self, test_session: AsyncSession):
        """Test bulk insert performance"""
        supplier_id = str(uuid.uuid4())
        transactions = []
        
        # Create 100 transactions
        for i in range(100):
            transaction = BillingTransaction(
                supplier_id=supplier_id,
                order_id=str(uuid.uuid4()),
                transaction_type="commission",
                order_amount=Decimal(f"{1000 + i * 100}.00"),
                commission_rate=Decimal("0.025"),
                commission_amount=Decimal(f"{25 + i * 2.5}"),
                net_amount=Decimal(f"{975 + i * 97.5}"),
                status="completed",
                transaction_date=datetime.utcnow() - timedelta(hours=i),
                created_by="bulk_test"
            )
            transactions.append(transaction)
        
        # Bulk insert
        test_session.add_all(transactions)
        await test_session.commit()
        
        # Verify count
        stmt = select(func.count(BillingTransaction.id)).where(
            BillingTransaction.supplier_id == supplier_id
        )
        result = await test_session.execute(stmt)
        count = result.scalar()
        
        assert count == 100

    async def test_complex_aggregation_query(self, test_session: AsyncSession, large_transaction_dataset):
        """Test complex aggregation query performance"""
        supplier_id = large_transaction_dataset[0].supplier_id
        
        # Complex aggregation: monthly GMV with commission totals
        stmt = select(
            func.date_trunc('month', BillingTransaction.transaction_date).label('month'),
            func.sum(BillingTransaction.order_amount).label('monthly_gmv'),
            func.sum(BillingTransaction.commission_amount).label('monthly_commission'),
            func.count(BillingTransaction.id).label('transaction_count')
        ).where(
            BillingTransaction.supplier_id == supplier_id,
            BillingTransaction.status == "completed"
        ).group_by(
            func.date_trunc('month', BillingTransaction.transaction_date)
        ).order_by(
            func.date_trunc('month', BillingTransaction.transaction_date)
        )
        
        result = await test_session.execute(stmt)
        monthly_data = result.all()
        
        assert len(monthly_data) > 0
        for row in monthly_data:
            assert row.monthly_gmv > 0
            assert row.monthly_commission > 0
            assert row.transaction_count > 0