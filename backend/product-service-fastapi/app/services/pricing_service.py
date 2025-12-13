"""
PricingService - 價格計算服務
支援多種定價策略：UNIT、BULK、TIERED、VOLUME
"""
from typing import Optional, Dict, Any, List
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
import structlog

from app.models.sku_simple import ProductSKU, SKUPricingMethod

logger = structlog.get_logger()


class PriceCalculationResult:
    """價格計算結果"""

    def __init__(
        self,
        sku_id: str,
        quantity: float,
        unit_price: float,
        total_price: float,
        pricing_method: str,
        applied_tier: Optional[Dict[str, Any]] = None,
        discount_applied: bool = False,
        discount_amount: float = 0,
        original_unit_price: Optional[float] = None
    ):
        self.sku_id = sku_id
        self.quantity = quantity
        self.unit_price = unit_price
        self.total_price = total_price
        self.pricing_method = pricing_method
        self.applied_tier = applied_tier
        self.discount_applied = discount_applied
        self.discount_amount = discount_amount
        self.original_unit_price = original_unit_price or unit_price

    def to_dict(self) -> Dict[str, Any]:
        return {
            "skuId": self.sku_id,
            "quantity": self.quantity,
            "unitPrice": round(self.unit_price, 2),
            "totalPrice": round(self.total_price, 2),
            "pricingMethod": self.pricing_method,
            "appliedTier": self.applied_tier,
            "discountApplied": self.discount_applied,
            "discountAmount": round(self.discount_amount, 2),
            "originalUnitPrice": round(self.original_unit_price, 2),
            "savings": round(self.original_unit_price * self.quantity - self.total_price, 2) if self.discount_applied else 0
        }


