"""
Hierarchy Tree API endpoints for cross-level operations
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any, Union

from app.core.database import get_database
from app.schemas.hierarchy import (
    TreeResponseSchema,
    HierarchyNodeSchema,
    SearchResponseSchema,
    SearchResultSchema,
    HierarchySearchRequestSchema,
    HierarchyBreadcrumbSchema,
    HierarchyMoveRequestSchema,
    HierarchyValidationSchema,
    HierarchyStatsSchema,
    HierarchyExportSchema,
    HierarchyImportSchema,
    HierarchyStructureSchema
)
from app.schemas.common import SuccessResponseSchema
from app.middleware.auth import get_current_user, get_hierarchy_context
from app.middleware.logging import log_business_event, get_correlation_id
from app.services.hierarchy_service import HierarchyService
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/tree", response_model=TreeResponseSchema)
async def get_hierarchy_tree(
    request: Request,
    root_id: Optional[str] = Query(None, description="Root node ID (if not provided, starts from top level)"),
    max_depth: Optional[int] = Query(None, ge=1, le=10, description="Maximum depth to fetch"),
    include_inactive: bool = Query(False, description="Include inactive entities"),
    include_stats: bool = Query(False, description="Include statistics for each node"),
    node_types: Optional[List[str]] = Query(None, description="Filter by node types: group, company, location, unit"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get complete hierarchy tree structure - Frontend compatible format
    """
    hierarchy_context = get_hierarchy_context(request)
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Getting hierarchy tree",
        user_id=user_id,
        root_id=root_id,
        max_depth=max_depth,
        correlation_id=correlation_id
    )
    
    try:
        hierarchy_service = HierarchyService(db)
        
        tree_data = await hierarchy_service.get_tree(
            root_id=root_id,
            max_depth=max_depth,
            include_inactive=include_inactive,
            include_stats=include_stats,
            node_types=node_types,
            user_context=hierarchy_context
        )
        
        # Transform to frontend-compatible format
        from datetime import datetime
        
        response = TreeResponseSchema(
            data=tree_data.get("tree", []),
            totalCount=len(tree_data.get("tree", [])),
            lastModified=datetime.now().isoformat()
        )
        
        return response
        
    except Exception as e:
        logger.error(
            "Failed to get hierarchy tree",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve hierarchy tree"
        )


@router.post("/search", response_model=SearchResponseSchema)
async def search_hierarchy(
    request: Request,
    search_request: HierarchySearchRequestSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Search across the entire hierarchy - Frontend compatible format
    """
    hierarchy_context = get_hierarchy_context(request)
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Searching hierarchy",
        user_id=user_id,
        query=search_request.query,
        correlation_id=correlation_id
    )
    
    try:
        hierarchy_service = HierarchyService(db)
        
        search_results = await hierarchy_service.search(
            query=search_request.query,
            search_types=search_request.search_types,
            filters=search_request.filters,
            limit=search_request.limit,
            include_inactive=search_request.include_inactive,
            user_context=hierarchy_context
        )
        
        # Transform to frontend-compatible format
        import time
        
        response = SearchResponseSchema(
            results=search_results.get("results", []),
            totalCount=search_results.get("total_matches", 0),
            queryTime=search_results.get("search_time_ms", 0)
        )
        
        return response
        
    except Exception as e:
        logger.error(
            "Failed to search hierarchy",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search hierarchy"
        )


@router.get("/breadcrumb/{node_id}", response_model=HierarchyBreadcrumbSchema)
async def get_hierarchy_breadcrumb(
    request: Request,
    node_id: str,
    node_type: str = Query(..., description="Node type: group, company, location, unit"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get breadcrumb path for a specific node
    """
    hierarchy_context = get_hierarchy_context(request)
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Getting hierarchy breadcrumb",
        user_id=user_id,
        node_id=node_id,
        node_type=node_type,
        correlation_id=correlation_id
    )
    
    try:
        hierarchy_service = HierarchyService(db)
        
        breadcrumb = await hierarchy_service.get_breadcrumb(
            node_id=node_id,
            node_type=node_type,
            user_context=hierarchy_context
        )
        
        if not breadcrumb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Node {node_id} not found or access denied"
            )
        
        return HierarchyBreadcrumbSchema(**breadcrumb)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get hierarchy breadcrumb",
            error=str(e),
            user_id=user_id,
            node_id=node_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve hierarchy breadcrumb"
        )


