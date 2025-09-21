"""
Comprehensive Integration Tests for SKU Management
Tests all critical paths with proper isolation and validation
"""
import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import patch
import json

from app.models.sku import ProductSKU, SupplierSKU, ProductAllergen, ProductNutrition


class TestSKUCreation:
    """Test SKU creation functionality"""
    
    @pytest.mark.asyncio
    async def test_create_sku_success(self, client: TestClient, auth_headers: dict, sample_sku_data: dict):
        """Test successful SKU creation"""
        
        response = client.post(
            "/api/v1/skus",
            json=sample_sku_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["sku_code"] == sample_sku_data["sku_code"]
        assert data["product_id"] == sample_sku_data["product_id"]
        assert data["base_price"] == sample_sku_data["base_price"]
    
    @pytest.mark.asyncio
    async def test_create_sku_duplicate_code(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        test_db: AsyncSession,
        sample_sku_data: dict
    ):
        """Test duplicate SKU code rejection"""
        
        # Create first SKU directly in database
        sku1 = ProductSKU(**sample_sku_data)
        test_db.add(sku1)
        await test_db.commit()
        
        # Try to create duplicate via API
        response = client.post(
            "/api/v1/skus",
            json=sample_sku_data,
            headers=auth_headers
        )
        
        assert response.status_code == 409
        error_msg = response.json()["error"]["message"].lower()
        assert "already exists" in error_msg or "duplicate" in error_msg
    
    @pytest.mark.asyncio
    async def test_create_sku_invalid_price(self, client: TestClient, auth_headers: dict, sample_sku_data: dict):
        """Test SKU creation with invalid price"""
        
        invalid_data = sample_sku_data.copy()
        invalid_data["base_price"] = -100.50  # Invalid negative price
        
        response = client.post(
            "/api/v1/skus",
            json=invalid_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422
    
    @pytest.mark.parametrize("missing_field", [
        "sku_code", "product_id", "packaging_type", "quality_grade", 
        "processing_method", "packaging_material", "base_price"
    ])
    @pytest.mark.asyncio
    async def test_create_sku_missing_required_field(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        sample_sku_data: dict,
        missing_field: str
    ):
        """Test SKU creation with missing required fields"""
        
        incomplete_data = sample_sku_data.copy()
        del incomplete_data[missing_field]
        
        response = client.post(
            "/api/v1/skus",
            json=incomplete_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422
        assert missing_field in str(response.json())


class TestSKURetrieval:
    """Test SKU retrieval functionality"""
    
    @pytest.mark.asyncio
    async def test_get_sku_by_id(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        test_db: AsyncSession,
        sample_sku_data: dict
    ):
        """Test retrieving SKU by ID"""
        
        # Create test SKU
        sku = ProductSKU(**sample_sku_data)
        test_db.add(sku)
        await test_db.commit()
        await test_db.refresh(sku)
        
        response = client.get(
            f"/api/v1/skus/{sku.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sku.id
        assert data["sku_code"] == sku.sku_code
    
    @pytest.mark.asyncio
    async def test_get_nonexistent_sku(self, client: TestClient, auth_headers: dict):
        """Test retrieving non-existent SKU"""
        
        fake_id = str(uuid.uuid4())
        response = client.get(
            f"/api/v1/skus/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["error"]["message"].lower()
    
    @pytest.mark.asyncio
    async def test_list_skus_with_pagination(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        test_db: AsyncSession,
        sample_sku_data: dict
    ):
        """Test listing SKUs with pagination"""
        
        # Create multiple SKUs
        skus = []
        for i in range(15):
            sku_data = sample_sku_data.copy()
            sku_data["sku_code"] = f"SKU-TEST-{i:03d}"
            sku_data["base_price"] = Decimal(str(100.00 + i))
            
            sku = ProductSKU(**sku_data)
            skus.append(sku)
            test_db.add(sku)
        
        await test_db.commit()
        
        # Test first page
        response = client.get(
            "/api/v1/skus?page=1&page_size=10",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 10
        assert data["total"] == 15
        assert data["page"] == 1
        assert data["page_size"] == 10
        
        # Test second page
        response = client.get(
            "/api/v1/skus?page=2&page_size=10",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 5
    
    @pytest.mark.asyncio
    async def test_filter_skus_by_status(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        test_db: AsyncSession,
        sample_sku_data: dict
    ):
        """Test filtering SKUs by status"""
        
        # Create active SKU
        active_data = sample_sku_data.copy()
        active_data["sku_code"] = "SKU-ACTIVE"
        active_data["is_active"] = True
        active_sku = ProductSKU(**active_data)
        
        # Create inactive SKU
        inactive_data = sample_sku_data.copy()
        inactive_data["sku_code"] = "SKU-INACTIVE"
        inactive_data["is_active"] = False
        inactive_sku = ProductSKU(**inactive_data)
        
        test_db.add_all([active_sku, inactive_sku])
        await test_db.commit()
        
        # Filter active SKUs
        response = client.get(
            "/api/v1/skus?is_active=true",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert all(item["is_active"] == True for item in data["items"])


class TestSKUUpdate:
    """Test SKU update functionality"""
    
    @pytest.mark.asyncio
    async def test_update_sku_success(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        test_db: AsyncSession,
        sample_sku_data: dict
    ):
        """Test successful SKU update"""
        
        # Create test SKU
        sku = ProductSKU(**sample_sku_data)
        test_db.add(sku)
        await test_db.commit()
        await test_db.refresh(sku)
        
        update_data = {
            "base_price": 150.00,
            "pricing_unit": "piece"
        }
        
        response = client.patch(
            f"/api/v1/skus/{sku.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["base_price"] == 150.00
        assert data["pricing_unit"] == "piece"
    
    @pytest.mark.asyncio
    async def test_update_sku_invalid_data(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        test_db: AsyncSession,
        sample_sku_data: dict
    ):
        """Test SKU update with invalid data"""
        
        # Create test SKU
        sku = ProductSKU(**sample_sku_data)
        test_db.add(sku)
        await test_db.commit()
        await test_db.refresh(sku)
        
        update_data = {
            "base_price": -50.00  # Invalid negative price
        }
        
        response = client.patch(
            f"/api/v1/skus/{sku.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422


class TestSKUDeletion:
    """Test SKU deletion functionality"""
    
    @pytest.mark.asyncio
    async def test_delete_sku_success(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        test_db: AsyncSession,
        sample_sku_data: dict
    ):
        """Test successful SKU deletion"""
        
        # Create test SKU
        sku = ProductSKU(**sample_sku_data)
        test_db.add(sku)
        await test_db.commit()
        await test_db.refresh(sku)
        
        response = client.delete(
            f"/api/v1/skus/{sku.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 204
        
        # Verify SKU is deleted
        response = client.get(
            f"/api/v1/skus/{sku.id}",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_nonexistent_sku(self, client: TestClient, auth_headers: dict):
        """Test deleting non-existent SKU"""
        
        fake_id = str(uuid.uuid4())
        response = client.delete(
            f"/api/v1/skus/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404


class TestSupplierSKU:
    """Test supplier SKU operations"""
    
    @pytest.mark.asyncio
    async def test_create_supplier_sku(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        test_db: AsyncSession,
        sample_sku_data: dict,
        sample_supplier_sku_data: dict
    ):
        """Test creating supplier SKU relationship"""
        
        # Create base SKU first
        sku = ProductSKU(**sample_sku_data)
        test_db.add(sku)
        await test_db.commit()
        await test_db.refresh(sku)
        
        # Update supplier SKU data with actual SKU ID
        supplier_data = sample_supplier_sku_data.copy()
        supplier_data["sku_id"] = sku.id
        
        response = client.post(
            f"/api/v1/skus/{sku.id}/suppliers",
            json=supplier_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["sku_id"] == sku.id
        assert data["supplier_price"] == supplier_data["supplier_price"]
    
    @pytest.mark.asyncio
    async def test_supplier_price_comparison(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        test_db: AsyncSession,
        sample_sku_data: dict,
        sample_supplier_sku_data: dict
    ):
        """Test supplier price comparison"""
        
        # Create base SKU
        sku = ProductSKU(**sample_sku_data)
        test_db.add(sku)
        await test_db.commit()
        await test_db.refresh(sku)
        
        # Create multiple supplier SKUs
        suppliers = []
        for i in range(3):
            supplier_data = sample_supplier_sku_data.copy()
            supplier_data["sku_id"] = sku.id
            supplier_data["supplier_id"] = f"supplier-{i}"
            supplier_data["supplier_price"] = Decimal(str(95.00 + i * 5))
            
            supplier_sku = SupplierSKU(**supplier_data)
            suppliers.append(supplier_sku)
            test_db.add(supplier_sku)
        
        await test_db.commit()
        
        # Get price comparison
        response = client.get(
            f"/api/v1/skus/{sku.id}/suppliers/compare",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["suppliers"]) == 3
        
        # Check if prices are included
        prices = [supplier["supplier_price"] for supplier in data["suppliers"]]
        assert all(price > 0 for price in prices)


class TestAllergenManagement:
    """Test allergen management"""
    
    @pytest.mark.asyncio
    async def test_add_allergen_to_sku(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        test_db: AsyncSession,
        sample_sku_data: dict,
        sample_allergen_data: dict
    ):
        """Test adding allergen to SKU"""
        
        # Create base SKU
        sku = ProductSKU(**sample_sku_data)
        test_db.add(sku)
        await test_db.commit()
        await test_db.refresh(sku)
        
        # Update allergen data
        allergen_data = sample_allergen_data.copy()
        allergen_data["sku_id"] = sku.id
        
        response = client.post(
            f"/api/v1/skus/{sku.id}/allergens",
            json=allergen_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["sku_id"] == sku.id
        assert data["allergen_type"] == allergen_data["allergen_type"]
    
    @pytest.mark.asyncio
    async def test_get_sku_allergens(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        test_db: AsyncSession,
        sample_sku_data: dict,
        sample_allergen_data: dict
    ):
        """Test retrieving SKU allergens"""
        
        # Create base SKU
        sku = ProductSKU(**sample_sku_data)
        test_db.add(sku)
        await test_db.commit()
        await test_db.refresh(sku)
        
        # Create allergen
        allergen_data = sample_allergen_data.copy()
        allergen_data["sku_id"] = sku.id
        allergen = ProductAllergen(**allergen_data)
        test_db.add(allergen)
        await test_db.commit()
        
        response = client.get(
            f"/api/v1/skus/{sku.id}/allergens",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["allergens"]) == 1
        assert data["allergens"][0]["allergen_type"] == allergen_data["allergen_type"]


class TestNutritionInformation:
    """Test nutrition information management"""
    
    @pytest.mark.asyncio
    async def test_add_nutrition_info(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        test_db: AsyncSession,
        sample_sku_data: dict,
        sample_nutrition_data: dict
    ):
        """Test adding nutrition information"""
        
        # Create base SKU (nutrition is linked to product)
        sku = ProductSKU(**sample_sku_data)
        test_db.add(sku)
        await test_db.commit()
        await test_db.refresh(sku)
        
        # Update nutrition data
        nutrition_data = sample_nutrition_data.copy()
        nutrition_data["product_id"] = sku.product_id
        
        response = client.post(
            f"/api/v1/products/{sku.product_id}/nutrition",
            json=nutrition_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["product_id"] == sku.product_id
        assert data["calories_per_100g"] == nutrition_data["calories_per_100g"]


class TestSKUBulkOperations:
    """Test bulk SKU operations"""
    
    @pytest.mark.asyncio
    async def test_bulk_create_skus(
        self, 
        client: TestClient, 
        auth_headers: dict,
        sample_sku_data: dict
    ):
        """Test bulk SKU creation"""
        
        skus_data = []
        for i in range(5):
            sku_data = sample_sku_data.copy()
            sku_data["sku_code"] = f"SKU-BULK-{i:03d}"
            sku_data["base_price"] = 100.00 + i
            skus_data.append(sku_data)
        
        response = client.post(
            "/api/v1/skus/bulk",
            json=skus_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert len(data["created"]) == 5
        assert data["failed"] == []
    
    @pytest.mark.asyncio
    async def test_bulk_update_skus(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        test_db: AsyncSession,
        sample_sku_data: dict
    ):
        """Test bulk SKU update"""
        
        # Create test SKUs
        skus = []
        for i in range(3):
            sku_data = sample_sku_data.copy()
            sku_data["sku_code"] = f"SKU-UPDATE-{i:03d}"
            sku = ProductSKU(**sku_data)
            skus.append(sku)
            test_db.add(sku)
        
        await test_db.commit()
        
        for sku in skus:
            await test_db.refresh(sku)
        
        update_data = [
            {
                "id": sku.id,
                "base_price": 200.00
            }
            for sku in skus
        ]
        
        response = client.patch(
            "/api/v1/skus/bulk",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["updated"]) == 3
        assert all(item["base_price"] == 200.00 for item in data["updated"])


class TestSKUPerformance:
    """Test SKU operation performance"""
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_create_sku_performance(
        self, 
        client: TestClient, 
        auth_headers: dict,
        sample_sku_data: dict
    ):
        """Test SKU creation performance"""
        import time
        
        start_time = time.time()
        response = client.post(
            "/api/v1/skus",
            json=sample_sku_data,
            headers=auth_headers
        )
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 201
        assert elapsed_time < 0.5  # Should complete within 500ms
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_list_skus_performance(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        test_db: AsyncSession,
        sample_sku_data: dict
    ):
        """Test SKU listing performance with dataset"""
        import time
        
        # Create multiple SKUs
        skus = []
        for i in range(100):
            sku_data = sample_sku_data.copy()
            sku_data["sku_code"] = f"SKU-PERF-{i:05d}"
            sku_data["base_price"] = Decimal(str(100.00 + (i % 100)))
            
            sku = ProductSKU(**sku_data)
            skus.append(sku)
            test_db.add(sku)
        
        await test_db.commit()
        
        start_time = time.time()
        response = client.get(
            "/api/v1/skus?page=1&page_size=50",
            headers=auth_headers
        )
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200
        assert elapsed_time < 1.0  # Should complete within 1 second


class TestSKUSecurity:
    """Test SKU security aspects"""
    
    @pytest.mark.asyncio
    async def test_create_sku_without_auth(self, client: TestClient, sample_sku_data: dict):
        """Test SKU creation without authentication"""
        
        response = client.post(
            "/api/v1/skus",
            json=sample_sku_data
        )
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_sql_injection_prevention(self, client: TestClient, auth_headers: dict):
        """Test SQL injection prevention"""
        
        malicious_search = "'; DROP TABLE product_skus; --"
        
        response = client.get(
            f"/api/v1/skus?search={malicious_search}",
            headers=auth_headers
        )
        
        # Should handle safely without executing SQL
        assert response.status_code in [200, 400]
        
        # Verify table still exists by making another valid request
        response = client.get(
            "/api/v1/skus",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_xss_prevention(
        self, 
        client: TestClient, 
        auth_headers: dict,
        sample_sku_data: dict
    ):
        """Test XSS prevention in SKU data"""
        
        # Try to inject script
        xss_data = sample_sku_data.copy()
        xss_data["sku_code"] = "SKU-XSS-TEST"
        xss_data["notes"] = "<script>alert('XSS')</script>"
        
        response = client.post(
            "/api/v1/skus",
            json=xss_data,
            headers=auth_headers
        )
        
        if response.status_code == 201:
            data = response.json()
            # Verify script tags are escaped or stripped
            assert "<script>" not in str(data.get("notes", ""))
            assert "alert" not in str(data.get("notes", "")) or data["notes"] != xss_data["notes"]


class TestErrorHandling:
    """Test error handling scenarios"""
    
    @pytest.mark.asyncio
    async def test_database_connection_error(self, client: TestClient, auth_headers: dict):
        """Test handling of database connection errors"""
        
        with patch('app.core.database.get_async_session') as mock_db:
            mock_db.side_effect = Exception("Database connection failed")
            
            response = client.get(
                "/api/v1/skus",
                headers=auth_headers
            )
            
            assert response.status_code == 500
            assert "internal error" in response.json()["error"]["message"].lower()
            assert "correlation_id" in response.json()["error"]
    
    @pytest.mark.asyncio
    async def test_validation_error_handling(
        self, 
        client: TestClient, 
        auth_headers: dict,
        sample_sku_data: dict
    ):
        """Test validation error handling"""
        
        # Send invalid enum value
        invalid_data = sample_sku_data.copy()
        invalid_data["packaging_type"] = "invalid_packaging"
        
        response = client.post(
            "/api/v1/skus",
            json=invalid_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422
        error_data = response.json()
        assert "error" in error_data
        assert "correlation_id" in error_data["error"]
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, client: TestClient, auth_headers: dict):
        """Test rate limiting functionality"""
        
        # This test would need actual rate limiting middleware
        # For now, just test that multiple requests work
        responses = []
        for i in range(10):
            response = client.get(
                "/api/v1/health",
                headers=auth_headers
            )
            responses.append(response.status_code)
        
        # All should succeed (rate limiting not implemented yet)
        assert all(status == 200 for status in responses)