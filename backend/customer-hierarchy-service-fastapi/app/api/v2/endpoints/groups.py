"""
Customer Groups API endpoints (集團)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any

from app.core.database import get_database
from app.crud import group as group_crud
from app.schemas.group import (
    GroupCreateSchema,
    GroupUpdateSchema, 
    GroupResponseSchema,
    GroupDetailResponseSchema,
    GroupListRequestSchema,
    GroupListResponseSchema,
    GroupStatsSchema,
    GroupValidationSchema,
    GroupDeletionCheckSchema
)
from app.schemas.common import (
    BaseResponseSchema,
    SuccessResponseSchema,
    PaginationSchema
)
from app.middleware.auth import get_current_user, get_hierarchy_context, require_permission
from app.middleware.logging import log_business_event, get_correlation_id
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/", response_model=GroupListResponseSchema)
async def list_groups(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    include_inactive: bool = Query(False, description="Include inactive groups"),
    name_contains: Optional[str] = Query(None, description="Filter by name containing"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List customer groups with pagination and filtering
    """
    hierarchy_context = get_hierarchy_context(request)
    correlation_id = get_correlation_id(request)
    
    logger.info(
        "Listing groups",
        user_id=current_user.get("sub"),
        skip=skip,
        limit=limit,
        include_inactive=include_inactive,
        correlation_id=correlation_id
    )
    
    try:
        # Apply hierarchy-based filtering
        groups = await group_crud.get_multi(
            db,
            skip=skip,
            limit=limit,
            include_inactive=include_inactive
        )
        
        # Get total count
        total = await group_crud.count(
            db,
            include_inactive=include_inactive
        )
        
        # Apply name filtering if provided
        if name_contains:
            groups = await group_crud.search_groups(
                db,
                query=name_contains,
                limit=limit,
                include_inactive=include_inactive
            )
        
        return GroupListResponseSchema(
            items=[GroupResponseSchema.from_orm(group) for group in groups],
            total=total,
            page=skip // limit + 1,
            per_page=limit,
            has_next=(skip + limit) < total,
            has_prev=skip > 0
        )
        
    except Exception as e:
        logger.error(
            "Failed to list groups",
            error=str(e),
            user_id=current_user.get("sub"),
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve groups"
        )


@router.post("/", response_model=GroupResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_group(
    request: Request,
    group_data: GroupCreateSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new customer group
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Creating group",
        user_id=user_id,
        group_name=group_data.name,
        correlation_id=correlation_id
    )
    
    try:
        # Validate business rules
        if group_data.code:
            code_available = await group_crud.check_code_availability(
                db,
                code=group_data.code
            )
            if not code_available:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Group code '{group_data.code}' already exists"
                )
        
        # Create group
        group = await group_crud.create(
            db,
            obj_in=group_data,
            created_by=user_id
        )
        
        # Log business event
        log_business_event(
            event_type="group_created",
            entity_type="group",
            entity_id=group.id,
            action="create",
            user_id=user_id,
            correlation_id=correlation_id,
            group_name=group.name
        )
        
        logger.info(
            "Group created successfully",
            group_id=group.id,
            group_name=group.name,
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return GroupResponseSchema.from_orm(group)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to create group",
            error=str(e),
            group_name=group_data.name,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create group"
        )


@router.get("/{group_id}", response_model=GroupDetailResponseSchema)
async def get_group(
    request: Request,
    group_id: str,
    include_companies: bool = Query(False, description="Include companies in response"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific group by ID
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Getting group",
        group_id=group_id,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        if include_companies:
            group = await group_crud.get_with_companies(db, id=group_id)
        else:
            group = await group_crud.get(db, id=group_id)
        
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Group {group_id} not found"
            )
        
        # Check access permissions based on hierarchy context
        hierarchy_context = get_hierarchy_context(request)
        if hierarchy_context["scope_level"] == "group":
            if group_id not in hierarchy_context["group_ids"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this group"
                )
        
        return GroupDetailResponseSchema.from_orm(group)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get group",
            error=str(e),
            group_id=group_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve group"
        )


