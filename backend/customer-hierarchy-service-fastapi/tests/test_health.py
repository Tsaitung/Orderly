"""
Customer Hierarchy Service Health Tests
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    """Test Customer Hierarchy Service health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "customer_hierarchy" in data["service"]

def test_hierarchy_endpoints():
    """Test basic hierarchy endpoints are accessible"""
    # Test companies endpoint
    response = client.get("/api/v2/companies")
    # Should return 200 or authentication error, not 404
    assert response.status_code in [200, 401, 403, 422]
    
    # Test groups endpoint  
    response = client.get("/api/v2/groups")
    assert response.status_code in [200, 401, 403, 422]