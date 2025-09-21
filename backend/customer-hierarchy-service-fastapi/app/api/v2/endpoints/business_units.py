"""
Business Units API endpoints (業務單位)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any

from app.core.database import get_database
from app.crud import business_unit as business_unit_crud
from app.schemas.business_unit import (
    BusinessUnitCreateSchema,
    BusinessUnitUpdateSchema,
    BusinessUnitResponseSchema,
    BusinessUnitDetailResponseSchema,
    BusinessUnitListRequestSchema,
    BusinessUnitListResponseSchema,
    BusinessUnitStatsSchema,
    BusinessUnitValidationSchema,
    BusinessUnitOrderingPermissionSchema,
    BusinessUnitOrderingPermissionUpdateSchema,
    BusinessUnitBudgetSchema,
    BusinessUnitBudgetUpdateSchema
)
from app.schemas.common import SuccessResponseSchema
from app.middleware.auth import get_current_user, get_hierarchy_context
from app.middleware.logging import log_business_event, get_correlation_id
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/", response_model=BusinessUnitListResponseSchema)
async def list_business_units(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    include_inactive: bool = Query(False, description="Include inactive business units"),
    location_id: Optional[str] = Query(None, description="Filter by location ID"),
    unit_type: Optional[str] = Query(None, description="Filter by unit type"),
    name_contains: Optional[str] = Query(None, description="Filter by name containing"),
    has_ordering_permission: Optional[bool] = Query(None, description="Filter by ordering permission"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List business units with pagination and filtering
    """
    hierarchy_context = get_hierarchy_context(request)
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Listing business units",
        user_id=user_id,
        skip=skip,
        limit=limit,
        location_id=location_id,
        correlation_id=correlation_id
    )
    
    try:
        if name_contains:
            # Search business units by name
            business_units = await business_unit_crud.search_business_units(
                db,
                query=name_contains,
                limit=limit,
                include_inactive=include_inactive
            )
            total = len(business_units)
        elif location_id:
            # Filter by location
            business_units = await business_unit_crud.get_by_location(
                db,
                location_id=location_id,
                include_inactive=include_inactive,
                skip=skip,
                limit=limit
            )
            total = await business_unit_crud.count(
                db,
                include_inactive=include_inactive,
                filters={"location_id": location_id}
            )
        elif unit_type:
            # Filter by unit type
            business_units = await business_unit_crud.get_by_type(
                db,
                unit_type=unit_type,
                include_inactive=include_inactive,
                skip=skip,
                limit=limit
            )
            total = await business_unit_crud.count(
                db,
                include_inactive=include_inactive,
                filters={"unit_type": unit_type}
            )
        elif has_ordering_permission is not None:
            # Filter by ordering permission
            business_units = await business_unit_crud.get_by_ordering_permission(
                db,
                has_ordering_permission=has_ordering_permission,
                include_inactive=include_inactive,
                skip=skip,
                limit=limit
            )
            total = await business_unit_crud.count(
                db,
                include_inactive=include_inactive,
                filters={"has_ordering_permission": has_ordering_permission}
            )
        else:
            # Get all business units
            business_units = await business_unit_crud.get_multi(
                db,
                skip=skip,
                limit=limit,
                include_inactive=include_inactive
            )
            total = await business_unit_crud.count(
                db,
                include_inactive=include_inactive
            )
        
        return BusinessUnitListResponseSchema(
            items=[BusinessUnitResponseSchema.from_orm(unit) for unit in business_units],
            total=total,
            page=skip // limit + 1,
            per_page=limit,
            has_next=(skip + limit) < total,
            has_prev=skip > 0
        )
        
    except Exception as e:
        logger.error(
            "Failed to list business units",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve business units"
        )


@router.post("/", response_model=BusinessUnitResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_business_unit(
    request: Request,
    unit_data: BusinessUnitCreateSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new business unit
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Creating business unit",
        user_id=user_id,
        unit_name=unit_data.name,
        location_id=unit_data.location_id,
        correlation_id=correlation_id
    )
    
    try:
        # Verify location exists
        from app.crud import location as location_crud
        location = await location_crud.get(db, id=unit_data.location_id)
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location {unit_data.location_id} not found"
            )
        
        # Check permissions
        hierarchy_context = get_hierarchy_context(request)
        if hierarchy_context["scope_level"] in ["company", "location", "unit"]:
            if location.company_id not in hierarchy_context["company_ids"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this location's company"
                )
        
        # Create business unit
        business_unit = await business_unit_crud.create(
            db,
            obj_in=unit_data,
            created_by=user_id
        )
        
        # Log business event
        log_business_event(
            event_type="business_unit_created",
            entity_type="business_unit",
            entity_id=business_unit.id,
            action="create",
            user_id=user_id,
            correlation_id=correlation_id,
            unit_name=business_unit.name,
            location_id=business_unit.location_id,
            unit_type=business_unit.unit_type
        )
        
        logger.info(
            "Business unit created successfully",
            unit_id=business_unit.id,
            unit_name=business_unit.name,
            location_id=business_unit.location_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return BusinessUnitResponseSchema.from_orm(business_unit)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to create business unit",
            error=str(e),
            unit_name=unit_data.name,
            location_id=unit_data.location_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create business unit"
        )