@router.put("/{group_id}", response_model=GroupResponseSchema)
async def update_group(
    request: Request,
    group_id: str,
    group_data: GroupUpdateSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a customer group
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Updating group",
        group_id=group_id,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        # Get existing group
        group = await group_crud.get(db, id=group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Group {group_id} not found"
            )
        
        # Check permissions
        hierarchy_context = get_hierarchy_context(request)
        if hierarchy_context["scope_level"] == "group":
            if group_id not in hierarchy_context["group_ids"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this group"
                )
        
        # Validate code uniqueness if changed
        if group_data.code and group_data.code != group.code:
            code_available = await group_crud.check_code_availability(
                db,
                code=group_data.code,
                exclude_id=group_id
            )
            if not code_available:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Group code '{group_data.code}' already exists"
                )
        
        # Update group
        updated_group = await group_crud.update(
            db,
            db_obj=group,
            obj_in=group_data,
            updated_by=user_id
        )
        
        # Log business event
        log_business_event(
            event_type="group_updated",
            entity_type="group", 
            entity_id=group_id,
            action="update",
            user_id=user_id,
            correlation_id=correlation_id,
            changes=group_data.dict(exclude_unset=True)
        )
        
        logger.info(
            "Group updated successfully",
            group_id=group_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return GroupResponseSchema.from_orm(updated_group)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to update group",
            error=str(e),
            group_id=group_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update group"
        )


@router.delete("/{group_id}", response_model=SuccessResponseSchema)
async def delete_group(
    request: Request,
    group_id: str,
    force: bool = Query(False, description="Force delete even with dependencies"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a customer group (soft delete with cascade check)
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Deleting group",
        group_id=group_id,
        force=force,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        # Check if group exists
        group = await group_crud.get(db, id=group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Group {group_id} not found"
            )
        
        # Check permissions
        hierarchy_context = get_hierarchy_context(request)
        if hierarchy_context["scope_level"] == "group":
            if group_id not in hierarchy_context["group_ids"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this group"
                )
        
        # Check if group can be deleted
        can_delete, reasons = await group_crud.can_delete(db, group_id=group_id)
        if not can_delete and not force:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete group: {', '.join(reasons)}"
            )
        
        # Perform cascade soft delete
        if force or can_delete:
            delete_counts = await group_crud.soft_delete_cascade(
                db,
                group_id=group_id,
                deleted_by=user_id
            )
            
            # Log business event
            log_business_event(
                event_type="group_deleted",
                entity_type="group",
                entity_id=group_id,
                action="delete",
                user_id=user_id,
                correlation_id=correlation_id,
                delete_counts=delete_counts,
                force=force
            )
            
            logger.info(
                "Group deleted successfully",
                group_id=group_id,
                delete_counts=delete_counts,
                user_id=user_id,
                correlation_id=correlation_id
            )
            
            return SuccessResponseSchema(
                success=True,
                message=f"Group deleted successfully. Affected entities: {delete_counts}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to delete group",
            error=str(e),
            group_id=group_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete group"
        )


@router.get("/{group_id}/companies", response_model=List[Dict[str, Any]])
async def get_group_companies(
    request: Request,
    group_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    include_inactive: bool = Query(False),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get companies within a group
    """
    correlation_id = get_correlation_id(request)
    
    try:
        # Verify group exists
        group = await group_crud.get(db, id=group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Group {group_id} not found"
            )
        
        # Get companies in group
        from app.crud import company as company_crud
        companies = await company_crud.get_by_group(
            db,
            group_id=group_id,
            include_inactive=include_inactive,
            skip=skip,
            limit=limit
        )
        
        return [company.to_dict() for company in companies]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get group companies",
            error=str(e),
            group_id=group_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve group companies"
        )


@router.get("/{group_id}/hierarchy", response_model=Dict[str, Any])
async def get_group_hierarchy(
    request: Request,
    group_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get complete hierarchy under a group
    """
    correlation_id = get_correlation_id(request)
    
    try:
        hierarchy_summary = await group_crud.get_hierarchy_summary(
            db,
            group_id=group_id
        )
        
        if not hierarchy_summary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Group {group_id} not found"
            )
        
        return hierarchy_summary
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get group hierarchy",
            error=str(e),
            group_id=group_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve group hierarchy"
        )


@router.post("/{group_id}/validate", response_model=GroupValidationSchema)
async def validate_group(
    request: Request,
    group_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Validate group business rules
    """
    correlation_id = get_correlation_id(request)
    
    try:
        group = await group_crud.get(db, id=group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Group {group_id} not found"
            )
        
        errors = await group_crud.validate_business_rules(db, group=group)
        
        return GroupValidationSchema(
            is_valid=len(errors) == 0,
            errors=errors,
            group_id=group_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to validate group",
            error=str(e),
            group_id=group_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate group"
        )