"""
SKU Analytics API endpoints
Provides analytics, rankings, and performance metrics for SKU management
"""
import random
import hashlib
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, and_, or_, func, text

from app.core.database import get_async_session
from app.models.sku_simple import ProductSKU
from app.models.product import Product

router = APIRouter()


def generate_mock_analytics(sku_id: str, sku_code: str, category_name: str) -> Dict[str, Any]:
    """
    Generate consistent mock analytics data based on SKU ID
    Uses hash to ensure same SKU always gets same analytics
    """
    # Use SKU ID to generate consistent mock data
    seed = int(hashlib.md5(sku_id.encode()).hexdigest()[:8], 16)
    random.seed(seed)
    
    # Generate realistic metrics based on category
    category_multipliers = {
        "蔬菜": {"base_sales": 150, "price_range": (30, 120), "activity_boost": 1.3},
        "水果": {"base_sales": 120, "price_range": (50, 200), "activity_boost": 1.2},
        "肉品": {"base_sales": 80, "price_range": (200, 800), "activity_boost": 1.0},
        "海鮮": {"base_sales": 60, "price_range": (150, 600), "activity_boost": 0.9},
        "乳製品": {"base_sales": 100, "price_range": (80, 300), "activity_boost": 1.1},
        "調味料": {"base_sales": 40, "price_range": (20, 150), "activity_boost": 0.7},
        "米麵糧食": {"base_sales": 200, "price_range": (40, 200), "activity_boost": 1.4},
        "罐頭食品": {"base_sales": 90, "price_range": (30, 180), "activity_boost": 0.8},
        "冷凍食品": {"base_sales": 110, "price_range": (60, 300), "activity_boost": 1.0},
        "飲料": {"base_sales": 180, "price_range": (25, 150), "activity_boost": 1.5},
        "零食": {"base_sales": 160, "price_range": (20, 100), "activity_boost": 1.3},
        "其他": {"base_sales": 70, "price_range": (30, 200), "activity_boost": 0.9}
    }
    
    # Get category-specific multipliers
    cat_data = category_multipliers.get(category_name, category_multipliers["其他"])
    
    # Generate consistent metrics
    base_monthly_sales = random.randint(
        int(cat_data["base_sales"] * 0.5), 
        int(cat_data["base_sales"] * 1.5)
    )
    
    unit_price = random.randint(*cat_data["price_range"])
    monthly_revenue = base_monthly_sales * unit_price
    
    # Calculate activity level
    activity_score = base_monthly_sales * cat_data["activity_boost"]
    if activity_score > 150:
        activity_level = "high"
        activity_color = "green"
    elif activity_score > 80:
        activity_level = "medium" 
        activity_color = "yellow"
    else:
        activity_level = "low"
        activity_color = "orange"
    
    # Generate performance metrics
    fulfillment_rate = round(random.uniform(88.0, 99.5), 1)
    quality_score = round(random.uniform(4.0, 5.0), 1)
    growth_rate = round(random.uniform(-15.0, 35.0), 1)
    
    return {
        "monthly_sales_units": base_monthly_sales,
        "monthly_revenue": monthly_revenue,
        "unit_price": unit_price,
        "weekly_sales": int(base_monthly_sales * 0.25),
        "daily_sales": int(base_monthly_sales * 0.033),
        "activity_level": activity_level,
        "activity_color": activity_color,
        "activity_score": int(activity_score),
        "fulfillment_rate": fulfillment_rate,
        "quality_score": quality_score,
        "growth_rate": growth_rate,
        "total_orders": random.randint(20, 150),
        "unique_customers": random.randint(15, 80),
        "avg_order_size": round(random.uniform(1.5, 8.0), 1),
        "last_order_date": datetime.now() - timedelta(days=random.randint(1, 30)),
        "trend_direction": "up" if growth_rate > 5 else "down" if growth_rate < -5 else "stable"
    }


