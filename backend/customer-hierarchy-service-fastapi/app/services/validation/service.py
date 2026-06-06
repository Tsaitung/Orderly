"""
ValidationService - Main validation service class

This module provides:
- ValidationService class combining all validation mixins
- Entity validation orchestration
- Hierarchy operation validation
- Bulk operation validation
- Custom rule management
- Performance metrics tracking
"""

from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Union

import structlog

from app.services.validation.entity_validators import (
    CompanyValidatorMixin,
    GroupValidatorMixin,
    LocationValidatorMixin,
    UnitValidatorMixin,
)
from app.services.validation.hierarchy_validators import HierarchyValidators
from app.services.validation.taiwan_validators import TaiwanValidators
from app.services.validation.types import ValidationResult, ValidationRuleDict

logger = structlog.get_logger(__name__)


class ValidationService(
    GroupValidatorMixin,
    CompanyValidatorMixin,
    LocationValidatorMixin,
    UnitValidatorMixin,
):
    """
    Comprehensive validation service for hierarchy business rules

    Key Features:
    - Configurable validation rules engine
    - Taiwan-specific business compliance validation
    - Hierarchy constraint validation
    - Data format and structure validation
    - Custom validation rules with severity levels
    - Performance-optimized validation execution
    """

    def __init__(self) -> None:
        self.validation_rules: Dict[str, List[Any]] = {}
        self.taiwan_validators = TaiwanValidators()
        self.hierarchy_validators = HierarchyValidators()
        self.performance_metrics = {
            "validations_performed": 0,
            "validation_errors": 0,
            "avg_validation_time_ms": 0.0,
        }

        self._initialize_validation_rules()

    def _initialize_validation_rules(self) -> None:
        """Initialize built-in validation rules"""

        # Group validation rules
        self.validation_rules["group"] = [
            self._validate_group_name,
            self._validate_group_tax_id,
            self._validate_group_structure,
            self.taiwan_validators.validate_tax_id,
            self.hierarchy_validators.validate_group_constraints,
        ]

        # Company validation rules
        self.validation_rules["company"] = [
            self._validate_company_name,
            self._validate_company_tax_id,
            self._validate_company_registration,
            self._validate_company_address,
            self.taiwan_validators.validate_company_registration,
            self.hierarchy_validators.validate_company_constraints,
        ]

        # Location validation rules
        self.validation_rules["location"] = [
            self._validate_location_name,
            self._validate_location_address,
            self._validate_location_coordinates,
            self._validate_location_contact,
            self.hierarchy_validators.validate_location_constraints,
        ]

        # Business unit validation rules
        self.validation_rules["unit"] = [
            self._validate_unit_name,
            self._validate_unit_type,
            self._validate_unit_capacity,
            self.hierarchy_validators.validate_unit_constraints,
        ]

    async def validate_entity(
        self,
        entity_type: str,
        entity_data: Dict[str, Any],
        operation_type: str = "create",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationResult:
        """
        Validate entity data against business rules

        Args:
            entity_type: Type of entity (group, company, location, unit)
            entity_data: Entity data to validate
            operation_type: Operation type (create, update, delete)
            context: Additional validation context

        Returns:
            ValidationResult with detailed validation information
        """
        start_time = datetime.utcnow()
        result = ValidationResult()

        try:
            rules = self.validation_rules.get(entity_type, [])

            if not rules:
                result.add_warning(
                    f"No validation rules defined for entity type: {entity_type}",
                    code="NO_RULES",
                )
                return result

            for rule in rules:
                try:
                    rule_result = await self._execute_validation_rule(
                        rule, entity_data, operation_type, context
                    )

                    if rule_result:
                        result.errors.extend(rule_result.get("errors", []))
                        result.warnings.extend(rule_result.get("warnings", []))
                        result.info_messages.extend(rule_result.get("info_messages", []))

                        if rule_result.get("errors"):
                            result.is_valid = False

                except Exception as e:
                    logger.error(
                        "Validation rule execution failed",
                        rule=rule.__name__ if hasattr(rule, "__name__") else str(rule),
                        entity_type=entity_type,
                        error=str(e),
                    )
                    result.add_error(
                        f"Validation rule execution failed: {str(e)}",
                        code="RULE_EXECUTION_ERROR",
                    )

            validation_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._update_performance_metrics(True, validation_time)

            logger.debug(
                "Entity validation completed",
                entity_type=entity_type,
                operation_type=operation_type,
                is_valid=result.is_valid,
                error_count=len(result.errors),
                warning_count=len(result.warnings),
                validation_time_ms=validation_time,
            )

            return result

        except Exception as e:
            logger.error(
                "Entity validation failed",
                error=str(e),
                entity_type=entity_type,
                operation_type=operation_type,
            )

            result.add_error(
                f"Validation system error: {str(e)}",
                code="SYSTEM_ERROR",
            )

            validation_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._update_performance_metrics(False, validation_time)

            return result

    async def validate_hierarchy_operation(
        self,
        operation_type: str,
        source_entity: Dict[str, Any],
        target_entity: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationResult:
        """
        Validate hierarchy-specific operations like moves and relationships
        """
        result = ValidationResult()

        try:
            if operation_type == "move":
                return await self.hierarchy_validators.validate_move_operation(
                    source_entity, target_entity, context
                )
            elif operation_type == "parent_change":
                return await self.hierarchy_validators.validate_parent_change(
                    source_entity, target_entity, context
                )
            elif operation_type == "structure_change":
                return await self.hierarchy_validators.validate_structure_change(
                    source_entity, context
                )
            else:
                result.add_warning(
                    f"Unknown hierarchy operation type: {operation_type}",
                    code="UNKNOWN_OPERATION",
                )

            return result

        except Exception as e:
            logger.error(
                "Hierarchy operation validation failed",
                error=str(e),
                operation_type=operation_type,
            )
            result.add_error(
                f"Hierarchy validation error: {str(e)}",
                code="HIERARCHY_ERROR",
            )
            return result

    async def validate_bulk_operation(
        self,
        entities: List[Dict[str, Any]],
        operation_type: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Validate bulk operations with batch processing
        """
        try:
            validation_results = []
            total_errors = 0
            total_warnings = 0

            for i, entity in enumerate(entities):
                entity_result = await self.validate_entity(
                    entity.get("entity_type", "unknown"),
                    entity.get("data", {}),
                    operation_type,
                    context,
                )

                validation_results.append(
                    {
                        "index": i,
                        "entity_id": entity.get("id", f"entity_{i}"),
                        "entity_type": entity.get("entity_type"),
                        "validation_result": entity_result.to_dict(),
                    }
                )

                total_errors += len(entity_result.errors)
                total_warnings += len(entity_result.warnings)

            valid_entities = len(
                [r for r in validation_results if r["validation_result"]["is_valid"]]
            )
            invalid_entities = len(entities) - valid_entities

            return {
                "is_valid": invalid_entities == 0,
                "total_entities": len(entities),
                "valid_entities": valid_entities,
                "invalid_entities": invalid_entities,
                "total_errors": total_errors,
                "total_warnings": total_warnings,
                "validation_results": validation_results,
                "summary": {
                    "success_rate": valid_entities / len(entities) if entities else 0,
                    "error_rate": invalid_entities / len(entities) if entities else 0,
                },
            }

        except Exception as e:
            logger.error(
                "Bulk operation validation failed",
                error=str(e),
                entity_count=len(entities),
                operation_type=operation_type,
            )
            return {
                "is_valid": False,
                "error": str(e),
                "total_entities": len(entities),
                "validation_results": [],
            }

    def add_custom_validation_rule(
        self,
        entity_type: str,
        rule_name: str,
        rule_function: Callable[..., Any],
        priority: int = 100,
    ) -> None:
        """
        Add custom validation rule for specific entity type

        Args:
            entity_type: Entity type to apply rule to
            rule_name: Unique name for the rule
            rule_function: Validation function that returns ValidationResult
            priority: Rule execution priority (lower = higher priority)
        """
        if entity_type not in self.validation_rules:
            self.validation_rules[entity_type] = []

        rule_wrapper = {
            "name": rule_name,
            "function": rule_function,
            "priority": priority,
            "custom": True,
        }

        self.validation_rules[entity_type].append(rule_wrapper)

        self.validation_rules[entity_type].sort(
            key=lambda x: x.get("priority", 100) if isinstance(x, dict) else 100
        )

        logger.info(
            "Custom validation rule added",
            entity_type=entity_type,
            rule_name=rule_name,
            priority=priority,
        )

    def get_validation_statistics(self) -> Dict[str, Any]:
        """Get validation performance statistics"""
        return {
            "performance_metrics": self.performance_metrics,
            "total_validation_rules": sum(
                len(rules) for rules in self.validation_rules.values()
            ),
            "entity_types_covered": list(self.validation_rules.keys()),
            "custom_rules_count": sum(
                len(
                    [r for r in rules if isinstance(r, dict) and r.get("custom", False)]
                )
                for rules in self.validation_rules.values()
            ),
        }

    async def _execute_validation_rule(
        self,
        rule: Union[Callable[..., Any], Dict[str, Any]],
        entity_data: Dict[str, Any],
        operation_type: str,
        context: Optional[Dict[str, Any]],
    ) -> Optional[ValidationRuleDict]:
        """Execute individual validation rule"""
        try:
            if callable(rule):
                return await rule(entity_data, operation_type, context)
            elif isinstance(rule, dict) and "function" in rule:
                return await rule["function"](entity_data, operation_type, context)
            else:
                logger.warning("Invalid validation rule format", rule=str(rule))
                return None
        except Exception as e:
            logger.error("Validation rule execution error", error=str(e), rule=str(rule))
            return {
                "errors": [
                    {
                        "message": f"Rule execution error: {str(e)}",
                        "code": "RULE_ERROR",
                    }
                ],
                "warnings": [],
                "info_messages": [],
            }

    def _update_performance_metrics(self, success: bool, validation_time_ms: float) -> None:
        """Update validation performance metrics"""
        self.performance_metrics["validations_performed"] += 1

        if not success:
            self.performance_metrics["validation_errors"] += 1

        total_validations = self.performance_metrics["validations_performed"]
        current_avg = self.performance_metrics["avg_validation_time_ms"]

        self.performance_metrics["avg_validation_time_ms"] = (
            (current_avg * (total_validations - 1) + validation_time_ms) / total_validations
        )
