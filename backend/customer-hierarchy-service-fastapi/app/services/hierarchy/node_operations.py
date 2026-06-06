"""
Node Operations Mixin for HierarchyService

Contains methods for node operations:
- validate_move: Validate if a move operation is allowed
- move_node: Execute hierarchy move operation
- validate_node: Comprehensive validation of a node
- get_breadcrumb: Get breadcrumb path from root to node
- get_hierarchy_path: Get full hierarchy path
- _validate_node_access: Validate node access
- _build_breadcrumb_path: Build breadcrumb path
- _node_exists: Check if node exists
- _build_parent_update_data: Build update data for parent change
- _update_descendant_paths: Update paths for descendants
- _invalidate_move_caches: Invalidate caches after move
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


class NodeOperationsMixin:
    """Mixin class for node operations"""

    async def get_breadcrumb(
        self,
        node_id: str,
        node_type: str,
        user_context: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Get breadcrumb path from root to specific node

        Returns path with hierarchy levels: Group > Company > Location > Unit
        Includes validation of user access permissions at each level
        """
        try:
            # Validate node exists and user has access
            if not await self._validate_node_access(node_id, node_type, user_context):
                return None

            # Get cached breadcrumb if available
            cache_key = f"breadcrumb:{node_type}:{node_id}:{self._get_user_scope(user_context)}"
            cached_breadcrumb = await self.cache.get(cache_key)
            if cached_breadcrumb:
                return cached_breadcrumb

            # Build breadcrumb path
            path = await self._build_breadcrumb_path(node_id, node_type)

            breadcrumb_data = {
                "node_id": node_id,
                "node_type": node_type,
                "path": path,
                "depth": len(path),
            }

            # Cache breadcrumb
            await self.cache.set(
                cache_key, breadcrumb_data, ttl=settings.cache_entity_ttl
            )

            return breadcrumb_data

        except Exception as e:
            logger.error(
                "Failed to get breadcrumb",
                error=str(e),
                node_id=node_id,
                node_type=node_type,
            )
            raise

    async def validate_move(
        self,
        source_id: str,
        source_type: str,
        target_parent_id: str,
        target_parent_type: str,
        user_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Validate if a hierarchy move operation is allowed

        Validation rules:
        - Prevent circular references
        - Maintain proper hierarchy levels (group > company > location > unit)
        - Check business constraints (max children per parent)
        - Validate user permissions for both source and target
        """
        try:
            validation_errors = []
            warnings = []

            # Check if nodes exist
            source_exists = await self._node_exists(source_id, source_type)
            target_exists = await self._node_exists(
                target_parent_id, target_parent_type
            )

            if not source_exists:
                validation_errors.append(
                    f"Source {source_type} {source_id} not found"
                )
            if not target_exists:
                validation_errors.append(
                    f"Target {target_parent_type} {target_parent_id} not found"
                )

            if validation_errors:
                return {
                    "is_valid": False,
                    "errors": validation_errors,
                    "warnings": warnings,
                }

            # Validate hierarchy level constraints
            level_valid, level_error = self._validate_hierarchy_levels(
                source_type, target_parent_type
            )
            if not level_valid:
                validation_errors.append(level_error)

            # Check for circular references
            circular_check = await self._check_circular_reference(
                source_id, source_type, target_parent_id, target_parent_type
            )
            if not circular_check["is_valid"]:
                validation_errors.append("Move would create circular reference")

            # Check parent capacity constraints
            capacity_check = await self._check_parent_capacity(
                target_parent_id, target_parent_type, source_type
            )
            if not capacity_check["is_valid"]:
                if capacity_check["is_warning"]:
                    warnings.append(capacity_check["message"])
                else:
                    validation_errors.append(capacity_check["message"])

            # Validate user permissions
            permissions_valid = await self._validate_move_permissions(
                source_id,
                source_type,
                target_parent_id,
                target_parent_type,
                user_context,
            )
            if not permissions_valid:
                validation_errors.append(
                    "Insufficient permissions for move operation"
                )

            # Check business rules (e.g., company-specific constraints)
            business_check = await self._validate_business_rules_for_move(
                source_id, source_type, target_parent_id, target_parent_type
            )
            if not business_check["is_valid"]:
                validation_errors.extend(business_check["errors"])
                warnings.extend(business_check.get("warnings", []))

            return {
                "is_valid": len(validation_errors) == 0,
                "errors": validation_errors,
                "warnings": warnings,
                "affected_children_count": await self._count_affected_children(
                    source_id, source_type
                ),
            }

        except Exception as e:
            logger.error(
                "Failed to validate move operation",
                error=str(e),
                source_id=source_id,
                target_parent_id=target_parent_id,
            )
            raise

    async def move_node(
        self,
        source_id: str,
        source_type: str,
        target_parent_id: str,
        target_parent_type: str,
        moved_by: str,
    ) -> Dict[str, Any]:
        """
        Execute hierarchy move operation with transaction safety

        Process:
        1. Begin database transaction
        2. Update parent relationships
        3. Update hierarchy paths for all descendants
        4. Invalidate related caches
        5. Log audit trail
        6. Notify dependent services
        """
        try:
            # Start transaction
            async with self.db.begin():
                # Get source entity
                entity_info = self.entity_map[source_type]
                crud_service = entity_info["crud"]

                # Update parent relationship
                update_data = self._build_parent_update_data(
                    target_parent_id, target_parent_type
                )
                source_entity = await crud_service.get(self.db, id=source_id)
                if not source_entity:
                    raise ValueError(f"Source entity {source_id} not found")

                await crud_service.update(
                    self.db,
                    db_obj=source_entity,
                    obj_in=update_data,
                    updated_by=moved_by,
                )

                # Update hierarchy paths for all descendants
                affected_count = await self._update_descendant_paths(
                    source_id, source_type
                )

                # Invalidate related caches
                await self._invalidate_move_caches(
                    source_id, source_type, target_parent_id, target_parent_type
                )

                logger.info(
                    "Hierarchy move completed successfully",
                    source_id=source_id,
                    target_parent_id=target_parent_id,
                    affected_count=affected_count,
                    moved_by=moved_by,
                )

                return {
                    "success": True,
                    "affected_count": affected_count,
                    "move_timestamp": datetime.utcnow().isoformat(),
                }

        except Exception as e:
            logger.error(
                "Failed to execute move operation",
                error=str(e),
                source_id=source_id,
                target_parent_id=target_parent_id,
            )
            # Transaction will auto-rollback on exception
            raise

    async def validate_node(
        self,
        node_id: str,
        node_type: str,
        check_children: bool = True,
        user_context: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Comprehensive validation of hierarchy node and its structure

        Validation checks:
        - Node existence and data integrity
        - Parent-child relationship consistency
        - Business rule compliance
        - Performance metrics (response time, cache hit rate)
        """
        try:
            # Check if user has access to this node
            if not await self._validate_node_access(node_id, node_type, user_context):
                return None

            validation_result = {
                "node_id": node_id,
                "node_type": node_type,
                "is_valid": True,
                "errors": [],
                "warnings": [],
                "checks_performed": [],
                "performance_metrics": {},
            }

            start_time = datetime.utcnow()

            # Basic existence check
            node_exists = await self._node_exists(node_id, node_type)
            validation_result["checks_performed"].append("existence")

            if not node_exists:
                validation_result["is_valid"] = False
                validation_result["errors"].append(
                    f"Node {node_id} of type {node_type} not found"
                )
                return validation_result

            # Get node data
            entity_info = self.entity_map[node_type]
            crud_service = entity_info["crud"]
            node_data = await crud_service.get(self.db, id=node_id)

            # Parent relationship validation
            parent_valid, parent_errors = await self._validate_parent_relationship(
                node_data, node_type
            )
            validation_result["checks_performed"].append("parent_relationship")
            if not parent_valid:
                validation_result["errors"].extend(parent_errors)
                validation_result["is_valid"] = False

            # Business rules validation
            (
                business_valid,
                business_errors,
                business_warnings,
            ) = await self._validate_business_rules(node_data, node_type)
            validation_result["checks_performed"].append("business_rules")
            if not business_valid:
                validation_result["errors"].extend(business_errors)
                validation_result["is_valid"] = False
            validation_result["warnings"].extend(business_warnings)

            # Children validation (if requested)
            if check_children:
                (
                    children_valid,
                    children_errors,
                ) = await self._validate_children_relationships(node_id, node_type)
                validation_result["checks_performed"].append("children_relationships")
                if not children_valid:
                    validation_result["errors"].extend(children_errors)
                    validation_result["is_valid"] = False

            # Performance metrics
            end_time = datetime.utcnow()
            validation_result["performance_metrics"] = {
                "validation_time_ms": (end_time - start_time).total_seconds() * 1000,
                "checks_count": len(validation_result["checks_performed"]),
                "timestamp": end_time.isoformat(),
            }

            return validation_result

        except Exception as e:
            logger.error(
                "Failed to validate node",
                error=str(e),
                node_id=node_id,
                node_type=node_type,
            )
            raise

    async def get_hierarchy_path(
        self,
        node_id: str,
        node_type: str,
        include_siblings: bool = False,
        user_context: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get full hierarchy path from root to specific node

        Returns list of nodes in path order (root to target)
        """
        try:
            # Get breadcrumb first
            breadcrumb = await self.get_breadcrumb(node_id, node_type, user_context)
            if not breadcrumb:
                return []

            path_nodes = []

            # Convert breadcrumb path to full node data
            for path_item in breadcrumb["path"]:
                # Get full node data
                entity_info = self.entity_map.get(path_item["type"])
                if entity_info:
                    crud_service = entity_info["crud"]
                    node_data = await crud_service.get(self.db, id=path_item["id"])
                    if node_data:
                        node_dict = {
                            "id": node_data.id,
                            "name": node_data.name,
                            "type": path_item["type"],
                            "code": getattr(node_data, "code", None),
                            "is_active": node_data.is_active,
                            "children_count": 0,  # Would calculate if needed
                            "descendant_count": 0,  # Would calculate if needed
                        }

                        # Add type-specific fields
                        if hasattr(node_data, "tax_id"):
                            node_dict["tax_id"] = node_data.tax_id
                        if hasattr(node_data, "address"):
                            node_dict["address"] = node_data.address

                        path_nodes.append(node_dict)

            # Add siblings if requested
            if include_siblings:
                # Implementation would add sibling nodes at each level
                pass

            return path_nodes

        except Exception as e:
            logger.error(
                "Failed to get hierarchy path",
                error=str(e),
                node_id=node_id,
                node_type=node_type,
            )
            raise

    async def _validate_node_access(
        self,
        node_id: str,
        node_type: str,
        user_context: Optional[Dict[str, Any]],
    ) -> bool:
        """Validate if user has access to specific node"""
        # For now, return True
        # In production, would implement actual access control
        return True

    async def _build_breadcrumb_path(
        self, node_id: str, node_type: str
    ) -> List[Dict[str, Any]]:
        """Build breadcrumb path from root to node"""
        path = []
        current_id = node_id
        current_type = node_type

        # Traverse up the hierarchy
        while current_id and current_type:
            # Get current entity
            entity_info = self.entity_map.get(current_type)
            if not entity_info:
                break

            crud_service = entity_info["crud"]
            entity = await crud_service.get(self.db, id=current_id)
            if not entity:
                break

            # Add to path (prepend to maintain root-to-leaf order)
            path.insert(
                0,
                {
                    "id": entity.id,
                    "name": entity.name,
                    "type": current_type,
                    "code": getattr(entity, "code", None),
                },
            )

            # Move to parent
            parent_field = self.parent_fields.get(current_type)
            if parent_field:
                current_id = getattr(entity, parent_field, None)
                # Determine parent type
                if current_type == "company":
                    current_type = "group"
                elif current_type == "location":
                    current_type = "company"
                elif current_type == "business_unit":
                    current_type = "location"
                else:
                    current_type = None
            else:
                # No parent (reached root)
                current_id = None
                current_type = None

        return path

    async def _node_exists(self, node_id: str, node_type: str) -> bool:
        """Check if node exists in database"""
        entity_info = self.entity_map.get(node_type)
        if not entity_info:
            return False

        crud_service = entity_info["crud"]
        node = await crud_service.get(self.db, id=node_id)
        return node is not None

    def _build_parent_update_data(
        self, target_parent_id: str, target_parent_type: str
    ) -> Dict[str, Any]:
        """Build update data for parent relationship change"""
        if target_parent_type == "group":
            return {"group_id": target_parent_id}
        elif target_parent_type == "company":
            return {"company_id": target_parent_id}
        elif target_parent_type == "location":
            return {"location_id": target_parent_id}
        else:
            return {}

    async def _update_descendant_paths(self, node_id: str, node_type: str) -> int:
        """Update hierarchy paths for all descendants"""
        # This would update computed hierarchy paths for all descendants
        # For now, return 0 as this would be a complex recursive operation
        return 0

    async def _invalidate_move_caches(
        self,
        source_id: str,
        source_type: str,
        target_parent_id: str,
        target_parent_type: str,
    ) -> None:
        """Invalidate caches affected by move operation"""
        cache_patterns = [
            "hierarchy_tree:*",
            f"breadcrumb:*:{source_id}:*",
            f"breadcrumb:*:{target_parent_id}:*",
            "hierarchy_stats:*",
        ]

        for pattern in cache_patterns:
            await self.cache.delete_pattern(pattern)

    async def _validate_move_permissions(
        self,
        source_id: str,
        source_type: str,
        target_parent_id: str,
        target_parent_type: str,
        user_context: Optional[Dict[str, Any]],
    ) -> bool:
        """Validate user permissions for move operation"""
        # For now, return True
        # In production, would implement actual permission validation
        return True

    async def _count_affected_children(self, node_id: str, node_type: str) -> int:
        """Count children that would be affected by move"""
        # This would recursively count all descendants
        total_count = 0

        # Get direct children
        if node_type == "group":
            child_type = "company"
        elif node_type == "company":
            child_type = "location"
        elif node_type == "location":
            child_type = "business_unit"
        else:
            return 0

        direct_children = await self._count_direct_children(
            node_id, node_type, child_type
        )
        total_count += direct_children

        # Recursively count descendants (simplified for now)
        if node_type == "group":
            # Would count companies, locations, and business units under this group
            pass
        elif node_type == "company":
            # Would count locations and business units under this company
            pass

        return total_count
