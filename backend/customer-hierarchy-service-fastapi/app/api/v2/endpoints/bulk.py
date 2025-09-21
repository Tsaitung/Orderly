"""
Bulk Operations API endpoints for batch processing
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any

from app.core.database import get_database
from app.schemas.bulk import (
    BulkCreateRequestSchema,
    BulkCreateResponseSchema,
    BulkUpdateRequestSchema,
    BulkUpdateResponseSchema,
    BulkDeleteRequestSchema,
    BulkDeleteResponseSchema,
    BulkValidationRequestSchema,
    BulkValidationResponseSchema,
    BulkOperationStatusSchema,
    BulkOperationProgressSchema,
    BulkImportRequestSchema,
    BulkImportResponseSchema,
    BulkExportRequestSchema,
    BulkExportResponseSchema,
    BulkMoveRequestSchema,
    BulkMoveResponseSchema
)
from app.schemas.common import SuccessResponseSchema
from app.middleware.auth import get_current_user, get_hierarchy_context
from app.middleware.logging import log_business_event, get_correlation_id
from app.services.bulk_service import BulkService
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post("/create", response_model=BulkCreateResponseSchema, status_code=status.HTTP_201_CREATED)
async def bulk_create_entities(
    request: Request,
    bulk_data: BulkCreateRequestSchema,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Bulk create multiple entities across hierarchy levels
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Starting bulk create operation",
        user_id=user_id,
        entity_count=len(bulk_data.entities),
        entity_types=list(set([entity.entity_type for entity in bulk_data.entities])),
        correlation_id=correlation_id
    )
    
    try:
        bulk_service = BulkService(db)
        hierarchy_context = get_hierarchy_context(request)
        
        # Validate bulk operation
        validation_result = await bulk_service.validate_bulk_create(
            bulk_data=bulk_data,
            user_context=hierarchy_context,
            user_id=user_id
        )
        
        if not validation_result["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Bulk create validation failed: {', '.join(validation_result['errors'])}"
            )
        
        # Start bulk operation
        operation_result = await bulk_service.start_bulk_create(
            bulk_data=bulk_data,
            created_by=user_id,
            user_context=hierarchy_context
        )
        
        # Schedule background processing for large operations
        if len(bulk_data.entities) > bulk_data.batch_size:
            background_tasks.add_task(
                bulk_service.process_bulk_create_background,
                operation_id=operation_result["operation_id"],
                bulk_data=bulk_data,
                user_id=user_id,
                user_context=hierarchy_context
            )
        
        # Log business event
        log_business_event(
            event_type="bulk_create_started",
            entity_type="bulk_operation",
            entity_id=operation_result["operation_id"],
            action="bulk_create",
            user_id=user_id,
            correlation_id=correlation_id,
            entity_count=len(bulk_data.entities)
        )
        
        logger.info(
            "Bulk create operation started",
            operation_id=operation_result["operation_id"],
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return BulkCreateResponseSchema(**operation_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to start bulk create operation",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start bulk create operation"
        )


@router.post("/update", response_model=BulkUpdateResponseSchema)
async def bulk_update_entities(
    request: Request,
    bulk_data: BulkUpdateRequestSchema,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Bulk update multiple entities
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Starting bulk update operation",
        user_id=user_id,
        entity_count=len(bulk_data.updates),
        correlation_id=correlation_id
    )
    
    try:
        bulk_service = BulkService(db)
        hierarchy_context = get_hierarchy_context(request)
        
        # Validate bulk operation
        validation_result = await bulk_service.validate_bulk_update(
            bulk_data=bulk_data,
            user_context=hierarchy_context,
            user_id=user_id
        )
        
        if not validation_result["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Bulk update validation failed: {', '.join(validation_result['errors'])}"
            )
        
        # Start bulk operation
        operation_result = await bulk_service.start_bulk_update(
            bulk_data=bulk_data,
            updated_by=user_id,
            user_context=hierarchy_context
        )
        
        # Schedule background processing for large operations
        if len(bulk_data.updates) > bulk_data.batch_size:
            background_tasks.add_task(
                bulk_service.process_bulk_update_background,
                operation_id=operation_result["operation_id"],
                bulk_data=bulk_data,
                user_id=user_id,
                user_context=hierarchy_context
            )
        
        # Log business event
        log_business_event(
            event_type="bulk_update_started",
            entity_type="bulk_operation",
            entity_id=operation_result["operation_id"],
            action="bulk_update",
            user_id=user_id,
            correlation_id=correlation_id,
            entity_count=len(bulk_data.updates)
        )
        
        return BulkUpdateResponseSchema(**operation_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to start bulk update operation",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start bulk update operation"
        )


@router.post("/delete", response_model=BulkDeleteResponseSchema)
async def bulk_delete_entities(
    request: Request,
    bulk_data: BulkDeleteRequestSchema,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Bulk delete multiple entities
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Starting bulk delete operation",
        user_id=user_id,
        entity_count=len(bulk_data.entities),
        force_delete=bulk_data.force_delete,
        correlation_id=correlation_id
    )
    
    try:
        bulk_service = BulkService(db)
        hierarchy_context = get_hierarchy_context(request)
        
        # Validate bulk operation
        validation_result = await bulk_service.validate_bulk_delete(
            bulk_data=bulk_data,
            user_context=hierarchy_context,
            user_id=user_id
        )
        
        if not validation_result["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Bulk delete validation failed: {', '.join(validation_result['errors'])}"
            )
        
        # Start bulk operation
        operation_result = await bulk_service.start_bulk_delete(
            bulk_data=bulk_data,
            deleted_by=user_id,
            user_context=hierarchy_context
        )
        
        # Schedule background processing for large operations
        if len(bulk_data.entities) > bulk_data.batch_size:
            background_tasks.add_task(
                bulk_service.process_bulk_delete_background,
                operation_id=operation_result["operation_id"],
                bulk_data=bulk_data,
                user_id=user_id,
                user_context=hierarchy_context
            )
        
        # Log business event
        log_business_event(
            event_type="bulk_delete_started",
            entity_type="bulk_operation",
            entity_id=operation_result["operation_id"],
            action="bulk_delete",
            user_id=user_id,
            correlation_id=correlation_id,
            entity_count=len(bulk_data.entities),
            force_delete=bulk_data.force_delete
        )
        
        return BulkDeleteResponseSchema(**operation_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to start bulk delete operation",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start bulk delete operation"
        )


@router.post("/validate", response_model=BulkValidationResponseSchema)
async def bulk_validate_entities(
    request: Request,
    validation_data: BulkValidationRequestSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Bulk validate multiple entities
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    try:
        bulk_service = BulkService(db)
        hierarchy_context = get_hierarchy_context(request)
        
        validation_result = await bulk_service.bulk_validate(
            validation_data=validation_data,
            user_context=hierarchy_context,
            user_id=user_id
        )
        
        return BulkValidationResponseSchema(**validation_result)
        
    except Exception as e:
        logger.error(
            "Failed to bulk validate entities",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to bulk validate entities"
        )


@router.post("/move", response_model=BulkMoveResponseSchema)
async def bulk_move_entities(
    request: Request,
    move_data: BulkMoveRequestSchema,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Bulk move entities in hierarchy
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Starting bulk move operation",
        user_id=user_id,
        entity_count=len(move_data.moves),
        correlation_id=correlation_id
    )
    
    try:
        bulk_service = BulkService(db)
        hierarchy_context = get_hierarchy_context(request)
        
        # Validate bulk move operation
        validation_result = await bulk_service.validate_bulk_move(
            move_data=move_data,
            user_context=hierarchy_context,
            user_id=user_id
        )
        
        if not validation_result["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Bulk move validation failed: {', '.join(validation_result['errors'])}"
            )
        
        # Start bulk operation
        operation_result = await bulk_service.start_bulk_move(
            move_data=move_data,
            moved_by=user_id,
            user_context=hierarchy_context
        )
        
        # Schedule background processing for large operations
        if len(move_data.moves) > move_data.batch_size:
            background_tasks.add_task(
                bulk_service.process_bulk_move_background,
                operation_id=operation_result["operation_id"],
                move_data=move_data,
                user_id=user_id,
                user_context=hierarchy_context
            )
        
        # Log business event
        log_business_event(
            event_type="bulk_move_started",
            entity_type="bulk_operation",
            entity_id=operation_result["operation_id"],
            action="bulk_move",
            user_id=user_id,
            correlation_id=correlation_id,
            entity_count=len(move_data.moves)
        )
        
        return BulkMoveResponseSchema(**operation_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to start bulk move operation",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start bulk move operation"
        )


@router.post("/import", response_model=BulkImportResponseSchema)
async def bulk_import_data(
    request: Request,
    import_data: BulkImportRequestSchema,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Bulk import data from file or structured input
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Starting bulk import operation",
        user_id=user_id,
        format=import_data.format,
        correlation_id=correlation_id
    )
    
    try:
        bulk_service = BulkService(db)
        hierarchy_context = get_hierarchy_context(request)
        
        # Validate import data
        validation_result = await bulk_service.validate_bulk_import(
            import_data=import_data,
            user_context=hierarchy_context,
            user_id=user_id
        )
        
        if not validation_result["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Bulk import validation failed: {', '.join(validation_result['errors'])}"
            )
        
        # Start import operation
        operation_result = await bulk_service.start_bulk_import(
            import_data=import_data,
            imported_by=user_id,
            user_context=hierarchy_context
        )
        
        # Schedule background processing
        background_tasks.add_task(
            bulk_service.process_bulk_import_background,
            operation_id=operation_result["operation_id"],
            import_data=import_data,
            user_id=user_id,
            user_context=hierarchy_context
        )
        
        # Log business event
        log_business_event(
            event_type="bulk_import_started",
            entity_type="bulk_operation",
            entity_id=operation_result["operation_id"],
            action="bulk_import",
            user_id=user_id,
            correlation_id=correlation_id,
            format=import_data.format
        )
        
        return BulkImportResponseSchema(**operation_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to start bulk import operation",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start bulk import operation"
        )


@router.post("/export", response_model=BulkExportResponseSchema)
async def bulk_export_data(
    request: Request,
    export_data: BulkExportRequestSchema,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Bulk export data to file or structured output
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Starting bulk export operation",
        user_id=user_id,
        format=export_data.format,
        correlation_id=correlation_id
    )
    
    try:
        bulk_service = BulkService(db)
        hierarchy_context = get_hierarchy_context(request)
        
        # Start export operation
        operation_result = await bulk_service.start_bulk_export(
            export_data=export_data,
            exported_by=user_id,
            user_context=hierarchy_context
        )
        
        # Schedule background processing
        background_tasks.add_task(
            bulk_service.process_bulk_export_background,
            operation_id=operation_result["operation_id"],
            export_data=export_data,
            user_id=user_id,
            user_context=hierarchy_context
        )
        
        # Log business event
        log_business_event(
            event_type="bulk_export_started",
            entity_type="bulk_operation",
            entity_id=operation_result["operation_id"],
            action="bulk_export",
            user_id=user_id,
            correlation_id=correlation_id,
            format=export_data.format
        )
        
        return BulkExportResponseSchema(**operation_result)
        
    except Exception as e:
        logger.error(
            "Failed to start bulk export operation",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start bulk export operation"
        )


@router.get("/operations/{operation_id}/status", response_model=BulkOperationStatusSchema)
async def get_bulk_operation_status(
    request: Request,
    operation_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get status of a bulk operation
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    try:
        bulk_service = BulkService(db)
        
        status_info = await bulk_service.get_operation_status(
            operation_id=operation_id,
            user_id=user_id
        )
        
        if not status_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bulk operation {operation_id} not found"
            )
        
        return BulkOperationStatusSchema(**status_info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get bulk operation status",
            error=str(e),
            operation_id=operation_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve bulk operation status"
        )


@router.get("/operations/{operation_id}/progress", response_model=BulkOperationProgressSchema)
async def get_bulk_operation_progress(
    request: Request,
    operation_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get detailed progress of a bulk operation
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    try:
        bulk_service = BulkService(db)
        
        progress_info = await bulk_service.get_operation_progress(
            operation_id=operation_id,
            user_id=user_id
        )
        
        if not progress_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bulk operation {operation_id} not found"
            )
        
        return BulkOperationProgressSchema(**progress_info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get bulk operation progress",
            error=str(e),
            operation_id=operation_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve bulk operation progress"
        )


@router.delete("/operations/{operation_id}", response_model=SuccessResponseSchema)
async def cancel_bulk_operation(
    request: Request,
    operation_id: str,
    force_cancel: bool = Query(False, description="Force cancel even if partially completed"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Cancel a running bulk operation
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Cancelling bulk operation",
        operation_id=operation_id,
        user_id=user_id,
        force_cancel=force_cancel,
        correlation_id=correlation_id
    )
    
    try:
        bulk_service = BulkService(db)
        
        # Cancel operation
        success = await bulk_service.cancel_operation(
            operation_id=operation_id,
            cancelled_by=user_id,
            force_cancel=force_cancel
        )
        
        if success:
            # Log business event
            log_business_event(
                event_type="bulk_operation_cancelled",
                entity_type="bulk_operation",
                entity_id=operation_id,
                action="cancel",
                user_id=user_id,
                correlation_id=correlation_id,
                force_cancel=force_cancel
            )
            
            return SuccessResponseSchema(
                success=True,
                message="Bulk operation cancelled successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot cancel bulk operation in current state"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to cancel bulk operation",
            error=str(e),
            operation_id=operation_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel bulk operation"
        )