"""
Bulk operations service module.

This module provides the BulkService class for managing large-scale
entity operations including create, update, delete, move, import, and export.
"""

from app.services.bulk.types import BulkOperationStatus, BulkOperationType
from app.services.bulk.service import BulkService

__all__ = [
    "BulkService",
    "BulkOperationStatus",
    "BulkOperationType",
]
