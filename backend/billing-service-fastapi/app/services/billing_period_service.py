"""
Billing Period Service
計費週期業務邏輯層
"""

import structlog
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Tuple
from uuid import uuid4
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reconciliation import BillingPeriod, Reconciliation
from app.models.enums import ReconciliationStatus
from app.schemas.billing_period import BillingPeriodCreate, BillingPeriodUpdate

logger = structlog.get_logger()


class BillingPeriodService:
    """計費週期服務"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_billing_period(
        self,
        tenant_id: str,
        data: BillingPeriodCreate,
    ) -> BillingPeriod:
        """創建計費週期"""
        logger.info(
            "billing_period.create",
            tenant_id=tenant_id,
            period_name=data.period_name,
        )

        billing_period = BillingPeriod(
            id=str(uuid4()),
            tenant_id=tenant_id,
            restaurant_id=data.restaurant_id,
            supplier_id=data.supplier_id,
            period_name=data.period_name,
            period_start=data.period_start,
            period_end=data.period_end,
            is_closed=False,
        )

        self.session.add(billing_period)
        await self.session.commit()
        await self.session.refresh(billing_period)

        logger.info("billing_period.created", id=billing_period.id)
        return billing_period

    async def get_billing_period_by_id(
        self,
        period_id: str,
        tenant_id: str,
    ) -> Optional[BillingPeriod]:
        """根據 ID 取得計費週期"""
        result = await self.session.execute(
            select(BillingPeriod).where(
                and_(
                    BillingPeriod.id == period_id,
                    BillingPeriod.tenant_id == tenant_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_billing_periods(
        self,
        tenant_id: str,
        restaurant_id: Optional[str] = None,
        supplier_id: Optional[str] = None,
        is_closed: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[BillingPeriod], int]:
        """列出計費週期"""
        conditions = [BillingPeriod.tenant_id == tenant_id]

        if restaurant_id:
            conditions.append(BillingPeriod.restaurant_id == restaurant_id)
        if supplier_id:
            conditions.append(BillingPeriod.supplier_id == supplier_id)
        if is_closed is not None:
            conditions.append(BillingPeriod.is_closed == is_closed)

        # 總數
        count_query = select(func.count(BillingPeriod.id)).where(and_(*conditions))
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # 分頁資料
        query = (
            select(BillingPeriod)
            .where(and_(*conditions))
            .order_by(BillingPeriod.period_start.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        result = await self.session.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def update_billing_period(
        self,
        period_id: str,
        tenant_id: str,
        data: BillingPeriodUpdate,
    ) -> Optional[BillingPeriod]:
        """更新計費週期"""
        billing_period = await self.get_billing_period_by_id(period_id, tenant_id)
        if not billing_period:
            return None

        if billing_period.is_closed:
            logger.warning("billing_period.update.already_closed", id=period_id)
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(billing_period, key, value)

        billing_period.updated_at = datetime.utcnow()

        await self.session.commit()
        await self.session.refresh(billing_period)
        return billing_period

    async def close_billing_period(
        self,
        period_id: str,
        tenant_id: str,
        closed_by: str,
        create_reconciliation: bool = True,
    ) -> Optional[BillingPeriod]:
        """結案計費週期"""
        billing_period = await self.get_billing_period_by_id(period_id, tenant_id)
        if not billing_period:
            return None

        if billing_period.is_closed:
            logger.warning("billing_period.close.already_closed", id=period_id)
            return billing_period

        billing_period.is_closed = True
        billing_period.closed_at = datetime.utcnow()
        billing_period.closed_by = closed_by
        billing_period.updated_at = datetime.utcnow()

        # 如果需要創建對帳記錄
        if create_reconciliation:
            from app.services.reconciliation_service import ReconciliationService
            from app.schemas.reconciliation import ReconciliationCreate

            recon_service = ReconciliationService(self.session)
            recon_data = ReconciliationCreate(
                period_start=billing_period.period_start,
                period_end=billing_period.period_end,
                restaurant_id=billing_period.restaurant_id,
                supplier_id=billing_period.supplier_id,
            )
            reconciliation = await recon_service.create_reconciliation(
                tenant_id=tenant_id,
                data=recon_data,
                created_by=closed_by,
            )
            billing_period.reconciliation_id = reconciliation.id

        await self.session.commit()
        await self.session.refresh(billing_period)

        logger.info("billing_period.closed", id=period_id)
        return billing_period

    async def get_current_period(
        self,
        tenant_id: str,
        restaurant_id: str,
        supplier_id: str,
    ) -> Optional[BillingPeriod]:
        """取得當前開放的計費週期"""
        today = date.today()
        result = await self.session.execute(
            select(BillingPeriod).where(
                and_(
                    BillingPeriod.tenant_id == tenant_id,
                    BillingPeriod.restaurant_id == restaurant_id,
                    BillingPeriod.supplier_id == supplier_id,
                    BillingPeriod.is_closed == False,
                    BillingPeriod.period_start <= today,
                    BillingPeriod.period_end >= today,
                )
            ).order_by(BillingPeriod.period_start.desc())
        )
        return result.scalar_one_or_none()

    async def get_or_create_current_period(
        self,
        tenant_id: str,
        restaurant_id: str,
        supplier_id: str,
    ) -> BillingPeriod:
        """取得或創建當前計費週期"""
        current = await self.get_current_period(tenant_id, restaurant_id, supplier_id)
        if current:
            return current

        # 創建當月週期
        today = date.today()
        period_start = today.replace(day=1)
        if today.month == 12:
            period_end = today.replace(year=today.year + 1, month=1, day=1)
        else:
            period_end = today.replace(month=today.month + 1, day=1)
        period_end = period_end.replace(day=1) - __import__("datetime").timedelta(days=1)

        period_name = f"{today.year}-{today.month:02d} 月結"

        data = BillingPeriodCreate(
            restaurant_id=restaurant_id,
            supplier_id=supplier_id,
            period_name=period_name,
            period_start=period_start,
            period_end=period_end,
        )

        return await self.create_billing_period(tenant_id, data)
