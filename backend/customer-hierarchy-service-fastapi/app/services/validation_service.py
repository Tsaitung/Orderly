"""
ValidationService - Business rule validation service for hierarchy operations

This service provides:
- Business rule validation engine
- Taiwan-specific compliance validation (tax IDs, business registration)
- Hierarchy constraint validation
- Data format and structure validation
- Custom validation rule engine
"""

from typing import Dict, List, Optional, Any, Union, Tuple, Callable
import re
from datetime import datetime
from enum import Enum
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


class ValidationSeverity(str, Enum):
    """Validation severity levels"""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class ValidationResult:
    """Validation result container"""
    
    def __init__(self):
        self.is_valid = True
        self.errors = []
        self.warnings = []
        self.info_messages = []
    
    def add_error(self, message: str, field: Optional[str] = None, code: Optional[str] = None):
        """Add error message"""
        self.is_valid = False
        self.errors.append({
            "message": message,
            "field": field,
            "code": code,
            "severity": ValidationSeverity.ERROR
        })
    
    def add_warning(self, message: str, field: Optional[str] = None, code: Optional[str] = None):
        """Add warning message"""
        self.warnings.append({
            "message": message,
            "field": field,
            "code": code,
            "severity": ValidationSeverity.WARNING
        })
    
    def add_info(self, message: str, field: Optional[str] = None, code: Optional[str] = None):
        """Add info message"""
        self.info_messages.append({
            "message": message,
            "field": field,
            "code": code,
            "severity": ValidationSeverity.INFO
        })
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "is_valid": self.is_valid,
            "errors": self.errors,
            "warnings": self.warnings,
            "info_messages": self.info_messages,
            "total_issues": len(self.errors) + len(self.warnings)
        }


