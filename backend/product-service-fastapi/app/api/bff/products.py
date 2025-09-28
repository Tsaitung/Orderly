"""BFF endpoints backed by the product domain."""

from fastapi import APIRouter

from app.api.v1.products import router as products_v1_router
from app.api.v1.skus_simple import router as skus_v1_router

router = APIRouter(tags=["BFF Products"], include_in_schema=False)

# Reuse existing product listing/stats endpoints under the BFF umbrella
router.include_router(products_v1_router, prefix="")

# Reuse SKU search/statistics endpoints
router.include_router(skus_v1_router, prefix="")

__all__ = ["router"]
