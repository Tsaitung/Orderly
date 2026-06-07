"""
SupplierSKUService - 供應商 SKU 價格服務
提供真實的供應商-SKU 價格查詢、比較、管理功能
"""
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc, asc
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
import structlog

from app.modules.products.models.supplier_sku import SupplierSKU
from app.modules.products.models.sku_simple import ProductSKU
from app.modules.products.models.product import Product

logger = structlog.get_logger()


class SupplierSKUService:
    """供應商 SKU 服務"""

    @staticmethod
    async def get_sku_suppliers(
        db: AsyncSession,
        sku_id: str,
        active_only: bool = True
    ) -> List[Dict[str, Any]]:
        """
        獲取 SKU 的所有供應商及其價格

        Args:
            db: 資料庫會話
            sku_id: ProductSKU ID
            active_only: 僅返回有效供應商

        Returns:
            供應商列表，包含價格和績效資訊
        """
        # 先獲取 ProductSKU
        sku_result = await db.execute(
            select(ProductSKU).where(ProductSKU.id == sku_id)
        )
        product_sku = sku_result.scalar_one_or_none()

        if not product_sku:
            raise HTTPException(status_code=404, detail=f"SKU ID '{sku_id}' 不存在")

        # 查詢關聯的 SupplierSKU
        query = select(SupplierSKU).where(SupplierSKU.sku_id == sku_id)
        if active_only:
            query = query.where(SupplierSKU.is_active == True)
        query = query.order_by(SupplierSKU.is_preferred.desc(), SupplierSKU.supplier_price.asc())

        result = await db.execute(query)
        supplier_skus = result.scalars().all()

        suppliers = []
        for ss in supplier_skus:
            suppliers.append({
                "supplierSkuId": ss.id,
                "supplierId": ss.supplier_id,
                "supplierSkuCode": ss.supplier_sku_code,
                "supplierName": ss.supplier_name_for_product,
                "price": float(ss.supplier_price) if ss.supplier_price else None,
                "pricingTiers": ss.pricing_tiers or [],
                "bulkDiscount": {
                    "threshold": ss.bulk_discount_threshold,
                    "rate": float(ss.bulk_discount_rate) if ss.bulk_discount_rate else None
                } if ss.bulk_discount_threshold else None,
                "leadTimeDays": ss.lead_time_days,
                "minimumOrderQuantity": ss.minimum_order_quantity,
                "availabilityStatus": ss.availability_status,
                "isPreferred": ss.is_preferred,
                "qualityScore": float(ss.quality_score) if ss.quality_score else None,
                "deliveryScore": float(ss.delivery_score) if ss.delivery_score else None,
                "serviceScore": float(ss.service_score) if ss.service_score else None,
                "overallScore": float(ss.overall_score) if ss.overall_score else None,
                "certifications": ss.certifications or [],
                "contractEndDate": ss.contract_end_date.isoformat() if ss.contract_end_date else None,
                "isActive": ss.is_active
            })

        return suppliers

    @staticmethod
    async def compare_supplier_prices(
        db: AsyncSession,
        sku_id: str,
        quantity: float = 1
    ) -> Dict[str, Any]:
        """
        比較 SKU 的多供應商價格

        Args:
            db: 資料庫會話
            sku_id: ProductSKU ID
            quantity: 購買數量（用於計算階梯價格）

        Returns:
            價格比較結果，包含最佳供應商推薦
        """
        suppliers = await SupplierSKUService.get_sku_suppliers(db, sku_id, active_only=True)

        if not suppliers:
            return {
                "skuId": sku_id,
                "quantity": quantity,
                "suppliers": [],
                "recommendation": None,
                "message": "此 SKU 目前沒有可用的供應商"
            }

        # 計算每個供應商的有效價格
        comparisons = []
        for supplier in suppliers:
            effective_price = supplier["price"]
            applied_tier = None

            # 檢查階梯價格
            if supplier["pricingTiers"]:
                for tier in sorted(supplier["pricingTiers"], key=lambda x: x.get('min_qty', 0), reverse=True):
                    if quantity >= tier.get('min_qty', 0):
                        effective_price = tier.get('price', effective_price)
                        applied_tier = tier
                        break

            # 檢查批量折扣
            elif supplier["bulkDiscount"] and supplier["bulkDiscount"]["threshold"]:
                if quantity >= supplier["bulkDiscount"]["threshold"]:
                    discount = effective_price * (supplier["bulkDiscount"]["rate"] or 0)
                    effective_price = effective_price - discount
                    applied_tier = {
                        "type": "bulk_discount",
                        "threshold": supplier["bulkDiscount"]["threshold"],
                        "rate": supplier["bulkDiscount"]["rate"]
                    }

            total_cost = effective_price * quantity if effective_price else 0

            comparisons.append({
                "supplierId": supplier["supplierId"],
                "supplierSkuCode": supplier["supplierSkuCode"],
                "supplierName": supplier["supplierName"],
                "basePrice": supplier["price"],
                "effectivePrice": effective_price,
                "totalCost": round(total_cost, 2),
                "appliedTier": applied_tier,
                "leadTimeDays": supplier["leadTimeDays"],
                "minimumOrderQuantity": supplier["minimumOrderQuantity"],
                "overallScore": supplier["overallScore"],
                "isPreferred": supplier["isPreferred"],
                "meetsMinimum": quantity >= (supplier["minimumOrderQuantity"] or 1)
            })

        # 按總成本排序
        comparisons.sort(key=lambda x: x["totalCost"] if x["totalCost"] else float('inf'))

        # 推薦最佳供應商（考慮價格、品質、交期）
        best_supplier = None
        for comp in comparisons:
            if comp["meetsMinimum"]:
                best_supplier = comp
                break

        # 計算價格範圍
        valid_prices = [c["totalCost"] for c in comparisons if c["totalCost"] > 0]
        price_range = {
            "min": min(valid_prices) if valid_prices else 0,
            "max": max(valid_prices) if valid_prices else 0,
            "avg": sum(valid_prices) / len(valid_prices) if valid_prices else 0
        }

        return {
            "skuId": sku_id,
            "quantity": quantity,
            "suppliers": comparisons,
            "priceRange": price_range,
            "recommendation": best_supplier,
            "totalSuppliers": len(comparisons),
            "suppliersWithStock": len([c for c in comparisons if c["meetsMinimum"]])
        }

    @staticmethod
    async def get_supplier_performance_matrix(
        db: AsyncSession,
        supplier_ids: Optional[List[str]] = None,
        category_id: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        獲取供應商績效矩陣

        Args:
            db: 資料庫會話
            supplier_ids: 篩選特定供應商
            category_id: 篩選特定類別
            limit: 返回數量限制

        Returns:
            供應商績效列表
        """
        query = select(SupplierSKU).where(SupplierSKU.is_active == True)

        if supplier_ids:
            query = query.where(SupplierSKU.supplier_id.in_(supplier_ids))

        result = await db.execute(query.limit(limit * 10))  # 多取一些用於聚合
        supplier_skus = result.scalars().all()

        # 按供應商聚合
        supplier_stats = {}
        for ss in supplier_skus:
            sid = ss.supplier_id
            if sid not in supplier_stats:
                supplier_stats[sid] = {
                    "supplierId": sid,
                    "supplierName": ss.supplier_name_for_product,
                    "skuCount": 0,
                    "avgPrice": 0,
                    "totalPriceSum": 0,
                    "qualityScores": [],
                    "deliveryScores": [],
                    "serviceScores": [],
                    "preferredCount": 0,
                    "certifications": set()
                }

            stats = supplier_stats[sid]
            stats["skuCount"] += 1
            if ss.supplier_price:
                stats["totalPriceSum"] += float(ss.supplier_price)
            if ss.quality_score:
                stats["qualityScores"].append(float(ss.quality_score))
            if ss.delivery_score:
                stats["deliveryScores"].append(float(ss.delivery_score))
            if ss.service_score:
                stats["serviceScores"].append(float(ss.service_score))
            if ss.is_preferred:
                stats["preferredCount"] += 1
            for cert in (ss.certifications or []):
                stats["certifications"].add(cert)

        # 計算平均值和最終結果
        performance_matrix = []
        for sid, stats in supplier_stats.items():
            avg_quality = sum(stats["qualityScores"]) / len(stats["qualityScores"]) if stats["qualityScores"] else None
            avg_delivery = sum(stats["deliveryScores"]) / len(stats["deliveryScores"]) if stats["deliveryScores"] else None
            avg_service = sum(stats["serviceScores"]) / len(stats["serviceScores"]) if stats["serviceScores"] else None

            overall = None
            if avg_quality and avg_delivery and avg_service:
                overall = (avg_quality + avg_delivery + avg_service) / 3

            performance_matrix.append({
                "supplierId": sid,
                "supplierName": stats["supplierName"],
                "skuCount": stats["skuCount"],
                "avgPrice": round(stats["totalPriceSum"] / stats["skuCount"], 2) if stats["skuCount"] > 0 else None,
                "avgQualityScore": round(avg_quality, 2) if avg_quality else None,
                "avgDeliveryScore": round(avg_delivery, 2) if avg_delivery else None,
                "avgServiceScore": round(avg_service, 2) if avg_service else None,
                "overallScore": round(overall, 2) if overall else None,
                "preferredRate": round(stats["preferredCount"] / stats["skuCount"] * 100, 1) if stats["skuCount"] > 0 else 0,
                "certifications": list(stats["certifications"])
            })

        # 按整體評分排序
        performance_matrix.sort(key=lambda x: x["overallScore"] if x["overallScore"] else 0, reverse=True)

        return performance_matrix[:limit]

    @staticmethod
    async def get_price_trends(
        db: AsyncSession,
        sku_id: str,
        supplier_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        獲取 SKU 的價格趨勢（需要 price_history 表支援）

        此方法返回基本結構，實際趨勢數據需要 PriceHistory 整合
        """
        suppliers = await SupplierSKUService.get_sku_suppliers(db, sku_id)

        if supplier_id:
            suppliers = [s for s in suppliers if s["supplierId"] == supplier_id]

        current_prices = [
            {
                "supplierId": s["supplierId"],
                "supplierName": s["supplierName"],
                "currentPrice": s["price"],
                "isPreferred": s["isPreferred"]
            }
            for s in suppliers
        ]

        return {
            "skuId": sku_id,
            "period": f"last_{days}_days",
            "currentPrices": current_prices,
            "trend": "stable",  # TODO: 整合 PriceHistory 進行趨勢分析
            "message": "價格趨勢分析需要整合 PriceHistory 資料"
        }
