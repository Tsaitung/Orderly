"""
Customer Location model - Third level of hierarchy (地點)
Physical delivery destination
"""
import re
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy import (
    Column, String, ForeignKey, Index, UniqueConstraint, 
    CheckConstraint, Text
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.hybrid import hybrid_property
from .base import BaseModel
import structlog

logger = structlog.get_logger(__name__)


class CustomerLocation(BaseModel):
    """
    Customer Location (地點) - Physical delivery destination
    
    This represents where goods are actually delivered. One company
    can have multiple locations, and each location has its own
    address and contact information.
    """
    __tablename__ = "customer_locations"
    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_company_location_code"),
        Index("idx_customer_locations_company", "company_id"),
        Index("idx_customer_locations_name", "name"),
        Index("idx_customer_locations_active", "is_active"),
        Index("idx_customer_locations_coordinates", "coordinates", postgresql_using="gin"),
        Index("idx_customer_locations_city", "city"),
    )

    # Hierarchy relationship
    company_id = Column(
        String, 
        ForeignKey("customer_companies.id", ondelete="CASCADE"), 
        nullable=False,
        comment="Parent company ID (所屬公司)"
    )
    
    # Basic location information
    name = Column(
        String(255), 
        nullable=False,
        comment="Location name (地點名稱)"
    )
    code = Column(
        String(50), 
        nullable=True,
        comment="Location code within company (地點代碼)"
    )
    
    # Address information
    address = Column(
        "address",
        JSONB,
        nullable=False,
        default=dict,
        comment="Complete address details"
    )
    city = Column(
        String(100),
        nullable=True,
        comment="City for indexing (城市)"
    )
    
    # Contact information
    delivery_contact = Column(
        "delivery_contact",
        JSONB, 
        nullable=False,
        default=dict,
        comment="Delivery contact information"
    )
    delivery_phone = Column(
        String(50),
        nullable=True,
        comment="Primary delivery phone number"
    )
    delivery_instructions = Column(
        Text,
        nullable=True,
        comment="Special delivery instructions (配送說明)"
    )
    
    # Operating information
    operating_hours = Column(
        "operating_hours",
        JSONB,
        nullable=True,
        comment="Operating hours by day of week"
    )
    coordinates = Column(
        "coordinates",
        JSONB,
        nullable=True,
        comment="GPS coordinates {lat, lng}"
    )
    timezone = Column(
        String(50),
        nullable=True,
        default="Asia/Taipei",
        comment="Timezone for this location"
    )
    
    # Relationships
    company = relationship(
        "CustomerCompany",
        back_populates="locations"
    )
    business_units = relationship(
        "BusinessUnit",
        back_populates="location",
        cascade="all, delete-orphan",
        lazy="select"
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Auto-generate code if not provided
        if not self.code and self.name:
            self.code = self._generate_code_from_name()
        
        # Extract city from address if provided
        if self.address and not self.city:
            self.city = self.address.get('city')
    
    @validates('name')
    def validate_name(self, key, name):
        """Validate location name"""
        if not name or not name.strip():
            raise ValueError("Location name cannot be empty")
        
        name = name.strip()
        if len(name) < 2:
            raise ValueError("Location name must be at least 2 characters long")
        
        if len(name) > 255:
            raise ValueError("Location name cannot exceed 255 characters")
        
        return name
    
    @validates('code')
    def validate_code(self, key, code):
        """Validate location code format"""
        if code is None:
            return code
            
        code = code.strip().upper()
        
        # Code pattern: alphanumeric, underscore, hyphen only
        if not re.match(r'^[A-Z0-9_-]+$', code):
            raise ValueError(
                "Location code must contain only uppercase letters, numbers, "
                "underscore and hyphen"
            )
        
        if len(code) < 1:
            raise ValueError("Location code must be at least 1 character long")
        
        if len(code) > 50:
            raise ValueError("Location code cannot exceed 50 characters")
        
        return code
    
    @validates('delivery_phone')
    def validate_delivery_phone(self, key, phone):
        """Validate delivery phone format"""
        if phone:
            # Remove common separators
            clean_phone = re.sub(r'[-\s\(\)]', '', phone)
            
            # Taiwan phone patterns
            patterns = [
                r'^09\d{8}$',        # Mobile: 09xxxxxxxx
                r'^0\d{1,2}\d{7,8}$', # Landline: 0x-xxxxxxxx
                r'^\+886\d{9}$',     # International mobile
                r'^\+886\d{8,9}$'    # International landline
            ]
            
            if not any(re.match(pattern, clean_phone) for pattern in patterns):
                raise ValueError(
                    "Invalid phone format. Examples: 0912345678, 02-12345678, +886912345678"
                )
        
        return phone
    
    @validates('address')
    def validate_address(self, key, address):
        """Validate address structure"""
        if not address:
            raise ValueError("Address cannot be empty")
        
        # Required address fields
        required_fields = ['street', 'city']
        missing_fields = [field for field in required_fields if not address.get(field)]
        
        if missing_fields:
            raise ValueError(f"Missing required address fields: {missing_fields}")
        
        # Optional fields with validation
        if 'postal_code' in address and address['postal_code']:
            postal_code = str(address['postal_code'])
            if not re.match(r'^\d{3,5}$', postal_code):
                raise ValueError("Postal code must be 3-5 digits")
        
        return address
    
    @validates('coordinates')
    def validate_coordinates(self, key, coords):
        """Validate GPS coordinates"""
        if coords:
            if not isinstance(coords, dict):
                raise ValueError("Coordinates must be a dictionary")
            
            if 'lat' not in coords or 'lng' not in coords:
                raise ValueError("Coordinates must contain 'lat' and 'lng' fields")
            
            try:
                lat = float(coords['lat'])
                lng = float(coords['lng'])
                
                if not (-90 <= lat <= 90):
                    raise ValueError("Latitude must be between -90 and 90")
                
                if not (-180 <= lng <= 180):
                    raise ValueError("Longitude must be between -180 and 180")
                
                coords['lat'] = lat
                coords['lng'] = lng
                
            except (ValueError, TypeError):
                raise ValueError("Coordinates must be valid numbers")
        
        return coords
    
    @validates('operating_hours')
    def validate_operating_hours(self, key, hours):
        """Validate operating hours structure"""
        if hours:
            if not isinstance(hours, dict):
                raise ValueError("Operating hours must be a dictionary")
            
            valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 
                         'friday', 'saturday', 'sunday']
            
            for day, schedule in hours.items():
                if day.lower() not in valid_days:
                    raise ValueError(f"Invalid day: {day}")
                
                if schedule and not isinstance(schedule, dict):
                    raise ValueError(f"Schedule for {day} must be a dictionary")
                
                if schedule:
                    if 'open' not in schedule or 'close' not in schedule:
                        raise ValueError(f"Schedule for {day} must contain 'open' and 'close' times")
                    
                    # Validate time format (HH:MM)
                    time_pattern = r'^([01]?\d|2[0-3]):[0-5]\d$'
                    if not re.match(time_pattern, schedule['open']):
                        raise ValueError(f"Invalid open time format for {day}: {schedule['open']}")
                    
                    if not re.match(time_pattern, schedule['close']):
                        raise ValueError(f"Invalid close time format for {day}: {schedule['close']}")
        
        return hours
    
    def _generate_code_from_name(self) -> str:
        """Generate location code from name"""
        if not self.name:
            return None
        
        # Convert name to code
        code = re.sub(r'[^\w\s-]', '', self.name)
        code = re.sub(r'[-\s]+', '_', code)
        code = code.upper().strip('_')
        
        # If mostly Chinese characters, use first few characters
        chinese_chars = sum(1 for c in self.name if '\u4e00' <= c <= '\u9fff')
        if chinese_chars > len(self.name) / 2:
            code = ''.join([c for c in self.name if '\u4e00' <= c <= '\u9fff'])[:5]
            if not code:
                code = 'LOC'
        
        # Ensure minimum length
        if len(code) < 1:
            code = 'LOC'
        
        # Ensure maximum length
        if len(code) > 50:
            code = code[:50]
        
        return code
    
    @hybrid_property
    def business_unit_count(self) -> int:
        """Get number of business units at this location"""
        return self.business_units.filter_by(is_active=True).count()
    
    @hybrid_property
    def full_address(self) -> str:
        """Get formatted full address"""
        if not self.address:
            return ""
        
        parts = []
        for field in ['street', 'district', 'city', 'state', 'postal_code']:
            value = self.address.get(field)
            if value:
                parts.append(str(value))
        
        # Add country if specified
        country = self.address.get('country', 'Taiwan')
        if country and country != 'Taiwan':
            parts.append(country)
        
        return ', '.join(parts)
    
    @hybrid_property
    def full_hierarchy_path(self) -> str:
        """Get full hierarchy path from group to location"""
        path_parts = []
        if self.company:
            if self.company.group:
                path_parts.append(self.company.group.name)
            path_parts.append(self.company.name)
        path_parts.append(self.name)
        return " > ".join(path_parts)
    
    @hybrid_property
    def primary_contact_name(self) -> Optional[str]:
        """Get primary contact name"""
        if self.delivery_contact:
            return self.delivery_contact.get('name')
        return None
    
    @hybrid_property
    def primary_contact_phone(self) -> Optional[str]:
        """Get primary contact phone"""
        return self.delivery_phone or (
            self.delivery_contact.get('phone') if self.delivery_contact else None
        )
    
    def get_distance_to(self, other_coords: Dict[str, float]) -> Optional[float]:
        """Calculate distance to another location in kilometers"""
        if not self.coordinates or not other_coords:
            return None
        
        try:
            from geopy.distance import geodesic
            
            point1 = (self.coordinates['lat'], self.coordinates['lng'])
            point2 = (other_coords['lat'], other_coords['lng'])
            
            return geodesic(point1, point2).kilometers
        except ImportError:
            logger.warning("geopy not installed, cannot calculate distance")
            return None
        except Exception as e:
            logger.error("Error calculating distance", error=str(e))
            return None
    
    def is_within_operating_hours(self, check_time: Optional[str] = None) -> bool:
        """Check if location is currently within operating hours"""
        if not self.operating_hours:
            return True  # Assume always open if no hours specified
        
        from datetime import datetime, time
        import pytz
        
        try:
            # Get current time in location's timezone
            tz = pytz.timezone(self.timezone or 'Asia/Taipei')
            now = datetime.now(tz)
            current_day = now.strftime('%A').lower()
            current_time = now.time()
            
            if check_time:
                # Parse provided time
                hour, minute = map(int, check_time.split(':'))
                current_time = time(hour, minute)
            
            # Get today's schedule
            today_schedule = self.operating_hours.get(current_day)
            if not today_schedule:
                return False  # Closed today
            
            # Parse opening and closing times
            open_time = time(*map(int, today_schedule['open'].split(':')))
            close_time = time(*map(int, today_schedule['close'].split(':')))
            
            # Handle overnight hours (close time is next day)
            if close_time < open_time:
                return current_time >= open_time or current_time <= close_time
            else:
                return open_time <= current_time <= close_time
                
        except Exception as e:
            logger.error("Error checking operating hours", error=str(e))
            return True  # Default to open on error
    
    def get_hierarchy_summary(self) -> Dict[str, Any]:
        """Get summary of hierarchy under this location"""
        units = list(self.business_units.filter_by(is_active=True))
        
        summary = {
            'location_id': self.id,
            'location_name': self.name,
            'location_code': self.code,
            'address': self.address,
            'full_address': self.full_address,
            'company_id': self.company_id,
            'company_name': self.company.name if self.company else None,
            'business_units_count': len(units),
            'business_units': [
                {
                    'unit_id': unit.id,
                    'unit_name': unit.name,
                    'unit_code': unit.code,
                    'unit_type': unit.type,
                    'budget_monthly': float(unit.budget_monthly) if unit.budget_monthly else None
                }
                for unit in units
            ]
        }
        
        return summary
    
    def validate_business_rules(self) -> List[str]:
        """Validate business rules for this location"""
        errors = []
        
        # Check if location has at least one business unit
        if self.business_unit_count == 0:
            errors.append("Location must have at least one business unit")
        
        # Validate address completeness
        required_fields = ['street', 'city']
        if not all(self.address.get(field) for field in required_fields):
            errors.append("Address must include street and city")
        
        # Check for duplicate business unit codes within location
        unit_codes = [u.code for u in self.business_units.filter_by(is_active=True)]
        if len(unit_codes) != len(set(unit_codes)):
            errors.append("Business unit codes within location must be unique")
        
        return errors
    
    def can_delete(self) -> Tuple[bool, List[str]]:
        """Check if location can be deleted"""
        reasons = []
        
        # Check if has active business units
        active_units = self.business_units.filter_by(is_active=True).count()
        if active_units > 0:
            reasons.append(f"Location has {active_units} active business units")
        
        return len(reasons) == 0, reasons
    
    def soft_delete_cascade(self, deleted_by: str) -> int:
        """Soft delete location and all business units"""
        unit_count = 0
        
        # Soft delete all business units
        for unit in self.business_units.filter_by(is_active=True):
            unit.soft_delete(deleted_by)
            unit_count += 1
        
        # Soft delete the location itself
        self.soft_delete(deleted_by)
        
        logger.info(
            "Location soft deleted with cascade",
            location_id=self.id,
            location_name=self.name,
            business_units_deleted=unit_count,
            deleted_by=deleted_by
        )
        
        return unit_count
    
    def __str__(self):
        return f"CustomerLocation: {self.name} ({self.code or 'No Code'})"