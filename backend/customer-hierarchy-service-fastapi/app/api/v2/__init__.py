"""
API v2 Router for Customer Hierarchy Service
"""

from fastapi import APIRouter
from .endpoints import (
    groups,
    companies,
    locations,
    business_units,
    hierarchy,
    migration,
    bulk,
    health,
)

router = APIRouter()

# Include endpoint routers
router.include_router(
    groups.router,
    prefix="/groups",
    tags=["Groups"]
)

router.include_router(
    companies.router,
    prefix="/companies", 
    tags=["Companies"]
)

router.include_router(
    locations.router,
    prefix="/locations",
    tags=["Locations"]
)

router.include_router(
    business_units.router,
    prefix="/business-units",
    tags=["Business Units"]
)

router.include_router(
    hierarchy.router,
    prefix="/hierarchy",
    tags=["Hierarchy"]
)

router.include_router(
    migration.router,
    prefix="/migration",
    tags=["Migration"]
)

router.include_router(
    bulk.router,
    prefix="/bulk",
    tags=["Bulk Operations"]
)

router.include_router(
    health.router,
    prefix="/health",
    tags=["Health"]
)
