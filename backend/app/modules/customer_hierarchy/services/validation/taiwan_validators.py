"""
Taiwan-specific validation rules

This module provides:
- Taiwan tax ID validation with checksum
- Taiwan company registration validation
- Taiwan-specific format validations
"""

import re
from typing import Any, Dict

from app.modules.customer_hierarchy.services.validation.types import ValidationRuleDict


class TaiwanValidators:
    """Taiwan-specific validation rules"""

    async def validate_tax_id(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Dict[str, Any] | None = None,
    ) -> ValidationRuleDict:
        """Validate Taiwan tax ID with checksum"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        tax_id = data.get("tax_id", "").strip()

        if tax_id and len(tax_id) == 8:
            if not self._validate_taiwan_tax_id_checksum(tax_id):
                result["errors"].append(
                    {
                        "message": "Invalid Taiwan tax ID checksum",
                        "field": "tax_id",
                        "code": "INVALID_CHECKSUM",
                    }
                )

        return result

    async def validate_company_registration(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Dict[str, Any] | None = None,
    ) -> ValidationRuleDict:
        """Validate Taiwan company registration details"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        if "registration_number" in data:
            reg_num = data["registration_number"]
            if reg_num and not re.match(r"^\d{8}$", reg_num):
                result["errors"].append(
                    {
                        "message": "Taiwan company registration number must be 8 digits",
                        "field": "registration_number",
                        "code": "INVALID_FORMAT",
                    }
                )

        return result

    def _validate_taiwan_tax_id_checksum(self, tax_id: str) -> bool:
        """
        Validate Taiwan tax ID checksum algorithm

        Taiwan Unified Business Number (統一編號) checksum:
        - 8 digits
        - Weighted sum with specific multipliers
        - Sum of products (including digit sums for >9) must be divisible by 10
        """
        if len(tax_id) != 8 or not tax_id.isdigit():
            return False

        weights = [1, 2, 1, 2, 1, 2, 4, 1]
        total = 0

        for i, digit in enumerate(tax_id):
            product = int(digit) * weights[i]
            total += product // 10 + product % 10

        return total % 10 == 0
