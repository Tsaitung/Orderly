"""
Bulk validation operations mixin.
"""

from typing import Dict, List, Optional, Any
import structlog

from app.modules.customer_hierarchy.schemas.bulk import BulkValidationRequestSchema

logger = structlog.get_logger(__name__)


class BulkValidationMixin:
    """Mixin providing bulk validation operations."""

    async def bulk_validate(
        self,
        validation_data: BulkValidationRequestSchema,
        user_context: Optional[Dict[str, Any]],
        user_id: str
    ) -> Dict[str, Any]:
        """Simple stubbed bulk validation aligned with API schema."""
        try:
            entity_failures: List[Dict[str, Any]] = []
            errors: List[str] = []
            warnings: List[str] = []

            # Basic shape validation
            for i, entity in enumerate(validation_data.entities):
                if not isinstance(entity, dict):
                    entity_failures.append({
                        "index": i,
                        "errors": ["Invalid entity shape"]
                    })

            is_valid = len(entity_failures) == 0

            return {
                "is_valid": is_valid,
                "errors": (
                    errors
                    if is_valid
                    else ["One or more entities failed validation"]
                ),
                "warnings": warnings,
                "entity_validation_failures": entity_failures,
                "estimated_duration": self._estimate_operation_duration(
                    len(validation_data.entities),
                    validation_data.operation
                ),
                "will_process_in_background": (
                    len(validation_data.entities) > self.background_threshold
                ),
            }

        except Exception as e:
            logger.error(
                "Failed to perform bulk validation",
                error=str(e),
                entity_count=len(validation_data.entities),
                user_id=user_id
            )
            return {
                "is_valid": False,
                "errors": [str(e)],
                "warnings": [],
                "entity_validation_failures": [],
                "estimated_duration": "unknown",
                "will_process_in_background": False,
            }
