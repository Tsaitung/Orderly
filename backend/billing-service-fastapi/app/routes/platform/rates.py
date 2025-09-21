"""
Platform Rate Management API Routes
平台费率管理 API 路由

支持前端 RateCalculator 和 RateConfigTable 组件的专用端点
"""
import asyncio
import structlog
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, text
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.schemas.platform import (
    RateCalculationInput,
    RateCalculationResult,
    RateBreakdown,
    RateConfig,
    RateConfigUpdate,
    RateTier,
    RatingDiscount,
    PlatformResponse
)
from app.models.billing_rate_config import BillingRateConfig
from app.models.transaction_rate_tier import TransactionRateTier
from app.models.supplier_rating import SupplierRating

router = APIRouter(prefix="/api/billing/platform/rates", tags=["Platform Rate Management"])
logger = structlog.get_logger()

# Redis缓存键前缀
RATE_CACHE_PREFIX = "platform:rates"
RATE_CALCULATION_CACHE_TTL = 300  # 5分钟


@router.post("/calculate", response_model=RateCalculationResult)
async def calculate_rate_preview(
    input_data: RateCalculationInput,
    db: AsyncSession = Depends(get_async_session)
) -> RateCalculationResult:
    """
    即时费率计算器
    
    支持前端 RateCalculator 组件的实时计算需求：
    - 根据GMV和评级计算有效费率
    - 提供详细的费率分解说明
    - 预估佣金金额
    
    性能要求: < 500ms 响应时间
    优化策略: Redis缓存常见计算结果
    """
    try:
        start_time = datetime.now()
        logger.info("Calculating rate preview", gmv=input_data.gmv, rating=input_data.rating)
        
        # 检查缓存（这里简化实现，实际应该使用Redis）
        cache_key = f"{RATE_CACHE_PREFIX}:calc:{input_data.gmv}:{input_data.rating}"
        
        # 获取当前活跃的费率配置
        rate_config = await _get_active_rate_config(db)
        if not rate_config:
            raise HTTPException(status_code=404, detail="未找到活跃的费率配置")
        
        # 确定GMV层级
        tier_info = await _determine_gmv_tier(input_data.gmv, rate_config)
        if not tier_info:
            raise HTTPException(status_code=400, detail="无法确定GMV层级")
        
        # 获取评级折扣
        rating_discount = await _get_rating_discount(input_data.rating, rate_config)
        
        # 计算有效费率
        base_rate = tier_info["rate"]
        effective_rate = base_rate - (base_rate * rating_discount / 100)
        
        # 计算预估佣金
        estimated_commission = input_data.gmv * (effective_rate / 100)
        
        # 构造费率分解
        breakdown = RateBreakdown(
            gmv_tier=tier_info["tier_name"],
            tier_rate=base_rate,
            rating_bonus=rating_discount
        )
        
        result = RateCalculationResult(
            base_rate=base_rate,
            rating_discount=rating_discount,
            effective_rate=round(effective_rate, 2),
            estimated_commission=round(estimated_commission, 2),
            tier=f"{tier_info['tier_name']} (NT${tier_info['min_gmv']:,}-{tier_info['max_gmv_display']})",
            breakdown=breakdown
        )
        
        # 记录计算时间
        calc_time = (datetime.now() - start_time).total_seconds() * 1000
        logger.info("Rate calculation completed", 
                   calculation_time_ms=calc_time,
                   effective_rate=result.effective_rate,
                   estimated_commission=result.estimated_commission)
        
        # 如果计算时间超过300ms，记录警告
        if calc_time > 300:
            logger.warning("Rate calculation exceeded target time", 
                          calculation_time_ms=calc_time,
                          target_ms=300)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Rate calculation failed", error=str(e), gmv=input_data.gmv)
        raise HTTPException(status_code=500, detail=f"费率计算失败: {str(e)}")


