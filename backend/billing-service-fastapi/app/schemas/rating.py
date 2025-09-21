"""
Pydantic schemas for supplier rating APIs
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from decimal import Decimal
from .base import BaseResponse, ListResponse, PaginationParams, FilterParams


# Request schemas
class SupplierRatingCalculate(BaseModel):
    """Calculate supplier rating request"""
    supplier_id: str = Field(..., description="Supplier ID")
    rating_period: str = Field(..., pattern="^\\d{4}-\\d{2}$", description="Rating period (YYYY-MM)")
    include_quality: bool = Field(True, description="Include quality metrics")
    include_delivery: bool = Field(True, description="Include delivery metrics")
    include_service: bool = Field(True, description="Include service metrics")
    include_financial: bool = Field(True, description="Include financial metrics")
    force_recalculate: bool = Field(False, description="Force recalculation even if rating exists")
    calculated_by: str = Field(..., description="Calculator user ID")


class SupplierRatingUpdate(BaseModel):
    """Update supplier rating request"""
    manual_adjustment: Optional[Decimal] = Field(None, ge=-1, le=1, description="Manual adjustment (-1.0 to 1.0)")
    adjustment_reason: Optional[str] = Field(None, max_length=500, description="Adjustment reason")
    admin_notes: Optional[str] = Field(None, max_length=1000, description="Admin notes")
    is_published: Optional[bool] = Field(None, description="Published status")
    quality_weight: Optional[Decimal] = Field(None, ge=0, le=1, description="Quality weight")
    delivery_weight: Optional[Decimal] = Field(None, ge=0, le=1, description="Delivery weight")
    service_weight: Optional[Decimal] = Field(None, ge=0, le=1, description="Service weight")
    financial_weight: Optional[Decimal] = Field(None, ge=0, le=1, description="Financial weight")
    updated_by: str = Field(..., description="Updater user ID")
    
    @field_validator('quality_weight', 'delivery_weight', 'service_weight', 'financial_weight', mode='before')
    @classmethod
    def validate_weights(cls, v):
        # Simplified validation - just check individual field constraints
        # Full validation would need to be done at the model level
        return v


class RatingPublishRequest(BaseModel):
    """Publish rating request"""
    publish_to_suppliers: bool = Field(True, description="Publish to suppliers")
    publish_to_customers: bool = Field(False, description="Publish to customers")
    notification_message: Optional[str] = Field(None, max_length=500, description="Notification message")
    effective_date: Optional[datetime] = Field(None, description="Publication effective date")
    published_by: str = Field(..., description="Publisher user ID")


class RatingFilter(FilterParams):
    """Rating filter parameters"""
    supplier_id: Optional[str] = Field(None, description="Filter by supplier ID")
    rating_period: Optional[str] = Field(None, pattern="^\\d{4}-\\d{2}$", description="Rating period (YYYY-MM)")
    is_published: Optional[bool] = Field(None, description="Filter by published status")
    overall_rating_min: Optional[Decimal] = Field(None, ge=0, le=5, description="Minimum overall rating")
    overall_rating_max: Optional[Decimal] = Field(None, ge=0, le=5, description="Maximum overall rating")
    quality_rating_min: Optional[Decimal] = Field(None, ge=0, le=5, description="Minimum quality rating")
    delivery_rating_min: Optional[Decimal] = Field(None, ge=0, le=5, description="Minimum delivery rating")
    service_rating_min: Optional[Decimal] = Field(None, ge=0, le=5, description="Minimum service rating")
    financial_rating_min: Optional[Decimal] = Field(None, ge=0, le=5, description="Minimum financial rating")
    has_adjustments: Optional[bool] = Field(None, description="Filter ratings with manual adjustments")
    calculated_from: Optional[datetime] = Field(None, description="Calculated from date")
    calculated_to: Optional[datetime] = Field(None, description="Calculated to date")


class RatingBenchmarkRequest(BaseModel):
    """Rating benchmark request"""
    supplier_ids: Optional[List[str]] = Field(None, description="Specific suppliers to benchmark")
    industry_category: Optional[str] = Field(None, description="Industry category filter")
    supplier_size: Optional[str] = Field(None, pattern="^(small|medium|large|enterprise)$", description="Supplier size filter")
    region: Optional[str] = Field(None, description="Region filter")
    rating_period: Optional[str] = Field(None, pattern="^\\d{4}-\\d{2}$", description="Rating period")
    metrics: List[str] = Field(default=["overall", "quality", "delivery", "service", "financial"], description="Metrics to benchmark")


class RatingComparisonRequest(BaseModel):
    """Rating comparison request"""
    supplier_id: str = Field(..., description="Primary supplier ID")
    comparison_supplier_ids: List[str] = Field(..., min_items=1, description="Suppliers to compare against")
    comparison_period: int = Field(6, ge=1, le=24, description="Number of months to compare")
    metrics: List[str] = Field(default=["overall", "quality", "delivery", "service", "financial"], description="Metrics to compare")


# Response schemas
class SupplierRatingResponse(BaseModel):
    """Supplier rating response"""
    id: str
    supplier_id: str
    supplier_name: str
    rating_period: str
    overall_rating: float
    quality_rating: float
    delivery_rating: float
    service_rating: float
    financial_rating: float
    transaction_count: int
    total_gmv: float
    average_order_value: float
    on_time_delivery_rate: float
    quality_complaint_rate: float
    payment_delay_days: Optional[float]
    dispute_resolution_time: Optional[float]
    customer_satisfaction_score: Optional[float]
    manual_adjustment: Optional[float]
    adjustment_reason: Optional[str]
    quality_weight: float
    delivery_weight: float
    service_weight: float
    financial_weight: float
    calculation_details: Dict[str, Any]
    is_published: bool
    published_date: Optional[datetime]
    admin_notes: Optional[str]
    calculated_by: str
    calculated_at: datetime
    updated_by: Optional[str]
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class RatingMetricsResponse(BaseModel):
    """Rating metrics breakdown response"""
    supplier_id: str
    rating_period: str
    
    # Quality metrics
    quality_score: float
    average_product_rating: float
    defect_rate: float
    quality_complaint_count: int
    quality_return_rate: float
    
    # Delivery metrics
    delivery_score: float
    on_time_delivery_rate: float
    average_delivery_time: float
    delivery_accuracy_rate: float
    delivery_complaint_count: int
    
    # Service metrics
    service_score: float
    response_time_avg: float
    issue_resolution_time: float
    customer_service_rating: float
    communication_rating: float
    
    # Financial metrics
    financial_score: float
    payment_terms_compliance: float
    invoice_accuracy_rate: float
    dispute_rate: float
    credit_score: Optional[float]
    
    # Volume metrics
    total_orders: int
    total_gmv: float
    average_order_value: float
    order_cancellation_rate: float


class RatingTrendResponse(BaseModel):
    """Rating trend response"""
    supplier_id: str
    periods: List[str] = Field(default_factory=list, description="Rating periods")
    overall_ratings: List[float] = Field(default_factory=list, description="Overall ratings by period")
    quality_ratings: List[float] = Field(default_factory=list, description="Quality ratings by period")
    delivery_ratings: List[float] = Field(default_factory=list, description="Delivery ratings by period")
    service_ratings: List[float] = Field(default_factory=list, description="Service ratings by period")
    financial_ratings: List[float] = Field(default_factory=list, description="Financial ratings by period")
    trend_direction: str = Field(..., description="Overall trend direction (improving/declining/stable)")
    trend_strength: float = Field(..., description="Trend strength (0-1)")


class RatingBenchmarkResponse(BaseModel):
    """Rating benchmark response"""
    benchmark_category: str
    total_suppliers: int
    metrics: Dict[str, Dict[str, float]] = Field(default_factory=dict, description="Benchmark metrics")
    percentiles: Dict[str, Dict[str, float]] = Field(default_factory=dict, description="Percentile rankings")
    industry_averages: Dict[str, float] = Field(default_factory=dict, description="Industry averages")
    top_performers: List[Dict[str, Any]] = Field(default_factory=list, description="Top performing suppliers")
    improvement_opportunities: List[Dict[str, Any]] = Field(default_factory=list, description="Areas for improvement")


class RatingComparisonResponse(BaseModel):
    """Rating comparison response"""
    primary_supplier: Dict[str, Any] = Field(..., description="Primary supplier data")
    comparison_suppliers: List[Dict[str, Any]] = Field(default_factory=list, description="Comparison suppliers data")
    relative_performance: Dict[str, float] = Field(default_factory=dict, description="Relative performance scores")
    strengths: List[str] = Field(default_factory=list, description="Primary supplier strengths")
    weaknesses: List[str] = Field(default_factory=list, description="Primary supplier weaknesses")
    recommendations: List[str] = Field(default_factory=list, description="Improvement recommendations")


class RatingAnalyticsResponse(BaseModel):
    """Rating analytics response"""
    period: str
    total_suppliers_rated: int
    average_overall_rating: float
    rating_distribution: Dict[str, int] = Field(default_factory=dict, description="Rating distribution by score range")
    top_performers: List[Dict[str, Any]] = Field(default_factory=list, description="Top performing suppliers")
    bottom_performers: List[Dict[str, Any]] = Field(default_factory=list, description="Underperforming suppliers")
    metric_averages: Dict[str, float] = Field(default_factory=dict, description="Average scores by metric")
    improvement_trends: Dict[str, float] = Field(default_factory=dict, description="Period-over-period improvements")
    correlation_analysis: Dict[str, float] = Field(default_factory=dict, description="Metric correlation analysis")


# API Response types
SupplierRatingListResponse = ListResponse[SupplierRatingResponse]
SupplierRatingSingleResponse = BaseResponse[SupplierRatingResponse]
RatingMetricsSingleResponse = BaseResponse[RatingMetricsResponse]
RatingTrendSingleResponse = BaseResponse[RatingTrendResponse]
RatingBenchmarkSingleResponse = BaseResponse[RatingBenchmarkResponse]
RatingComparisonSingleResponse = BaseResponse[RatingComparisonResponse]
RatingAnalyticsSingleResponse = BaseResponse[RatingAnalyticsResponse]