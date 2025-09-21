"""
Activity Scoring Service

Implements the activity scoring algorithm with weighted calculations:
- Order Frequency (40% weight): Orders in last 30 days
- Order Recency (35% weight): Days since last order  
- Order Value (25% weight): Average order value vs. baseline

Provides business intelligence and analytics for customer hierarchy dashboard.
"""

import structlog
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.orm import selectinload

from app.models import (
    CustomerGroup, CustomerCompany, CustomerLocation, BusinessUnit,
    ActivityMetrics, DashboardSummary, PerformanceRanking as PerformanceRankingModel, ActivityTrend
)
from app.schemas.activity import (
    ActivityLevel, EntityType, ActivityMetricsResponse, 
    DashboardSummaryResponse, EntityActivitySummary,
    ActivityAnalyticsResponse
)

logger = structlog.get_logger(__name__)


class ActivityScoringService:
    """
    Core service for calculating activity scores and managing dashboard metrics.
    """
    
    # Scoring weights
    FREQUENCY_WEIGHT = 0.40  # 40% - Order frequency importance
    RECENCY_WEIGHT = 0.35    # 35% - Order recency importance  
    VALUE_WEIGHT = 0.25      # 25% - Order value importance
    
    # Activity level thresholds
    ACTIVITY_THRESHOLDS = {
        "active": 70,    # Score >= 70
        "medium": 50,    # Score >= 50 and < 70
        "low": 25,       # Score >= 25 and < 50
        "dormant": 0     # Score < 25
    }
    
    # Business constants
    MAX_ORDERS_30D = 100     # Maximum expected orders for normalization
    MAX_DAYS_RECENCY = 90    # Maximum days to consider for recency scoring
    BASELINE_ORDER_VALUE = 5000.0  # Baseline average order value (NT$)
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def calculate_entity_activity_score(
        self, 
        entity_id: str, 
        entity_type: EntityType,
        orders_30d: int = 0,
        last_order_date: Optional[datetime] = None,
        avg_order_value: float = 0.0,
        total_revenue_30d: float = 0.0
    ) -> Tuple[int, ActivityLevel, Dict[str, float]]:
        """
        Calculate activity score for a single entity using weighted algorithm.
        
        Returns:
            Tuple of (activity_score, activity_level, component_scores)
        """
        
        # Component 1: Order Frequency Score (40% weight)
        frequency_score = min(orders_30d / self.MAX_ORDERS_30D * 100, 100)
        
        # Component 2: Order Recency Score (35% weight)
        if last_order_date:
            days_since_last = (datetime.now(timezone.utc) - last_order_date).days
            recency_score = max(0, (self.MAX_DAYS_RECENCY - days_since_last) / self.MAX_DAYS_RECENCY * 100)
        else:
            recency_score = 0.0
        
        # Component 3: Order Value Score (25% weight)
        if avg_order_value > 0:
            value_ratio = min(avg_order_value / self.BASELINE_ORDER_VALUE, 2.0)  # Cap at 2x baseline
            value_score = value_ratio * 50  # Scale to 0-100
        else:
            value_score = 0.0
        
        # Calculate weighted final score
        activity_score = int(
            (frequency_score * self.FREQUENCY_WEIGHT) +
            (recency_score * self.RECENCY_WEIGHT) +
            (value_score * self.VALUE_WEIGHT)
        )
        
        # Determine activity level
        activity_level = self._determine_activity_level(activity_score)
        
        # Component scores for transparency
        component_scores = {
            "frequency_score": frequency_score,
            "recency_score": recency_score,
            "value_score": value_score
        }
        
        logger.info(
            "Calculated activity score",
            entity_id=entity_id,
            entity_type=entity_type,
            activity_score=activity_score,
            activity_level=activity_level,
            components=component_scores
        )
        
        return activity_score, activity_level, component_scores
    
    def _determine_activity_level(self, score: int) -> ActivityLevel:
        """Determine activity level based on score thresholds"""
        if score >= self.ACTIVITY_THRESHOLDS["active"]:
            return ActivityLevel.ACTIVE
        elif score >= self.ACTIVITY_THRESHOLDS["medium"]:
            return ActivityLevel.MEDIUM
        elif score >= self.ACTIVITY_THRESHOLDS["low"]:
            return ActivityLevel.LOW
        else:
            return ActivityLevel.DORMANT
    
    async def calculate_all_entity_scores(self) -> List[ActivityMetrics]:
        """
        Calculate activity scores for all entities in the hierarchy.
        This would normally pull from order data, but we'll use mock data for now.
        """
        all_metrics = []
        
        # Process all entity types
        for entity_type in [EntityType.GROUP, EntityType.COMPANY, EntityType.LOCATION, EntityType.BUSINESS_UNIT]:
            entity_metrics = await self._calculate_entity_type_scores(entity_type)
            all_metrics.extend(entity_metrics)
        
        return all_metrics
    
    async def _calculate_entity_type_scores(self, entity_type: EntityType) -> List[ActivityMetrics]:
        """Calculate scores for all entities of a specific type"""
        metrics_list = []
        
        try:
            if entity_type == EntityType.GROUP:
                stmt = select(CustomerGroup).where(CustomerGroup.is_active == True)
                result = await self.session.execute(stmt)
                entities = result.scalars().all()
                
                for entity in entities:
                    mock_data = self._generate_mock_order_data(entity.id, entity.name, entity_type)
                    metrics = await self._create_activity_metrics(entity.id, entity_type, mock_data)
                    metrics_list.append(metrics)
                    
            elif entity_type == EntityType.COMPANY:
                stmt = select(CustomerCompany).where(CustomerCompany.is_active == True)
                result = await self.session.execute(stmt)
                entities = result.scalars().all()
                
                for entity in entities:
                    mock_data = self._generate_mock_order_data(entity.id, entity.name, entity_type)
                    metrics = await self._create_activity_metrics(entity.id, entity_type, mock_data)
                    metrics_list.append(metrics)
            
            # Similar for locations and business units...
            # For now, focus on groups and companies as they have the most impact
            
        except Exception as e:
            logger.error("Failed to calculate entity scores", entity_type=entity_type, error=str(e))
        
        return metrics_list
    
    def _generate_mock_order_data(self, entity_id: str, entity_name: str, entity_type: EntityType) -> Dict[str, Any]:
        """
        Generate realistic mock order data based on entity characteristics.
        In production, this would query actual order data.
        """
        
        # Business patterns based on restaurant group names and types
        business_patterns = {
            # High activity patterns (major chains)
            "統一企業": {"base_orders": 85, "avg_value": 12000, "volatility": 0.1},
            "王品餐飲": {"base_orders": 78, "avg_value": 15000, "volatility": 0.15},
            "鼎泰豐": {"base_orders": 65, "avg_value": 8500, "volatility": 0.2},
            "晶華酒店": {"base_orders": 55, "avg_value": 25000, "volatility": 0.12},
            
            # Medium activity patterns
            "欣葉餐廳": {"base_orders": 45, "avg_value": 7500, "volatility": 0.25},
            "饗賓餐旅": {"base_orders": 38, "avg_value": 18000, "volatility": 0.2},
            "瓦城泰統": {"base_orders": 42, "avg_value": 6000, "volatility": 0.3},
            
            # Lower activity patterns
            "漢來美食": {"base_orders": 28, "avg_value": 12000, "volatility": 0.35},
            "國賓大飯店": {"base_orders": 22, "avg_value": 22000, "volatility": 0.25},
            
            # Dormant patterns
            "老爺酒店": {"base_orders": 8, "avg_value": 15000, "volatility": 0.5},
        }
        
        # Default pattern for unknown entities
        default_pattern = {"base_orders": 30, "avg_value": 8000, "volatility": 0.3}
        
        # Find matching pattern
        pattern = default_pattern
        for name_key, business_pattern in business_patterns.items():
            if name_key in entity_name:
                pattern = business_pattern
                break
        
        # Generate realistic data with some randomness
        import random
        random.seed(hash(entity_id) % 2147483647)  # Deterministic but varied
        
        base_orders = pattern["base_orders"]
        avg_value = pattern["avg_value"]
        volatility = pattern["volatility"]
        
        # Add seasonal and random variations
        seasonal_factor = 1.0 + (random.random() - 0.5) * 0.3  # ±15% seasonal variation
        random_factor = 1.0 + (random.random() - 0.5) * volatility
        
        orders_30d = max(0, int(base_orders * seasonal_factor * random_factor))
        avg_order_value = max(0, avg_value * (1.0 + (random.random() - 0.5) * 0.4))
        total_revenue_30d = orders_30d * avg_order_value
        
        # Generate last order date
        if orders_30d > 0:
            days_ago = random.randint(1, min(15, max(1, 30 - orders_30d // 3)))
            last_order_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
        else:
            # Dormant entities - longer time since last order
            days_ago = random.randint(45, 120)
            last_order_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
        
        # Calculate growth trends
        prev_month_orders = max(0, int(orders_30d * (0.8 + random.random() * 0.4)))
        if prev_month_orders > 0:
            growth_rate = ((orders_30d - prev_month_orders) / prev_month_orders) * 100
        else:
            growth_rate = 100.0 if orders_30d > 0 else 0.0
        
        # Week-over-week trend
        trend_percentage = (random.random() - 0.5) * 40  # ±20% weekly trend
        
        return {
            "orders_30d": orders_30d,
            "avg_order_value": avg_order_value,
            "total_revenue_30d": total_revenue_30d,
            "last_order_date": last_order_date,
            "growth_rate": growth_rate,
            "trend_percentage": trend_percentage,
            "pattern_used": pattern
        }
    
    async def _create_activity_metrics(
        self, 
        entity_id: str, 
        entity_type: EntityType, 
        order_data: Dict[str, Any]
    ) -> ActivityMetrics:
        """Create ActivityMetrics object from calculated data"""
        
        # Calculate activity score
        activity_score, activity_level, component_scores = await self.calculate_entity_activity_score(
            entity_id=entity_id,
            entity_type=entity_type,
            orders_30d=order_data["orders_30d"],
            last_order_date=order_data["last_order_date"],
            avg_order_value=order_data["avg_order_value"],
            total_revenue_30d=order_data["total_revenue_30d"]
        )
        
        # Create metrics object
        metrics = ActivityMetrics(
            entity_id=entity_id,
            entity_type=entity_type.value,
            activity_score=activity_score,
            activity_level=activity_level.value,
            last_order_date=order_data["last_order_date"],
            total_orders_30d=order_data["orders_30d"],
            total_revenue_30d=order_data["total_revenue_30d"],
            avg_order_value_30d=order_data["avg_order_value"],
            trend_percentage=order_data["trend_percentage"],
            growth_rate=order_data["growth_rate"],
            frequency_score=component_scores["frequency_score"],
            recency_score=component_scores["recency_score"],
            value_score=component_scores["value_score"],
            additional_metadata={
                "pattern_used": order_data["pattern_used"],
                "calculation_method": "mock_data_v1"
            }
        )
        
        return metrics
    
    async def generate_dashboard_summary(self, activity_metrics: List[ActivityMetrics]) -> DashboardSummary:
        """Generate dashboard summary from activity metrics"""
        
        if not activity_metrics:
            return DashboardSummary()
        
        # Count entities by type
        type_counts = {}
        for entity_type in [EntityType.GROUP, EntityType.COMPANY, EntityType.LOCATION, EntityType.BUSINESS_UNIT]:
            type_counts[entity_type.value] = len([m for m in activity_metrics if m.entity_type == entity_type.value])
        
        # Count entities by activity level
        activity_counts = {}
        for level in [ActivityLevel.ACTIVE, ActivityLevel.MEDIUM, ActivityLevel.LOW, ActivityLevel.DORMANT]:
            activity_counts[level.value] = len([m for m in activity_metrics if m.activity_level == level.value])
        
        total_entities = len(activity_metrics)
        
        # Financial aggregations
        total_revenue = sum(m.total_revenue_30d for m in activity_metrics)
        total_orders = sum(m.total_orders_30d for m in activity_metrics)
        avg_revenue_per_entity = total_revenue / total_entities if total_entities > 0 else 0
        avg_orders_per_entity = total_orders / total_entities if total_entities > 0 else 0
        
        # Performance metrics
        scores = [m.activity_score for m in activity_metrics]
        avg_activity_score = sum(scores) / len(scores) if scores else 0
        top_performer_score = max(scores) if scores else 0
        
        # Growth metrics
        growth_rates = [m.growth_rate for m in activity_metrics if m.growth_rate is not None]
        avg_growth_rate = sum(growth_rates) / len(growth_rates) if growth_rates else 0
        
        # Active entities percentage
        active_count = activity_counts.get("active", 0)
        active_percentage = (active_count / total_entities * 100) if total_entities > 0 else 0
        
        summary = DashboardSummary(
            total_groups=type_counts.get("group", 0),
            total_companies=type_counts.get("company", 0),
            total_locations=type_counts.get("location", 0),
            total_business_units=type_counts.get("business_unit", 0),
            active_entities_count=activity_counts.get("active", 0),
            active_entities_percentage=active_percentage,
            medium_entities_count=activity_counts.get("medium", 0),
            low_entities_count=activity_counts.get("low", 0),
            dormant_entities_count=activity_counts.get("dormant", 0),
            total_revenue_30d=total_revenue,
            avg_revenue_per_entity=avg_revenue_per_entity,
            total_orders_30d=total_orders,
            avg_orders_per_entity=avg_orders_per_entity,
            avg_activity_score=avg_activity_score,
            top_performer_score=top_performer_score,
            growth_rate_overall=avg_growth_rate
        )
        
        return summary
    
    async def get_top_performers(
        self, 
        activity_metrics: List[ActivityMetrics], 
        limit: int = 10
    ) -> List[EntityActivitySummary]:
        """Get top performing entities by activity score"""
        
        # Sort by activity score (descending)
        sorted_metrics = sorted(activity_metrics, key=lambda m: m.activity_score, reverse=True)
        top_metrics = sorted_metrics[:limit]
        
        # Convert to summary format
        summaries = []
        for rank, metrics in enumerate(top_metrics, 1):
            # Get entity name
            entity_name = await self._get_entity_name(metrics.entity_id, metrics.entity_type)
            
            summary = EntityActivitySummary(
                entity_id=metrics.entity_id,
                entity_name=entity_name,
                entity_type=EntityType(metrics.entity_type),
                activity_score=metrics.activity_score,
                activity_level=ActivityLevel(metrics.activity_level),
                total_revenue_30d=metrics.total_revenue_30d,
                total_orders_30d=metrics.total_orders_30d,
                trend_percentage=metrics.trend_percentage,
                rank=rank,
                percentile=((len(activity_metrics) - rank + 1) / len(activity_metrics)) * 100
            )
            summaries.append(summary)
        
        return summaries
    
    async def _get_entity_name(self, entity_id: str, entity_type: str) -> str:
        """Get entity display name from database"""
        try:
            if entity_type == "group":
                stmt = select(CustomerGroup.name).where(CustomerGroup.id == entity_id)
            elif entity_type == "company":
                stmt = select(CustomerCompany.name).where(CustomerCompany.id == entity_id)
            elif entity_type == "location":
                stmt = select(CustomerLocation.name).where(CustomerLocation.id == entity_id)
            elif entity_type == "business_unit":
                stmt = select(BusinessUnit.name).where(BusinessUnit.id == entity_id)
            else:
                return f"Unknown-{entity_id[:8]}"
            
            result = await self.session.execute(stmt)
            name = result.scalar_one_or_none()
            return name or f"Entity-{entity_id[:8]}"
            
        except Exception as e:
            logger.error("Failed to get entity name", entity_id=entity_id, entity_type=entity_type, error=str(e))
            return f"Entity-{entity_id[:8]}"
    
    async def _convert_to_summary(self, metrics: ActivityMetrics) -> EntityActivitySummary:
        """Convert ActivityMetrics to EntityActivitySummary"""
        entity_name = await self._get_entity_name(metrics.entity_id, metrics.entity_type)
        
        return EntityActivitySummary(
            entity_id=metrics.entity_id,
            entity_name=entity_name,
            entity_type=EntityType(metrics.entity_type),
            activity_score=metrics.activity_score,
            activity_level=ActivityLevel(metrics.activity_level),
            total_revenue_30d=metrics.total_revenue_30d,
            total_orders_30d=metrics.total_orders_30d,
            trend_percentage=metrics.trend_percentage
        )
    
    async def calculate_advanced_analytics(
        self, 
        activity_metrics: List[ActivityMetrics], 
        entity_type_filter: Optional[str] = None
    ) -> ActivityAnalyticsResponse:
        """Calculate advanced analytics for the given metrics"""
        
        if not activity_metrics:
            raise ValueError("No activity metrics provided for analytics calculation")
        
        # Determine entity type for response
        if entity_type_filter:
            response_entity_type = EntityType(entity_type_filter)
        else:
            # Use the most common entity type in the data
            type_counts = {}
            for m in activity_metrics:
                type_counts[m.entity_type] = type_counts.get(m.entity_type, 0) + 1
            most_common_type = max(type_counts.items(), key=lambda x: x[1])[0]
            response_entity_type = EntityType(most_common_type)
        
        total_entities = len(activity_metrics)
        
        # Activity distribution
        activity_distribution = {}
        for level in ActivityLevel:
            count = len([m for m in activity_metrics if m.activity_level == level.value])
            activity_distribution[level] = count
        
        # Score distribution (in ranges)
        score_ranges = {
            "0-25": len([m for m in activity_metrics if 0 <= m.activity_score < 25]),
            "25-50": len([m for m in activity_metrics if 25 <= m.activity_score < 50]),
            "50-75": len([m for m in activity_metrics if 50 <= m.activity_score < 75]),
            "75-100": len([m for m in activity_metrics if 75 <= m.activity_score <= 100])
        }
        
        # Performance insights
        scores = [m.activity_score for m in activity_metrics]
        avg_score = sum(scores) / len(scores)
        scores_sorted = sorted(scores)
        median_score = scores_sorted[len(scores_sorted) // 2]
        
        # Standard deviation calculation
        variance = sum((x - avg_score) ** 2 for x in scores) / len(scores)
        score_std_dev = variance ** 0.5
        
        # Revenue concentration (Pareto analysis)
        revenues = [m.total_revenue_30d for m in activity_metrics]
        total_revenue = sum(revenues)
        revenues_sorted = sorted(revenues, reverse=True)
        
        # Top 20% entities' revenue share
        top_20_pct_count = max(1, total_entities // 5)
        top_20_pct_revenue = sum(revenues_sorted[:top_20_pct_count])
        revenue_concentration_80_20 = (top_20_pct_revenue / total_revenue * 100) if total_revenue > 0 else 0
        
        revenue_concentration = {
            "pareto_ratio_80_20": revenue_concentration_80_20,
            "top_10_percent_share": (sum(revenues_sorted[:max(1, total_entities // 10)]) / total_revenue * 100) if total_revenue > 0 else 0,
            "bottom_50_percent_share": (sum(revenues_sorted[total_entities // 2:]) / total_revenue * 100) if total_revenue > 0 else 0
        }
        
        # Order patterns
        order_counts = [m.total_orders_30d for m in activity_metrics]
        avg_orders = sum(order_counts) / len(order_counts)
        
        order_patterns = {
            "average_orders_per_entity": avg_orders,
            "high_volume_entities": len([c for c in order_counts if c > avg_orders * 1.5]),
            "low_volume_entities": len([c for c in order_counts if c < avg_orders * 0.5]),
            "order_frequency_variance": sum((x - avg_orders) ** 2 for x in order_counts) / len(order_counts)
        }
        
        # Seasonal trends (simplified mock)
        seasonal_trends = {
            "seasonal_peak_factor": 1.25,
            "seasonal_low_factor": 0.75,
            "seasonal_volatility": 0.2,
            "current_seasonal_position": "mid_season"
        }
        
        # Geographic performance (mock data)
        geographic_performance = {
            "taipei": {"avg_score": avg_score * 1.1, "entity_count": int(total_entities * 0.4)},
            "taichung": {"avg_score": avg_score * 0.95, "entity_count": int(total_entities * 0.25)},
            "kaohsiung": {"avg_score": avg_score * 0.9, "entity_count": int(total_entities * 0.2)},
            "others": {"avg_score": avg_score * 0.85, "entity_count": int(total_entities * 0.15)}
        }
        
        # Trend analysis
        growth_rates = [m.growth_rate for m in activity_metrics if m.growth_rate is not None]
        avg_growth = sum(growth_rates) / len(growth_rates) if growth_rates else 0
        
        trend_analysis = {
            "overall_growth_trend": avg_growth,
            "growth_acceleration": avg_growth * 1.1,  # Simplified forecast
            "entities_in_growth": len([g for g in growth_rates if g > 0]),
            "entities_in_decline": len([g for g in growth_rates if g < 0])
        }
        
        # Forecasted growth (simplified)
        forecasted_growth = {
            "next_month_forecast": avg_growth * 1.05,
            "next_quarter_forecast": avg_growth * 1.15,
            "confidence_level": 75.0
        }
        
        return ActivityAnalyticsResponse(
            entity_type=response_entity_type,
            total_entities=total_entities,
            activity_distribution=activity_distribution,
            score_distribution=score_ranges,
            avg_score=avg_score,
            median_score=median_score,
            score_std_dev=score_std_dev,
            revenue_concentration=revenue_concentration,
            order_patterns=order_patterns,
            seasonal_trends=seasonal_trends,
            geographic_performance=geographic_performance,
            trend_analysis=trend_analysis,
            forecasted_growth=forecasted_growth,
            analysis_date=datetime.now(timezone.utc)
        )
    
    async def calculate_performance_rankings(
        self,
        activity_metrics: List[ActivityMetrics],
        peer_group_type: Optional[str] = None,
        include_percentiles: bool = True
    ) -> List[PerformanceRankingModel]:
        """Calculate performance rankings for entities"""
        
        if not activity_metrics:
            return []
        
        # Sort by activity score for overall ranking
        sorted_metrics = sorted(activity_metrics, key=lambda m: m.activity_score, reverse=True)
        
        rankings = []
        for rank, metrics in enumerate(sorted_metrics, 1):
            # Calculate percentiles
            overall_percentile = ((len(sorted_metrics) - rank + 1) / len(sorted_metrics)) * 100
            
            # Revenue ranking
            revenue_rank = rank  # Simplified - in reality would sort by revenue
            revenue_percentile = overall_percentile  # Simplified
            
            # Order volume ranking  
            order_rank = rank  # Simplified
            order_percentile = overall_percentile  # Simplified
            
            # Growth ranking
            growth_rank = rank  # Simplified
            growth_percentile = overall_percentile  # Simplified
            
            # Peer group analysis (simplified)
            peer_group_size = len(sorted_metrics)
            used_peer_group_type = peer_group_type or "overall"
            
            # Comparison metrics (simplified)
            avg_revenue = sum(m.total_revenue_30d for m in activity_metrics) / len(activity_metrics)
            avg_orders = sum(m.total_orders_30d for m in activity_metrics) / len(activity_metrics)
            
            vs_peer_avg_revenue = ((metrics.total_revenue_30d - avg_revenue) / avg_revenue * 100) if avg_revenue > 0 else 0
            vs_peer_avg_orders = ((metrics.total_orders_30d - avg_orders) / avg_orders * 100) if avg_orders > 0 else 0
            
            # Top performer comparison
            top_performer_revenue = sorted_metrics[0].total_revenue_30d
            vs_top_performer = ((metrics.total_revenue_30d - top_performer_revenue) / top_performer_revenue * 100) if top_performer_revenue > 0 else 0
            
            ranking = PerformanceRankingModel(
                entity_id=metrics.entity_id,
                entity_type=metrics.entity_type,
                overall_rank=rank,
                revenue_rank=revenue_rank,
                order_volume_rank=order_rank,
                growth_rank=growth_rank,
                peer_group_size=peer_group_size,
                peer_group_type=used_peer_group_type,
                overall_percentile=overall_percentile,
                revenue_percentile=revenue_percentile,
                order_volume_percentile=order_percentile,
                growth_percentile=growth_percentile,
                vs_peer_avg_revenue=vs_peer_avg_revenue,
                vs_peer_avg_orders=vs_peer_avg_orders,
                vs_top_performer=vs_top_performer
            )
            
            rankings.append(ranking)
        
        return rankings