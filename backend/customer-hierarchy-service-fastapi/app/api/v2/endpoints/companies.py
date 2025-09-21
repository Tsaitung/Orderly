"""
Customer Companies API endpoints (公司)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any

from app.core.database import get_database
from app.crud import company as company_crud
from app.schemas.company import (
    CompanyCreateSchema,
    CompanyUpdateSchema,
    CompanyResponseSchema,
    CompanyDetailResponseSchema,
    CompanyListRequestSchema,
    CompanyListResponseSchema,
    CompanyBillingInfoSchema,
    CompanyBillingUpdateSchema,
    CompanyStatsSchema,
    CompanyValidationSchema,
    CompanyMigrationSchema
)
from app.schemas.common import SuccessResponseSchema
from app.middleware.auth import get_current_user, get_hierarchy_context
from app.middleware.logging import log_business_event, get_correlation_id
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/", response_model=CompanyListResponseSchema)
async def list_companies(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    include_inactive: bool = Query(False, description="Include inactive companies"),
    group_id: Optional[str] = Query(None, description="Filter by group ID"),
    tax_id_type: Optional[str] = Query(None, description="Filter by tax ID type"),
    name_contains: Optional[str] = Query(None, description="Filter by name containing"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List customer companies with pagination and filtering
    """
    hierarchy_context = get_hierarchy_context(request)
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Listing companies",
        user_id=user_id,
        skip=skip,
        limit=limit,
        group_id=group_id,
        correlation_id=correlation_id
    )
    
    try:
        if name_contains:
            # Search companies by name/tax ID
            companies = await company_crud.search_companies(
                db,
                query=name_contains,
                limit=limit,
                include_inactive=include_inactive
            )
            total = len(companies)
        elif group_id:
            # Filter by group
            companies = await company_crud.get_by_group(
                db,
                group_id=group_id,
                include_inactive=include_inactive,
                skip=skip,
                limit=limit
            )
            total = await company_crud.count(
                db,
                include_inactive=include_inactive,
                filters={"group_id": group_id}
            )
        elif tax_id_type:
            # Filter by tax ID type
            companies = await company_crud.get_companies_by_type(
                db,
                tax_id_type=tax_id_type,
                include_inactive=include_inactive,
                skip=skip,
                limit=limit
            )
            total = await company_crud.count(
                db,
                include_inactive=include_inactive,
                filters={"tax_id_type": tax_id_type}
            )
        else:
            # Get all companies
            companies = await company_crud.get_multi(
                db,
                skip=skip,
                limit=limit,
                include_inactive=include_inactive
            )
            total = await company_crud.count(
                db,
                include_inactive=include_inactive
            )
        
        return CompanyListResponseSchema(
            items=[CompanyResponseSchema.from_orm(company) for company in companies],
            total=total,
            page=skip // limit + 1,
            per_page=limit,
            has_next=(skip + limit) < total,
            has_prev=skip > 0
        )
        
    except Exception as e:
        logger.error(
            "Failed to list companies",
            error=str(e),
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve companies"
        )


@router.post("/", response_model=CompanyResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_company(
    request: Request,
    company_data: CompanyCreateSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new customer company
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Creating company",
        user_id=user_id,
        company_name=company_data.name,
        tax_id=company_data.tax_id,
        correlation_id=correlation_id
    )
    
    try:
        # Validate tax ID availability
        tax_id_available = await company_crud.check_tax_id_availability(
            db,
            tax_id=company_data.tax_id
        )
        if not tax_id_available:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tax ID '{company_data.tax_id}' already exists"
            )
        
        # Create company
        company = await company_crud.create(
            db,
            obj_in=company_data,
            created_by=user_id
        )
        
        # Log business event
        log_business_event(
            event_type="company_created",
            entity_type="company",
            entity_id=company.id,
            action="create",
            user_id=user_id,
            correlation_id=correlation_id,
            company_name=company.name,
            tax_id=company.tax_id
        )
        
        logger.info(
            "Company created successfully",
            company_id=company.id,
            company_name=company.name,
            tax_id=company.tax_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return CompanyResponseSchema.from_orm(company)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to create company",
            error=str(e),
            company_name=company_data.name,
            tax_id=company_data.tax_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create company"
        )