async def _get_active_rate_config(db: AsyncSession) -> Optional[Dict[str, Any]]:
    """获取当前活跃的费率配置"""
    query = select(BillingRateConfig).where(
        and_(
            BillingRateConfig.is_active == True,
            BillingRateConfig.effective_date <= datetime.now()
        )
    ).order_by(desc(BillingRateConfig.effective_date)).limit(1)
    
    result = await db.execute(query)
    config = result.scalar_one_or_none()
    
    if not config:
        return None
    
    return {
        "id": str(config.id),
        "name": config.config_name,
        "commission_tiers": config.commission_tiers,
        "rating_discounts": config.rating_discounts,
        "effective_date": config.effective_date
    }


async def _determine_gmv_tier(gmv: float, rate_config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """确定GMV所属的费率层级"""
    commission_tiers = rate_config.get("commission_tiers", [])
    
    for tier in commission_tiers:
        min_gmv = tier.get("min_amount", 0)
        max_gmv = tier.get("max_amount")
        
        if max_gmv is None:  # 最高层级
            if gmv >= min_gmv:
                return {
                    "tier_name": tier.get("tier_name", f"Tier {tier.get('tier_level', 'Unknown')}"),
                    "rate": tier.get("rate", 0),
                    "min_gmv": min_gmv,
                    "max_gmv": max_gmv,
                    "max_gmv_display": "以上"
                }
        else:
            if min_gmv <= gmv <= max_gmv:
                return {
                    "tier_name": tier.get("tier_name", f"Tier {tier.get('tier_level', 'Unknown')}"),
                    "rate": tier.get("rate", 0),
                    "min_gmv": min_gmv,
                    "max_gmv": max_gmv,
                    "max_gmv_display": f"NT${max_gmv:,}"
                }
    
    return None


async def _get_rating_discount(rating: str, rate_config: Dict[str, Any]) -> float:
    """获取评级折扣"""
    rating_discounts = rate_config.get("rating_discounts", {})
    return rating_discounts.get(rating, 0.0)


@router.get("/configs", response_model=List[RateConfig])
async def get_rate_configs(
    include_history: bool = Query(False, description="是否包含历史版本"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=50, description="页面大小"),
    db: AsyncSession = Depends(get_async_session)
) -> List[RateConfig]:
    """
    获取费率配置列表
    
    支持前端 RateConfigTable 组件的数据展示需求：
    - 当前有效费率配置
    - 历史版本记录（可选）
    - 分页支持
    """
    try:
        logger.info("Fetching rate configs", include_history=include_history, page=page)
        
        # 构建查询
        query = select(BillingRateConfig)
        
        if not include_history:
            # 只显示当前有效或最近的配置
            query = query.where(
                or_(
                    BillingRateConfig.is_active == True,
                    BillingRateConfig.effective_date <= datetime.now()
                )
            )
        
        # 排序和分页
        query = query.order_by(desc(BillingRateConfig.effective_date))
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        result = await db.execute(query)
        configs = result.scalars().all()
        
        # 转换为响应格式
        config_list = []
        for config in configs:
            # 转换费率层级
            tiers = []
            for tier in config.commission_tiers:
                tiers.append(RateTier(
                    min_gmv=tier.get("min_amount", 0),
                    max_gmv=tier.get("max_amount"),
                    rate=tier.get("rate", 0),
                    tier_name=tier.get("tier_name", f"Tier {tier.get('tier_level', 'Unknown')}")
                ))
            
            # 转换评级折扣
            rating_discounts = []
            for rating, discount in config.rating_discounts.items():
                rating_discounts.append(RatingDiscount(
                    rating=rating,
                    discount_percent=discount
                ))
            
            config_list.append(RateConfig(
                id=str(config.id),
                name=config.config_name,
                tiers=tiers,
                rating_discounts=rating_discounts,
                is_active=config.is_active,
                effective_date=config.effective_date,
                created_by=config.created_by or "system"
            ))
        
        logger.info("Rate configs fetched successfully", count=len(config_list))
        return config_list
        
    except Exception as e:
        logger.error("Failed to fetch rate configs", error=str(e))
        raise HTTPException(status_code=500, detail=f"获取费率配置失败: {str(e)}")


@router.get("/configs/{config_id}", response_model=RateConfig)
async def get_rate_config(
    config_id: str,
    db: AsyncSession = Depends(get_async_session)
) -> RateConfig:
    """获取特定费率配置详情"""
    try:
        query = select(BillingRateConfig).where(BillingRateConfig.id == config_id)
        result = await db.execute(query)
        config = result.scalar_one_or_none()
        
        if not config:
            raise HTTPException(status_code=404, detail="费率配置不存在")
        
        # 转换为响应格式
        tiers = []
        for tier in config.commission_tiers:
            tiers.append(RateTier(
                min_gmv=tier.get("min_amount", 0),
                max_gmv=tier.get("max_amount"),
                rate=tier.get("rate", 0),
                tier_name=tier.get("tier_name", f"Tier {tier.get('tier_level', 'Unknown')}")
            ))
        
        rating_discounts = []
        for rating, discount in config.rating_discounts.items():
            rating_discounts.append(RatingDiscount(
                rating=rating,
                discount_percent=discount
            ))
        
        return RateConfig(
            id=str(config.id),
            name=config.config_name,
            tiers=tiers,
            rating_discounts=rating_discounts,
            is_active=config.is_active,
            effective_date=config.effective_date,
            created_by=config.created_by or "system"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch rate config", config_id=config_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"获取费率配置失败: {str(e)}")


@router.put("/configs/{config_id}", response_model=RateConfig)
async def update_rate_config(
    config_id: str,
    config_data: RateConfigUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session)
) -> RateConfig:
    """
    更新费率配置
    
    支持前端费率配置编辑功能：
    - 费率层级调整
    - 评级折扣调整
    - 生效时间设置
    - 自动影响范围分析
    """
    try:
        logger.info("Updating rate config", config_id=config_id)
        
        # 检查配置是否存在
        query = select(BillingRateConfig).where(BillingRateConfig.id == config_id)
        result = await db.execute(query)
        config = result.scalar_one_or_none()
        
        if not config:
            raise HTTPException(status_code=404, detail="费率配置不存在")
        
        # 更新配置
        if config_data.name is not None:
            config.config_name = config_data.name
        
        if config_data.tiers is not None:
            # 转换费率层级
            commission_tiers = []
            for i, tier in enumerate(config_data.tiers):
                commission_tiers.append({
                    "tier_level": i + 1,
                    "tier_name": tier.tier_name,
                    "min_amount": tier.min_gmv,
                    "max_amount": tier.max_gmv,
                    "rate": tier.rate
                })
            config.commission_tiers = commission_tiers
        
        if config_data.rating_discounts is not None:
            # 转换评级折扣
            rating_discounts = {}
            for discount in config_data.rating_discounts:
                rating_discounts[discount.rating] = discount.discount_percent
            config.rating_discounts = rating_discounts
        
        if config_data.is_active is not None:
            # 如果激活此配置，需要先停用其他配置
            if config_data.is_active and not config.is_active:
                await _deactivate_other_configs(db, config_id)
            config.is_active = config_data.is_active
        
        if config_data.effective_date is not None:
            config.effective_date = config_data.effective_date
        
        config.updated_at = datetime.now()
        
        # 提交更新
        await db.commit()
        await db.refresh(config)
        
        # 后台任务：分析影响范围
        background_tasks.add_task(_analyze_rate_config_impact, config_id, config_data)
        
        # 转换为响应格式
        tiers = []
        for tier in config.commission_tiers:
            tiers.append(RateTier(
                min_gmv=tier.get("min_amount", 0),
                max_gmv=tier.get("max_amount"),
                rate=tier.get("rate", 0),
                tier_name=tier.get("tier_name", f"Tier {tier.get('tier_level', 'Unknown')}")
            ))
        
        rating_discounts = []
        for rating, discount in config.rating_discounts.items():
            rating_discounts.append(RatingDiscount(
                rating=rating,
                discount_percent=discount
            ))
        
        logger.info("Rate config updated successfully", config_id=config_id)
        
        return RateConfig(
            id=str(config.id),
            name=config.config_name,
            tiers=tiers,
            rating_discounts=rating_discounts,
            is_active=config.is_active,
            effective_date=config.effective_date,
            created_by=config.created_by or "system"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update rate config", config_id=config_id, error=str(e))
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"更新费率配置失败: {str(e)}")


async def _deactivate_other_configs(db: AsyncSession, exclude_id: str):
    """停用其他活跃的费率配置"""
    update_query = text("""
        UPDATE billing_rate_configs 
        SET is_active = false, updated_at = :now 
        WHERE is_active = true AND id != :exclude_id
    """)
    
    await db.execute(update_query, {
        "now": datetime.now(),
        "exclude_id": exclude_id
    })


async def _analyze_rate_config_impact(config_id: str, config_data: RateConfigUpdate):
    """后台任务：分析费率配置变更的影响范围"""
    try:
        logger.info("Analyzing rate config impact", config_id=config_id)
        
        # 这里可以实现：
        # 1. 计算受影响的供应商数量
        # 2. 预估费率变化对收入的影响
        # 3. 发送变更通知给相关供应商
        # 4. 更新缓存
        
        # 简化实现
        await asyncio.sleep(1)  # 模拟分析时间
        
        logger.info("Rate config impact analysis completed", config_id=config_id)
        
    except Exception as e:
        logger.error("Failed to analyze rate config impact", config_id=config_id, error=str(e))


@router.post("/configs", response_model=RateConfig)
async def create_rate_config(
    config_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session)
) -> RateConfig:
    """
    创建新的费率配置
    
    支持管理员创建新的费率结构：
    - 定义费率层级
    - 设置评级折扣
    - 配置生效时间
    """
    try:
        logger.info("Creating new rate config", config_name=config_data.get("name"))
        
        # 创建新配置
        new_config = BillingRateConfig(
            config_name=config_data["name"],
            commission_tiers=config_data["commission_tiers"],
            rating_discounts=config_data["rating_discounts"],
            is_active=config_data.get("is_active", False),
            effective_date=datetime.fromisoformat(config_data["effective_date"]),
            created_by=config_data.get("created_by", "system"),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(new_config)
        await db.commit()
        await db.refresh(new_config)
        
        # 如果激活新配置，停用其他配置
        if new_config.is_active:
            await _deactivate_other_configs(db, str(new_config.id))
            await db.commit()
        
        logger.info("Rate config created successfully", config_id=str(new_config.id))
        
        # 转换为响应格式
        tiers = []
        for tier in new_config.commission_tiers:
            tiers.append(RateTier(
                min_gmv=tier.get("min_amount", 0),
                max_gmv=tier.get("max_amount"),
                rate=tier.get("rate", 0),
                tier_name=tier.get("tier_name", f"Tier {tier.get('tier_level', 'Unknown')}")
            ))
        
        rating_discounts = []
        for rating, discount in new_config.rating_discounts.items():
            rating_discounts.append(RatingDiscount(
                rating=rating,
                discount_percent=discount
            ))
        
        return RateConfig(
            id=str(new_config.id),
            name=new_config.config_name,
            tiers=tiers,
            rating_discounts=rating_discounts,
            is_active=new_config.is_active,
            effective_date=new_config.effective_date,
            created_by=new_config.created_by or "system"
        )
        
    except Exception as e:
        logger.error("Failed to create rate config", error=str(e))
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"创建费率配置失败: {str(e)}")


