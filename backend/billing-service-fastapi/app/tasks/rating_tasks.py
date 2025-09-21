"""
Supplier rating calculation and management tasks
"""
import structlog
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.core.database import AsyncSessionLocal
from app.models.supplier_rating import SupplierRating
from app.models.billing_transaction import BillingTransaction
from app.integrations.order_service_client import OrderServiceClient
from app.integrations.supplier_service_client import SupplierServiceClient

logger = structlog.get_logger()


class SupplierRatingManager:
    """
    Supplier rating calculation and management system
    """
    
    # Rating tier thresholds
    RATING_TIERS = {
        "bronze": {"min_score": 3.0, "max_score": 3.5, "discount": 0.05},
        "silver": {"min_score": 3.5, "max_score": 4.0, "discount": 0.10},
        "gold": {"min_score": 4.0, "max_score": 4.5, "discount": 0.15},
        "platinum": {"min_score": 4.5, "max_score": 5.0, "discount": 0.20}
    }
    
    # Rating weight factors
    RATING_WEIGHTS = {
        "fulfillment_rate": 0.25,      # Order fulfillment rate
        "on_time_delivery": 0.25,      # On-time delivery rate
        "quality_score": 0.20,         # Product quality score
        "customer_satisfaction": 0.15,  # Customer satisfaction score
        "response_time": 0.15          # Response time score
    }
    
    def __init__(self):
        self.order_client = OrderServiceClient()
        self.supplier_client = SupplierServiceClient()
    
    async def calculate_supplier_rating(self, supplier_id: str, rating_period: str = None) -> Dict[str, Any]:
        """
        Calculate comprehensive supplier rating based on performance metrics
        """
        try:
            if not rating_period:
                rating_period = (datetime.now() - timedelta(days=30)).strftime("%Y-%m")
            
            async with AsyncSessionLocal() as session:
                logger.info("Calculating supplier rating", 
                           supplier_id=supplier_id, 
                           rating_period=rating_period)
                
                # Calculate individual metrics
                fulfillment_rate = await self._calculate_fulfillment_rate(supplier_id, rating_period)
                on_time_delivery = await self._calculate_on_time_delivery_rate(supplier_id, rating_period)
                quality_score = await self._calculate_quality_score(session, supplier_id, rating_period)
                customer_satisfaction = await self._calculate_customer_satisfaction(supplier_id, rating_period)
                response_time_score = await self._calculate_response_time_score(supplier_id, rating_period)
                
                # Calculate weighted overall score
                overall_score = (
                    fulfillment_rate * self.RATING_WEIGHTS["fulfillment_rate"] +
                    on_time_delivery * self.RATING_WEIGHTS["on_time_delivery"] +
                    quality_score * self.RATING_WEIGHTS["quality_score"] +
                    customer_satisfaction * self.RATING_WEIGHTS["customer_satisfaction"] +
                    response_time_score * self.RATING_WEIGHTS["response_time"]
                )
                
                # Determine rating tier
                rating_tier = self._determine_rating_tier(overall_score)
                
                # Create or update supplier rating record
                rating_record = await self._create_rating_record(
                    session, supplier_id, rating_period, {
                        "overall_score": overall_score,
                        "fulfillment_rate": fulfillment_rate,
                        "on_time_delivery_rate": on_time_delivery,
                        "quality_score": quality_score,
                        "customer_satisfaction": customer_satisfaction,
                        "response_time_score": response_time_score,
                        "rating_tier": rating_tier
                    }
                )
                
                result = {
                    "supplier_id": supplier_id,
                    "rating_period": rating_period,
                    "overall_score": round(overall_score, 2),
                    "rating_tier": rating_tier,
                    "discount_rate": self.RATING_TIERS[rating_tier]["discount"],
                    "metrics": {
                        "fulfillment_rate": round(fulfillment_rate, 3),
                        "on_time_delivery_rate": round(on_time_delivery, 3),
                        "quality_score": round(quality_score, 2),
                        "customer_satisfaction": round(customer_satisfaction, 2),
                        "response_time_score": round(response_time_score, 2)
                    },
                    "rating_id": rating_record.id,
                    "calculated_at": datetime.now().isoformat()
                }
                
                logger.info("Supplier rating calculated", **result)
                return result
                
        except Exception as e:
            logger.error("Failed to calculate supplier rating", 
                        supplier_id=supplier_id, error=str(e))
            return {"error": str(e)}
    
    async def calculate_all_supplier_ratings(self, rating_period: str = None) -> Dict[str, Any]:
        """
        Calculate ratings for all active suppliers
        """
        try:
            if not rating_period:
                rating_period = (datetime.now() - timedelta(days=30)).strftime("%Y-%m")
            
            logger.info("Calculating ratings for all suppliers", rating_period=rating_period)
            
            # Get all active suppliers with orders in the rating period
            suppliers = await self.supplier_client.get_suppliers_with_orders(rating_period)
            
            results = {
                "calculated_ratings": 0,
                "failed_calculations": 0,
                "total_suppliers": len(suppliers),
                "rating_distribution": {
                    "bronze": 0,
                    "silver": 0,
                    "gold": 0,
                    "platinum": 0
                }
            }
            
            for supplier in suppliers:
                supplier_id = supplier.get("id")
                
                try:
                    rating_result = await self.calculate_supplier_rating(supplier_id, rating_period)
                    
                    if "error" not in rating_result:
                        results["calculated_ratings"] += 1
                        tier = rating_result.get("rating_tier")
                        if tier in results["rating_distribution"]:
                            results["rating_distribution"][tier] += 1
                    else:
                        results["failed_calculations"] += 1
                        
                except Exception as e:
                    logger.error("Failed to calculate supplier rating", 
                               supplier_id=supplier_id, error=str(e))
                    results["failed_calculations"] += 1
            
            logger.info("All supplier ratings calculated", **results)
            return results
            
        except Exception as e:
            logger.error("Failed to calculate all supplier ratings", error=str(e))
            return {"error": str(e)}
    
    async def update_rating_based_discounts(self) -> Dict[str, Any]:
        """
        Update commission discounts based on latest supplier ratings
        """
        try:
            async with AsyncSessionLocal() as session:
                logger.info("Updating rating-based commission discounts")
                
                # Get all current supplier ratings
                current_ratings = await session.execute(
                    session.query(SupplierRating)
                    .filter(SupplierRating.is_active == True)
                    .filter(SupplierRating.rating_date >= datetime.now() - timedelta(days=60))
                )
                
                results = {
                    "updated_suppliers": 0,
                    "failed_updates": 0,
                    "discount_changes": []
                }
                
                for rating in current_ratings:
                    try:
                        # Get discount rate for rating tier
                        discount_rate = self.RATING_TIERS.get(rating.rating_tier, {}).get("discount", 0)
                        
                        # Update supplier's discount rate
                        await self.supplier_client.update_supplier_discount_rate(
                            rating.supplier_id, discount_rate
                        )
                        
                        results["updated_suppliers"] += 1
                        results["discount_changes"].append({
                            "supplier_id": rating.supplier_id,
                            "rating_tier": rating.rating_tier,
                            "discount_rate": discount_rate
                        })
                        
                    except Exception as e:
                        logger.error("Failed to update supplier discount", 
                                   supplier_id=rating.supplier_id, error=str(e))
                        results["failed_updates"] += 1
                
                logger.info("Rating-based discount update completed", **results)
                return results
                
        except Exception as e:
            logger.error("Failed to update rating-based discounts", error=str(e))
            return {"error": str(e)}
    
    async def generate_rating_improvement_recommendations(self, supplier_id: str) -> Dict[str, Any]:
        """
        Generate recommendations for supplier rating improvement
        """
        try:
            async with AsyncSessionLocal() as session:
                logger.info("Generating rating improvement recommendations", supplier_id=supplier_id)
                
                # Get latest rating
                latest_rating = await session.execute(
                    session.query(SupplierRating)
                    .filter(SupplierRating.supplier_id == supplier_id)
                    .filter(SupplierRating.is_active == True)
                    .order_by(SupplierRating.rating_date.desc())
                    .limit(1)
                )
                
                rating = latest_rating.first()
                if not rating:
                    return {"error": "No rating found for supplier"}
                
                recommendations = []
                
                # Analyze each metric and provide recommendations
                if rating.fulfillment_rate < 0.95:  # Less than 95%
                    recommendations.append({
                        "metric": "fulfillment_rate",
                        "current_score": rating.fulfillment_rate,
                        "target_score": 0.95,
                        "impact": "high",
                        "recommendations": [
                            "確保充足庫存水平避免缺貨",
                            "建立預警系統監控庫存狀況",
                            "與上游供應商建立穩定合作關係"
                        ]
                    })
                
                if rating.on_time_delivery_rate < 0.90:  # Less than 90%
                    recommendations.append({
                        "metric": "on_time_delivery_rate",
                        "current_score": rating.on_time_delivery_rate,
                        "target_score": 0.90,
                        "impact": "high",
                        "recommendations": [
                            "優化物流配送流程",
                            "與可靠配送夥伴合作",
                            "提前安排配送計劃"
                        ]
                    })
                
                if rating.quality_score < 4.0:  # Less than 4.0
                    recommendations.append({
                        "metric": "quality_score",
                        "current_score": rating.quality_score,
                        "target_score": 4.0,
                        "impact": "medium",
                        "recommendations": [
                            "加強品質控制流程",
                            "定期檢查產品品質",
                            "收集客戶反饋改善產品"
                        ]
                    })
                
                if rating.customer_satisfaction < 4.0:  # Less than 4.0
                    recommendations.append({
                        "metric": "customer_satisfaction",
                        "current_score": rating.customer_satisfaction,
                        "target_score": 4.0,
                        "impact": "medium",
                        "recommendations": [
                            "改善客戶服務流程",
                            "快速回應客戶問題",
                            "提供完整產品資訊"
                        ]
                    })
                
                if rating.response_time_score < 4.0:  # Less than 4.0
                    recommendations.append({
                        "metric": "response_time_score",
                        "current_score": rating.response_time_score,
                        "target_score": 4.0,
                        "impact": "low",
                        "recommendations": [
                            "縮短訂單確認時間",
                            "建立自動化回覆系統",
                            "指派專人處理訂單"
                        ]
                    })
                
                # Calculate potential rating improvement
                next_tier = self._get_next_rating_tier(rating.rating_tier)
                potential_discount = 0
                if next_tier:
                    potential_discount = self.RATING_TIERS[next_tier]["discount"] - self.RATING_TIERS[rating.rating_tier]["discount"]
                
                result = {
                    "supplier_id": supplier_id,
                    "current_rating": {
                        "tier": rating.rating_tier,
                        "score": rating.overall_score,
                        "discount": self.RATING_TIERS[rating.rating_tier]["discount"]
                    },
                    "next_tier": next_tier,
                    "potential_discount_increase": potential_discount,
                    "recommendations": recommendations,
                    "generated_at": datetime.now().isoformat()
                }
                
                logger.info("Rating improvement recommendations generated", 
                           supplier_id=supplier_id, 
                           recommendations_count=len(recommendations))
                return result
                
        except Exception as e:
            logger.error("Failed to generate rating recommendations", 
                        supplier_id=supplier_id, error=str(e))
            return {"error": str(e)}
    
    # Helper methods
    
    async def _calculate_fulfillment_rate(self, supplier_id: str, period: str) -> float:
        """Calculate order fulfillment rate"""
        try:
            orders_data = await self.order_client.get_supplier_order_stats(supplier_id, period)
            total_orders = orders_data.get("total_orders", 0)
            fulfilled_orders = orders_data.get("fulfilled_orders", 0)
            
            if total_orders == 0:
                return 0.0
            
            return fulfilled_orders / total_orders
            
        except Exception as e:
            logger.error("Failed to calculate fulfillment rate", error=str(e))
            return 0.0
    
    async def _calculate_on_time_delivery_rate(self, supplier_id: str, period: str) -> float:
        """Calculate on-time delivery rate"""
        try:
            delivery_data = await self.order_client.get_supplier_delivery_stats(supplier_id, period)
            total_deliveries = delivery_data.get("total_deliveries", 0)
            on_time_deliveries = delivery_data.get("on_time_deliveries", 0)
            
            if total_deliveries == 0:
                return 0.0
            
            return on_time_deliveries / total_deliveries
            
        except Exception as e:
            logger.error("Failed to calculate on-time delivery rate", error=str(e))
            return 0.0
    
    async def _calculate_quality_score(self, session: Session, supplier_id: str, period: str) -> float:
        """Calculate average quality score from billing transactions"""
        try:
            result = await session.execute(
                session.query(func.avg(BillingTransaction.quality_score))
                .filter(BillingTransaction.supplier_id == supplier_id)
                .filter(BillingTransaction.billing_period == period)
                .filter(BillingTransaction.quality_score.isnot(None))
            )
            
            avg_score = result.scalar()
            return float(avg_score) if avg_score else 3.0  # Default score
            
        except Exception as e:
            logger.error("Failed to calculate quality score", error=str(e))
            return 3.0
    
    async def _calculate_customer_satisfaction(self, supplier_id: str, period: str) -> float:
        """Calculate customer satisfaction score"""
        try:
            satisfaction_data = await self.order_client.get_supplier_satisfaction_stats(supplier_id, period)
            return satisfaction_data.get("average_rating", 3.0)
            
        except Exception as e:
            logger.error("Failed to calculate customer satisfaction", error=str(e))
            return 3.0
    
    async def _calculate_response_time_score(self, supplier_id: str, period: str) -> float:
        """Calculate response time score"""
        try:
            response_data = await self.order_client.get_supplier_response_stats(supplier_id, period)
            avg_response_time = response_data.get("average_response_time", 60)  # in minutes
            
            # Convert response time to score (faster = higher score)
            if avg_response_time <= 5:
                return 5.0
            elif avg_response_time <= 15:
                return 4.5
            elif avg_response_time <= 30:
                return 4.0
            elif avg_response_time <= 60:
                return 3.5
            else:
                return 3.0
                
        except Exception as e:
            logger.error("Failed to calculate response time score", error=str(e))
            return 3.0
    
    def _determine_rating_tier(self, overall_score: float) -> str:
        """Determine rating tier based on overall score"""
        for tier, thresholds in self.RATING_TIERS.items():
            if thresholds["min_score"] <= overall_score < thresholds["max_score"]:
                return tier
        
        # Default to bronze if score is below minimum
        return "bronze"
    
    def _get_next_rating_tier(self, current_tier: str) -> Optional[str]:
        """Get next rating tier for improvement recommendations"""
        tier_order = ["bronze", "silver", "gold", "platinum"]
        try:
            current_index = tier_order.index(current_tier)
            if current_index < len(tier_order) - 1:
                return tier_order[current_index + 1]
        except ValueError:
            pass
        return None
    
    async def _create_rating_record(self, session: Session, supplier_id: str, period: str, metrics: Dict[str, Any]) -> SupplierRating:
        """Create supplier rating record"""
        try:
            # Deactivate previous ratings
            await session.execute(
                session.query(SupplierRating)
                .filter(SupplierRating.supplier_id == supplier_id)
                .update({"is_active": False})
            )
            
            # Create new rating record
            rating = SupplierRating(
                supplier_id=supplier_id,
                rating_period=period,
                overall_score=Decimal(str(metrics["overall_score"])),
                fulfillment_rate=Decimal(str(metrics["fulfillment_rate"])),
                on_time_delivery_rate=Decimal(str(metrics["on_time_delivery_rate"])),
                quality_score=Decimal(str(metrics["quality_score"])),
                customer_satisfaction=Decimal(str(metrics["customer_satisfaction"])),
                response_time_score=Decimal(str(metrics["response_time_score"])),
                rating_tier=metrics["rating_tier"],
                rating_date=datetime.now(),
                is_active=True,
                created_by="system",
                metadata={"calculation_details": metrics}
            )
            
            session.add(rating)
            await session.commit()
            
            return rating
            
        except Exception as e:
            logger.error("Failed to create rating record", error=str(e))
            raise


# Task functions
rating_manager = SupplierRatingManager()

async def calculate_supplier_rating_task(supplier_id: str, rating_period: str = None) -> Dict[str, Any]:
    """Background task to calculate individual supplier rating"""
    return await rating_manager.calculate_supplier_rating(supplier_id, rating_period)

async def calculate_all_supplier_ratings_task(rating_period: str = None) -> Dict[str, Any]:
    """Background task to calculate all supplier ratings"""
    return await rating_manager.calculate_all_supplier_ratings(rating_period)

async def update_rating_discounts_task() -> Dict[str, Any]:
    """Background task to update rating-based discounts"""
    return await rating_manager.update_rating_based_discounts()

async def generate_rating_recommendations_task(supplier_id: str) -> Dict[str, Any]:
    """Background task to generate rating improvement recommendations"""
    return await rating_manager.generate_rating_improvement_recommendations(supplier_id)