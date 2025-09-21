"""
CRUD operations for Customer Companies (公司)
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload, joinedload
from app.models.customer_company import CustomerCompany
from app.schemas.company import CompanyCreateSchema, CompanyUpdateSchema
from .base import CRUDBase
import structlog

logger = structlog.get_logger(__name__)


class CRUDCompany(CRUDBase[CustomerCompany, CompanyCreateSchema, CompanyUpdateSchema]):
    """CRUD operations for Customer Companies"""
    
    async def get_by_tax_id(
        self, 
        db: AsyncSession, 
        *, 
        tax_id: str,
        include_inactive: bool = False
    ) -> Optional[CustomerCompany]:
        """Get company by tax ID"""
        query = select(CustomerCompany).where(CustomerCompany.tax_id == tax_id)
        
        if not include_inactive:
            query = query.where(CustomerCompany.is_active == True)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_legacy_id(
        self,
        db: AsyncSession,
        *,
        legacy_organization_id: str,
        include_inactive: bool = False
    ) -> Optional[CustomerCompany]:
        """Get company by legacy organization ID"""
        query = select(CustomerCompany).where(
            CustomerCompany.legacy_organization_id == legacy_organization_id
        )
        
        if not include_inactive:
            query = query.where(CustomerCompany.is_active == True)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_with_locations(
        self,
        db: AsyncSession,
        *,
        id: str,
        include_inactive: bool = False
    ) -> Optional[CustomerCompany]:
        """Get company with its locations loaded"""
        query = (
            select(CustomerCompany)
            .options(
                joinedload(CustomerCompany.group),
                selectinload(CustomerCompany.locations)
            )
            .where(CustomerCompany.id == id)
        )
        
        if not include_inactive:
            query = query.where(CustomerCompany.is_active == True)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_group(
        self,
        db: AsyncSession,
        *,
        group_id: str,
        include_inactive: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[CustomerCompany]:
        """Get companies by group ID"""
        query = select(CustomerCompany).where(CustomerCompany.group_id == group_id)
        
        if not include_inactive:
            query = query.where(CustomerCompany.is_active == True)
        
        # Add eager loading to prevent N+1 queries
        query = query.options(
            selectinload(CustomerCompany.group),
            selectinload(CustomerCompany.locations)
        )
        
        query = query.offset(skip).limit(limit).order_by(CustomerCompany.name)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def search_companies(
        self,
        db: AsyncSession,
        *,
        query: str,
        limit: int = 20,
        include_inactive: bool = False
    ) -> List[CustomerCompany]:
        """Search companies by name, legal name, tax ID with eager loading"""
        search_query = select(CustomerCompany)
        
        if not include_inactive:
            search_query = search_query.where(CustomerCompany.is_active == True)
        
        # Build search conditions
        search_conditions = [
            CustomerCompany.name.ilike(f"%{query}%"),
            CustomerCompany.legal_name.ilike(f"%{query}%"),
            CustomerCompany.tax_id.ilike(f"%{query}%")
        ]
        
        search_query = search_query.where(or_(*search_conditions))
        
        # Add eager loading to prevent N+1 queries
        search_query = search_query.options(
            selectinload(CustomerCompany.group),
            selectinload(CustomerCompany.locations)
        )
        
        search_query = search_query.limit(limit)
        
        result = await db.execute(search_query)
        return result.scalars().all()
    
    async def check_tax_id_availability(
        self,
        db: AsyncSession,
        *,
        tax_id: str,
        exclude_id: Optional[str] = None
    ) -> bool:
        """Check if tax ID is available"""
        return not await self.exists(
            db,
            filters={'tax_id': tax_id},
            exclude_id=exclude_id
        )
    
    async def get_companies_by_type(
        self,
        db: AsyncSession,
        *,
        tax_id_type: str,
        include_inactive: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[CustomerCompany]:
        """Get companies by tax ID type"""
        query = select(CustomerCompany).where(CustomerCompany.tax_id_type == tax_id_type)
        
        if not include_inactive:
            query = query.where(CustomerCompany.is_active == True)
        
        # Add eager loading to prevent N+1 queries
        query = query.options(
            selectinload(CustomerCompany.group),
            selectinload(CustomerCompany.locations)
        )
        
        query = query.offset(skip).limit(limit).order_by(CustomerCompany.name)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_companies_with_credit_limit(
        self,
        db: AsyncSession,
        *,
        min_credit_limit: Optional[float] = None,
        max_credit_limit: Optional[float] = None,
        include_inactive: bool = False
    ) -> List[CustomerCompany]:
        """Get companies with credit limit filters"""
        query = select(CustomerCompany).where(CustomerCompany.credit_limit.isnot(None))
        
        if not include_inactive:
            query = query.where(CustomerCompany.is_active == True)
        
        if min_credit_limit is not None:
            query = query.where(CustomerCompany.credit_limit >= min_credit_limit)
        
        if max_credit_limit is not None:
            query = query.where(CustomerCompany.credit_limit <= max_credit_limit)
        
        query = query.order_by(CustomerCompany.credit_limit.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_hierarchy_summary(
        self,
        db: AsyncSession,
        *,
        company_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get complete hierarchy summary for a company"""
        company = await self.get_with_locations(db, id=company_id)
        if not company:
            return None
        
        return company.get_hierarchy_summary()
    
    async def get_billing_info(
        self,
        db: AsyncSession,
        *,
        company_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get billing information for a company"""
        company = await self.get(db, id=company_id)
        if not company:
            return None
        
        return company.get_billing_info()
    
    async def update_billing_info(
        self,
        db: AsyncSession,
        *,
        company_id: str,
        billing_data: Dict[str, Any],
        updated_by: str
    ) -> Optional[CustomerCompany]:
        """Update company billing information"""
        company = await self.get(db, id=company_id)
        if not company:
            return None
        
        try:
            company.update_billing_info(billing_data, updated_by)
            await db.commit()
            
            logger.info(
                "Company billing info updated",
                company_id=company_id,
                updated_by=updated_by,
                updated_fields=list(billing_data.keys())
            )
            
            return company
            
        except Exception as e:
            await db.rollback()
            logger.error(
                "Failed to update company billing info",
                company_id=company_id,
                error=str(e),
                updated_by=updated_by
            )
            raise
    
    async def validate_business_rules(
        self,
        db: AsyncSession,
        *,
        company: CustomerCompany
    ) -> List[str]:
        """Validate business rules for company"""
        errors = []
        
        # Use model validation
        model_errors = company.validate_business_rules()
        errors.extend(model_errors)
        
        # Additional database validations
        tax_id_available = await self.check_tax_id_availability(
            db, 
            tax_id=company.tax_id, 
            exclude_id=company.id
        )
        if not tax_id_available:
            errors.append(f"Tax ID '{company.tax_id}' is already in use")
        
        # Check if group exists (if specified)
        if company.group_id:
            from .group import group as group_crud
            group_exists = await group_crud.get(db, id=company.group_id)
            if not group_exists:
                errors.append(f"Group '{company.group_id}' does not exist")
        
        return errors
    
    async def can_delete(
        self,
        db: AsyncSession,
        *,
        company_id: str
    ) -> tuple[bool, List[str]]:
        """Check if company can be deleted"""
        company = await self.get(db, id=company_id)
        if not company:
            return False, ["Company not found"]
        
        return company.can_delete()
    
    async def soft_delete_cascade(
        self,
        db: AsyncSession,
        *,
        company_id: str,
        deleted_by: str
    ) -> Dict[str, int]:
        """Soft delete company and all child entities"""
        company = await self.get_with_locations(db, id=company_id, include_inactive=False)
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        try:
            # Use model's cascade delete method
            counts = company.soft_delete_cascade(deleted_by)
            await db.commit()
            
            logger.info(
                "Company cascade deleted",
                company_id=company_id,
                deleted_counts=counts,
                deleted_by=deleted_by
            )
            
            return counts
            
        except Exception as e:
            await db.rollback()
            logger.error(
                "Failed to cascade delete company",
                company_id=company_id,
                error=str(e),
                deleted_by=deleted_by
            )
            raise
    
    async def get_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """Get overall company statistics"""
        from app.models.customer_location import CustomerLocation
        from app.models.business_unit import BusinessUnit
        
        # Basic counts
        total_companies = await db.scalar(
            select(func.count(CustomerCompany.id))
        )
        
        active_companies = await db.scalar(
            select(func.count(CustomerCompany.id))
            .where(CustomerCompany.is_active == True)
        )
        
        # Companies by type
        type_counts = {}
        for tax_type in ['company', 'individual', 'foreign']:
            count = await db.scalar(
                select(func.count(CustomerCompany.id))
                .where(
                    and_(
                        CustomerCompany.is_active == True,
                        CustomerCompany.tax_id_type == tax_type
                    )
                )
            )
            type_counts[tax_type] = count
        
        # Companies with groups
        companies_with_groups = await db.scalar(
            select(func.count(CustomerCompany.id))
            .where(
                and_(
                    CustomerCompany.is_active == True,
                    CustomerCompany.group_id.isnot(None)
                )
            )
        )
        
        # Companies with credit limits
        companies_with_credit = await db.scalar(
            select(func.count(CustomerCompany.id))
            .where(
                and_(
                    CustomerCompany.is_active == True,
                    CustomerCompany.credit_limit.isnot(None)
                )
            )
        )
        
        # Total credit limit
        total_credit = await db.scalar(
            select(func.sum(CustomerCompany.credit_limit))
            .where(CustomerCompany.is_active == True)
        ) or 0
        
        # Average locations per company
        avg_locations = await db.scalar(
            select(func.avg(func.coalesce(func.count(CustomerLocation.id), 0)))
            .select_from(CustomerCompany)
            .outerjoin(CustomerLocation, CustomerLocation.company_id == CustomerCompany.id)
            .where(CustomerCompany.is_active == True)
            .group_by(CustomerCompany.id)
        ) or 0
        
        return {
            'total_companies': total_companies,
            'active_companies': active_companies,
            'inactive_companies': total_companies - active_companies,
            'companies_by_type': type_counts,
            'companies_with_groups': companies_with_groups,
            'standalone_companies': active_companies - companies_with_groups,
            'companies_with_credit_limit': companies_with_credit,
            'total_credit_limit': float(total_credit),
            'avg_locations_per_company': float(avg_locations)
        }
    
    async def migrate_from_legacy(
        self,
        db: AsyncSession,
        *,
        legacy_organization_id: str,
        migration_data: Dict[str, Any],
        migrated_by: str
    ) -> CustomerCompany:
        """Migrate company from legacy organization"""
        # Check if already migrated
        existing = await self.get_by_legacy_id(
            db, 
            legacy_organization_id=legacy_organization_id
        )
        if existing:
            raise ValueError(f"Organization {legacy_organization_id} already migrated")
        
        # Create company from migration data
        company_data = migration_data.copy()
        company_data['legacy_organization_id'] = legacy_organization_id
        company_data['created_by'] = migrated_by
        
        # Set migration metadata
        company_data['extra_data'] = company_data.get('extra_data', {})
        company_data['extra_data']['migrated'] = True
        company_data['extra_data']['migration_date'] = func.now()
        company_data['extra_data']['migrated_by'] = migrated_by
        
        company = CustomerCompany(**company_data)
        db.add(company)
        
        try:
            await db.commit()
            await db.refresh(company)
            
            logger.info(
                "Company migrated from legacy",
                legacy_organization_id=legacy_organization_id,
                new_company_id=company.id,
                migrated_by=migrated_by
            )
            
            return company
            
        except Exception as e:
            await db.rollback()
            logger.error(
                "Failed to migrate company from legacy",
                legacy_organization_id=legacy_organization_id,
                error=str(e),
                migrated_by=migrated_by
            )
            raise


# Create the company CRUD instance
company = CRUDCompany(CustomerCompany)