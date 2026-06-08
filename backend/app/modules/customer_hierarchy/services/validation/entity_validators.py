"""
Entity-specific validation rules as Mixin classes

This module provides:
- GroupValidatorMixin - Group entity validation
- CompanyValidatorMixin - Company entity validation
- LocationValidatorMixin - Location entity validation
- UnitValidatorMixin - Business unit validation
"""

import re
from datetime import datetime
from typing import Any, Dict, Optional

from app.modules.customer_hierarchy.core.config import settings
from app.modules.customer_hierarchy.services.validation.types import ValidationRuleDict


class GroupValidatorMixin:
    """Mixin class for group entity validation rules"""

    async def _validate_group_name(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate group name"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        name = data.get("name", "").strip()

        if not name:
            result["errors"].append(
                {
                    "message": "Group name is required",
                    "field": "name",
                    "code": "REQUIRED_FIELD",
                }
            )
        elif len(name) < 2:
            result["errors"].append(
                {
                    "message": "Group name must be at least 2 characters long",
                    "field": "name",
                    "code": "MIN_LENGTH",
                }
            )
        elif len(name) > 100:
            result["errors"].append(
                {
                    "message": "Group name cannot exceed 100 characters",
                    "field": "name",
                    "code": "MAX_LENGTH",
                }
            )

        return result

    async def _validate_group_tax_id(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate group tax ID"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        tax_id = data.get("tax_id", "").strip()

        if tax_id and not re.match(settings.taiwan_company_tax_id_pattern, tax_id):
            result["errors"].append(
                {
                    "message": "Invalid Taiwan tax ID format",
                    "field": "tax_id",
                    "code": "INVALID_FORMAT",
                }
            )

        return result

    async def _validate_group_structure(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate group structure constraints"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        if "structure_type" in data:
            valid_types = ["holding", "subsidiary", "joint_venture", "partnership"]
            if data["structure_type"] not in valid_types:
                result["warnings"].append(
                    {
                        "message": f"Unusual group structure type: {data['structure_type']}",
                        "field": "structure_type",
                        "code": "UNUSUAL_VALUE",
                    }
                )

        return result


class CompanyValidatorMixin:
    """Mixin class for company entity validation rules"""

    async def _validate_company_name(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate company name"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        name = data.get("name", "").strip()

        if not name:
            result["errors"].append(
                {
                    "message": "Company name is required",
                    "field": "name",
                    "code": "REQUIRED_FIELD",
                }
            )
        elif len(name) < 2:
            result["errors"].append(
                {
                    "message": "Company name must be at least 2 characters long",
                    "field": "name",
                    "code": "MIN_LENGTH",
                }
            )
        elif len(name) > 200:
            result["errors"].append(
                {
                    "message": "Company name cannot exceed 200 characters",
                    "field": "name",
                    "code": "MAX_LENGTH",
                }
            )

        return result

    async def _validate_company_tax_id(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate company tax ID"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        tax_id = data.get("tax_id", "").strip()

        if not tax_id:
            result["errors"].append(
                {
                    "message": "Company tax ID is required",
                    "field": "tax_id",
                    "code": "REQUIRED_FIELD",
                }
            )
        elif not re.match(settings.taiwan_company_tax_id_pattern, tax_id):
            result["errors"].append(
                {
                    "message": "Invalid Taiwan company tax ID format",
                    "field": "tax_id",
                    "code": "INVALID_FORMAT",
                }
            )

        return result

    async def _validate_company_registration(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate company registration information"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        if "registration_date" in data:
            reg_date = data["registration_date"]
            if isinstance(reg_date, str):
                try:
                    datetime.fromisoformat(reg_date.replace("Z", "+00:00"))
                except ValueError:
                    result["errors"].append(
                        {
                            "message": "Invalid registration date format",
                            "field": "registration_date",
                            "code": "INVALID_DATE_FORMAT",
                        }
                    )

        return result

    async def _validate_company_address(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate company address"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        address = data.get("address", {})

        if isinstance(address, dict):
            if not address.get("street"):
                result["warnings"].append(
                    {
                        "message": "Company street address is recommended",
                        "field": "address.street",
                        "code": "RECOMMENDED_FIELD",
                    }
                )

            if not address.get("city"):
                result["warnings"].append(
                    {
                        "message": "Company city is recommended",
                        "field": "address.city",
                        "code": "RECOMMENDED_FIELD",
                    }
                )

        return result


class LocationValidatorMixin:
    """Mixin class for location entity validation rules"""

    async def _validate_location_name(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate location name"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        name = data.get("name", "").strip()

        if not name:
            result["errors"].append(
                {
                    "message": "Location name is required",
                    "field": "name",
                    "code": "REQUIRED_FIELD",
                }
            )
        elif len(name) < 2:
            result["errors"].append(
                {
                    "message": "Location name must be at least 2 characters long",
                    "field": "name",
                    "code": "MIN_LENGTH",
                }
            )

        return result

    async def _validate_location_address(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate location address"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        address = data.get("address", {})

        if not isinstance(address, dict):
            result["errors"].append(
                {
                    "message": "Location address must be provided",
                    "field": "address",
                    "code": "REQUIRED_FIELD",
                }
            )
        elif not address.get("street"):
            result["errors"].append(
                {
                    "message": "Location street address is required",
                    "field": "address.street",
                    "code": "REQUIRED_FIELD",
                }
            )

        return result

    async def _validate_location_coordinates(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate location coordinates"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        if "coordinates" not in data:
            return result

        coords = data["coordinates"]
        if not isinstance(coords, dict):
            return result

        lat = coords.get("latitude")
        lng = coords.get("longitude")

        if lat is not None:
            try:
                lat_float = float(lat)
                if not (-90 <= lat_float <= 90):
                    result["errors"].append(
                        {
                            "message": "Latitude must be between -90 and 90 degrees",
                            "field": "coordinates.latitude",
                            "code": "INVALID_RANGE",
                        }
                    )
            except (ValueError, TypeError):
                result["errors"].append(
                    {
                        "message": "Invalid latitude format",
                        "field": "coordinates.latitude",
                        "code": "INVALID_FORMAT",
                    }
                )

        if lng is not None:
            try:
                lng_float = float(lng)
                if not (-180 <= lng_float <= 180):
                    result["errors"].append(
                        {
                            "message": "Longitude must be between -180 and 180 degrees",
                            "field": "coordinates.longitude",
                            "code": "INVALID_RANGE",
                        }
                    )
            except (ValueError, TypeError):
                result["errors"].append(
                    {
                        "message": "Invalid longitude format",
                        "field": "coordinates.longitude",
                        "code": "INVALID_FORMAT",
                    }
                )

        return result

    async def _validate_location_contact(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate location contact information"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        contact = data.get("contact", {})

        if not isinstance(contact, dict):
            return result

        email = contact.get("email")
        if email and not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
            result["errors"].append(
                {
                    "message": "Invalid email format",
                    "field": "contact.email",
                    "code": "INVALID_EMAIL",
                }
            )

        phone = contact.get("phone")
        if phone and not re.match(r"^[\d\-\+\(\)\s]+$", phone):
            result["warnings"].append(
                {
                    "message": "Phone number format may be invalid",
                    "field": "contact.phone",
                    "code": "SUSPICIOUS_FORMAT",
                }
            )

        return result


class UnitValidatorMixin:
    """Mixin class for business unit validation rules"""

    async def _validate_unit_name(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate business unit name"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        name = data.get("name", "").strip()

        if not name:
            result["errors"].append(
                {
                    "message": "Business unit name is required",
                    "field": "name",
                    "code": "REQUIRED_FIELD",
                }
            )
        elif len(name) < 2:
            result["errors"].append(
                {
                    "message": "Business unit name must be at least 2 characters long",
                    "field": "name",
                    "code": "MIN_LENGTH",
                }
            )

        return result

    async def _validate_unit_type(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate business unit type"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        unit_type = data.get("unit_type", "").strip()
        valid_types = [
            "department",
            "division",
            "subsidiary",
            "branch",
            "office",
            "warehouse",
            "store",
        ]

        if unit_type and unit_type not in valid_types:
            result["warnings"].append(
                {
                    "message": f"Unusual business unit type: {unit_type}",
                    "field": "unit_type",
                    "code": "UNUSUAL_VALUE",
                }
            )

        return result

    async def _validate_unit_capacity(
        self,
        data: Dict[str, Any],
        operation_type: str = "",
        context: Optional[Dict[str, Any]] = None,
    ) -> ValidationRuleDict:
        """Validate business unit capacity constraints"""
        result: ValidationRuleDict = {"errors": [], "warnings": [], "info_messages": []}

        if "capacity" not in data:
            return result

        capacity = data["capacity"]
        try:
            capacity_int = int(capacity)
            if capacity_int < 0:
                result["errors"].append(
                    {
                        "message": "Capacity cannot be negative",
                        "field": "capacity",
                        "code": "INVALID_VALUE",
                    }
                )
            elif capacity_int > 10000:
                result["warnings"].append(
                    {
                        "message": "Very high capacity value, please verify",
                        "field": "capacity",
                        "code": "HIGH_VALUE",
                    }
                )
        except (ValueError, TypeError):
            result["errors"].append(
                {
                    "message": "Capacity must be a valid number",
                    "field": "capacity",
                    "code": "INVALID_FORMAT",
                }
            )

        return result
