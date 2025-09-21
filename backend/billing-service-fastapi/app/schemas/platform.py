"""
Platform Management Billing Schemas
为前端驱动的平台管理端计费功能提供专用数据模型

These schemas are designed to perfectly match frontend component requirements
for the Platform Management Billing Dashboard.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, validator


# ============== 仪表板指标 Schemas ==============

class MetricValue(BaseModel):
    """指标值包含数值、变化率和趋势方向"""
    value: float = Field(..., description="指标当前值")
    change: float = Field(..., description="相比上期变化百分比")
    trend: Literal['up', 'down', 'stable'] = Field(..., description="趋势方向")


class DashboardMetrics(BaseModel):
    """平台管理端仪表板关键指标"""
    monthly_commission: MetricValue = Field(..., description="月度佣金收入")
    active_suppliers: MetricValue = Field(..., description="活跃付费供应商数量")
    average_rate: MetricValue = Field(..., description="平均有效费率")
    growth_rate: MetricValue = Field(..., description="业务增长率")
    
    class Config:
        schema_extra = {
            "example": {
                "monthly_commission": {
                    "value": 2580000.50,
                    "change": 15.8,
                    "trend": "up"
                },
                "active_suppliers": {
                    "value": 1247,
                    "change": 8.3,
                    "trend": "up"
                },
                "average_rate": {
                    "value": 2.15,
                    "change": -2.1,
                    "trend": "down"
                },
                "growth_rate": {
                    "value": 23.7,
                    "change": 4.2,
                    "trend": "up"
                }
            }
        }


class SystemAlert(BaseModel):
    """系统告警信息"""
    id: str = Field(..., description="告警ID")
    type: Literal['error', 'warning', 'info'] = Field(..., description="告警级别")
    message: str = Field(..., description="告警消息")
    timestamp: datetime = Field(..., description="告警时间")


class SystemHealth(BaseModel):
    """系统健康度监控"""
    billing_success_rate: float = Field(..., ge=0, le=100, description="计费成功率")
    payment_success_rate: float = Field(..., ge=0, le=100, description="付款成功率")
    dispute_rate: float = Field(..., ge=0, le=100, description="争议率")
    system_uptime: float = Field(..., ge=0, le=100, description="系统正常运行时间")
    last_updated: datetime = Field(..., description="最后更新时间")
    alerts: List[SystemAlert] = Field(default=[], description="系统告警列表")
    
    class Config:
        schema_extra = {
            "example": {
                "billing_success_rate": 99.8,
                "payment_success_rate": 97.2,
                "dispute_rate": 0.3,
                "system_uptime": 99.95,
                "last_updated": "2024-01-15T14:30:00Z",
                "alerts": [
                    {
                        "id": "alert_001",
                        "type": "warning",
                        "message": "供应商 SUP001 付款逾期 7 天",
                        "timestamp": "2024-01-15T10:15:00Z"
                    }
                ]
            }
        }


# ============== 费率管理 Schemas ==============

class RateCalculationInput(BaseModel):
    """费率计算器输入"""
    gmv: float = Field(..., gt=0, description="月度GMV金额")
    rating: Literal['Bronze', 'Silver', 'Gold', 'Platinum'] = Field(..., description="供应商评级")
    
    @validator('gmv')
    def validate_gmv(cls, v):
        if v <= 0:
            raise ValueError('GMV必须大于0')
        return round(v, 2)


class RateBreakdown(BaseModel):
    """费率分解详情"""
    gmv_tier: str = Field(..., description="GMV层级名称")
    tier_rate: float = Field(..., description="层级基础费率")
    rating_bonus: float = Field(..., description="评级奖励")


class RateCalculationResult(BaseModel):
    """费率计算结果"""
    base_rate: float = Field(..., description="基础费率")
    rating_discount: float = Field(..., description="评级折扣")
    effective_rate: float = Field(..., description="有效费率")
    estimated_commission: float = Field(..., description="预估佣金")
    tier: str = Field(..., description="GMV层级")
    breakdown: RateBreakdown = Field(..., description="费率分解详情")
    
    class Config:
        schema_extra = {
            "example": {
                "base_rate": 2.5,
                "rating_discount": 0.25,
                "effective_rate": 2.25,
                "estimated_commission": 11250.00,
                "tier": "Tier 2 (NT$50,001-NT$200,000)",
                "breakdown": {
                    "gmv_tier": "Tier 2",
                    "tier_rate": 2.5,
                    "rating_bonus": 0.25
                }
            }
        }


class RateTier(BaseModel):
    """费率层级定义"""
    min_gmv: float = Field(..., description="最小GMV")
    max_gmv: Optional[float] = Field(None, description="最大GMV，None表示无上限")
    rate: float = Field(..., ge=0, le=100, description="费率百分比")
    tier_name: str = Field(..., description="层级名称")


class RatingDiscount(BaseModel):
    """评级折扣定义"""
    rating: str = Field(..., description="评级名称")
    discount_percent: float = Field(..., ge=0, le=100, description="折扣百分比")


class RateConfig(BaseModel):
    """费率配置"""
    id: str = Field(..., description="配置ID")
    name: str = Field(..., description="配置名称")
    tiers: List[RateTier] = Field(..., description="费率层级")
    rating_discounts: List[RatingDiscount] = Field(..., description="评级折扣")
    is_active: bool = Field(..., description="是否激活")
    effective_date: datetime = Field(..., description="生效日期")
    created_by: str = Field(..., description="创建者")
    
    class Config:
        schema_extra = {
            "example": {
                "id": "config_001",
                "name": "标准费率配置 2024",
                "tiers": [
                    {
                        "min_gmv": 0,
                        "max_gmv": 50000,
                        "rate": 3.0,
                        "tier_name": "Tier 1"
                    },
                    {
                        "min_gmv": 50001,
                        "max_gmv": 200000,
                        "rate": 2.5,
                        "tier_name": "Tier 2"
                    }
                ],
                "rating_discounts": [
                    {
                        "rating": "Silver",
                        "discount_percent": 10.0
                    }
                ],
                "is_active": True,
                "effective_date": "2024-01-01T00:00:00Z",
                "created_by": "admin@orderly.com"
            }
        }


class RateConfigUpdate(BaseModel):
    """费率配置更新"""
    name: Optional[str] = Field(None, description="配置名称")
    tiers: Optional[List[RateTier]] = Field(None, description="费率层级")
    rating_discounts: Optional[List[RatingDiscount]] = Field(None, description="评级折扣")
    is_active: Optional[bool] = Field(None, description="是否激活")
    effective_date: Optional[datetime] = Field(None, description="生效日期")


# ============== 供应商管理 Schemas ==============

class SupplierQueryFilters(BaseModel):
    """供应商查询过滤器"""
    rating: Optional[List[str]] = Field(None, description="评级过滤")
    gmv_tier: Optional[List[str]] = Field(None, description="GMV层级过滤")
    payment_status: Optional[List[str]] = Field(None, description="付款状态过滤")
    has_overdue: Optional[bool] = Field(None, description="是否有逾期")


class SupplierQueryParams(BaseModel):
    """供应商查询参数"""
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(50, ge=1, le=200, description="页面大小")
    search: Optional[str] = Field(None, description="搜索关键词")
    filters: SupplierQueryFilters = Field(default_factory=SupplierQueryFilters, description="过滤条件")
    sort_by: Optional[str] = Field(None, description="排序字段")
    sort_order: Optional[Literal['asc', 'desc']] = Field('desc', description="排序方向")


class SupplierBillingData(BaseModel):
    """供应商计费数据"""
    id: str = Field(..., description="供应商ID")
    name: str = Field(..., description="供应商名称")
    contact_email: str = Field(..., description="联系邮箱")
    rating: Literal['Bronze', 'Silver', 'Gold', 'Platinum'] = Field(..., description="评级")
    monthly_gmv: float = Field(..., description="月度GMV")
    gmv_tier: str = Field(..., description="GMV层级")
    current_rate: float = Field(..., description="当前费率")
    effective_rate: float = Field(..., description="有效费率")
    payment_status: Literal['current', 'overdue', 'pending'] = Field(..., description="付款状态")
    last_payment_date: Optional[datetime] = Field(None, description="最后付款日期")
    outstanding_amount: float = Field(..., description="未结金额")
    next_billing_date: datetime = Field(..., description="下次计费日期")
    total_revenue: float = Field(..., description="总营收贡献")


class PaginatedSupplierBilling(BaseModel):
    """分页供应商计费数据"""
    items: List[SupplierBillingData] = Field(..., description="供应商数据列表")
    total: int = Field(..., description="总数量")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="页面大小")
    total_pages: int = Field(..., description="总页数")
    has_next: bool = Field(..., description="是否有下一页")
    has_prev: bool = Field(..., description="是否有上一页")


# ============== 分析图表 Schemas ==============

class RevenueChartData(BaseModel):
    """营收图表数据点"""
    date: str = Field(..., description="日期")
    commission: float = Field(..., description="佣金收入")
    suppliers: int = Field(..., description="供应商数量")


class GMVDistributionData(BaseModel):
    """GMV分布数据"""
    tier: str = Field(..., description="层级名称")
    count: int = Field(..., description="供应商数量")
    percentage: float = Field(..., description="占比")
    total_gmv: float = Field(..., description="总GMV")


class RatingDistributionData(BaseModel):
    """评级分布数据"""
    rating: str = Field(..., description="评级名称")
    count: int = Field(..., description="供应商数量")
    percentage: float = Field(..., description="占比")
    avg_commission: float = Field(..., description="平均佣金")


class PaymentTrendData(BaseModel):
    """付款趋势数据"""
    date: str = Field(..., description="日期")
    success_rate: float = Field(..., description="成功率")
    avg_payment_time: float = Field(..., description="平均付款时间(天)")
    dispute_count: int = Field(..., description="争议数量")


class BillingAnalytics(BaseModel):
    """计费分析数据"""
    revenue_chart: List[RevenueChartData] = Field(..., description="营收趋势图表")
    gmv_distribution: List[GMVDistributionData] = Field(..., description="GMV分布")
    rating_distribution: List[RatingDistributionData] = Field(..., description="评级分布")
    payment_trends: List[PaymentTrendData] = Field(..., description="付款趋势")


class AnalyticsFilters(BaseModel):
    """分析过滤器"""
    timeframe: str = Field("30d", description="时间范围")
    supplier_ids: Optional[List[str]] = Field(None, description="特定供应商ID")
    rating_filter: Optional[List[str]] = Field(None, description="评级过滤")
    gmv_range: Optional[Dict[str, float]] = Field(None, description="GMV范围")


# ============== 批次操作 Schemas ==============

class BatchOperationType(str):
    """批次操作类型枚举"""
    GENERATE_BILLS = "generate_bills"
    ADJUST_RATES = "adjust_rates"
    SEND_NOTIFICATIONS = "send_notifications"
    UPDATE_RATINGS = "update_ratings"


class BatchOperation(BaseModel):
    """批次操作请求"""
    operation_type: str = Field(..., description="操作类型")
    target_supplier_ids: Optional[List[str]] = Field(None, description="目标供应商ID列表")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="操作参数")
    scheduled_time: Optional[datetime] = Field(None, description="计划执行时间")
    
    @validator('operation_type')
    def validate_operation_type(cls, v):
        valid_types = [
            BatchOperationType.GENERATE_BILLS,
            BatchOperationType.ADJUST_RATES,
            BatchOperationType.SEND_NOTIFICATIONS,
            BatchOperationType.UPDATE_RATINGS
        ]
        if v not in valid_types:
            raise ValueError(f'操作类型必须是: {valid_types}')
        return v


class BatchOperationProgress(BaseModel):
    """批次操作进度"""
    completed: int = Field(..., description="已完成数量")
    total: int = Field(..., description="总数量")
    failed: int = Field(default=0, description="失败数量")
    percentage: float = Field(..., description="完成百分比")
    current_step: str = Field(..., description="当前步骤")
    estimated_remaining_time: Optional[int] = Field(None, description="预估剩余时间(秒)")


class BatchOperationResult(BaseModel):
    """批次操作结果"""
    task_id: str = Field(..., description="任务ID")
    status: Literal['started', 'running', 'completed', 'failed'] = Field(..., description="任务状态")
    progress: BatchOperationProgress = Field(..., description="操作进度")
    results: Dict[str, Any] = Field(default_factory=dict, description="操作结果详情")
    started_at: datetime = Field(..., description="开始时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")
    error_message: Optional[str] = Field(None, description="错误信息")
    
    class Config:
        schema_extra = {
            "example": {
                "task_id": "batch_001",
                "status": "running",
                "progress": {
                    "completed": 750,
                    "total": 1000,
                    "failed": 5,
                    "percentage": 75.0,
                    "current_step": "生成账单中...",
                    "estimated_remaining_time": 300
                },
                "results": {},
                "started_at": "2024-01-15T14:00:00Z",
                "completed_at": None,
                "error_message": None
            }
        }


# ============== 通用响应 Schemas ==============

class PlatformResponse(BaseModel):
    """平台管理端通用响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    data: Optional[Any] = Field(None, description="响应数据")
    timestamp: datetime = Field(default_factory=datetime.now, description="响应时间")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "message": "操作成功",
                "data": {},
                "timestamp": "2024-01-15T14:30:00Z"
            }
        }


class ErrorDetail(BaseModel):
    """错误详情"""
    field: Optional[str] = Field(None, description="错误字段")
    message: str = Field(..., description="错误消息")
    code: Optional[str] = Field(None, description="错误代码")


class PlatformError(BaseModel):
    """平台管理端错误响应"""
    success: bool = Field(False, description="操作失败")
    message: str = Field(..., description="错误消息")
    details: Optional[List[ErrorDetail]] = Field(None, description="错误详情")
    timestamp: datetime = Field(default_factory=datetime.now, description="错误时间")
    request_id: Optional[str] = Field(None, description="请求ID")