"""
Data Migration API endpoints for hierarchy upgrades
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any

from app.core.database import get_database
from app.schemas.migration import (
    MigrationPlanSchema,
    MigrationCreatePlanSchema,
    MigrationExecuteSchema,
    MigrationStatusSchema,
    MigrationProgressSchema,
    MigrationValidationSchema,
    MigrationRollbackSchema,
    MigrationReportSchema,
    MigrationConfigSchema,
    MigrationMappingSchema,
    MigrationPreviewSchema
)
from app.schemas.common import SuccessResponseSchema
from app.middleware.auth import get_current_user, get_hierarchy_context
from app.middleware.logging import log_business_event, get_correlation_id
from app.services.migration_service import MigrationService
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post("/plan", response_model=MigrationPlanSchema, status_code=status.HTTP_201_CREATED)
async def create_migration_plan(
    request: Request,
    plan_data: MigrationCreatePlanSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a migration plan for upgrading to 4-level hierarchy
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Creating migration plan",
        user_id=user_id,
        migration_type=plan_data.migration_type,
        correlation_id=correlation_id
    )
    
    try:
        migration_service = MigrationService(db)
        
        # Validate source data
        validation_result = await migration_service.validate_source_data(
            migration_type=plan_data.migration_type,
            source_config=plan_data.source_config,
            user_id=user_id
        )
        
        if not validation_result["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Source data validation failed: {', '.join(validation_result['errors'])}"
            )
        
        # Create migration plan
        migration_plan = await migration_service.create_migration_plan(
            plan_data=plan_data,
            created_by=user_id
        )
        
        # Log business event
        log_business_event(
            event_type="migration_plan_created",
            entity_type="migration",
            entity_id=migration_plan["id"],
            action="create_plan",
            user_id=user_id,
            correlation_id=correlation_id,
            migration_type=plan_data.migration_type
        )
        
        logger.info(
            "Migration plan created successfully",
            plan_id=migration_plan["id"],
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return MigrationPlanSchema(**migration_plan)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to create migration plan",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create migration plan"
        )


@router.get("/plans", response_model=List[MigrationPlanSchema])
async def list_migration_plans(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, description="Filter by status: draft, validated, executing, completed, failed, rolled_back"),
    migration_type: Optional[str] = Query(None, description="Filter by migration type"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List migration plans
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    try:
        migration_service = MigrationService(db)
        
        plans = await migration_service.get_migration_plans(
            skip=skip,
            limit=limit,
            status_filter=status_filter,
            migration_type=migration_type,
            user_id=user_id
        )
        
        return [MigrationPlanSchema(**plan) for plan in plans]
        
    except Exception as e:
        logger.error(
            "Failed to list migration plans",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve migration plans"
        )


@router.get("/plans/{plan_id}", response_model=MigrationPlanSchema)
async def get_migration_plan(
    request: Request,
    plan_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific migration plan
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    try:
        migration_service = MigrationService(db)
        
        plan = await migration_service.get_migration_plan(
            plan_id=plan_id,
            user_id=user_id
        )
        
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Migration plan {plan_id} not found"
            )
        
        return MigrationPlanSchema(**plan)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get migration plan",
            error=str(e),
            plan_id=plan_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve migration plan"
        )


@router.post("/plans/{plan_id}/validate", response_model=MigrationValidationSchema)
async def validate_migration_plan(
    request: Request,
    plan_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Validate a migration plan before execution
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Validating migration plan",
        plan_id=plan_id,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        migration_service = MigrationService(db)
        
        validation_result = await migration_service.validate_migration_plan(
            plan_id=plan_id,
            user_id=user_id
        )
        
        if not validation_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Migration plan {plan_id} not found"
            )
        
        # Log business event
        log_business_event(
            event_type="migration_plan_validated",
            entity_type="migration",
            entity_id=plan_id,
            action="validate",
            user_id=user_id,
            correlation_id=correlation_id,
            is_valid=validation_result["is_valid"]
        )
        
        return MigrationValidationSchema(**validation_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to validate migration plan",
            error=str(e),
            plan_id=plan_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate migration plan"
        )


@router.post("/plans/{plan_id}/preview", response_model=MigrationPreviewSchema)
async def preview_migration(
    request: Request,
    plan_id: str,
    sample_size: int = Query(10, ge=1, le=100, description="Number of sample records to preview"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Preview migration results without executing
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    try:
        migration_service = MigrationService(db)
        
        preview_result = await migration_service.preview_migration(
            plan_id=plan_id,
            sample_size=sample_size,
            user_id=user_id
        )
        
        if not preview_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Migration plan {plan_id} not found"
            )
        
        return MigrationPreviewSchema(**preview_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to preview migration",
            error=str(e),
            plan_id=plan_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to preview migration"
        )


@router.post("/plans/{plan_id}/execute", response_model=MigrationExecuteSchema)
async def execute_migration(
    request: Request,
    plan_id: str,
    background_tasks: BackgroundTasks,
    force_execute: bool = Query(False, description="Force execution even with warnings"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Execute a migration plan
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Executing migration plan",
        plan_id=plan_id,
        user_id=user_id,
        force_execute=force_execute,
        correlation_id=correlation_id
    )
    
    try:
        migration_service = MigrationService(db)
        
        # Pre-execution validation
        execution_check = await migration_service.check_execution_readiness(
            plan_id=plan_id,
            user_id=user_id
        )
        
        if not execution_check["ready"] and not force_execute:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Migration not ready for execution: {', '.join(execution_check['blockers'])}"
            )
        
        # Start migration execution
        execution_result = await migration_service.start_migration_execution(
            plan_id=plan_id,
            executed_by=user_id,
            force_execute=force_execute
        )
        
        # Schedule background execution
        background_tasks.add_task(
            migration_service.execute_migration_background,
            plan_id=plan_id,
            execution_id=execution_result["execution_id"],
            user_id=user_id
        )
        
        # Log business event
        log_business_event(
            event_type="migration_execution_started",
            entity_type="migration",
            entity_id=plan_id,
            action="execute",
            user_id=user_id,
            correlation_id=correlation_id,
            execution_id=execution_result["execution_id"]
        )
        
        logger.info(
            "Migration execution started",
            plan_id=plan_id,
            execution_id=execution_result["execution_id"],
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return MigrationExecuteSchema(**execution_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to execute migration",
            error=str(e),
            plan_id=plan_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to execute migration"
        )


@router.get("/plans/{plan_id}/status", response_model=MigrationStatusSchema)
async def get_migration_status(
    request: Request,
    plan_id: str,
    execution_id: Optional[str] = Query(None, description="Specific execution ID"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get migration execution status
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    try:
        migration_service = MigrationService(db)
        
        status_info = await migration_service.get_migration_status(
            plan_id=plan_id,
            execution_id=execution_id,
            user_id=user_id
        )
        
        if not status_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Migration plan {plan_id} not found"
            )
        
        return MigrationStatusSchema(**status_info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get migration status",
            error=str(e),
            plan_id=plan_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve migration status"
        )


@router.get("/plans/{plan_id}/progress", response_model=MigrationProgressSchema)
async def get_migration_progress(
    request: Request,
    plan_id: str,
    execution_id: Optional[str] = Query(None, description="Specific execution ID"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get detailed migration progress
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    try:
        migration_service = MigrationService(db)
        
        progress_info = await migration_service.get_migration_progress(
            plan_id=plan_id,
            execution_id=execution_id,
            user_id=user_id
        )
        
        if not progress_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Migration plan {plan_id} not found"
            )
        
        return MigrationProgressSchema(**progress_info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get migration progress",
            error=str(e),
            plan_id=plan_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve migration progress"
        )


@router.post("/plans/{plan_id}/rollback", response_model=MigrationRollbackSchema)
async def rollback_migration(
    request: Request,
    plan_id: str,
    execution_id: Optional[str] = Query(None, description="Specific execution ID to rollback"),
    force_rollback: bool = Query(False, description="Force rollback even with warnings"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Rollback a migration execution
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Rolling back migration",
        plan_id=plan_id,
        execution_id=execution_id,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        migration_service = MigrationService(db)
        
        # Validate rollback capability
        rollback_check = await migration_service.check_rollback_capability(
            plan_id=plan_id,
            execution_id=execution_id,
            user_id=user_id
        )
        
        if not rollback_check["can_rollback"] and not force_rollback:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Cannot rollback migration: {', '.join(rollback_check['blockers'])}"
            )
        
        # Perform rollback
        rollback_result = await migration_service.rollback_migration(
            plan_id=plan_id,
            execution_id=execution_id,
            rolled_back_by=user_id,
            force_rollback=force_rollback
        )
        
        # Log business event
        log_business_event(
            event_type="migration_rolled_back",
            entity_type="migration",
            entity_id=plan_id,
            action="rollback",
            user_id=user_id,
            correlation_id=correlation_id,
            execution_id=execution_id
        )
        
        logger.info(
            "Migration rolled back successfully",
            plan_id=plan_id,
            execution_id=execution_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return MigrationRollbackSchema(**rollback_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to rollback migration",
            error=str(e),
            plan_id=plan_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to rollback migration"
        )


@router.get("/plans/{plan_id}/report", response_model=MigrationReportSchema)
async def get_migration_report(
    request: Request,
    plan_id: str,
    execution_id: Optional[str] = Query(None, description="Specific execution ID"),
    include_details: bool = Query(True, description="Include detailed migration steps"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get comprehensive migration report
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    try:
        migration_service = MigrationService(db)
        
        report = await migration_service.generate_migration_report(
            plan_id=plan_id,
            execution_id=execution_id,
            include_details=include_details,
            user_id=user_id
        )
        
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Migration plan {plan_id} not found"
            )
        
        return MigrationReportSchema(**report)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get migration report",
            error=str(e),
            plan_id=plan_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate migration report"
        )


@router.delete("/plans/{plan_id}", response_model=SuccessResponseSchema)
async def delete_migration_plan(
    request: Request,
    plan_id: str,
    force_delete: bool = Query(False, description="Force delete even if executed"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a migration plan
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Deleting migration plan",
        plan_id=plan_id,
        force_delete=force_delete,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        migration_service = MigrationService(db)
        
        # Check if plan can be deleted
        can_delete = await migration_service.check_plan_deletion(
            plan_id=plan_id,
            user_id=user_id
        )
        
        if not can_delete["can_delete"] and not force_delete:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Cannot delete migration plan: {', '.join(can_delete['blockers'])}"
            )
        
        # Delete plan
        success = await migration_service.delete_migration_plan(
            plan_id=plan_id,
            deleted_by=user_id,
            force_delete=force_delete
        )
        
        if success:
            # Log business event
            log_business_event(
                event_type="migration_plan_deleted",
                entity_type="migration",
                entity_id=plan_id,
                action="delete",
                user_id=user_id,
                correlation_id=correlation_id
            )
            
            return SuccessResponseSchema(
                success=True,
                message="Migration plan deleted successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete migration plan"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to delete migration plan",
            error=str(e),
            plan_id=plan_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete migration plan"
        )