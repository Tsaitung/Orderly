"""
Customer Locations API endpoints (地點)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any

from app.core.database import get_database
from app.crud import location as location_crud
from app.schemas.location import (
    LocationCreateSchema,
    LocationUpdateSchema,
    LocationResponseSchema,
    LocationDetailResponseSchema,
    LocationListRequestSchema,
    LocationListResponseSchema,
    LocationStatsSchema,
    LocationValidationSchema,
    LocationGeocodeSchema
)
from app.schemas.common import SuccessResponseSchema
from app.middleware.auth import get_current_user, get_hierarchy_context
from app.middleware.logging import log_business_event, get_correlation_id
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/", response_model=LocationListResponseSchema)
async def list_locations(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    include_inactive: bool = Query(False, description="Include inactive locations"),
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    city: Optional[str] = Query(None, description="Filter by city"),
    address_contains: Optional[str] = Query(None, description="Filter by address containing"),
    latitude: Optional[float] = Query(None, description="Latitude for geographic search"),
    longitude: Optional[float] = Query(None, description="Longitude for geographic search"),
    radius_km: Optional[float] = Query(None, ge=0, le=100, description="Search radius in kilometers"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List customer locations with pagination and filtering
    """
    hierarchy_context = get_hierarchy_context(request)
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Listing locations",
        user_id=user_id,
        skip=skip,
        limit=limit,
        company_id=company_id,
        correlation_id=correlation_id
    )
    
    try:
        if latitude and longitude and radius_km:
            # Geographic search
            locations = await location_crud.search_by_location(
                db,
                latitude=latitude,
                longitude=longitude,
                radius_km=radius_km,
                limit=limit,
                include_inactive=include_inactive
            )
            total = len(locations)
        elif address_contains:
            # Address search
            locations = await location_crud.search_locations(
                db,
                query=address_contains,
                limit=limit,
                include_inactive=include_inactive
            )
            total = len(locations)
        elif company_id:
            # Filter by company
            locations = await location_crud.get_by_company(
                db,
                company_id=company_id,
                include_inactive=include_inactive,
                skip=skip,
                limit=limit
            )
            total = await location_crud.count(
                db,
                include_inactive=include_inactive,
                filters={"company_id": company_id}
            )
        elif city:
            # Filter by city
            locations = await location_crud.get_by_city(
                db,
                city=city,
                include_inactive=include_inactive,
                skip=skip,
                limit=limit
            )
            total = await location_crud.count(
                db,
                include_inactive=include_inactive,
                filters={"city": city}
            )
        else:
            # Get all locations
            locations = await location_crud.get_multi(
                db,
                skip=skip,
                limit=limit,
                include_inactive=include_inactive
            )
            total = await location_crud.count(
                db,
                include_inactive=include_inactive
            )
        
        return LocationListResponseSchema(
            items=[LocationResponseSchema.from_orm(location) for location in locations],
            total=total,
            page=skip // limit + 1,
            per_page=limit,
            has_next=(skip + limit) < total,
            has_prev=skip > 0
        )
        
    except Exception as e:
        logger.error(
            "Failed to list locations",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve locations"
        )


