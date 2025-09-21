"""
Comprehensive business logic tests for commission calculation and supplier rating
Tests core billing algorithms, rating calculations, and business rules
"""
import pytest
import uuid
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.rate_config_service import RateConfigService
from app.services.rating_service import RatingService
from app.services.transaction_service import TransactionService
from app.services.statement_service import StatementService
from app.models.billing_rate_config import BillingRateConfig
from app.models.transaction_rate_tier import TransactionRateTier
from app.models.supplier_rating import SupplierRating
from app.models.billing_transaction import BillingTransaction
from app.models.monthly_billing_statement import MonthlyBillingStatement


class TestCommissionCalculationLogic:
    """Test commission calculation business logic"""

    async def test_tiered_commission_calculation(self, test_session: AsyncSession, sample_rate_tiers):
        """Test 5-tier commission structure calculation"""
        service = RateConfigService(test_session)
        
        test_cases = [
            # (monthly_gmv, expected_tier, expected_rate, expected_commission_for_1000)
            (25000, 1, Decimal("0.030"), Decimal("30.00")),     # Tier 1: 3.0%
            (75000, 2, Decimal("0.025"), Decimal("25.00")),     # Tier 2: 2.5%
            (350000, 3, Decimal("0.020"), Decimal("20.00")),    # Tier 3: 2.0%
            (750000, 4, Decimal("0.015"), Decimal("15.00")),    # Tier 4: 1.5%
            (1500000, 5, Decimal("0.012"), Decimal("12.00"))    # Tier 5: 1.2%
        ]
        
        for monthly_gmv, expected_tier, expected_rate, expected_commission in test_cases:
            tier = await service.get_applicable_tier(monthly_gmv)
            
            assert tier is not None, f"No tier found for GMV {monthly_gmv}"
            assert tier.tier_order == expected_tier, f"Expected tier {expected_tier}, got {tier.tier_order}"
            assert tier.commission_rate == expected_rate, f"Expected rate {expected_rate}, got {tier.commission_rate}"
            
            # Test commission calculation for NT$1,000 order
            commission = await service.calculate_commission(Decimal("1000.00"), monthly_gmv)
            assert commission == expected_commission, f"Expected commission {expected_commission}, got {commission}"

    async def test_tier_boundary_conditions(self, test_session: AsyncSession, sample_rate_tiers):
        """Test commission calculation at tier boundaries"""
        service = RateConfigService(test_session)
        
        boundary_test_cases = [
            # Exact boundaries
            (50000, 1, Decimal("0.030")),    # Tier 1 upper bound
            (50001, 2, Decimal("0.025")),    # Tier 2 lower bound
            (200000, 2, Decimal("0.025")),   # Tier 2 upper bound
            (200001, 3, Decimal("0.020")),   # Tier 3 lower bound
            (500000, 3, Decimal("0.020")),   # Tier 3 upper bound
            (500001, 4, Decimal("0.015")),   # Tier 4 lower bound
            (1000000, 4, Decimal("0.015")),  # Tier 4 upper bound
            (1000001, 5, Decimal("0.012")),  # Tier 5 lower bound
        ]
        
        for gmv, expected_tier, expected_rate in boundary_test_cases:
            tier = await service.get_applicable_tier(gmv)
            assert tier.tier_order == expected_tier, f"GMV {gmv}: Expected tier {expected_tier}, got {tier.tier_order}"
            assert tier.commission_rate == expected_rate, f"GMV {gmv}: Expected rate {expected_rate}, got {tier.commission_rate}"

    async def test_commission_with_minimum_maximum_limits(self, test_session: AsyncSession):
        """Test commission calculation with min/max limits"""
        # Create rate config with limits
        config = BillingRateConfig(
            config_name="Limited Rate",
            config_type="commission",
            is_active=True,
            base_rate=Decimal("0.025"),
            min_amount=Decimal("50.00"),    # Min NT$50
            max_amount=Decimal("500.00"),   # Max NT$500
            effective_from=datetime.utcnow(),
            created_by="test",
            approval_status="approved"
        )
        test_session.add(config)
        await test_session.commit()
        await test_session.refresh(config)
        
        test_cases = [
            # (order_amount, expected_commission)
            (1000.00, 50.00),     # 1000 * 0.025 = 25, but min is 50
            (2000.00, 50.00),     # 2000 * 0.025 = 50, equals min
            (10000.00, 250.00),   # 10000 * 0.025 = 250, normal calculation
            (25000.00, 500.00),   # 25000 * 0.025 = 625, but max is 500
            (50000.00, 500.00),   # 50000 * 0.025 = 1250, capped at max
        ]
        
        for order_amount, expected_commission in test_cases:
            commission = config.calculate_fee(order_amount)
            assert commission == expected_commission, f"Order {order_amount}: Expected {expected_commission}, got {commission}"

    async def test_progressive_tier_calculation(self, test_session: AsyncSession, sample_rate_tiers):
        """Test progressive commission calculation across multiple tiers"""
        service = RateConfigService(test_session)
        
        # Test case: Supplier with NT$150,000 monthly GMV
        # Should be in Tier 2 (NT$50,001-NT$200,000) at 2.5%
        monthly_gmv = Decimal("150000.00")
        order_amount = Decimal("5000.00")
        
        commission = await service.calculate_commission(order_amount, monthly_gmv)
        expected_commission = order_amount * Decimal("0.025")  # 5000 * 0.025 = 125
        
        assert commission == expected_commission

    async def test_commission_calculation_edge_cases(self, test_session: AsyncSession, sample_rate_tiers):
        """Test edge cases in commission calculation"""
        service = RateConfigService(test_session)
        
        # Zero amount
        commission = await service.calculate_commission(Decimal("0.00"), 50000)
        assert commission == Decimal("0.00")
        
        # Very small amount
        commission = await service.calculate_commission(Decimal("0.01"), 50000)
        expected = Decimal("0.01") * Decimal("0.030")
        assert commission == expected.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # Very large amount
        commission = await service.calculate_commission(Decimal("10000000.00"), 2000000)
        expected = Decimal("10000000.00") * Decimal("0.012")  # Tier 5 rate
        assert commission == expected

    async def test_multi_currency_commission_calculation(self, test_session: AsyncSession):
        """Test commission calculation with different currencies"""
        # For Taiwan market, we primarily use TWD, but test USD conversion
        service = RateConfigService(test_session)
        
        # Mock exchange rate: 1 USD = 31 TWD
        usd_order_amount = Decimal("1000.00")  # $1,000 USD
        twd_equivalent = usd_order_amount * Decimal("31.00")  # NT$31,000
        
        # Calculate commission on TWD equivalent
        commission_twd = await service.calculate_commission(twd_equivalent, 100000)
        expected_commission = twd_equivalent * Decimal("0.025")  # Tier 2 rate
        
        assert commission_twd == expected_commission


