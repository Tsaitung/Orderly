"""
Price History Service
Handles price change tracking, history queries, and trend analysis
"""
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import uuid4

from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.price_history import PriceHistory, PriceType
from app.models.sku_simple import ProductSKU


class PriceHistoryService:
    """價格歷史服務"""

    @staticmethod
    async def record_price_change(
        db: AsyncSession,
        sku_id: str,
        old_price: Optional[Decimal],
        new_price: Decimal,
        price_type: PriceType = PriceType.BASE,
        supplier_id: Optional[str] = None,
        change_reason: Optional[str] = None,
        changed_by: Optional[str] = None,
        effective_from: Optional[datetime] = None,
        effective_to: Optional[datetime] = None,
        currency: str = 'TWD'
    ) -> PriceHistory:
        """
        記錄價格變動

        Args:
            db: 資料庫會話
            sku_id: SKU ID
            old_price: 舊價格
            new_price: 新價格
            price_type: 價格類型
            supplier_id: 供應商 ID
            change_reason: 變動原因
            changed_by: 變動者 ID
            effective_from: 生效開始時間
            effective_to: 生效結束時間
            currency: 貨幣代碼

        Returns:
            PriceHistory: 創建的價格歷史記錄
        """
        # Calculate change percentage
        change_percent = None
        if old_price and old_price > 0:
            diff = float(new_price) - float(old_price)
            change_percent = round((diff / float(old_price)) * 100, 2)

        price_history = PriceHistory(
            id=str(uuid4()),
            sku_id=sku_id,
            supplier_id=supplier_id,
            old_price=old_price,
            new_price=new_price,
            price_type=price_type,
            currency=currency,
            change_reason=change_reason,
            changed_by=changed_by,
            changed_at=datetime.now(timezone.utc),
            effective_from=effective_from,
            effective_to=effective_to,
            change_percent=change_percent
        )

        db.add(price_history)
        await db.commit()
        await db.refresh(price_history)

        return price_history

    @staticmethod
    async def get_price_history(
        db: AsyncSession,
        sku_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        price_type: Optional[PriceType] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[PriceHistory], int]:
        """
        獲取 SKU 價格歷史

        Args:
            db: 資料庫會話
            sku_id: SKU ID
            start_date: 開始日期
            end_date: 結束日期
            price_type: 價格類型篩選
            limit: 返回數量限制
            offset: 偏移量

        Returns:
            Tuple[List[PriceHistory], int]: 價格歷史列表和總數
        """
        conditions = [PriceHistory.sku_id == sku_id]

        if start_date:
            conditions.append(PriceHistory.changed_at >= start_date)
        if end_date:
            conditions.append(PriceHistory.changed_at <= end_date)
        if price_type:
            conditions.append(PriceHistory.price_type == price_type)

        # Get total count
        count_stmt = select(func.count(PriceHistory.id)).where(and_(*conditions))
        total = await db.scalar(count_stmt)

        # Get records
        stmt = (
            select(PriceHistory)
            .where(and_(*conditions))
            .order_by(desc(PriceHistory.changed_at))
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(stmt)
        records = list(result.scalars().all())

        return records, total or 0

    @staticmethod
    async def get_price_trend(
        db: AsyncSession,
        sku_id: str,
        period: str = '30d'
    ) -> dict:
        """
        獲取價格趨勢分析

        Args:
            db: 資料庫會話
            sku_id: SKU ID
            period: 時間段 ('7d', '30d', '90d', '365d')

        Returns:
            dict: 價格趨勢分析結果
        """
        # Parse period
        period_days = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '365d': 365
        }.get(period, 30)

        start_date = datetime.now(timezone.utc) - timedelta(days=period_days)

        stmt = (
            select(PriceHistory)
            .where(
                PriceHistory.sku_id == sku_id,
                PriceHistory.changed_at >= start_date
            )
            .order_by(PriceHistory.changed_at)
        )
        result = await db.execute(stmt)
        records = list(result.scalars().all())

        if not records:
            return {
                'period': period,
                'total_changes': 0,
                'avg_price': None,
                'min_price': None,
                'max_price': None,
                'price_volatility': None,
                'trend_direction': 'stable',
                'total_change_percent': None
            }

        prices = [float(r.new_price) for r in records]

        avg_price = sum(prices) / len(prices)
        min_price = min(prices)
        max_price = max(prices)

        # Calculate volatility (standard deviation / mean)
        if len(prices) > 1:
            variance = sum((p - avg_price) ** 2 for p in prices) / len(prices)
            volatility = (variance ** 0.5) / avg_price * 100  # As percentage
        else:
            volatility = 0

        # Determine trend direction
        if len(prices) >= 2:
            first_price = prices[0]
            last_price = prices[-1]
            if last_price > first_price * 1.05:
                trend_direction = 'increasing'
            elif last_price < first_price * 0.95:
                trend_direction = 'decreasing'
            else:
                trend_direction = 'stable'
            total_change_percent = ((last_price - first_price) / first_price) * 100
        else:
            trend_direction = 'stable'
            total_change_percent = 0

        return {
            'period': period,
            'total_changes': len(records),
            'avg_price': round(avg_price, 2),
            'min_price': round(min_price, 2),
            'max_price': round(max_price, 2),
            'price_volatility': round(volatility, 2),
            'trend_direction': trend_direction,
            'total_change_percent': round(total_change_percent, 2)
        }

    @staticmethod
    async def get_recent_price_changes(
        db: AsyncSession,
        supplier_id: Optional[str] = None,
        category_id: Optional[str] = None,
        change_threshold: float = 10.0,
        days: int = 7,
        limit: int = 50
    ) -> List[dict]:
        """
        獲取近期重大價格變動

        Args:
            db: 資料庫會話
            supplier_id: 供應商 ID 篩選
            category_id: 分類 ID 篩選
            change_threshold: 變動幅度閾值 (百分比)
            days: 查詢天數
            limit: 返回數量限制

        Returns:
            List[dict]: 價格變動列表
        """
        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        conditions = [
            PriceHistory.changed_at >= start_date,
            func.abs(PriceHistory.change_percent) >= change_threshold
        ]

        if supplier_id:
            conditions.append(PriceHistory.supplier_id == supplier_id)

        stmt = (
            select(PriceHistory, ProductSKU)
            .join(ProductSKU, PriceHistory.sku_id == ProductSKU.id)
            .where(and_(*conditions))
            .order_by(func.abs(PriceHistory.change_percent).desc())
            .limit(limit)
        )

        result = await db.execute(stmt)
        rows = result.all()

        changes = []
        for price_history, sku in rows:
            changes.append({
                'sku_id': sku.id,
                'sku_code': sku.sku_code,
                'sku_name': sku.name,
                'old_price': float(price_history.old_price) if price_history.old_price else None,
                'new_price': float(price_history.new_price),
                'change_percent': price_history.change_percent,
                'change_reason': price_history.change_reason,
                'changed_at': price_history.changed_at.isoformat() if price_history.changed_at else None,
                'price_type': price_history.price_type.value if price_history.price_type else None
            })

        return changes

    @staticmethod
    async def get_latest_price(
        db: AsyncSession,
        sku_id: str,
        price_type: PriceType = PriceType.BASE
    ) -> Optional[PriceHistory]:
        """
        獲取 SKU 最新價格記錄

        Args:
            db: 資料庫會話
            sku_id: SKU ID
            price_type: 價格類型

        Returns:
            Optional[PriceHistory]: 最新價格記錄
        """
        stmt = (
            select(PriceHistory)
            .where(
                PriceHistory.sku_id == sku_id,
                PriceHistory.price_type == price_type
            )
            .order_by(desc(PriceHistory.changed_at))
            .limit(1)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