@router.post("/move", response_model=SuccessResponseSchema)
async def move_hierarchy_node(
    request: Request,
    move_request: HierarchyMoveRequestSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Move a node to a different parent in the hierarchy
    """
    hierarchy_context = get_hierarchy_context(request)
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Moving hierarchy node",
        user_id=user_id,
        source_id=move_request.source_id,
        target_parent_id=move_request.target_parent_id,
        correlation_id=correlation_id
    )
    
    try:
        hierarchy_service = HierarchyService(db)
        
        # Validate move operation
        validation_result = await hierarchy_service.validate_move(
            source_id=move_request.source_id,
            source_type=move_request.source_type,
            target_parent_id=move_request.target_parent_id,
            target_parent_type=move_request.target_parent_type,
            user_context=hierarchy_context
        )
        
        if not validation_result["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid move operation: {', '.join(validation_result['errors'])}"
            )
        
        # Perform move
        move_result = await hierarchy_service.move_node(
            source_id=move_request.source_id,
            source_type=move_request.source_type,
            target_parent_id=move_request.target_parent_id,
            target_parent_type=move_request.target_parent_type,
            moved_by=user_id
        )
        
        # Log business event
        log_business_event(
            event_type="hierarchy_node_moved",
            entity_type="hierarchy",
            entity_id=move_request.source_id,
            action="move",
            user_id=user_id,
            correlation_id=correlation_id,
            source_type=move_request.source_type,
            target_parent_id=move_request.target_parent_id,
            target_parent_type=move_request.target_parent_type
        )
        
        logger.info(
            "Hierarchy node moved successfully",
            source_id=move_request.source_id,
            target_parent_id=move_request.target_parent_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return SuccessResponseSchema(
            success=True,
            message=f"Node moved successfully. Affected entities: {move_result['affected_count']}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to move hierarchy node",
            error=str(e),
            user_id=user_id,
            source_id=move_request.source_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to move hierarchy node"
        )


@router.get("/validate/{node_id}", response_model=HierarchyValidationSchema)
async def validate_hierarchy_node(
    request: Request,
    node_id: str,
    node_type: str = Query(..., description="Node type: group, company, location, unit"),
    check_children: bool = Query(True, description="Include validation of child nodes"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Validate hierarchy node and its structure
    """
    hierarchy_context = get_hierarchy_context(request)
    correlation_id = get_correlation_id(request)
    
    try:
        hierarchy_service = HierarchyService(db)
        
        validation_result = await hierarchy_service.validate_node(
            node_id=node_id,
            node_type=node_type,
            check_children=check_children,
            user_context=hierarchy_context
        )
        
        if not validation_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Node {node_id} not found or access denied"
            )
        
        return HierarchyValidationSchema(**validation_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to validate hierarchy node",
            error=str(e),
            node_id=node_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate hierarchy node"
        )