class ValidationService:
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
    
    def __init__(self):
        self.validation_rules = {}
        self.taiwan_validators = TaiwanValidators()
        self.hierarchy_validators = HierarchyValidators()
        self.performance_metrics = {
            "validations_performed": 0,
            "validation_errors": 0,
            "avg_validation_time_ms": 0
        }
        
        # Initialize built-in validation rules
        self._initialize_validation_rules()
    
    def _initialize_validation_rules(self):
        """Initialize built-in validation rules"""
        
        # Group validation rules
        self.validation_rules["group"] = [
            self._validate_group_name,
            self._validate_group_tax_id,
            self._validate_group_structure,
            self.taiwan_validators.validate_tax_id,
            self.hierarchy_validators.validate_group_constraints
        ]
        
        # Company validation rules
        self.validation_rules["company"] = [
            self._validate_company_name,
            self._validate_company_tax_id,
            self._validate_company_registration,
            self._validate_company_address,
            self.taiwan_validators.validate_company_registration,
            self.hierarchy_validators.validate_company_constraints
        ]
        
        # Location validation rules
        self.validation_rules["location"] = [
            self._validate_location_name,
            self._validate_location_address,
            self._validate_location_coordinates,
            self._validate_location_contact,
            self.hierarchy_validators.validate_location_constraints
        ]
        
        # Business unit validation rules
        self.validation_rules["unit"] = [
            self._validate_unit_name,
            self._validate_unit_type,
            self._validate_unit_capacity,
            self.hierarchy_validators.validate_unit_constraints
        ]
    
    async def validate_entity(
        self,
        entity_type: str,
        entity_data: Dict[str, Any],
        operation_type: str = "create",
        context: Optional[Dict[str, Any]] = None
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
            # Get validation rules for entity type
            rules = self.validation_rules.get(entity_type, [])
            
            if not rules:
                result.add_warning(
                    f"No validation rules defined for entity type: {entity_type}",
                    code="NO_RULES"
                )
                return result
            
            # Execute validation rules
            for rule in rules:
                try:
                    rule_result = await self._execute_validation_rule(
                        rule, entity_data, operation_type, context
                    )
                    
                    if rule_result:
                        # Merge rule result into main result
                        result.errors.extend(rule_result.get("errors", []))
                        result.warnings.extend(rule_result.get("warnings", []))
                        result.info_messages.extend(rule_result.get("info_messages", []))
                        
                        if rule_result.get("errors"):
                            result.is_valid = False
                
                except Exception as e:
                    logger.error(
                        "Validation rule execution failed",
                        rule=rule.__name__ if hasattr(rule, '__name__') else str(rule),
                        entity_type=entity_type,
                        error=str(e)
                    )
                    result.add_error(
                        f"Validation rule execution failed: {str(e)}",
                        code="RULE_EXECUTION_ERROR"
                    )
            
            # Update performance metrics
            validation_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._update_performance_metrics(True, validation_time)
            
            logger.debug(
                "Entity validation completed",
                entity_type=entity_type,
                operation_type=operation_type,
                is_valid=result.is_valid,
                error_count=len(result.errors),
                warning_count=len(result.warnings),
                validation_time_ms=validation_time
            )
            
            return result
            
        except Exception as e:
            logger.error(
                "Entity validation failed",
                error=str(e),
                entity_type=entity_type,
                operation_type=operation_type
            )
            
            result.add_error(
                f"Validation system error: {str(e)}",
                code="SYSTEM_ERROR"
            )
            
            validation_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._update_performance_metrics(False, validation_time)
            
            return result
    
    async def validate_hierarchy_operation(
        self,
        operation_type: str,
        source_entity: Dict[str, Any],
        target_entity: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None
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
                    code="UNKNOWN_OPERATION"
                )
            
            return result
            
        except Exception as e:
            logger.error(
                "Hierarchy operation validation failed",
                error=str(e),
                operation_type=operation_type
            )
            result.add_error(
                f"Hierarchy validation error: {str(e)}",
                code="HIERARCHY_ERROR"
            )
            return result
    
    async def validate_bulk_operation(
        self,
        entities: List[Dict[str, Any]],
        operation_type: str,
        context: Optional[Dict[str, Any]] = None
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
                    context
                )
                
                validation_results.append({
                    "index": i,
                    "entity_id": entity.get("id", f"entity_{i}"),
                    "entity_type": entity.get("entity_type"),
                    "validation_result": entity_result.to_dict()
                })
                
                total_errors += len(entity_result.errors)
                total_warnings += len(entity_result.warnings)
            
            # Calculate summary statistics
            valid_entities = len([r for r in validation_results if r["validation_result"]["is_valid"]])
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
                    "error_rate": invalid_entities / len(entities) if entities else 0
                }
            }
            
        except Exception as e:
            logger.error(
                "Bulk operation validation failed",
                error=str(e),
                entity_count=len(entities),
                operation_type=operation_type
            )
            return {
                "is_valid": False,
                "error": str(e),
                "total_entities": len(entities),
                "validation_results": []
            }
    
    def add_custom_validation_rule(
        self,
        entity_type: str,
        rule_name: str,
        rule_function: Callable,
        priority: int = 100
    ):
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
        
        # Add rule with metadata
        rule_wrapper = {
            "name": rule_name,
            "function": rule_function,
            "priority": priority,
            "custom": True
        }
        
        self.validation_rules[entity_type].append(rule_wrapper)
        
        # Sort by priority
        self.validation_rules[entity_type].sort(
            key=lambda x: x.get("priority", 100) if isinstance(x, dict) else 100
        )
        
        logger.info(
            "Custom validation rule added",
            entity_type=entity_type,
            rule_name=rule_name,
            priority=priority
        )
    
    def get_validation_statistics(self) -> Dict[str, Any]:
        """Get validation performance statistics"""
        return {
            "performance_metrics": self.performance_metrics,
            "total_validation_rules": sum(len(rules) for rules in self.validation_rules.values()),
            "entity_types_covered": list(self.validation_rules.keys()),
            "custom_rules_count": sum(
                len([r for r in rules if isinstance(r, dict) and r.get("custom", False)])
                for rules in self.validation_rules.values()
            )
        }
    
    # Built-in validation rule implementations
    
    async def _validate_group_name(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate group name"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        name = data.get("name", "").strip()
        
        if not name:
            result["errors"].append({
                "message": "Group name is required",
                "field": "name",
                "code": "REQUIRED_FIELD"
            })
        elif len(name) < 2:
            result["errors"].append({
                "message": "Group name must be at least 2 characters long",
                "field": "name",
                "code": "MIN_LENGTH"
            })
        elif len(name) > 100:
            result["errors"].append({
                "message": "Group name cannot exceed 100 characters",
                "field": "name",
                "code": "MAX_LENGTH"
            })
        
        return result
    
    async def _validate_group_tax_id(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate group tax ID"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        tax_id = data.get("tax_id", "").strip()
        
        if tax_id and not re.match(settings.taiwan_company_tax_id_pattern, tax_id):
            result["errors"].append({
                "message": "Invalid Taiwan tax ID format",
                "field": "tax_id",
                "code": "INVALID_FORMAT"
            })
        
        return result
    
    async def _validate_group_structure(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate group structure constraints"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        # Check if group has required structure fields
        if "structure_type" in data:
            valid_types = ["holding", "subsidiary", "joint_venture", "partnership"]
            if data["structure_type"] not in valid_types:
                result["warnings"].append({
                    "message": f"Unusual group structure type: {data['structure_type']}",
                    "field": "structure_type",
                    "code": "UNUSUAL_VALUE"
                })
        
        return result
    
    async def _validate_company_name(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate company name"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        name = data.get("name", "").strip()
        
        if not name:
            result["errors"].append({
                "message": "Company name is required",
                "field": "name",
                "code": "REQUIRED_FIELD"
            })
        elif len(name) < 2:
            result["errors"].append({
                "message": "Company name must be at least 2 characters long",
                "field": "name",
                "code": "MIN_LENGTH"
            })
        elif len(name) > 200:
            result["errors"].append({
                "message": "Company name cannot exceed 200 characters",
                "field": "name",
                "code": "MAX_LENGTH"
            })
        
        return result
    
    async def _validate_company_tax_id(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate company tax ID"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        tax_id = data.get("tax_id", "").strip()
        
        if not tax_id:
            result["errors"].append({
                "message": "Company tax ID is required",
                "field": "tax_id",
                "code": "REQUIRED_FIELD"
            })
        elif not re.match(settings.taiwan_company_tax_id_pattern, tax_id):
            result["errors"].append({
                "message": "Invalid Taiwan company tax ID format",
                "field": "tax_id",
                "code": "INVALID_FORMAT"
            })
        
        return result
    
    async def _validate_company_registration(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate company registration information"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        if "registration_date" in data:
            reg_date = data["registration_date"]
            if isinstance(reg_date, str):
                try:
                    datetime.fromisoformat(reg_date.replace('Z', '+00:00'))
                except ValueError:
                    result["errors"].append({
                        "message": "Invalid registration date format",
                        "field": "registration_date",
                        "code": "INVALID_DATE_FORMAT"
                    })
        
        return result
    
    async def _validate_company_address(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate company address"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        address = data.get("address", {})
        
        if isinstance(address, dict):
            if not address.get("street"):
                result["warnings"].append({
                    "message": "Company street address is recommended",
                    "field": "address.street",
                    "code": "RECOMMENDED_FIELD"
                })
            
            if not address.get("city"):
                result["warnings"].append({
                    "message": "Company city is recommended",
                    "field": "address.city",
                    "code": "RECOMMENDED_FIELD"
                })
        
        return result
    
    async def _validate_location_name(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate location name"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        name = data.get("name", "").strip()
        
        if not name:
            result["errors"].append({
                "message": "Location name is required",
                "field": "name",
                "code": "REQUIRED_FIELD"
            })
        elif len(name) < 2:
            result["errors"].append({
                "message": "Location name must be at least 2 characters long",
                "field": "name",
                "code": "MIN_LENGTH"
            })
        
        return result
    
    async def _validate_location_address(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate location address"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        address = data.get("address", {})
        
        if not isinstance(address, dict):
            result["errors"].append({
                "message": "Location address must be provided",
                "field": "address",
                "code": "REQUIRED_FIELD"
            })
        else:
            if not address.get("street"):
                result["errors"].append({
                    "message": "Location street address is required",
                    "field": "address.street",
                    "code": "REQUIRED_FIELD"
                })
        
        return result
    
    async def _validate_location_coordinates(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate location coordinates"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        if "coordinates" in data:
            coords = data["coordinates"]
            if isinstance(coords, dict):
                lat = coords.get("latitude")
                lng = coords.get("longitude")
                
                if lat is not None:
                    try:
                        lat_float = float(lat)
                        if not (-90 <= lat_float <= 90):
                            result["errors"].append({
                                "message": "Latitude must be between -90 and 90 degrees",
                                "field": "coordinates.latitude",
                                "code": "INVALID_RANGE"
                            })
                    except (ValueError, TypeError):
                        result["errors"].append({
                            "message": "Invalid latitude format",
                            "field": "coordinates.latitude",
                            "code": "INVALID_FORMAT"
                        })
                
                if lng is not None:
                    try:
                        lng_float = float(lng)
                        if not (-180 <= lng_float <= 180):
                            result["errors"].append({
                                "message": "Longitude must be between -180 and 180 degrees",
                                "field": "coordinates.longitude",
                                "code": "INVALID_RANGE"
                            })
                    except (ValueError, TypeError):
                        result["errors"].append({
                            "message": "Invalid longitude format",
                            "field": "coordinates.longitude",
                            "code": "INVALID_FORMAT"
                        })
        
        return result
    
    async def _validate_location_contact(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate location contact information"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        contact = data.get("contact", {})
        
        if isinstance(contact, dict):
            email = contact.get("email")
            if email and not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
                result["errors"].append({
                    "message": "Invalid email format",
                    "field": "contact.email",
                    "code": "INVALID_EMAIL"
                })
            
            phone = contact.get("phone")
            if phone and not re.match(r'^[\d\-\+\(\)\s]+$', phone):
                result["warnings"].append({
                    "message": "Phone number format may be invalid",
                    "field": "contact.phone",
                    "code": "SUSPICIOUS_FORMAT"
                })
        
        return result
    
    async def _validate_unit_name(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate business unit name"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        name = data.get("name", "").strip()
        
        if not name:
            result["errors"].append({
                "message": "Business unit name is required",
                "field": "name",
                "code": "REQUIRED_FIELD"
            })
        elif len(name) < 2:
            result["errors"].append({
                "message": "Business unit name must be at least 2 characters long",
                "field": "name",
                "code": "MIN_LENGTH"
            })
        
        return result
    
    async def _validate_unit_type(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate business unit type"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        unit_type = data.get("unit_type", "").strip()
        valid_types = ["department", "division", "subsidiary", "branch", "office", "warehouse", "store"]
        
        if unit_type and unit_type not in valid_types:
            result["warnings"].append({
                "message": f"Unusual business unit type: {unit_type}",
                "field": "unit_type",
                "code": "UNUSUAL_VALUE"
            })
        
        return result
    
    async def _validate_unit_capacity(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate business unit capacity constraints"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        if "capacity" in data:
            capacity = data["capacity"]
            try:
                capacity_int = int(capacity)
                if capacity_int < 0:
                    result["errors"].append({
                        "message": "Capacity cannot be negative",
                        "field": "capacity",
                        "code": "INVALID_VALUE"
                    })
                elif capacity_int > 10000:
                    result["warnings"].append({
                        "message": "Very high capacity value, please verify",
                        "field": "capacity",
                        "code": "HIGH_VALUE"
                    })
            except (ValueError, TypeError):
                result["errors"].append({
                    "message": "Capacity must be a valid number",
                    "field": "capacity",
                    "code": "INVALID_FORMAT"
                })
        
        return result
    
    async def _execute_validation_rule(
        self,
        rule,
        entity_data: Dict[str, Any],
        operation_type: str,
        context: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
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
                "errors": [{
                    "message": f"Rule execution error: {str(e)}",
                    "code": "RULE_ERROR"
                }],
                "warnings": [],
                "info_messages": []
            }
    
    def _update_performance_metrics(self, success: bool, validation_time_ms: float):
        """Update validation performance metrics"""
        self.performance_metrics["validations_performed"] += 1
        
        if not success:
            self.performance_metrics["validation_errors"] += 1
        
        # Update average validation time
        total_validations = self.performance_metrics["validations_performed"]
        current_avg = self.performance_metrics["avg_validation_time_ms"]
        
        self.performance_metrics["avg_validation_time_ms"] = (
            (current_avg * (total_validations - 1) + validation_time_ms) / total_validations
        )


class TaiwanValidators:
    """Taiwan-specific validation rules"""
    
    async def validate_tax_id(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate Taiwan tax ID with checksum"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        tax_id = data.get("tax_id", "").strip()
        
        if tax_id and len(tax_id) == 8:
            # Taiwan tax ID checksum validation
            if not self._validate_taiwan_tax_id_checksum(tax_id):
                result["errors"].append({
                    "message": "Invalid Taiwan tax ID checksum",
                    "field": "tax_id",
                    "code": "INVALID_CHECKSUM"
                })
        
        return result
    
    async def validate_company_registration(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate Taiwan company registration details"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        # Additional Taiwan-specific company validation logic
        if "registration_number" in data:
            reg_num = data["registration_number"]
            if reg_num and not re.match(r'^\d{8}$', reg_num):
                result["errors"].append({
                    "message": "Taiwan company registration number must be 8 digits",
                    "field": "registration_number",
                    "code": "INVALID_FORMAT"
                })
        
        return result
    
    def _validate_taiwan_tax_id_checksum(self, tax_id: str) -> bool:
        """Validate Taiwan tax ID checksum algorithm"""
        if len(tax_id) != 8 or not tax_id.isdigit():
            return False
        
        # Taiwan tax ID checksum algorithm
        weights = [1, 2, 1, 2, 1, 2, 4, 1]
        total = 0
        
        for i, digit in enumerate(tax_id):
            product = int(digit) * weights[i]
            total += product // 10 + product % 10
        
        return total % 10 == 0


class HierarchyValidators:
    """Hierarchy-specific validation rules"""
    
    async def validate_group_constraints(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate group-level constraints"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        # Group-specific validation logic
        if "max_companies" in data:
            max_companies = data["max_companies"]
            if isinstance(max_companies, int) and max_companies > 1000:
                result["warnings"].append({
                    "message": "Large number of companies in group may impact performance",
                    "field": "max_companies",
                    "code": "PERFORMANCE_WARNING"
                })
        
        return result
    
    async def validate_company_constraints(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate company-level constraints"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        # Check company limits
        if "max_locations" in data:
            max_locations = data["max_locations"]
            if isinstance(max_locations, int) and max_locations > settings.max_locations_per_company:
                result["errors"].append({
                    "message": f"Company cannot have more than {settings.max_locations_per_company} locations",
                    "field": "max_locations",
                    "code": "LIMIT_EXCEEDED"
                })
        
        return result
    
    async def validate_location_constraints(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate location-level constraints"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        # Check location limits
        if "max_units" in data:
            max_units = data["max_units"]
            if isinstance(max_units, int) and max_units > settings.max_units_per_location:
                result["errors"].append({
                    "message": f"Location cannot have more than {settings.max_units_per_location} business units",
                    "field": "max_units",
                    "code": "LIMIT_EXCEEDED"
                })
        
        return result
    
    async def validate_unit_constraints(self, data: Dict[str, Any], *args) -> Dict[str, Any]:
        """Validate business unit constraints"""
        result = {"errors": [], "warnings": [], "info_messages": []}
        
        # Business unit is at the bottom level, no children allowed
        if "children" in data and data["children"]:
            result["errors"].append({
                "message": "Business units cannot have child entities",
                "field": "children",
                "code": "HIERARCHY_VIOLATION"
            })
        
        return result
    
    async def validate_move_operation(
        self,
        source_entity: Dict[str, Any],
        target_entity: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> ValidationResult:
        """Validate hierarchy move operation"""
        result = ValidationResult()
        
        # Implement move validation logic
        source_type = source_entity.get("entity_type")
        target_type = target_entity.get("entity_type")
        
        # Validate hierarchy level ordering
        hierarchy_order = ["group", "company", "location", "unit"]
        
        try:
            source_level = hierarchy_order.index(source_type)
            target_level = hierarchy_order.index(target_type)
            
            if source_level != target_level + 1:
                result.add_error(
                    f"Cannot move {source_type} under {target_type} - invalid hierarchy level",
                    code="INVALID_HIERARCHY_LEVEL"
                )
        except ValueError:
            result.add_error(
                "Invalid entity types in move operation",
                code="INVALID_ENTITY_TYPE"
            )
        
        return result
    
    async def validate_parent_change(
        self,
        entity: Dict[str, Any],
        new_parent: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> ValidationResult:
        """Validate parent relationship change"""
        result = ValidationResult()
        
        # Implement parent change validation
        # This would include circular reference detection, etc.
        
        return result
    
    async def validate_structure_change(
        self,
        entity: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> ValidationResult:
        """Validate structure changes that might affect hierarchy"""
        result = ValidationResult()
        
        # Implement structure change validation
        
        return result