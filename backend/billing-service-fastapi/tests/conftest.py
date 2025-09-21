"""
Test configuration and fixtures for billing service comprehensive testing
"""
import pytest
import asyncio
from typing import AsyncGenerator, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from httpx import AsyncClient
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from app.core.database import get_async_session
from app.main import app
from app.models.base import Base
from app.models.billing_rate_config import BillingRateConfig
from app.models.transaction_rate_tier import TransactionRateTier
from app.models.subscription_plan import SubscriptionPlan
from app.models.supplier_subscription import SupplierSubscription
from app.models.billing_transaction import BillingTransaction
from app.models.monthly_billing_statement import MonthlyBillingStatement
from app.models.payment_record import PaymentRecord
from app.models.supplier_rating import SupplierRating


# Test database configuration
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/orderly_billing_test"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create async engine for testing"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=NullPool,
        echo=True  # Enable for debugging
    )
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture(scope="function")
async def test_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create async session for testing"""
    async_session = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture(scope="function")
async def client(test_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create HTTP client for testing with dependency override"""
    
    async def override_get_db():
        yield test_session
    
    app.dependency_overrides[get_async_session] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()


# Test data fixtures
@pytest.fixture
async def sample_rate_config(test_session: AsyncSession) -> BillingRateConfig:
    """Create sample rate configuration"""
    config = BillingRateConfig(
        config_name="Standard Commission Rate",
        config_type="commission",
        is_active=True,
        base_rate=Decimal("0.025"),  # 2.5%
        min_amount=Decimal("10.00"),
        max_amount=Decimal("1000.00"),
        effective_from=datetime.utcnow(),
        target_supplier_type="standard",
        min_monthly_gmv=Decimal("10000.00"),
        max_monthly_gmv=Decimal("100000.00"),
        additional_config={"tier": "standard", "auto_apply": True},
        created_by="test_admin",
        approval_status="approved",
        approved_by="test_approver",
        approved_at=datetime.utcnow()
    )
    test_session.add(config)
    await test_session.commit()
    await test_session.refresh(config)
    return config


@pytest.fixture
async def sample_rate_tiers(test_session: AsyncSession) -> list[TransactionRateTier]:
    """Create sample commission rate tiers"""
    tiers = [
        TransactionRateTier(
            tier_name="Tier 1",
            min_monthly_gmv=Decimal("0"),
            max_monthly_gmv=Decimal("50000"),
            commission_rate=Decimal("0.030"),  # 3.0%
            tier_order=1,
            is_active=True,
            created_by="system"
        ),
        TransactionRateTier(
            tier_name="Tier 2", 
            min_monthly_gmv=Decimal("50001"),
            max_monthly_gmv=Decimal("200000"),
            commission_rate=Decimal("0.025"),  # 2.5%
            tier_order=2,
            is_active=True,
            created_by="system"
        ),
        TransactionRateTier(
            tier_name="Tier 3",
            min_monthly_gmv=Decimal("200001"),
            max_monthly_gmv=Decimal("500000"),
            commission_rate=Decimal("0.020"),  # 2.0%
            tier_order=3,
            is_active=True,
            created_by="system"
        ),
        TransactionRateTier(
            tier_name="Tier 4",
            min_monthly_gmv=Decimal("500001"),
            max_monthly_gmv=Decimal("1000000"),
            commission_rate=Decimal("0.015"),  # 1.5%
            tier_order=4,
            is_active=True,
            created_by="system"
        ),
        TransactionRateTier(
            tier_name="Tier 5",
            min_monthly_gmv=Decimal("1000001"),
            max_monthly_gmv=None,  # No upper limit
            commission_rate=Decimal("0.012"),  # 1.2%
            tier_order=5,
            is_active=True,
            created_by="system"
        )
    ]
    
    for tier in tiers:
        test_session.add(tier)
    await test_session.commit()
    
    for tier in tiers:
        await test_session.refresh(tier)
    
    return tiers