def generate_mock_supplier_data(sku_id: str) -> Dict[str, Any]:
    """
    Generate mock supplier data for SKU
    Maps SKUs to specific suppliers based on categories
    """
    # Mock supplier mapping based on SKU hash
    seed = int(hashlib.md5(sku_id.encode()).hexdigest()[:8], 16)
    random.seed(seed)
    
    # List of 7 Taiwan suppliers (matching our existing supplier data)
    suppliers = [
        {
            "id": "豐年農場",
            "name": "豐年農場股份有限公司",
            "contact": "豐年農場股份有限公司 負責人",
            "phone": "+886-8-778-2345",
            "specialties": ["有機蔬菜", "熱帶水果", "香草"]
        },
        {
            "id": "嘉義縣農會",
            "name": "嘉義縣農會",
            "contact": "嘉義縣農會 負責人", 
            "phone": "+886-5-362-4301",
            "specialties": ["稻米", "蔬菜", "水果", "農特產品"]
        },
        {
            "id": "大昌華嘉",
            "name": "大昌華嘉股份有限公司",
            "contact": "大昌華嘉股份有限公司 負責人",
            "phone": "+886-2-8752-6888", 
            "specialties": ["冷凍海鮮", "進口肉品", "乳製品"]
        },
        {
            "id": "統一企業",
            "name": "統一企業股份有限公司",
            "contact": "統一企業股份有限公司 負責人",
            "phone": "+886-6-243-3515",
            "specialties": ["飲料", "罐頭食品", "調味料"]
        },
        {
            "id": "義美食品",
            "name": "義美食品股份有限公司", 
            "contact": "義美食品股份有限公司 負責人",
            "phone": "+886-3-322-4121",
            "specialties": ["乳製品", "冷凍食品", "零食"]
        },
        {
            "id": "泰山企業",
            "name": "泰山企業股份有限公司",
            "contact": "泰山企業股份有限公司 負責人",
            "phone": "+886-2-2504-8888",
            "specialties": ["飲料", "調味料", "罐頭食品"]
        },
        {
            "id": "聯華食品",
            "name": "聯華食品工業股份有限公司",
            "contact": "聯華食品工業股份有限公司 負責人", 
            "phone": "+886-2-2508-2192",
            "specialties": ["零食", "米麵糧食", "調味料"]
        }
    ]
    
    # Select supplier based on hash
    supplier = suppliers[seed % len(suppliers)]
    
    # Generate supplier-specific metrics
    supplier_performance = {
        "delivery_time_avg": round(random.uniform(1.0, 4.0), 1),
        "quality_rating": round(random.uniform(4.0, 5.0), 1),
        "price_competitiveness": round(random.uniform(3.5, 5.0), 1),
        "availability_rate": round(random.uniform(90.0, 99.0), 1),
        "response_time_hours": round(random.uniform(0.5, 6.0), 1)
    }
    
    return {**supplier, "performance": supplier_performance}


