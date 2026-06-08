"""
HierarchyService - Core service for hierarchy tree operations and caching

This service handles all hierarchy-related business logic including:
- Tree structure operations (get, search, validate)
- Hierarchy navigation and path resolution
- Performance-optimized caching with Redis
- Cross-service integrations for permissions and data consistency

The service is composed of multiple mixins for better maintainability:
- TreeOperationsMixin: Tree structure operations
- SearchOperationsMixin: Search operations
- NodeOperationsMixin: Node operations
- ImportExportMixin: Import/export operations
- StatisticsMixin: Statistics operations
- ValidationMixin: Validation helper methods
"""

from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.customer_hierarchy.crud.business_unit import CRUDBusinessUnit
from app.modules.customer_hierarchy.crud.company import CRUDCompany
from app.modules.customer_hierarchy.crud.group import CRUDGroup
from app.modules.customer_hierarchy.crud.location import CRUDLocation
from app.modules.customer_hierarchy.models.business_unit import BusinessUnit
from app.modules.customer_hierarchy.models.customer_company import CustomerCompany
from app.modules.customer_hierarchy.models.customer_group import CustomerGroup
from app.modules.customer_hierarchy.models.customer_location import CustomerLocation
from app.modules.customer_hierarchy.services.cache_service import CacheService
from app.modules.customer_hierarchy.services.hierarchy.import_export import ImportExportMixin
from app.modules.customer_hierarchy.services.hierarchy.node_operations import NodeOperationsMixin
from app.modules.customer_hierarchy.services.hierarchy.search_operations import SearchOperationsMixin
from app.modules.customer_hierarchy.services.hierarchy.statistics import StatisticsMixin
from app.modules.customer_hierarchy.services.hierarchy.tree_operations import TreeOperationsMixin
from app.modules.customer_hierarchy.services.hierarchy.validation import ValidationMixin


class HierarchyService(
    TreeOperationsMixin,
    SearchOperationsMixin,
    NodeOperationsMixin,
    ImportExportMixin,
    StatisticsMixin,
    ValidationMixin,
):
    """
    Core service for managing 4-level customer hierarchy operations

    Hierarchy Structure:
    Group (Level 1) -> Company (Level 2) -> Location (Level 3) -> Business Unit (Level 4)

    Key Features:
    - High-performance tree operations with Redis caching
    - Breadcrumb navigation and path resolution
    - Advanced search with filters and permissions
    - Real-time hierarchy validation
    - Integration with order, billing, and user services
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.cache = CacheService()

        # Initialize CRUD services
        self.group_crud = CRUDGroup(CustomerGroup)
        self.company_crud = CRUDCompany(CustomerCompany)
        self.location_crud = CRUDLocation(CustomerLocation)
        self.unit_crud = CRUDBusinessUnit(BusinessUnit)

        # Entity type mapping for polymorphic operations
        self.entity_map: Dict[str, Dict[str, Any]] = {
            "group": {"model": CustomerGroup, "crud": self.group_crud, "level": 1},
            "company": {"model": CustomerCompany, "crud": self.company_crud, "level": 2},
            "location": {
                "model": CustomerLocation,
                "crud": self.location_crud,
                "level": 3,
            },
            "business_unit": {
                "model": BusinessUnit,
                "crud": self.unit_crud,
                "level": 4,
            },
            "unit": {"model": BusinessUnit, "crud": self.unit_crud, "level": 4},  # Alias
        }

        # Hierarchy relationships
        self.parent_fields: Dict[str, str] = {
            "company": "group_id",
            "location": "company_id",
            "business_unit": "location_id",
            "unit": "location_id",
        }

        self.children_fields: Dict[str, Optional[str]] = {
            "group": "companies",
            "company": "locations",
            "location": "business_units",
            "business_unit": None,
            "unit": None,
        }

    def _get_user_scope(self, user_context: Optional[Dict[str, Any]]) -> str:
        """Extract user scope for cache key generation"""
        if not user_context:
            return "anonymous"
        return f"user_{user_context.get('user_id', 'unknown')}_{user_context.get('role', 'user')}"
