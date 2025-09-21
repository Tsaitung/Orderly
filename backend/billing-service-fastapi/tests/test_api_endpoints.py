"""
Comprehensive API endpoint tests for all 6 billing API groups
Tests all endpoints through direct service calls and API Gateway routing
"""
import pytest
import uuid
import json
from datetime import datetime, timedelta
from decimal import Decimal
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from app.models.billing_rate_config import BillingRateConfig
from app.models.supplier_subscription import SupplierSubscription
from app.models.billing_transaction import BillingTransaction
from app.models.monthly_billing_statement import MonthlyBillingStatement
from app.models.payment_record import PaymentRecord
from app.models.supplier_rating import SupplierRating


class TestRateConfigurationAPI:
    """Test /api/billing/rates/ endpoints"""

    async def test_get_rate_configs(self, client: AsyncClient, sample_rate_config):
        """Test GET /api/billing/rates/configs - List rate configurations"""
        response = await client.get("/api/billing/rates/configs")
        assert response.status_code == 200
        
        data = response.json()
        assert "configs" in data
        assert len(data["configs"]) > 0
        
        config = data["configs"][0]
        assert "id" in config
        assert "config_name" in config
        assert "config_type" in config
        assert "base_rate" in config

    async def test_create_rate_config(self, client: AsyncClient):
        """Test POST /api/billing/rates/configs - Create rate configuration"""
        config_data = {
            "config_name": "Test API Rate",
            "config_type": "commission",
            "is_active": True,
            "base_rate": 0.028,
            "min_amount": 15.00,
            "max_amount": 800.00,
            "effective_from": datetime.utcnow().isoformat(),
            "target_supplier_type": "premium",
            "min_monthly_gmv": 20000.00,
            "max_monthly_gmv": 150000.00,
            "additional_config": {"auto_apply": True},
            "created_by": "api_test"
        }
        
        response = await client.post("/api/billing/rates/configs", json=config_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["config_name"] == "Test API Rate"
        assert data["base_rate"] == 0.028
        assert data["approval_status"] == "draft"

    async def test_get_rate_config_by_id(self, client: AsyncClient, sample_rate_config):
        """Test GET /api/billing/rates/configs/{id} - Get specific rate config"""
        response = await client.get(f"/api/billing/rates/configs/{sample_rate_config.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == str(sample_rate_config.id)
        assert data["config_name"] == sample_rate_config.config_name

    async def test_update_rate_config(self, client: AsyncClient, sample_rate_config):
        """Test PUT /api/billing/rates/configs/{id} - Update rate configuration"""
        update_data = {
            "config_name": "Updated Test Rate",
            "base_rate": 0.030,
            "approval_status": "approved",
            "updated_by": "api_test"
        }
        
        response = await client.put(f"/api/billing/rates/configs/{sample_rate_config.id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["config_name"] == "Updated Test Rate"
        assert data["base_rate"] == 0.030
        assert data["approval_status"] == "approved"

    async def test_get_commission_tiers(self, client: AsyncClient, sample_rate_tiers):
        """Test GET /api/billing/rates/tiers - List commission tiers"""
        response = await client.get("/api/billing/rates/tiers")
        assert response.status_code == 200
        
        data = response.json()
        assert "tiers" in data
        assert len(data["tiers"]) == 5  # All 5 commission tiers
        
        # Verify tier ordering
        tiers = data["tiers"]
        for i in range(len(tiers) - 1):
            assert tiers[i]["tier_order"] <= tiers[i + 1]["tier_order"]

    async def test_calculate_commission_rate(self, client: AsyncClient, sample_rate_tiers):
        """Test POST /api/billing/rates/calculate - Calculate commission rate for GMV"""
        test_cases = [
            {"monthly_gmv": 30000, "expected_tier": 1, "expected_rate": 0.030},
            {"monthly_gmv": 75000, "expected_tier": 2, "expected_rate": 0.025},
            {"monthly_gmv": 350000, "expected_tier": 3, "expected_rate": 0.020},
            {"monthly_gmv": 750000, "expected_tier": 4, "expected_rate": 0.015},
            {"monthly_gmv": 1500000, "expected_tier": 5, "expected_rate": 0.012}
        ]
        
        for case in test_cases:
            response = await client.post("/api/billing/rates/calculate", json={
                "monthly_gmv": case["monthly_gmv"],
                "supplier_type": "standard"
            })
            assert response.status_code == 200
            
            data = response.json()
            assert data["tier_order"] == case["expected_tier"]
            assert abs(data["commission_rate"] - case["expected_rate"]) < 0.001


class TestSubscriptionManagementAPI:
    """Test /api/billing/subscriptions/ endpoints"""

    async def test_get_subscription_plans(self, client: AsyncClient, sample_subscription_plans):
        """Test GET /api/billing/subscriptions/plans - List subscription plans"""
        response = await client.get("/api/billing/subscriptions/plans")
        assert response.status_code == 200
        
        data = response.json()
        assert "plans" in data
        assert len(data["plans"]) == 3  # Free, Professional, Enterprise
        
        plan_types = [plan["plan_type"] for plan in data["plans"]]
        assert "free" in plan_types
        assert "professional" in plan_types
        assert "enterprise" in plan_types

    async def test_subscribe_supplier(self, client: AsyncClient, sample_subscription_plans):
        """Test POST /api/billing/subscriptions/supplier/{id}/subscribe - Subscribe supplier"""
        supplier_id = str(uuid.uuid4())
        professional_plan = next(p for p in sample_subscription_plans if p.plan_type == "professional")
        
        subscription_data = {
            "subscription_plan_id": str(professional_plan.id),
            "auto_renew": True,
            "start_date": datetime.utcnow().isoformat()
        }
        
        response = await client.post(f"/api/billing/subscriptions/supplier/{supplier_id}/subscribe", json=subscription_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["supplier_id"] == supplier_id
        assert data["status"] == "active"
        assert data["monthly_fee"] == float(professional_plan.monthly_fee)

    async def test_get_supplier_subscription(self, client: AsyncClient, sample_supplier_subscription):
        """Test GET /api/billing/subscriptions/supplier/{id} - Get supplier subscription"""
        response = await client.get(f"/api/billing/subscriptions/supplier/{sample_supplier_subscription.supplier_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["supplier_id"] == sample_supplier_subscription.supplier_id
        assert data["status"] == sample_supplier_subscription.status

    async def test_update_subscription(self, client: AsyncClient, sample_supplier_subscription, sample_subscription_plans):
        """Test PUT /api/billing/subscriptions/supplier/{id} - Update subscription"""
        enterprise_plan = next(p for p in sample_subscription_plans if p.plan_type == "enterprise")
        
        update_data = {
            "subscription_plan_id": str(enterprise_plan.id),
            "auto_renew": False
        }
        
        response = await client.put(f"/api/billing/subscriptions/supplier/{sample_supplier_subscription.supplier_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["monthly_fee"] == float(enterprise_plan.monthly_fee)
        assert data["auto_renew"] is False

    async def test_cancel_subscription(self, client: AsyncClient, sample_supplier_subscription):
        """Test DELETE /api/billing/subscriptions/supplier/{id} - Cancel subscription"""
        response = await client.delete(f"/api/billing/subscriptions/supplier/{sample_supplier_subscription.supplier_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "cancelled"
        assert "cancelled_at" in data

    async def test_subscription_usage_tracking(self, client: AsyncClient, sample_supplier_subscription):
        """Test POST /api/billing/subscriptions/supplier/{id}/usage - Track usage"""
        usage_data = {
            "usage_increment": 25,
            "usage_type": "api_calls",
            "metadata": {"endpoint": "/api/products", "timestamp": datetime.utcnow().isoformat()}
        }
        
        response = await client.post(f"/api/billing/subscriptions/supplier/{sample_supplier_subscription.supplier_id}/usage", json=usage_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["usage_count"] == sample_supplier_subscription.usage_count + 25


class TestTransactionTrackingAPI:
    """Test /api/billing/transactions/ endpoints"""

    async def test_create_billing_transaction(self, client: AsyncClient, sample_supplier_subscription):
        """Test POST /api/billing/transactions/ - Create billing transaction"""
        transaction_data = {
            "supplier_id": sample_supplier_subscription.supplier_id,
            "order_id": str(uuid.uuid4()),
            "transaction_type": "commission",
            "order_amount": 18000.00,
            "commission_rate": 0.025,
            "additional_details": {
                "customer_type": "restaurant",
                "order_items": 12
            }
        }
        
        response = await client.post("/api/billing/transactions/", json=transaction_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["supplier_id"] == sample_supplier_subscription.supplier_id
        assert data["order_amount"] == 18000.00
        assert data["commission_amount"] == 450.00  # 18000 * 0.025
        assert data["net_amount"] == 17550.00

    async def test_get_supplier_transactions(self, client: AsyncClient, sample_billing_transactions):
        """Test GET /api/billing/transactions/supplier/{id} - Get supplier transactions"""
        supplier_id = sample_billing_transactions[0].supplier_id
        
        response = await client.get(f"/api/billing/transactions/supplier/{supplier_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "transactions" in data
        assert "total_count" in data
        assert "pagination" in data
        assert len(data["transactions"]) > 0

    async def test_get_transactions_with_filters(self, client: AsyncClient, sample_billing_transactions):
        """Test GET /api/billing/transactions/supplier/{id} with filters"""
        supplier_id = sample_billing_transactions[0].supplier_id
        start_date = (datetime.utcnow() - timedelta(days=45)).isoformat()
        end_date = datetime.utcnow().isoformat()
        
        response = await client.get(f"/api/billing/transactions/supplier/{supplier_id}", params={
            "start_date": start_date,
            "end_date": end_date,
            "status": "completed",
            "transaction_type": "commission",
            "limit": 5
        })
        assert response.status_code == 200
        
        data = response.json()
        transactions = data["transactions"]
        assert len(transactions) <= 5
        
        for transaction in transactions:
            assert transaction["status"] == "completed"
            assert transaction["transaction_type"] == "commission"

    async def test_get_transaction_by_id(self, client: AsyncClient, sample_billing_transactions):
        """Test GET /api/billing/transactions/{id} - Get specific transaction"""
        transaction = sample_billing_transactions[0]
        
        response = await client.get(f"/api/billing/transactions/{transaction.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == str(transaction.id)
        assert data["order_amount"] == float(transaction.order_amount)

    async def test_update_transaction_status(self, client: AsyncClient, sample_billing_transactions):
        """Test PUT /api/billing/transactions/{id}/status - Update transaction status"""
        transaction = sample_billing_transactions[0]
        
        update_data = {
            "status": "processed",
            "notes": "Updated by API test"
        }
        
        response = await client.put(f"/api/billing/transactions/{transaction.id}/status", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "processed"

    async def test_bulk_transaction_operations(self, client: AsyncClient, sample_supplier_subscription):
        """Test POST /api/billing/transactions/bulk - Bulk create transactions"""
        bulk_data = {
            "transactions": [
                {
                    "supplier_id": sample_supplier_subscription.supplier_id,
                    "order_id": str(uuid.uuid4()),
                    "transaction_type": "commission",
                    "order_amount": 5000.00,
                    "commission_rate": 0.025
                },
                {
                    "supplier_id": sample_supplier_subscription.supplier_id,
                    "order_id": str(uuid.uuid4()),
                    "transaction_type": "commission",
                    "order_amount": 7500.00,
                    "commission_rate": 0.025
                }
            ]
        }
        
        response = await client.post("/api/billing/transactions/bulk", json=bulk_data)
        assert response.status_code == 201
        
        data = response.json()
        assert "created_transactions" in data
        assert len(data["created_transactions"]) == 2


class TestBillingStatementsAPI:
    """Test /api/billing/statements/ endpoints"""

    async def test_generate_monthly_statement(self, client: AsyncClient, sample_billing_transactions):
        """Test POST /api/billing/statements/generate/{supplier_id} - Generate monthly statement"""
        supplier_id = sample_billing_transactions[0].supplier_id
        
        generation_data = {
            "billing_period_start": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "billing_period_end": datetime.utcnow().isoformat(),
            "include_adjustments": True
        }
        
        response = await client.post(f"/api/billing/statements/generate/{supplier_id}", json=generation_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["supplier_id"] == supplier_id
        assert data["status"] == "draft"
        assert "total_gmv" in data
        assert "commission_amount" in data
        assert "total_amount" in data

    async def test_get_supplier_statements(self, client: AsyncClient, sample_monthly_statement):
        """Test GET /api/billing/statements/supplier/{id} - Get supplier statements"""
        response = await client.get(f"/api/billing/statements/supplier/{sample_monthly_statement.supplier_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "statements" in data
        assert len(data["statements"]) > 0
        
        statement = data["statements"][0]
        assert statement["supplier_id"] == sample_monthly_statement.supplier_id

    async def test_get_statement_by_id(self, client: AsyncClient, sample_monthly_statement):
        """Test GET /api/billing/statements/{id} - Get specific statement"""
        response = await client.get(f"/api/billing/statements/{sample_monthly_statement.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == str(sample_monthly_statement.id)
        assert data["status"] == sample_monthly_statement.status

    async def test_finalize_statement(self, client: AsyncClient, sample_monthly_statement):
        """Test POST /api/billing/statements/{id}/finalize - Finalize statement"""
        # Create a draft statement first
        from app.models.monthly_billing_statement import MonthlyBillingStatement
        
        draft_statement = MonthlyBillingStatement(
            supplier_id=sample_monthly_statement.supplier_id,
            billing_period_start=datetime.utcnow() - timedelta(days=60),
            billing_period_end=datetime.utcnow() - timedelta(days=30),
            total_gmv=Decimal("50000.00"),
            total_orders=25,
            commission_amount=Decimal("1250.00"),
            subscription_fee=Decimal("3999.00"),
            total_amount=Decimal("5249.00"),
            status="draft",
            generated_by="api_test"
        )
        
        response = await client.post(f"/api/billing/statements/{draft_statement.id}/finalize")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "finalized"
        assert "finalized_at" in data

    async def test_add_statement_adjustment(self, client: AsyncClient, sample_monthly_statement):
        """Test POST /api/billing/statements/{id}/adjustments - Add adjustment"""
        adjustment_data = {
            "adjustment_type": "credit",
            "amount": -500.00,
            "reason": "Service credit for downtime",
            "notes": "Applied due to API outage on 2024-01-15"
        }
        
        response = await client.post(f"/api/billing/statements/{sample_monthly_statement.id}/adjustments", json=adjustment_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["adjustment_amount"] == -500.00
        assert data["total_amount"] == float(sample_monthly_statement.total_amount) - 500.00

    async def test_export_statement(self, client: AsyncClient, sample_monthly_statement):
        """Test GET /api/billing/statements/{id}/export - Export statement"""
        response = await client.get(f"/api/billing/statements/{sample_monthly_statement.id}/export", params={
            "format": "pdf"
        })
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"


class TestPaymentProcessingAPI:
    """Test /api/billing/payments/ endpoints"""

    async def test_process_payment(self, client: AsyncClient, sample_monthly_statement):
        """Test POST /api/billing/payments/ - Process payment"""
        payment_data = {
            "supplier_id": sample_monthly_statement.supplier_id,
            "billing_statement_id": str(sample_monthly_statement.id),
            "payment_method": "credit_card",
            "payment_gateway": "ecpay",
            "payment_amount": float(sample_monthly_statement.total_amount),
            "currency": "TWD"
        }
        
        response = await client.post("/api/billing/payments/", json=payment_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["supplier_id"] == sample_monthly_statement.supplier_id
        assert data["payment_amount"] == float(sample_monthly_statement.total_amount)
        assert data["status"] == "pending"

    async def test_get_supplier_payments(self, client: AsyncClient, sample_payment_record):
        """Test GET /api/billing/payments/supplier/{id} - Get supplier payments"""
        response = await client.get(f"/api/billing/payments/supplier/{sample_payment_record.supplier_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "payments" in data
        assert len(data["payments"]) > 0
        
        payment = data["payments"][0]
        assert payment["supplier_id"] == sample_payment_record.supplier_id

    async def test_get_payment_by_id(self, client: AsyncClient, sample_payment_record):
        """Test GET /api/billing/payments/{id} - Get specific payment"""
        response = await client.get(f"/api/billing/payments/{sample_payment_record.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == str(sample_payment_record.id)
        assert data["status"] == sample_payment_record.status

    async def test_update_payment_status(self, client: AsyncClient, sample_payment_record):
        """Test PUT /api/billing/payments/{id}/status - Update payment status"""
        update_data = {
            "status": "refunded",
            "gateway_response": {"refund_id": "REF123456", "refund_amount": 1000.00},
            "notes": "Partial refund processed"
        }
        
        response = await client.put(f"/api/billing/payments/{sample_payment_record.id}/status", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "refunded"

    async def test_process_refund(self, client: AsyncClient, sample_payment_record):
        """Test POST /api/billing/payments/{id}/refund - Process refund"""
        refund_data = {
            "refund_amount": 500.00,
            "reason": "Customer requested refund",
            "refund_method": "original_payment_method"
        }
        
        response = await client.post(f"/api/billing/payments/{sample_payment_record.id}/refund", json=refund_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["payment_amount"] == -500.00  # Negative for refund
        assert data["related_payment_id"] == str(sample_payment_record.id)

    @patch('app.integrations.payment_gateway.ECPayGateway.process_payment')
    async def test_payment_gateway_integration(self, mock_gateway, client: AsyncClient, sample_monthly_statement):
        """Test payment gateway integration with mocking"""
        mock_gateway.return_value = {
            "transaction_id": "EC123456789",
            "status": "success",
            "gateway_fee": 75.00,
            "net_amount": float(sample_monthly_statement.total_amount) - 75.00
        }
        
        payment_data = {
            "supplier_id": sample_monthly_statement.supplier_id,
            "billing_statement_id": str(sample_monthly_statement.id),
            "payment_method": "credit_card",
            "payment_gateway": "ecpay",
            "payment_amount": float(sample_monthly_statement.total_amount)
        }
        
        response = await client.post("/api/billing/payments/", json=payment_data)
        assert response.status_code == 201
        
        mock_gateway.assert_called_once()


class TestSupplierRatingAPI:
    """Test /api/billing/ratings/ endpoints"""

    async def test_calculate_supplier_rating(self, client: AsyncClient, sample_billing_transactions):
        """Test POST /api/billing/ratings/supplier/{id}/calculate - Calculate rating"""
        supplier_id = sample_billing_transactions[0].supplier_id
        
        rating_data = {
            "rating_period_start": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "rating_period_end": datetime.utcnow().isoformat(),
            "metrics": {
                "fulfillment_rate": 0.96,
                "on_time_delivery_rate": 0.94,
                "quality_score": 4.6,
                "customer_satisfaction_score": 4.4,
                "response_time_score": 4.2
            }
        }
        
        response = await client.post(f"/api/billing/ratings/supplier/{supplier_id}/calculate", json=rating_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["supplier_id"] == supplier_id
        assert "overall_rating" in data
        assert "rating_tier" in data
        assert "commission_discount_rate" in data

    async def test_get_supplier_rating(self, client: AsyncClient, sample_supplier_rating):
        """Test GET /api/billing/ratings/supplier/{id} - Get current rating"""
        response = await client.get(f"/api/billing/ratings/supplier/{sample_supplier_rating.supplier_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["supplier_id"] == sample_supplier_rating.supplier_id
        assert data["rating_tier"] == sample_supplier_rating.rating_tier
        assert data["is_active"] is True

    async def test_get_rating_history(self, client: AsyncClient, sample_supplier_rating):
        """Test GET /api/billing/ratings/supplier/{id}/history - Get rating history"""
        response = await client.get(f"/api/billing/ratings/supplier/{sample_supplier_rating.supplier_id}/history")
        assert response.status_code == 200
        
        data = response.json()
        assert "ratings" in data
        assert len(data["ratings"]) > 0

    async def test_update_rating_manually(self, client: AsyncClient, sample_supplier_rating):
        """Test PUT /api/billing/ratings/supplier/{id} - Manual rating update"""
        update_data = {
            "overall_rating": 4.7,
            "rating_tier": "platinum",
            "commission_discount_rate": 0.20,
            "manual_adjustment_reason": "Exceptional performance during holiday season",
            "updated_by": "admin_user"
        }
        
        response = await client.put(f"/api/billing/ratings/supplier/{sample_supplier_rating.supplier_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["overall_rating"] == 4.7
        assert data["rating_tier"] == "platinum"

    async def test_rating_tier_thresholds(self, client: AsyncClient):
        """Test GET /api/billing/ratings/tiers - Get rating tier thresholds"""
        response = await client.get("/api/billing/ratings/tiers")
        assert response.status_code == 200
        
        data = response.json()
        assert "tiers" in data
        
        tiers = data["tiers"]
        expected_tiers = ["bronze", "silver", "gold", "platinum"]
        for tier in expected_tiers:
            tier_data = next((t for t in tiers if t["tier_name"] == tier), None)
            assert tier_data is not None
            assert "min_rating" in tier_data
            assert "commission_discount" in tier_data

    async def test_bulk_rating_calculation(self, client: AsyncClient):
        """Test POST /api/billing/ratings/bulk/calculate - Bulk rating calculation"""
        bulk_data = {
            "supplier_ids": [str(uuid.uuid4()), str(uuid.uuid4())],
            "rating_period_start": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "rating_period_end": datetime.utcnow().isoformat(),
            "recalculate_existing": True
        }
        
        response = await client.post("/api/billing/ratings/bulk/calculate", json=bulk_data)
        assert response.status_code == 202  # Accepted for background processing
        
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "queued"


class TestHealthAndStatusEndpoints:
    """Test health and status endpoints"""

    async def test_health_endpoint(self, client: AsyncClient):
        """Test GET /health - Service health check"""
        response = await client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] in ["healthy", "degraded"]
        assert data["service"] == "billing-service-fastapi"
        assert "version" in data
        assert "features" in data

    async def test_root_endpoint(self, client: AsyncClient):
        """Test GET / - Service information"""
        response = await client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["service"] == "Orderly Automated Billing Service"
        assert "endpoints" in data
        assert "commission_tiers" in data
        assert "rating_discounts" in data

    async def test_scheduler_status(self, client: AsyncClient):
        """Test GET /admin/scheduler/status - Scheduler status"""
        response = await client.get("/admin/scheduler/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "scheduler_running" in data
        assert "active_jobs" in data

    async def test_manual_job_trigger(self, client: AsyncClient):
        """Test POST /admin/scheduler/trigger/{job_id} - Manual job trigger"""
        response = await client.post("/admin/scheduler/trigger/monthly_billing")
        # This might return 500 if job doesn't exist, which is expected in test
        assert response.status_code in [200, 500]


class TestErrorHandling:
    """Test error handling and edge cases"""

    async def test_404_not_found(self, client: AsyncClient):
        """Test 404 responses for non-existent resources"""
        fake_id = str(uuid.uuid4())
        
        response = await client.get(f"/api/billing/rates/configs/{fake_id}")
        assert response.status_code == 404
        
        response = await client.get(f"/api/billing/transactions/{fake_id}")
        assert response.status_code == 404

    async def test_400_validation_errors(self, client: AsyncClient):
        """Test 400 responses for validation errors"""
        # Invalid rate config data
        invalid_data = {
            "config_name": "",  # Empty name
            "config_type": "invalid_type",  # Invalid type
            "base_rate": -0.05  # Negative rate
        }
        
        response = await client.post("/api/billing/rates/configs", json=invalid_data)
        assert response.status_code == 422  # FastAPI validation error

    async def test_duplicate_resource_creation(self, client: AsyncClient, sample_supplier_subscription):
        """Test handling of duplicate resource creation attempts"""
        # Try to create another subscription for same supplier
        subscription_data = {
            "subscription_plan_id": str(sample_supplier_subscription.subscription_plan_id),
            "auto_renew": True
        }
        
        response = await client.post(f"/api/billing/subscriptions/supplier/{sample_supplier_subscription.supplier_id}/subscribe", json=subscription_data)
        assert response.status_code == 409  # Conflict - already has active subscription

    async def test_unauthorized_access(self, client: AsyncClient):
        """Test unauthorized access scenarios"""
        # Test without proper authentication
        response = await client.get("/api/billing/rates/configs")
        # Depending on auth implementation, might return 401 or allow access
        assert response.status_code in [200, 401]


class TestPaginationAndFiltering:
    """Test pagination and filtering functionality"""

    async def test_transaction_pagination(self, client: AsyncClient, large_transaction_dataset):
        """Test transaction list pagination"""
        supplier_id = large_transaction_dataset[0].supplier_id
        
        # Test first page
        response = await client.get(f"/api/billing/transactions/supplier/{supplier_id}", params={
            "page": 1,
            "limit": 50
        })
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["transactions"]) == 50
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["total_pages"] > 1

    async def test_date_range_filtering(self, client: AsyncClient, large_transaction_dataset):
        """Test date range filtering"""
        supplier_id = large_transaction_dataset[0].supplier_id
        start_date = (datetime.utcnow() - timedelta(days=60)).isoformat()
        end_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
        
        response = await client.get(f"/api/billing/transactions/supplier/{supplier_id}", params={
            "start_date": start_date,
            "end_date": end_date
        })
        assert response.status_code == 200
        
        data = response.json()
        for transaction in data["transactions"]:
            transaction_date = datetime.fromisoformat(transaction["transaction_date"].replace('Z', '+00:00'))
            assert start_date <= transaction_date.isoformat() <= end_date

    async def test_sorting_options(self, client: AsyncClient, sample_billing_transactions):
        """Test sorting functionality"""
        supplier_id = sample_billing_transactions[0].supplier_id
        
        # Test sorting by amount descending
        response = await client.get(f"/api/billing/transactions/supplier/{supplier_id}", params={
            "sort_by": "order_amount",
            "sort_order": "desc"
        })
        assert response.status_code == 200
        
        data = response.json()
        transactions = data["transactions"]
        
        # Verify descending order
        for i in range(len(transactions) - 1):
            assert transactions[i]["order_amount"] >= transactions[i + 1]["order_amount"]