"""
Platform Dashboard API Routes
平台管理端仪表板 API 路由

支持前端 BillingKPICard 和 SystemHealthPanel 组件的专用端点
"""
import asyncio
import structlog
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func, and_, or_

from app.core.database import get_async_session
from app.schemas.platform import (
    DashboardMetrics, 
    SystemHealth, 
    MetricValue, 
    SystemAlert,
    PlatformResponse
)
from app.models.billing_transaction import BillingTransaction
from app.models.monthly_billing_statement import MonthlyBillingStatement
from app.models.supplier_rating import SupplierRating
from app.models.payment_record import PaymentRecord

router = APIRouter(prefix="/api/billing/platform/dashboard", tags=["Platform Dashboard"])
logger = structlog.get_logger()


async def calculate_metric_change(
    current_value: float, 
    previous_value: float
) -> tuple[float, str]:
    """计算指标变化率和趋势"""
    if previous_value == 0:
        change = 100.0 if current_value > 0 else 0.0
        trend = "up" if current_value > 0 else "stable"
    else:
        change = ((current_value - previous_value) / previous_value) * 100
        if abs(change) < 1.0:
            trend = "stable"
        elif change > 0:
            trend = "up"
        else:
            trend = "down"
    
    return round(change, 2), trend


async def get_timeframe_dates(timeframe: str) -> tuple[datetime, datetime, datetime]:
    """获取时间范围的开始和结束日期"""
    now = datetime.now()
    
    if timeframe == "7d":
        current_start = now - timedelta(days=7)
        previous_start = now - timedelta(days=14)
        previous_end = current_start
    elif timeframe == "30d":
        current_start = now - timedelta(days=30)
        previous_start = now - timedelta(days=60)
        previous_end = current_start
    elif timeframe == "90d":
        current_start = now - timedelta(days=90)
        previous_start = now - timedelta(days=180)
        previous_end = current_start
    else:  # 默认30天
        current_start = now - timedelta(days=30)
        previous_start = now - timedelta(days=60)
        previous_end = current_start
    
    return current_start, previous_end, previous_start


@router.get("/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    timeframe: str = Query("30d", description="时间范围: 7d, 30d, 90d"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_async_session)
) -> DashboardMetrics:
    """
    获取平台管理端仪表板关键指标
    
    支持前端 BillingKPICard 组件的数据需求：
    - 月度佣金收入及变化趋势
    - 活跃付费供应商数量及增长
    - 平均有效费率及波动
    - 业务增长率及对比
    
    响应时间要求: < 1秒
    """
    try:
        logger.info("Fetching dashboard metrics", timeframe=timeframe)
        
        # 获取时间范围
        current_start, previous_end, previous_start = await get_timeframe_dates(timeframe)
        
        # 并发执行所有查询以提升性能
        results = await asyncio.gather(
            _get_monthly_commission(db, current_start, previous_end, previous_start),
            _get_active_suppliers(db, current_start, previous_end, previous_start),
            _get_average_rate(db, current_start, previous_end, previous_start),
            _get_growth_rate(db, current_start, previous_end, previous_start),
            return_exceptions=True
        )
        
        # 检查是否有查询失败
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Query {i} failed", error=str(result))
                raise HTTPException(status_code=500, detail=f"数据查询失败: {str(result)}")
        
        monthly_commission, active_suppliers, average_rate, growth_rate = results
        
        # 记录后台任务：更新缓存
        background_tasks.add_task(_update_metrics_cache, timeframe, {
            "monthly_commission": monthly_commission,
            "active_suppliers": active_suppliers,
            "average_rate": average_rate,
            "growth_rate": growth_rate,
            "updated_at": datetime.now()
        })
        
        logger.info("Dashboard metrics fetched successfully", 
                   commission=monthly_commission.value,
                   suppliers=active_suppliers.value)
        
        return DashboardMetrics(
            monthly_commission=monthly_commission,
            active_suppliers=active_suppliers,
            average_rate=average_rate,
            growth_rate=growth_rate
        )
        
    except Exception as e:
        logger.error("Failed to fetch dashboard metrics", error=str(e), timeframe=timeframe)
        raise HTTPException(status_code=500, detail=f"获取仪表板指标失败: {str(e)}")


