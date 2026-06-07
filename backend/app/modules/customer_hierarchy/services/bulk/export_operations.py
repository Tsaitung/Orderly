"""
Bulk export operations mixin.
"""

from typing import Dict, Optional, Any
from datetime import datetime
import uuid
import structlog

from app.modules.customer_hierarchy.schemas.bulk import BulkExportRequestSchema
from app.modules.customer_hierarchy.services.bulk.types import BulkOperationStatus, BulkOperationType

logger = structlog.get_logger(__name__)

ALLOWED_EXPORT_FORMATS = {"csv", "xlsx", "json"}


class BulkExportMixin:
    """Mixin providing bulk export operations."""

    async def start_bulk_export(
        self,
        export_data: BulkExportRequestSchema,
        exported_by: str,
        user_context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Start bulk export operation."""
        try:
            operation_id = str(uuid.uuid4())

            # Validate export parameters
            if export_data.format not in ALLOWED_EXPORT_FORMATS:
                raise ValueError(f"Unsupported export format: {export_data.format}")

            # Initialize export operation
            operation_metadata = {
                "operation_id": operation_id,
                "operation_type": BulkOperationType.EXPORT,
                "status": BulkOperationStatus.PENDING,
                "format": export_data.format,
                "exported_by": exported_by,
                "created_at": datetime.utcnow().isoformat(),
                "user_context": user_context
            }

            operation_cache_key = f"bulk_operation:{operation_id}"
            await self.cache.set(operation_cache_key, operation_metadata, ttl=86400)

            logger.info(
                "Bulk export operation initialized",
                operation_id=operation_id,
                format=export_data.format,
                exported_by=exported_by
            )

            return {
                "operation_id": operation_id,
                "status": "pending",
                "format": export_data.format,
                "estimated_duration": "5-10 minutes",
                "created_at": operation_metadata["created_at"]
            }

        except Exception as e:
            logger.error(
                "Failed to start bulk export operation",
                error=str(e),
                format=export_data.format,
                exported_by=exported_by
            )
            raise