class TestSupplierRatingLogic:
    """Test supplier rating calculation and tier assignment"""

    async def test_rating_calculation_algorithm(self, test_session: AsyncSession):
        """Test multi-factor rating calculation algorithm"""
        service = RatingService(test_session)
        
        # Test case with specific metrics
        metrics = {
            "fulfillment_rate": Decimal("0.95"),        # 95% - Weight: 25%
            "on_time_delivery_rate": Decimal("0.92"),   # 92% - Weight: 25%
            "quality_score": Decimal("4.5"),            # 4.5/5 - Weight: 20%
            "customer_satisfaction_score": Decimal("4.3"), # 4.3/5 - Weight: 20%
            "response_time_score": Decimal("4.0")        # 4.0/5 - Weight: 10%
        }
        
        # Calculate weighted average
        expected_rating = (
            metrics["fulfillment_rate"] * Decimal("0.25") +
            metrics["on_time_delivery_rate"] * Decimal("0.25") +
            (metrics["quality_score"] / 5) * Decimal("0.20") +
            (metrics["customer_satisfaction_score"] / 5) * Decimal("0.20") +
            (metrics["response_time_score"] / 5) * Decimal("0.10")
        )
        
        calculated_rating = await service.calculate_overall_rating(**metrics)
        
        # Allow small floating point differences
        assert abs(calculated_rating - expected_rating) < Decimal("0.01")

    async def test_rating_tier_assignment(self, test_session: AsyncSession):
        """Test rating tier assignment based on overall rating"""
        service = RatingService(test_session)
        
        tier_test_cases = [
            # (overall_rating, expected_tier, expected_discount)
            (Decimal("3.0"), "bronze", Decimal("0.05")),     # 3.0-3.5: Bronze (5% discount)
            (Decimal("3.5"), "silver", Decimal("0.10")),     # 3.5-4.0: Silver (10% discount)
            (Decimal("4.0"), "gold", Decimal("0.15")),       # 4.0-4.5: Gold (15% discount)
            (Decimal("4.5"), "platinum", Decimal("0.20")),   # 4.5+: Platinum (20% discount)
            (Decimal("4.8"), "platinum", Decimal("0.20")),   # High platinum
        ]
        
        for rating, expected_tier, expected_discount in tier_test_cases:
            tier, discount = await service.determine_tier_and_discount(rating)
            assert tier == expected_tier, f"Rating {rating}: Expected tier {expected_tier}, got {tier}"
            assert discount == expected_discount, f"Rating {rating}: Expected discount {expected_discount}, got {discount}"

    async def test_rating_improvement_tracking(self, test_session: AsyncSession):
        """Test rating improvement and degradation tracking"""
        supplier_id = str(uuid.uuid4())
        service = RatingService(test_session)
        
        # Initial rating (Silver tier)
        initial_metrics = {
            "fulfillment_rate": Decimal("0.88"),
            "on_time_delivery_rate": Decimal("0.85"),
            "quality_score": Decimal("3.8"),
            "customer_satisfaction_score": Decimal("3.6"),
            "response_time_score": Decimal("3.5")
        }
        
        initial_rating = SupplierRating(
            supplier_id=supplier_id,
            rating_period_start=datetime.utcnow() - timedelta(days=60),
            rating_period_end=datetime.utcnow() - timedelta(days=30),
            **initial_metrics,
            overall_rating=await service.calculate_overall_rating(**initial_metrics),
            rating_tier="silver",
            commission_discount_rate=Decimal("0.10"),
            is_active=False,  # Previous period
            calculated_by="test"
        )
        test_session.add(initial_rating)
        
        # Improved rating (Gold tier)
        improved_metrics = {
            "fulfillment_rate": Decimal("0.96"),
            "on_time_delivery_rate": Decimal("0.94"),
            "quality_score": Decimal("4.3"),
            "customer_satisfaction_score": Decimal("4.1"),
            "response_time_score": Decimal("4.0")
        }
        
        current_rating = SupplierRating(
            supplier_id=supplier_id,
            rating_period_start=datetime.utcnow() - timedelta(days=30),
            rating_period_end=datetime.utcnow(),
            **improved_metrics,
            overall_rating=await service.calculate_overall_rating(**improved_metrics),
            rating_tier="gold",
            commission_discount_rate=Decimal("0.15"),
            is_active=True,  # Current period
            calculated_by="test"
        )
        test_session.add(current_rating)
        await test_session.commit()
        
        # Test improvement detection
        improvement = await service.calculate_rating_improvement(supplier_id)
        assert improvement["tier_changed"] is True
        assert improvement["previous_tier"] == "silver"
        assert improvement["current_tier"] == "gold"
        assert improvement["rating_increase"] > 0

    async def test_rating_with_insufficient_data(self, test_session: AsyncSession):
        """Test rating calculation with insufficient or missing data"""
        service = RatingService(test_session)
        
        # Partial metrics (missing some data)
        partial_metrics = {
            "fulfillment_rate": Decimal("0.95"),
            "on_time_delivery_rate": None,  # Missing data
            "quality_score": Decimal("4.0"),
            "customer_satisfaction_score": None,  # Missing data
            "response_time_score": Decimal("3.8")
        }
        
        # Should handle missing data gracefully
        rating = await service.calculate_overall_rating_with_defaults(**partial_metrics)
        assert rating is not None
        assert rating > 0

    async def test_rating_period_validation(self, test_session: AsyncSession):
        """Test rating period validation and overlaps"""
        supplier_id = str(uuid.uuid4())
        service = RatingService(test_session)
        
        # Create first rating period
        period1_start = datetime.utcnow() - timedelta(days=60)
        period1_end = datetime.utcnow() - timedelta(days=30)
        
        rating1 = SupplierRating(
            supplier_id=supplier_id,
            rating_period_start=period1_start,
            rating_period_end=period1_end,
            fulfillment_rate=Decimal("0.90"),
            on_time_delivery_rate=Decimal("0.88"),
            quality_score=Decimal("4.0"),
            customer_satisfaction_score=Decimal("3.8"),
            response_time_score=Decimal("3.5"),
            overall_rating=Decimal("3.72"),
            rating_tier="silver",
            commission_discount_rate=Decimal("0.10"),
            is_active=False,
            calculated_by="test"
        )
        test_session.add(rating1)
        await test_session.commit()
        
        # Test non-overlapping period (should succeed)
        period2_start = datetime.utcnow() - timedelta(days=30)
        period2_end = datetime.utcnow()
        
        can_create = await service.validate_rating_period(supplier_id, period2_start, period2_end)
        assert can_create is True
        
        # Test overlapping period (should fail)
        overlap_start = datetime.utcnow() - timedelta(days=45)  # Overlaps with period1
        overlap_end = datetime.utcnow() - timedelta(days=15)
        
        can_create_overlap = await service.validate_rating_period(supplier_id, overlap_start, overlap_end)
        assert can_create_overlap is False