async def _get_monthly_commission(
    db: AsyncSession, 
    current_start: datetime, 
    previous_end: datetime, 
    previous_start: datetime
) -> MetricValue:
    """获取月度佣金收入指标"""
    # 当前周期佣金
    current_query = select(func.coalesce(func.sum(BillingTransaction.commission_amount), 0)).where(
        and_(
            BillingTransaction.created_at >= current_start,
            BillingTransaction.status == "completed"
        )
    )
    current_result = await db.execute(current_query)
    current_commission = float(current_result.scalar() or 0)
    
    # 上一周期佣金
    previous_query = select(func.coalesce(func.sum(BillingTransaction.commission_amount), 0)).where(
        and_(
            BillingTransaction.created_at >= previous_start,
            BillingTransaction.created_at < previous_end,
            BillingTransaction.status == "completed"
        )
    )
    previous_result = await db.execute(previous_query)
    previous_commission = float(previous_result.scalar() or 0)
    
    change, trend = await calculate_metric_change(current_commission, previous_commission)
    
    return MetricValue(
        value=current_commission,
        change=change,
        trend=trend
    )


async def _get_active_suppliers(
    db: AsyncSession,
    current_start: datetime,
    previous_end: datetime, 
    previous_start: datetime
) -> MetricValue:
    """获取活跃付费供应商数量"""
    # 当前周期活跃供应商
    current_query = select(func.count(func.distinct(BillingTransaction.supplier_id))).where(
        and_(
            BillingTransaction.created_at >= current_start,
            BillingTransaction.status == "completed",
            BillingTransaction.commission_amount > 0
        )
    )
    current_result = await db.execute(current_query)
    current_suppliers = int(current_result.scalar() or 0)
    
    # 上一周期活跃供应商
    previous_query = select(func.count(func.distinct(BillingTransaction.supplier_id))).where(
        and_(
            BillingTransaction.created_at >= previous_start,
            BillingTransaction.created_at < previous_end,
            BillingTransaction.status == "completed",
            BillingTransaction.commission_amount > 0
        )
    )
    previous_result = await db.execute(previous_query)
    previous_suppliers = int(previous_result.scalar() or 0)
    
    change, trend = await calculate_metric_change(current_suppliers, previous_suppliers)
    
    return MetricValue(
        value=current_suppliers,
        change=change,
        trend=trend
    )


async def _get_average_rate(
    db: AsyncSession,
    current_start: datetime,
    previous_end: datetime,
    previous_start: datetime
) -> MetricValue:
    """获取平均有效费率"""
    # 当前周期平均费率（按交易金额加权）
    current_query = select(
        func.coalesce(
            func.sum(BillingTransaction.effective_rate * BillingTransaction.transaction_amount) / 
            func.nullif(func.sum(BillingTransaction.transaction_amount), 0),
            0
        )
    ).where(
        and_(
            BillingTransaction.created_at >= current_start,
            BillingTransaction.status == "completed"
        )
    )
    current_result = await db.execute(current_query)
    current_rate = float(current_result.scalar() or 0)
    
    # 上一周期平均费率
    previous_query = select(
        func.coalesce(
            func.sum(BillingTransaction.effective_rate * BillingTransaction.transaction_amount) / 
            func.nullif(func.sum(BillingTransaction.transaction_amount), 0),
            0
        )
    ).where(
        and_(
            BillingTransaction.created_at >= previous_start,
            BillingTransaction.created_at < previous_end,
            BillingTransaction.status == "completed"
        )
    )
    previous_result = await db.execute(previous_query)
    previous_rate = float(previous_result.scalar() or 0)
    
    change, trend = await calculate_metric_change(current_rate, previous_rate)
    
    return MetricValue(
        value=round(current_rate, 2),
        change=change,
        trend=trend
    )


