"""
BulkService - Main service class combining all bulk operation mixins.

This service handles bulk operations including:
- Batch create, update, delete operations across hierarchy levels
- Background processing for large datasets (1000+ entities)
- Transaction safety with rollback capabilities
- Progress tracking and real-time monitoring
- Validation and error handling for bulk operations
- Import/export functionality with multiple format support
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.bulk.base import BulkOperationBase
from app.services.bulk.create_operations import BulkCreateMixin
from app.services.bulk.update_operations import BulkUpdateMixin
from app.services.bulk.delete_operations import BulkDeleteMixin
from app.services.bulk.move_operations import BulkMoveMixin
from app.services.bulk.import_operations import BulkImportMixin
from app.services.bulk.export_operations import BulkExportMixin
from app.services.bulk.validation import BulkValidationMixin
from app.services.bulk.status_operations import BulkStatusMixin


class BulkService(
    BulkOperationBase,
    BulkCreateMixin,
    BulkUpdateMixin,
    BulkDeleteMixin,
    BulkMoveMixin,
    BulkImportMixin,
    BulkExportMixin,
    BulkValidationMixin,
    BulkStatusMixin
):
    """
    Core service for managing bulk operations on hierarchy entities.

    Key Features:
    - High-performance batch processing with configurable batch sizes
    - Transaction safety with atomic operations and rollback support
    - Background processing for operations exceeding threshold
    - Real-time progress tracking and status monitoring
    - Comprehensive validation with business rule enforcement
    - Multi-format import/export (CSV, Excel, JSON)
    - Circuit breaker pattern for external service integrations

    This class combines multiple mixins to provide a complete bulk operations API:
    - BulkCreateMixin: validate_bulk_create, start_bulk_create, process_bulk_create_background
    - BulkUpdateMixin: validate_bulk_update, start_bulk_update, process_bulk_update_background
    - BulkDeleteMixin: validate_bulk_delete, start_bulk_delete, process_bulk_delete_background
    - BulkMoveMixin: validate_bulk_move, start_bulk_move, process_bulk_move_background
    - BulkImportMixin: validate_bulk_import, start_bulk_import, process_bulk_import_background
    - BulkExportMixin: start_bulk_export
    - BulkValidationMixin: bulk_validate
    - BulkStatusMixin: get_operation_status, get_operation_progress, cancel_operation
    """

    def __init__(self, db: AsyncSession) -> None:
        """Initialize BulkService with database session."""
        self._init_services(db)
