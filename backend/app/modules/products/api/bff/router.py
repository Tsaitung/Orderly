"""Root router for BFF endpoints exposed by the product service."""

from fastapi import APIRouter

from . import hierarchy, products

router = APIRouter(prefix="/api/bff", tags=["BFF"], include_in_schema=False)

# Product-related dashboards (stats, SKU search, etc.)
router.include_router(products.router, prefix="/products")

# Customer hierarchy dashboards (tree view)
router.include_router(hierarchy.router, prefix="/v2")

__all__ = ["router"]
