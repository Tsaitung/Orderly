"""
Rate Configuration API endpoints
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.services.rate_config_service import RateConfigService
from app.schemas.rate_config import (
    RateConfigCreate, RateConfigUpdate, RateConfigActivate, RateConfigFilter,
    TransactionRateTierCreate, TransactionRateTierUpdate,
    RateCalculationRequest,
    RateConfigResponse, TransactionRateTierResponse, RateCalculationResponse,
    RateConfigListResponse, RateConfigSingleResponse,
    TransactionRateTierListResponse, TransactionRateTierSingleResponse,
    RateCalculationSingleResponse
)
from app.schemas.base import PaginationParams, ErrorResponse

router = APIRouter(prefix="/api/billing/rates", tags=["Rate Configuration"])


@router.get("/configs", response_model=RateConfigListResponse)
async def list_rate_configurations(
    config_type: Optional[str] = Query(None, pattern="^(commission|subscription|addon)$"),
    is_active: Optional[bool] = Query(None),
    target_supplier_type: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None, pattern="^(draft|pending|approved|rejected)$"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    List rate configurations with filtering and pagination
    
    - **config_type**: Filter by configuration type (commission, subscription, addon)
    - **is_active**: Filter by active status
    - **target_supplier_type**: Filter by target supplier type
    - **approval_status**: Filter by approval status
    - **search**: Search in configuration name, supplier type, or product category
    - **page**: Page number (starts from 1)
    - **page_size**: Items per page (1-1000)
    - **sort_by**: Field to sort by
    - **sort_order**: Sort order (asc/desc)
    """
    try:
        service = RateConfigService(db)
        
        filters = RateConfigFilter(
            config_type=config_type,
            is_active=is_active,
            target_supplier_type=target_supplier_type,
            approval_status=approval_status,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        pagination = PaginationParams(page=page, page_size=page_size)
        
        configs, total = await service.get_rate_configs(
            filters=filters,
            offset=pagination.offset,
            limit=pagination.limit
        )
        
        return RateConfigListResponse(
            success=True,
            data=[RateConfigResponse.from_orm(config) for config in configs],
            total=total,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve rate configurations: {str(e)}"
        )


@router.post("/configs", response_model=RateConfigSingleResponse, status_code=status.HTTP_201_CREATED)
async def create_rate_configuration(
    config_data: RateConfigCreate,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Create a new rate configuration
    
    Creates a new rate configuration in draft status.
    Requires approval before becoming active.
    """
    try:
        service = RateConfigService(db)
        
        config = await service.create_rate_config(config_data)
        
        return RateConfigSingleResponse(
            success=True,
            message="Rate configuration created successfully",
            data=RateConfigResponse.from_orm(config)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create rate configuration: {str(e)}"
        )


@router.get("/configs/{config_id}", response_model=RateConfigSingleResponse)
async def get_rate_configuration(
    config_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get rate configuration by ID
    
    Returns detailed information about a specific rate configuration.
    """
    try:
        service = RateConfigService(db)
        
        config = await service.get_rate_config_by_id(config_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rate configuration not found"
            )
        
        return RateConfigSingleResponse(
            success=True,
            data=RateConfigResponse.from_orm(config)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve rate configuration: {str(e)}"
        )


@router.put("/configs/{config_id}", response_model=RateConfigSingleResponse)
async def update_rate_configuration(
    config_id: str,
    update_data: RateConfigUpdate,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Update rate configuration
    
    Updates an existing rate configuration. Only draft configurations can be updated.
    """
    try:
        service = RateConfigService(db)
        
        config = await service.update_rate_config(config_id, update_data)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rate configuration not found"
            )
        
        return RateConfigSingleResponse(
            success=True,
            message="Rate configuration updated successfully",
            data=RateConfigResponse.from_orm(config)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update rate configuration: {str(e)}"
        )


@router.post("/configs/{config_id}/activate", response_model=RateConfigSingleResponse)
async def activate_rate_configuration(
    config_id: str,
    activation_data: RateConfigActivate,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Activate rate configuration
    
    Approves and activates a rate configuration, making it available for use.
    """
    try:
        service = RateConfigService(db)
        
        config = await service.activate_rate_config(
            config_id=config_id,
            approved_by=activation_data.approved_by,
            approval_status=activation_data.approval_status
        )
        
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rate configuration not found"
            )
        
        return RateConfigSingleResponse(
            success=True,
            message=f"Rate configuration {activation_data.approval_status} successfully",
            data=RateConfigResponse.from_orm(config)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to activate rate configuration: {str(e)}"
        )


@router.get("/tiers", response_model=TransactionRateTierListResponse)
async def list_transaction_rate_tiers(
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_async_session)
):
    """
    List transaction rate tiers
    
    Returns all transaction rate tiers used for GMV-based commission calculation.
    """
    try:
        service = RateConfigService(db)
        
        pagination = PaginationParams(page=page, page_size=page_size)
        
        tiers, total = await service.get_rate_tiers(
            is_active=is_active,
            offset=pagination.offset,
            limit=pagination.limit
        )
        
        return TransactionRateTierListResponse(
            success=True,
            data=[TransactionRateTierResponse.from_orm(tier) for tier in tiers],
            total=total,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve rate tiers: {str(e)}"
        )


@router.post("/tiers", response_model=TransactionRateTierSingleResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction_rate_tier(
    tier_data: TransactionRateTierCreate,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Create transaction rate tier
    
    Creates a new transaction rate tier for GMV-based commission calculation.
    """
    try:
        service = RateConfigService(db)
        
        tier = await service.create_rate_tier(tier_data)
        
        return TransactionRateTierSingleResponse(
            success=True,
            message="Transaction rate tier created successfully",
            data=TransactionRateTierResponse.from_orm(tier)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create rate tier: {str(e)}"
        )


@router.put("/tiers/{tier_id}", response_model=TransactionRateTierSingleResponse)
async def update_transaction_rate_tier(
    tier_id: str,
    update_data: TransactionRateTierUpdate,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Update transaction rate tier
    
    Updates an existing transaction rate tier.
    """
    try:
        service = RateConfigService(db)
        
        tier = await service.update_rate_tier(tier_id, update_data)
        if not tier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction rate tier not found"
            )
        
        return TransactionRateTierSingleResponse(
            success=True,
            message="Transaction rate tier updated successfully",
            data=TransactionRateTierResponse.from_orm(tier)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update rate tier: {str(e)}"
        )


@router.post("/calculate", response_model=RateCalculationSingleResponse)
async def calculate_commission_rate(
    calculation_request: RateCalculationRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Calculate applicable commission rate
    
    Calculates the applicable commission rate and amount for a given transaction
    based on supplier profile, transaction amount, and current rate configurations.
    """
    try:
        service = RateConfigService(db)
        
        calculation_result = await service.calculate_applicable_rate(calculation_request)
        
        return RateCalculationSingleResponse(
            success=True,
            message="Commission rate calculated successfully",
            data=RateCalculationResponse(**calculation_result)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to calculate commission rate: {str(e)}"
        )


@router.get("/configs/supplier/{supplier_type}", response_model=RateConfigListResponse)
async def get_supplier_applicable_configs(
    supplier_type: str,
    product_category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get applicable rate configurations for supplier type
    
    Returns all active rate configurations that apply to the specified supplier type
    and optional product category.
    """
    try:
        service = RateConfigService(db)
        
        configs = await service.get_active_configs_for_supplier(
            supplier_type=supplier_type,
            product_category=product_category
        )
        
        return RateConfigListResponse(
            success=True,
            data=[RateConfigResponse.from_orm(config) for config in configs],
            total=len(configs),
            page=1,
            page_size=len(configs)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve applicable configurations: {str(e)}"
        )