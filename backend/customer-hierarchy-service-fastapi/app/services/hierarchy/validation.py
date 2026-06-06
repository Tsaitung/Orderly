"""
Validation Mixin for HierarchyService

Contains validation helper methods:
- _validate_hierarchy_levels: Validate proper hierarchy level ordering
- _check_circular_reference: Check for circular references
- _check_parent_capacity: Check parent capacity constraints
- _count_direct_children: Count direct children
- _validate_move_permissions: Validate move permissions
- _validate_business_rules_for_move: Validate business rules for move
- _count_affected_children: Count affected children
- _validate_parent_relationship: Validate parent relationship
- _validate_business_rules: Validate business rules
- _validate_children_relationships: Validate children relationships
"""

import re
from typing import Any, Dict, List, Optional, Tuple

import structlog
from sqlalchemy import and_, func, select

from app.core.config import settings

logger = structlog.get_logger(__name__)


class ValidationMixin:
    """Mixin class for validation helper methods"""

    def _validate_hierarchy_levels(
        self, source_type: str, target_parent_type: str
    ) -> Tuple[bool, str]:
        """Validate proper hierarchy level ordering"""
        level_order = ["group", "company", "location", "business_unit", "unit"]

        try:
            # Normalize unit to business_unit
            normalized_source = (
                "business_unit" if source_type == "unit" else source_type
            )
            normalized_target = (
                "business_unit" if target_parent_type == "unit" else target_parent_type
            )

            source_level = level_order.index(normalized_source)
            target_level = level_order.index(normalized_target)

            # Source should be exactly one level below target
            if source_level != target_level + 1:
                return (
                    False,
                    f"Cannot move {source_type} under {target_parent_type} - invalid hierarchy level",
                )

            return True, ""
        except ValueError:
            return False, "Invalid entity types specified"

    async def _check_circular_reference(
        self,
        source_id: str,
        source_type: str,
        target_parent_id: str,
        target_parent_type: str,
    ) -> Dict[str, Any]:
        """Check for circular references in hierarchy"""
        # Build path from target parent to root
        current_id = target_parent_id
        current_type = target_parent_type
        visited_ids = set()

        while current_id and current_type:
            if current_id in visited_ids:
                return {
                    "is_valid": False,
                    "error": "Circular reference detected in current hierarchy",
                }

            if current_id == source_id:
                return {
                    "is_valid": False,
                    "error": "Move would create circular reference",
                }

            visited_ids.add(current_id)

            # Get parent
            entity_info = self.entity_map.get(current_type)
            if not entity_info:
                break

            crud_service = entity_info["crud"]
            entity = await crud_service.get(self.db, id=current_id)
            if not entity:
                break

            parent_field = self.parent_fields.get(current_type)
            if parent_field:
                current_id = getattr(entity, parent_field, None)
                # Determine parent type
                if current_type == "company":
                    current_type = "group"
                elif current_type == "location":
                    current_type = "company"
                elif current_type == "business_unit":
                    current_type = "location"
                else:
                    current_type = None
            else:
                current_id = None
                current_type = None

        return {"is_valid": True}

    async def _check_parent_capacity(
        self, parent_id: str, parent_type: str, child_type: str
    ) -> Dict[str, Any]:
        """Check if parent can accept additional children"""
        # Get current child count
        child_count = await self._count_direct_children(
            parent_id, parent_type, child_type
        )

        # Check against business rules
        if parent_type == "company" and child_type == "location":
            max_allowed = settings.max_locations_per_company
            if child_count >= max_allowed:
                return {
                    "is_valid": False,
                    "is_warning": False,
                    "message": f"Company cannot have more than {max_allowed} locations",
                }
            elif child_count >= max_allowed * 0.8:  # 80% warning threshold
                return {
                    "is_valid": True,
                    "is_warning": True,
                    "message": f"Company approaching maximum location limit ({child_count}/{max_allowed})",
                }
        elif parent_type == "location" and child_type in ["business_unit", "unit"]:
            max_allowed = settings.max_units_per_location
            if child_count >= max_allowed:
                return {
                    "is_valid": False,
                    "is_warning": False,
                    "message": f"Location cannot have more than {max_allowed} business units",
                }
            elif child_count >= max_allowed * 0.8:  # 80% warning threshold
                return {
                    "is_valid": True,
                    "is_warning": True,
                    "message": f"Location approaching maximum business unit limit ({child_count}/{max_allowed})",
                }

        return {"is_valid": True, "is_warning": False, "message": ""}

    async def _count_direct_children(
        self, parent_id: str, parent_type: str, child_type: str
    ) -> int:
        """Count direct children of a specific parent"""
        child_info = self.entity_map.get(child_type)
        if not child_info:
            return 0

        parent_field = self.parent_fields.get(child_type)
        if not parent_field:
            return 0

        # Use database count query for efficiency
        model = child_info["model"]
        query = select(func.count(model.id)).where(
            getattr(model, parent_field) == parent_id
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _validate_business_rules_for_move(
        self,
        source_id: str,
        source_type: str,
        target_parent_id: str,
        target_parent_type: str,
    ) -> Dict[str, Any]:
        """Validate business-specific rules for move operation"""
        errors = []
        warnings = []

        # Example business rule: Cannot move companies with active orders
        if source_type == "company":
            # Would check for active orders, billing records, etc.
            pass

        # Example: Validate location capacity for business units
        if source_type in ["business_unit", "unit"] and target_parent_type == "location":
            capacity_check = await self._check_parent_capacity(
                target_parent_id, target_parent_type, source_type
            )
            if not capacity_check["is_valid"]:
                if capacity_check["is_warning"]:
                    warnings.append(capacity_check["message"])
                else:
                    errors.append(capacity_check["message"])

        return {"is_valid": len(errors) == 0, "errors": errors, "warnings": warnings}

    async def _validate_parent_relationship(
        self, node_data: Any, node_type: str
    ) -> Tuple[bool, List[str]]:
        """Validate parent relationship consistency"""
        errors = []

        parent_field = self.parent_fields.get(node_type)
        if parent_field:
            parent_id = getattr(node_data, parent_field, None)
            if parent_id:
                # Check if parent exists
                parent_type = None
                if node_type == "company":
                    parent_type = "group"
                elif node_type == "location":
                    parent_type = "company"
                elif node_type in ["business_unit", "unit"]:
                    parent_type = "location"

                if parent_type:
                    parent_exists = await self._node_exists(parent_id, parent_type)
                    if not parent_exists:
                        errors.append(f"Parent {parent_type} {parent_id} not found")

        return len(errors) == 0, errors

    async def _validate_business_rules(
        self, node_data: Any, node_type: str
    ) -> Tuple[bool, List[str], List[str]]:
        """Validate business rules for node"""
        errors = []
        warnings = []

        # Use model's built-in validation if available
        if hasattr(node_data, "validate_business_rules"):
            model_errors = node_data.validate_business_rules()
            errors.extend(model_errors)

        # Additional validations based on type
        if node_type == "company":
            # Validate tax ID format for Taiwan
            if hasattr(node_data, "tax_id") and node_data.tax_id:
                if not re.match(
                    settings.taiwan_company_tax_id_pattern, node_data.tax_id
                ):
                    errors.append("Invalid Taiwan company tax ID format")

        return len(errors) == 0, errors, warnings

    async def _validate_children_relationships(
        self, node_id: str, node_type: str
    ) -> Tuple[bool, List[str]]:
        """Validate children relationship consistency"""
        errors = []

        # Check if all children properly reference this node as parent
        child_type = None
        if node_type == "group":
            child_type = "company"
        elif node_type == "company":
            child_type = "location"
        elif node_type == "location":
            child_type = "business_unit"

        if child_type:
            child_info = self.entity_map.get(child_type)
            if child_info:
                model = child_info["model"]
                parent_field = self.parent_fields.get(child_type)
                if parent_field:
                    # Query for children with incorrect parent reference
                    query = select(func.count(model.id)).where(
                        and_(
                            getattr(model, parent_field) == node_id,
                            model.is_active == True,
                        )
                    )
                    child_count = await self.db.execute(query)
                    # Additional validation logic would go here

        return len(errors) == 0, errors
