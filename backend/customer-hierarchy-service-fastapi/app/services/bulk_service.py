"""
BulkService - Batch operations service for large-scale entity processing.

This module re-exports BulkService from the bulk subpackage for backward compatibility.
All functionality has been modularized into:
- app/services/bulk/types.py - Enums and type definitions
- app/services/bulk/base.py - Base mixin with shared utilities
- app/services/bulk/create_operations.py - Bulk create operations
- app/services/bulk/update_operations.py - Bulk update operations
- app/services/bulk/delete_operations.py - Bulk delete operations
- app/services/bulk/move_operations.py - Bulk move operations
- app/services/bulk/import_operations.py - Bulk import operations
- app/services/bulk/export_operations.py - Bulk export operations
- app/services/bulk/validation.py - Bulk validation operations
- app/services/bulk/status_operations.py - Status and progress tracking
- app/services/bulk/service.py - Main BulkService class combining all mixins
"""

from app.services.bulk import BulkService, BulkOperationStatus, BulkOperationType

__all__ = [
    "BulkService",
    "BulkOperationStatus",
    "BulkOperationType",
]
