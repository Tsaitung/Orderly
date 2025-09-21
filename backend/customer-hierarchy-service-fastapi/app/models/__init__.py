"""
Customer Hierarchy Models

This module contains all SQLAlchemy models for the 4-level customer hierarchy:
1. CustomerGroup (集團) - Optional virtual grouping
2. CustomerCompany (公司) - Legal entity for billing
3. CustomerLocation (地點) - Physical delivery address
4. BusinessUnit (業務單位) - Actual ordering entities

Each level has proper validation, relationships, and business logic.
"""

from .base import Base, BaseModel
from .customer_group import CustomerGroup
from .customer_company import CustomerCompany
from .customer_location import CustomerLocation
from .business_unit import BusinessUnit
from .migration_log import CustomerMigrationLog
from .activity_metrics import ActivityMetrics, DashboardSummary, PerformanceRanking, ActivityTrend

# Export all models for Alembic and application use
__all__ = [
    "Base",
    "BaseModel",
    "CustomerGroup",
    "CustomerCompany", 
    "CustomerLocation",
    "BusinessUnit",
    "CustomerMigrationLog",
    "ActivityMetrics",
    "DashboardSummary",
    "PerformanceRanking",
    "ActivityTrend"
]

# For convenience in imports
hierarchy_models = [
    CustomerGroup,
    CustomerCompany,
    CustomerLocation,
    BusinessUnit
]

# Activity and analytics models
activity_models = [
    ActivityMetrics,
    DashboardSummary,
    PerformanceRanking,
    ActivityTrend
]

# Migration and support models
support_models = [
    CustomerMigrationLog
]

all_models = hierarchy_models + activity_models + support_models