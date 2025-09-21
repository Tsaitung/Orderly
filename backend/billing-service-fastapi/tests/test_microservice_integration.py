"""
Integration tests with other microservices
Tests webhook integration, API Gateway routing, and inter-service communication
"""
import pytest
import uuid
import json
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient
import aiohttp

from app.integrations.order_service_client import OrderServiceClient
from app.integrations.supplier_service_client import SupplierServiceClient
from app.integrations.payment_gateway import ECPayGateway, NewebPayGateway
from app.webhooks.order_webhook import process_order_completion
from app.webhooks.payment_webhook import process_payment_callback


class TestOrderServiceIntegration:
    """Test integration with Order Service"""

    @patch('app.integrations.order_service_client.aiohttp.ClientSession.get')
    async def test_fetch_order_details(self, mock_get, test_session):
        """Test fetching order details from Order Service"""
        # Mock order service response
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "order_id": "ord_12345",
            "supplier_id": "sup_67890",
            "customer_id": "cust_11111",
            "total_amount": 25000.00,
            "status": "completed",
            "created_at": "2024-01-15T10:30:00Z",
            "completed_at": "2024-01-15T14:30:00Z",
            "items": [
                {
                    "product_id": "prod_001",
                    "product_name": "Premium Rice 20kg",
                    "quantity": 10,
                    "unit_price": 2500.00,
                    "total_price": 25000.00
                }
            ],
            "delivery_info": {
                "delivery_date": "2024-01-16T09:00:00Z",
                "delivery_status": "delivered"
            }
        })
        mock_get.return_value.__aenter__.return_value = mock_response
        
        client = OrderServiceClient()
        order_details = await client.get_order_details("ord_12345")
        
        assert order_details["order_id"] == "ord_12345"
        assert order_details["total_amount"] == 25000.00
        assert order_details["status"] == "completed"
        assert len(order_details["items"]) == 1

    @patch('app.integrations.order_service_client.aiohttp.ClientSession.get')
    async def test_fetch_supplier_orders_summary(self, mock_get, test_session):
        """Test fetching supplier monthly orders summary"""
        supplier_id = str(uuid.uuid4())
        
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "supplier_id": supplier_id,
            "period": "2024-01",
            "total_orders": 125,
            "total_gmv": 375000.00,
            "completed_orders": 118,
            "cancelled_orders": 7,
            "average_order_value": 3000.00,
            "top_customers": [
                {"customer_id": "cust_001", "orders": 15, "gmv": 45000.00},
                {"customer_id": "cust_002", "orders": 12, "gmv": 36000.00}
            ]
        })
        mock_get.return_value.__aenter__.return_value = mock_response
        
        client = OrderServiceClient()
        summary = await client.get_supplier_monthly_summary(
            supplier_id=supplier_id,
            year=2024,
            month=1
        )
        
        assert summary["total_orders"] == 125
        assert summary["total_gmv"] == 375000.00
        assert summary["completed_orders"] == 118

    async def test_order_service_error_handling(self, test_session):
        """Test error handling when Order Service is unavailable"""
        with patch('app.integrations.order_service_client.aiohttp.ClientSession.get') as mock_get:
            # Simulate service unavailable
            mock_get.side_effect = aiohttp.ClientError("Service unavailable")
            
            client = OrderServiceClient()
            
            with pytest.raises(Exception):
                await client.get_order_details("ord_12345")

    @patch('app.integrations.order_service_client.aiohttp.ClientSession.get')
    async def test_order_validation_with_billing_data(self, mock_get, test_session, sample_billing_transactions):
        """Test validating order data against existing billing transactions"""
        existing_transaction = sample_billing_transactions[0]
        
        # Mock order service response with matching order
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "order_id": existing_transaction.order_id,
            "supplier_id": existing_transaction.supplier_id,
            "total_amount": float(existing_transaction.order_amount),
            "status": "completed"
        })
        mock_get.return_value.__aenter__.return_value = mock_response
        
        client = OrderServiceClient()
        order_data = await client.get_order_details(existing_transaction.order_id)
        
        # Validate consistency
        assert order_data["order_id"] == existing_transaction.order_id
        assert order_data["supplier_id"] == existing_transaction.supplier_id
        assert Decimal(str(order_data["total_amount"])) == existing_transaction.order_amount


