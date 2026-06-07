"""
Hierarchy Service Module

This module provides the HierarchyService class for managing 4-level customer hierarchy operations.
The service is decomposed into multiple mixins for better maintainability:

- TreeOperationsMixin: Tree structure operations (get_tree, build_tree, load_children)
- SearchOperationsMixin: Search operations (search, relevance calculation)
- NodeOperationsMixin: Node operations (validate_move, move_node, breadcrumb)
- ImportExportMixin: Import/export operations (export_hierarchy, import_hierarchy)
- StatisticsMixin: Statistics operations (get_statistics, get_structure)
- ValidationMixin: Validation helper methods

Usage:
    from app.modules.customer_hierarchy.services.hierarchy import HierarchyService

    service = HierarchyService(db_session)
    tree = await service.get_tree()
"""

from app.modules.customer_hierarchy.services.hierarchy.service import HierarchyService

__all__ = ["HierarchyService"]