@pytest.fixture
async def sample_subscription_plans(test_session: AsyncSession) -> list[SubscriptionPlan]:
    """Create sample subscription plans"""
    plans = [
        SubscriptionPlan(
            plan_name="Free Plan",
            plan_type="free",
            monthly_fee=Decimal("0.00"),
            transaction_limit=100,
            feature_set={"basic_dashboard": True, "email_support": True},
            is_active=True,
            created_by="system"
        ),
        SubscriptionPlan(
            plan_name="Professional Plan",
            plan_type="professional",
            monthly_fee=Decimal("3999.00"),
            transaction_limit=1000,
            feature_set={
                "advanced_dashboard": True,
                "priority_support": True,
                "analytics": True,
                "api_access": True
            },
            is_active=True,
            created_by="system"
        ),
        SubscriptionPlan(
            plan_name="Enterprise Plan",
            plan_type="enterprise",
            monthly_fee=Decimal("9999.00"),
            transaction_limit=None,  # Unlimited
            feature_set={
                "full_dashboard": True,
                "dedicated_support": True,
                "advanced_analytics": True,
                "api_access": True,
                "custom_integrations": True,
                "sla_guarantee": True
            },
            is_active=True,
            created_by="system"
        )
    ]
    
    for plan in plans:
        test_session.add(plan)
    await test_session.commit()
    
    for plan in plans:
        await test_session.refresh(plan)
    
    return plans


@pytest.fixture
async def sample_supplier_subscription(test_session: AsyncSession, sample_subscription_plans) -> SupplierSubscription:
    """Create sample supplier subscription"""
    professional_plan = next(p for p in sample_subscription_plans if p.plan_type == "professional")
    
    subscription = SupplierSubscription(
        supplier_id=str(uuid.uuid4()),
        subscription_plan_id=professional_plan.id,
        status="active",
        start_date=datetime.utcnow() - timedelta(days=30),
        end_date=datetime.utcnow() + timedelta(days=335),  # ~11 months remaining
        auto_renew=True,
        monthly_fee=professional_plan.monthly_fee,
        usage_count=450,  # Under limit
        created_by="test_supplier"
    )
    test_session.add(subscription)
    await test_session.commit()
    await test_session.refresh(subscription)
    return subscription


@pytest.fixture
async def sample_supplier_rating(test_session: AsyncSession, sample_supplier_subscription) -> SupplierRating:
    """Create sample supplier rating"""
    rating = SupplierRating(
        supplier_id=sample_supplier_subscription.supplier_id,
        rating_period_start=datetime.utcnow() - timedelta(days=30),
        rating_period_end=datetime.utcnow(),
        fulfillment_rate=Decimal("0.95"),  # 95%
        on_time_delivery_rate=Decimal("0.92"),  # 92%
        quality_score=Decimal("4.5"),  # 4.5/5
        customer_satisfaction_score=Decimal("4.3"),  # 4.3/5
        response_time_score=Decimal("4.0"),  # 4.0/5
        overall_rating=Decimal("4.36"),  # Calculated average
        rating_tier="gold",
        commission_discount_rate=Decimal("0.15"),  # 15% discount
        is_active=True,
        calculated_by="automated_system"
    )
    test_session.add(rating)
    await test_session.commit()
    await test_session.refresh(rating)
    return rating


@pytest.fixture
async def sample_billing_transactions(test_session: AsyncSession, sample_supplier_subscription) -> list[BillingTransaction]:
    """Create sample billing transactions"""
    transactions = []
    base_date = datetime.utcnow() - timedelta(days=30)
    
    for i in range(10):
        transaction = BillingTransaction(
            supplier_id=sample_supplier_subscription.supplier_id,
            order_id=str(uuid.uuid4()),
            transaction_type="commission",
            order_amount=Decimal(f"{1000 + i * 500}.00"),
            commission_rate=Decimal("0.025"),
            commission_amount=Decimal(f"{25 + i * 12.5}"),
            net_amount=Decimal(f"{975 + i * 487.5}"),
            status="completed",
            transaction_date=base_date + timedelta(days=i * 3),
            created_by="order_webhook"
        )
        transactions.append(transaction)
        test_session.add(transaction)
    
    await test_session.commit()
    
    for transaction in transactions:
        await test_session.refresh(transaction)
    
    return transactions


