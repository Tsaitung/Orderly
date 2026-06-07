"""
Customer Hierarchy Service CRUD Operations

This module provides CRUD (Create, Read, Update, Delete) operations for all
entities in the 4-level customer hierarchy system.
"""

from .base import CRUDBase
from .group import CRUDGroup, group
from .company import CRUDCompany, company  
from .location import CRUDLocation, location
from .business_unit import CRUDBusinessUnit, business_unit

# Export all CRUD classes and instances
__all__ = [
    # Base CRUD
    "CRUDBase",
    
    # Group CRUD
    "CRUDGroup",
    "group",
    
    # Company CRUD
    "CRUDCompany", 
    "company",
    
    # Location CRUD
    "CRUDLocation",
    "location",
    
    # Business Unit CRUD
    "CRUDBusinessUnit",
    "business_unit",
]

# Convenience mapping for easy access
CRUD_MAPPING = {
    'group': group,
    'company': company,
    'location': location,
    'business_unit': business_unit
}