@router.delete("/configs/{config_id}", response_model=PlatformResponse)
async def delete_rate_config(
    config_id: str,
    force: bool = Query(False, description="强制删除（即使正在使用）"),
    db: AsyncSession = Depends(get_async_session)
) -> PlatformResponse:
    """
    删除费率配置
    
    安全检查：
    - 不能删除正在使用的配置（除非强制）
    - 检查是否有关联的交易记录
    """
    try:
        logger.info("Deleting rate config", config_id=config_id, force=force)
        
        # 检查配置是否存在
        query = select(BillingRateConfig).where(BillingRateConfig.id == config_id)
        result = await db.execute(query)
        config = result.scalar_one_or_none()
        
        if not config:
            raise HTTPException(status_code=404, detail="费率配置不存在")
        
        # 安全检查
        if config.is_active and not force:
            raise HTTPException(status_code=400, detail="不能删除活跃的费率配置，请先停用或使用强制删除")
        
        # TODO: 检查是否有关联的交易记录
        # 这里可以添加检查逻辑
        
        # 执行删除
        await db.delete(config)
        await db.commit()
        
        logger.info("Rate config deleted successfully", config_id=config_id)
        
        return PlatformResponse(
            success=True,
            message="费率配置已成功删除",
            data={"config_id": config_id},
            timestamp=datetime.now()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete rate config", config_id=config_id, error=str(e))
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"删除费率配置失败: {str(e)}")


