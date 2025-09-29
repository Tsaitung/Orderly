"""
Enhanced Cache Service for Activity Metrics

Redis-based caching layer for expensive dashboard calculations.
Provides intelligent cache invalidation and background refresh capabilities.
"""

import structlog
import json
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Union
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import ActivityMetrics, DashboardSummary
from app.schemas.activity import (
    DashboardMetricsResponse, ActivityAnalyticsResponse,
    EntityActivitySummary, ActivityMetricsResponse
)
from app.services.activity_service import ActivityScoringService
from app.services.mock_data_service import MockDataService

logger = structlog.get_logger(__name__)


class CacheConfig:
    """Cache configuration constants"""
    
    # Cache TTL (Time To Live) in seconds
    DASHBOARD_METRICS_TTL = 300      # 5 minutes
    ACTIVITY_DATA_TTL = 180          # 3 minutes
    ANALYTICS_DATA_TTL = 600         # 10 minutes
    PERFORMANCE_DATA_TTL = 300       # 5 minutes
    
    # Cache key prefixes
    DASHBOARD_PREFIX = "hierarchy:dashboard"
    ACTIVITY_PREFIX = "hierarchy:activity"
    ANALYTICS_PREFIX = "hierarchy:analytics"
    PERFORMANCE_PREFIX = "hierarchy:performance"
    
    # Background refresh thresholds
    REFRESH_THRESHOLD_SECONDS = 60   # Refresh cache if < 60 seconds remaining


