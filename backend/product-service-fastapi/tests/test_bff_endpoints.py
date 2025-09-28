"""Integration tests covering the newly exposed /api/bff endpoints."""
import uuid

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import ProductCategory
from app.models.product import Product
from app.models.sku_simple import ProductSKU, SKUType, CreatorType, ApprovalStatus


@pytest.mark.asyncio
async def test_bff_product_stats(client: TestClient, test_db: AsyncSession):
    """BFF stats endpoint should reuse product stats logic and return success payload."""
    category = ProductCategory(
        id=str(uuid.uuid4()),
        code="BFF-TEST-CAT",
        name="BFF Category",
        nameEn="BFF Category EN",
        level=1,
        sortOrder=1,
    )
    product = Product(
        id=str(uuid.uuid4()),
        code="BFF-PROD-001",
        name="BFF Product",
        name_en="BFF Product EN",
        category_id=category.id,
        brand="Orderly",
        origin="Taiwan",
        base_unit="kg",
        pricing_unit="kg",
        allergen_tracking_enabled=True,
    )
    sku = ProductSKU(
        id=str(uuid.uuid4()),
        product_id=product.id,
        sku_code="BFF-SKU-001",
        name="BFF SKU",
        variant={"size": "M"},
        is_active=True,
        type=SKUType.STANDARD,
        creator_type=CreatorType.SYSTEM,
        approval_status=ApprovalStatus.APPROVED,
    )

    test_db.add_all([category, product, sku])
    await test_db.commit()

    response = client.get("/api/bff/products/stats")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["totalProducts"] >= 1
    assert payload["data"]["productsWithSKUs"] >= 1


@pytest.mark.asyncio
async def test_bff_sku_search(client: TestClient, test_db: AsyncSession):
    """BFF SKU search should proxy to existing SKU search logic."""
    category = ProductCategory(
        id=str(uuid.uuid4()),
        code="BFF-SEARCH-CAT",
        name="Search Category",
        nameEn="Search Category EN",
        level=1,
        sortOrder=1,
    )
    product = Product(
        id=str(uuid.uuid4()),
        code="BFF-PROD-SEARCH",
        name="BFF Product Search",
        name_en="BFF Product Search EN",
        category_id=category.id,
        brand="Orderly",
        origin="Taiwan",
        base_unit="kg",
        pricing_unit="kg",
    )
    sku = ProductSKU(
        id=str(uuid.uuid4()),
        product_id=product.id,
        sku_code="BFF-SKU-SEARCH",
        name="Searchable SKU",
        variant={"size": "L"},
        is_active=True,
        type=SKUType.STANDARD,
        creator_type=CreatorType.SYSTEM,
        approval_status=ApprovalStatus.APPROVED,
    )

    test_db.add_all([category, product, sku])
    await test_db.commit()

    response = client.get("/api/bff/products/skus/search?page_size=10")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert isinstance(payload["data"], list)
    assert any(item["code"] == "BFF-SKU-SEARCH" for item in payload["data"])


def test_bff_hierarchy_tree(client: TestClient, monkeypatch):
    """BFF hierarchy tree should proxy to customer hierarchy service."""

    async def mock_get(self, url, params=None, headers=None):  # pylint: disable=unused-argument
        class MockResponse:
            status_code = 200
            headers = {}
            text = "{\"data\": []}"

            def json(self):
                return {"data": []}

        assert url.endswith("/api/v2/hierarchy/tree")
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    response = client.get("/api/bff/v2/hierarchy/tree?include_inactive=true")
    assert response.status_code == 200
    assert response.json() == {"data": []}
