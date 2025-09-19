"""
Performance utilities for SKU management
Provides caching, query optimization, and monitoring
"""
import time
import logging
from typing import Any, Dict, List, Optional, Callable
from functools import wraps
from datetime import datetime, timedelta
import json
import hashlib
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)

class QueryCache:
    """Simple in-memory cache for database queries"""
    
    def __init__(self, default_ttl: int = 300):  # 5 minutes default
        self.cache = {}
        self.default_ttl = default_ttl
    
    def _generate_key(self, query: str, params: Dict[str, Any]) -> str:
        """Generate cache key from query and parameters"""
        key_data = f"{query}:{json.dumps(params, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, query: str, params: Dict[str, Any]) -> Optional[Any]:
        """Get cached result"""
        key = self._generate_key(query, params)
        
        if key in self.cache:
            result, expiry = self.cache[key]
            if datetime.now() < expiry:
                logger.debug(f"Cache hit for key: {key[:8]}...")
                return result
            else:
                # Expired, remove from cache
                del self.cache[key]
                logger.debug(f"Cache expired for key: {key[:8]}...")
        
        return None
    
    def set(self, query: str, params: Dict[str, Any], result: Any, ttl: Optional[int] = None) -> None:
        """Set cached result"""
        key = self._generate_key(query, params)
        expiry = datetime.now() + timedelta(seconds=ttl or self.default_ttl)
        self.cache[key] = (result, expiry)
        logger.debug(f"Cache set for key: {key[:8]}...")
    
    def clear(self) -> None:
        """Clear all cached results"""
        self.cache.clear()
        logger.info("Query cache cleared")
    
    def cleanup_expired(self) -> None:
        """Remove expired entries"""
        now = datetime.now()
        expired_keys = [
            key for key, (_, expiry) in self.cache.items()
            if now >= expiry
        ]
        
        for key in expired_keys:
            del self.cache[key]
        
        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")

class PerformanceMonitor:
    """Monitor and log performance metrics"""
    
    def __init__(self):
        self.query_times = []
        self.slow_query_threshold = 1.0  # 1 second
    
    def record_query(self, query: str, duration: float, params: Optional[Dict] = None):
        """Record query execution time"""
        self.query_times.append({
            'query': query[:100],  # Truncate for logging
            'duration': duration,
            'timestamp': datetime.now(),
            'params': params
        })
        
        if duration > self.slow_query_threshold:
            logger.warning(
                f"Slow query detected: {duration:.3f}s - {query[:100]}",
                extra={
                    'query_duration': duration,
                    'query': query[:200],
                    'params': params
                }
            )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        if not self.query_times:
            return {'message': 'No queries recorded'}
        
        durations = [q['duration'] for q in self.query_times]
        
        return {
            'total_queries': len(self.query_times),
            'avg_duration': sum(durations) / len(durations),
            'max_duration': max(durations),
            'min_duration': min(durations),
            'slow_queries': len([d for d in durations if d > self.slow_query_threshold]),
            'last_reset': datetime.now()
        }
    
    def reset(self):
        """Reset statistics"""
        self.query_times.clear()

# Global instances
query_cache = QueryCache()
performance_monitor = PerformanceMonitor()

def cached_query(ttl: int = 300):
    """Decorator for caching database queries"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract query parameters for cache key
            cache_params = {
                'args': str(args),
                'kwargs': {k: v for k, v in kwargs.items() if k != 'db'}
            }
            
            # Try to get from cache
            cache_key = func.__name__
            cached_result = query_cache.get(cache_key, cache_params)
            if cached_result is not None:
                return cached_result
            
            # Execute query and cache result
            start_time = time.time()
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            
            # Record performance
            performance_monitor.record_query(
                query=func.__name__,
                duration=duration,
                params=cache_params
            )
            
            # Cache the result
            query_cache.set(cache_key, cache_params, result, ttl)
            
            return result
        
        return wrapper
    return decorator

def monitor_performance(func: Callable) -> Callable:
    """Decorator for monitoring function performance"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        
        try:
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            
            performance_monitor.record_query(
                query=func.__name__,
                duration=duration
            )
            
            return result
        
        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                f"Function {func.__name__} failed after {duration:.3f}s: {e}",
                extra={
                    'function_name': func.__name__,
                    'duration': duration,
                    'error': str(e)
                }
            )
            raise
    
    return wrapper

