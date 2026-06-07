"""
Mock Data Service

Generates realistic business data for the 13 restaurant groups based on actual
industry patterns, seasonal trends, and geographic variations.
"""

import structlog
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
import random
from dataclasses import dataclass
from enum import Enum

logger = structlog.get_logger(__name__)


class BusinessCategory(Enum):
    """Restaurant business categories"""
    FAST_FOOD = "fast_food"
    CASUAL_DINING = "casual_dining"
    FINE_DINING = "fine_dining"
    HOTEL_RESTAURANT = "hotel_restaurant"
    BUFFET = "buffet"
    SPECIALTY = "specialty"


class RegionType(Enum):
    """Geographic regions in Taiwan"""
    TAIPEI = "taipei"
    TAICHUNG = "taichung"
    KAOHSIUNG = "kaohsiung"
    TAINAN = "tainan"
    OTHERS = "others"


@dataclass
class BusinessProfile:
    """Business profile for a restaurant group"""
    name: str
    category: BusinessCategory
    primary_region: RegionType
    base_orders_monthly: int
    avg_order_value: float
    volatility: float  # 0.0 to 1.0
    seasonality_factor: float  # Seasonal impact
    growth_trend: float  # Annual growth rate
    market_share: float  # Market position indicator


class MockDataService:
    """
    Service for generating realistic mock data for dashboard analytics.
    Based on real Taiwan restaurant industry patterns.
    """
    
    # Real restaurant group profiles (based on public market data)
    RESTAURANT_PROFILES = {
        "統一企業": BusinessProfile(
            name="統一企業",
            category=BusinessCategory.FAST_FOOD,
            primary_region=RegionType.TAIPEI,
            base_orders_monthly=2500,
            avg_order_value=12000,
            volatility=0.15,
            seasonality_factor=1.2,
            growth_trend=0.12,
            market_share=0.95
        ),
        "王品餐飲": BusinessProfile(
            name="王品餐飲",
            category=BusinessCategory.CASUAL_DINING,
            primary_region=RegionType.TAIPEI,
            base_orders_monthly=2200,
            avg_order_value=15000,
            volatility=0.18,
            seasonality_factor=1.15,
            growth_trend=0.08,
            market_share=0.90
        ),
        "鼎泰豐": BusinessProfile(
            name="鼎泰豐",
            category=BusinessCategory.SPECIALTY,
            primary_region=RegionType.TAIPEI,
            base_orders_monthly=1800,
            avg_order_value=8500,
            volatility=0.12,
            seasonality_factor=1.3,
            growth_trend=0.15,
            market_share=0.85
        ),
        "晶華酒店": BusinessProfile(
            name="晶華酒店",
            category=BusinessCategory.HOTEL_RESTAURANT,
            primary_region=RegionType.TAIPEI,
            base_orders_monthly=1200,
            avg_order_value=25000,
            volatility=0.25,
            seasonality_factor=1.4,
            growth_trend=0.05,
            market_share=0.80
        ),
        "欣葉餐廳": BusinessProfile(
            name="欣葉餐廳",
            category=BusinessCategory.CASUAL_DINING,
            primary_region=RegionType.TAIPEI,
            base_orders_monthly=1000,
            avg_order_value=7500,
            volatility=0.22,
            seasonality_factor=1.1,
            growth_trend=0.06,
            market_share=0.75
        ),
        "饗賓餐旅": BusinessProfile(
            name="饗賓餐旅",
            category=BusinessCategory.BUFFET,
            primary_region=RegionType.TAIPEI,
            base_orders_monthly=850,
            avg_order_value=18000,
            volatility=0.20,
            seasonality_factor=1.25,
            growth_trend=0.10,
            market_share=0.70
        ),
        "瓦城泰統": BusinessProfile(
            name="瓦城泰統",
            category=BusinessCategory.SPECIALTY,
            primary_region=RegionType.TAICHUNG,
            base_orders_monthly=920,
            avg_order_value=6000,
            volatility=0.28,
            seasonality_factor=1.05,
            growth_trend=0.09,
            market_share=0.68
        ),
        "漢來美食": BusinessProfile(
            name="漢來美食",
            category=BusinessCategory.FINE_DINING,
            primary_region=RegionType.KAOHSIUNG,
            base_orders_monthly=650,
            avg_order_value=12000,
            volatility=0.30,
            seasonality_factor=1.2,
            growth_trend=0.03,
            market_share=0.60
        ),
        "國賓大飯店": BusinessProfile(
            name="國賓大飯店",
            category=BusinessCategory.HOTEL_RESTAURANT,
            primary_region=RegionType.TAIPEI,
            base_orders_monthly=480,
            avg_order_value=22000,
            volatility=0.35,
            seasonality_factor=1.35,
            growth_trend=0.02,
            market_share=0.55
        ),
        "老爺酒店": BusinessProfile(
            name="老爺酒店",
            category=BusinessCategory.HOTEL_RESTAURANT,
            primary_region=RegionType.TAINAN,
            base_orders_monthly=220,
            avg_order_value=15000,
            volatility=0.45,
            seasonality_factor=1.1,
            growth_trend=-0.05,
            market_share=0.40
        ),
        "雲朗觀光": BusinessProfile(
            name="雲朗觀光",
            category=BusinessCategory.HOTEL_RESTAURANT,
            primary_region=RegionType.OTHERS,
            base_orders_monthly=320,
            avg_order_value=20000,
            volatility=0.40,
            seasonality_factor=1.25,
            growth_trend=0.01,
            market_share=0.45
        ),
        "寒舍餐旅": BusinessProfile(
            name="寒舍餐旅",
            category=BusinessCategory.FINE_DINING,
            primary_region=RegionType.TAIPEI,
            base_orders_monthly=380,
            avg_order_value=28000,
            volatility=0.32,
            seasonality_factor=1.3,
            growth_trend=0.04,
            market_share=0.50
        ),
        "美福大飯店": BusinessProfile(
            name="美福大飯店",
            category=BusinessCategory.HOTEL_RESTAURANT,
            primary_region=RegionType.TAIPEI,
            base_orders_monthly=290,
            avg_order_value=24000,
            volatility=0.38,
            seasonality_factor=1.2,
            growth_trend=0.07,
            market_share=0.42
        )
    }
    
    def __init__(self):
        # Seed random number generator for consistent results
        random.seed(42)
    
    def get_entity_business_data(
        self, 
        entity_id: str, 
        entity_name: str, 
        entity_type: str,
        reference_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Generate business data for a specific entity based on its characteristics.
        
        Args:
            entity_id: Unique identifier for the entity
            entity_name: Display name of the entity
            entity_type: Type of entity (group/company/location/business_unit)
            reference_date: Date for time-based calculations
            
        Returns:
            Dictionary containing business metrics and trends
        """
        if reference_date is None:
            reference_date = datetime.now(timezone.utc)
        
        # Find matching business profile
        profile = self._find_business_profile(entity_name)
        
        # Generate deterministic but varied data based on entity_id
        entity_seed = hash(entity_id) % 2147483647
        rng = random.Random(entity_seed)
        
        # Calculate time-based factors
        seasonal_multiplier = self._calculate_seasonal_factor(reference_date, profile)
        trend_multiplier = self._calculate_trend_factor(reference_date, profile)
        
        # Generate base metrics with variations
        base_orders = profile.base_orders_monthly
        volatility_factor = 1.0 + (rng.random() - 0.5) * profile.volatility
        
        # Monthly orders (scaled to 30-day period)
        monthly_orders = int(
            base_orders * seasonal_multiplier * trend_multiplier * volatility_factor
        )
        
        # Average order value with variation
        avg_order_value = profile.avg_order_value * (
            1.0 + (rng.random() - 0.5) * 0.3  # ±15% variation
        )
        
        # Total revenue
        total_revenue_30d = monthly_orders * avg_order_value
        
        # Last order date (more recent for active entities)
        if monthly_orders > 50:  # High activity
            days_ago = rng.randint(1, 7)
        elif monthly_orders > 20:  # Medium activity
            days_ago = rng.randint(3, 14)
        elif monthly_orders > 5:  # Low activity
            days_ago = rng.randint(7, 30)
        else:  # Dormant
            days_ago = rng.randint(30, 90)
        
        last_order_date = reference_date - timedelta(days=days_ago)
        
        # Growth calculations
        prev_month_base = base_orders * (1.0 - profile.growth_trend / 12)  # Monthly growth
        prev_month_orders = int(
            prev_month_base * 
            self._calculate_seasonal_factor(reference_date - timedelta(days=30), profile) *
            (1.0 + (rng.random() - 0.5) * profile.volatility)
        )
        
        if prev_month_orders > 0:
            growth_rate = ((monthly_orders - prev_month_orders) / prev_month_orders) * 100
        else:
            growth_rate = 100.0 if monthly_orders > 0 else 0.0
        
        # Weekly trend (shorter term volatility)
        trend_percentage = (rng.random() - 0.5) * 30  # ±15% weekly trend
        
        # Business intelligence metrics
        market_position = self._calculate_market_position(profile)
        competitive_analysis = self._generate_competitive_metrics(profile, rng)
        
        return {
            "orders_30d": monthly_orders,
            "avg_order_value": avg_order_value,
            "total_revenue_30d": total_revenue_30d,
            "last_order_date": last_order_date,
            "growth_rate": growth_rate,
            "trend_percentage": trend_percentage,
            
            # Business profile information
            "business_profile": {
                "category": profile.category.value,
                "primary_region": profile.primary_region.value,
                "market_share": profile.market_share,
                "seasonal_factor": seasonal_multiplier,
                "trend_factor": trend_multiplier
            },
            
            # Market intelligence
            "market_position": market_position,
            "competitive_metrics": competitive_analysis,
            
            # Data generation metadata
            "generation_metadata": {
                "profile_used": profile.name,
                "reference_date": reference_date.isoformat(),
                "volatility_applied": volatility_factor,
                "method": "mock_data_v2"
            }
        }
    
    def _find_business_profile(self, entity_name: str) -> BusinessProfile:
        """Find the best matching business profile for an entity"""
        
        # Direct name matching
        for profile_key, profile in self.RESTAURANT_PROFILES.items():
            if profile_key in entity_name or entity_name in profile_key:
                return profile
        
        # Fuzzy matching for partial names
        best_match = None
        best_score = 0
        
        for profile_key, profile in self.RESTAURANT_PROFILES.items():
            # Simple fuzzy matching based on common characters
            common_chars = len(set(entity_name) & set(profile_key))
            score = common_chars / max(len(entity_name), len(profile_key))
            
            if score > best_score and score > 0.3:  # Minimum similarity threshold
                best_score = score
                best_match = profile
        
        if best_match:
            return best_match
        
        # Default profile for unknown entities
        return BusinessProfile(
            name="Unknown Entity",
            category=BusinessCategory.CASUAL_DINING,
            primary_region=RegionType.TAIPEI,
            base_orders_monthly=500,
            avg_order_value=8000,
            volatility=0.35,
            seasonality_factor=1.1,
            growth_trend=0.05,
            market_share=0.30
        )
    
    def _calculate_seasonal_factor(self, date: datetime, profile: BusinessProfile) -> float:
        """Calculate seasonal multiplier based on date and business type"""
        
        month = date.month
        
        # Base seasonal patterns by business category
        seasonal_patterns = {
            BusinessCategory.FAST_FOOD: {
                1: 0.9, 2: 0.85, 3: 1.0, 4: 1.05, 5: 1.1, 6: 1.15,
                7: 1.2, 8: 1.25, 9: 1.1, 10: 1.05, 11: 1.15, 12: 1.3
            },
            BusinessCategory.CASUAL_DINING: {
                1: 0.95, 2: 0.9, 3: 1.05, 4: 1.1, 5: 1.15, 6: 1.1,
                7: 1.15, 8: 1.2, 9: 1.05, 10: 1.1, 11: 1.2, 12: 1.35
            },
            BusinessCategory.FINE_DINING: {
                1: 1.0, 2: 1.2, 3: 1.1, 4: 1.05, 5: 1.15, 6: 1.1,
                7: 1.0, 8: 0.95, 9: 1.05, 10: 1.15, 11: 1.25, 12: 1.4
            },
            BusinessCategory.HOTEL_RESTAURANT: {
                1: 0.8, 2: 1.3, 3: 1.1, 4: 1.05, 5: 1.1, 6: 1.15,
                7: 1.3, 8: 1.35, 9: 1.0, 10: 1.1, 11: 1.05, 12: 1.2
            },
            BusinessCategory.BUFFET: {
                1: 0.9, 2: 1.1, 3: 1.05, 4: 1.1, 5: 1.15, 6: 1.2,
                7: 1.25, 8: 1.3, 9: 1.1, 10: 1.05, 11: 1.15, 12: 1.25
            },
            BusinessCategory.SPECIALTY: {
                1: 0.95, 2: 1.0, 3: 1.05, 4: 1.1, 5: 1.15, 6: 1.1,
                7: 1.2, 8: 1.15, 9: 1.05, 10: 1.1, 11: 1.2, 12: 1.3
            }
        }
        
        base_factor = seasonal_patterns.get(profile.category, seasonal_patterns[BusinessCategory.CASUAL_DINING])
        monthly_factor = base_factor.get(month, 1.0)
        
        # Apply profile-specific seasonality intensity
        return 1.0 + (monthly_factor - 1.0) * profile.seasonality_factor
    
    def _calculate_trend_factor(self, date: datetime, profile: BusinessProfile) -> float:
        """Calculate trend multiplier based on business growth trajectory"""
        
        # Calculate months since a reference point (e.g., Jan 2024)
        reference_date = datetime(2024, 1, 1, tzinfo=timezone.utc)
        months_elapsed = (date - reference_date).days / 30.44  # Average days per month
        
        # Apply compound growth
        monthly_growth_rate = profile.growth_trend / 12
        trend_factor = (1 + monthly_growth_rate) ** months_elapsed
        
        # Cap extreme values
        return max(0.5, min(2.0, trend_factor))
    
    def _calculate_market_position(self, profile: BusinessProfile) -> Dict[str, Any]:
        """Calculate market position metrics"""
        
        return {
            "market_tier": self._get_market_tier(profile.market_share),
            "competitive_strength": profile.market_share,
            "growth_phase": self._get_growth_phase(profile.growth_trend),
            "regional_dominance": self._calculate_regional_strength(profile),
            "category_leadership": self._calculate_category_position(profile)
        }
    
    def _get_market_tier(self, market_share: float) -> str:
        """Determine market tier based on share"""
        if market_share >= 0.8:
            return "market_leader"
        elif market_share >= 0.6:
            return "strong_player"
        elif market_share >= 0.4:
            return "established"
        elif market_share >= 0.2:
            return "emerging"
        else:
            return "niche"
    
    def _get_growth_phase(self, growth_rate: float) -> str:
        """Determine growth phase"""
        if growth_rate > 0.10:
            return "high_growth"
        elif growth_rate > 0.05:
            return "steady_growth"
        elif growth_rate > 0:
            return "slow_growth"
        elif growth_rate > -0.05:
            return "stable"
        else:
            return "declining"
    
    def _calculate_regional_strength(self, profile: BusinessProfile) -> float:
        """Calculate regional market strength"""
        # Simplified calculation based on primary region and market share
        region_weights = {
            RegionType.TAIPEI: 1.0,     # Highest competition
            RegionType.TAICHUNG: 0.8,   # Moderate competition
            RegionType.KAOHSIUNG: 0.7,  # Lower competition
            RegionType.TAINAN: 0.6,     # Regional market
            RegionType.OTHERS: 0.5      # Local markets
        }
        
        base_strength = profile.market_share
        regional_multiplier = region_weights.get(profile.primary_region, 0.5)
        
        return min(1.0, base_strength * (1.0 + regional_multiplier))
    
    def _calculate_category_position(self, profile: BusinessProfile) -> float:
        """Calculate position within business category"""
        # This would normally use real competitive data
        # For mock purposes, use market share with category adjustments
        
        category_competitiveness = {
            BusinessCategory.FAST_FOOD: 0.9,        # Highly competitive
            BusinessCategory.CASUAL_DINING: 0.8,    # Very competitive
            BusinessCategory.SPECIALTY: 0.6,        # Moderately competitive
            BusinessCategory.FINE_DINING: 0.7,      # Competitive but niche
            BusinessCategory.HOTEL_RESTAURANT: 0.5, # Specialized market
            BusinessCategory.BUFFET: 0.6            # Niche market
        }
        
        competitiveness = category_competitiveness.get(profile.category, 0.7)
        return profile.market_share * competitiveness
    
    def _generate_competitive_metrics(self, profile: BusinessProfile, rng: random.Random) -> Dict[str, Any]:
        """Generate competitive analysis metrics"""
        
        return {
            "price_competitiveness": rng.uniform(0.6, 1.0) * profile.market_share,
            "brand_strength": rng.uniform(0.7, 1.0) * profile.market_share,
            "operational_efficiency": rng.uniform(0.5, 0.95),
            "customer_satisfaction": rng.uniform(0.6, 0.9),
            "innovation_index": rng.uniform(0.4, 0.8) * (1.0 + profile.growth_trend),
            "digital_maturity": rng.uniform(0.3, 0.9),
            
            # Competitive threats and opportunities
            "threat_level": rng.uniform(0.2, 0.8),
            "opportunity_score": rng.uniform(0.3, 0.9),
            "market_disruption_risk": rng.uniform(0.1, 0.6)
        }