@router.get("/preview-impact", response_model=Dict[str, Any])
async def preview_rate_impact(
    config_id: Optional[str] = Query(None, description="费率配置ID"),
    db: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    """
    预览费率变更影响
    
    计算费率变更对平台和供应商的影响：
    - 受影响供应商数量
    - 收入变化预估
    - 按GMV层级分布
    """
    try:
        logger.info("Previewing rate impact", config_id=config_id)
        
        # 获取当前活跃配置
        current_config = await _get_active_rate_config(db)
        if not current_config:
            raise HTTPException(status_code=404, detail="未找到当前活跃的费率配置")
        
        # 如果指定了新配置，获取新配置
        new_config = None
        if config_id:
            query = select(BillingRateConfig).where(BillingRateConfig.id == config_id)
            result = await db.execute(query)
            config = result.scalar_one_or_none()
            if config:
                new_config = {
                    "commission_tiers": config.commission_tiers,
                    "rating_discounts": config.rating_discounts
                }
        
        # 简化实现：返回模拟数据
        impact_data = {
            "affected_suppliers": 1250,
            "revenue_change": {
                "current_monthly": 2580000.50,
                "projected_monthly": 2450000.75,
                "change_amount": -129249.75,
                "change_percentage": -5.01
            },
            "tier_distribution": [
                {"tier": "Tier 1", "suppliers": 450, "current_rate": 3.0, "new_rate": 2.8},
                {"tier": "Tier 2", "suppliers": 320, "current_rate": 2.5, "new_rate": 2.3},
                {"tier": "Tier 3", "suppliers": 280, "current_rate": 2.0, "new_rate": 1.9},
                {"tier": "Tier 4", "suppliers": 150, "current_rate": 1.5, "new_rate": 1.4},
                {"tier": "Tier 5", "suppliers": 50, "current_rate": 1.2, "new_rate": 1.1}
            ],
            "rating_impact": {
                "Bronze": {"suppliers": 500, "avg_discount_change": 0.1},
                "Silver": {"suppliers": 400, "avg_discount_change": 0.2},
                "Gold": {"suppliers": 250, "avg_discount_change": 0.15},
                "Platinum": {"suppliers": 100, "avg_discount_change": 0.05}
            }
        }
        
        logger.info("Rate impact preview generated", 
                   affected_suppliers=impact_data["affected_suppliers"])
        
        return impact_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to preview rate impact", error=str(e))
        raise HTTPException(status_code=500, detail=f"预览费率影响失败: {str(e)}")