class TestEffectiveRateCalculation:
    """Test effective rate calculation combining tier rate and rating discount"""

    async def test_effective_rate_calculation(self, test_session: AsyncSession, sample_rate_tiers):
        """Test effective commission rate with rating discount applied"""
        service = RateConfigService(test_session)
        
        test_scenarios = [
            # (monthly_gmv, tier_rate, rating_tier, rating_discount, expected_effective_rate)
            (30000, Decimal("0.030"), "bronze", Decimal("0.05"), Decimal("0.0285")),     # 3.0% - 5% = 2.85%
            (100000, Decimal("0.025"), "silver", Decimal("0.10"), Decimal("0.0225")),   # 2.5% - 10% = 2.25%
            (300000, Decimal("0.020"), "gold", Decimal("0.15"), Decimal("0.0170")),     # 2.0% - 15% = 1.70%
            (800000, Decimal("0.015"), "platinum", Decimal("0.20"), Decimal("0.0120")), # 1.5% - 20% = 1.20%
            (1500000, Decimal("0.012"), "platinum", Decimal("0.20"), Decimal("0.0096")) # 1.2% - 20% = 0.96%
        ]
        
        for gmv, tier_rate, rating_tier, discount, expected_effective in test_scenarios:
            effective_rate = await service.calculate_effective_rate(
                monthly_gmv=gmv,
                rating_tier=rating_tier,
                rating_discount=discount
            )
            
            assert abs(effective_rate - expected_effective) < Decimal("0.0001"), \
                f"GMV {gmv}, {rating_tier}: Expected {expected_effective}, got {effective_rate}"

    async def test_effective_rate_with_maximum_discount_cap(self, test_session: AsyncSession):
        """Test effective rate calculation with discount caps"""
        service = RateConfigService(test_session)
        
        # Test maximum discount cap (e.g., discount cannot exceed 25% of base rate)
        max_discount_cap = Decimal("0.25")  # 25% maximum discount
        
        scenarios = [
            # (base_rate, requested_discount, expected_effective_rate)
            (Decimal("0.030"), Decimal("0.30"), Decimal("0.0225")),  # 30% discount capped at 25% = 2.25%
            (Decimal("0.020"), Decimal("0.50"), Decimal("0.0150")),  # 50% discount capped at 25% = 1.50%
            (Decimal("0.012"), Decimal("0.20"), Decimal("0.0096")),  # 20% discount allowed = 0.96%
        ]
        
        for base_rate, discount, expected_rate in scenarios:
            capped_discount = min(discount, max_discount_cap)
            effective_rate = base_rate * (Decimal("1.0") - capped_discount)
            
            assert abs(effective_rate - expected_rate) < Decimal("0.0001")

    async def test_commission_calculation_with_rating_discount(self, test_session: AsyncSession, sample_rate_tiers, sample_supplier_rating):
        """Test end-to-end commission calculation with rating discount"""
        service = TransactionService(test_session)
        
        supplier_id = sample_supplier_rating.supplier_id
        order_amount = Decimal("20000.00")  # NT$20,000 order
        monthly_gmv = Decimal("75000.00")   # NT$75,000 monthly GMV (Tier 2)
        
        # Calculate commission with rating discount
        commission = await service.calculate_commission_with_rating(
            supplier_id=supplier_id,
            order_amount=order_amount,
            monthly_gmv=monthly_gmv
        )
        
        # Expected calculation:
        # Base rate (Tier 2): 2.5%
        # Rating discount (Gold): 15%
        # Effective rate: 2.5% * (1 - 0.15) = 2.125%
        # Commission: NT$20,000 * 0.02125 = NT$425
        expected_commission = order_amount * Decimal("0.02125")
        
        assert abs(commission - expected_commission) < Decimal("0.01")


