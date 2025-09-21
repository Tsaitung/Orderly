"""
CRUD operations for Business Units (業務單位)
"""
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.orm import selectinload, joinedload
from app.models.business_unit import BusinessUnit
from app.schemas.business_unit import BusinessUnitCreateSchema, BusinessUnitUpdateSchema
from .base import CRUDBase
import structlog
from decimal import Decimal

logger = structlog.get_logger(__name__)


class CRUDBusinessUnit(CRUDBase[BusinessUnit, BusinessUnitCreateSchema, BusinessUnitUpdateSchema]):
    """CRUD operations for Business Units"""
    
    async def get_by_code(
        self, 
        db: AsyncSession, 
        *, 
        location_id: str,
        code: str,
        include_inactive: bool = False
    ) -> Optional[BusinessUnit]:
        """Get business unit by location ID and code"""
        query = select(BusinessUnit).where(
            and_(
                BusinessUnit.location_id == location_id,
                BusinessUnit.code == code
            )
        )
        
        if not include_inactive:
            query = query.where(BusinessUnit.is_active == True)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_with_location(
        self,
        db: AsyncSession,
        *,
        id: str,
        include_inactive: bool = False
    ) -> Optional[BusinessUnit]:
        """Get business unit with its location loaded"""
        query = (
            select(BusinessUnit)
            .options(
                joinedload(BusinessUnit.location).joinedload("company")
            )
            .where(BusinessUnit.id == id)
        )
        
        if not include_inactive:
            query = query.where(BusinessUnit.is_active == True)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_location(
        self,
        db: AsyncSession,
        *,
        location_id: str,
        include_inactive: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[BusinessUnit]:
        """Get business units by location ID"""
        query = select(BusinessUnit).where(BusinessUnit.location_id == location_id)
        
        if not include_inactive:
            query = query.where(BusinessUnit.is_active == True)
        
        query = query.offset(skip).limit(limit).order_by(BusinessUnit.name)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_by_company(
        self,
        db: AsyncSession,
        *,
        company_id: str,
        include_inactive: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[BusinessUnit]:
        """Get business units by company ID (through location)"""
        from app.models.customer_location import CustomerLocation
        
        query = (
            select(BusinessUnit)
            .join(CustomerLocation)
            .where(CustomerLocation.company_id == company_id)
        )
        
        if not include_inactive:
            query = query.where(BusinessUnit.is_active == True)
        
        query = query.offset(skip).limit(limit).order_by(BusinessUnit.name)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def search_business_units(
        self,
        db: AsyncSession,
        *,
        query: str,
        limit: int = 20,
        include_inactive: bool = False
    ) -> List[BusinessUnit]:
        """Search business units by name, code, or type"""
        search_fields = ['name', 'code', 'type', 'cost_center_code']
        return await self.search(
            db,
            query=query,
            search_fields=search_fields,
            limit=limit,
            include_inactive=include_inactive
        )
    
    async def check_code_availability(
        self,
        db: AsyncSession,
        *,
        location_id: str,
        code: str,
        exclude_id: Optional[str] = None
    ) -> bool:
        """Check if business unit code is available within location"""
        query = select(func.count(BusinessUnit.id)).where(
            and_(
                BusinessUnit.location_id == location_id,
                BusinessUnit.code == code
            )
        )
        
        if exclude_id:
            query = query.where(BusinessUnit.id != exclude_id)
        
        result = await db.execute(query)
        count = result.scalar()
        return count == 0
    
    async def get_by_type(
        self,
        db: AsyncSession,
        *,
        unit_type: str,
        include_inactive: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[BusinessUnit]:
        """Get business units by type"""
        query = select(BusinessUnit).where(BusinessUnit.type == unit_type)
        
        if not include_inactive:
            query = query.where(BusinessUnit.is_active == True)
        
        query = query.offset(skip).limit(limit).order_by(BusinessUnit.name)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_by_cost_center(
        self,
        db: AsyncSession,
        *,
        cost_center_code: str,
        include_inactive: bool = False
    ) -> List[BusinessUnit]:
        """Get business units by cost center code"""
        query = select(BusinessUnit).where(BusinessUnit.cost_center_code == cost_center_code)
        
        if not include_inactive:
            query = query.where(BusinessUnit.is_active == True)
        
        query = query.order_by(BusinessUnit.name)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_units_with_budget(
        self,
        db: AsyncSession,
        *,
        min_budget: Optional[Decimal] = None,
        max_budget: Optional[Decimal] = None,
        include_inactive: bool = False
    ) -> List[BusinessUnit]:
        """Get business units with budget filters"""
        query = select(BusinessUnit).where(BusinessUnit.budget_monthly.isnot(None))
        
        if not include_inactive:
            query = query.where(BusinessUnit.is_active == True)
        
        if min_budget is not None:
            query = query.where(BusinessUnit.budget_monthly >= min_budget)
        
        if max_budget is not None:
            query = query.where(BusinessUnit.budget_monthly <= max_budget)
        
        query = query.order_by(BusinessUnit.budget_monthly.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_units_requiring_approval(
        self,
        db: AsyncSession,
        *,
        include_inactive: bool = False
    ) -> List[BusinessUnit]:
        """Get business units that require order approval"""
        query = select(BusinessUnit).where(BusinessUnit.requires_approval == True)
        
        if not include_inactive:
            query = query.where(BusinessUnit.is_active == True)
        
        query = query.order_by(BusinessUnit.name)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_units_with_restrictions(
        self,
        db: AsyncSession,
        *,
        has_supplier_restrictions: Optional[bool] = None,
        has_category_restrictions: Optional[bool] = None,
        include_inactive: bool = False
    ) -> List[BusinessUnit]:
        """Get business units with ordering restrictions"""
        query = select(BusinessUnit)
        
        if not include_inactive:
            query = query.where(BusinessUnit.is_active == True)
        
        conditions = []
        
        if has_supplier_restrictions is not None:
            if has_supplier_restrictions:
                conditions.append(BusinessUnit.allowed_suppliers.isnot(None))
            else:
                conditions.append(BusinessUnit.allowed_suppliers.is_(None))
        
        if has_category_restrictions is not None:
            if has_category_restrictions:
                conditions.append(BusinessUnit.blocked_categories.isnot(None))
            else:
                conditions.append(BusinessUnit.blocked_categories.is_(None))
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(BusinessUnit.name)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def validate_order_permission(
        self,
        db: AsyncSession,
        *,
        unit_id: str,
        order_amount: float,
        supplier_id: Optional[str] = None,
        category_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Validate if business unit can place an order"""
        unit = await self.get(db, id=unit_id)
        if not unit:
            return {
                'can_order': False,
                'reasons': ['Business unit not found']
            }
        
        reasons = []
        
        # Check basic ordering permission
        if not unit.can_order():
            reasons.append('Business unit cannot place orders')
        
        # Check order amount validation
        amount_valid, amount_reason = unit.validate_order_amount(order_amount)
        if not amount_valid:
            reasons.append(amount_reason)
        
        # Check supplier restrictions
        if supplier_id and not unit.is_supplier_allowed(supplier_id):
            reasons.append(f'Supplier {supplier_id} is not allowed for this business unit')
        
        # Check category restrictions
        if category_ids:
            blocked_cats = [cat_id for cat_id in category_ids if unit.is_category_blocked(cat_id)]
            if blocked_cats:
                reasons.append(f'Categories {blocked_cats} are blocked for this business unit')
        
        # Check if approval is required
        requires_approval = unit.requires_order_approval(order_amount)
        
        return {
            'can_order': len(reasons) == 0,
            'reasons': reasons,
            'requires_approval': requires_approval,
            'approval_threshold': float(unit.approval_threshold) if unit.approval_threshold else None,
            'max_order_value': float(unit.max_order_value) if unit.max_order_value else None
        }
    
    async def get_budget_status(
        self,
        db: AsyncSession,
        *,
        unit_id: str,
        current_month_spend: float = 0
    ) -> Optional[Dict[str, Any]]:
        """Get budget status for a business unit"""
        unit = await self.get(db, id=unit_id)
        if not unit:
            return None
        
        return unit.get_budget_status(current_month_spend)
    
    async def get_ordering_restrictions(
        self,
        db: AsyncSession,
        *,
        unit_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get complete ordering restrictions for a business unit"""
        unit = await self.get(db, id=unit_id)
        if not unit:
            return None
        
        return unit.get_ordering_restrictions()
    
    async def update_ordering_permissions(
        self,
        db: AsyncSession,
        *,
        unit_id: str,
        permissions: Dict[str, Any],
        updated_by: str
    ) -> Optional[BusinessUnit]:
        """Update ordering permissions for a business unit"""
        unit = await self.get(db, id=unit_id)
        if not unit:
            return None
        
        try:
            unit.update_ordering_permissions(permissions, updated_by)
            await db.commit()
            
            logger.info(
                "Business unit ordering permissions updated",
                unit_id=unit_id,
                updated_by=updated_by,
                permissions=permissions
            )
            
            return unit
            
        except Exception as e:
            await db.rollback()
            logger.error(
                "Failed to update business unit ordering permissions",
                unit_id=unit_id,
                error=str(e),
                updated_by=updated_by
            )
            raise
    
    async def validate_business_rules(
        self,
        db: AsyncSession,
        *,
        business_unit: BusinessUnit
    ) -> List[str]:
        """Validate business rules for business unit"""
        errors = []
        
        # Use model validation
        model_errors = business_unit.validate_business_rules()
        errors.extend(model_errors)
        
        # Additional database validations
        code_available = await self.check_code_availability(
            db, 
            location_id=business_unit.location_id,
            code=business_unit.code, 
            exclude_id=business_unit.id
        )
        if not code_available:
            errors.append(f"Business unit code '{business_unit.code}' is already in use within this location")
        
        # Check if location exists
        from .location import location as location_crud
        location_exists = await location_crud.get(db, id=business_unit.location_id)
        if not location_exists:
            errors.append(f"Location '{business_unit.location_id}' does not exist")
        
        return errors
    
    async def can_delete(
        self,
        db: AsyncSession,
        *,
        unit_id: str
    ) -> Tuple[bool, List[str]]:
        """Check if business unit can be deleted"""
        unit = await self.get(db, id=unit_id)
        if not unit:
            return False, ["Business unit not found"]
        
        return unit.can_delete()
    
    async def get_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """Get overall business unit statistics"""
        # Basic counts
        total_units = await db.scalar(
            select(func.count(BusinessUnit.id))
        )
        
        active_units = await db.scalar(
            select(func.count(BusinessUnit.id))
            .where(BusinessUnit.is_active == True)
        )
        
        # Units by type
        type_counts = {}
        type_results = await db.execute(
            select(
                BusinessUnit.type,
                func.count(BusinessUnit.id).label('count')
            )
            .where(BusinessUnit.is_active == True)
            .group_by(BusinessUnit.type)
        )
        
        for unit_type, count in type_results:
            type_counts[unit_type or 'unspecified'] = count
        
        # Units with budget
        units_with_budget = await db.scalar(
            select(func.count(BusinessUnit.id))
            .where(
                and_(
                    BusinessUnit.is_active == True,
                    BusinessUnit.budget_monthly.isnot(None)
                )
            )
        )
        
        # Total budget
        total_budget = await db.scalar(
            select(func.sum(BusinessUnit.budget_monthly))
            .where(BusinessUnit.is_active == True)
        ) or 0
        
        # Units requiring approval
        units_requiring_approval = await db.scalar(
            select(func.count(BusinessUnit.id))
            .where(
                and_(
                    BusinessUnit.is_active == True,
                    BusinessUnit.requires_approval == True
                )
            )
        )
        
        # Units with restrictions
        units_with_supplier_restrictions = await db.scalar(
            select(func.count(BusinessUnit.id))
            .where(
                and_(
                    BusinessUnit.is_active == True,
                    BusinessUnit.allowed_suppliers.isnot(None)
                )
            )
        )
        
        units_with_category_restrictions = await db.scalar(
            select(func.count(BusinessUnit.id))
            .where(
                and_(
                    BusinessUnit.is_active == True,
                    BusinessUnit.blocked_categories.isnot(None)
                )
            )
        )
        
        # Average budget
        avg_budget = await db.scalar(
            select(func.avg(BusinessUnit.budget_monthly))
            .where(
                and_(
                    BusinessUnit.is_active == True,
                    BusinessUnit.budget_monthly.isnot(None)
                )
            )
        ) or 0
        
        return {
            'total_business_units': total_units,
            'active_business_units': active_units,
            'inactive_business_units': total_units - active_units,
            'units_by_type': type_counts,
            'units_with_budget': units_with_budget,
            'units_without_budget': active_units - units_with_budget,
            'total_monthly_budget': float(total_budget),
            'average_monthly_budget': float(avg_budget),
            'units_requiring_approval': units_requiring_approval,
            'units_with_supplier_restrictions': units_with_supplier_restrictions,
            'units_with_category_restrictions': units_with_category_restrictions
        }
    
    async def get_units_by_hierarchy_level(
        self,
        db: AsyncSession,
        *,
        group_id: Optional[str] = None,
        company_id: Optional[str] = None,
        location_id: Optional[str] = None,
        include_inactive: bool = False
    ) -> List[BusinessUnit]:
        """Get business units filtered by hierarchy level"""
        from app.models.customer_location import CustomerLocation
        from app.models.customer_company import CustomerCompany
        
        query = select(BusinessUnit)
        
        if location_id:
            query = query.where(BusinessUnit.location_id == location_id)
        elif company_id:
            query = query.join(CustomerLocation).where(CustomerLocation.company_id == company_id)
        elif group_id:
            query = (
                query
                .join(CustomerLocation)
                .join(CustomerCompany)
                .where(CustomerCompany.group_id == group_id)
            )
        
        if not include_inactive:
            query = query.where(BusinessUnit.is_active == True)
        
        query = query.order_by(BusinessUnit.name)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def bulk_update_permissions(
        self,
        db: AsyncSession,
        *,
        unit_ids: List[str],
        permissions: Dict[str, Any],
        updated_by: str
    ) -> int:
        """Bulk update ordering permissions for multiple business units"""
        try:
            updated_count = 0
            
            for unit_id in unit_ids:
                unit = await self.get(db, id=unit_id)
                if unit:
                    unit.update_ordering_permissions(permissions, updated_by)
                    updated_count += 1
            
            await db.commit()
            
            logger.info(
                "Bulk business unit permissions updated",
                count=updated_count,
                updated_by=updated_by,
                permissions=permissions
            )
            
            return updated_count
            
        except Exception as e:
            await db.rollback()
            logger.error(
                "Failed to bulk update business unit permissions",
                unit_ids=unit_ids,
                error=str(e),
                updated_by=updated_by
            )
            raise


# Create the business unit CRUD instance
business_unit = CRUDBusinessUnit(BusinessUnit)