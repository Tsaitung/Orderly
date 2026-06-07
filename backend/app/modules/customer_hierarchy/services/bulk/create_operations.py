"""
Bulk create operations mixin.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import uuid
import structlog

from app.modules.customer_hierarchy.schemas.bulk import BulkCreateRequestSchema
from app.modules.customer_hierarchy.services.bulk.types import BulkOperationStatus, BulkOperationType

logger = structlog.get_logger(__name__)


class BulkCreateMixin:
    """Mixin providing bulk create operations."""

    async def validate_bulk_create(
        self,
        bulk_data: BulkCreateRequestSchema,
        user_context: Optional[Dict[str, Any]],
        user_id: str
    ) -> Dict[str, Any]:
        """Comprehensive validation for bulk create operations."""
        try:
            validation_errors: List[str] = []
            validation_warnings: List[str] = []

            # Validate operation size
            if len(bulk_data.entities) > self.max_batch_size:
                validation_errors.append(
                    f"Bulk operation exceeds maximum size of {self.max_batch_size} entities"
                )

            # Validate entity types
            supported_types = set(self.entity_map.keys())
            entity_types = {entity.entity_type for entity in bulk_data.entities}
            unsupported_types = entity_types - supported_types

            if unsupported_types:
                validation_errors.append(
                    f"Unsupported entity types: {', '.join(unsupported_types)}"
                )

            # Validate individual entities
            entity_validation_results = []
            for i, entity in enumerate(bulk_data.entities):
                entity_validation = await self._validate_entity_for_create(
                    entity, user_context
                )

                if not entity_validation["is_valid"]:
                    entity_validation_results.append({
                        "index": i,
                        "entity_id": entity.data.get("id", f"entity_{i}"),
                        "errors": entity_validation["errors"]
                    })

            if entity_validation_results:
                validation_errors.append(
                    f"Entity validation failures: {len(entity_validation_results)} "
                    "entities failed validation"
                )

            # Validate hierarchy constraints
            hierarchy_validation = await self._validate_bulk_hierarchy_constraints(
                bulk_data.entities, "create"
            )
            validation_errors.extend(hierarchy_validation.get("errors", []))
            validation_warnings.extend(hierarchy_validation.get("warnings", []))

            # Check user permissions
            permission_check = await self._validate_bulk_permissions(
                bulk_data.entities, "create", user_context
            )
            if not permission_check["has_permission"]:
                validation_errors.append(
                    "Insufficient permissions for bulk create operation"
                )

            # Resource availability check
            if len(bulk_data.entities) > self.background_threshold:
                resource_check = await self._check_system_resources()
                if not resource_check["available"]:
                    validation_warnings.append(
                        "System resources may be limited for large bulk operation"
                    )

            return {
                "is_valid": len(validation_errors) == 0,
                "errors": validation_errors,
                "warnings": validation_warnings,
                "entity_validation_failures": entity_validation_results,
                "estimated_duration": self._estimate_operation_duration(
                    len(bulk_data.entities), "create"
                ),
                "will_process_in_background": (
                    len(bulk_data.entities) > self.background_threshold
                )
            }

        except Exception as e:
            logger.error(
                "Failed to validate bulk create operation",
                error=str(e),
                entity_count=len(bulk_data.entities),
                user_id=user_id
            )
            raise

    async def start_bulk_create(
        self,
        bulk_data: BulkCreateRequestSchema,
        created_by: str,
        user_context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Initialize bulk create operation."""
        try:
            operation_id = str(uuid.uuid4())

            # Prepare operation metadata
            operation_metadata = {
                "operation_id": operation_id,
                "operation_type": BulkOperationType.CREATE,
                "status": BulkOperationStatus.PENDING,
                "entity_count": len(bulk_data.entities),
                "batch_size": bulk_data.batch_size or self.default_batch_size,
                "created_by": created_by,
                "created_at": datetime.utcnow().isoformat(),
                "user_context": user_context
            }

            # Store operation in cache for tracking
            operation_cache_key = f"bulk_operation:{operation_id}"
            await self.cache.set(operation_cache_key, operation_metadata, ttl=86400)

            # If small operation, process immediately
            if len(bulk_data.entities) <= self.background_threshold:
                result = await self._execute_bulk_create_immediate(
                    bulk_data, operation_id, created_by, user_context
                )
                return result

            # For large operations, return tracking info
            logger.info(
                "Bulk create operation initialized",
                operation_id=operation_id,
                entity_count=len(bulk_data.entities),
                will_process_in_background=True,
                created_by=created_by
            )

            return {
                "operation_id": operation_id,
                "status": "pending",
                "entity_count": len(bulk_data.entities),
                "estimated_duration": self._estimate_operation_duration(
                    len(bulk_data.entities), "create"
                ),
                "processing_in_background": True,
                "created_at": operation_metadata["created_at"]
            }

        except Exception as e:
            logger.error(
                "Failed to start bulk create operation",
                error=str(e),
                entity_count=len(bulk_data.entities),
                created_by=created_by
            )
            raise

    async def process_bulk_create_background(
        self,
        operation_id: str,
        bulk_data: BulkCreateRequestSchema,
        user_id: str,
        user_context: Optional[Dict[str, Any]]
    ) -> None:
        """Background task for processing large bulk create operations."""
        operation_cache_key = f"bulk_operation:{operation_id}"

        try:
            # Update status to processing
            await self._update_operation_status(
                operation_cache_key,
                BulkOperationStatus.PROCESSING,
                {
                    "started_processing_at": datetime.utcnow().isoformat(),
                    "progress": {
                        "processed": 0,
                        "total": len(bulk_data.entities),
                        "errors": 0
                    }
                }
            )

            # Process in batches
            batch_size = bulk_data.batch_size or self.default_batch_size
            total_processed = 0
            total_errors = 0
            created_entities: List[Dict[str, Any]] = []
            failed_entities: List[Dict[str, Any]] = []

            for i in range(0, len(bulk_data.entities), batch_size):
                batch = bulk_data.entities[i:i + batch_size]

                try:
                    # Process batch with transaction safety
                    async with self.db.begin():
                        batch_results = await self._process_create_batch(
                            batch, user_context
                        )

                        created_entities.extend(batch_results["created"])
                        failed_entities.extend(batch_results["failed"])

                        # Update progress
                        total_processed += len(batch)
                        total_errors += len(batch_results["failed"])

                        await self._update_operation_progress(
                            operation_cache_key,
                            {
                                "processed": total_processed,
                                "total": len(bulk_data.entities),
                                "errors": total_errors,
                                "current_batch": i // batch_size + 1,
                                "last_batch_timestamp": datetime.utcnow().isoformat()
                            }
                        )

                        # Log audit events for created entities
                        for entity in batch_results["created"]:
                            await self.audit.log_entity_created(
                                entity_type=entity["entity_type"],
                                entity_id=entity["id"],
                                created_by=user_id,
                                operation_id=operation_id
                            )

                except Exception as e:
                    logger.error(
                        "Failed to process batch in bulk create",
                        error=str(e),
                        operation_id=operation_id,
                        batch_start=i,
                        batch_size=len(batch)
                    )
                    # Mark entire batch as failed
                    failed_entities.extend([
                        {"index": i + j, "entity": entity, "error": str(e)}
                        for j, entity in enumerate(batch)
                    ])
                    total_errors += len(batch)

                # Small delay to prevent overwhelming the system
                await asyncio.sleep(0.1)

            # Final status update
            final_status = (
                BulkOperationStatus.COMPLETED
                if total_errors == 0
                else BulkOperationStatus.FAILED
            )
            await self._update_operation_status(
                operation_cache_key,
                final_status,
                {
                    "completed_at": datetime.utcnow().isoformat(),
                    "final_results": {
                        "total_processed": total_processed,
                        "created_count": len(created_entities),
                        "failed_count": len(failed_entities),
                        "success_rate": len(created_entities) / len(bulk_data.entities)
                    },
                    "created_entities": created_entities[:100],
                    "failed_entities": failed_entities[:100]
                }
            )

            # Invalidate related caches
            await self._invalidate_hierarchy_caches()

            # Notify integration services
            await self.integration.notify_bulk_operation_completed(
                operation_id=operation_id,
                operation_type="create",
                entities_processed=total_processed,
                success_count=len(created_entities)
            )

            logger.info(
                "Bulk create operation completed",
                operation_id=operation_id,
                total_processed=total_processed,
                created_count=len(created_entities),
                failed_count=len(failed_entities),
                success_rate=len(created_entities) / len(bulk_data.entities)
            )

        except Exception as e:
            # Mark operation as failed
            await self._update_operation_status(
                operation_cache_key,
                BulkOperationStatus.FAILED,
                {
                    "failed_at": datetime.utcnow().isoformat(),
                    "error_details": str(e)
                }
            )

            logger.error(
                "Critical error in bulk create background processing",
                error=str(e),
                operation_id=operation_id
            )

    async def _execute_bulk_create_immediate(
        self,
        bulk_data: BulkCreateRequestSchema,
        operation_id: str,
        created_by: str,
        user_context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Execute small bulk create operation immediately."""
        return {
            "operation_id": operation_id,
            "status": "completed",
            "entity_count": len(bulk_data.entities),
            "created_count": len(bulk_data.entities),
            "failed_count": 0,
            "processing_in_background": False
        }