@router.get("/{company_id}", response_model=CompanyDetailResponseSchema)
async def get_company(
    request: Request,
    company_id: str,
    include_locations: bool = Query(False, description="Include locations in response"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific company by ID
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Getting company",
        company_id=company_id,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        if include_locations:
            company = await company_crud.get_with_locations(db, id=company_id)
        else:
            company = await company_crud.get(db, id=company_id)
        
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company {company_id} not found"
            )
        
        # Check access permissions
        hierarchy_context = get_hierarchy_context(request)
        if hierarchy_context["scope_level"] in ["company", "location", "unit"]:
            if company_id not in hierarchy_context["company_ids"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this company"
                )
        
        return CompanyDetailResponseSchema.from_orm(company)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get company",
            error=str(e),
            company_id=company_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve company"
        )


@router.put("/{company_id}", response_model=CompanyResponseSchema)
async def update_company(
    request: Request,
    company_id: str,
    company_data: CompanyUpdateSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a customer company
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Updating company",
        company_id=company_id,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        # Get existing company
        company = await company_crud.get(db, id=company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company {company_id} not found"
            )
        
        # Check permissions
        hierarchy_context = get_hierarchy_context(request)
        if hierarchy_context["scope_level"] in ["company", "location", "unit"]:
            if company_id not in hierarchy_context["company_ids"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this company"
                )
        
        # Validate tax ID uniqueness if changed
        if company_data.tax_id and company_data.tax_id != company.tax_id:
            tax_id_available = await company_crud.check_tax_id_availability(
                db,
                tax_id=company_data.tax_id,
                exclude_id=company_id
            )
            if not tax_id_available:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Tax ID '{company_data.tax_id}' already exists"
                )
        
        # Update company
        updated_company = await company_crud.update(
            db,
            db_obj=company,
            obj_in=company_data,
            updated_by=user_id
        )
        
        # Log business event
        log_business_event(
            event_type="company_updated",
            entity_type="company",
            entity_id=company_id,
            action="update",
            user_id=user_id,
            correlation_id=correlation_id,
            changes=company_data.dict(exclude_unset=True)
        )
        
        logger.info(
            "Company updated successfully",
            company_id=company_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return CompanyResponseSchema.from_orm(updated_company)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to update company",
            error=str(e),
            company_id=company_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update company"
        )


@router.delete("/{company_id}", response_model=SuccessResponseSchema)
async def delete_company(
    request: Request,
    company_id: str,
    force: bool = Query(False, description="Force delete even with dependencies"),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a customer company (soft delete with cascade check)
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    logger.info(
        "Deleting company",
        company_id=company_id,
        force=force,
        user_id=user_id,
        correlation_id=correlation_id
    )
    
    try:
        # Check if company exists
        company = await company_crud.get(db, id=company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company {company_id} not found"
            )
        
        # Check permissions
        hierarchy_context = get_hierarchy_context(request)
        if hierarchy_context["scope_level"] in ["company", "location", "unit"]:
            if company_id not in hierarchy_context["company_ids"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this company"
                )
        
        # Check if company can be deleted
        can_delete, reasons = await company_crud.can_delete(db, company_id=company_id)
        if not can_delete and not force:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete company: {', '.join(reasons)}"
            )
        
        # Perform cascade soft delete
        if force or can_delete:
            delete_counts = await company_crud.soft_delete_cascade(
                db,
                company_id=company_id,
                deleted_by=user_id
            )
            
            # Log business event
            log_business_event(
                event_type="company_deleted",
                entity_type="company",
                entity_id=company_id,
                action="delete",
                user_id=user_id,
                correlation_id=correlation_id,
                delete_counts=delete_counts,
                force=force
            )
            
            logger.info(
                "Company deleted successfully",
                company_id=company_id,
                delete_counts=delete_counts,
                user_id=user_id,
                correlation_id=correlation_id
            )
            
            return SuccessResponseSchema(
                success=True,
                message=f"Company deleted successfully. Affected entities: {delete_counts}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to delete company",
            error=str(e),
            company_id=company_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete company"
        )