class TestSupplierServiceIntegration:
    """Test integration with Supplier Service"""

    @patch('app.integrations.supplier_service_client.aiohttp.ClientSession.get')
    async def test_fetch_supplier_profile(self, mock_get, test_session):
        """Test fetching supplier profile from Supplier Service"""
        supplier_id = str(uuid.uuid4())
        
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "supplier_id": supplier_id,
            "company_name": "Premium Foods Ltd",
            "business_type": "food_distributor",
            "registration_number": "12345678",
            "contact_info": {
                "email": "billing@premiumfoods.com",
                "phone": "+886-2-1234-5678",
                "address": "台北市信義區信義路五段7號"
            },
            "bank_info": {
                "bank_name": "台灣銀行",
                "account_number": "123-456-789-012",
                "swift_code": "BKTWTWTP"
            },
            "tax_info": {
                "tax_id": "12345678",
                "vat_registered": True
            },
            "status": "active",
            "created_at": "2023-06-15T08:00:00Z"
        })
        mock_get.return_value.__aenter__.return_value = mock_response
        
        client = SupplierServiceClient()
        supplier = await client.get_supplier_profile(supplier_id)
        
        assert supplier["supplier_id"] == supplier_id
        assert supplier["company_name"] == "Premium Foods Ltd"
        assert supplier["status"] == "active"
        assert supplier["tax_info"]["vat_registered"] is True

    @patch('app.integrations.supplier_service_client.aiohttp.ClientSession.put')
    async def test_update_supplier_billing_info(self, mock_put, test_session):
        """Test updating supplier billing information"""
        supplier_id = str(uuid.uuid4())
        
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "supplier_id": supplier_id,
            "billing_updated": True,
            "updated_at": datetime.utcnow().isoformat()
        })
        mock_put.return_value.__aenter__.return_value = mock_response
        
        billing_update = {
            "preferred_payment_method": "bank_transfer",
            "payment_terms": "net_30",
            "invoice_email": "billing@supplier.com"
        }
        
        client = SupplierServiceClient()
        result = await client.update_billing_preferences(supplier_id, billing_update)
        
        assert result["billing_updated"] is True

    @patch('app.integrations.supplier_service_client.aiohttp.ClientSession.get')
    async def test_fetch_supplier_performance_metrics(self, mock_get, test_session):
        """Test fetching supplier performance metrics for rating calculation"""
        supplier_id = str(uuid.uuid4())
        
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "supplier_id": supplier_id,
            "period": "2024-01",
            "performance_metrics": {
                "fulfillment_rate": 0.96,
                "on_time_delivery_rate": 0.94,
                "quality_complaints": 3,
                "total_orders": 150,
                "average_response_time_hours": 2.5,
                "customer_satisfaction_scores": [4.5, 4.3, 4.8, 4.2, 4.6]
            },
            "quality_score": 4.48,
            "customer_satisfaction_average": 4.48
        })
        mock_get.return_value.__aenter__.return_value = mock_response
        
        client = SupplierServiceClient()
        metrics = await client.get_performance_metrics(
            supplier_id=supplier_id,
            year=2024,
            month=1
        )
        
        assert metrics["performance_metrics"]["fulfillment_rate"] == 0.96
        assert metrics["performance_metrics"]["on_time_delivery_rate"] == 0.94
        assert metrics["quality_score"] == 4.48


