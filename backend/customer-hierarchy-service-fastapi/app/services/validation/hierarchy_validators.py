"""
Hierarchy-specific validation rules

This module provides:
- Group constraints validation
- Company constraints validation
- Location constraints validation
- Business unit constraints validation
- Hierarchy move operation validation
- Parent relationship change validation
"""

from typing import Any, Dict, Optional

from app.core.config import settings
from app.services.validation.types import ValidationResult, ValidationRuleDict


class HierarchyValidators:
    """Hierarchy-specific validation rules"""

    # Hierarchy level ordering for move validation
    HIERARCHY_ORDER = ["group", "company", "location", "unit"]

    async def validate_group_constraints(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate group-level constraints"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        if "max_companies" in data:
            max_companies = data["max_companies"]
            if isinstance(max_companies, int) and max_companies > 1000:
                result["warnings"].append(
                    {
                        "message": "Large number of companies in group may impact performance",
                        "field": "max_companies",
                        "code": "PERFORMANCE_WARNING",
                    }
                )

        return result

    async def validate_company_constraints(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate company-level constraints"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        if "max_locations" in data:
            max_locations = data["max_locations"]
            if (
                isinstance(max_locations, int)
                and max_locations > settings.max_locations_per_company
            ):
                result["errors"].append(
                    {
                        "message": f"Company cannot have more than {settings.max_locations_per_company} locations",
                        "field": "max_locations",
                        "code": "LIMIT_EXCEEDED",
                    }
                )

        return result

    async def validate_location_constraints(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate location-level constraints"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        if "max_units" in data:
            max_units = data["max_units"]
            if (
                isinstance(max_units, int)
                and max_units > settings.max_units_per_location
            ):
                result["errors"].append(
                    {
                        "message": f"Location cannot have more than {settings.max_units_per_location} business units",
                        "field": "max_units",
                        "code": "LIMIT_EXCEEDED",
                    }
                )

        return result

    async def validate_unit_constraints(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate business unit constraints"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        # Business unit is at the bottom level, no children allowed
        if "children" in data and data["children"]:
            result["errors"].append(
                {
                    "message": "Business units cannot have child entities",
                    "field": "children",
                    "code": "HIERARCHY_VIOLATION",
                }
            )

        return result

    async def validate_move_operation(
        self,
        source_entity: Dict[str, Any],
        target_entity: Optional[Dict[str, Any]],
        context: Optional[Dict[str, Any]],
    ) -> ValidationResult:
        """Validate hierarchy move operation"""
        result = ValidationResult()

        if target_entity is None:
            result.add_error(
                "Target entity is required for move operation",
                code="MISSING_TARGET",
            )
            return result

        source_type = source_entity.get("entity_type")
        target_type = target_entity.get("entity_type")

        try:
            source_level = self.HIERARCHY_ORDER.index(source_type)
            target_level = self.HIERARCHY_ORDER.index(target_type)

            if source_level != target_level + 1:
                result.add_error(
                    f"Cannot move {source_type} under {target_type} - invalid hierarchy level",
                    code="INVALID_HIERARCHY_LEVEL",
                )
        except ValueError:
            result.add_error(
                "Invalid entity types in move operation",
                code="INVALID_ENTITY_TYPE",
            )

        return result

    async def validate_parent_change(
        self,
        entity: Dict[str, Any],
        new_parent: Optional[Dict[str, Any]],
        context: Optional[Dict[str, Any]],
    ) -> ValidationResult:
        """Validate parent relationship change"""
        result = ValidationResult()

        # Implement parent change validation
        # This would include circular reference detection, etc.

        return result

    async def validate_structure_change(
        self,
        entity: Dict[str, Any],
        context: Optional[Dict[str, Any]],
    ) -> ValidationResult:
        """Validate structure changes that might affect hierarchy"""
        result = ValidationResult()

        # Implement structure change validation

        return result
