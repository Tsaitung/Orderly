"""
Tree Operations Mixin for HierarchyService

Contains methods for tree structure operations:
- get_tree: Get hierarchical tree structure with caching
- _generate_tree_cache_key: Generate cache key for tree queries
- _build_tree_from_db: Build tree from database
- _load_children: Load children for a parent node
- _build_node_dict: Build node dictionary from entity
- _calculate_tree_depth: Calculate tree depth
- _count_descendants: Count descendants of a node
"""

from typing import Any, Dict, List, Optional

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


class TreeOperationsMixin:
    """Mixin class for tree structure operations"""

    async def get_tree(
        self,
        root_id: Optional[str] = None,
        max_depth: Optional[int] = None,
        include_inactive: bool = False,
        include_stats: bool = False,
        node_types: Optional[List[str]] = None,
        user_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Get hierarchical tree structure with optimized caching

        Performance optimizations:
        - Redis caching with 10-minute TTL for frequently accessed trees
        - Lazy loading of child nodes to prevent deep recursion
        - SQL query optimization with selective loading
        """
        try:
            # Generate cache key based on parameters
            cache_key = self._generate_tree_cache_key(
                root_id,
                max_depth,
                include_inactive,
                include_stats,
                node_types,
                user_context,
            )

            # Try to get from cache first
            cached_tree = await self.cache.get(cache_key)
            if cached_tree:
                logger.info("Hierarchy tree retrieved from cache", cache_key=cache_key)
                return cached_tree

            # Build tree from database
            tree_data = await self._build_tree_from_db(
                root_id=root_id,
                max_depth=max_depth or settings.max_hierarchy_depth,
                include_inactive=include_inactive,
                include_stats=include_stats,
                node_types=node_types,
                user_context=user_context,
            )

            # Cache the result
            await self.cache.set(cache_key, tree_data, ttl=settings.cache_tree_ttl)

            logger.info(
                "Hierarchy tree built and cached",
                root_id=root_id,
                node_count=tree_data.get("total_nodes", 0),
                cache_key=cache_key,
            )

            return tree_data

        except Exception as e:
            logger.error(
                "Failed to get hierarchy tree",
                error=str(e),
                root_id=root_id,
                max_depth=max_depth,
            )
            raise

    def _generate_tree_cache_key(
        self,
        root_id: Optional[str],
        max_depth: Optional[int],
        include_inactive: bool,
        include_stats: bool,
        node_types: Optional[List[str]],
        user_context: Optional[Dict[str, Any]],
    ) -> str:
        """Generate consistent cache key for tree queries"""
        key_parts = [
            "hierarchy_tree",
            root_id or "root",
            str(max_depth or "max"),
            str(include_inactive),
            str(include_stats),
            "_".join(sorted(node_types or [])),
            self._get_user_scope(user_context),
        ]
        return ":".join(key_parts)

    async def _build_tree_from_db(
        self,
        root_id: Optional[str],
        max_depth: int,
        include_inactive: bool,
        include_stats: bool,
        node_types: Optional[List[str]],
        user_context: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Build hierarchy tree from database with optimized queries"""
        try:
            tree_nodes = []
            total_nodes = 0
            node_counts_by_type = {}
            active_node_counts = {}
            actual_depth = 0

            # Start with groups (root level)
            if not root_id:
                # Get all groups
                groups = await self.group_crud.get_multi(
                    self.db,
                    include_inactive=include_inactive,
                    limit=1000,  # Reasonable limit for groups
                )
            else:
                # Get specific root node
                groups = []
                if node_types is None or "group" in node_types:
                    group = await self.group_crud.get(
                        self.db, id=root_id, include_inactive=include_inactive
                    )
                    if group:
                        groups = [group]

            for group in groups:
                group_node = await self._build_node_dict(group, "group", include_stats)

                # Add children if depth allows
                if max_depth > 1:
                    group_node["children"] = await self._load_children(
                        group.id,
                        "group",
                        max_depth - 1,
                        include_inactive,
                        include_stats,
                        node_types,
                    )
                    if group_node["children"]:
                        actual_depth = max(
                            actual_depth,
                            1 + self._calculate_tree_depth(group_node["children"]),
                        )

                tree_nodes.append(group_node)
                total_nodes += 1 + self._count_descendants(group_node)

            # Also include standalone companies (companies without group_id) as root nodes
            if not root_id and (node_types is None or "company" in node_types):
                all_companies = await self.company_crud.get_multi(
                    self.db, include_inactive=include_inactive, limit=1000
                )
                standalone_companies = [
                    c for c in all_companies if not getattr(c, "group_id", None)
                ]

                for company in standalone_companies:
                    company_node = await self._build_node_dict(
                        company, "company", include_stats
                    )

                    # Add children (locations) if depth allows
                    if max_depth > 1:
                        company_node["children"] = await self._load_children(
                            company.id,
                            "company",
                            max_depth - 1,
                            include_inactive,
                            include_stats,
                            node_types,
                        )
                        if company_node["children"]:
                            actual_depth = max(
                                actual_depth,
                                1
                                + self._calculate_tree_depth(company_node["children"]),
                            )

                    tree_nodes.append(company_node)
                    total_nodes += 1 + self._count_descendants(company_node)

            # Calculate statistics
            for entity_type in ["group", "company", "location", "business_unit"]:
                node_counts_by_type[entity_type] = await self._count_entities(
                    entity_type, root_id, include_inactive, user_context
                )
                active_node_counts[entity_type] = await self._count_entities(
                    entity_type, root_id, False, user_context
                )

            return {
                "tree": tree_nodes,
                "total_nodes": total_nodes,
                "max_depth": max_depth,
                "actual_depth": actual_depth or 1,
                "include_inactive": include_inactive,
                "root_count": len(tree_nodes),
                "node_counts_by_type": node_counts_by_type,
                "active_node_counts": active_node_counts,
            }

        except Exception as e:
            logger.error(
                "Failed to build tree from database",
                error=str(e),
                root_id=root_id,
                max_depth=max_depth,
            )
            raise

    async def _load_children(
        self,
        parent_id: str,
        parent_type: str,
        remaining_depth: int,
        include_inactive: bool,
        include_stats: bool,
        node_types: Optional[List[str]],
    ) -> List[Dict[str, Any]]:
        """Load children for a specific parent node"""
        children = []

        # Determine child type based on parent
        child_type = None
        if parent_type == "group":
            child_type = "company"
        elif parent_type == "company":
            child_type = "location"
        elif parent_type == "location":
            child_type = "business_unit"

        if not child_type or (node_types and child_type not in node_types):
            return children

        # Get children based on type
        entity_info = self.entity_map[child_type]
        crud_service = entity_info["crud"]

        # Get children entities
        child_entities = await crud_service.get_multi(
            self.db, include_inactive=include_inactive, limit=1000  # Reasonable limit
        )

        # Filter by parent relationship
        child_entities = [
            entity
            for entity in child_entities
            if getattr(entity, self.parent_fields[child_type], None) == parent_id
        ]

        for child_entity in child_entities:
            child_node = await self._build_node_dict(
                child_entity, child_type, include_stats
            )

            # Recursively load children if depth allows
            if remaining_depth > 1:
                child_node["children"] = await self._load_children(
                    child_entity.id,
                    child_type,
                    remaining_depth - 1,
                    include_inactive,
                    include_stats,
                    node_types,
                )

            children.append(child_node)

        return children

    async def _build_node_dict(
        self, entity: Any, entity_type: str, include_stats: bool
    ) -> Dict[str, Any]:
        """Build node dictionary from entity object"""
        node = {
            "id": entity.id,
            "name": entity.name,
            "type": entity_type,
            "code": getattr(entity, "code", None),
            "is_active": entity.is_active,
            "metadata": {},
            "children_count": 0,
            "descendant_count": 0,
            "children": [],
        }

        # Add type-specific fields
        if entity_type == "company":
            node["tax_id"] = getattr(entity, "tax_id", None)
            node["tax_id_type"] = getattr(entity, "tax_id_type", None)
        elif entity_type == "location":
            node["address"] = getattr(entity, "address", None)
            node["coordinates"] = getattr(entity, "coordinates", None)
        elif entity_type == "business_unit":
            node["unit_type"] = getattr(entity, "unit_type", None)
            node["budget_monthly"] = getattr(entity, "budget_monthly", None)

        # Add parent relationship
        parent_field = self.parent_fields.get(entity_type)
        if parent_field:
            parent_id = getattr(entity, parent_field, None)
            if parent_id:
                node["parent_id"] = parent_id
                # Determine parent type based on entity type
                if entity_type == "company":
                    node["parent_type"] = "group"
                elif entity_type == "location":
                    node["parent_type"] = "company"
                elif entity_type == "business_unit":
                    node["parent_type"] = "location"

        return node

    def _calculate_tree_depth(self, nodes: List[Dict[str, Any]]) -> int:
        """Calculate maximum depth of tree nodes"""
        if not nodes:
            return 0

        max_depth = 1
        for node in nodes:
            if node.get("children"):
                child_depth = 1 + self._calculate_tree_depth(node["children"])
                max_depth = max(max_depth, child_depth)

        return max_depth

    def _count_descendants(self, node: Dict[str, Any]) -> int:
        """Count total descendants of a node"""
        count = 0
        for child in node.get("children", []):
            count += 1 + self._count_descendants(child)
        return count
