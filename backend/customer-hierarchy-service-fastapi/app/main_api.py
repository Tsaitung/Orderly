"""
Customer Hierarchy Service - FastAPI Application with API Routes
Simplified version with only essential API endpoints
"""

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import structlog
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from app.core.config import settings
from app.core.database import init_db, close_db, check_db_health, get_async_session
from app.models import CustomerGroup, CustomerCompany, CustomerLocation, BusinessUnit
from app.schemas.activity import (
    ActivityQueryParams, PerformanceQueryParams, TrendQueryParams,
    DashboardMetricsResponse, ActivityAnalyticsResponse, 
    EntityActivitySummary, ActivityMetricsResponse, PerformanceRankingResponse,
    DashboardSummaryResponse, ActivityLevel, EntityType
)
from app.services.activity_service import ActivityScoringService
from app.services.mock_data_service import MockDataService
from app.services.cache_enhanced_service import EnhancedCacheService
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger(__name__)


# Global cache service instance
cache_service: Optional[EnhancedCacheService] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    global cache_service
    
    # Startup
    logger.info("Customer Hierarchy Service starting up", version=settings.API_VERSION)
    
    # Initialize database
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize database", error=str(e))
        raise
    
    # Initialize cache service
    try:
        async with get_async_session() as session:
            cache_service = EnhancedCacheService(session)
            await cache_service.initialize_redis()
            logger.info("Cache service initialized successfully")
    except Exception as e:
        logger.warning("Cache service initialization failed", error=str(e))
    
    yield
    
    # Shutdown
    logger.info("Customer Hierarchy Service shutting down")
    
    # Close cache service
    if cache_service:
        await cache_service.close_redis()
    
    await close_db()