@router.get("/{company_id}/locations", response_model=List[Dict[str, Any]])
async def get_company_locations(
    request: Request,
    company_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    include_inactive: bool = Query(False),
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get locations within a company
    """
    correlation_id = get_correlation_id(request)
    
    try:
        # Verify company exists
        company = await company_crud.get(db, id=company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company {company_id} not found"
            )
        
        # Get locations in company
        from app.crud import location as location_crud
        locations = await location_crud.get_by_company(
            db,
            company_id=company_id,
            include_inactive=include_inactive,
            skip=skip,
            limit=limit
        )
        
        return [location.to_dict() for location in locations]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get company locations",
            error=str(e),
            company_id=company_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve company locations"
        )


@router.get("/{company_id}/billing", response_model=CompanyBillingInfoSchema)
async def get_company_billing_info(
    request: Request,
    company_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get company billing information
    """
    correlation_id = get_correlation_id(request)
    
    try:
        billing_info = await company_crud.get_billing_info(
            db,
            company_id=company_id
        )
        
        if not billing_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company {company_id} not found"
            )
        
        return CompanyBillingInfoSchema(**billing_info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get company billing info",
            error=str(e),
            company_id=company_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve company billing information"
        )


@router.put("/{company_id}/billing", response_model=CompanyResponseSchema)
async def update_company_billing_info(
    request: Request,
    company_id: str,
    billing_data: CompanyBillingUpdateSchema,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update company billing information
    """
    correlation_id = get_correlation_id(request)
    user_id = current_user.get("sub")
    
    try:
        updated_company = await company_crud.update_billing_info(
            db,
            company_id=company_id,
            billing_data=billing_data.dict(exclude_unset=True),
            updated_by=user_id
        )
        
        if not updated_company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company {company_id} not found"
            )
        
        # Log business event
        log_business_event(
            event_type="company_billing_updated",
            entity_type="company",
            entity_id=company_id,
            action="update_billing",
            user_id=user_id,
            correlation_id=correlation_id
        )
        
        return CompanyResponseSchema.from_orm(updated_company)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to update company billing info",
            error=str(e),
            company_id=company_id,
            user_id=user_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update company billing information"
        )


@router.get("/{company_id}/validate-tax-id", response_model=Dict[str, Any])
async def validate_company_tax_id(
    request: Request,
    company_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Validate company tax ID format and uniqueness
    """
    correlation_id = get_correlation_id(request)
    
    try:
        company = await company_crud.get(db, id=company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company {company_id} not found"
            )
        
        # Validate business rules (includes tax ID validation)
        errors = await company_crud.validate_business_rules(db, company=company)
        
        tax_id_errors = [error for error in errors if "tax" in error.lower()]
        
        return {
            "company_id": company_id,
            "tax_id": company.tax_id,
            "tax_id_type": company.tax_id_type,
            "is_valid": len(tax_id_errors) == 0,
            "errors": tax_id_errors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to validate company tax ID",
            error=str(e),
            company_id=company_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate company tax ID"
        )


@router.post("/{company_id}/validate", response_model=CompanyValidationSchema)
async def validate_company(
    request: Request,
    company_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Validate company business rules
    """
    correlation_id = get_correlation_id(request)
    
    try:
        company = await company_crud.get(db, id=company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company {company_id} not found"
            )
        
        errors = await company_crud.validate_business_rules(db, company=company)
        
        return CompanyValidationSchema(
            is_valid=len(errors) == 0,
            errors=errors,
            company_id=company_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to validate company",
            error=str(e),
            company_id=company_id,
            correlation_id=correlation_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate company"
        )