@router.get("/{unit_id}", response_model=BusinessUnitDetailResponseSchema)
async def get_business_unit(
    request: Request,
    unit_id: str,
    include_permissions: bool = Query(False, description="Include ordering permissions in response"),
    include_budget: bool = Query(False, description="Include budget information in response"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific business unit by ID
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Getting business unit",
        unit_id=unit_id,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        if include_permissions or include_budget:
            business_unit = await business_unit_crud.get_with_details(
                db, 
                id=unit_id,
                include_permissions=include_permissions,
                include_budget=include_budget
            )
        else:
            business_unit = await business_unit_crud.get(db, id=unit_id)
        
        if not business_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business unit {unit_id} not found"
            )
        
        # Check access permissions
        hierarchy_context = get_hierarchy_context(request)
        if hierarchy_context["scope_level"] in ["company", "location", "unit"]:
            # Get location to check company access
            from app.crud import location as location_crud
            location = await location_crud.get(db, id=business_unit.location_id)
            if not location or location.company_id not in hierarchy_context["company_ids"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this business unit"
                )
        
        return BusinessUnitDetailResponseSchema.from_orm(business_unit)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get business unit",
            error=str(e),
            unit_id=unit_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve business unit"
        )


@router.put("/{unit_id}", response_model=BusinessUnitResponseSchema)
async def update_business_unit(
    request: Request,
    unit_id: str,
    unit_data: BusinessUnitUpdateSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a business unit
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Updating business unit",
        unit_id=unit_id,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        # Get existing business unit
        business_unit = await business_unit_crud.get(db, id=unit_id)
        if not business_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business unit {unit_id} not found"
            )
        
        # Check permissions
        hierarchy_context = get_hierarchy_context(request)
        if hierarchy_context["scope_level"] in ["company", "location", "unit"]:
            from app.crud import location as location_crud
            location = await location_crud.get(db, id=business_unit.location_id)
            if not location or location.company_id not in hierarchy_context["company_ids"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this business unit"
                )
        
        # Update business unit
        updated_unit = await business_unit_crud.update(
            db,
            db_obj=business_unit,
            obj_in=unit_data,
            updated_by=user_id
        )
        
        # Log business event
        log_business_event(
            event_type="business_unit_updated",
            entity_type="business_unit",
            entity_id=unit_id,
            action="update",
            user_id=user_id,
            correlation_id=correlation_id,
            changes=unit_data.dict(exclude_unset=True)
        )
        
        logger.info(
            "Business unit updated successfully",
            unit_id=unit_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return BusinessUnitResponseSchema.from_orm(updated_unit)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to update business unit",
            error=str(e),
            unit_id=unit_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update business unit"
        )


@router.delete("/{unit_id}", response_model=SuccessResponseSchema)
async def delete_business_unit(
    request: Request,
    unit_id: str,
    force: bool = Query(False, description="Force delete even with active orders"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a business unit (soft delete with order history check)
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Deleting business unit",
        unit_id=unit_id,
        force=force,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        # Check if business unit exists
        business_unit = await business_unit_crud.get(db, id=unit_id)
        if not business_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business unit {unit_id} not found"
            )
        
        # Check permissions
        hierarchy_context = get_hierarchy_context(request)
        if hierarchy_context["scope_level"] in ["company", "location", "unit"]:
            from app.crud import location as location_crud
            location = await location_crud.get(db, id=business_unit.location_id)
            if not location or location.company_id not in hierarchy_context["company_ids"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this business unit"
                )
        
        # Check if business unit can be deleted
        can_delete, reasons = await business_unit_crud.can_delete(db, unit_id=unit_id)
        if not can_delete and not force:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete business unit: {', '.join(reasons)}"
            )
        
        # Perform soft delete
        success = await business_unit_crud.remove(
            db,
            id=unit_id,
            deleted_by=user_id,
            hard_delete=False
        )
        
        if success:
            # Log business event
            log_business_event(
                event_type="business_unit_deleted",
                entity_type="business_unit",
                entity_id=unit_id,
                action="delete",
                user_id=user_id,
                correlation_id=correlation_id,
                force=force
            )
            
            logger.info(
                "Business unit deleted successfully",
                unit_id=unit_id,
                user_id=user_id,
                correlation_id=correlation_id
            )
            
            return SuccessResponseSchema(
                success=True,
                message=f"Business unit deleted successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete business unit"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to delete business unit",
            error=str(e),
            unit_id=unit_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete business unit"
        )