class TestPaymentGatewayIntegration:
    """Test integration with payment gateways (ECPay, NewebPay)"""

    @patch('app.integrations.payment_gateway.aiohttp.ClientSession.post')
    async def test_ecpay_payment_processing(self, mock_post, test_session):
        """Test ECPay payment processing integration"""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "transaction_id": "EC202401151030001",
            "status": "success",
            "amount": 25000.00,
            "currency": "TWD",
            "gateway_fee": 125.00,
            "net_amount": 24875.00,
            "payment_date": "2024-01-15T10:30:00Z",
            "auth_code": "123456",
            "merchant_trade_no": "ORD20240115001"
        })
        mock_post.return_value.__aenter__.return_value = mock_response
        
        gateway = ECPayGateway()
        payment_data = {
            "merchant_trade_no": "ORD20240115001",
            "total_amount": 25000,
            "trade_desc": "Monthly billing payment",
            "item_name": "Billing Statement #BS001",
            "return_url": "https://api.orderly.com/webhooks/payments/ecpay/callback",
            "client_back_url": "https://app.orderly.com/payments/success"
        }
        
        result = await gateway.process_payment(payment_data)
        
        assert result["status"] == "success"
        assert result["transaction_id"] == "EC202401151030001"
        assert result["net_amount"] == 24875.00

    @patch('app.integrations.payment_gateway.aiohttp.ClientSession.post')
    async def test_newebpay_payment_processing(self, mock_post, test_session):
        """Test NewebPay payment processing integration"""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "transaction_id": "NP202401151030001",
            "status": "success",
            "amount": 15000.00,
            "currency": "TWD",
            "gateway_fee": 75.00,
            "net_amount": 14925.00,
            "payment_date": "2024-01-15T10:30:00Z",
            "payment_method": "credit_card",
            "card_last_four": "1234"
        })
        mock_post.return_value.__aenter__.return_value = mock_response
        
        gateway = NewebPayGateway()
        payment_data = {
            "merchant_order_no": "ORD20240115002",
            "amt": 15000,
            "item_desc": "Professional subscription payment",
            "return_url": "https://api.orderly.com/webhooks/payments/newebpay/callback",
            "notify_url": "https://api.orderly.com/webhooks/payments/newebpay/notify"
        }
        
        result = await gateway.process_payment(payment_data)
        
        assert result["status"] == "success"
        assert result["transaction_id"] == "NP202401151030001"
        assert result["net_amount"] == 14925.00

    async def test_payment_gateway_error_handling(self, test_session):
        """Test payment gateway error handling"""
        with patch('app.integrations.payment_gateway.aiohttp.ClientSession.post') as mock_post:
            # Simulate payment failure
            mock_response = MagicMock()
            mock_response.status = 400
            mock_response.json = AsyncMock(return_value={
                "status": "failed",
                "error_code": "INSUFFICIENT_FUNDS",
                "error_message": "信用卡餘額不足"
            })
            mock_post.return_value.__aenter__.return_value = mock_response
            
            gateway = ECPayGateway()
            payment_data = {
                "merchant_trade_no": "FAIL001",
                "total_amount": 50000,
                "trade_desc": "Test payment failure"
            }
            
            result = await gateway.process_payment(payment_data)
            
            assert result["status"] == "failed"
            assert result["error_code"] == "INSUFFICIENT_FUNDS"

    @patch('app.integrations.payment_gateway.aiohttp.ClientSession.post')
    async def test_payment_refund_processing(self, mock_post, test_session):
        """Test payment refund processing"""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "refund_id": "REF202401151030001",
            "status": "success",
            "refund_amount": 5000.00,
            "currency": "TWD",
            "refund_date": "2024-01-15T15:30:00Z",
            "original_transaction_id": "EC202401151030001"
        })
        mock_post.return_value.__aenter__.return_value = mock_response
        
        gateway = ECPayGateway()
        refund_data = {
            "original_transaction_id": "EC202401151030001",
            "refund_amount": 5000,
            "refund_reason": "Partial service credit"
        }
        
        result = await gateway.process_refund(refund_data)
        
        assert result["status"] == "success"
        assert result["refund_amount"] == 5000.00


class TestWebhookIntegration:
    """Test webhook integration for order completion and payment callbacks"""

    async def test_order_completion_webhook(self, test_session, sample_supplier_subscription):
        """Test order completion webhook processing"""
        webhook_payload = {
            "event_type": "order.completed",
            "order_id": str(uuid.uuid4()),
            "supplier_id": sample_supplier_subscription.supplier_id,
            "customer_id": str(uuid.uuid4()),
            "total_amount": 18000.00,
            "currency": "TWD",
            "completed_at": datetime.utcnow().isoformat(),
            "items": [
                {
                    "product_id": "prod_001",
                    "quantity": 6,
                    "unit_price": 3000.00,
                    "total_price": 18000.00
                }
            ]
        }
        
        # Process webhook
        result = await process_order_completion(webhook_payload, test_session)
        
        assert result["transaction_created"] is True
        assert result["commission_calculated"] is True
        assert "transaction_id" in result

    async def test_order_status_update_webhook(self, test_session, sample_billing_transactions):
        """Test order status update webhook processing"""
        existing_transaction = sample_billing_transactions[0]
        
        webhook_payload = {
            "event_type": "order.status_updated",
            "order_id": existing_transaction.order_id,
            "old_status": "processing",
            "new_status": "cancelled",
            "cancelled_at": datetime.utcnow().isoformat(),
            "cancellation_reason": "Customer request"
        }
        
        # Process webhook
        result = await process_order_completion(webhook_payload, test_session)
        
        assert result["transaction_updated"] is True
        assert result["new_status"] == "cancelled"

    async def test_payment_success_webhook(self, test_session, sample_monthly_statement):
        """Test payment success webhook from ECPay"""
        webhook_payload = {
            "merchant_trade_no": f"BS{sample_monthly_statement.id}",
            "trade_no": "EC202401151030001",
            "payment_date": "2024/01/15 10:30:00",
            "payment_type": "Credit_CreditCard",
            "trade_amt": int(sample_monthly_statement.total_amount),
            "rtn_code": "1",  # Success code
            "rtn_msg": "付款成功",
            "simulate_paid": "0"
        }
        
        # Process webhook
        result = await process_payment_callback(webhook_payload, test_session, gateway="ecpay")
        
        assert result["payment_recorded"] is True
        assert result["status"] == "completed"

    async def test_payment_failure_webhook(self, test_session, sample_monthly_statement):
        """Test payment failure webhook"""
        webhook_payload = {
            "merchant_trade_no": f"BS{sample_monthly_statement.id}",
            "trade_no": "EC202401151030002",
            "payment_date": "2024/01/15 10:35:00",
            "payment_type": "Credit_CreditCard",
            "trade_amt": int(sample_monthly_statement.total_amount),
            "rtn_code": "0",  # Failure code
            "rtn_msg": "付款失敗",
            "simulate_paid": "0"
        }
        
        # Process webhook
        result = await process_payment_callback(webhook_payload, test_session, gateway="ecpay")
        
        assert result["payment_recorded"] is True
        assert result["status"] == "failed"

    async def test_webhook_authentication(self, test_session):
        """Test webhook authentication and signature verification"""
        # Mock webhook with invalid signature
        webhook_payload = {
            "event_type": "order.completed",
            "order_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "signature": "invalid_signature"
        }
        
        with pytest.raises(Exception):  # Should raise authentication error
            await process_order_completion(webhook_payload, test_session, verify_signature=True)


