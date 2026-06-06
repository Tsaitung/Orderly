"""
ValidationService - Business rule validation service for hierarchy operations

DEPRECATED: This file is maintained for backward compatibility only.
Please import from app.services.validation instead.

Example:
    # Old import (still works)
    from app.services.validation_service import ValidationService, ValidationResult

    # New import (recommended)
    from app.services.validation import ValidationService, ValidationResult
"""

# Re-export all public symbols from the validation module for backward compatibility
from app.services.validation import (
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
