"""
Test configuration and fixtures
"""
import pytest
import pytest_asyncio
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
import os
from typing import AsyncGenerator
from urllib.parse import quote

from app.main import app
from app.core.database import get_async_session
from app.models.base import Base

def get_test_database_url():
    """Get test database URL with support for separated variables"""
    # 1. Check for TEST_DATABASE_URL first
    if test_url := os.getenv("TEST_DATABASE_URL"):
        return test_url
    
    # 2. Use separated test database variables
    host = os.getenv("TEST_DATABASE_HOST", os.getenv("DATABASE_HOST", "localhost"))
    port = os.getenv("TEST_DATABASE_PORT", os.getenv("DATABASE_PORT", "5432"))
    user = os.getenv("TEST_DATABASE_USER", os.getenv("DATABASE_USER", "test_user"))
    name = os.getenv("TEST_DATABASE_NAME", os.getenv("DATABASE_NAME", "test_orderly"))
    
    # Support multiple password environment variable names
    password = (
        os.getenv("TEST_DATABASE_PASSWORD") or
        os.getenv("TEST_POSTGRES_PASSWORD") or
        os.getenv("DATABASE_PASSWORD") or
        os.getenv("POSTGRES_PASSWORD") or
        "test_pass"
    )
    
    # URL encode to handle special characters
    encoded_password = quote(password, safe="")
    encoded_user = quote(user, safe="")
    
    # Check if it's a Cloud SQL Unix Socket connection
    if host.startswith("/cloudsql/"):
        return f"postgresql+asyncpg://{encoded_user}:{encoded_password}@/{name}?host={host}"
    
    return f"postgresql+asyncpg://{encoded_user}:{encoded_password}@{host}:{port}/{name}"

# Test database URL
TEST_DATABASE_URL = get_test_database_url()

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    future=True
)

# Create test session maker
TestSessionLocal = sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

@pytest_asyncio.fixture
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """Create test database session"""
    
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async with TestSessionLocal() as session:
        yield session
    
    # Clean up - drop all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
def client(test_db: AsyncSession) -> TestClient:
    """Create test client with test database"""
    
    async def override_get_db():
        yield test_db
    
    app.dependency_overrides[get_async_session] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers():
    """Mock authentication headers"""
    return {
        "Authorization": "Bearer test-token",
        "X-User-ID": "test-user-123",
        "Content-Type": "application/json"
    }

@pytest.fixture
def sample_category_data():
    """Sample category data for tests"""
    return {
        "code": "TEST-CAT",
        "name": "Test Category",
        "nameEn": "Test Category EN",
        "level": 1,
        "sortOrder": 1,
        "isActive": True
    }

@pytest.fixture
def sample_product_data():
    """Sample product data for tests"""
    return {
        "code": "TEST-PROD-001",
        "name": "Test Product",
        "nameEn": "Test Product EN",
        "categoryId": "test-category-id",
        "brand": "Test Brand",
        "origin": "Taiwan",
        "baseUnit": "kg",
        "pricingUnit": "kg",
        "isActive": True
    }

@pytest.fixture
def sample_sku_data():
    """Sample SKU data for tests"""
    return {
        "sku_code": "SKU-TEST-001",
        "product_id": "test-product-id",
        "packaging_type": "bag_1kg",
        "quality_grade": "grade_a",
        "processing_method": "raw",
        "packaging_material": "plastic_bag",
        "base_price": 100.50,
        "pricing_unit": "kg",
        "origin_country": "Taiwan",
        "origin_region": "Taipei",
        "weight_grams": 1000,
        "minimum_order_quantity": 10,
        "is_active": True
    }

@pytest.fixture
def sample_supplier_sku_data():
    """Sample supplier SKU data for tests"""
    return {
        "sku_id": "test-sku-id",
        "supplier_id": "test-supplier-id",
        "supplier_sku_code": "SUP-SKU-001",
        "supplier_name_for_product": "Supplier Product Name",
        "supplier_price": 95.00,
        "bulk_discount_threshold": 100,
        "bulk_discount_rate": 0.1,
        "lead_time_days": 3,
        "minimum_order_quantity": 20,
        "availability_status": "available",
        "is_active": True,
        "quality_score": 4.5,
        "delivery_score": 4.2,
        "service_score": 4.8
    }

@pytest.fixture
def sample_allergen_data():
    """Sample allergen data for tests"""
    return {
        "sku_id": "test-sku-id",
        "allergen_type": "gluten",
        "risk_level": 2,  # medium risk
        "source": "wheat flour",
        "cross_contamination_risk": True,
        "is_active": True
    }

@pytest.fixture
def sample_nutrition_data():
    """Sample nutrition data for tests"""
    return {
        "product_id": "test-product-id",
        "calories_per_100g": 250.5,
        "protein_g": 12.5,
        "fat_g": 8.2,
        "carbs_g": 35.0,
        "fiber_g": 3.5,
        "sugar_g": 2.1,
        "sodium_mg": 150.0,
        "calcium_mg": 80.0,
        "iron_mg": 2.5,
        "vitamin_c_mg": 15.0,
        "nutrition_claims": ["high_protein", "low_sodium"],
        "is_verified": True,
        "data_source": "laboratory_analysis"
    }