@router.get("/analytics/skus")
async def get_sku_analytics(
    search: Optional[str] = Query(None, description="搜尋SKU代碼、產品名稱"),
    category: Optional[str] = Query(None, description="產品類別"),
    activity_level: Optional[str] = Query(None, description="活躍程度", regex="^(high|medium|low)$"),
    supplier: Optional[str] = Query(None, description="供應商篩選"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=100, description="每頁數量"),
    sort_by: str = Query("monthly_revenue", description="排序欄位"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="排序順序"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取SKU分析數據 - 包含供應商歸屬和活躍指標
    Enhanced SKU analytics with supplier attribution and activity metrics
    """
    try:
        # Build query with product and category joins
        query = select(ProductSKU).options(
            selectinload(ProductSKU.product).selectinload(Product.category)
        )
        
        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    ProductSKU.sku_code.ilike(search_term),
                    ProductSKU.name.ilike(search_term)
                )
            )
        
        # Category filter - join with product
        if category:
            query = query.join(Product).join(Product.category).where(
                Product.category.has(name=category)
            )
        
        # Execute query to get SKUs
        result = await db.execute(query)
        skus = result.scalars().all()
        
        # Generate analytics for each SKU
        sku_analytics = []
        for sku in skus:
            category_name = sku.product.category.name if sku.product and sku.product.category else "其他"
            analytics = generate_mock_analytics(sku.id, sku.sku_code, category_name)
            supplier_data = generate_mock_supplier_data(sku.id)
            
            # Apply activity level filter
            if activity_level and analytics["activity_level"] != activity_level:
                continue
                
            # Apply supplier filter  
            if supplier and supplier not in supplier_data["name"]:
                continue
            
            sku_item = {
                "id": sku.id,
                "sku_code": sku.sku_code,
                "name": sku.name,
                "is_active": sku.is_active,
                "weight": sku.weight,
                "package_type": sku.package_type,
                "pricing_method": sku.effective_pricing_method.value,
                "unit_price": analytics["unit_price"],
                "product": {
                    "id": sku.product.id if sku.product else None,
                    "name": sku.product.name if sku.product else "Unknown Product",
                    "category": category_name,
                    "brand": sku.product.brand if sku.product else None
                },
                "supplier": {
                    "id": supplier_data["id"],
                    "name": supplier_data["name"],
                    "contact": supplier_data["contact"],
                    "phone": supplier_data["phone"],
                    "performance": supplier_data["performance"]
                },
                "analytics": analytics
            }
            sku_analytics.append(sku_item)
        
        # Sort results
        sort_key = {
            "monthly_revenue": lambda x: x["analytics"]["monthly_revenue"],
            "monthly_sales": lambda x: x["analytics"]["monthly_sales_units"],  
            "activity_score": lambda x: x["analytics"]["activity_score"],
            "growth_rate": lambda x: x["analytics"]["growth_rate"],
            "quality_score": lambda x: x["analytics"]["quality_score"],
            "name": lambda x: x["name"],
            "created_at": lambda x: x["id"]  # fallback to ID
        }.get(sort_by, lambda x: x["analytics"]["monthly_revenue"])
        
        sku_analytics.sort(key=sort_key, reverse=(sort_order == "desc"))
        
        # Apply pagination
        total = len(sku_analytics)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_skus = sku_analytics[start_idx:end_idx]
        
        total_pages = (total + page_size - 1) // page_size
        
        return {
            "success": True,
            "data": paginated_skus,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "meta": {
                "total_skus": total,
                "activity_distribution": {
                    "high": len([s for s in sku_analytics if s["analytics"]["activity_level"] == "high"]),
                    "medium": len([s for s in sku_analytics if s["analytics"]["activity_level"] == "medium"]),
                    "low": len([s for s in sku_analytics if s["analytics"]["activity_level"] == "low"])
                },
                "top_suppliers": list(set([s["supplier"]["name"] for s in sku_analytics[:10]])),
                "total_revenue": sum([s["analytics"]["monthly_revenue"] for s in sku_analytics])
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get SKU analytics: {str(e)}"
        )


@router.get("/analytics/rankings") 
async def get_sku_rankings(
    period: str = Query("monthly", regex="^(daily|weekly|monthly)$", description="統計期間"),
    metric: str = Query("revenue", regex="^(revenue|sales|growth|quality)$", description="排名指標"),
    category: Optional[str] = Query(None, description="產品類別"),
    limit: int = Query(10, ge=1, le=50, description="排名數量"),
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取SKU排名 - 按不同指標和時間段
    Get SKU rankings by various metrics and time periods
    """
    try:
        # Get all SKUs with categories
        query = select(ProductSKU).options(
            selectinload(ProductSKU.product).selectinload(Product.category)
        ).where(ProductSKU.is_active == True)
        
        if category:
            query = query.join(Product).join(Product.category).where(
                Product.category.has(name=category)
            )
            
        result = await db.execute(query)
        skus = result.scalars().all()
        
        # Generate rankings
        rankings = []
        for sku in skus:
            category_name = sku.product.category.name if sku.product and sku.product.category else "其他"
            analytics = generate_mock_analytics(sku.id, sku.sku_code, category_name)
            supplier_data = generate_mock_supplier_data(sku.id)
            
            # Select ranking value based on metric
            ranking_value = {
                "revenue": analytics["monthly_revenue"],
                "sales": analytics["monthly_sales_units"],
                "growth": analytics["growth_rate"], 
                "quality": analytics["quality_score"]
            }[metric]
            
            rankings.append({
                "rank": 0,  # Will be set after sorting
                "sku_id": sku.id,
                "sku_code": sku.sku_code,
                "name": sku.name,
                "category": category_name,
                "supplier_name": supplier_data["name"],
                "value": ranking_value,
                "activity_level": analytics["activity_level"],
                "trend": analytics["trend_direction"]
            })
        
        # Sort by metric value
        rankings.sort(key=lambda x: x["value"], reverse=True)
        
        # Assign ranks and limit results
        for i, item in enumerate(rankings[:limit]):
            item["rank"] = i + 1
            
        return {
            "success": True,
            "data": rankings[:limit],
            "meta": {
                "period": period,
                "metric": metric,
                "category": category,
                "total_ranked": len(rankings),
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get SKU rankings: {str(e)}"
        )


@router.get("/analytics/supplier-matrix")
async def get_supplier_matrix(
    sku_ids: Optional[List[str]] = Query(None, description="SKU ID列表"),
    comparison_metrics: List[str] = Query(
        ["price", "quality", "delivery_time"], 
        description="比較指標"
    ),
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取多供應商SKU比較矩陣
    Get multi-supplier SKU comparison matrix
    """
    try:
        # Get specified SKUs or all active SKUs
        query = select(ProductSKU).options(
            selectinload(ProductSKU.product).selectinload(Product.category)
        ).where(ProductSKU.is_active == True)
        
        if sku_ids:
            query = query.where(ProductSKU.id.in_(sku_ids))
        else:
            # Limit to top 20 SKUs if no specific IDs provided
            query = query.limit(20)
            
        result = await db.execute(query)
        skus = result.scalars().all()
        
        # Generate comparison matrix
        matrix = []
        for sku in skus:
            category_name = sku.product.category.name if sku.product and sku.product.category else "其他"
            analytics = generate_mock_analytics(sku.id, sku.sku_code, category_name)
            supplier_data = generate_mock_supplier_data(sku.id)
            
            # Build comparison metrics
            comparison_data = {}
            if "price" in comparison_metrics:
                comparison_data["price"] = analytics["unit_price"]
            if "quality" in comparison_metrics:
                comparison_data["quality"] = supplier_data["performance"]["quality_rating"]
            if "delivery_time" in comparison_metrics:
                comparison_data["delivery_time"] = supplier_data["performance"]["delivery_time_avg"]
            if "availability" in comparison_metrics:
                comparison_data["availability"] = supplier_data["performance"]["availability_rate"]
                
            matrix.append({
                "sku_id": sku.id,
                "sku_code": sku.sku_code,
                "name": sku.name,
                "category": category_name,
                "supplier": {
                    "id": supplier_data["id"],
                    "name": supplier_data["name"]
                },
                "metrics": comparison_data,
                "activity_level": analytics["activity_level"]
            })
        
        return {
            "success": True,
            "data": matrix,
            "meta": {
                "total_skus": len(matrix),
                "comparison_metrics": comparison_metrics,
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get supplier matrix: {str(e)}"
        )


@router.get("/analytics/dashboard-stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_async_session)
):
    """
    獲取SKU儀表板統計數據
    Get SKU dashboard statistics for overview cards
    """
    try:
        # Get basic SKU counts
        total_query = select(func.count()).select_from(ProductSKU)
        total_result = await db.execute(total_query)
        total_skus = total_result.scalar()
        
        active_query = select(func.count()).select_from(ProductSKU).where(ProductSKU.is_active == True)
        active_result = await db.execute(active_query)
        active_skus = active_result.scalar()
        
        # Get SKUs with analytics to calculate aggregated metrics
        query = select(ProductSKU).options(
            selectinload(ProductSKU.product).selectinload(Product.category)
        ).where(ProductSKU.is_active == True)
        
        result = await db.execute(query)
        skus = result.scalars().all()
        
        # Calculate analytics aggregations
        total_revenue = 0
        total_sales = 0
        activity_distribution = {"high": 0, "medium": 0, "low": 0}
        supplier_set = set()
        
        for sku in skus:
            category_name = sku.product.category.name if sku.product and sku.product.category else "其他"
            analytics = generate_mock_analytics(sku.id, sku.sku_code, category_name)
            supplier_data = generate_mock_supplier_data(sku.id)
            
            total_revenue += analytics["monthly_revenue"]
            total_sales += analytics["monthly_sales_units"]
            activity_distribution[analytics["activity_level"]] += 1
            supplier_set.add(supplier_data["name"])
        
        return {
            "success": True,
            "data": {
                "overview": {
                    "total_skus": total_skus,
                    "active_skus": active_skus,
                    "inactive_skus": total_skus - active_skus,
                    "supplier_count": len(supplier_set),
                    "total_monthly_revenue": total_revenue,
                    "total_monthly_sales": total_sales,
                    "avg_revenue_per_sku": round(total_revenue / max(active_skus, 1), 2)
                },
                "activity_distribution": activity_distribution,
                "top_categories": _get_category_stats(skus),
                "growth_metrics": {
                    "revenue_growth": 18.5,  # Mock data
                    "sku_growth": 12.3,
                    "supplier_growth": 8.7
                },
                "alerts": {
                    "low_stock_count": 3,  # Mock
                    "expiring_soon": 5,    # Mock
                    "quality_issues": 1    # Mock
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dashboard stats: {str(e)}"
        )


def _get_category_stats(skus):
    """Helper function to calculate category statistics"""
    category_stats = {}
    
    for sku in skus:
        category_name = sku.product.category.name if sku.product and sku.product.category else "其他"
        analytics = generate_mock_analytics(sku.id, sku.sku_code, category_name)
        
        if category_name not in category_stats:
            category_stats[category_name] = {
                "name": category_name,
                "sku_count": 0,
                "total_revenue": 0,
                "total_sales": 0
            }
        
        category_stats[category_name]["sku_count"] += 1
        category_stats[category_name]["total_revenue"] += analytics["monthly_revenue"]
        category_stats[category_name]["total_sales"] += analytics["monthly_sales_units"]
    
    # Sort by revenue and return top 5
    sorted_categories = sorted(
        category_stats.values(), 
        key=lambda x: x["total_revenue"], 
        reverse=True
    )
    
    return sorted_categories[:5]