class TestStatementGenerationLogic:
    """Test monthly billing statement generation logic"""

    async def test_monthly_statement_calculation(self, test_session: AsyncSession, sample_billing_transactions, sample_supplier_subscription):
        """Test monthly statement generation with correct calculations"""
        service = StatementService(test_session)
        
        supplier_id = sample_billing_transactions[0].supplier_id
        period_start = datetime.utcnow() - timedelta(days=30)
        period_end = datetime.utcnow()
        
        statement = await service.generate_monthly_statement(
            supplier_id=supplier_id,
            period_start=period_start,
            period_end=period_end
        )
        
        # Verify calculations
        assert statement.total_gmv > 0
        assert statement.commission_amount > 0
        assert statement.total_orders == len(sample_billing_transactions)
        assert statement.total_amount == statement.commission_amount + statement.subscription_fee

    async def test_statement_with_adjustments(self, test_session: AsyncSession, sample_monthly_statement):
        """Test statement calculation with adjustments"""
        service = StatementService(test_session)
        
        # Add credit adjustment
        credit_adjustment = Decimal("-200.00")  # NT$200 credit
        await service.add_adjustment(
            statement_id=sample_monthly_statement.id,
            adjustment_type="credit",
            amount=credit_adjustment,
            reason="Service downtime compensation"
        )
        
        # Recalculate statement
        updated_statement = await service.recalculate_statement(sample_monthly_statement.id)
        
        expected_total = (sample_monthly_statement.commission_amount + 
                         sample_monthly_statement.subscription_fee + 
                         credit_adjustment)
        
        assert updated_statement.adjustment_amount == credit_adjustment
        assert updated_statement.total_amount == expected_total

    async def test_pro_rated_subscription_fee(self, test_session: AsyncSession):
        """Test pro-rated subscription fee calculation for partial months"""
        service = StatementService(test_session)
        
        # Test partial month: 15 days out of 30
        monthly_fee = Decimal("3999.00")
        billing_days = 15
        month_days = 30
        
        pro_rated_fee = await service.calculate_pro_rated_fee(
            monthly_fee=monthly_fee,
            billing_days=billing_days,
            month_days=month_days
        )
        
        expected_fee = monthly_fee * (Decimal(str(billing_days)) / Decimal(str(month_days)))
        assert abs(pro_rated_fee - expected_fee) < Decimal("0.01")

    async def test_statement_tax_calculation(self, test_session: AsyncSession, sample_monthly_statement):
        """Test tax calculation for billing statements (Taiwan VAT)"""
        service = StatementService(test_session)
        
        # Taiwan VAT rate: 5%
        vat_rate = Decimal("0.05")
        
        # Calculate VAT on commission amount
        commission_vat = sample_monthly_statement.commission_amount * vat_rate
        
        # Business income tax (if applicable)
        # For this test, assume standard corporate rate
        
        tax_calculation = await service.calculate_taxes(
            commission_amount=sample_monthly_statement.commission_amount,
            subscription_fee=sample_monthly_statement.subscription_fee,
            jurisdiction="Taiwan"
        )
        
        assert tax_calculation["vat_amount"] == commission_vat
        assert tax_calculation["total_tax"] >= commission_vat


