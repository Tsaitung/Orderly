"""
Fee Config Service
費率配置業務邏輯層（依 PRD-Billing-Master.md）
"""

import structlog
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Tuple, Dict, Any
from uuid import uuid4
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reconciliation import FeeConfig
from app.schemas.fee_config import FeeConfigCreate, FeeConfigUpdate

logger = structlog.get_logger()


class FeeConfigService:
    """費率配置服務"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_fee_config(
        self,
        tenant_id: str,
        data: FeeConfigCreate,
        created_by: Optional[str] = None,
    ) -> FeeConfig:
        """創建費率配置"""
        logger.info(
            "fee_config.create",
            tenant_id=tenant_id,
            fee_type=data.fee_type,
            pricing_model=data.pricing_model,
        )

        fee_config = FeeConfig(
            id=str(uuid4()),
            tenant_id=tenant_id,
            supplier_id=data.supplier_id,
            restaurant_id=data.restaurant_id,
            fee_type=data.fee_type,
            pricing_model=data.pricing_model,
            who_pays=data.who_pays,
            value=data.value,
            value_json=data.value_json,
            billing_cycle=data.billing_cycle,
            effective_from=data.effective_from,
            effective_to=data.effective_to,
            is_active=True,
            created_by=created_by,
        )

        self.session.add(fee_config)
        await self.session.commit()
        await self.session.refresh(fee_config)

        logger.info("fee_config.created", id=fee_config.id)
        return fee_config

    async def get_fee_config_by_id(
        self,
        config_id: str,
        tenant_id: str,
    ) -> Optional[FeeConfig]:
        """根據 ID 取得費率配置"""
        result = await self.session.execute(
            select(FeeConfig).where(
                and_(
                    FeeConfig.id == config_id,
                    FeeConfig.tenant_id == tenant_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_fee_configs(
        self,
        tenant_id: str,
        supplier_id: Optional[str] = None,
        restaurant_id: Optional[str] = None,
        fee_type: Optional[str] = None,
        is_active: Optional[bool] = True,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[FeeConfig], int]:
        """列出費率配置"""
        conditions = [FeeConfig.tenant_id == tenant_id]

        if supplier_id:
            conditions.append(FeeConfig.supplier_id == supplier_id)
        if restaurant_id:
            conditions.append(FeeConfig.restaurant_id == restaurant_id)
        if fee_type:
            conditions.append(FeeConfig.fee_type == fee_type)
        if is_active is not None:
            conditions.append(FeeConfig.is_active == is_active)

        # 總數
        count_query = select(func.count(FeeConfig.id)).where(and_(*conditions))
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # 分頁資料
        query = (
            select(FeeConfig)
            .where(and_(*conditions))
            .order_by(FeeConfig.effective_from.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        result = await self.session.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def update_fee_config(
        self,
        config_id: str,
        tenant_id: str,
        data: FeeConfigUpdate,
    ) -> Optional[FeeConfig]:
        """更新費率配置"""
        fee_config = await self.get_fee_config_by_id(config_id, tenant_id)
        if not fee_config:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(fee_config, key, value)

        fee_config.updated_at = datetime.utcnow()

        await self.session.commit()
        await self.session.refresh(fee_config)
        return fee_config

    async def deactivate_fee_config(
        self,
        config_id: str,
        tenant_id: str,
    ) -> Optional[FeeConfig]:
        """停用費率配置"""
        fee_config = await self.get_fee_config_by_id(config_id, tenant_id)
        if not fee_config:
            return None

        fee_config.is_active = False
        fee_config.effective_to = date.today()
        fee_config.updated_at = datetime.utcnow()

        await self.session.commit()
        await self.session.refresh(fee_config)

        logger.info("fee_config.deactivated", id=config_id)
        return fee_config

    async def get_applicable_fee_configs(
        self,
        tenant_id: str,
        supplier_id: str,
        restaurant_id: str,
        fee_date: date,
    ) -> List[FeeConfig]:
        """
        取得適用的費率配置
        優先順序: 特定供應商+餐廳 > 特定供應商 > 特定餐廳 > 全平台
        """
        # 查詢所有可能適用的配置
        result = await self.session.execute(
            select(FeeConfig).where(
                and_(
                    FeeConfig.tenant_id == tenant_id,
                    FeeConfig.is_active == True,
                    FeeConfig.effective_from <= fee_date,
                    or_(
                        FeeConfig.effective_to.is_(None),
                        FeeConfig.effective_to >= fee_date,
                    ),
                    or_(
                        FeeConfig.supplier_id == supplier_id,
                        FeeConfig.supplier_id.is_(None),
                    ),
                    or_(
                        FeeConfig.restaurant_id == restaurant_id,
                        FeeConfig.restaurant_id.is_(None),
                    ),
                )
            ).order_by(
                # 優先順序排序
                FeeConfig.supplier_id.desc().nulls_last(),
                FeeConfig.restaurant_id.desc().nulls_last(),
                FeeConfig.effective_from.desc(),
            )
        )

        configs = list(result.scalars().all())

        # 按 fee_type 分組，取最優先的
        best_configs: Dict[str, FeeConfig] = {}
        for config in configs:
            if config.fee_type not in best_configs:
                best_configs[config.fee_type] = config

        return list(best_configs.values())

    async def calculate_fee(
        self,
        tenant_id: str,
        supplier_id: str,
        restaurant_id: str,
        order_amount: Decimal,
        order_date: date,
    ) -> Dict[str, Any]:
        """
        計算訂單費用（依 PRD-Billing-Master.md 費率結構）
        """
        configs = await self.get_applicable_fee_configs(
            tenant_id, supplier_id, restaurant_id, order_date
        )

        fee_breakdown: Dict[str, Decimal] = {}
        configs_applied: List[str] = []

        for config in configs:
            fee = Decimal("0")

            if config.pricing_model == "percentage":
                # 百分比模式
                fee = order_amount * (config.value or Decimal("0"))
            elif config.pricing_model == "fixed":
                # 固定金額模式
                fee = config.value or Decimal("0")
            elif config.pricing_model == "tiered":
                # 分層費率模式
                fee = self._calculate_tiered_fee(order_amount, config.value_json)
            elif config.pricing_model == "formula":
                # 公式模式（簡化處理）
                fee = Decimal("0")  # TODO: 實現公式計算

            if fee > 0:
                fee_breakdown[config.fee_type] = fee.quantize(Decimal("0.01"))
                configs_applied.append(config.id)

        total_fee = sum(fee_breakdown.values(), Decimal("0"))

        return {
            "order_amount": order_amount,
            "fee_breakdown": fee_breakdown,
            "total_fee": total_fee,
            "fee_configs_applied": configs_applied,
        }

    def _calculate_tiered_fee(
        self,
        amount: Decimal,
        tiers_config: Optional[Dict],
    ) -> Decimal:
        """計算分層費率（依 PRD-Billing-Master.md:69-78）"""
        if not tiers_config or "tiers" not in tiers_config:
            return Decimal("0")

        tiers = tiers_config["tiers"]
        for tier in tiers:
            min_gmv = Decimal(str(tier.get("min_gmv", 0)))
            max_gmv = tier.get("max_gmv")
            rate = Decimal(str(tier.get("rate", 0)))

            if max_gmv is None:
                # 最後一層（無上限）
                if amount >= min_gmv:
                    return amount * rate
            else:
                max_gmv = Decimal(str(max_gmv))
                if min_gmv <= amount <= max_gmv:
                    return amount * rate

        return Decimal("0")

    async def get_default_transaction_fee_rate(
        self,
        tenant_id: str,
    ) -> Decimal:
        """取得預設交易佣金費率"""
        # 查詢全平台預設配置
        result = await self.session.execute(
            select(FeeConfig).where(
                and_(
                    FeeConfig.tenant_id == tenant_id,
                    FeeConfig.fee_type == "transaction_fee",
                    FeeConfig.supplier_id.is_(None),
                    FeeConfig.restaurant_id.is_(None),
                    FeeConfig.is_active == True,
                )
            ).order_by(FeeConfig.effective_from.desc())
        )
        config = result.scalar_one_or_none()

        if config and config.value:
            return config.value

        # 返回系統預設值（0.8%）
        return Decimal("0.008")