class PricingService:
    """價格計算服務"""

    @staticmethod
    async def calculate_price(
        db: AsyncSession,
        sku_id: str,
        quantity: float
    ) -> PriceCalculationResult:
        """
        根據 SKU 的定價方式計算價格

        Args:
            db: 資料庫會話
            sku_id: SKU ID
            quantity: 購買數量

        Returns:
            PriceCalculationResult: 價格計算結果
        """
        # 獲取 SKU
        result = await db.execute(
            select(ProductSKU).where(ProductSKU.id == sku_id)
        )
        sku = result.scalar_one_or_none()

        if not sku:
            raise HTTPException(status_code=404, detail=f"SKU ID '{sku_id}' 不存在")

        if not sku.unit_price:
            raise HTTPException(status_code=400, detail=f"SKU '{sku_id}' 未設定單位價格")

        # 檢查最小訂購量
        if sku.min_order_quantity and quantity < sku.min_order_quantity:
            raise HTTPException(
                status_code=400,
                detail=f"數量 {quantity} 小於最小訂購量 {sku.min_order_quantity}"
            )

        # 根據定價方式計算
        pricing_method = sku.pricing_method or SKUPricingMethod.UNIT

        if pricing_method == SKUPricingMethod.TIERED:
            return await PricingService._calculate_tiered_price(sku, quantity)
        elif pricing_method == SKUPricingMethod.VOLUME:
            return await PricingService._calculate_volume_price(sku, quantity)
        elif pricing_method == SKUPricingMethod.BULK:
            return await PricingService._calculate_bulk_price(sku, quantity)
        else:
            # UNIT: 單位計價
            return PriceCalculationResult(
                sku_id=sku_id,
                quantity=quantity,
                unit_price=sku.unit_price,
                total_price=sku.unit_price * quantity,
                pricing_method="UNIT"
            )

    @staticmethod
    async def _calculate_tiered_price(
        sku: ProductSKU,
        quantity: float
    ) -> PriceCalculationResult:
        """
        階梯定價計算
        不同數量區間使用不同單價，所有數量使用同一個單價

        注意：pricing_tiers 欄位目前資料庫中不存在
        此功能暫時停用，直接使用基礎價格
        """
        base_price = sku.unit_price
        # 注意：pricing_tiers 欄位已從模型移除（資料庫中不存在）
        # 若未來需要此功能，請先透過 Alembic 遷移添加欄位
        pricing_tiers = []

        if not pricing_tiers:
            # 無階梯設定，使用基礎價格
            return PriceCalculationResult(
                sku_id=sku.id,
                quantity=quantity,
                unit_price=base_price,
                total_price=base_price * quantity,
                pricing_method="TIERED"
            )

        # 按 min_qty 排序（降序），找到適用的階層
        sorted_tiers = sorted(pricing_tiers, key=lambda x: x.get('min_qty', 0), reverse=True)
        applied_tier = None
        effective_price = base_price

        for tier in sorted_tiers:
            min_qty = tier.get('min_qty', 0)
            if quantity >= min_qty:
                effective_price = tier.get('price', base_price)
                applied_tier = tier
                break

        discount_applied = effective_price < base_price
        discount_amount = (base_price - effective_price) * quantity if discount_applied else 0

        logger.info(
            "tiered_price_calculated",
            sku_id=sku.id,
            quantity=quantity,
            base_price=base_price,
            effective_price=effective_price,
            applied_tier=applied_tier
        )

        return PriceCalculationResult(
            sku_id=sku.id,
            quantity=quantity,
            unit_price=effective_price,
            total_price=effective_price * quantity,
            pricing_method="TIERED",
            applied_tier=applied_tier,
            discount_applied=discount_applied,
            discount_amount=discount_amount,
            original_unit_price=base_price
        )

    @staticmethod
    async def _calculate_volume_price(
        sku: ProductSKU,
        quantity: float
    ) -> PriceCalculationResult:
        """
        量價定價計算（累進式）
        不同數量區間的部分使用不同單價（類似累進稅率）

        注意：pricing_tiers 欄位目前資料庫中不存在
        此功能暫時停用，直接使用基礎價格
        """
        base_price = sku.unit_price
        # 注意：pricing_tiers 欄位已從模型移除（資料庫中不存在）
        # 若未來需要此功能，請先透過 Alembic 遷移添加欄位
        pricing_tiers = []

        if not pricing_tiers:
            return PriceCalculationResult(
                sku_id=sku.id,
                quantity=quantity,
                unit_price=base_price,
                total_price=base_price * quantity,
                pricing_method="VOLUME"
            )

        # 按 min_qty 排序（升序）
        sorted_tiers = sorted(pricing_tiers, key=lambda x: x.get('min_qty', 0))

        total_price = 0.0
        remaining_qty = quantity
        applied_tiers = []

        for tier in sorted_tiers:
            if remaining_qty <= 0:
                break

            min_qty = tier.get('min_qty', 0)
            max_qty = tier.get('max_qty')
            tier_price = tier.get('price', base_price)

            if max_qty is None:
                # 無上限，剩餘全部使用此價格
                tier_qty = remaining_qty
            else:
                # 此階層可處理的數量
                tier_capacity = max_qty - min_qty + 1
                tier_qty = min(remaining_qty, tier_capacity)

            tier_total = tier_price * tier_qty
            total_price += tier_total
            remaining_qty -= tier_qty

            applied_tiers.append({
                "tier": tier,
                "quantity": tier_qty,
                "subtotal": tier_total
            })

        # 計算平均單價
        avg_unit_price = total_price / quantity if quantity > 0 else base_price
        discount_applied = avg_unit_price < base_price
        discount_amount = (base_price * quantity) - total_price if discount_applied else 0

        logger.info(
            "volume_price_calculated",
            sku_id=sku.id,
            quantity=quantity,
            base_price=base_price,
            total_price=total_price,
            avg_unit_price=avg_unit_price,
            applied_tiers=applied_tiers
        )

        return PriceCalculationResult(
            sku_id=sku.id,
            quantity=quantity,
            unit_price=avg_unit_price,
            total_price=total_price,
            pricing_method="VOLUME",
            applied_tier={"tiers": applied_tiers},
            discount_applied=discount_applied,
            discount_amount=discount_amount,
            original_unit_price=base_price
        )

    @staticmethod
    async def _calculate_bulk_price(
        sku: ProductSKU,
        quantity: float
    ) -> PriceCalculationResult:
        """
        批量折扣計算
        達到門檻數量後，全部數量享受折扣

        注意：bulk_discount_threshold 和 bulk_discount_rate 欄位目前資料庫中不存在
        此功能暫時停用，直接使用基礎價格
        """
        base_price = sku.unit_price
        # 注意：bulk_discount_threshold 和 bulk_discount_rate 欄位已從模型移除（資料庫中不存在）
        # 若未來需要此功能，請先透過 Alembic 遷移添加欄位
        threshold = None
        discount_rate = None

        if not threshold or not discount_rate:
            # 無批量折扣設定
            return PriceCalculationResult(
                sku_id=sku.id,
                quantity=quantity,
                unit_price=base_price,
                total_price=base_price * quantity,
                pricing_method="BULK"
            )

        if quantity >= threshold:
            # 達到門檻，應用折扣
            discount_amount_per_unit = base_price * discount_rate
            effective_price = base_price - discount_amount_per_unit
            total_price = effective_price * quantity
            discount_amount = discount_amount_per_unit * quantity

            logger.info(
                "bulk_discount_applied",
                sku_id=sku.id,
                quantity=quantity,
                threshold=threshold,
                discount_rate=discount_rate,
                effective_price=effective_price
            )

            return PriceCalculationResult(
                sku_id=sku.id,
                quantity=quantity,
                unit_price=effective_price,
                total_price=total_price,
                pricing_method="BULK",
                applied_tier={
                    "type": "bulk_discount",
                    "threshold": threshold,
                    "discount_rate": discount_rate,
                    "discount_per_unit": discount_amount_per_unit
                },
                discount_applied=True,
                discount_amount=discount_amount,
                original_unit_price=base_price
            )
        else:
            # 未達門檻
            return PriceCalculationResult(
                sku_id=sku.id,
                quantity=quantity,
                unit_price=base_price,
                total_price=base_price * quantity,
                pricing_method="BULK",
                applied_tier={
                    "type": "bulk_discount",
                    "threshold": threshold,
                    "discount_rate": discount_rate,
                    "message": f"還需 {threshold - quantity} 件可享 {discount_rate * 100}% 折扣"
                }
            )

    @staticmethod
    async def get_pricing_tiers(
        db: AsyncSession,
        sku_id: str
    ) -> Dict[str, Any]:
        """
        獲取 SKU 的定價階層資訊

        注意：pricing_tiers, bulk_discount_threshold, bulk_discount_rate 欄位
        目前資料庫中不存在，此方法返回預設空值
        """
        result = await db.execute(
            select(ProductSKU).where(ProductSKU.id == sku_id)
        )
        sku = result.scalar_one_or_none()

        if not sku:
            raise HTTPException(status_code=404, detail=f"SKU ID '{sku_id}' 不存在")

        return {
            "skuId": sku.id,
            "skuCode": sku.sku_code,
            "pricingMethod": sku.pricing_method.value if sku.pricing_method else "UNIT",
            "basePrice": sku.unit_price,
            "pricingUnit": sku.pricing_unit,
            # 注意：以下欄位已從模型移除（資料庫中不存在），返回預設值
            "pricingTiers": [],
            "bulkDiscount": None,
            "minOrderQuantity": sku.min_order_quantity,
            "quantityIncrement": sku.quantity_increment,
            "_notice": "pricing_tiers 和 bulkDiscount 功能尚未啟用"
        }

    @staticmethod
    async def update_pricing_tiers(
        db: AsyncSession,
        sku_id: str,
        pricing_tiers: List[Dict[str, Any]],
        bulk_discount_threshold: Optional[int] = None,
        bulk_discount_rate: Optional[float] = None
    ) -> ProductSKU:
        """
        更新 SKU 的定價階層

        注意：此功能目前已停用
        pricing_tiers, bulk_discount_threshold, bulk_discount_rate 欄位
        資料庫中不存在，需先透過 Alembic 遷移添加欄位
        """
        raise HTTPException(
            status_code=501,
            detail="定價階層功能尚未啟用，資料庫欄位不存在。請先執行相關遷移。"
        )
