"""
Activity Metrics Models

Models for tracking customer hierarchy activity, performance, and analytics.
Supports dashboard functionality with scoring algorithms and trend analysis.
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from typing import Optional, Dict, Any

from .base import BaseModel


class ActivityMetrics(BaseModel):
    """
    Activity metrics for hierarchy entities (groups, companies, locations, business_units)
    Tracks order frequency, recency, value and calculates activity scores.
    """
    __tablename__ = "activity_metrics"
    
    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id = Column(String(255), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)  # group/company/location/business_unit
    
    # Activity scoring (0-100 scale)
    activity_score = Column(Integer, nullable=False, default=0, index=True)
    activity_level = Column(String(20), nullable=False, default="dormant", index=True)  # active/medium/low/dormant
    
    # Order metrics (30-day rolling window)
    last_order_date = Column(DateTime(timezone=True), nullable=True, index=True)
    total_orders_30d = Column(Integer, nullable=False, default=0)
    total_revenue_30d = Column(Float, nullable=False, default=0.0)
    avg_order_value_30d = Column(Float, nullable=False, default=0.0)
    
    # Trend analysis
    trend_percentage = Column(Float, nullable=False, default=0.0)  # Week-over-week growth
    growth_rate = Column(Float, nullable=False, default=0.0)       # Month-over-month growth
    
    # Scoring components (for transparency and debugging)
    frequency_score = Column(Float, nullable=False, default=0.0)   # 40% weight
    recency_score = Column(Float, nullable=False, default=0.0)     # 35% weight
    value_score = Column(Float, nullable=False, default=0.0)       # 25% weight
    
    # Geographic and business context
    geographic_rank = Column(Integer, nullable=True)               # Rank within region
    business_type_rank = Column(Integer, nullable=True)            # Rank within business type
    
    # Additional metadata
    additional_metadata = Column(JSONB, nullable=True)             # Flexible additional data
    calculation_date = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    
    # Indexes for performance
    __table_args__ = (
        Index('ix_activity_entity_score', 'entity_type', 'activity_score'),
        Index('ix_activity_level_date', 'activity_level', 'calculation_date'),
        Index('ix_activity_revenue', 'total_revenue_30d'),
        Index('ix_activity_orders', 'total_orders_30d'),
    )
    
    def __repr__(self) -> str:
        return f"<ActivityMetrics(entity_id={self.entity_id}, type={self.entity_type}, score={self.activity_score})>"


class DashboardSummary(BaseModel):
    """
    Dashboard summary metrics - aggregated data for quick loading
    Cached calculations for overall platform performance.
    """
    __tablename__ = "dashboard_summary"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Entity counts
    total_groups = Column(Integer, nullable=False, default=0)
    total_companies = Column(Integer, nullable=False, default=0)
    total_locations = Column(Integer, nullable=False, default=0)
    total_business_units = Column(Integer, nullable=False, default=0)
    
    # Activity distribution
    active_entities_count = Column(Integer, nullable=False, default=0)
    active_entities_percentage = Column(Float, nullable=False, default=0.0)
    medium_entities_count = Column(Integer, nullable=False, default=0)
    low_entities_count = Column(Integer, nullable=False, default=0)
    dormant_entities_count = Column(Integer, nullable=False, default=0)
    
    # Financial metrics
    total_revenue_30d = Column(Float, nullable=False, default=0.0)
    avg_revenue_per_entity = Column(Float, nullable=False, default=0.0)
    total_orders_30d = Column(Integer, nullable=False, default=0)
    avg_orders_per_entity = Column(Float, nullable=False, default=0.0)
    
    # Performance metrics
    avg_activity_score = Column(Float, nullable=False, default=0.0)
    top_performer_score = Column(Float, nullable=False, default=0.0)
    growth_rate_overall = Column(Float, nullable=False, default=0.0)
    
    # Geographic distribution
    geographic_metrics = Column(JSONB, nullable=True)  # Regional breakdowns
    business_type_metrics = Column(JSONB, nullable=True)  # Business type breakdowns
    
    # Calculation metadata
    calculation_date = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    data_freshness_minutes = Column(Integer, nullable=False, default=0)  # Age of underlying data
    
    def __repr__(self) -> str:
        return f"<DashboardSummary(date={self.calculation_date}, entities={self.total_groups + self.total_companies + self.total_locations + self.total_business_units})>"


class PerformanceRanking(BaseModel):
    """
    Performance rankings for entities within their peer groups
    Supports comparative analytics and benchmarking.
    """
    __tablename__ = "performance_rankings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id = Column(String(255), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    
    # Rankings
    overall_rank = Column(Integer, nullable=False, index=True)
    revenue_rank = Column(Integer, nullable=False)
    order_volume_rank = Column(Integer, nullable=False)
    growth_rank = Column(Integer, nullable=False)
    
    # Peer group context
    peer_group_size = Column(Integer, nullable=False)
    peer_group_type = Column(String(50), nullable=False)  # e.g., "same_region", "same_business_type"
    
    # Percentile scores
    overall_percentile = Column(Float, nullable=False)     # 0-100
    revenue_percentile = Column(Float, nullable=False)
    order_volume_percentile = Column(Float, nullable=False)
    growth_percentile = Column(Float, nullable=False)
    
    # Comparison metrics
    vs_peer_avg_revenue = Column(Float, nullable=False, default=0.0)  # Percentage above/below average
    vs_peer_avg_orders = Column(Float, nullable=False, default=0.0)
    vs_top_performer = Column(Float, nullable=False, default=0.0)
    
    # Calculation metadata
    ranking_date = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    
    # Indexes
    __table_args__ = (
        Index('ix_ranking_entity_overall', 'entity_type', 'overall_rank'),
        Index('ix_ranking_percentile', 'overall_percentile'),
    )
    
    def __repr__(self) -> str:
        return f"<PerformanceRanking(entity_id={self.entity_id}, rank={self.overall_rank}/{self.peer_group_size})>"


class ActivityTrend(BaseModel):
    """
    Time-series data for activity trends
    Supports historical analysis and forecasting.
    """
    __tablename__ = "activity_trends"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id = Column(String(255), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    
    # Time period
    period_start = Column(DateTime(timezone=True), nullable=False, index=True)
    period_end = Column(DateTime(timezone=True), nullable=False, index=True)
    period_type = Column(String(20), nullable=False, default="week")  # day/week/month
    
    # Trend metrics
    activity_score = Column(Float, nullable=False)
    order_count = Column(Integer, nullable=False, default=0)
    revenue = Column(Float, nullable=False, default=0.0)
    avg_order_value = Column(Float, nullable=False, default=0.0)
    
    # Change indicators
    score_change = Column(Float, nullable=False, default=0.0)
    order_change_pct = Column(Float, nullable=False, default=0.0)
    revenue_change_pct = Column(Float, nullable=False, default=0.0)
    
    # Seasonal flags
    is_seasonal_peak = Column(Boolean, nullable=False, default=False)
    seasonal_factor = Column(Float, nullable=False, default=1.0)
    
    # Indexes
    __table_args__ = (
        Index('ix_trend_entity_period', 'entity_id', 'period_start'),
        Index('ix_trend_type_period', 'entity_type', 'period_start'),
    )
    
    def __repr__(self) -> str:
        return f"<ActivityTrend(entity_id={self.entity_id}, period={self.period_start.date()}, score={self.activity_score})>"