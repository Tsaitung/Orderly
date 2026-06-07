"""
Activity Metrics and Dashboard Schemas

Pydantic models for activity metrics, dashboard data, and analytics responses.
Supports serialization for API endpoints and data validation.
"""

from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, Dict, Any, List, Union
from enum import Enum


class ActivityLevel(str, Enum):
    """Activity level enumeration"""
    ACTIVE = "active"
    MEDIUM = "medium"
    LOW = "low"
    DORMANT = "dormant"


class EntityType(str, Enum):
    """Entity type enumeration"""
    GROUP = "group"
    COMPANY = "company"
    LOCATION = "location"
    BUSINESS_UNIT = "business_unit"


class PeriodType(str, Enum):
    """Time period type enumeration"""
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"


# Base schemas
class ActivityMetricsBase(BaseModel):
    """Base schema for activity metrics"""
    entity_id: str = Field(..., description="Unique identifier for the entity")
    entity_type: EntityType = Field(..., description="Type of entity (group/company/location/business_unit)")
    activity_score: int = Field(..., ge=0, le=100, description="Activity score from 0-100")
    activity_level: ActivityLevel = Field(..., description="Activity level classification")
    last_order_date: Optional[datetime] = Field(None, description="Date of last order")
    total_orders_30d: int = Field(..., ge=0, description="Total orders in last 30 days")
    total_revenue_30d: float = Field(..., ge=0, description="Total revenue in last 30 days")
    avg_order_value_30d: float = Field(..., ge=0, description="Average order value in last 30 days")
    trend_percentage: float = Field(..., description="Week-over-week growth percentage")
    growth_rate: float = Field(..., description="Month-over-month growth rate")


class ActivityMetricsResponse(ActivityMetricsBase):
    """Response schema for activity metrics"""
    id: str = Field(..., description="Unique ID for this metrics record")
    frequency_score: float = Field(..., description="Order frequency component score")
    recency_score: float = Field(..., description="Order recency component score")
    value_score: float = Field(..., description="Order value component score")
    geographic_rank: Optional[int] = Field(None, description="Rank within geographic region")
    business_type_rank: Optional[int] = Field(None, description="Rank within business type")
    additional_metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    calculation_date: datetime = Field(..., description="When metrics were calculated")
    
    class Config:
        from_attributes = True


class DashboardSummaryResponse(BaseModel):
    """Dashboard summary metrics response"""
    # Entity counts
    total_groups: int = Field(..., description="Total number of groups")
    total_companies: int = Field(..., description="Total number of companies")
    total_locations: int = Field(..., description="Total number of locations")
    total_business_units: int = Field(..., description="Total number of business units")
    
    # Activity distribution
    active_entities_count: int = Field(..., description="Number of active entities")
    active_entities_percentage: float = Field(..., description="Percentage of active entities")
    medium_entities_count: int = Field(..., description="Number of medium activity entities")
    low_entities_count: int = Field(..., description="Number of low activity entities")
    dormant_entities_count: int = Field(..., description="Number of dormant entities")
    
    # Financial metrics
    total_revenue_30d: float = Field(..., description="Total revenue in last 30 days")
    avg_revenue_per_entity: float = Field(..., description="Average revenue per entity")
    total_orders_30d: int = Field(..., description="Total orders in last 30 days")
    avg_orders_per_entity: float = Field(..., description="Average orders per entity")
    
    # Performance metrics
    avg_activity_score: float = Field(..., description="Average activity score across all entities")
    top_performer_score: float = Field(..., description="Highest activity score")
    growth_rate_overall: float = Field(..., description="Overall platform growth rate")
    
    # Geographic and business type breakdowns
    geographic_metrics: Optional[Dict[str, Any]] = Field(None, description="Geographic distribution metrics")
    business_type_metrics: Optional[Dict[str, Any]] = Field(None, description="Business type distribution metrics")
    
    # Metadata
    calculation_date: datetime = Field(..., description="When summary was calculated")
    data_freshness_minutes: int = Field(..., description="Age of underlying data in minutes")
    
    class Config:
        from_attributes = True


class PerformanceRankingResponse(BaseModel):
    """Performance ranking response"""
    entity_id: str = Field(..., description="Entity identifier")
    entity_type: EntityType = Field(..., description="Entity type")
    
    # Rankings
    overall_rank: int = Field(..., description="Overall performance rank")
    revenue_rank: int = Field(..., description="Revenue-based rank")
    order_volume_rank: int = Field(..., description="Order volume rank")
    growth_rank: int = Field(..., description="Growth rate rank")
    
    # Context
    peer_group_size: int = Field(..., description="Size of peer group")
    peer_group_type: str = Field(..., description="Type of peer group comparison")
    
    # Percentiles
    overall_percentile: float = Field(..., description="Overall percentile score (0-100)")
    revenue_percentile: float = Field(..., description="Revenue percentile score")
    order_volume_percentile: float = Field(..., description="Order volume percentile score")
    growth_percentile: float = Field(..., description="Growth percentile score")
    
    # Comparisons
    vs_peer_avg_revenue: float = Field(..., description="Performance vs peer average revenue (%)")
    vs_peer_avg_orders: float = Field(..., description="Performance vs peer average orders (%)")
    vs_top_performer: float = Field(..., description="Performance vs top performer (%)")
    
    ranking_date: datetime = Field(..., description="When ranking was calculated")
    
    class Config:
        from_attributes = True