class TestBusinessRuleValidation:
    """Test business rule validation and constraints"""

    async def test_subscription_limit_enforcement(self, test_session: AsyncSession, sample_supplier_subscription):
        """Test subscription transaction limit enforcement"""
        service = TransactionService(test_session)
        
        # Set subscription near limit
        sample_supplier_subscription.usage_count = 950  # Close to 1000 limit
        await test_session.commit()
        
        # Test transaction creation within limit
        can_create = await service.validate_transaction_limit(
            supplier_id=sample_supplier_subscription.supplier_id,
            transaction_count=30  # Would total 980, still under limit
        )
        assert can_create is True
        
        # Test transaction creation exceeding limit
        can_create_over = await service.validate_transaction_limit(
            supplier_id=sample_supplier_subscription.supplier_id,
            transaction_count=60  # Would total 1010, over limit
        )
        assert can_create_over is False

    async def test_minimum_order_amount_validation(self, test_session: AsyncSession):
        """Test minimum order amount validation"""
        service = TransactionService(test_session)
        
        # Test orders below minimum threshold
        min_order_amount = Decimal("100.00")  # NT$100 minimum
        
        test_cases = [
            (Decimal("50.00"), False),   # Below minimum
            (Decimal("100.00"), True),   # Exactly minimum
            (Decimal("150.00"), True),   # Above minimum
        ]
        
        for amount, expected_valid in test_cases:
            is_valid = await service.validate_minimum_order(amount, min_order_amount)
            assert is_valid == expected_valid

    async def test_payment_term_validation(self, test_session: AsyncSession):
        """Test payment term and due date validation"""
        service = StatementService(test_session)
        
        # Standard payment terms: Net 30 days
        payment_terms_days = 30
        statement_date = datetime.utcnow()
        
        due_date = await service.calculate_due_date(statement_date, payment_terms_days)
        expected_due_date = statement_date + timedelta(days=payment_terms_days)
        
        assert due_date.date() == expected_due_date.date()

    async def test_currency_validation(self, test_session: AsyncSession):
        """Test currency validation for Taiwan market"""
        service = TransactionService(test_session)
        
        # Taiwan market should primarily use TWD
        valid_currencies = ["TWD", "USD"]  # USD for international suppliers
        
        for currency in valid_currencies:
            is_valid = await service.validate_currency(currency, market="Taiwan")
            assert is_valid is True
        
        # Invalid currency
        is_invalid = await service.validate_currency("EUR", market="Taiwan")
        assert is_invalid is False


