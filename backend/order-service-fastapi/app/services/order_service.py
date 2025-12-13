"""
Order Service
訂單服務 - 處理訂單相關業務邏輯
"""
from typing import Optional, List, Dict, Any, Tuple
from decimal import Decimal
from datetime import datetime, date
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
import structlog

from app.models.order import Order, OrderItem, OrderStatusHistory, OrderAdjustment
from app.models.enums import OrderStatus, PaymentStatus
from app.schemas.order import (
    OrderCreate, OrderUpdate, OrderStatusUpdate, OrderConfirmRequest,
    OrderAdjustmentCreate, ConfirmedItem
)
from app.schemas.order_item import OrderItemCreate, OrderItemUpdate
from .order_state_machine import OrderStateMachine
from .notification_client import notification_client

logger = structlog.get_logger()


class OrderService:
    """訂單服務類"""

    # 稅率（可配置）
    DEFAULT_TAX_RATE = Decimal("0.05")  # 5%

    @staticmethod
    def generate_order_number() -> str:
        """
        生成訂單編號

        格式：ORD-YYYYMMDD-XXXXXX（時間戳 + 隨機）
        """
        now = datetime.utcnow()
        date_part = now.strftime("%Y%m%d")
        random_part = str(uuid4())[:6].upper()
        return f"ORD-{date_part}-{random_part}"

    @staticmethod
    def calculate_line_total(quantity: Decimal, unit_price: Decimal) -> Decimal:
        """計算行總計"""
        return round(quantity * unit_price, 2)

    @classmethod
    def calculate_order_totals(
        cls,
        items: List[OrderItem],
        adjustments: List[Dict[str, Any]] = None,
        tax_rate: Decimal = None
    ) -> Dict[str, Decimal]:
        """
        計算訂單金額

        Args:
            items: 訂單項目列表
            adjustments: 調整項列表
            tax_rate: 稅率

        Returns:
            Dict containing subtotal, tax_amount, discount_amount, shipping_fee, total_amount
        """
        if tax_rate is None:
            tax_rate = cls.DEFAULT_TAX_RATE

        # 計算小計
        subtotal = sum(
            Decimal(str(item.line_total)) if item.line_total else Decimal("0")
            for item in items
        )

        # 處理調整項
        discount_amount = Decimal("0")
        shipping_fee = Decimal("0")

        if adjustments:
            for adj in adjustments:
                adj_type = adj.get("type") or adj.get("adjustment_type", "")
                amount = Decimal(str(adj.get("amount", 0)))

                if adj_type in ["discount", "credit"]:
                    discount_amount += amount
                elif adj_type == "shipping_fee":
                    shipping_fee += amount
                elif adj_type == "surcharge":
                    subtotal += amount

        # 計算稅額（稅前金額 = 小計 - 折扣）
        taxable_amount = subtotal - discount_amount
        if taxable_amount < 0:
            taxable_amount = Decimal("0")
        tax_amount = round(taxable_amount * tax_rate, 2)

        # 計算總金額
        total_amount = taxable_amount + tax_amount + shipping_fee

        return {
            "subtotal": round(subtotal, 2),
            "tax_amount": tax_amount,
            "discount_amount": round(discount_amount, 2),
            "shipping_fee": round(shipping_fee, 2),
            "total_amount": round(total_amount, 2),
        }

    @classmethod
    async def create_order(
        cls,
        db: AsyncSession,
        order_data: OrderCreate,
        tenant_id: str,
        user_id: str
    ) -> Order:
        """
        創建訂單

        Args:
            db: 資料庫會話
            order_data: 訂單創建數據
            tenant_id: 租戶 ID
            user_id: 創建者 ID

        Returns:
            Order: 創建的訂單
        """
        # 生成訂單編號
        order_number = cls.generate_order_number()

        # 創建訂單主體
        order = Order(
            id=str(uuid4()),
            order_number=order_number,
            tenant_id=tenant_id,
            restaurant_id=order_data.restaurant_id or tenant_id,
            supplier_id=order_data.supplier_id,
            status=OrderStatus.DRAFT,
            payment_status=PaymentStatus.PENDING,
            delivery_date=order_data.delivery_date,
            delivery_address=order_data.delivery_address,
            receiving_unit=order_data.receiving_unit,
            notes=order_data.notes,
            created_by=user_id,
            adjustments=[],
        )

        db.add(order)
        await db.flush()

        # 創建訂單項目
        order_items = []
        for idx, item_data in enumerate(order_data.items):
            line_total = cls.calculate_line_total(item_data.quantity, item_data.unit_price)
            order_item = OrderItem(
                id=str(uuid4()),
                order_id=order.id,
                sku_id=item_data.sku_id,
                product_id=item_data.product_id,
                product_code=item_data.product_code,
                product_name=item_data.product_name,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                line_total=line_total,
                notes=item_data.notes,
                is_variable_price=item_data.is_variable_price,
                sort_order=item_data.sort_order if hasattr(item_data, 'sort_order') else idx,
            )
            db.add(order_item)
            order_items.append(order_item)

        # 計算訂單金額
        totals = cls.calculate_order_totals(order_items)
        order.subtotal = totals["subtotal"]
        order.tax_amount = totals["tax_amount"]
        order.discount_amount = totals["discount_amount"]
        order.shipping_fee = totals["shipping_fee"]
        order.total_amount = totals["total_amount"]

        # 記錄初始狀態歷史
        status_history = OrderStatusHistory(
            id=str(uuid4()),
            order_id=order.id,
            from_status=None,
            to_status=OrderStatus.DRAFT,
            changed_by=user_id,
            reason="訂單創建",
        )
        db.add(status_history)

        await db.commit()
        await db.refresh(order)

        logger.info("order_created", order_id=order.id, order_number=order_number, tenant_id=tenant_id)

        # 發送新訂單通知（非阻塞，草稿創建不需要通知）
        # 當訂單提交時才會發送通知

        return order

    @classmethod
    async def get_order_by_id(
        cls,
        db: AsyncSession,
        order_id: str,
        tenant_id: str
    ) -> Optional[Order]:
        """
        根據 ID 獲取訂單

        Args:
            db: 資料庫會話
            order_id: 訂單 ID
            tenant_id: 租戶 ID

        Returns:
            Order 或 None
        """
        result = await db.execute(
            select(Order)
            .options(
                selectinload(Order.items),
                selectinload(Order.status_history)
            )
            .where(
                and_(
                    Order.id == order_id,
                    Order.tenant_id == tenant_id,
                    Order.is_deleted == False
                )
            )
        )
        return result.scalar_one_or_none()

    @classmethod
    async def list_orders(
        cls,
        db: AsyncSession,
        tenant_id: str,
        page: int = 1,
        page_size: int = 20,
        status: Optional[OrderStatus] = None,
        supplier_id: Optional[str] = None,
        restaurant_id: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> Tuple[List[Order], int]:
        """
        獲取訂單列表

        Args:
            db: 資料庫會話
            tenant_id: 租戶 ID
            page: 頁碼
            page_size: 每頁數量
            status: 狀態過濾
            supplier_id: 供應商過濾
            restaurant_id: 餐廳過濾
            date_from: 開始日期
            date_to: 結束日期

        Returns:
            Tuple[List[Order], int]: 訂單列表和總數
        """
        # 構建查詢條件
        conditions = [
            Order.tenant_id == tenant_id,
            Order.is_deleted == False,
        ]

        if status:
            conditions.append(Order.status == status)
        if supplier_id:
            conditions.append(Order.supplier_id == supplier_id)
        if restaurant_id:
            conditions.append(Order.restaurant_id == restaurant_id)
        if date_from:
            conditions.append(Order.delivery_date >= date_from)
        if date_to:
            conditions.append(Order.delivery_date <= date_to)

        # 查詢總數
        count_query = select(func.count(Order.id)).where(and_(*conditions))
        total = (await db.execute(count_query)).scalar() or 0

        # 查詢數據
        offset = (page - 1) * page_size
        query = (
            select(Order)
            .options(selectinload(Order.items))
            .where(and_(*conditions))
            .order_by(desc(Order.created_at))
            .offset(offset)
            .limit(page_size)
        )
        result = await db.execute(query)
        orders = result.scalars().all()

        return list(orders), total

    @classmethod
    async def update_order(
        cls,
        db: AsyncSession,
        order_id: str,
        tenant_id: str,
        order_data: OrderUpdate,
        user_id: str
    ) -> Order:
        """
        更新訂單

        Args:
            db: 資料庫會話
            order_id: 訂單 ID
            tenant_id: 租戶 ID
            order_data: 更新數據
            user_id: 更新者 ID

        Returns:
            Order: 更新後的訂單
        """
        order = await cls.get_order_by_id(db, order_id, tenant_id)
        if not order:
            raise HTTPException(status_code=404, detail=f"訂單 ID '{order_id}' 不存在")

        # 只有草稿狀態可以更新基本信息
        if order.status != OrderStatus.DRAFT:
            raise HTTPException(
                status_code=400,
                detail=f"只有草稿狀態的訂單可以修改，當前狀態：{order.status.value}"
            )

        # 更新欄位
        if order_data.delivery_date is not None:
            order.delivery_date = order_data.delivery_date
        if order_data.delivery_address is not None:
            order.delivery_address = order_data.delivery_address
        if order_data.receiving_unit is not None:
            order.receiving_unit = order_data.receiving_unit
        if order_data.notes is not None:
            order.notes = order_data.notes

        await db.commit()
        await db.refresh(order)

        logger.info("order_updated", order_id=order_id, user_id=user_id)

        return order

    @classmethod
    async def update_order_status(
        cls,
        db: AsyncSession,
        order_id: str,
        tenant_id: str,
        status_data: OrderStatusUpdate,
        user_id: str,
        role: str = None
    ) -> Order:
        """
        更新訂單狀態

        Args:
            db: 資料庫會話
            order_id: 訂單 ID
            tenant_id: 租戶 ID
            status_data: 狀態更新數據
            user_id: 更新者 ID
            role: 執行者角色

        Returns:
            Order: 更新後的訂單
        """
        order = await cls.get_order_by_id(db, order_id, tenant_id)
        if not order:
            raise HTTPException(status_code=404, detail=f"訂單 ID '{order_id}' 不存在")

        # 驗證狀態轉換
        can_transition, error_msg = OrderStateMachine.can_transition(
            order.status, status_data.status, role
        )
        if not can_transition:
            raise HTTPException(status_code=400, detail=error_msg)

        old_status = order.status
        order.status = status_data.status

        # 特殊狀態處理
        if status_data.status == OrderStatus.CONFIRMED:
            order.confirmed_by = user_id
            order.confirmed_at = datetime.utcnow()

        # 記錄狀態歷史
        status_history = OrderStatusHistory(
            id=str(uuid4()),
            order_id=order.id,
            from_status=old_status,
            to_status=status_data.status,
            changed_by=user_id,
            reason=status_data.reason,
            notes=status_data.notes,
        )
        db.add(status_history)

        await db.commit()
        await db.refresh(order)

        logger.info(
            "order_status_updated",
            order_id=order_id,
            from_status=old_status.value,
            to_status=status_data.status.value,
            user_id=user_id
        )

        # 發送狀態變更通知（非阻塞）
        try:
            await notification_client.notify_order_status_change(
                order_id=order.id,
                order_number=order.order_number,
                from_status=old_status,
                to_status=status_data.status,
                tenant_id=tenant_id,
                restaurant_id=order.restaurant_id,
                supplier_id=order.supplier_id,
                changed_by=user_id,
                reason=status_data.reason,
            )
        except Exception as e:
            # 通知失敗不應影響主流程
            logger.warning("notification.failed", order_id=order_id, error=str(e))

        return order

    @classmethod
    async def confirm_order(
        cls,
        db: AsyncSession,
        order_id: str,
        tenant_id: str,
        confirm_data: OrderConfirmRequest,
        user_id: str
    ) -> Order:
        """
        供應商確認訂單

        Args:
            db: 資料庫會話
            order_id: 訂單 ID
            tenant_id: 租戶 ID
            confirm_data: 確認數據
            user_id: 確認者 ID

        Returns:
            Order: 確認後的訂單
        """
        order = await cls.get_order_by_id(db, order_id, tenant_id)
        if not order:
            raise HTTPException(status_code=404, detail=f"訂單 ID '{order_id}' 不存在")

        # 驗證狀態
        if order.status != OrderStatus.SUBMITTED:
            raise HTTPException(
                status_code=400,
                detail=f"只有待確認狀態的訂單可以確認，當前狀態：{order.status.value}"
            )

        # 更新訂單項目的確認數量和價格
        item_map = {str(item.id): item for item in order.items}
        for confirmed_item in confirm_data.confirmed_items:
            item = item_map.get(confirmed_item.item_id)
            if item:
                item.confirmed_quantity = confirmed_item.confirmed_quantity
                if confirmed_item.confirmed_price is not None:
                    item.confirmed_price = confirmed_item.confirmed_price
                # 如果是時價商品且有確認價格，重新計算行總計
                if item.is_variable_price and confirmed_item.confirmed_price:
                    item.line_total = cls.calculate_line_total(
                        confirmed_item.confirmed_quantity,
                        confirmed_item.confirmed_price
                    )

        # 更新訂單狀態
        old_status = order.status
        order.status = OrderStatus.CONFIRMED
        order.confirmed_by = user_id
        order.confirmed_at = datetime.utcnow()
        if confirm_data.internal_notes:
            order.internal_notes = confirm_data.internal_notes
        if confirm_data.notes:
            if order.notes:
                order.notes += f"\n[供應商備註] {confirm_data.notes}"
            else:
                order.notes = f"[供應商備註] {confirm_data.notes}"

        # 重新計算金額
        totals = cls.calculate_order_totals(list(order.items), order.adjustments)
        order.subtotal = totals["subtotal"]
        order.tax_amount = totals["tax_amount"]
        order.total_amount = totals["total_amount"]

        # 記錄狀態歷史
        status_history = OrderStatusHistory(
            id=str(uuid4()),
            order_id=order.id,
            from_status=old_status,
            to_status=OrderStatus.CONFIRMED,
            changed_by=user_id,
            reason="供應商確認訂單",
        )
        db.add(status_history)

        await db.commit()
        await db.refresh(order)

        logger.info("order_confirmed", order_id=order_id, user_id=user_id)

        # 發送確認通知
        try:
            await notification_client.notify_order_status_change(
                order_id=order.id,
                order_number=order.order_number,
                from_status=old_status,
                to_status=OrderStatus.CONFIRMED,
                tenant_id=tenant_id,
                restaurant_id=order.restaurant_id,
                supplier_id=order.supplier_id,
                changed_by=user_id,
                reason="供應商確認訂單",
            )
        except Exception as e:
            logger.warning("notification.failed", order_id=order_id, error=str(e))

        return order

    @classmethod
    async def cancel_order(
        cls,
        db: AsyncSession,
        order_id: str,
        tenant_id: str,
        reason: str,
        user_id: str
    ) -> Order:
        """
        取消訂單

        Args:
            db: 資料庫會話
            order_id: 訂單 ID
            tenant_id: 租戶 ID
            reason: 取消原因
            user_id: 取消者 ID

        Returns:
            Order: 取消後的訂單
        """
        order = await cls.get_order_by_id(db, order_id, tenant_id)
        if not order:
            raise HTTPException(status_code=404, detail=f"訂單 ID '{order_id}' 不存在")

        # 驗證是否可取消
        if not OrderStateMachine.is_cancellable(order.status):
            raise HTTPException(
                status_code=400,
                detail=f"當前狀態 '{order.status.value}' 不允許取消"
            )

        old_status = order.status
        order.status = OrderStatus.CANCELLED

        # 記錄狀態歷史
        status_history = OrderStatusHistory(
            id=str(uuid4()),
            order_id=order.id,
            from_status=old_status,
            to_status=OrderStatus.CANCELLED,
            changed_by=user_id,
            reason=reason,
        )
        db.add(status_history)

        await db.commit()
        await db.refresh(order)

        logger.info("order_cancelled", order_id=order_id, reason=reason, user_id=user_id)

        # 發送取消通知
        try:
            await notification_client.notify_order_status_change(
                order_id=order.id,
                order_number=order.order_number,
                from_status=old_status,
                to_status=OrderStatus.CANCELLED,
                tenant_id=tenant_id,
                restaurant_id=order.restaurant_id,
                supplier_id=order.supplier_id,
                changed_by=user_id,
                reason=reason,
            )
        except Exception as e:
            logger.warning("notification.failed", order_id=order_id, error=str(e))

        return order

    @classmethod
    async def get_order_history(
        cls,
        db: AsyncSession,
        order_id: str,
        tenant_id: str
    ) -> List[OrderStatusHistory]:
        """
        獲取訂單狀態歷史

        Args:
            db: 資料庫會話
            order_id: 訂單 ID
            tenant_id: 租戶 ID

        Returns:
            List[OrderStatusHistory]: 狀態歷史列表
        """
        # 先驗證訂單存在且屬於該租戶
        order = await cls.get_order_by_id(db, order_id, tenant_id)
        if not order:
            raise HTTPException(status_code=404, detail=f"訂單 ID '{order_id}' 不存在")

        result = await db.execute(
            select(OrderStatusHistory)
            .where(OrderStatusHistory.order_id == order_id)
            .order_by(desc(OrderStatusHistory.changed_at))
        )
        return list(result.scalars().all())

    @classmethod
    async def add_order_item(
        cls,
        db: AsyncSession,
        order_id: str,
        tenant_id: str,
        item_data: OrderItemCreate,
        user_id: str
    ) -> Order:
        """
        添加訂單項目

        Args:
            db: 資料庫會話
            order_id: 訂單 ID
            tenant_id: 租戶 ID
            item_data: 項目數據
            user_id: 操作者 ID

        Returns:
            Order: 更新後的訂單
        """
        order = await cls.get_order_by_id(db, order_id, tenant_id)
        if not order:
            raise HTTPException(status_code=404, detail=f"訂單 ID '{order_id}' 不存在")

        if order.status != OrderStatus.DRAFT:
            raise HTTPException(
                status_code=400,
                detail=f"只有草稿狀態的訂單可以添加項目，當前狀態：{order.status.value}"
            )

        # 計算排序順序
        max_sort = max((item.sort_order for item in order.items), default=-1)

        # 創建新項目
        line_total = cls.calculate_line_total(item_data.quantity, item_data.unit_price)
        order_item = OrderItem(
            id=str(uuid4()),
            order_id=order.id,
            sku_id=item_data.sku_id,
            product_id=item_data.product_id,
            product_code=item_data.product_code,
            product_name=item_data.product_name,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            line_total=line_total,
            notes=item_data.notes,
            is_variable_price=item_data.is_variable_price,
            sort_order=max_sort + 1,
        )
        db.add(order_item)

        # 重新計算訂單金額
        await db.flush()
        await db.refresh(order)

        totals = cls.calculate_order_totals(list(order.items), order.adjustments)
        order.subtotal = totals["subtotal"]
        order.tax_amount = totals["tax_amount"]
        order.total_amount = totals["total_amount"]

        await db.commit()
        await db.refresh(order)

        logger.info("order_item_added", order_id=order_id, item_id=order_item.id)

        return order

    @classmethod
    async def update_order_item(
        cls,
        db: AsyncSession,
        order_id: str,
        item_id: str,
        tenant_id: str,
        item_data: OrderItemUpdate,
        user_id: str
    ) -> Order:
        """
        更新訂單項目

        Args:
            db: 資料庫會話
            order_id: 訂單 ID
            item_id: 項目 ID
            tenant_id: 租戶 ID
            item_data: 更新數據
            user_id: 操作者 ID

        Returns:
            Order: 更新後的訂單
        """
        order = await cls.get_order_by_id(db, order_id, tenant_id)
        if not order:
            raise HTTPException(status_code=404, detail=f"訂單 ID '{order_id}' 不存在")

        # 找到對應的項目
        item = next((i for i in order.items if str(i.id) == item_id), None)
        if not item:
            raise HTTPException(status_code=404, detail=f"訂單項目 ID '{item_id}' 不存在")

        # 草稿狀態可以修改數量和價格
        if order.status == OrderStatus.DRAFT:
            if item_data.quantity is not None:
                item.quantity = item_data.quantity
            if item_data.unit_price is not None:
                item.unit_price = item_data.unit_price
            if item_data.notes is not None:
                item.notes = item_data.notes

            # 重新計算行總計
            item.line_total = cls.calculate_line_total(item.quantity, item.unit_price)

        # 其他狀態只能更新確認/交貨/驗收數量
        else:
            if item_data.confirmed_quantity is not None:
                item.confirmed_quantity = item_data.confirmed_quantity
            if item_data.confirmed_price is not None:
                item.confirmed_price = item_data.confirmed_price
            if item_data.delivered_quantity is not None:
                item.delivered_quantity = item_data.delivered_quantity
            if item_data.accepted_quantity is not None:
                item.accepted_quantity = item_data.accepted_quantity

        # 重新計算訂單金額
        totals = cls.calculate_order_totals(list(order.items), order.adjustments)
        order.subtotal = totals["subtotal"]
        order.tax_amount = totals["tax_amount"]
        order.total_amount = totals["total_amount"]

        await db.commit()
        await db.refresh(order)

        logger.info("order_item_updated", order_id=order_id, item_id=item_id)

        return order

    @classmethod
    async def delete_order_item(
        cls,
        db: AsyncSession,
        order_id: str,
        item_id: str,
        tenant_id: str,
        user_id: str
    ) -> Order:
        """
        刪除訂單項目

        Args:
            db: 資料庫會話
            order_id: 訂單 ID
            item_id: 項目 ID
            tenant_id: 租戶 ID
            user_id: 操作者 ID

        Returns:
            Order: 更新後的訂單
        """
        order = await cls.get_order_by_id(db, order_id, tenant_id)
        if not order:
            raise HTTPException(status_code=404, detail=f"訂單 ID '{order_id}' 不存在")

        if order.status != OrderStatus.DRAFT:
            raise HTTPException(
                status_code=400,
                detail=f"只有草稿狀態的訂單可以刪除項目，當前狀態：{order.status.value}"
            )

        # 找到並刪除項目
        item = next((i for i in order.items if str(i.id) == item_id), None)
        if not item:
            raise HTTPException(status_code=404, detail=f"訂單項目 ID '{item_id}' 不存在")

        # 確保至少保留一個項目
        if len(order.items) <= 1:
            raise HTTPException(status_code=400, detail="訂單必須至少包含一個項目")

        await db.delete(item)

        # 重新計算訂單金額
        await db.flush()
        await db.refresh(order)

        totals = cls.calculate_order_totals(list(order.items), order.adjustments)
        order.subtotal = totals["subtotal"]
        order.tax_amount = totals["tax_amount"]
        order.total_amount = totals["total_amount"]

        await db.commit()
        await db.refresh(order)

        logger.info("order_item_deleted", order_id=order_id, item_id=item_id)

        return order

    @classmethod
    async def get_order_stats(
        cls,
        db: AsyncSession,
        tenant_id: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        supplier_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        獲取訂單統計

        Args:
            db: 資料庫會話
            tenant_id: 租戶 ID
            date_from: 開始日期
            date_to: 結束日期
            supplier_id: 供應商 ID

        Returns:
            Dict: 統計數據
        """
        conditions = [
            Order.tenant_id == tenant_id,
            Order.is_deleted == False,
        ]

        if date_from:
            conditions.append(Order.delivery_date >= date_from)
        if date_to:
            conditions.append(Order.delivery_date <= date_to)
        if supplier_id:
            conditions.append(Order.supplier_id == supplier_id)

        # 總訂單數和金額
        totals_query = select(
            func.count(Order.id).label("total_orders"),
            func.sum(Order.total_amount).label("total_amount"),
        ).where(and_(*conditions))

        totals_result = await db.execute(totals_query)
        totals = totals_result.one()

        # 按狀態統計
        status_query = select(
            Order.status,
            func.count(Order.id).label("count")
        ).where(and_(*conditions)).group_by(Order.status)

        status_result = await db.execute(status_query)
        by_status = {row.status.value: row.count for row in status_result}

        # 按付款狀態統計
        payment_query = select(
            Order.payment_status,
            func.count(Order.id).label("count")
        ).where(and_(*conditions)).group_by(Order.payment_status)

        payment_result = await db.execute(payment_query)
        by_payment_status = {row.payment_status.value: row.count for row in payment_result}

        total_orders = totals.total_orders or 0
        total_amount = Decimal(str(totals.total_amount or 0))
        avg_order_value = total_amount / total_orders if total_orders > 0 else Decimal("0")

        return {
            "total_orders": total_orders,
            "total_amount": total_amount,
            "by_status": by_status,
            "by_payment_status": by_payment_status,
            "average_order_value": round(avg_order_value, 2),
            "period_start": date_from,
            "period_end": date_to,
        }