@router.get("/stats", response_model=HierarchyStatsSchema)
async def get_hierarchy_stats(
    request: Request,
    root_id: Optional[str] = Query(None, description="Root node ID for scoped stats"),
    include_inactive: bool = Query(False, description="Include inactive entities in stats"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get hierarchy statistics
    """
    hierarchy_context = get_hierarchy_context(request)
    correlation_id = get_correlation_id(request)
    
    try:
        hierarchy_service = HierarchyService(db)
        
        stats = await hierarchy_service.get_statistics(
            root_id=root_id,
            include_inactive=include_inactive,
            user_context=hierarchy_context
        )
        
        return HierarchyStatsSchema(**stats)
        
    except Exception as e:
        logger.error(
            "Failed to get hierarchy stats",
            error=str(e),
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve hierarchy statistics"
        )


@router.get("/export", response_model=HierarchyExportSchema)
async def export_hierarchy(
    request: Request,
    format: str = Query("json", description="Export format: json, csv, xlsx"),
    root_id: Optional[str] = Query(None, description="Root node ID to export from"),
    include_inactive: bool = Query(False, description="Include inactive entities"),
    max_depth: Optional[int] = Query(None, ge=1, le=10, description="Maximum depth to export"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Export hierarchy structure
    """
    hierarchy_context = get_hierarchy_context(request)
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Exporting hierarchy",
        user_id=user_id,
        format=format,
        root_id=root_id,
        correlation_id=correlation_id
    )
    
    try:
        hierarchy_service = HierarchyService(db)
        
        export_result = await hierarchy_service.export_hierarchy(
            format=format,
            root_id=root_id,
            include_inactive=include_inactive,
            max_depth=max_depth,
            user_context=hierarchy_context,
            exported_by=user_id
        )
        
        # Log business event
        log_business_event(
            event_type="hierarchy_exported",
            entity_type="hierarchy",
            entity_id=root_id or "full",
            action="export",
            user_id=user_id,
            correlation_id=correlation_id,
            format=format
        )
        
        return HierarchyExportSchema(**export_result)
        
    except Exception as e:
        logger.error(
            "Failed to export hierarchy",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export hierarchy"
        )


@router.post("/import", response_model=SuccessResponseSchema)
async def import_hierarchy(
    request: Request,
    import_data: HierarchyImportSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Import hierarchy structure from file or data
    """
    hierarchy_context = get_hierarchy_context(request)
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Importing hierarchy",
        user_id=user_id,
        format=import_data.format,
        correlation_id=correlation_id
    )
    
    try:
        hierarchy_service = HierarchyService(db)
        
        # Validate import data
        validation_result = await hierarchy_service.validate_import_data(
            import_data=import_data,
            user_context=hierarchy_context
        )
        
        if not validation_result["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid import data: {', '.join(validation_result['errors'])}"
            )
        
        # Perform import
        import_result = await hierarchy_service.import_hierarchy(
            import_data=import_data,
            imported_by=user_id,
            user_context=hierarchy_context
        )
        
        # Log business event
        log_business_event(
            event_type="hierarchy_imported",
            entity_type="hierarchy",
            entity_id="import",
            action="import",
            user_id=user_id,
            correlation_id=correlation_id,
            format=import_data.format,
            entities_created=import_result["created_count"]
        )
        
        logger.info(
            "Hierarchy imported successfully",
            entities_created=import_result["created_count"],
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return SuccessResponseSchema(
            success=True,
            message=f"Hierarchy imported successfully. Created {import_result['created_count']} entities."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to import hierarchy",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import hierarchy"
        )


@router.get("/structure", response_model=HierarchyStructureSchema)
async def get_hierarchy_structure(
    request: Request,
    node_id: Optional[str] = Query(None, description="Get structure for specific node"),
    node_type: Optional[str] = Query(None, description="Node type: group, company, location, unit"),
    include_counts: bool = Query(True, description="Include entity counts"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get hierarchy structure metadata and counts
    """
    hierarchy_context = get_hierarchy_context(request)
    correlation_id = get_correlation_id(request)
    
    try:
        hierarchy_service = HierarchyService(db)
        
        structure = await hierarchy_service.get_structure(
            node_id=node_id,
            node_type=node_type,
            include_counts=include_counts,
            user_context=hierarchy_context
        )
        
        return HierarchyStructureSchema(**structure)
        
    except Exception as e:
        logger.error(
            "Failed to get hierarchy structure",
            error=str(e),
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve hierarchy structure"
        )


@router.get("/path/{node_id}", response_model=List[HierarchyNodeSchema])
async def get_hierarchy_path(
    request: Request,
    node_id: str,
    node_type: str = Query(..., description="Node type: group, company, location, unit"),
    include_siblings: bool = Query(False, description="Include sibling nodes at each level"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get full hierarchy path from root to specific node
    """
    hierarchy_context = get_hierarchy_context(request)
    correlation_id = get_correlation_id(request)
    
    try:
        hierarchy_service = HierarchyService(db)
        
        path = await hierarchy_service.get_hierarchy_path(
            node_id=node_id,
            node_type=node_type,
            include_siblings=include_siblings,
            user_context=hierarchy_context
        )
        
        if not path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Node {node_id} not found or access denied"
            )
        
        return [HierarchyNodeSchema(**node) for node in path]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get hierarchy path",
            error=str(e),
            node_id=node_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve hierarchy path"
        )