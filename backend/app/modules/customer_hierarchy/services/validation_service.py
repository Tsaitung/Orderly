"""
ValidationService - Business rule validation service for hierarchy operations

DEPRECATED: This file is maintained for backward compatibility only.
Please import from app.modules.customer_hierarchy.services.validation instead.

Example:
    # Old import (still works)
    from app.modules.customer_hierarchy.services.validation_service import ValidationService, ValidationResult

    # New import (recommended)
    from app.modules.customer_hierarchy.services.validation import ValidationService, ValidationResult
"""

# Re-export all public symbols from the validation module for backward compatibility
from app.modules.customer_hierarchy.services.validation import (
    CompanyValidatorMixin,
    GroupValidatorMixin,
    HierarchyValidators,
    LocationValidatorMixin,
    TaiwanValidators,
    UnitValidatorMixin,
    ValidationResult,
    ValidationRuleDict,
    ValidationRuleFunction,
    ValidationService,
    ValidationSeverity,
)

__all__ = [
    "ValidationService",
    "ValidationResult",
    "ValidationSeverity",
    "ValidationRuleDict",
    "ValidationRuleFunction",
    "TaiwanValidators",
    "HierarchyValidators",
    "GroupValidatorMixin",
    "CompanyValidatorMixin",
    "LocationValidatorMixin",
    "UnitValidatorMixin",
]