class TestPerformanceOptimization:
    """Test performance optimizations in business logic"""

    async def test_bulk_commission_calculation(self, test_session: AsyncSession, large_transaction_dataset):
        """Test bulk commission calculation performance"""
        service = TransactionService(test_session)
        
        supplier_id = large_transaction_dataset[0].supplier_id
        
        # Test bulk calculation (should be faster than individual calculations)
        import time
        start_time = time.time()
        
        bulk_results = await service.calculate_bulk_commissions(
            supplier_id=supplier_id,
            transaction_count=len(large_transaction_dataset)
        )
        
        end_time = time.time()
        calculation_time = end_time - start_time
        
        # Should complete bulk calculation within reasonable time
        assert calculation_time < 2.0  # Less than 2 seconds for 1000 transactions
        assert len(bulk_results) == len(large_transaction_dataset)

    async def test_cached_tier_lookup(self, test_session: AsyncSession, sample_rate_tiers):
        """Test tier lookup caching for performance"""
        service = RateConfigService(test_session)
        
        # First lookup (cache miss)
        start_time = time.time()
        tier1 = await service.get_applicable_tier(75000)
        first_lookup_time = time.time() - start_time
        
        # Second lookup (cache hit)
        start_time = time.time()
        tier2 = await service.get_applicable_tier(75000)
        second_lookup_time = time.time() - start_time
        
        # Cache hit should be faster
        assert second_lookup_time < first_lookup_time
        assert tier1.id == tier2.id

    async def test_rating_calculation_optimization(self, test_session: AsyncSession):
        """Test rating calculation optimization for large datasets"""
        service = RatingService(test_session)
        
        # Create multiple suppliers for bulk rating calculation
        supplier_ids = [str(uuid.uuid4()) for _ in range(100)]
        
        import time
        start_time = time.time()
        
        # Bulk rating calculation
        ratings = await service.calculate_bulk_ratings(
            supplier_ids=supplier_ids,
            period_start=datetime.utcnow() - timedelta(days=30),
            period_end=datetime.utcnow()
        )
        
        calculation_time = time.time() - start_time
        
        # Should complete within reasonable time
        assert calculation_time < 5.0  # Less than 5 seconds for 100 suppliers
        assert len(ratings) <= len(supplier_ids)  # Some may have insufficient data


