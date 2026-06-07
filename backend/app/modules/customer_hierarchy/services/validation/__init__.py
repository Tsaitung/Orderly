"""
Validation module for customer hierarchy service

This module provides comprehensive validation for hierarchy operations including:
- Entity validation (group, company, location, unit)
- Taiwan-specific compliance validation
- Hierarchy constraint validation
- Custom validation rule engine

Usage:
    from app.modules.customer_hierarchy.services.validation import ValidationService, ValidationResult

    service = ValidationService()
    result = await service.validate_entity("company", company_data)
"""

from app.modules.customer_hierarchy.services.validation.entity_validators import (
    CompanyValidatorMixin,
    GroupValidatorMixin,
    LocationValidatorMixin,
    UnitValidatorMixin,
)
from app.modules.customer_hierarchy.services.validation.hierarchy_validators import HierarchyValidators
from app.modules.customer_hierarchy.services.validation.service import ValidationService
from app.modules.customer_hierarchy.services.validation.taiwan_validators import TaiwanValidators
from app.modules.customer_hierarchy.services.validation.types import (
    ValidationResult,
    ValidationRuleDict,
    ValidationRuleFunction,
    ValidationSeverity,
)

__all__ = [
    # Main service
    "ValidationService",
    # Types
    "ValidationResult",
    "ValidationSeverity",
    "ValidationRuleDict",
    "ValidationRuleFunction",
    # Validators
    "TaiwanValidators",
    "HierarchyValidators",
    # Mixins
    "GroupValidatorMixin",
    "CompanyValidatorMixin",
    "LocationValidatorMixin",
    "UnitValidatorMixin",
]
