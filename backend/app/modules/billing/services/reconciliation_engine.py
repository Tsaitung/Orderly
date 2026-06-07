"""
Reconciliation Engine
自動對帳算法引擎（依 Database-Schema-Core.md:428-460 和 PRD-Billing-Master.md）
"""

import structlog
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from uuid import uuid4
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.billing.models.reconciliation import Reconciliation, ReconciliationItem
from app.modules.billing.models.enums import ReconciliationStatus, DiscrepancyType
from app.modules.billing.schemas.reconciliation import ReconciliationCreate, ReconciliationItemCreate
from app.modules.billing.services.reconciliation_service import ReconciliationService
from app.modules.orders.models.enums import OrderStatus
from app.modules.orders.models.order import Order

logger = structlog.get_logger()


class ReconciliationEngine:
    """
    自動對帳引擎
    實現 Database-Schema-Core.md 中 find_reconciliation_candidates 的功能
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.recon_service = ReconciliationService(session)

    async def run_auto_reconciliation(
        self,
        tenant_id: str,
        restaurant_id: str,
        supplier_id: str,
        period_start: date,
        period_end: date,
        created_by: Optional[str] = None,
    ) -> Reconciliation:
        """
        執行自動對帳
        1. 從 Order Service 取得期間內的訂單
        2. 比對訂單與實際驗收數據
        3. 創建對帳記錄與明細
        4. 根據信心分數判斷是否自動審核
        """
        logger.info(
            "reconciliation.auto.start",
            tenant_id=tenant_id,
            restaurant_id=restaurant_id,
            supplier_id=supplier_id,
            period=f"{period_start} - {period_end}",
        )

        # Step 1: 取得訂單數據
        orders = await self._fetch_orders(
            tenant_id, restaurant_id, supplier_id, period_start, period_end
        )

        # Step 2: 取得驗收數據（模擬，實際應從 Acceptance Service 取得）
        acceptances = await self._fetch_acceptances(
            tenant_id, restaurant_id, supplier_id, period_start, period_end
        )

        # Step 3: 執行對帳比對
        items = self._match_orders_with_acceptances(orders, acceptances)

        # Step 4: 創建對帳記錄
        recon_data = ReconciliationCreate(
            period_start=period_start,
            period_end=period_end,
            restaurant_id=restaurant_id,
            supplier_id=supplier_id,
            items=items,
        )

        reconciliation = await self.recon_service.create_reconciliation(
            tenant_id=tenant_id,
            data=recon_data,
            created_by=created_by,
        )

        # Step 5: 判斷是否自動審核
        if await self._should_auto_approve(reconciliation):
            reconciliation.auto_approved = True
            reconciliation.status = ReconciliationStatus.APPROVED
            reconciliation.reviewed_at = datetime.utcnow()
            reconciliation.review_notes = "自動審核通過（信心分數 >= 閾值）"
            await self.session.commit()

        logger.info(
            "reconciliation.auto.complete",
            id=reconciliation.id,
            auto_approved=reconciliation.auto_approved,
            confidence=reconciliation.confidence_score,
        )

        return reconciliation

    async def _fetch_orders(
        self,
        tenant_id: str,
        restaurant_id: str,
        supplier_id: str,
        period_start: date,
        period_end: date,
    ) -> List[Dict[str, Any]]:
        """Fetch order data directly from the in-process orders module."""
        try:
            result = await self.session.execute(
                select(Order)
                .options(selectinload(Order.items))
                .where(
                    and_(
                        Order.tenant_id == tenant_id,
                        Order.restaurant_id == restaurant_id,
                        Order.supplier_id == supplier_id,
                        Order.delivery_date >= period_start,
                        Order.delivery_date <= period_end,
                        Order.status.in_(
                            [OrderStatus.DELIVERED, OrderStatus.ACCEPTED, OrderStatus.COMPLETED]
                        ),
                        Order.is_deleted == False,
                    )
                )
            )
            orders = result.scalars().all()
            return [
                {
                    "id": order.id,
                    "orderNumber": order.order_number,
                    "restaurantId": order.restaurant_id,
                    "supplierId": order.supplier_id,
                    "deliveryDate": order.delivery_date.isoformat() if order.delivery_date else None,
                    "status": order.status.value if order.status else None,
                    "totalAmount": float(order.total_amount or 0),
                    "items": [
                        {
                            "id": item.id,
                            "skuCode": item.sku_id,
                            "productCode": item.product_code,
                            "productName": item.product_name,
                            "quantity": float(item.quantity or 0),
                            "unitPrice": float(item.unit_price or 0),
                            "lineTotal": float(item.line_total or 0),
                        }
                        for item in order.items
                    ],
                }
                for order in orders
            ]
        except Exception as e:
            logger.error("reconciliation.fetch_orders.error", error=str(e))
            return []

    async def _fetch_acceptances(
        self,
        tenant_id: str,
        restaurant_id: str,
        supplier_id: str,
        period_start: date,
        period_end: date,
    ) -> List[Dict[str, Any]]:
        """從 Acceptance Service 取得驗收數據（模擬）"""
        # TODO: 實際整合 Acceptance Service
        # 目前返回空列表，對帳將基於訂單數據
        return []

    def _match_orders_with_acceptances(
        self,
        orders: List[Dict[str, Any]],
        acceptances: List[Dict[str, Any]],
    ) -> List[ReconciliationItemCreate]:
        """
        比對訂單與驗收數據
        實現 Database-Schema-Core.md 中的對帳配對邏輯
        """
        items: List[ReconciliationItemCreate] = []

        # 建立驗收數據索引（以 order_id + product_code 為 key）
        acceptance_map: Dict[str, Dict] = {}
        for acc in acceptances:
            key = f"{acc.get('orderId')}_{acc.get('productCode')}"
            acceptance_map[key] = acc

        # 遍歷訂單明細進行比對
        for order in orders:
            order_id = order.get("id")
            order_items = order.get("items", [])

            for item in order_items:
                product_code = item.get("productCode", "")
                key = f"{order_id}_{product_code}"

                expected_qty = Decimal(str(item.get("quantity", 0)))
                expected_price = Decimal(str(item.get("unitPrice", 0)))

                # 查找對應的驗收數據
                acc_data = acceptance_map.get(key)
                if acc_data:
                    actual_qty = Decimal(str(acc_data.get("actualQuantity", expected_qty)))
                    actual_price = Decimal(str(acc_data.get("actualPrice", expected_price)))
                else:
                    # 無驗收數據，假設與訂單一致
                    actual_qty = expected_qty
                    actual_price = expected_price

                # 判斷差異類型
                discrepancy_type = None
                if actual_qty != expected_qty:
                    discrepancy_type = DiscrepancyType.QUANTITY
                elif actual_price != expected_price:
                    discrepancy_type = DiscrepancyType.PRICE

                items.append(ReconciliationItemCreate(
                    product_code=product_code,
                    product_name=item.get("productName"),
                    sku_code=item.get("skuCode"),
                    order_id=order_id,
                    expected_quantity=expected_qty,
                    actual_quantity=actual_qty,
                    expected_price=expected_price,
                    actual_price=actual_price,
                    discrepancy_type=discrepancy_type,
                ))

        return items

    async def _should_auto_approve(self, reconciliation: Reconciliation) -> bool:
        """
        判斷是否自動審核通過
        依 PRD-Billing-Master.md 的 auto_approve 邏輯
        """
        if reconciliation.confidence_score is None:
            return False

        threshold = settings.auto_approve_threshold
        return reconciliation.confidence_score >= threshold

    async def find_candidates(
        self,
        tenant_id: str,
        restaurant_id: str,
        supplier_id: str,
        period_start: date,
        period_end: date,
    ) -> Dict[str, Any]:
        """
        查找對帳候選訂單
        實現 Database-Schema-Core.md:431-460 的 find_reconciliation_candidates
        """
        orders = await self._fetch_orders(
            tenant_id, restaurant_id, supplier_id, period_start, period_end
        )

        # 過濾已對帳的訂單
        order_ids = [o.get("id") for o in orders if o.get("id")]
        if not order_ids:
            return {
                "candidates": [],
                "total_orders": 0,
                "total_amount": Decimal("0"),
            }

        # 查詢已對帳的訂單 ID
        result = await self.session.execute(
            select(ReconciliationItem.order_id).where(
                ReconciliationItem.order_id.in_(order_ids)
            ).distinct()
        )
        reconciled_order_ids = set(row[0] for row in result.all())

        # 過濾未對帳的訂單
        candidates = [
            o for o in orders
            if o.get("id") not in reconciled_order_ids
        ]

        total_amount = sum(
            Decimal(str(o.get("totalAmount", 0)))
            for o in candidates
        )

        return {
            "candidates": candidates,
            "total_orders": len(candidates),
            "total_amount": total_amount,
        }

    async def calculate_discrepancy_summary(
        self,
        reconciliation_id: str,
    ) -> Dict[str, Any]:
        """計算差異匯總"""
        result = await self.session.execute(
            select(
                ReconciliationItem.discrepancy_type,
                func.count(ReconciliationItem.id).label("count"),
                func.sum(func.abs(ReconciliationItem.amount_difference)).label("total_diff"),
            )
            .where(ReconciliationItem.reconciliation_id == reconciliation_id)
            .group_by(ReconciliationItem.discrepancy_type)
        )

        summary = {
            "by_type": {},
            "total_items": 0,
            "total_discrepancy": Decimal("0"),
        }

        for row in result.all():
            dtype = row.discrepancy_type.value if row.discrepancy_type else "none"
            summary["by_type"][dtype] = {
                "count": row.count,
                "amount": float(row.total_diff or 0),
            }
            summary["total_items"] += row.count
            summary["total_discrepancy"] += row.total_diff or Decimal("0")

        return summary