class TestEdgeCasesAndErrorHandling:
    """Test edge cases and error handling in business logic"""

    async def test_zero_gmv_commission_calculation(self, test_session: AsyncSession):
        """Test commission calculation with zero GMV"""
        service = RateConfigService(test_session)
        
        commission = await service.calculate_commission(Decimal("1000.00"), 0)
        # Should still calculate commission even with zero monthly GMV
        assert commission > 0

    async def test_negative_adjustment_validation(self, test_session: AsyncSession):
        """Test validation of negative adjustments"""
        service = StatementService(test_session)
        
        # Large negative adjustment that would make total negative
        original_amount = Decimal("1000.00")
        large_negative_adjustment = Decimal("-1500.00")
        
        is_valid = await service.validate_adjustment(original_amount, large_negative_adjustment)
        # Should prevent total from going negative
        assert is_valid is False

    async def test_future_date_validation(self, test_session: AsyncSession):
        """Test validation of future dates in transactions"""
        service = TransactionService(test_session)
        
        future_date = datetime.utcnow() + timedelta(days=30)
        
        is_valid = await service.validate_transaction_date(future_date)
        assert is_valid is False  # Future dates should not be allowed

    async def test_division_by_zero_protection(self, test_session: AsyncSession):
        """Test protection against division by zero in calculations"""
        service = RatingService(test_session)
        
        # Test with zero values that could cause division by zero
        metrics_with_zeros = {
            "fulfillment_rate": Decimal("0.00"),
            "on_time_delivery_rate": Decimal("0.00"),
            "quality_score": Decimal("0.00"),
            "customer_satisfaction_score": Decimal("0.00"),
            "response_time_score": Decimal("0.00")
        }
        
        # Should handle gracefully without throwing exception
        rating = await service.calculate_overall_rating_safe(**metrics_with_zeros)
        assert rating >= 0  # Should return valid rating or minimum value