async def execute_optimized_search(
    db: AsyncSession,
    search_term: Optional[str] = None,
    category_filter: Optional[str] = None,
    packaging_filter: Optional[str] = None,
    quality_filter: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    origin_filter: Optional[str] = None,
    active_only: bool = True,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Execute optimized SKU search using stored function"""
    
    query = text("""
        SELECT * FROM search_skus_optimized(
            :search_term, :category_filter, :packaging_filter, :quality_filter,
            :price_min, :price_max, :origin_filter, :active_only, :limit_count, :offset_count
        )
    """)
    
    params = {
        'search_term': search_term,
        'category_filter': category_filter,
        'packaging_filter': packaging_filter,
        'quality_filter': quality_filter,
        'price_min': price_min,
        'price_max': price_max,
        'origin_filter': origin_filter,
        'active_only': active_only,
        'limit_count': limit,
        'offset_count': offset
    }
    
    start_time = time.time()
    result = await db.execute(query, params)
    duration = time.time() - start_time
    
    performance_monitor.record_query(
        query="search_skus_optimized",
        duration=duration,
        params=params
    )
    
    rows = result.fetchall()
    return [dict(row._mapping) for row in rows]

async def get_supplier_comparison(
    db: AsyncSession,
    sku_id: str
) -> List[Dict[str, Any]]:
    """Get supplier comparison using optimized function"""
    
    query = text("SELECT * FROM compare_suppliers_for_sku(:sku_id)")
    
    start_time = time.time()
    result = await db.execute(query, {'sku_id': sku_id})
    duration = time.time() - start_time
    
    performance_monitor.record_query(
        query="compare_suppliers_for_sku",
        duration=duration,
        params={'sku_id': sku_id}
    )
    
    rows = result.fetchall()
    return [dict(row._mapping) for row in rows]

async def refresh_materialized_views(db: AsyncSession) -> None:
    """Refresh all materialized views"""
    
    query = text("SELECT refresh_all_mv()")
    
    start_time = time.time()
    await db.execute(query)
    await db.commit()
    duration = time.time() - start_time
    
    performance_monitor.record_query(
        query="refresh_all_mv",
        duration=duration
    )
    
    logger.info(f"Materialized views refreshed in {duration:.3f}s")

async def get_sku_statistics(db: AsyncSession) -> List[Dict[str, Any]]:
    """Get SKU statistics from materialized view"""
    
    query = text("SELECT * FROM mv_sku_statistics ORDER BY category_name")
    
    start_time = time.time()
    result = await db.execute(query)
    duration = time.time() - start_time
    
    performance_monitor.record_query(
        query="mv_sku_statistics",
        duration=duration
    )
    
    rows = result.fetchall()
    return [dict(row._mapping) for row in rows]

async def get_supplier_performance(db: AsyncSession) -> List[Dict[str, Any]]:
    """Get supplier performance from materialized view"""
    
    query = text("""
        SELECT * FROM mv_supplier_performance 
        ORDER BY avg_quality_score DESC, avg_price ASC
    """)
    
    start_time = time.time()
    result = await db.execute(query)
    duration = time.time() - start_time
    
    performance_monitor.record_query(
        query="mv_supplier_performance",
        duration=duration
    )
    
    rows = result.fetchall()
    return [dict(row._mapping) for row in rows]

async def get_allergen_summary(db: AsyncSession) -> List[Dict[str, Any]]:
    """Get allergen summary from materialized view"""
    
    query = text("""
        SELECT * FROM mv_allergen_summary 
        ORDER BY affected_skus DESC
    """)
    
    start_time = time.time()
    result = await db.execute(query)
    duration = time.time() - start_time
    
    performance_monitor.record_query(
        query="mv_allergen_summary",
        duration=duration
    )
    
    rows = result.fetchall()
    return [dict(row._mapping) for row in rows]

class RequestDeduplicator:
    """Prevent duplicate requests"""
    
    def __init__(self, window: int = 60):  # 1 minute window
        self.active_requests = {}
        self.window = window
    
    def is_duplicate(self, request_key: str) -> bool:
        """Check if request is duplicate"""
        now = time.time()
        
        if request_key in self.active_requests:
            if now - self.active_requests[request_key] < self.window:
                return True
        
        self.active_requests[request_key] = now
        return False
    
    def cleanup(self):
        """Remove old entries"""
        now = time.time()
        expired_keys = [
            key for key, timestamp in self.active_requests.items()
            if now - timestamp >= self.window
        ]
        
        for key in expired_keys:
            del self.active_requests[key]

# Global deduplicator
request_deduplicator = RequestDeduplicator()

def deduplicate_requests(func: Callable) -> Callable:
    """Decorator to prevent duplicate requests"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Generate request key
        request_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
        
        if request_deduplicator.is_duplicate(request_key):
            logger.warning(f"Duplicate request detected: {func.__name__}")
            raise Exception("Duplicate request - please wait before retrying")
        
        try:
            result = await func(*args, **kwargs)
            return result
        finally:
            # Cleanup old entries periodically
            if time.time() % 60 < 1:  # About once per minute
                request_deduplicator.cleanup()
    
    return wrapper