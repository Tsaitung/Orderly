"""
Supplier Service Health Tests
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    """Test Supplier Service health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "supplier" in data["service"]

def test_supplier_endpoints():
    """Test basic supplier endpoints are accessible"""
    # Test suppliers endpoint
    response = client.get("/api/v1/suppliers")
    # Should return 200 or authentication error, not 404
    assert response.status_code in [200, 401, 403, 422]