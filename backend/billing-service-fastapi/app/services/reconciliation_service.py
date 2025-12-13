"""
Reconciliation Service
對帳業務邏輯層
"""

import structlog
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from uuid import uuid4
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.reconciliation import Reconciliation, ReconciliationItem
from app.models.enums import ReconciliationStatus, DiscrepancyType
from app.schemas.reconciliation import (
    ReconciliationCreate,
    ReconciliationUpdate,
    ReconciliationItemCreate,
    ReconciliationStats,
)

logger = structlog.get_logger()


class ReconciliationService:
    """對帳服務"""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ============ 編號生成 ============

    @staticmethod
    def generate_reconciliation_number(tenant_id: str) -> str:
        """生成對帳編號: REC-{tenant_prefix}-{timestamp}-{random}"""
        tenant_prefix = tenant_id[:8].upper() if tenant_id else "XXXX"
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M")
        random_suffix = str(uuid4())[:4].upper()
        return f"REC-{tenant_prefix}-{timestamp}-{random_suffix}"

    # ============ 核心 CRUD ============

    async def create_reconciliation(
        self,
        tenant_id: str,
        data: ReconciliationCreate,
        created_by: Optional[str] = None,
    ) -> Reconciliation:
        """創建對帳記錄"""
        logger.info("reconciliation.create", tenant_id=tenant_id, period_start=str(data.period_start))

        reconciliation = Reconciliation(
            id=str(uuid4()),
            reconciliation_number=self.generate_reconciliation_number(tenant_id),
            tenant_id=tenant_id,
            restaurant_id=data.restaurant_id,
            supplier_id=data.supplier_id,
            period_start=data.period_start,
            period_end=data.period_end,
            status=ReconciliationStatus.PENDING,
            summary={},
            created_by=created_by,
        )

        self.session.add(reconciliation)

        # 添加明細
        if data.items:
            for item_data in data.items:
                item = self._create_reconciliation_item(reconciliation.id, item_data)
                self.session.add(item)

        await self.session.flush()

        # 計算匯總
        await self._calculate_summary(reconciliation)

        await self.session.commit()
        await self.session.refresh(reconciliation)

        logger.info("reconciliation.created", id=reconciliation.id, number=reconciliation.reconciliation_number)
        return reconciliation

    def _create_reconciliation_item(
        self,
        reconciliation_id: str,
        data: ReconciliationItemCreate,
    ) -> ReconciliationItem:
        """創建對帳明細"""
        # 計算差異
        quantity_diff = data.actual_quantity - data.expected_quantity
        price_diff = data.actual_price - data.expected_price
        expected_amount = data.expected_quantity * data.expected_price
        actual_amount = data.actual_quantity * data.actual_price
        amount_diff = actual_amount - expected_amount

        # 判斷差異類型
        discrepancy_type = data.discrepancy_type
        if discrepancy_type is None:
            if quantity_diff != 0 and price_diff != 0:
                discrepancy_type = DiscrepancyType.QUANTITY  # 優先標記數量差異
            elif quantity_diff != 0:
                discrepancy_type = DiscrepancyType.QUANTITY
            elif price_diff != 0:
                discrepancy_type = DiscrepancyType.PRICE
            else:
                discrepancy_type = DiscrepancyType.NONE

        is_matched = (discrepancy_type == DiscrepancyType.NONE)

        return ReconciliationItem(
            id=str(uuid4()),
            reconciliation_id=reconciliation_id,
            order_id=data.order_id,
            product_code=data.product_code,
            product_name=data.product_name,
            sku_code=data.sku_code,
            expected_quantity=data.expected_quantity,
            actual_quantity=data.actual_quantity,
            quantity_difference=quantity_diff,
            expected_price=data.expected_price,
            actual_price=data.actual_price,
            price_difference=price_diff,
            expected_amount=expected_amount,
            actual_amount=actual_amount,
            amount_difference=amount_diff,
            discrepancy_type=discrepancy_type,
            discrepancy_notes=data.discrepancy_notes,
            is_matched=is_matched,
            match_confidence=1.0 if is_matched else None,
        )

    async def _calculate_summary(self, reconciliation: Reconciliation) -> None:
        """計算對帳匯總"""
        result = await self.session.execute(
            select(
                func.count(ReconciliationItem.id).label("total_items"),
                func.sum(ReconciliationItem.expected_amount).label("total_expected"),
                func.sum(ReconciliationItem.actual_amount).label("total_actual"),
                func.sum(func.abs(ReconciliationItem.amount_difference)).label("total_discrepancy"),
                func.count(ReconciliationItem.id).filter(
                    ReconciliationItem.is_matched == True
                ).label("matched_count"),
            ).where(ReconciliationItem.reconciliation_id == reconciliation.id)
        )
        row = result.one()

        total_items = row.total_items or 0
        total_expected = row.total_expected or Decimal("0")
        total_actual = row.total_actual or Decimal("0")
        total_discrepancy = row.total_discrepancy or Decimal("0")
        matched_count = row.matched_count or 0

        # 計算準確率
        accuracy_rate = Decimal("0")
        if total_expected > 0:
            matched_amount = total_expected - total_discrepancy
            accuracy_rate = (matched_amount / total_expected * 100).quantize(Decimal("0.01"))

        # 計算信心分數
        confidence_score = None
        if total_items > 0:
            confidence_score = float(matched_count / total_items)

        # 差異類型分佈
        discrepancy_result = await self.session.execute(
            select(
                ReconciliationItem.discrepancy_type,
                func.count(ReconciliationItem.id),
            )
            .where(ReconciliationItem.reconciliation_id == reconciliation.id)
            .where(ReconciliationItem.discrepancy_type.isnot(None))
            .group_by(ReconciliationItem.discrepancy_type)
        )
        discrepancy_breakdown = {
            str(row[0].value) if row[0] else "none": row[1]
            for row in discrepancy_result.all()
        }

        # 更新匯總
        reconciliation.total_items = total_items
        reconciliation.total_amount = total_expected
        reconciliation.matched_amount = total_expected - total_discrepancy
        reconciliation.discrepancy_amount = total_discrepancy
        reconciliation.confidence_score = confidence_score
        reconciliation.summary = {
            "total_items": total_items,
            "total_amount": str(total_expected),
            "matched_amount": str(total_expected - total_discrepancy),
            "discrepancy_amount": str(total_discrepancy),
            "accuracy_rate": str(accuracy_rate),
            "discrepancy_breakdown": discrepancy_breakdown,
        }

    async def get_reconciliation_by_id(
        self,
        reconciliation_id: str,
        tenant_id: str,
        include_items: bool = False,
    ) -> Optional[Reconciliation]:
        """根據 ID 取得對帳記錄"""
        query = select(Reconciliation).where(
            and_(
                Reconciliation.id == reconciliation_id,
                Reconciliation.tenant_id == tenant_id,
            )
        )

        if include_items:
            query = query.options(selectinload(Reconciliation.items))

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_reconciliations(
        self,
        tenant_id: str,
        restaurant_id: Optional[str] = None,
        supplier_id: Optional[str] = None,
        status: Optional[ReconciliationStatus] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Reconciliation], int]:
        """列出對帳記錄"""
        # 基礎查詢
        conditions = [Reconciliation.tenant_id == tenant_id]

        if restaurant_id:
            conditions.append(Reconciliation.restaurant_id == restaurant_id)
        if supplier_id:
            conditions.append(Reconciliation.supplier_id == supplier_id)
        if status:
            conditions.append(Reconciliation.status == status)

        # 總數
        count_query = select(func.count(Reconciliation.id)).where(and_(*conditions))
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # 分頁資料
        query = (
            select(Reconciliation)
            .where(and_(*conditions))
            .order_by(Reconciliation.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        result = await self.session.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def update_reconciliation(
        self,
        reconciliation_id: str,
        tenant_id: str,
        data: ReconciliationUpdate,
        updated_by: Optional[str] = None,
    ) -> Optional[Reconciliation]:
        """更新對帳記錄"""
        reconciliation = await self.get_reconciliation_by_id(reconciliation_id, tenant_id)
        if not reconciliation:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(reconciliation, key, value)

        reconciliation.updated_by = updated_by
        reconciliation.updated_at = datetime.utcnow()

        await self.session.commit()
        await self.session.refresh(reconciliation)
        return reconciliation

    # ============ 狀態流轉 ============

    async def approve_reconciliation(
        self,
        reconciliation_id: str,
        tenant_id: str,
        reviewed_by: str,
        review_notes: Optional[str] = None,
    ) -> Optional[Reconciliation]:
        """審核通過對帳記錄"""
        reconciliation = await self.get_reconciliation_by_id(reconciliation_id, tenant_id)
        if not reconciliation:
            return None

        if reconciliation.status not in [ReconciliationStatus.PENDING, ReconciliationStatus.REVIEW_REQUIRED]:
            logger.warning(
                "reconciliation.approve.invalid_status",
                id=reconciliation_id,
                current_status=reconciliation.status.value,
            )
            return None

        reconciliation.status = ReconciliationStatus.APPROVED
        reconciliation.reviewed_by = reviewed_by
        reconciliation.reviewed_at = datetime.utcnow()
        reconciliation.review_notes = review_notes
        reconciliation.updated_by = reviewed_by
        reconciliation.updated_at = datetime.utcnow()

        await self.session.commit()
        await self.session.refresh(reconciliation)

        logger.info("reconciliation.approved", id=reconciliation_id)
        return reconciliation

    async def dispute_reconciliation(
        self,
        reconciliation_id: str,
        tenant_id: str,
        disputed_by: str,
        dispute_reason: str,
    ) -> Optional[Reconciliation]:
        """提出對帳爭議"""
        reconciliation = await self.get_reconciliation_by_id(reconciliation_id, tenant_id)
        if not reconciliation:
            return None

        if reconciliation.status in [ReconciliationStatus.RESOLVED]:
            logger.warning(
                "reconciliation.dispute.already_resolved",
                id=reconciliation_id,
            )
            return None

        reconciliation.status = ReconciliationStatus.DISPUTED
        reconciliation.dispute_reason = dispute_reason
        reconciliation.updated_by = disputed_by
        reconciliation.updated_at = datetime.utcnow()

        await self.session.commit()
        await self.session.refresh(reconciliation)

        logger.info("reconciliation.disputed", id=reconciliation_id)
        return reconciliation

    async def resolve_reconciliation(
        self,
        reconciliation_id: str,
        tenant_id: str,
        resolved_by: str,
        resolution_notes: str,
    ) -> Optional[Reconciliation]:
        """解決對帳爭議"""
        reconciliation = await self.get_reconciliation_by_id(reconciliation_id, tenant_id)
        if not reconciliation:
            return None

        if reconciliation.status != ReconciliationStatus.DISPUTED:
            logger.warning(
                "reconciliation.resolve.not_disputed",
                id=reconciliation_id,
                current_status=reconciliation.status.value,
            )
            return None

        reconciliation.status = ReconciliationStatus.RESOLVED
        reconciliation.resolution_notes = resolution_notes
        reconciliation.resolved_by = resolved_by
        reconciliation.resolved_at = datetime.utcnow()
        reconciliation.updated_by = resolved_by
        reconciliation.updated_at = datetime.utcnow()

        await self.session.commit()
        await self.session.refresh(reconciliation)

        logger.info("reconciliation.resolved", id=reconciliation_id)
        return reconciliation

    # ============ 統計 ============

    async def get_reconciliation_stats(
        self,
        tenant_id: str,
        restaurant_id: Optional[str] = None,
        supplier_id: Optional[str] = None,
    ) -> ReconciliationStats:
        """取得對帳統計"""
        conditions = [Reconciliation.tenant_id == tenant_id]
        if restaurant_id:
            conditions.append(Reconciliation.restaurant_id == restaurant_id)
        if supplier_id:
            conditions.append(Reconciliation.supplier_id == supplier_id)

        result = await self.session.execute(
            select(
                func.count(Reconciliation.id).label("total"),
                func.count(Reconciliation.id).filter(
                    Reconciliation.status == ReconciliationStatus.PENDING
                ).label("pending"),
                func.count(Reconciliation.id).filter(
                    Reconciliation.status == ReconciliationStatus.APPROVED
                ).label("approved"),
                func.count(Reconciliation.id).filter(
                    Reconciliation.status == ReconciliationStatus.DISPUTED
                ).label("disputed"),
                func.sum(Reconciliation.total_amount).label("total_amount"),
                func.sum(Reconciliation.discrepancy_amount).label("total_discrepancy"),
                func.avg(Reconciliation.confidence_score).label("avg_confidence"),
            ).where(and_(*conditions))
        )
        row = result.one()

        # 計算平均準確率
        accuracy_result = await self.session.execute(
            select(func.avg(
                (Reconciliation.matched_amount / Reconciliation.total_amount * 100)
            )).where(and_(*conditions, Reconciliation.total_amount > 0))
        )
        avg_accuracy = accuracy_result.scalar() or Decimal("0")

        return ReconciliationStats(
            total_reconciliations=row.total or 0,
            pending_count=row.pending or 0,
            approved_count=row.approved or 0,
            disputed_count=row.disputed or 0,
            total_amount=row.total_amount or Decimal("0"),
            total_discrepancy=row.total_discrepancy or Decimal("0"),
            average_accuracy_rate=avg_accuracy.quantize(Decimal("0.01")) if avg_accuracy else Decimal("0"),
            average_confidence_score=float(row.avg_confidence) if row.avg_confidence else None,
        )

    # ============ 明細操作 ============

    async def add_reconciliation_item(
        self,
        reconciliation_id: str,
        tenant_id: str,
        data: ReconciliationItemCreate,
    ) -> Optional[ReconciliationItem]:
        """添加對帳明細"""
        reconciliation = await self.get_reconciliation_by_id(reconciliation_id, tenant_id)
        if not reconciliation:
            return None

        if reconciliation.status != ReconciliationStatus.PENDING:
            logger.warning("reconciliation.add_item.not_pending", id=reconciliation_id)
            return None

        item = self._create_reconciliation_item(reconciliation_id, data)
        self.session.add(item)

        # 重新計算匯總
        await self.session.flush()
        await self._calculate_summary(reconciliation)

        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def get_reconciliation_items(
        self,
        reconciliation_id: str,
        tenant_id: str,
    ) -> List[ReconciliationItem]:
        """取得對帳明細列表"""
        # 先驗證對帳記錄存在且屬於該租戶
        reconciliation = await self.get_reconciliation_by_id(reconciliation_id, tenant_id)
        if not reconciliation:
            return []

        result = await self.session.execute(
            select(ReconciliationItem)
            .where(ReconciliationItem.reconciliation_id == reconciliation_id)
            .order_by(ReconciliationItem.created_at)
        )
        return list(result.scalars().all())
