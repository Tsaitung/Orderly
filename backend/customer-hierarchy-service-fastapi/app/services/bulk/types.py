"""
Bulk operation types and enums.
"""

from enum import Enum


class BulkOperationStatus(str, Enum):
    """Bulk operation status"""
    PENDING = "pending"
    VALIDATING = "validating"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BulkOperationType(str, Enum):
    """Bulk operation types"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    MOVE = "move"
    IMPORT = "import"
    EXPORT = "export"
    VALIDATE = "validate"
