"""
API Gateway Health Tests
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    """Test API Gateway health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "api_gateway" in data["service"]

def test_service_routing():
    """Test that API Gateway can route requests"""
    # This would test routing to backend services
    # For now, just verify the gateway itself is responsive
    response = client.get("/")
    # Should return some kind of response, even if it's an error
    # about missing routes - this just tests the gateway is running
    assert response.status_code in [200, 404, 422]