class ActivityTrendResponse(BaseModel):
    """Activity trend response"""
    entity_id: str = Field(..., description="Entity identifier")
    entity_type: EntityType = Field(..., description="Entity type")
    period_start: datetime = Field(..., description="Period start date")
    period_end: datetime = Field(..., description="Period end date")
    period_type: PeriodType = Field(..., description="Period type (day/week/month)")
    
    # Metrics
    activity_score: float = Field(..., description="Activity score for this period")
    order_count: int = Field(..., description="Order count for this period")
    revenue: float = Field(..., description="Revenue for this period")
    avg_order_value: float = Field(..., description="Average order value for this period")
    
    # Changes
    score_change: float = Field(..., description="Change in activity score from previous period")
    order_change_pct: float = Field(..., description="Percentage change in orders")
    revenue_change_pct: float = Field(..., description="Percentage change in revenue")
    
    # Seasonal indicators
    is_seasonal_peak: bool = Field(..., description="Whether this is a seasonal peak period")
    seasonal_factor: float = Field(..., description="Seasonal adjustment factor")
    
    class Config:
        from_attributes = True


# Aggregated response schemas
class EntityActivitySummary(BaseModel):
    """Summary of activity for a single entity"""
    entity_id: str = Field(..., description="Entity identifier")
    entity_name: str = Field(..., description="Entity display name")
    entity_type: EntityType = Field(..., description="Entity type")
    activity_score: int = Field(..., description="Current activity score")
    activity_level: ActivityLevel = Field(..., description="Activity level classification")
    total_revenue_30d: float = Field(..., description="Revenue in last 30 days")
    total_orders_30d: int = Field(..., description="Orders in last 30 days")
    trend_percentage: float = Field(..., description="Growth trend percentage")
    rank: Optional[int] = Field(None, description="Performance rank if available")
    percentile: Optional[float] = Field(None, description="Performance percentile if available")


class DashboardMetricsResponse(BaseModel):
    """Complete dashboard metrics response"""
    summary: DashboardSummaryResponse = Field(..., description="Overall dashboard summary")
    top_performers: List[EntityActivitySummary] = Field(..., description="Top performing entities")
    recent_activity: List[EntityActivitySummary] = Field(..., description="Recently active entities")
    growth_leaders: List[EntityActivitySummary] = Field(..., description="Fastest growing entities")
    attention_needed: List[EntityActivitySummary] = Field(..., description="Entities needing attention")
    
    # Response metadata
    data_timestamp: datetime = Field(..., description="When data was generated")
    total_entities_analyzed: int = Field(..., description="Total entities included in analysis")
    cache_hit: bool = Field(default=False, description="Whether data was served from cache")


class ActivityAnalyticsResponse(BaseModel):
    """Advanced analytics response"""
    entity_type: EntityType = Field(..., description="Entity type for this analytics set")
    total_entities: int = Field(..., description="Total entities analyzed")
    
    # Distribution analysis
    activity_distribution: Dict[ActivityLevel, int] = Field(..., description="Count by activity level")
    score_distribution: Dict[str, int] = Field(..., description="Score range distribution")
    
    # Performance insights
    avg_score: float = Field(..., description="Average activity score")
    median_score: float = Field(..., description="Median activity score")
    score_std_dev: float = Field(..., description="Standard deviation of scores")
    
    # Business insights
    revenue_concentration: Dict[str, float] = Field(..., description="Revenue concentration metrics")
    order_patterns: Dict[str, Any] = Field(..., description="Order pattern analysis")
    seasonal_trends: Dict[str, Any] = Field(..., description="Seasonal trend analysis")
    
    # Geographic insights
    geographic_performance: Dict[str, Dict[str, float]] = Field(..., description="Performance by geography")
    
    # Time-based insights
    trend_analysis: Dict[str, float] = Field(..., description="Trend analysis metrics")
    forecasted_growth: Dict[str, float] = Field(..., description="Forecasted growth rates")
    
    analysis_date: datetime = Field(..., description="When analysis was performed")


# Query parameter schemas
class ActivityQueryParams(BaseModel):
    """Query parameters for activity endpoints"""
    entity_type: Optional[EntityType] = Field(None, description="Filter by entity type")
    activity_level: Optional[ActivityLevel] = Field(None, description="Filter by activity level")
    min_score: Optional[int] = Field(None, ge=0, le=100, description="Minimum activity score")
    max_score: Optional[int] = Field(None, ge=0, le=100, description="Maximum activity score")
    limit: int = Field(50, ge=1, le=1000, description="Maximum number of results")
    offset: int = Field(0, ge=0, description="Number of results to skip")
    include_trends: bool = Field(False, description="Include trend data")
    include_rankings: bool = Field(False, description="Include ranking data")


class PerformanceQueryParams(BaseModel):
    """Query parameters for performance endpoints"""
    entity_type: Optional[EntityType] = Field(None, description="Filter by entity type")
    peer_group_type: Optional[str] = Field(None, description="Type of peer group comparison")
    top_n: int = Field(10, ge=1, le=100, description="Number of top performers to return")
    include_percentiles: bool = Field(True, description="Include percentile calculations")


class TrendQueryParams(BaseModel):
    """Query parameters for trend endpoints"""
    entity_id: Optional[str] = Field(None, description="Specific entity ID")
    entity_type: Optional[EntityType] = Field(None, description="Filter by entity type")
    period_type: PeriodType = Field(PeriodType.WEEK, description="Time period granularity")
    start_date: Optional[datetime] = Field(None, description="Start date for trend analysis")
    end_date: Optional[datetime] = Field(None, description="End date for trend analysis")
    periods: int = Field(12, ge=1, le=52, description="Number of periods to return")