@router.post("/", response_model=LocationResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_location(
    request: Request,
    location_data: LocationCreateSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new customer location
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Creating location",
        user_id=user_id,
        location_name=location_data.name,
        company_id=location_data.company_id,
        correlation_id=correlation_id
    )
    
    try:
        # Verify company exists
        from app.crud import company as company_crud
        company = await company_crud.get(db, id=location_data.company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company {location_data.company_id} not found"
            )
        
        # Check permissions
        hierarchy_context = get_hierarchy_context(request)
        if hierarchy_context["scope_level"] in ["company", "location", "unit"]:
            if location_data.company_id not in hierarchy_context["company_ids"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this company"
                )
        
        # Create location
        location = await location_crud.create(
            db,
            obj_in=location_data,
            created_by=user_id
        )
        
        # Log business event
        log_business_event(
            event_type="location_created",
            entity_type="location",
            entity_id=location.id,
            action="create",
            user_id=user_id,
            correlation_id=correlation_id,
            location_name=location.name,
            company_id=location.company_id
        )
        
        logger.info(
            "Location created successfully",
            location_id=location.id,
            location_name=location.name,
            company_id=location.company_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return LocationResponseSchema.from_orm(location)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to create location",
            error=str(e),
            location_name=location_data.name,
            company_id=location_data.company_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create location"
        )


@router.get("/{location_id}", response_model=LocationDetailResponseSchema)
async def get_location(
    request: Request,
    location_id: str,
    include_business_units: bool = Query(False, description="Include business units in response"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific location by ID
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Getting location",
        location_id=location_id,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        if include_business_units:
            location = await location_crud.get_with_business_units(db, id=location_id)
        else:
            location = await location_crud.get(db, id=location_id)
        
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location {location_id} not found"
            )
        
        # Check access permissions
        hierarchy_context = get_hierarchy_context(request)
        if hierarchy_context["scope_level"] in ["company", "location", "unit"]:
            if location.company_id not in hierarchy_context["company_ids"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this location"
                )
        
        return LocationDetailResponseSchema.from_orm(location)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get location",
            error=str(e),
            location_id=location_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve location"
        )


@router.put("/{location_id}", response_model=LocationResponseSchema)
async def update_location(
    request: Request,
    location_id: str,
    location_data: LocationUpdateSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a customer location
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Updating location",
        location_id=location_id,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        # Get existing location
        location = await location_crud.get(db, id=location_id)
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location {location_id} not found"
            )
        
        # Check permissions
        hierarchy_context = get_hierarchy_context(request)
        if hierarchy_context["scope_level"] in ["company", "location", "unit"]:
            if location.company_id not in hierarchy_context["company_ids"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this location"
                )
        
        # Update location
        updated_location = await location_crud.update(
            db,
            db_obj=location,
            obj_in=location_data,
            updated_by=user_id
        )
        
        # Log business event
        log_business_event(
            event_type="location_updated",
            entity_type="location",
            entity_id=location_id,
            action="update",
            user_id=user_id,
            correlation_id=correlation_id,
            changes=location_data.dict(exclude_unset=True)
        )
        
        logger.info(
            "Location updated successfully",
            location_id=location_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return LocationResponseSchema.from_orm(updated_location)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to update location",
            error=str(e),
            location_id=location_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update location"
        )


@router.delete("/{location_id}", response_model=SuccessResponseSchema)
async def delete_location(
    request: Request,
    location_id: str,
    force: bool = Query(False, description="Force delete even with dependencies"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a customer location (soft delete with cascade check)
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Deleting location",
        location_id=location_id,
        force=force,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        # Check if location exists
        location = await location_crud.get(db, id=location_id)
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location {location_id} not found"
            )
        
        # Check permissions
        hierarchy_context = get_hierarchy_context(request)
        if hierarchy_context["scope_level"] in ["company", "location", "unit"]:
            if location.company_id not in hierarchy_context["company_ids"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this location"
                )
        
        # Check if location can be deleted
        can_delete, reasons = await location_crud.can_delete(db, location_id=location_id)
        if not can_delete and not force:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete location: {', '.join(reasons)}"
            )
        
        # Perform cascade soft delete
        if force or can_delete:
            delete_counts = await location_crud.soft_delete_cascade(
                db,
                location_id=location_id,
                deleted_by=user_id
            )
            
            # Log business event
            log_business_event(
                event_type="location_deleted",
                entity_type="location",
                entity_id=location_id,
                action="delete",
                user_id=user_id,
                correlation_id=correlation_id,
                delete_counts=delete_counts,
                force=force
            )
            
            logger.info(
                "Location deleted successfully",
                location_id=location_id,
                delete_counts=delete_counts,
                user_id=user_id,
                correlation_id=correlation_id
            )
            
            return SuccessResponseSchema(
                success=True,
                message=f"Location deleted successfully. Affected entities: {delete_counts}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to delete location",
            error=str(e),
            location_id=location_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete location"
        )


@router.get("/{location_id}/business-units", response_model=List[Dict[str, Any]])
async def get_location_business_units(
    request: Request,
    location_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    include_inactive: bool = Query(False),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get business units within a location
    """
    correlation_id = get_correlation_id(request)
    
    try:
        # Verify location exists
        location = await location_crud.get(db, id=location_id)
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location {location_id} not found"
            )
        
        # Get business units in location
        from app.crud import business_unit as business_unit_crud
        business_units = await business_unit_crud.get_by_location(
            db,
            location_id=location_id,
            include_inactive=include_inactive,
            skip=skip,
            limit=limit
        )
        
        return [unit.to_dict() for unit in business_units]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get location business units",
            error=str(e),
            location_id=location_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve location business units"
        )


@router.post("/{location_id}/geocode", response_model=LocationGeocodeSchema)
async def geocode_location(
    request: Request,
    location_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Geocode location address to get latitude/longitude
    """
    correlation_id = get_correlation_id(request)
    
    try:
        location = await location_crud.get(db, id=location_id)
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location {location_id} not found"
            )
        
        # Perform geocoding
        geocode_result = await location_crud.geocode_address(
            db,
            location_id=location_id
        )
        
        if not geocode_result:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unable to geocode location address"
            )
        
        return LocationGeocodeSchema(**geocode_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to geocode location",
            error=str(e),
            location_id=location_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to geocode location"
        )


@router.post("/{location_id}/validate", response_model=LocationValidationSchema)
async def validate_location(
    request: Request,
    location_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Validate location business rules
    """
    correlation_id = get_correlation_id(request)
    
    try:
        location = await location_crud.get(db, id=location_id)
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location {location_id} not found"
            )
        
        errors = await location_crud.validate_business_rules(db, location=location)
        
        return LocationValidationSchema(
            is_valid=len(errors) == 0,
            errors=errors,
            location_id=location_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to validate location",
            error=str(e),
            location_id=location_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate location"
        )


@router.get("/{location_id}/stats", response_model=LocationStatsSchema)
async def get_location_stats(
    request: Request,
    location_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get location statistics
    """
    correlation_id = get_correlation_id(request)
    
    try:
        stats = await location_crud.get_location_stats(
            db,
            location_id=location_id
        )
        
        if not stats:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location {location_id} not found"
            )
        
        return LocationStatsSchema(**stats)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get location stats",
            error=str(e),
            location_id=location_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve location statistics"
        )