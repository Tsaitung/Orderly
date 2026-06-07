"""
Bulk operation status and progress tracking mixin.
"""

from typing import Dict, Optional, Any
from datetime import datetime
import structlog

from app.modules.customer_hierarchy.services.bulk.types import BulkOperationStatus

logger = structlog.get_logger(__name__)


class BulkStatusMixin:
    """Mixin providing operation status and progress tracking."""

    async def get_operation_status(
        self,
        operation_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get bulk operation status and progress."""
        try:
            operation_cache_key = f"bulk_operation:{operation_id}"
            operation_data = await self.cache.get(operation_cache_key)

            if not operation_data:
                return None

            return {
                "operation_id": operation_id,
                "operation_type": operation_data.get("operation_type"),
                "status": operation_data.get("status"),
                "progress": operation_data.get("progress", {}),
                "created_at": operation_data.get("created_at"),
                "started_processing_at": operation_data.get("started_processing_at"),
                "completed_at": operation_data.get("completed_at"),
                "failed_at": operation_data.get("failed_at"),
                "final_results": operation_data.get("final_results"),
                "error_details": operation_data.get("error_details")
            }

        except Exception as e:
            logger.error(
                "Failed to get operation status",
                error=str(e),
                operation_id=operation_id,
                user_id=user_id
            )
            raise

    async def get_operation_progress(
        self,
        operation_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Return detailed progress for operation if available."""
        try:
            key = f"bulk_operation:{operation_id}"
            data = await self.cache.get(key)

            if not data:
                return None

            return {
                "operation_id": operation_id,
                "status": data.get("status", "pending"),
                "progress": data.get("progress", {}),
                "execution_log": data.get("execution_log"),
            }

        except Exception as e:
            logger.error(
                "Failed to get operation progress",
                error=str(e),
                operation_id=operation_id,
                user_id=user_id
            )
            raise

    async def cancel_operation(
        self,
        operation_id: str,
        cancelled_by: str,
        force_cancel: bool = False
    ) -> bool:
        """Attempt to cancel an operation by marking it as cancelled in cache."""
        key = f"bulk_operation:{operation_id}"
        data = await self.cache.get(key) or {}

        status = data.get("status")
        terminal_statuses = {
            BulkOperationStatus.COMPLETED,
            BulkOperationStatus.FAILED,
            BulkOperationStatus.CANCELLED
        }

        if status in terminal_statuses and not force_cancel:
            return False

        data["status"] = BulkOperationStatus.CANCELLED
        data["failed_at"] = datetime.utcnow().isoformat()
        data["error_details"] = "Cancelled by user"
        await self.cache.set(key, data, ttl=86400)

        return True
