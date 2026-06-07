"""
Validation types and base classes

This module provides:
- ValidationSeverity enum for severity levels
- ValidationResult container class
- Type definitions for validation functions
"""

from typing import Any, Callable, Coroutine, Dict, List, Optional
from enum import Enum


class ValidationSeverity(str, Enum):
    """Validation severity levels"""

    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class ValidationResult:
    """Validation result container"""

    def __init__(self) -> None:
        self.is_valid = True
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.info_messages: List[Dict[str, Any]] = []

    def add_error(
        self,
        message: str,
        field: Optional[str] = None,
        code: Optional[str] = None,
    ) -> None:
        """Add error message"""
        self.is_valid = False
        self.errors.append(
            {
                "message": message,
                "field": field,
                "code": code,
                "severity": ValidationSeverity.ERROR,
            }
        )

    def add_warning(
        self,
        message: str,
        field: Optional[str] = None,
        code: Optional[str] = None,
    ) -> None:
        """Add warning message"""
        self.warnings.append(
            {
                "message": message,
                "field": field,
                "code": code,
                "severity": ValidationSeverity.WARNING,
            }
        )

    def add_info(
        self,
        message: str,
        field: Optional[str] = None,
        code: Optional[str] = None,
    ) -> None:
        """Add info message"""
        self.info_messages.append(
            {
                "message": message,
                "field": field,
                "code": code,
                "severity": ValidationSeverity.INFO,
            }
        )

    def merge(self, other: "ValidationResult") -> None:
        """Merge another ValidationResult into this one"""
        self.errors.extend(other.errors)
        self.warnings.extend(other.warnings)
        self.info_messages.extend(other.info_messages)
        if other.errors:
            self.is_valid = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "is_valid": self.is_valid,
            "errors": self.errors,
            "warnings": self.warnings,
            "info_messages": self.info_messages,
            "total_issues": len(self.errors) + len(self.warnings),
        }


# Type alias for validation rule functions
ValidationRuleDict = Dict[str, Any]
ValidationRuleFunction = Callable[
    [Dict[str, Any], str, Optional[Dict[str, Any]]],
    Coroutine[Any, Any, Optional[ValidationRuleDict]],
]