class EnhancedCacheService:
    """
    Enhanced caching service with intelligent cache management.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.redis_client: Optional[redis.Redis] = None
        self.activity_service = ActivityScoringService(session)
        self.mock_service = MockDataService()
        self.cache_mode = getattr(settings, "cache_mode", "degraded").strip().lower()
        initial_state = "disabled" if self.cache_mode == "off" else "initializing"
        self.status: Dict[str, Any] = {
            "mode": self.cache_mode,
            "state": initial_state,
            "last_error": None,
        }

    async def initialize_redis(self):
        """Initialize Redis connection"""
        try:
            # Use Redis URL from environment or default to local
            if self.cache_mode == "off":
                logger.info("Enhanced cache disabled via CACHE_MODE config", cache_mode=self.cache_mode)
                self.status["state"] = "disabled"
                self.redis_client = None
                return

            redis_url = getattr(settings, 'redis_url', 'redis://localhost:6379/0')
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            
            # Test connection
            await self.redis_client.ping()
            logger.info("Redis cache initialized successfully", redis_url=redis_url)
            self.status["state"] = "ready"
            self.status["last_error"] = None
            
        except Exception as e:
            logger.warning("Redis unavailable, falling back to no-cache mode", error=str(e))
            self.redis_client = None
            self.status["state"] = "degraded"
            self.status["last_error"] = str(e)
            if self.cache_mode == "strict":
                logger.critical("CACHE_MODE=strict -> failing startup due to Redis initialization error")
                raise
    
    async def close_redis(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
    
    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate deterministic cache key from parameters"""
        
        # Sort parameters for consistent key generation
        sorted_params = sorted(kwargs.items())
        param_string = "&".join(f"{k}={v}" for k, v in sorted_params if v is not None)
        
        # Create hash for long parameter strings
        if len(param_string) > 100:
            param_hash = hashlib.md5(param_string.encode()).hexdigest()
            return f"{prefix}:{param_hash}"
        else:
            return f"{prefix}:{param_string}" if param_string else prefix
    
    async def _get_cached_data(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Retrieve data from cache"""
        if not self.redis_client:
            if self.status.get("state") != "disabled":
                self.status["state"] = "degraded"
            return None
        
        try:
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                data = json.loads(cached_data)
                logger.debug("Cache hit", cache_key=cache_key)
                if self.status.get("state") not in ("disabled", "ready"):
                    self.status["state"] = "ready"
                    self.status["last_error"] = None
                return data
            else:
                logger.debug("Cache miss", cache_key=cache_key)
                if self.status.get("state") not in ("disabled", "ready"):
                    self.status["state"] = "ready"
                return None
                
        except Exception as e:
            logger.error("Cache retrieval failed", cache_key=cache_key, error=str(e))
            self.status["state"] = "degraded"
            self.status["last_error"] = str(e)
            return None
    
    async def _set_cached_data(
        self, 
        cache_key: str, 
        data: Dict[str, Any], 
        ttl_seconds: int
    ) -> bool:
        """Store data in cache"""
        if not self.redis_client:
            if self.status.get("state") != "disabled":
                self.status["state"] = "degraded"
            return False
        
        try:
            serialized_data = json.dumps(data, default=str)  # Convert datetime to string
            await self.redis_client.setex(cache_key, ttl_seconds, serialized_data)
            logger.debug("Cache set", cache_key=cache_key, ttl=ttl_seconds)
            if self.status.get("state") not in ("disabled", "ready"):
                self.status["state"] = "ready"
                self.status["last_error"] = None
            return True
            
        except Exception as e:
            logger.error("Cache storage failed", cache_key=cache_key, error=str(e))
            self.status["state"] = "degraded"
            self.status["last_error"] = str(e)
            return False
    
    async def _check_cache_freshness(self, cache_key: str) -> Optional[int]:
        """Check remaining TTL for cache key"""
        if not self.redis_client:
            if self.status.get("state") != "disabled":
                self.status["state"] = "degraded"
            return None
        
        try:
            ttl = await self.redis_client.ttl(cache_key)
            if self.status.get("state") not in ("disabled", "ready"):
                self.status["state"] = "ready"
                self.status["last_error"] = None
            return ttl if ttl > 0 else None
        except Exception as e:
            logger.error("Cache TTL check failed", cache_key=cache_key, error=str(e))
            self.status["state"] = "degraded"
            self.status["last_error"] = str(e)
            return None
    
    async def get_dashboard_metrics_cached(
        self, 
        include_cache_info: bool = False
    ) -> DashboardMetricsResponse:
        """Get dashboard metrics with caching"""
        
        cache_key = self._generate_cache_key(CacheConfig.DASHBOARD_PREFIX)
        
        # Try to get from cache first
        cached_data = await self._get_cached_data(cache_key)
        cache_hit = cached_data is not None
        
        if cached_data:
            # Check if we should refresh in background
            remaining_ttl = await self._check_cache_freshness(cache_key)
            if remaining_ttl and remaining_ttl < CacheConfig.REFRESH_THRESHOLD_SECONDS:
                # Background refresh (fire and forget)
                logger.info("Triggering background cache refresh", cache_key=cache_key)
                # In production, this would be a background task
        
        if not cached_data:
            # Calculate fresh data
            logger.info("Calculating fresh dashboard metrics")
            start_time = datetime.now(timezone.utc)
            
            # Get activity metrics
            activity_metrics = await self.activity_service.calculate_all_entity_scores()
            dashboard_summary = await self.activity_service.generate_dashboard_summary(activity_metrics)
            top_performers = await self.activity_service.get_top_performers(activity_metrics, limit=10)
            
            # Get other insights
            attention_needed = []
            growth_leaders = []
            recent_activity = []
            
            # Find entities needing attention
            low_score_metrics = [m for m in activity_metrics if m.activity_score < 30]
            for metrics in sorted(low_score_metrics, key=lambda x: x.activity_score)[:5]:
                summary = await self.activity_service._convert_to_summary(metrics)
                attention_needed.append(summary)
            
            # Find growth leaders
            high_growth_metrics = [m for m in activity_metrics if m.growth_rate > 0]
            for metrics in sorted(high_growth_metrics, key=lambda x: x.growth_rate, reverse=True)[:5]:
                summary = await self.activity_service._convert_to_summary(metrics)
                growth_leaders.append(summary)
            
            # Find recently active entities
            recent_metrics = [m for m in activity_metrics if m.last_order_date]
            for metrics in sorted(recent_metrics, key=lambda x: x.last_order_date or datetime.min, reverse=True)[:5]:
                summary = await self.activity_service._convert_to_summary(metrics)
                recent_activity.append(summary)
            
            calculation_time = datetime.now(timezone.utc)
            
            # Create response
            response = DashboardMetricsResponse(
                summary=dashboard_summary,
                top_performers=top_performers,
                recent_activity=recent_activity,
                growth_leaders=growth_leaders,
                attention_needed=attention_needed,
                data_timestamp=calculation_time,
                total_entities_analyzed=len(activity_metrics),
                cache_hit=False
            )
            
            # Convert to dict for caching
            response_dict = response.dict()
            
            # Cache the result
            await self._set_cached_data(cache_key, response_dict, CacheConfig.DASHBOARD_METRICS_TTL)
            
            return response
        
        else:
            # Return cached data
            # Convert cached dict back to response object
            cached_data['cache_hit'] = True
            
            # Handle datetime conversion
            if 'data_timestamp' in cached_data:
                if isinstance(cached_data['data_timestamp'], str):
                    cached_data['data_timestamp'] = datetime.fromisoformat(cached_data['data_timestamp'].replace('Z', '+00:00'))
            
            return DashboardMetricsResponse(**cached_data)
    
    async def get_activity_data_cached(
        self,
        entity_type: Optional[str] = None,
        activity_level: Optional[str] = None,
        min_score: Optional[int] = None,
        max_score: Optional[int] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[ActivityMetricsResponse]:
        """Get activity data with caching"""
        
        cache_key = self._generate_cache_key(
            CacheConfig.ACTIVITY_PREFIX,
            entity_type=entity_type,
            activity_level=activity_level,
            min_score=min_score,
            max_score=max_score,
            limit=limit,
            offset=offset
        )
        
        cached_data = await self._get_cached_data(cache_key)
        
        if cached_data:
            # Convert cached data back to response objects
            return [ActivityMetricsResponse(**item) for item in cached_data]
        
        # Calculate fresh data
        logger.info("Calculating fresh activity data", 
                   entity_type=entity_type, activity_level=activity_level)
        
        all_metrics = await self.activity_service.calculate_all_entity_scores()
        
        # Apply filters
        filtered_metrics = all_metrics
        
        if entity_type:
            filtered_metrics = [m for m in filtered_metrics if m.entity_type == entity_type]
        
        if activity_level:
            filtered_metrics = [m for m in filtered_metrics if m.activity_level == activity_level]
        
        if min_score is not None:
            filtered_metrics = [m for m in filtered_metrics if m.activity_score >= min_score]
        
        if max_score is not None:
            filtered_metrics = [m for m in filtered_metrics if m.activity_score <= max_score]
        
        # Sort and paginate
        filtered_metrics.sort(key=lambda m: m.activity_score, reverse=True)
        paginated_metrics = filtered_metrics[offset:offset + limit]
        
        # Convert to response format
        response_data = [ActivityMetricsResponse.from_orm(m) for m in paginated_metrics]
        
        # Cache the result
        cache_data = [item.dict() for item in response_data]
        await self._set_cached_data(cache_key, cache_data, CacheConfig.ACTIVITY_DATA_TTL)
        
        return response_data
    
    async def get_analytics_data_cached(
        self,
        entity_type: Optional[str] = None
    ) -> ActivityAnalyticsResponse:
        """Get analytics data with caching"""
        
        cache_key = self._generate_cache_key(
            CacheConfig.ANALYTICS_PREFIX,
            entity_type=entity_type
        )
        
        cached_data = await self._get_cached_data(cache_key)
        
        if cached_data:
            # Handle datetime conversion
            if 'analysis_date' in cached_data:
                if isinstance(cached_data['analysis_date'], str):
                    cached_data['analysis_date'] = datetime.fromisoformat(cached_data['analysis_date'].replace('Z', '+00:00'))
            
            return ActivityAnalyticsResponse(**cached_data)
        
        # Calculate fresh data
        logger.info("Calculating fresh analytics data", entity_type=entity_type)
        
        all_metrics = await self.activity_service.calculate_all_entity_scores()
        
        # Filter by entity type if specified
        if entity_type:
            filtered_metrics = [m for m in all_metrics if m.entity_type == entity_type]
        else:
            filtered_metrics = all_metrics
        
        if not filtered_metrics:
            raise ValueError("No data found for specified criteria")
        
        # Calculate analytics
        analytics = await self.activity_service.calculate_advanced_analytics(filtered_metrics, entity_type)
        
        # Cache the result
        cache_data = analytics.dict()
        await self._set_cached_data(cache_key, cache_data, CacheConfig.ANALYTICS_DATA_TTL)
        
        return analytics
    
    async def invalidate_cache(self, pattern: Optional[str] = None):
        """Invalidate cache entries"""
        if not self.redis_client:
            if self.status.get("state") != "disabled":
                self.status["state"] = "degraded"
            return
        
        try:
            if pattern:
                # Delete keys matching pattern
                keys = await self.redis_client.keys(pattern)
                if keys:
                    await self.redis_client.delete(*keys)
                logger.info("Cache invalidated", pattern=pattern, keys_deleted=len(keys))
            else:
                # Clear all hierarchy cache
                patterns = [
                    f"{CacheConfig.DASHBOARD_PREFIX}:*",
                    f"{CacheConfig.ACTIVITY_PREFIX}:*",
                    f"{CacheConfig.ANALYTICS_PREFIX}:*",
                    f"{CacheConfig.PERFORMANCE_PREFIX}:*"
                ]
                
                total_deleted = 0
                for pattern in patterns:
                    keys = await self.redis_client.keys(pattern)
                    if keys:
                        await self.redis_client.delete(*keys)
                        total_deleted += len(keys)
                
                logger.info("All hierarchy cache invalidated", total_keys_deleted=total_deleted)
            if self.status.get("state") not in ("disabled", "ready"):
                self.status["state"] = "ready"
                self.status["last_error"] = None
                
        except Exception as e:
            logger.error("Cache invalidation failed", pattern=pattern, error=str(e))
            self.status["state"] = "degraded"
            self.status["last_error"] = str(e)

    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.redis_client:
            if self.status.get("state") != "disabled":
                self.status["state"] = "degraded"
            return {"cache_enabled": False}
        
        try:
            info = await self.redis_client.info()
            
            # Get hierarchy-specific stats
            patterns = [
                f"{CacheConfig.DASHBOARD_PREFIX}:*",
                f"{CacheConfig.ACTIVITY_PREFIX}:*",
                f"{CacheConfig.ANALYTICS_PREFIX}:*",
                f"{CacheConfig.PERFORMANCE_PREFIX}:*"
            ]
            
            cache_keys = {}
            for pattern in patterns:
                keys = await self.redis_client.keys(pattern)
                cache_keys[pattern] = len(keys)
            
            return {
                "cache_enabled": True,
                "redis_version": info.get("redis_version"),
                "connected_clients": info.get("connected_clients"),
                "used_memory_human": info.get("used_memory_human"),
                "cache_keys_by_pattern": cache_keys,
                "total_hierarchy_keys": sum(cache_keys.values())
            }
            
        except Exception as e:
            logger.error("Failed to get cache stats", error=str(e))
            self.status["state"] = "degraded"
            self.status["last_error"] = str(e)
            return {"cache_enabled": False, "error": str(e)}

    def get_status(self) -> Dict[str, Any]:
        """Expose current enhanced cache status"""
        status_copy = dict(self.status)
        status_copy["has_connection"] = self.redis_client is not None
        return status_copy
