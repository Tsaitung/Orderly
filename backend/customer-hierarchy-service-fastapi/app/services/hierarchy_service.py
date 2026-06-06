"""
HierarchyService - Re-export for backward compatibility

This module re-exports HierarchyService from the new modular structure.
The service has been decomposed into multiple modules for better maintainability:

- app/services/hierarchy/service.py: Main HierarchyService class
- app/services/hierarchy/tree_operations.py: Tree structure operations
- app/services/hierarchy/search_operations.py: Search operations
- app/services/hierarchy/node_operations.py: Node operations
- app/services/hierarchy/import_export.py: Import/export operations
- app/services/hierarchy/statistics.py: Statistics operations
- app/services/hierarchy/validation.py: Validation helper methods

Usage remains unchanged:
    from app.services.hierarchy_service import HierarchyService

    service = HierarchyService(db_session)
    tree = await service.get_tree()
"""

from app.services.hierarchy import HierarchyService

__all__ = ["HierarchyService"]
