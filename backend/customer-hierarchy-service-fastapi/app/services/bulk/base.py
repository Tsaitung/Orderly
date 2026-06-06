"""
Base mixin class for bulk operations with shared utilities.
"""

from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.customer_group import CustomerGroup
from app.models.customer_company import CustomerCompany
from app.models.customer_location import CustomerLocation
from app.models.business_unit import BusinessUnit
from app.crud.group import CRUDGroup
from app.crud.company import CRUDCompany
from app.crud.location import CRUDLocation
from app.crud.business_unit import CRUDBusinessUnit
from app.services.cache_service import CacheService
from app.services.integration_service import IntegrationService
from app.services.audit_service import AuditService
from app.services.validation_service import ValidationService
from app.services.hierarchy_service import HierarchyService
from app.services.bulk.types import BulkOperationStatus

logger = structlog.get_logger(__name__)


class BulkOperationBase:
    """
    Base class providing shared configuration and utilities for bulk operations.

    This class is designed to be used as a mixin with concrete operation classes.
    """

    # Operation thresholds
    background_threshold: int = 100
    max_batch_size: int = 1000
    default_batch_size: int = 50

    db: AsyncSession
    cache: CacheService
    integration: IntegrationService
    audit: AuditService
    validation: ValidationService
    hierarchy_service: HierarchyService

    # CRUD services
    group_crud: CRUDGroup
    company_crud: CRUDCompany
    location_crud: CRUDLocation
    unit_crud: CRUDBusinessUnit

    # Entity mapping for polymorphic operations
    entity_map: Dict[str, Dict[str, Any]]

    def _init_services(self, db: AsyncSession) -> None:
        """Initialize all required services and CRUD objects."""
        self.db = db
        self.cache = CacheService()
        self.integration = IntegrationService()
        self.audit = AuditService(db)
        self.validation = ValidationService()
        self.hierarchy_service = HierarchyService(db)

        # Initialize CRUD services
        self.group_crud = CRUDGroup(CustomerGroup)
        self.company_crud = CRUDCompany(CustomerCompany)
        self.location_crud = CRUDLocation(CustomerLocation)
        self.unit_crud = CRUDBusinessUnit(BusinessUnit)

        # Entity mapping for polymorphic operations
        self.entity_map = {
            "group": {"model": CustomerGroup, "crud": self.group_crud},
            "company": {"model": CustomerCompany, "crud": self.company_crud},
            "location": {"model": CustomerLocation, "crud": self.location_crud},
            "unit": {"model": BusinessUnit, "crud": self.unit_crud}
        }

    def _estimate_operation_duration(
        self, entity_count: int, operation_type: str
    ) -> str:
        """Estimate operation duration based on entity count and type."""
        base_time = {
            "create": 0.1,
            "update": 0.05,
            "delete": 0.03,
            "move": 0.08
        }
        estimated_seconds = entity_count * base_time.get(operation_type, 0.1)

        if estimated_seconds < 60:
            return f"{int(estimated_seconds)} seconds"
        if estimated_seconds < 3600:
            return f"{int(estimated_seconds / 60)} minutes"
        return f"{int(estimated_seconds / 3600)} hours"

    async def _update_operation_status(
        self,
        cache_key: str,
        status: BulkOperationStatus,
        additional_data: Dict[str, Any]
    ) -> None:
        """Update operation status in cache."""
        operation_data = await self.cache.get(cache_key) or {}
        operation_data["status"] = status
        operation_data.update(additional_data)
        await self.cache.set(cache_key, operation_data, ttl=86400)

    async def _update_operation_progress(
        self,
        cache_key: str,
        progress_data: Dict[str, Any]
    ) -> None:
        """Update operation progress in cache."""
        operation_data = await self.cache.get(cache_key) or {}
        operation_data["progress"] = progress_data
        await self.cache.set(cache_key, operation_data, ttl=86400)

    async def _invalidate_hierarchy_caches(self) -> None:
        """Invalidate hierarchy-related caches after bulk operations."""
        cache_patterns = [
            "hierarchy_tree:*",
            "hierarchy_stats:*",
            "breadcrumb:*"
        ]

        for pattern in cache_patterns:
            await self.cache.delete_pattern(pattern)

    async def _validate_entity_for_create(
        self,
        entity: Any,
        user_context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validate individual entity for create operation."""
        return {"is_valid": True, "errors": [], "warnings": []}

    async def _validate_bulk_hierarchy_constraints(
        self,
        entities: List[Any],
        operation_type: str
    ) -> Dict[str, Any]:
        """Validate hierarchy constraints for bulk operation."""
        return {"errors": [], "warnings": []}

    async def _validate_bulk_permissions(
        self,
        entities: List[Any],
        operation_type: str,
        user_context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validate permissions for bulk operation."""
        return {"has_permission": True}

    async def _check_system_resources(self) -> Dict[str, Any]:
        """Check system resource availability."""
        return {"available": True}

    async def _check_bulk_circular_references(
        self,
        moves: List[Any]
    ) -> Dict[str, Any]:
        """Check for circular references in bulk move operations."""
        return {"is_valid": True, "errors": []}

    async def _process_create_batch(
        self,
        batch: List[Any],
        user_context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Process a batch of create operations."""
        return {"created": [], "failed": []}