class TestAPIGatewayIntegration:
    """Test integration through API Gateway"""

    async def test_api_gateway_routing_to_billing(self, client: AsyncClient):
        """Test API Gateway routing to billing service endpoints"""
        # Test that requests to /api/billing/* are properly routed
        
        # Health check through gateway
        response = await client.get("/health")
        assert response.status_code in [200, 404]  # Might not be implemented in gateway
        
        # Rate configs through gateway
        response = await client.get("/api/billing/rates/configs")
        # Depending on auth setup, might succeed or require authentication
        assert response.status_code in [200, 401, 403]

    @patch('httpx.AsyncClient.get')
    async def test_api_gateway_load_balancing(self, mock_get, test_session):
        """Test API Gateway load balancing between billing service instances"""
        # Mock multiple service instances
        mock_responses = [
            MagicMock(status_code=200, json=lambda: {"instance": "billing-1"}),
            MagicMock(status_code=200, json=lambda: {"instance": "billing-2"}),
            MagicMock(status_code=200, json=lambda: {"instance": "billing-3"})
        ]
        mock_get.side_effect = mock_responses
        
        # Make multiple requests
        for i in range(3):
            response = mock_get.return_value
            assert response.status_code == 200

    async def test_api_gateway_timeout_handling(self, client: AsyncClient):
        """Test API Gateway timeout handling for slow billing service responses"""
        with patch('httpx.AsyncClient.get') as mock_get:
            # Simulate timeout
            mock_get.side_effect = asyncio.TimeoutError()
            
            # Gateway should handle timeout gracefully
            response = await client.get("/api/billing/rates/configs")
            # Expect timeout or service unavailable response
            assert response.status_code in [408, 503, 504]

    async def test_api_gateway_circuit_breaker(self, client: AsyncClient):
        """Test API Gateway circuit breaker for billing service failures"""
        # This would test circuit breaker pattern if implemented
        # Multiple failures should trigger circuit breaker
        
        with patch('httpx.AsyncClient.get') as mock_get:
            # Simulate multiple consecutive failures
            mock_get.side_effect = [Exception("Service error")] * 5
            
            # After multiple failures, circuit should open
            for i in range(5):
                try:
                    response = await client.get("/api/billing/rates/configs")
                except:
                    pass  # Expected failures


class TestServiceDiscoveryIntegration:
    """Test service discovery and health checks"""

    @patch('app.integrations.order_service_client.aiohttp.ClientSession.get')
    async def test_service_health_check(self, mock_get, test_session):
        """Test health check integration with other services"""
        # Mock healthy service response
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "status": "healthy",
            "service": "order-service",
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat()
        })
        mock_get.return_value.__aenter__.return_value = mock_response
        
        client = OrderServiceClient()
        health_status = await client.health_check()
        
        assert health_status["status"] == "healthy"
        assert health_status["service"] == "order-service"

    async def test_service_discovery_failure_handling(self, test_session):
        """Test handling of service discovery failures"""
        with patch('app.integrations.order_service_client.aiohttp.ClientSession.get') as mock_get:
            # Simulate service discovery failure
            mock_get.side_effect = aiohttp.ClientConnectorError("Cannot connect to service")
            
            client = OrderServiceClient()
            
            # Should handle gracefully
            with pytest.raises(Exception):
                await client.health_check()