@pytest.fixture
async def sample_monthly_statement(test_session: AsyncSession, sample_supplier_subscription, sample_billing_transactions) -> MonthlyBillingStatement:
    """Create sample monthly billing statement"""
    total_gmv = sum(t.order_amount for t in sample_billing_transactions)
    total_commission = sum(t.commission_amount for t in sample_billing_transactions)
    
    statement = MonthlyBillingStatement(
        supplier_id=sample_supplier_subscription.supplier_id,
        billing_period_start=datetime.utcnow() - timedelta(days=30),
        billing_period_end=datetime.utcnow(),
        total_gmv=total_gmv,
        total_orders=len(sample_billing_transactions),
        commission_amount=total_commission,
        subscription_fee=Decimal("3999.00"),
        adjustment_amount=Decimal("0.00"),
        total_amount=total_commission + Decimal("3999.00"),
        status="finalized",
        generated_by="automated_system"
    )
    test_session.add(statement)
    await test_session.commit()
    await test_session.refresh(statement)
    return statement


@pytest.fixture
async def sample_payment_record(test_session: AsyncSession, sample_monthly_statement) -> PaymentRecord:
    """Create sample payment record"""
    payment = PaymentRecord(
        supplier_id=sample_monthly_statement.supplier_id,
        billing_statement_id=sample_monthly_statement.id,
        payment_method="bank_transfer",
        payment_gateway="ecpay",
        payment_amount=sample_monthly_statement.total_amount,
        gateway_transaction_id=f"EC{uuid.uuid4().hex[:12]}",
        status="completed",
        payment_date=datetime.utcnow() - timedelta(days=5),
        processed_by="ecpay_webhook"
    )
    test_session.add(payment)
    await test_session.commit()
    await test_session.refresh(payment)
    return payment


# Helper fixtures for test data creation
@pytest.fixture
def test_supplier_id() -> str:
    """Generate test supplier ID"""
    return str(uuid.uuid4())


@pytest.fixture
def test_order_data() -> Dict[str, Any]:
    """Generate test order data"""
    return {
        "order_id": str(uuid.uuid4()),
        "supplier_id": str(uuid.uuid4()),
        "customer_id": str(uuid.uuid4()),
        "order_amount": 15000.00,
        "order_date": datetime.utcnow().isoformat(),
        "status": "completed"
    }


@pytest.fixture
def test_payment_data() -> Dict[str, Any]:
    """Generate test payment data"""
    return {
        "payment_id": str(uuid.uuid4()),
        "amount": 25000.00,
        "currency": "TWD",
        "payment_method": "credit_card",
        "gateway": "ecpay"
    }


# Performance testing fixtures
@pytest.fixture
async def large_transaction_dataset(test_session: AsyncSession, sample_supplier_subscription) -> list[BillingTransaction]:
    """Create large dataset for performance testing"""
    transactions = []
    base_date = datetime.utcnow() - timedelta(days=90)
    
    # Create 1000 transactions for performance testing
    for i in range(1000):
        transaction = BillingTransaction(
            supplier_id=sample_supplier_subscription.supplier_id,
            order_id=str(uuid.uuid4()),
            transaction_type="commission",
            order_amount=Decimal(f"{500 + i * 10}.00"),
            commission_rate=Decimal("0.025"),
            commission_amount=Decimal(f"{12.5 + i * 0.25}"),
            net_amount=Decimal(f"{487.5 + i * 9.75}"),
            status="completed",
            transaction_date=base_date + timedelta(hours=i * 2),
            created_by="performance_test"
        )
        transactions.append(transaction)
        test_session.add(transaction)
        
        # Commit in batches to avoid memory issues
        if i % 100 == 99:
            await test_session.commit()
    
    await test_session.commit()
    return transactions


# Mock data for external service testing
@pytest.fixture
def mock_order_service_response():
    """Mock response from order service"""
    return {
        "order_id": str(uuid.uuid4()),
        "supplier_id": str(uuid.uuid4()),
        "customer_id": str(uuid.uuid4()),
        "total_amount": 25000.00,
        "status": "completed",
        "created_at": datetime.utcnow().isoformat(),
        "items": [
            {
                "product_id": str(uuid.uuid4()),
                "quantity": 10,
                "unit_price": 2500.00,
                "total_price": 25000.00
            }
        ]
    }


@pytest.fixture
def mock_payment_gateway_response():
    """Mock payment gateway callback response"""
    return {
        "transaction_id": f"EC{uuid.uuid4().hex[:12]}",
        "status": "success",
        "amount": 25000.00,
        "currency": "TWD",
        "payment_date": datetime.utcnow().isoformat(),
        "gateway_fee": 125.00,
        "net_amount": 24875.00
    }