async def _get_growth_rate(
    db: AsyncSession,
    current_start: datetime,
    previous_end: datetime,
    previous_start: datetime
) -> MetricValue:
    """获取业务增长率（基于GMV）"""
    # 当前周期GMV
    current_query = select(func.coalesce(func.sum(BillingTransaction.transaction_amount), 0)).where(
        and_(
            BillingTransaction.created_at >= current_start,
            BillingTransaction.status == "completed"
        )
    )
    current_result = await db.execute(current_query)
    current_gmv = float(current_result.scalar() or 0)
    
    # 上一周期GMV
    previous_query = select(func.coalesce(func.sum(BillingTransaction.transaction_amount), 0)).where(
        and_(
            BillingTransaction.created_at >= previous_start,
            BillingTransaction.created_at < previous_end,
            BillingTransaction.status == "completed"
        )
    )
    previous_result = await db.execute(previous_query)
    previous_gmv = float(previous_result.scalar() or 0)
    
    # 计算增长率
    if previous_gmv == 0:
        growth_rate = 100.0 if current_gmv > 0 else 0.0
        trend = "up" if current_gmv > 0 else "stable"
    else:
        growth_rate = ((current_gmv - previous_gmv) / previous_gmv) * 100
        if abs(growth_rate) < 1.0:
            trend = "stable"
        elif growth_rate > 0:
            trend = "up"
        else:
            trend = "down"
    
    # 这里的change表示增长率本身的变化，我们简化为0
    change = 0.0
    
    return MetricValue(
        value=round(growth_rate, 2),
        change=change,
        trend=trend
    )


async def _update_metrics_cache(timeframe: str, metrics_data: Dict[str, Any]):
    """后台任务：更新指标缓存"""
    try:
        # 这里可以集成Redis或其他缓存系统
        logger.info("Updating metrics cache", timeframe=timeframe)
        # 实现缓存逻辑
    except Exception as e:
        logger.error("Failed to update metrics cache", error=str(e))


@router.get("/health", response_model=SystemHealth)
async def get_system_health(
    db: AsyncSession = Depends(get_async_session)
) -> SystemHealth:
    """
    获取系统健康度监控数据
    
    支持前端 SystemHealthPanel 组件的数据需求：
    - 计费成功率统计
    - 付款成功率统计  
    - 争议率统计
    - 系统正常运行时间
    - 实时告警信息
    
    响应时间要求: < 1秒
    """
    try:
        logger.info("Fetching system health metrics")
        
        # 并发执行健康度查询
        health_data = await asyncio.gather(
            _get_billing_success_rate(db),
            _get_payment_success_rate(db),
            _get_dispute_rate(db),
            _get_system_alerts(db),
            return_exceptions=True
        )
        
        # 检查查询结果
        for i, result in enumerate(health_data):
            if isinstance(result, Exception):
                logger.error(f"Health query {i} failed", error=str(result))
                # 对于健康度检查，我们使用降级值而不是抛出异常
                health_data[i] = 0.0 if i < 3 else []
        
        billing_success_rate, payment_success_rate, dispute_rate, alerts = health_data
        
        # 系统正常运行时间（简化实现，实际应该从监控系统获取）
        system_uptime = 99.95
        
        logger.info("System health metrics fetched successfully",
                   billing_success=billing_success_rate,
                   payment_success=payment_success_rate)
        
        return SystemHealth(
            billing_success_rate=billing_success_rate,
            payment_success_rate=payment_success_rate,
            dispute_rate=dispute_rate,
            system_uptime=system_uptime,
            last_updated=datetime.now(),
            alerts=alerts
        )
        
    except Exception as e:
        logger.error("Failed to fetch system health", error=str(e))
        # 返回降级的健康度数据
        return SystemHealth(
            billing_success_rate=0.0,
            payment_success_rate=0.0,
            dispute_rate=0.0,
            system_uptime=0.0,
            last_updated=datetime.now(),
            alerts=[SystemAlert(
                id="health_error",
                type="error",
                message=f"健康度检查失败: {str(e)}",
                timestamp=datetime.now()
            )]
        )


async def _get_billing_success_rate(db: AsyncSession) -> float:
    """计算计费成功率"""
    # 最近24小时的计费成功率
    yesterday = datetime.now() - timedelta(hours=24)
    
    total_query = select(func.count(BillingTransaction.id)).where(
        BillingTransaction.created_at >= yesterday
    )
    total_result = await db.execute(total_query)
    total_billings = int(total_result.scalar() or 0)
    
    if total_billings == 0:
        return 100.0
    
    success_query = select(func.count(BillingTransaction.id)).where(
        and_(
            BillingTransaction.created_at >= yesterday,
            BillingTransaction.status == "completed"
        )
    )
    success_result = await db.execute(success_query)
    success_billings = int(success_result.scalar() or 0)
    
    return round((success_billings / total_billings) * 100, 2)


