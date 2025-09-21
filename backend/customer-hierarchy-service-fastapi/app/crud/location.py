"""
CRUD operations for Customer Locations (地點)
"""
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text
from sqlalchemy.orm import selectinload, joinedload
from app.models.customer_location import CustomerLocation
from app.schemas.location import LocationCreateSchema, LocationUpdateSchema
from .base import CRUDBase
import structlog

logger = structlog.get_logger(__name__)


class CRUDLocation(CRUDBase[CustomerLocation, LocationCreateSchema, LocationUpdateSchema]):
    """CRUD operations for Customer Locations"""
    
    async def get_by_code(
        self, 
        db: AsyncSession, 
        *, 
        company_id: str,
        code: str,
        include_inactive: bool = False
    ) -> Optional[CustomerLocation]:
        """Get location by company ID and code"""
        query = select(CustomerLocation).where(
            and_(
                CustomerLocation.company_id == company_id,
                CustomerLocation.code == code
            )
        )
        
        if not include_inactive:
            query = query.where(CustomerLocation.is_active == True)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_with_business_units(
        self,
        db: AsyncSession,
        *,
        id: str,
        include_inactive: bool = False
    ) -> Optional[CustomerLocation]:
        """Get location with its business units loaded"""
        query = (
            select(CustomerLocation)
            .options(
                joinedload(CustomerLocation.company),
                selectinload(CustomerLocation.business_units)
            )
            .where(CustomerLocation.id == id)
        )
        
        if not include_inactive:
            query = query.where(CustomerLocation.is_active == True)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_company(
        self,
        db: AsyncSession,
        *,
        company_id: str,
        include_inactive: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[CustomerLocation]:
        """Get locations by company ID"""
        query = select(CustomerLocation).where(CustomerLocation.company_id == company_id)
        
        if not include_inactive:
            query = query.where(CustomerLocation.is_active == True)
        
        query = query.offset(skip).limit(limit).order_by(CustomerLocation.name)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def search_locations(
        self,
        db: AsyncSession,
        *,
        query: str,
        limit: int = 20,
        include_inactive: bool = False
    ) -> List[CustomerLocation]:
        """Search locations by name, code, or address"""
        search_query = select(CustomerLocation)
        
        if not include_inactive:
            search_query = search_query.where(CustomerLocation.is_active == True)
        
        # Build search conditions
        search_conditions = [
            CustomerLocation.name.ilike(f"%{query}%"),
            CustomerLocation.code.ilike(f"%{query}%"),
            CustomerLocation.city.ilike(f"%{query}%")
        ]
        
        # Search in address JSONB field
        search_conditions.append(
            CustomerLocation.address.op('?|')(
                [f'%{query}%', f'%{query.lower()}%', f'%{query.upper()}%']
            )
        )
        
        search_query = search_query.where(or_(*search_conditions))
        search_query = search_query.limit(limit)
        
        result = await db.execute(search_query)
        return result.scalars().all()
    
    async def check_code_availability(
        self,
        db: AsyncSession,
        *,
        company_id: str,
        code: str,
        exclude_id: Optional[str] = None
    ) -> bool:
        """Check if location code is available within company"""
        query = select(func.count(CustomerLocation.id)).where(
            and_(
                CustomerLocation.company_id == company_id,
                CustomerLocation.code == code
            )
        )
        
        if exclude_id:
            query = query.where(CustomerLocation.id != exclude_id)
        
        result = await db.execute(query)
        count = result.scalar()
        return count == 0
    
    async def get_locations_by_city(
        self,
        db: AsyncSession,
        *,
        city: str,
        include_inactive: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[CustomerLocation]:
        """Get locations by city"""
        query = select(CustomerLocation).where(CustomerLocation.city.ilike(f"%{city}%"))
        
        if not include_inactive:
            query = query.where(CustomerLocation.is_active == True)
        
        query = query.offset(skip).limit(limit).order_by(CustomerLocation.name)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_locations_by_coordinates(
        self,
        db: AsyncSession,
        *,
        center_lat: float,
        center_lng: float,
        radius_km: float,
        include_inactive: bool = False,
        limit: int = 100
    ) -> List[Tuple[CustomerLocation, float]]:
        """Get locations within radius of coordinates with distances"""
        # Use PostgreSQL ST_Distance_Sphere for accurate distance calculation
        distance_formula = func.ST_Distance_Sphere(
            func.ST_MakePoint(
                func.cast(CustomerLocation.coordinates['lng'], 'float'),
                func.cast(CustomerLocation.coordinates['lat'], 'float')
            ),
            func.ST_MakePoint(center_lng, center_lat)
        )
        
        query = (
            select(CustomerLocation, distance_formula.label('distance'))
            .where(
                and_(
                    CustomerLocation.coordinates.isnot(None),
                    distance_formula <= radius_km * 1000  # Convert km to meters
                )
            )
        )
        
        if not include_inactive:
            query = query.where(CustomerLocation.is_active == True)
        
        query = query.order_by('distance').limit(limit)
        
        try:
            result = await db.execute(query)
            return [(location, float(distance / 1000)) for location, distance in result]
        except Exception as e:
            logger.warning(
                "PostGIS not available, falling back to simple coordinate search",
                error=str(e)
            )
            # Fallback to simple bounding box search
            return await self._get_locations_by_bounding_box(
                db, center_lat, center_lng, radius_km, include_inactive, limit
            )
    
    async def _get_locations_by_bounding_box(
        self,
        db: AsyncSession,
        center_lat: float,
        center_lng: float,
        radius_km: float,
        include_inactive: bool,
        limit: int
    ) -> List[Tuple[CustomerLocation, float]]:
        """Fallback method using bounding box search"""
        # Approximate degrees per km (rough calculation)
        lat_degree_km = 111.0
        lng_degree_km = 111.0 * abs(func.cos(func.radians(center_lat)))
        
        lat_delta = radius_km / lat_degree_km
        lng_delta = radius_km / lng_degree_km
        
        query = (
            select(CustomerLocation)
            .where(
                and_(
                    CustomerLocation.coordinates.isnot(None),
                    func.cast(CustomerLocation.coordinates['lat'], 'float').between(
                        center_lat - lat_delta,
                        center_lat + lat_delta
                    ),
                    func.cast(CustomerLocation.coordinates['lng'], 'float').between(
                        center_lng - lng_delta,
                        center_lng + lng_delta
                    )
                )
            )
        )
        
        if not include_inactive:
            query = query.where(CustomerLocation.is_active == True)
        
        query = query.limit(limit)
        
        result = await db.execute(query)
        locations = result.scalars().all()
        
        # Calculate approximate distances using Python
        results = []
        for location in locations:
            coords = location.coordinates
            if coords and 'lat' in coords and 'lng' in coords:
                # Simple Haversine distance calculation
                try:
                    from geopy.distance import geodesic
                    distance = geodesic(
                        (center_lat, center_lng),
                        (coords['lat'], coords['lng'])
                    ).kilometers
                    results.append((location, distance))
                except ImportError:
                    # Rough distance calculation without geopy
                    lat_diff = center_lat - coords['lat']
                    lng_diff = center_lng - coords['lng']
                    distance = ((lat_diff * lat_degree_km) ** 2 + (lng_diff * lng_degree_km) ** 2) ** 0.5
                    results.append((location, distance))
        
        # Sort by distance and filter by radius
        results = [(loc, dist) for loc, dist in results if dist <= radius_km]
        results.sort(key=lambda x: x[1])
        
        return results
    
    async def get_locations_with_business_unit_counts(
        self,
        db: AsyncSession,
        *,
        min_units: Optional[int] = None,
        max_units: Optional[int] = None,
        include_inactive: bool = False
    ) -> List[Dict[str, Any]]:
        """Get locations with business unit counts"""
        from app.models.business_unit import BusinessUnit
        
        query = (
            select(
                CustomerLocation,
                func.count(BusinessUnit.id).label('unit_count')
            )
            .outerjoin(BusinessUnit)
            .group_by(CustomerLocation.id)
        )
        
        if not include_inactive:
            query = query.where(CustomerLocation.is_active == True)
        
        # Apply unit count filters
        if min_units is not None:
            query = query.having(func.count(BusinessUnit.id) >= min_units)
        
        if max_units is not None:
            query = query.having(func.count(BusinessUnit.id) <= max_units)
        
        query = query.order_by(CustomerLocation.name)
        
        result = await db.execute(query)
        
        locations_data = []
        for location, unit_count in result:
            locations_data.append({
                'location': location,
                'business_unit_count': unit_count
            })
        
        return locations_data
    
    async def get_hierarchy_summary(
        self,
        db: AsyncSession,
        *,
        location_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get complete hierarchy summary for a location"""
        location = await self.get_with_business_units(db, id=location_id)
        if not location:
            return None
        
        return location.get_hierarchy_summary()
    
    async def validate_business_rules(
        self,
        db: AsyncSession,
        *,
        location: CustomerLocation
    ) -> List[str]:
        """Validate business rules for location"""
        errors = []
        
        # Use model validation
        model_errors = location.validate_business_rules()
        errors.extend(model_errors)
        
        # Additional database validations
        if location.code:
            code_available = await self.check_code_availability(
                db, 
                company_id=location.company_id,
                code=location.code, 
                exclude_id=location.id
            )
            if not code_available:
                errors.append(f"Location code '{location.code}' is already in use within this company")
        
        # Check if company exists
        from .company import company as company_crud
        company_exists = await company_crud.get(db, id=location.company_id)
        if not company_exists:
            errors.append(f"Company '{location.company_id}' does not exist")
        
        return errors
    
    async def can_delete(
        self,
        db: AsyncSession,
        *,
        location_id: str
    ) -> Tuple[bool, List[str]]:
        """Check if location can be deleted"""
        location = await self.get(db, id=location_id)
        if not location:
            return False, ["Location not found"]
        
        return location.can_delete()
    
    async def soft_delete_cascade(
        self,
        db: AsyncSession,
        *,
        location_id: str,
        deleted_by: str
    ) -> Dict[str, int]:
        """Soft delete location and all business units"""
        location = await self.get_with_business_units(db, id=location_id, include_inactive=False)
        if not location:
            raise ValueError(f"Location {location_id} not found")
        
        try:
            # Use model's cascade delete method
            unit_count = location.soft_delete_cascade(deleted_by)
            await db.commit()
            
            logger.info(
                "Location cascade deleted",
                location_id=location_id,
                business_units_deleted=unit_count,
                deleted_by=deleted_by
            )
            
            return {
                'locations': 1,
                'business_units': unit_count
            }
            
        except Exception as e:
            await db.rollback()
            logger.error(
                "Failed to cascade delete location",
                location_id=location_id,
                error=str(e),
                deleted_by=deleted_by
            )
            raise
    
    async def check_operating_hours(
        self,
        db: AsyncSession,
        *,
        location_id: str,
        check_time: Optional[str] = None
    ) -> Dict[str, Any]:
        """Check if location is within operating hours"""
        location = await self.get(db, id=location_id)
        if not location:
            return {'error': 'Location not found'}
        
        is_open = location.is_within_operating_hours(check_time)
        
        return {
            'location_id': location_id,
            'is_open': is_open,
            'operating_hours': location.operating_hours,
            'timezone': location.timezone,
            'check_time': check_time or 'current_time'
        }
    
    async def get_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """Get overall location statistics"""
        from app.models.business_unit import BusinessUnit
        
        # Basic counts
        total_locations = await db.scalar(
            select(func.count(CustomerLocation.id))
        )
        
        active_locations = await db.scalar(
            select(func.count(CustomerLocation.id))
            .where(CustomerLocation.is_active == True)
        )
        
        # Locations with coordinates
        locations_with_coords = await db.scalar(
            select(func.count(CustomerLocation.id))
            .where(
                and_(
                    CustomerLocation.is_active == True,
                    CustomerLocation.coordinates.isnot(None)
                )
            )
        )
        
        # Locations with business units
        locations_with_units = await db.scalar(
            select(func.count(func.distinct(CustomerLocation.id)))
            .join(BusinessUnit)
            .where(
                and_(
                    CustomerLocation.is_active == True,
                    BusinessUnit.is_active == True
                )
            )
        )
        
        # Average business units per location
        avg_units = await db.scalar(
            select(func.avg(func.coalesce(func.count(BusinessUnit.id), 0)))
            .select_from(CustomerLocation)
            .outerjoin(BusinessUnit, BusinessUnit.location_id == CustomerLocation.id)
            .where(CustomerLocation.is_active == True)
            .group_by(CustomerLocation.id)
        ) or 0
        
        # Top cities by location count
        city_counts = await db.execute(
            select(
                CustomerLocation.city,
                func.count(CustomerLocation.id).label('count')
            )
            .where(CustomerLocation.is_active == True)
            .group_by(CustomerLocation.city)
            .order_by(func.count(CustomerLocation.id).desc())
            .limit(10)
        )
        
        top_cities = {city: count for city, count in city_counts if city}
        
        return {
            'total_locations': total_locations,
            'active_locations': active_locations,
            'inactive_locations': total_locations - active_locations,
            'locations_with_coordinates': locations_with_coords,
            'locations_with_business_units': locations_with_units,
            'empty_locations': active_locations - locations_with_units,
            'avg_business_units_per_location': float(avg_units),
            'top_cities': top_cities
        }


# Create the location CRUD instance
location = CRUDLocation(CustomerLocation)