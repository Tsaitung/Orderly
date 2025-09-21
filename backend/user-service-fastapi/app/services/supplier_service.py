"""
Supplier service layer for business logic and database operations
"""
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, func, and_, or_, desc, asc, case, text, String
from datetime import datetime, timedelta
import json

from app.models.organization import Organization
from app.models.supplier import SupplierProfile, SupplierStatus, DeliveryCapacity
from app.schemas.supplier import (
    SupplierCard, SupplierDetail, SupplierStats, SupplierActivityMetrics,
    SupplierFilterRequest, SupplierUpdateRequest
)


class SupplierService:
    """Service class for supplier-related operations"""
    
    @staticmethod
    async def get_supplier_stats(db: AsyncSession) -> SupplierStats:
        """Get overall supplier statistics"""
        
        # Basic counts by status
        status_counts = await db.execute(
            select(
                SupplierProfile.status,
                func.count(SupplierProfile.id).label('count')
            ).group_by(SupplierProfile.status)
        )
        
        stats = SupplierStats()
        for row in status_counts:
            status_str = row.status.value if row.status else "UNKNOWN"
            if status_str == "VERIFIED":
                stats.active_suppliers = row.count
            elif status_str == "PENDING":
                stats.pending_suppliers = row.count
            elif status_str == "SUSPENDED":
                stats.suspended_suppliers = row.count
            elif status_str == "DEACTIVATED":
                stats.deactivated_suppliers = row.count
        
        # Total suppliers
        total_result = await db.execute(
            select(func.count(SupplierProfile.id))
        )
        stats.total_suppliers = total_result.scalar() or 0
        
        # Delivery capacity distribution
        capacity_dist = await db.execute(
            select(
                SupplierProfile.delivery_capacity,
                func.count(SupplierProfile.id).label('count')
            ).group_by(SupplierProfile.delivery_capacity)
        )
        
        capacity_map = {}
        for row in capacity_dist:
            if row.delivery_capacity:
                capacity_map[row.delivery_capacity.value] = row.count
        stats.capacity_distribution = capacity_map
        
        # For now, mock some metrics that would require orders data
        stats.total_gmv = 3800000.0  # Would calculate from actual orders
        stats.monthly_gmv = 850000.0
        stats.avg_fulfillment_rate = 96.8
        stats.avg_quality_score = 4.5
        stats.total_orders = 2847
        stats.monthly_orders = 1245
        stats.supplier_growth_rate = 15.3
        stats.gmv_growth_rate = 22.4
        stats.orders_growth_rate = 18.7
        
        return stats
    
    @staticmethod
    async def list_suppliers(
        db: AsyncSession,
        filters: SupplierFilterRequest
    ) -> Tuple[List[SupplierCard], int]:
        """Get paginated list of suppliers with filtering"""
        
        # Execute raw SQL query to avoid enum validation issues
        sql_query = """
            SELECT 
                o.id, o.name, o."contactPerson", o."contactPhone", o."contactEmail", 
                o.address, o."taxId", o."productCategories", o.certifications, o."createdAt",
                sp.status, sp."deliveryCapacity", sp."minimumOrderAmount", sp."paymentTermsDays",
                sp."publicDescription", sp."verifiedAt", sp."verifiedBy"
            FROM organizations o
            JOIN supplier_profiles sp ON o.id = sp."organizationId"
            WHERE o.type = 'supplier'
        """
        
        # Add filtering to SQL
        filter_conditions = []
        params = {}
        
        if filters.search:
            filter_conditions.append("""
                (LOWER(o.name) LIKE LOWER(:search) 
                 OR LOWER(o."contactPerson") LIKE LOWER(:search)
                 OR LOWER(o."contactEmail") LIKE LOWER(:search))
            """)
            params['search'] = f"%{filters.search}%"
        
        if filters.status:
            filter_conditions.append("sp.status = :status")
            params['status'] = filters.status.value
        
        if filters.min_order_amount is not None:
            filter_conditions.append("sp.\"minimumOrderAmount\" >= :min_amount")
            params['min_amount'] = filters.min_order_amount
        
        if filters.max_order_amount is not None:
            filter_conditions.append("sp.\"minimumOrderAmount\" <= :max_amount")
            params['max_amount'] = filters.max_order_amount
        
        if filter_conditions:
            sql_query += " AND " + " AND ".join(filter_conditions)
        
        # Add sorting
        sort_column = "o.\"createdAt\""
        if filters.sort_by == "name":
            sort_column = "o.name"
        elif filters.sort_by == "status":
            sort_column = "sp.status"
        elif filters.sort_by == "minimum_order_amount":
            sort_column = "sp.\"minimumOrderAmount\""
        
        sort_order = "DESC" if filters.sort_order == "desc" else "ASC"
        sql_query += f" ORDER BY {sort_column} {sort_order}"
        
        # Add pagination
        offset = (filters.page - 1) * filters.page_size
        sql_query += f" LIMIT {filters.page_size} OFFSET {offset}"
        
        # Get total count first
        count_sql = """
            SELECT COUNT(*)
            FROM organizations o
            JOIN supplier_profiles sp ON o.id = sp."organizationId"
            WHERE o.type = 'supplier'
        """
        if filter_conditions:
            count_sql += " AND " + " AND ".join(filter_conditions)
        
        # Execute count query
        total_result = await db.execute(text(count_sql), params)
        total = total_result.scalar() or 0
        
        # Execute main query
        result = await db.execute(text(sql_query), params)
        rows = result.fetchall()
        
        # Convert to SupplierCard objects
        suppliers = []
        for row in rows:
            # Mock activity metrics - would calculate from real data
            mock_metrics = SupplierService._generate_mock_metrics(row.id)
            
            # Parse JSON fields
            product_categories = row.productCategories if row.productCategories else []
            certifications = row.certifications if row.certifications else []
            
            # Map status display
            status_map = {
                "PENDING": "審核中",
                "VERIFIED": "營運中", 
                "SUSPENDED": "暫停營運",
                "DEACTIVATED": "已停用"
            }
            
            # Map capacity display  
            capacity_map = {
                "SMALL": "小型",
                "MEDIUM": "中型",
                "LARGE": "大型"
            }
            
            supplier_card = SupplierCard(
                id=row.id,
                name=row.name,
                contact_person=row.contactPerson,
                contact_phone=row.contactPhone,
                contact_email=row.contactEmail,
                address=row.address,
                status=row.status,
                status_display=status_map.get(row.status, row.status),
                delivery_capacity=row.deliveryCapacity,
                capacity_display=capacity_map.get(row.deliveryCapacity, row.deliveryCapacity or "未設定"),
                minimum_order_amount=float(row.minimumOrderAmount or 0),
                payment_terms_display=f"月結{row.paymentTermsDays}天" if row.paymentTermsDays else "未設定",
                product_categories=product_categories,
                certifications=certifications,
                monthly_gmv=mock_metrics["monthly_gmv"],
                monthly_orders=mock_metrics["monthly_orders"],
                fulfillment_rate=mock_metrics["fulfillment_rate"],
                quality_score=mock_metrics["quality_score"],
                gmv_growth_rate=mock_metrics["gmv_growth_rate"],
                orders_growth_rate=mock_metrics["orders_growth_rate"],
                last_order_date=mock_metrics.get("last_order_date"),
                activity_level=mock_metrics["activity_level"],
                is_active=row.status == "VERIFIED",
                join_date=row.createdAt
            )
            suppliers.append(supplier_card)
        
        return suppliers, total
    
    @staticmethod
    async def get_supplier_detail(db: AsyncSession, supplier_id: str) -> Optional[SupplierDetail]:
        """Get detailed supplier information"""
        
        query = select(Organization, SupplierProfile).join(
            SupplierProfile, Organization.id == SupplierProfile.organization_id
        ).where(
            and_(
                Organization.id == supplier_id,
                func.cast(Organization.type, String) == "supplier"
            )
        )
        
        result = await db.execute(query)
        row = result.first()
        
        if not row:
            return None
        
        org, profile = row
        
        # Mock activity metrics - would calculate from real data
        mock_metrics = SupplierService._generate_mock_metrics(org.id)
        activity_metrics = SupplierActivityMetrics(**mock_metrics)
        
        supplier_detail = SupplierDetail(
            id=org.id,
            name=org.name,
            contact_person=org.contact_person,
            contact_phone=org.contact_phone,
            contact_email=org.contact_email,
            address=org.address,
            business_type=org.business_type.value if org.business_type else None,
            tax_id=org.tax_id,
            product_categories=org.product_categories or [],
            certifications=org.certifications or [],
            status=profile.status.value,
            status_display=profile.get_status_display(),
            delivery_capacity=profile.delivery_capacity.value if profile.delivery_capacity else None,
            capacity_display=profile.get_capacity_display(),
            delivery_capacity_kg_per_day=profile.delivery_capacity_kg_per_day,
            operating_hours=profile.operating_hours or {},
            delivery_zones=profile.delivery_zones or [],
            minimum_order_amount=float(profile.minimum_order_amount or 0),
            payment_terms_days=profile.payment_terms_days,
            payment_terms_display=profile.get_payment_terms_display(),
            quality_certifications=profile.quality_certifications or [],
            food_safety_license=profile.food_safety_license,
            food_safety_expires_at=profile.food_safety_expires_at,
            public_description=profile.public_description,
            verified_at=profile.verified_at,
            verified_by=profile.verified_by,
            metrics=activity_metrics,
            join_date=org.created_at,
            created_at=org.created_at,
            updated_at=org.updated_at,
            is_active=profile.is_active(),
            operating_status=profile.get_operating_status(),
            activity_level=mock_metrics["activity_level"]
        )
        
        return supplier_detail
    
    @staticmethod
    async def update_supplier_status(
        db: AsyncSession,
        supplier_id: str,
        update_data: SupplierUpdateRequest,
        updated_by: str
    ) -> Optional[SupplierDetail]:
        """Update supplier status and verification"""
        
        # Get supplier profile
        query = select(SupplierProfile).where(
            SupplierProfile.organization_id == supplier_id
        )
        result = await db.execute(query)
        profile = result.scalar_one_or_none()
        
        if not profile:
            return None
        
        # Update status
        profile.status = SupplierStatus(update_data.status.value)
        
        if update_data.status == "VERIFIED" and not profile.verified_at:
            profile.update_verification(
                verified_by=update_data.verified_by or updated_by,
                status=SupplierStatus.VERIFIED
            )
        
        if update_data.internal_notes:
            profile.internal_notes = update_data.internal_notes
        
        profile.updated_at = func.now()
        
        await db.commit()
        await db.refresh(profile)
        
        # Return updated supplier detail
        return await SupplierService.get_supplier_detail(db, supplier_id)
    
    @staticmethod
    def _generate_mock_metrics(supplier_id: str) -> Dict[str, Any]:
        """Generate mock activity metrics for suppliers"""
        # This would be replaced with real calculations from orders/transactions
        
        import hashlib
        import random
        
        # Use supplier ID to generate consistent mock data
        seed = int(hashlib.md5(supplier_id.encode()).hexdigest()[:8], 16)
        random.seed(seed)
        
        base_gmv = random.randint(500000, 2000000)
        base_orders = random.randint(300, 1200)
        
        # Generate realistic metrics
        metrics = {
            "total_orders": base_orders + random.randint(100, 500),
            "monthly_orders": random.randint(50, 200),
            "total_gmv": float(base_gmv),
            "monthly_gmv": float(random.randint(80000, 300000)),
            "avg_order_value": float(random.randint(800, 2500)),
            "fulfillment_rate": round(random.uniform(92.0, 99.5), 1),
            "on_time_delivery_rate": round(random.uniform(90.0, 98.0), 1),
            "quality_score": round(random.uniform(4.0, 5.0), 1),
            "customer_rating": round(random.uniform(4.0, 5.0), 1),
            "response_time_hours": round(random.uniform(0.5, 6.0), 1),
            "orders_growth_rate": round(random.uniform(-5.0, 35.0), 1),
            "gmv_growth_rate": round(random.uniform(-8.0, 40.0), 1),
        }
        
        # Determine activity level
        if metrics["monthly_orders"] > 120 and metrics["fulfillment_rate"] > 95:
            activity_level = "high"
        elif metrics["monthly_orders"] > 60 and metrics["fulfillment_rate"] > 90:
            activity_level = "moderate"
        else:
            activity_level = "low"
        
        metrics["activity_level"] = activity_level
        
        # Add recent dates
        days_ago = random.randint(1, 30)
        metrics["last_order_date"] = datetime.now() - timedelta(days=days_ago)
        
        login_days_ago = random.randint(1, 7)
        metrics["last_login_date"] = datetime.now() - timedelta(days=login_days_ago)
        
        return metrics