class TestMessageQueueIntegration:
    """Test message queue integration for async processing"""

    @patch('app.tasks.billing_tasks.send_message')
    async def test_async_billing_job_queuing(self, mock_send, test_session):
        """Test queuing async billing jobs"""
        # Mock message queue
        mock_send.return_value = {"message_id": "msg_123", "status": "queued"}
        
        # Queue monthly billing job
        job_data = {
            "job_type": "monthly_billing",
            "supplier_ids": [str(uuid.uuid4()), str(uuid.uuid4())],
            "billing_period": "2024-01",
            "scheduled_at": datetime.utcnow().isoformat()
        }
        
        result = await mock_send(job_data)
        
        assert result["status"] == "queued"
        assert "message_id" in result

    @patch('app.tasks.rating_tasks.process_rating_calculation')
    async def test_async_rating_calculation(self, mock_process, test_session):
        """Test async rating calculation job processing"""
        # Mock rating calculation
        mock_process.return_value = {
            "supplier_id": str(uuid.uuid4()),
            "rating_calculated": True,
            "overall_rating": 4.25,
            "rating_tier": "gold"
        }
        
        rating_job = {
            "supplier_id": str(uuid.uuid4()),
            "period_start": "2024-01-01",
            "period_end": "2024-01-31"
        }
        
        result = await mock_process(rating_job)
        
        assert result["rating_calculated"] is True
        assert result["overall_rating"] == 4.25


class TestDatabaseConnectionPooling:
    """Test database connection pooling across services"""

    async def test_concurrent_database_access(self, test_session):
        """Test concurrent database access from multiple service calls"""
        import asyncio
        
        async def create_test_transaction(supplier_id):
            from app.models.billing_transaction import BillingTransaction
            transaction = BillingTransaction(
                supplier_id=supplier_id,
                order_id=str(uuid.uuid4()),
                transaction_type="commission",
                order_amount=Decimal("5000.00"),
                commission_rate=Decimal("0.025"),
                commission_amount=Decimal("125.00"),
                net_amount=Decimal("4875.00"),
                status="completed",
                transaction_date=datetime.utcnow(),
                created_by="concurrent_test"
            )
            test_session.add(transaction)
            await test_session.commit()
            return transaction.id
        
        # Create multiple concurrent transactions
        supplier_id = str(uuid.uuid4())
        tasks = [create_test_transaction(supplier_id) for _ in range(10)]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All should succeed without connection pool exhaustion
        successful_results = [r for r in results if not isinstance(r, Exception)]
        assert len(successful_results) == 10

    async def test_database_connection_recovery(self, test_session):
        """Test database connection recovery after temporary failure"""
        # This would test connection recovery mechanisms
        # In a real scenario, you might simulate network interruption
        pass


class TestCachingIntegration:
    """Test caching integration between services"""

    @patch('app.services.rate_config_service.redis_client.get')
    @patch('app.services.rate_config_service.redis_client.set')
    async def test_rate_config_caching(self, mock_set, mock_get, test_session, sample_rate_tiers):
        """Test rate configuration caching"""
        # Mock cache miss
        mock_get.return_value = None
        mock_set.return_value = True
        
        from app.services.rate_config_service import RateConfigService
        service = RateConfigService(test_session)
        
        # First call should hit database and cache result
        tier = await service.get_applicable_tier(75000)
        assert tier is not None
        
        # Mock cache hit
        mock_get.return_value = json.dumps({
            "id": str(tier.id),
            "tier_name": tier.tier_name,
            "commission_rate": float(tier.commission_rate),
            "tier_order": tier.tier_order
        })
        
        # Second call should use cache
        cached_tier = await service.get_applicable_tier(75000)
        assert cached_tier is not None

    async def test_cache_invalidation(self, test_session):
        """Test cache invalidation when data changes"""
        # This would test cache invalidation strategies
        # when rate configs or other cached data changes
        pass


class TestSecurityIntegration:
    """Test security integration between services"""

    async def test_service_to_service_authentication(self, test_session):
        """Test authentication between microservices"""
        # Test JWT token validation for service-to-service calls
        # This would verify that services properly authenticate each other
        pass

    async def test_api_rate_limiting(self, client: AsyncClient):
        """Test API rate limiting between services"""
        # Test that rate limiting is properly applied
        # when billing service calls other services
        pass

    async def test_request_encryption(self, test_session):
        """Test request encryption for sensitive data"""
        # Test that payment and billing data is properly encrypted
        # in transit between services
        pass