@router.get("/{unit_id}/permissions", response_model=BusinessUnitOrderingPermissionSchema)
async def get_business_unit_permissions(
    request: Request,
    unit_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get business unit ordering permissions
    """
    correlation_id = get_correlation_id(request)
    
    try:
        permissions = await business_unit_crud.get_ordering_permissions(
            db,
            unit_id=unit_id
        )
        
        if not permissions:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business unit {unit_id} not found"
            )
        
        return BusinessUnitOrderingPermissionSchema(**permissions)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get business unit permissions",
            error=str(e),
            unit_id=unit_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve business unit permissions"
        )


@router.put("/{unit_id}/permissions", response_model=BusinessUnitResponseSchema)
async def update_business_unit_permissions(
    request: Request,
    unit_id: str,
    permissions_data: BusinessUnitOrderingPermissionUpdateSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update business unit ordering permissions
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    try:
        updated_unit = await business_unit_crud.update_ordering_permissions(
            db,
            unit_id=unit_id,
            permissions_data=permissions_data.dict(exclude_unset=True),
            updated_by=user_id
        )
        
        if not updated_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business unit {unit_id} not found"
            )
        
        # Log business event
        log_business_event(
            event_type="business_unit_permissions_updated",
            entity_type="business_unit",
            entity_id=unit_id,
            action="update_permissions",
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return BusinessUnitResponseSchema.from_orm(updated_unit)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to update business unit permissions",
            error=str(e),
            unit_id=unit_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update business unit permissions"
        )


@router.get("/{unit_id}/budget", response_model=BusinessUnitBudgetSchema)
async def get_business_unit_budget(
    request: Request,
    unit_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get business unit budget information
    """
    correlation_id = get_correlation_id(request)
    
    try:
        budget_info = await business_unit_crud.get_budget_info(
            db,
            unit_id=unit_id
        )
        
        if not budget_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business unit {unit_id} not found"
            )
        
        return BusinessUnitBudgetSchema(**budget_info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get business unit budget",
            error=str(e),
            unit_id=unit_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve business unit budget"
        )


@router.put("/{unit_id}/budget", response_model=BusinessUnitResponseSchema)
async def update_business_unit_budget(
    request: Request,
    unit_id: str,
    budget_data: BusinessUnitBudgetUpdateSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update business unit budget information
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    try:
        updated_unit = await business_unit_crud.update_budget_info(
            db,
            unit_id=unit_id,
            budget_data=budget_data.dict(exclude_unset=True),
            updated_by=user_id
        )
        
        if not updated_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business unit {unit_id} not found"
            )
        
        # Log business event
        log_business_event(
            event_type="business_unit_budget_updated",
            entity_type="business_unit",
            entity_id=unit_id,
            action="update_budget",
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return BusinessUnitResponseSchema.from_orm(updated_unit)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to update business unit budget",
            error=str(e),
            unit_id=unit_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update business unit budget"
        )


@router.post("/{unit_id}/validate", response_model=BusinessUnitValidationSchema)
async def validate_business_unit(
    request: Request,
    unit_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Validate business unit business rules
    """
    correlation_id = get_correlation_id(request)
    
    try:
        business_unit = await business_unit_crud.get(db, id=unit_id)
        if not business_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business unit {unit_id} not found"
            )
        
        errors = await business_unit_crud.validate_business_rules(db, business_unit=business_unit)
        
        return BusinessUnitValidationSchema(
            is_valid=len(errors) == 0,
            errors=errors,
            unit_id=unit_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to validate business unit",
            error=str(e),
            unit_id=unit_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate business unit"
        )


@router.get("/{unit_id}/stats", response_model=BusinessUnitStatsSchema)
async def get_business_unit_stats(
    request: Request,
    unit_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get business unit statistics
    """
    correlation_id = get_correlation_id(request)
    
    try:
        stats = await business_unit_crud.get_unit_stats(
            db,
            unit_id=unit_id
        )
        
        if not stats:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business unit {unit_id} not found"
            )
        
        return BusinessUnitStatsSchema(**stats)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get business unit stats",
            error=str(e),
            unit_id=unit_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve business unit statistics"
        )