"""
Business Unit model - Fourth level of hierarchy (業務單位)
Actual ordering/demand entity within a location
"""
import re
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy import (
    Column, String, ForeignKey, Index, UniqueConstraint, 
    CheckConstraint, DECIMAL, Boolean, Text
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.hybrid import hybrid_property
from .base import BaseModel
import structlog

logger = structlog.get_logger(__name__)


class BusinessUnit(BaseModel):
    """
    Business Unit (業務單位) - Actual ordering/demand entity within a location
    
    This represents the specific departments or units that place orders,
    such as kitchen, bar, bakery, etc. These are the actual ordering entities
    that interact with suppliers.
    """
    __tablename__ = "business_units"
    __table_args__ = (
        UniqueConstraint("location_id", "code", name="uq_location_unit_code"),
        Index("idx_business_units_location", "location_id"),
        Index("idx_business_units_type", "type"),
        Index("idx_business_units_name", "name"),
        Index("idx_business_units_active", "is_active"),
        Index("idx_business_units_cost_center", "cost_center_code"),
        CheckConstraint(
            "budget_alert_threshold >= 0 AND budget_alert_threshold <= 100",
            name="check_budget_alert_threshold_range"
        ),
        CheckConstraint(
            "max_order_value >= 0",
            name="check_max_order_value_positive"
        ),
        CheckConstraint(
            "approval_threshold >= 0",
            name="check_approval_threshold_positive"
        ),
    )

    # Hierarchy relationship
    location_id = Column(
        String, 
        ForeignKey("customer_locations.id", ondelete="CASCADE"), 
        nullable=False,
        comment="Parent location ID (所屬地點)"
    )
    
    # Basic business unit information
    name = Column(
        String(255), 
        nullable=False,
        comment="Business unit name (業務單位名稱)"
    )
    code = Column(
        String(50), 
        nullable=False,
        comment="Unique code within location (單位代碼)"
    )
    
    # Business unit classification
    type = Column(
        String(50),
        nullable=True,
        comment="Type of business unit (e.g., kitchen, bar, bakery)"
    )
    cost_center_code = Column(
        String(50),
        nullable=True,
        comment="Cost center code for accounting (成本中心代碼)"
    )
    
    # Budget management
    budget_monthly = Column(
        DECIMAL(12, 2),
        nullable=True,
        comment="Monthly budget limit (月度預算)"
    )
    budget_alert_threshold = Column(
        DECIMAL(5, 2),
        nullable=True,
        default=80.0,
        comment="Budget alert threshold percentage (預算警示門檻)"
    )
    
    # Contact information
    manager_contact = Column(
        "manager_contact",
        JSONB,
        nullable=True,
        comment="Manager/responsible person contact info"
    )
    
    # Ordering permissions and restrictions
    ordering_permissions = Column(
        "ordering_permissions",
        JSONB,
        nullable=False,
        default=dict,
        comment="Ordering permissions configuration"
    )
    allowed_suppliers = Column(
        "allowed_suppliers",
        JSONB,
        nullable=True,
        comment="List of allowed supplier IDs (if restricted)"
    )
    blocked_categories = Column(
        "blocked_categories",
        JSONB,
        nullable=True,
        comment="List of blocked category IDs"
    )
    
    # Order limits and approval
    max_order_value = Column(
        DECIMAL(12, 2),
        nullable=True,
        comment="Maximum single order value (最大單筆訂單金額)"
    )
    requires_approval = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether orders require approval (是否需要審批)"
    )
    approval_threshold = Column(
        DECIMAL(12, 2),
        nullable=True,
        comment="Order value threshold for approval (審批門檻金額)"
    )
    
    # Relationships
    location = relationship(
        "CustomerLocation",
        back_populates="business_units"
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Initialize default ordering permissions
        if not self.ordering_permissions:
            self.ordering_permissions = {
                'can_order': True,
                'can_modify_orders': True,
                'can_cancel_orders': True,
                'restricted_hours': None,
                'restricted_days': None
            }
    
    @validates('name')
    def validate_name(self, key, name):
        """Validate business unit name"""
        if not name or not name.strip():
            raise ValueError("Business unit name cannot be empty")
        
        name = name.strip()
        if len(name) < 2:
            raise ValueError("Business unit name must be at least 2 characters long")
        
        if len(name) > 255:
            raise ValueError("Business unit name cannot exceed 255 characters")
        
        return name
    
    @validates('code')
    def validate_code(self, key, code):
        """Validate business unit code format"""
        if not code or not code.strip():
            raise ValueError("Business unit code cannot be empty")
            
        code = code.strip().upper()
        
        # Code pattern: alphanumeric, underscore, hyphen only
        if not re.match(r'^[A-Z0-9_-]+$', code):
            raise ValueError(
                "Business unit code must contain only uppercase letters, numbers, "
                "underscore and hyphen"
            )
        
        if len(code) < 1:
            raise ValueError("Business unit code must be at least 1 character long")
        
        if len(code) > 50:
            raise ValueError("Business unit code cannot exceed 50 characters")
        
        return code
    
    @validates('type')
    def validate_type(self, key, unit_type):
        """Validate business unit type"""
        if unit_type:
            valid_types = [
                'kitchen', 'bar', 'bakery', 'pastry', 'grill', 'salad',
                'sushi', 'pizza', 'noodle', 'dim_sum', 'hot_pot',
                'central_kitchen', 'storage', 'prep', 'dishwashing',
                'front_desk', 'service', 'management', 'general'
            ]
            
            if unit_type.lower() not in valid_types:
                logger.warning(
                    "Unknown business unit type",
                    type=unit_type,
                    valid_types=valid_types
                )
        
        return unit_type
    
    @validates('cost_center_code')
    def validate_cost_center_code(self, key, code):
        """Validate cost center code format"""
        if code:
            code = code.strip().upper()
            if not re.match(r'^[A-Z0-9_-]+$', code):
                raise ValueError(
                    "Cost center code must contain only uppercase letters, numbers, "
                    "underscore and hyphen"
                )
        return code
    
    @validates('budget_monthly')
    def validate_budget_monthly(self, key, budget):
        """Validate monthly budget"""
        if budget is not None and budget < 0:
            raise ValueError("Monthly budget cannot be negative")
        return budget
    
    @validates('budget_alert_threshold')
    def validate_budget_alert_threshold(self, key, threshold):
        """Validate budget alert threshold"""
        if threshold is not None:
            if not (0 <= threshold <= 100):
                raise ValueError("Budget alert threshold must be between 0 and 100")
        return threshold
    
    @validates('max_order_value')
    def validate_max_order_value(self, key, value):
        """Validate maximum order value"""
        if value is not None and value < 0:
            raise ValueError("Maximum order value cannot be negative")
        return value
    
    @validates('approval_threshold')
    def validate_approval_threshold(self, key, threshold):
        """Validate approval threshold"""
        if threshold is not None and threshold < 0:
            raise ValueError("Approval threshold cannot be negative")
        return threshold
    
    @validates('ordering_permissions')
    def validate_ordering_permissions(self, key, permissions):
        """Validate ordering permissions structure"""
        if permissions:
            required_fields = ['can_order']
            for field in required_fields:
                if field not in permissions:
                    permissions[field] = True
            
            # Validate boolean fields
            boolean_fields = ['can_order', 'can_modify_orders', 'can_cancel_orders']
            for field in boolean_fields:
                if field in permissions and not isinstance(permissions[field], bool):
                    raise ValueError(f"Ordering permission '{field}' must be boolean")
        
        return permissions
    
    @validates('allowed_suppliers')
    def validate_allowed_suppliers(self, key, suppliers):
        """Validate allowed suppliers list"""
        if suppliers:
            if not isinstance(suppliers, list):
                raise ValueError("Allowed suppliers must be a list")
            
            # Validate supplier IDs are strings
            for supplier_id in suppliers:
                if not isinstance(supplier_id, str):
                    raise ValueError("Supplier IDs must be strings")
        
        return suppliers
    
    @validates('blocked_categories')
    def validate_blocked_categories(self, key, categories):
        """Validate blocked categories list"""
        if categories:
            if not isinstance(categories, list):
                raise ValueError("Blocked categories must be a list")
            
            # Validate category IDs are strings
            for category_id in categories:
                if not isinstance(category_id, str):
                    raise ValueError("Category IDs must be strings")
        
        return categories
    
    @hybrid_property
    def full_hierarchy_path(self) -> str:
        """Get full hierarchy path from group to business unit"""
        path_parts = []
        if self.location:
            if self.location.company:
                if self.location.company.group:
                    path_parts.append(self.location.company.group.name)
                path_parts.append(self.location.company.name)
            path_parts.append(self.location.name)
        path_parts.append(self.name)
        return " > ".join(path_parts)
    
    @hybrid_property
    def is_budget_restricted(self) -> bool:
        """Check if business unit has budget restrictions"""
        return self.budget_monthly is not None
    
    @hybrid_property
    def is_order_value_restricted(self) -> bool:
        """Check if business unit has order value restrictions"""
        return self.max_order_value is not None
    
    @hybrid_property
    def is_supplier_restricted(self) -> bool:
        """Check if business unit has supplier restrictions"""
        return self.allowed_suppliers is not None and len(self.allowed_suppliers) > 0
    
    @hybrid_property
    def has_category_restrictions(self) -> bool:
        """Check if business unit has category restrictions"""
        return self.blocked_categories is not None and len(self.blocked_categories) > 0
    
    @hybrid_property
    def manager_name(self) -> Optional[str]:
        """Get manager name"""
        if self.manager_contact:
            return self.manager_contact.get('name')
        return None
    
    @hybrid_property
    def manager_phone(self) -> Optional[str]:
        """Get manager phone"""
        if self.manager_contact:
            return self.manager_contact.get('phone')
        return None
    
    def can_order(self) -> bool:
        """Check if business unit can place orders"""
        if not self.is_active:
            return False
        
        permissions = self.ordering_permissions or {}
        return permissions.get('can_order', True)
    
    def can_modify_orders(self) -> bool:
        """Check if business unit can modify orders"""
        if not self.can_order():
            return False
        
        permissions = self.ordering_permissions or {}
        return permissions.get('can_modify_orders', True)
    
    def can_cancel_orders(self) -> bool:
        """Check if business unit can cancel orders"""
        if not self.can_order():
            return False
        
        permissions = self.ordering_permissions or {}
        return permissions.get('can_cancel_orders', True)
    
    def validate_order_amount(self, amount: float) -> Tuple[bool, Optional[str]]:
        """Validate if order amount is allowed"""
        if not self.can_order():
            return False, "Business unit cannot place orders"
        
        if self.max_order_value and amount > float(self.max_order_value):
            return False, f"Order amount {amount} exceeds maximum allowed {self.max_order_value}"
        
        return True, None
    
    def requires_order_approval(self, amount: float) -> bool:
        """Check if order requires approval based on amount"""
        if not self.requires_approval:
            return False
        
        if self.approval_threshold is None:
            return True  # Always require approval if enabled but no threshold
        
        return amount >= float(self.approval_threshold)
    
    def is_supplier_allowed(self, supplier_id: str) -> bool:
        """Check if supplier is allowed for this business unit"""
        if not self.allowed_suppliers:
            return True  # No restrictions
        
        return supplier_id in self.allowed_suppliers
    
    def is_category_blocked(self, category_id: str) -> bool:
        """Check if category is blocked for this business unit"""
        if not self.blocked_categories:
            return False  # No restrictions
        
        return category_id in self.blocked_categories
    
    def get_budget_status(self, current_month_spend: float = 0) -> Dict[str, Any]:
        """Get budget status information"""
        if not self.budget_monthly:
            return {
                'has_budget': False,
                'budget_monthly': None,
                'current_spend': current_month_spend,
                'remaining': None,
                'percentage_used': None,
                'alert_triggered': False
            }
        
        budget = float(self.budget_monthly)
        remaining = budget - current_month_spend
        percentage_used = (current_month_spend / budget) * 100 if budget > 0 else 0
        
        alert_threshold = float(self.budget_alert_threshold or 80)
        alert_triggered = percentage_used >= alert_threshold
        
        return {
            'has_budget': True,
            'budget_monthly': budget,
            'current_spend': current_month_spend,
            'remaining': remaining,
            'percentage_used': percentage_used,
            'alert_triggered': alert_triggered,
            'alert_threshold': alert_threshold
        }
    
    def get_ordering_restrictions(self) -> Dict[str, Any]:
        """Get summary of all ordering restrictions"""
        return {
            'can_order': self.can_order(),
            'can_modify_orders': self.can_modify_orders(),
            'can_cancel_orders': self.can_cancel_orders(),
            'max_order_value': float(self.max_order_value) if self.max_order_value else None,
            'requires_approval': self.requires_approval,
            'approval_threshold': float(self.approval_threshold) if self.approval_threshold else None,
            'supplier_restrictions': self.is_supplier_restricted,
            'allowed_suppliers': self.allowed_suppliers,
            'category_restrictions': self.has_category_restrictions,
            'blocked_categories': self.blocked_categories,
            'ordering_permissions': self.ordering_permissions
        }
    
    def update_ordering_permissions(self, permissions: Dict[str, Any], updated_by: str):
        """Update ordering permissions"""
        current_permissions = self.ordering_permissions or {}
        current_permissions.update(permissions)
        self.ordering_permissions = current_permissions
        self.updated_by = updated_by
        
        self.audit_log('permissions_updated', updated_by, permissions)
    
    def validate_business_rules(self) -> List[str]:
        """Validate business rules for this business unit"""
        errors = []
        
        # Check approval threshold consistency
        if self.requires_approval and self.approval_threshold and self.max_order_value:
            if self.approval_threshold > self.max_order_value:
                errors.append(
                    "Approval threshold cannot be greater than maximum order value"
                )
        
        # Check budget alert threshold
        if self.budget_alert_threshold and not self.budget_monthly:
            errors.append(
                "Budget alert threshold requires monthly budget to be set"
            )
        
        # Validate manager contact if provided
        if self.manager_contact:
            if 'email' in self.manager_contact:
                email = self.manager_contact['email']
                if email and not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
                    errors.append("Invalid manager email format")
        
        return errors
    
    def can_delete(self) -> Tuple[bool, List[str]]:
        """Check if business unit can be deleted"""
        reasons = []
        
        # Check if has recent orders (would need to check with order service)
        # This would be implemented as a service call
        
        # Check if is the only business unit in location
        if self.location:
            active_units = self.location.business_units.filter_by(is_active=True).count()
            if active_units <= 1:
                reasons.append("Cannot delete the last business unit in a location")
        
        return len(reasons) == 0, reasons
    
    def __str__(self):
        return f"BusinessUnit: {self.name} ({self.code}) - {self.type or 'General'}"