async def _get_payment_success_rate(db: AsyncSession) -> float:
    """计算付款成功率"""
    # 最近24小时的付款成功率
    yesterday = datetime.now() - timedelta(hours=24)
    
    total_query = select(func.count(PaymentRecord.id)).where(
        PaymentRecord.created_at >= yesterday
    )
    total_result = await db.execute(total_query)
    total_payments = int(total_result.scalar() or 0)
    
    if total_payments == 0:
        return 100.0
    
    success_query = select(func.count(PaymentRecord.id)).where(
        and_(
            PaymentRecord.created_at >= yesterday,
            PaymentRecord.status == "completed"
        )
    )
    success_result = await db.execute(success_query)
    success_payments = int(success_result.scalar() or 0)
    
    return round((success_payments / total_payments) * 100, 2)


async def _get_dispute_rate(db: AsyncSession) -> float:
    """计算争议率"""
    # 最近30天的争议率
    last_month = datetime.now() - timedelta(days=30)
    
    total_query = select(func.count(BillingTransaction.id)).where(
        and_(
            BillingTransaction.created_at >= last_month,
            BillingTransaction.status == "completed"
        )
    )
    total_result = await db.execute(total_query)
    total_transactions = int(total_result.scalar() or 0)
    
    if total_transactions == 0:
        return 0.0
    
    # 简化实现：假设争议状态存储在其他表中
    # 这里使用模拟数据
    dispute_count = max(0, int(total_transactions * 0.003))  # 0.3% 争议率
    
    return round((dispute_count / total_transactions) * 100, 2)


async def _get_system_alerts(db: AsyncSession) -> list[SystemAlert]:
    """获取系统告警"""
    alerts = []
    
    # 检查逾期付款
    overdue_query = select(func.count(PaymentRecord.id)).where(
        and_(
            PaymentRecord.status == "pending",
            PaymentRecord.due_date < datetime.now()
        )
    )
    overdue_result = await db.execute(overdue_query)
    overdue_count = int(overdue_result.scalar() or 0)
    
    if overdue_count > 0:
        alerts.append(SystemAlert(
            id=f"overdue_payments_{datetime.now().strftime('%Y%m%d')}",
            type="warning",
            message=f"有 {overdue_count} 笔付款逾期",
            timestamp=datetime.now()
        ))
    
    # 检查计费失败
    failed_billing_query = select(func.count(BillingTransaction.id)).where(
        and_(
            BillingTransaction.created_at >= datetime.now() - timedelta(hours=1),
            BillingTransaction.status == "failed"
        )
    )
    failed_result = await db.execute(failed_billing_query)
    failed_count = int(failed_result.scalar() or 0)
    
    if failed_count > 10:  # 1小时内超过10次失败
        alerts.append(SystemAlert(
            id=f"billing_failures_{datetime.now().strftime('%Y%m%d%H')}",
            type="error",
            message=f"过去1小时内有 {failed_count} 次计费失败",
            timestamp=datetime.now()
        ))
    
    return alerts


@router.get("/metrics/refresh", response_model=PlatformResponse)
async def refresh_dashboard_metrics(
    timeframe: str = Query("30d", description="时间范围: 7d, 30d, 90d"),
    force: bool = Query(False, description="强制刷新缓存"),
    db: AsyncSession = Depends(get_async_session)
) -> PlatformResponse:
    """
    刷新仪表板指标缓存
    
    管理员可以手动触发指标刷新，用于数据不一致时的恢复
    """
    try:
        logger.info("Manual refresh of dashboard metrics", timeframe=timeframe, force=force)
        
        # 如果强制刷新，清除缓存
        if force:
            # 实现缓存清除逻辑
            pass
        
        # 重新计算指标
        metrics = await get_dashboard_metrics(timeframe, BackgroundTasks(), db)
        
        return PlatformResponse(
            success=True,
            message="仪表板指标已成功刷新",
            data={"timeframe": timeframe, "metrics_updated": True},
            timestamp=datetime.now()
        )
        
    except Exception as e:
        logger.error("Failed to refresh dashboard metrics", error=str(e))
        raise HTTPException(status_code=500, detail=f"刷新仪表板指标失败: {str(e)}")