# FastAPI application instance
app = FastAPI(
    title="Customer Hierarchy Service",
    description="4-Level Customer Hierarchy Management API",
    version=settings.API_VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoints
@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint"""
    cache_info = (
        cache_service.get_status()
        if cache_service
        else {"mode": settings.cache_mode, "state": "uninitialized", "has_connection": False}
    )
    return {
        "status": "healthy",
        "service": "customer-hierarchy-service",
        "version": settings.API_VERSION,
        "timestamp": str(time.time()),
        "cache": cache_info,
    }


@app.get("/health/detailed")
async def detailed_health_check() -> Dict[str, Any]:
    """Detailed health check with database"""
    health_status = {
        "status": "healthy",
        "service": "customer-hierarchy-service",
        "version": settings.API_VERSION,
        "timestamp": str(time.time()),
        "checks": {}
    }
    
    # Database health check
    try:
        db_healthy = await check_db_health()
        if db_healthy:
            health_status["checks"]["database"] = {"status": "healthy"}
        else:
            health_status["checks"]["database"] = {"status": "unhealthy"}
            health_status["status"] = "unhealthy"
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "unhealthy"

    # Cache health check (enhanced cache service)
    cache_info = (
        cache_service.get_status()
        if cache_service
        else {"mode": settings.cache_mode, "state": "uninitialized", "has_connection": False}
    )
    cache_state = cache_info.get("state", "unknown")
    cache_report = {"status": cache_state, **cache_info}
    health_status["checks"]["cache"] = cache_report
    if cache_info.get("mode") != "off" and cache_state not in {"ready", "disabled"}:
        # mark overall status degraded but not fully unhealthy unless already so
        if health_status["status"] == "healthy":
            health_status["status"] = "degraded"

    return health_status


# API v2 Hierarchy endpoints
@app.get("/api/v2/hierarchy/tree")
async def get_hierarchy_tree(
    include_inactive: bool = Query(False, description="Include inactive entities"),
    fast_mode: bool = Query(False, description="Use fast mode (groups only)")
):
    """Get complete hierarchy tree structure with fallback optimization"""
    try:
        async with get_async_session() as session:
            # Fast mode: return only top-level groups for performance
            if fast_mode:
                stmt = select(CustomerGroup).where(
                    CustomerGroup.is_active == True if not include_inactive else True
                )
                result = await session.execute(stmt)
                groups = result.scalars().all()
                
                tree_data = []
                for group in groups:
                    group_node = {
                        "id": group.id,
                        "name": group.name,
                        "type": "group",
                        "isActive": group.is_active,
                        "children": [],
                        "childrenCount": 0,
                        "loadChildrenOnDemand": True  # Indicate children should be loaded on demand
                    }
                    tree_data.append(group_node)
                
                return {
                    "data": tree_data,
                    "totalCount": len(tree_data),
                    "lastModified": str(time.time()),
                    "mode": "fast"
                }
            
            # Try full tree with timeout protection
            import asyncio
            
            async def load_full_tree():
                # Load complete hierarchy with relationships
                stmt = select(CustomerGroup).where(
                    CustomerGroup.is_active == True if not include_inactive else True
                ).options(
                    selectinload(CustomerGroup.companies).selectinload(CustomerCompany.locations).selectinload(CustomerLocation.business_units)
                )
                
                result = await session.execute(stmt)
                groups = result.scalars().all()
                
                # Convert to frontend format
                tree_data = []
                for group in groups:
                    group_node = {
                        "id": group.id,
                        "name": group.name,
                        "type": "group",
                        "isActive": group.is_active,
                        "children": [],
                        "childrenCount": 0
                    }
                    
                    for company in group.companies:
                        if not include_inactive and not company.is_active:
                            continue
                            
                        company_node = {
                            "id": company.id,
                            "name": company.name,
                            "type": "company",
                            "parentId": group.id,
                            "isActive": company.is_active,
                            "children": [],
                            "childrenCount": 0
                        }
                        
                        for location in company.locations:
                            if not include_inactive and not location.is_active:
                                continue
                                
                            location_node = {
                                "id": location.id,
                                "name": location.name,
                                "type": "location",
                                "parentId": company.id,
                                "isActive": location.is_active,
                                "children": [],
                                "childrenCount": 0
                            }
                            
                            for business_unit in location.business_units:
                                if not include_inactive and not business_unit.is_active:
                                    continue
                                    
                                bu_node = {
                                    "id": business_unit.id,
                                    "name": business_unit.name,
                                    "type": "business_unit",
                                    "parentId": location.id,
                                    "isActive": business_unit.is_active,
                                    "children": [],
                                    "childrenCount": 0
                                }
                                location_node["children"].append(bu_node)
                            
                            location_node["childrenCount"] = len(location_node["children"])
                            company_node["children"].append(location_node)
                        
                        company_node["childrenCount"] = len(company_node["children"])
                        group_node["children"].append(company_node)
                    
                    group_node["childrenCount"] = len(group_node["children"])
                    tree_data.append(group_node)
                
                return {
                    "data": tree_data,
                    "totalCount": len(tree_data),
                    "lastModified": str(time.time()),
                    "mode": "full"
                }
            
            # Try full load with 10-second timeout
            try:
                return await asyncio.wait_for(load_full_tree(), timeout=10.0)
            except asyncio.TimeoutError:
                logger.warning("Full tree loading timed out, falling back to fast mode")
                # Fallback to fast mode
                stmt = select(CustomerGroup).where(
                    CustomerGroup.is_active == True if not include_inactive else True
                )
                result = await session.execute(stmt)
                groups = result.scalars().all()
                
                tree_data = []
                for group in groups:
                    group_node = {
                        "id": group.id,
                        "name": group.name,
                        "type": "group",
                        "isActive": group.is_active,
                        "children": [],
                        "childrenCount": 0,
                        "loadChildrenOnDemand": True,
                        "fallbackMode": True
                    }
                    tree_data.append(group_node)
                
                return {
                    "data": tree_data,
                    "totalCount": len(tree_data),
                    "lastModified": str(time.time()),
                    "mode": "fallback"
                }
            
    except Exception as e:
        logger.error("Failed to get hierarchy tree", error=str(e))
        # Emergency fallback with minimal data
        try:
            async with get_async_session() as session:
                stmt = select(CustomerGroup).limit(10)  # Only get first 10 groups
                result = await session.execute(stmt)
                groups = result.scalars().all()
                
                tree_data = []
                for group in groups:
                    tree_data.append({
                        "id": group.id,
                        "name": group.name,
                        "type": "group",
                        "isActive": group.is_active,
                        "children": [],
                        "childrenCount": 0,
                        "emergency": True
                    })
                
                return {
                    "data": tree_data,
                    "totalCount": len(tree_data),
                    "lastModified": str(time.time()),
                    "mode": "emergency",
                    "error": "Partial data due to service issues"
                }
        except Exception as emergency_error:
            logger.error("Emergency fallback also failed", error=str(emergency_error))
            raise HTTPException(status_code=500, detail="Failed to fetch hierarchy tree")


@app.get("/api/v2/hierarchy/search")
async def search_hierarchy(
    q: str = Query(..., description="Search query"),
    limit: int = Query(50, description="Maximum results")
):
    """Search across the entire hierarchy"""
    try:
        if not q.strip():
            return {
                "results": [],
                "totalCount": 0,
                "queryTime": 0
            }
            
        start_time = time.time()
        search_query = f"%{q.lower()}%"
        results = []
        
        async with get_async_session() as session:
            # Search groups
            stmt = text("""
                SELECT id, name, 'group' as type, is_active 
                FROM customer_groups 
                WHERE LOWER(name) LIKE :query AND is_active = true
                LIMIT :limit
            """)
            group_results = await session.execute(stmt, {"query": search_query, "limit": limit})
            
            for row in group_results:
                results.append({
                    "entity": {
                        "id": row.id,
                        "name": row.name,
                        "type": row.type,
                        "isActive": row.is_active,
                        "children": [],
                        "childrenCount": 0
                    },
                    "score": 1.0,
                    "matchType": "name",
                    "breadcrumb": [row.name]
                })
            
            # Search companies with group names
            stmt = text("""
                SELECT c.id, c.name, 'company' as type, c.is_active, g.name as group_name
                FROM customer_companies c
                LEFT JOIN customer_groups g ON c.group_id = g.id
                WHERE LOWER(c.name) LIKE :query AND c.is_active = true
                LIMIT :limit
            """)
            company_results = await session.execute(stmt, {"query": search_query, "limit": limit})
            
            for row in company_results:
                breadcrumb = []
                if row.group_name:
                    breadcrumb.append(row.group_name)
                breadcrumb.append(row.name)
                
                results.append({
                    "entity": {
                        "id": row.id,
                        "name": row.name,
                        "type": row.type,
                        "isActive": row.is_active,
                        "children": [],
                        "childrenCount": 0
                    },
                    "score": 0.9,
                    "matchType": "name",
                    "breadcrumb": breadcrumb
                })
            
            # Limit total results
            results = results[:limit]
            
        query_time = time.time() - start_time
        
        return {
            "results": results,
            "totalCount": len(results),
            "queryTime": int(query_time * 1000)  # Convert to milliseconds
        }
        
    except Exception as e:
        logger.error("Failed to search hierarchy", error=str(e))
        raise HTTPException(status_code=500, detail="Search request failed")


# Activity and Analytics API endpoints
@app.get("/api/v2/hierarchy/metrics", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics(
    include_cache_info: bool = Query(False, description="Include cache information"),
    session: AsyncSession = Depends(get_async_session)
):
    """Get overall dashboard metrics and activity summary"""
    try:
        global cache_service
        
        # Use cached service if available, otherwise fallback to direct calculation
        if cache_service:
            # Initialize cache service with current session
            cache_service.session = session
            return await cache_service.get_dashboard_metrics_cached(include_cache_info)
        else:
            # Fallback to direct calculation
            logger.info("Cache service unavailable, calculating directly")
            
            activity_service = ActivityScoringService(session)
            activity_metrics = await activity_service.calculate_all_entity_scores()
            dashboard_summary = await activity_service.generate_dashboard_summary(activity_metrics)
            top_performers = await activity_service.get_top_performers(activity_metrics, limit=10)
            
            # Get other insights
            attention_needed = []
            growth_leaders = []
            recent_activity = []
            
            # Get entities that need attention (low scores)
            low_score_metrics = [m for m in activity_metrics if m.activity_score < 30]
            for metrics in sorted(low_score_metrics, key=lambda x: x.activity_score)[:5]:
                summary = await activity_service._convert_to_summary(metrics)
                attention_needed.append(summary)
            
            # Get growth leaders
            high_growth_metrics = [m for m in activity_metrics if m.growth_rate > 0]
            for metrics in sorted(high_growth_metrics, key=lambda x: x.growth_rate, reverse=True)[:5]:
                summary = await activity_service._convert_to_summary(metrics)
                growth_leaders.append(summary)
            
            # Get recently active entities
            recent_metrics = [m for m in activity_metrics if m.last_order_date]
            for metrics in sorted(recent_metrics, key=lambda x: x.last_order_date or datetime.min, reverse=True)[:5]:
                summary = await activity_service._convert_to_summary(metrics)
                recent_activity.append(summary)
            
            return DashboardMetricsResponse(
                summary=dashboard_summary,
                top_performers=top_performers,
                recent_activity=recent_activity,
                growth_leaders=growth_leaders,
                attention_needed=attention_needed,
                data_timestamp=datetime.now(timezone.utc),
                total_entities_analyzed=len(activity_metrics),
                cache_hit=False
            )
        
    except Exception as e:
        logger.error("Failed to get dashboard metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard metrics")


@app.get("/api/v2/hierarchy/activity", response_model=List[ActivityMetricsResponse])
async def get_activity_data(
    params: ActivityQueryParams = Depends(),
    session: AsyncSession = Depends(get_async_session)
):
    """Get activity scoring data with filtering options"""
    try:
        activity_service = ActivityScoringService(session)
        
        # Calculate activity metrics
        all_metrics = await activity_service.calculate_all_entity_scores()
        
        # Apply filters
        filtered_metrics = all_metrics
        
        if params.entity_type:
            filtered_metrics = [m for m in filtered_metrics if m.entity_type == params.entity_type.value]
        
        if params.activity_level:
            filtered_metrics = [m for m in filtered_metrics if m.activity_level == params.activity_level.value]
        
        if params.min_score is not None:
            filtered_metrics = [m for m in filtered_metrics if m.activity_score >= params.min_score]
        
        if params.max_score is not None:
            filtered_metrics = [m for m in filtered_metrics if m.activity_score <= params.max_score]
        
        # Sort by activity score (descending)
        filtered_metrics.sort(key=lambda m: m.activity_score, reverse=True)
        
        # Apply pagination
        start_idx = params.offset
        end_idx = start_idx + params.limit
        paginated_metrics = filtered_metrics[start_idx:end_idx]
        
        # Convert to response format
        response_data = [ActivityMetricsResponse.from_orm(m) for m in paginated_metrics]
        
        return response_data
        
    except Exception as e:
        logger.error("Failed to get activity data", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch activity data")


@app.get("/api/v2/hierarchy/analytics", response_model=ActivityAnalyticsResponse)
async def get_analytics_data(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    session: AsyncSession = Depends(get_async_session)
):
    """Get advanced analytics and business intelligence"""
    try:
        activity_service = ActivityScoringService(session)
        
        # Get all activity metrics
        all_metrics = await activity_service.calculate_all_entity_scores()
        
        # Filter by entity type if specified
        if entity_type:
            filtered_metrics = [m for m in all_metrics if m.entity_type == entity_type]
        else:
            filtered_metrics = all_metrics
        
        if not filtered_metrics:
            raise HTTPException(status_code=404, detail="No data found for specified criteria")
        
        # Calculate analytics
        analytics = await activity_service.calculate_advanced_analytics(filtered_metrics, entity_type)
        
        return analytics
        
    except Exception as e:
        logger.error("Failed to get analytics data", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch analytics data")


@app.get("/api/v2/hierarchy/performance", response_model=List[PerformanceRankingResponse])
async def get_performance_rankings(
    params: PerformanceQueryParams = Depends(),
    session: AsyncSession = Depends(get_async_session)
):
    """Get performance rankings and comparative metrics"""
    try:
        activity_service = ActivityScoringService(session)
        
        # Get activity metrics
        all_metrics = await activity_service.calculate_all_entity_scores()
        
        # Filter by entity type if specified
        if params.entity_type:
            filtered_metrics = [m for m in all_metrics if m.entity_type == params.entity_type.value]
        else:
            filtered_metrics = all_metrics
        
        # Calculate performance rankings
        rankings = await activity_service.calculate_performance_rankings(
            filtered_metrics, 
            params.peer_group_type,
            params.include_percentiles
        )
        
        # Return top N performers
        top_rankings = rankings[:params.top_n]
        
        return [PerformanceRankingResponse.from_orm(r) for r in top_rankings]
        
    except Exception as e:
        logger.error("Failed to get performance rankings", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch performance rankings")


# Cache management endpoints
@app.get("/api/v2/hierarchy/cache/stats")
async def get_cache_stats():
    """Get cache statistics and health information"""
    global cache_service
    
    if cache_service:
        return await cache_service.get_cache_stats()
    else:
        return {"cache_enabled": False, "message": "Cache service not available"}


@app.delete("/api/v2/hierarchy/cache")
async def invalidate_cache(
    pattern: Optional[str] = Query(None, description="Cache pattern to invalidate (optional)")
):
    """Invalidate cache entries"""
    global cache_service
    
    if cache_service:
        await cache_service.invalidate_cache(pattern)
        return {"message": "Cache invalidated successfully", "pattern": pattern}
    else:
        return {"message": "Cache service not available"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Customer Hierarchy Service",
        "description": "4-Level Customer Hierarchy Management API with Activity Analytics",
        "version": settings.API_VERSION,
        "health_url": "/health",
        "api_endpoints": {
            "tree": "/api/v2/hierarchy/tree",
            "search": "/api/v2/hierarchy/search",
            "metrics": "/api/v2/hierarchy/metrics",
            "activity": "/api/v2/hierarchy/activity",
            "analytics": "/api/v2/hierarchy/analytics",
            "performance": "/api/v2/hierarchy/performance"
        },
        "cache_endpoints": {
            "stats": "/api/v2/hierarchy/cache/stats",
            "invalidate": "/api/v2/hierarchy/cache (DELETE)"
        }
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main_api:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,
        log_level="info"
    )
