"""
CRUD operations for Customer Groups (集團)
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from app.models.customer_group import CustomerGroup
from app.schemas.group import GroupCreateSchema, GroupUpdateSchema
from .base import CRUDBase
import structlog

logger = structlog.get_logger(__name__)


class CRUDGroup(CRUDBase[CustomerGroup, GroupCreateSchema, GroupUpdateSchema]):
    """CRUD operations for Customer Groups"""
    
    async def get_by_code(
        self, 
        db: AsyncSession, 
        *, 
        code: str,
        include_inactive: bool = False
    ) -> Optional[CustomerGroup]:
        """Get group by code"""
        query = select(CustomerGroup).where(CustomerGroup.code == code)
        
        if not include_inactive:
            query = query.where(CustomerGroup.is_active == True)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_with_companies(
        self,
        db: AsyncSession,
        *,
        id: str,
        include_inactive: bool = False
    ) -> Optional[CustomerGroup]:
        """Get group with its companies loaded"""
        query = (
            select(CustomerGroup)
            .options(selectinload(CustomerGroup.companies))
            .where(CustomerGroup.id == id)
        )
        
        if not include_inactive:
            query = query.where(CustomerGroup.is_active == True)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_multi_with_stats(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        include_inactive: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[CustomerGroup]:
        """Get multiple groups with statistics"""
        query = select(CustomerGroup)
        
        if not include_inactive:
            query = query.where(CustomerGroup.is_active == True)
        
        # Apply filters
        if filters:
            conditions = self._build_filter_conditions(filters)
            if conditions:
                query = query.where(and_(*conditions))
        
        query = query.offset(skip).limit(limit).order_by(CustomerGroup.name)
        
        result = await db.execute(query)
        groups = result.scalars().all()
        
        # Load statistics for each group
        for group in groups:
            await self._load_group_stats(db, group)
        
        return groups
    
    async def search_groups(
        self,
        db: AsyncSession,
        *,
        query: str,
        limit: int = 20,
        include_inactive: bool = False
    ) -> List[CustomerGroup]:
        """Search groups by name, code, or description"""
        search_fields = ['name', 'code', 'description']
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
        code: str,
        exclude_id: Optional[str] = None
    ) -> bool:
        """Check if group code is available"""
        return not await self.exists(
            db,
            filters={'code': code},
            exclude_id=exclude_id
        )
    
    async def get_groups_with_companies_count(
        self,
        db: AsyncSession,
        *,
        min_companies: Optional[int] = None,
        max_companies: Optional[int] = None,
        include_inactive: bool = False
    ) -> List[Dict[str, Any]]:
        """Get groups with company counts"""
        from app.models.customer_company import CustomerCompany
        
        query = (
            select(
                CustomerGroup,
                func.count(CustomerCompany.id).label('company_count')
            )
            .outerjoin(CustomerCompany)
            .group_by(CustomerGroup.id)
        )
        
        if not include_inactive:
            query = query.where(CustomerGroup.is_active == True)
        
        # Apply company count filters
        if min_companies is not None:
            query = query.having(func.count(CustomerCompany.id) >= min_companies)
        
        if max_companies is not None:
            query = query.having(func.count(CustomerCompany.id) <= max_companies)
        
        query = query.order_by(CustomerGroup.name)
        
        result = await db.execute(query)
        
        groups_data = []
        for group, company_count in result:
            groups_data.append({
                'group': group,
                'company_count': company_count
            })
        
        return groups_data
    
    async def get_hierarchy_summary(
        self,
        db: AsyncSession,
        *,
        group_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get complete hierarchy summary for a group"""
        group = await self.get_with_companies(db, id=group_id)
        if not group:
            return None
        
        return group.get_hierarchy_summary()
    
    async def validate_business_rules(
        self,
        db: AsyncSession,
        *,
        group: CustomerGroup
    ) -> List[str]:
        """Validate business rules for group"""
        errors = []
        
        # Use model validation
        model_errors = group.validate_business_rules()
        errors.extend(model_errors)
        
        # Additional database validations
        if group.code:
            code_available = await self.check_code_availability(
                db, 
                code=group.code, 
                exclude_id=group.id
            )
            if not code_available:
                errors.append(f"Group code '{group.code}' is already in use")
        
        return errors
    
    async def can_delete(
        self,
        db: AsyncSession,
        *,
        group_id: str
    ) -> tuple[bool, List[str]]:
        """Check if group can be deleted"""
        group = await self.get(db, id=group_id)
        if not group:
            return False, ["Group not found"]
        
        return group.can_delete()
    
    async def soft_delete_cascade(
        self,
        db: AsyncSession,
        *,
        group_id: str,
        deleted_by: str
    ) -> Dict[str, int]:
        """Soft delete group and all child entities"""
        group = await self.get_with_companies(db, id=group_id, include_inactive=False)
        if not group:
            raise ValueError(f"Group {group_id} not found")
        
        try:
            # Use model's cascade delete method
            counts = group.soft_delete_cascade(deleted_by)
            await db.commit()
            
            logger.info(
                "Group cascade deleted",
                group_id=group_id,
                deleted_counts=counts,
                deleted_by=deleted_by
            )
            
            return counts
            
        except Exception as e:
            await db.rollback()
            logger.error(
                "Failed to cascade delete group",
                group_id=group_id,
                error=str(e),
                deleted_by=deleted_by
            )
            raise
    
    async def get_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """Get overall group statistics"""
        from app.models.customer_company import CustomerCompany
        from app.models.customer_location import CustomerLocation
        from app.models.business_unit import BusinessUnit
        
        # Basic counts
        total_groups = await db.scalar(
            select(func.count(CustomerGroup.id))
        )
        
        active_groups = await db.scalar(
            select(func.count(CustomerGroup.id))
            .where(CustomerGroup.is_active == True)
        )
        
        # Groups with companies
        groups_with_companies = await db.scalar(
            select(func.count(func.distinct(CustomerGroup.id)))
            .join(CustomerCompany)
            .where(
                and_(
                    CustomerGroup.is_active == True,
                    CustomerCompany.is_active == True
                )
            )
        )
        
        # Average companies per group
        avg_companies = await db.scalar(
            select(func.avg(func.coalesce(func.count(CustomerCompany.id), 0)))
            .select_from(CustomerGroup)
            .outerjoin(CustomerCompany, CustomerCompany.group_id == CustomerGroup.id)
            .where(CustomerGroup.is_active == True)
            .group_by(CustomerGroup.id)
        ) or 0
        
        return {
            'total_groups': total_groups,
            'active_groups': active_groups,
            'inactive_groups': total_groups - active_groups,
            'groups_with_companies': groups_with_companies,
            'empty_groups': active_groups - groups_with_companies,
            'avg_companies_per_group': float(avg_companies)
        }
    
    async def _load_group_stats(self, db: AsyncSession, group: CustomerGroup):
        """Load statistics for a single group"""
        # This would be implemented to efficiently load stats
        # For now, we can use the model properties
        pass


# Create the group CRUD instance
group = CRUDGroup(CustomerGroup)