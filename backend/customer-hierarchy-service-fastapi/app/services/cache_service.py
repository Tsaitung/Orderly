"""
CacheService - Redis-based caching service for hierarchy operations

This service provides high-performance caching with:
- Redis integration with connection pooling
- Intelligent cache key management and TTL strategies
- Pattern-based cache invalidation
- Performance metrics and monitoring
- Circuit breaker pattern for cache failures
- Serialization/deserialization optimization
"""

from typing import Dict, List, Optional, Any, Union
import redis.asyncio as redis
import json
import pickle
from datetime import datetime, timedelta
import structlog
from contextlib import asynccontextmanager

from app.core.config import settings

logger = structlog.get_logger(__name__)


class CacheService:
    """
    High-performance Redis caching service optimized for hierarchy operations
    
    Key Features:
    - Connection pooling for optimal performance
    - Intelligent TTL management based on data volatility
    - Pattern-based bulk operations for cache invalidation
    - Performance monitoring and metrics collection
    - Fallback handling for cache failures
    - JSON and binary serialization support
    """
    def __init__(self):
        self.redis_pool = None
        self.connection_retries = 3
        self.circuit_breaker_threshold = 5
        self.circuit_breaker_failures = 0
        self.circuit_breaker_last_failure = None
        self.performance_stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0,
            "errors": 0
        }
        self.cache_mode = getattr(settings, "cache_mode", "degraded").strip().lower()
        initial_state = "disabled" if self.cache_mode == "off" else "initializing"
        self.status: Dict[str, Any] = {
            "mode": self.cache_mode,
            "state": initial_state,
            "last_error": None,
        }
    
    async def initialize(self):
        """Initialize Redis connection pool"""
        try:
            if self.cache_mode == "off":
                logger.info("Cache service disabled via CACHE_MODE config", cache_mode=self.cache_mode)
                self.status["state"] = "disabled"
                return

            self.redis_pool = redis.ConnectionPool.from_url(
                settings.redis_url,
                max_connections=20,
                retry_on_timeout=True,
                decode_responses=False  # Handle encoding manually for flexibility
            )
            
            # Test connection
            async with self._get_connection() as conn:
                await conn.ping()
            
            logger.info("Cache service initialized successfully", redis_url=settings.redis_url)
            self.status["state"] = "ready"
            self.status["last_error"] = None
            
        except Exception as e:
            logger.error("Failed to initialize cache service", error=str(e))
            logger.warning("Cache service will operate in fallback mode without Redis - all cache operations will be bypassed")
            self.redis_pool = None  # Ensure pool is None for fallback operations
            self.status["state"] = "degraded"
            self.status["last_error"] = str(e)
            if self.cache_mode == "strict":
                logger.critical("CACHE_MODE=strict -> failing startup due to Redis initialization error")
                raise
    
    @asynccontextmanager
    async def _get_connection(self):
        """Get Redis connection with connection pooling"""
        if not self.redis_pool:
            # If redis_pool is None, it means Redis is not available
            # Don't retry initialization, just raise an exception for graceful fallback
            if self.status.get("state") != "disabled":
                self.status["state"] = "degraded"
            raise Exception("Redis connection not available")
        
        conn = redis.Redis(connection_pool=self.redis_pool)
        try:
            yield conn
        finally:
            await conn.close()
    
    async def get(self, key: str, default: Any = None) -> Any:
        """
        Get value from cache with automatic deserialization
        
        Args:
            key: Cache key
            default: Default value if key not found
            
        Returns:
            Cached value or default
        """
        try:
            # If Redis is not available, return default immediately
            if not self.redis_pool:
                logger.debug("Cache get skipped - Redis not available", key=key)
                if self.status.get("state") != "disabled":
                    self.status["state"] = "degraded"
                return default
                
            if self._is_circuit_breaker_open():
                logger.warning("Cache circuit breaker open, skipping get", key=key)
                return default
            
            async with self._get_connection() as conn:
                raw_value = await conn.get(key)
                
                if raw_value is None:
                    self.performance_stats["misses"] += 1
                    return default
                
                # Try JSON deserialization first, fallback to pickle
                try:
                    value = json.loads(raw_value.decode('utf-8'))
                except (json.JSONDecodeError, UnicodeDecodeError):
                    value = pickle.loads(raw_value)
                
                self.performance_stats["hits"] += 1
                self._reset_circuit_breaker()
                
                logger.debug("Cache hit", key=key, value_type=type(value).__name__)
                return value
                
        except Exception as e:
            self._record_cache_failure()
            logger.error("Cache get operation failed", key=key, error=str(e))
            return default
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        serialization: str = "json"
    ) -> bool:
        """
        Set value in cache with configurable TTL and serialization
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (default from settings)
            serialization: Serialization method ("json" or "pickle")
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # If Redis is not available, return False immediately
            if not self.redis_pool:
                logger.debug("Cache set skipped - Redis not available", key=key)
                if self.status.get("state") != "disabled":
                    self.status["state"] = "degraded"
                return False
                
            if self._is_circuit_breaker_open():
                logger.warning("Cache circuit breaker open, skipping set", key=key)
                return False
            
            # Choose serialization method
            if serialization == "json":
                try:
                    serialized_value = json.dumps(value, default=str).encode('utf-8')
                except (TypeError, ValueError):
                    # Fallback to pickle for complex objects
                    serialized_value = pickle.dumps(value)
            else:
                serialized_value = pickle.dumps(value)
            
            ttl = ttl or settings.redis_ttl
            
            async with self._get_connection() as conn:
                await conn.setex(key, ttl, serialized_value)
            
            self.performance_stats["sets"] += 1
            self._reset_circuit_breaker()
            
            logger.debug(
                "Cache set successful",
                key=key,
                ttl=ttl,
                value_size=len(serialized_value),
                serialization=serialization
            )
            return True
            
        except Exception as e:
            self._record_cache_failure()
            logger.error("Cache set operation failed", key=key, error=str(e))
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete key from cache
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if key was deleted, False otherwise
        """
        try:
            # If Redis is not available, return False immediately
            if not self.redis_pool:
                logger.debug("Cache delete skipped - Redis not available", key=key)
                if self.status.get("state") != "disabled":
                    self.status["state"] = "degraded"
                return False
            if self._is_circuit_breaker_open():
                logger.warning("Cache circuit breaker open, skipping delete", key=key)
                return False
            
            async with self._get_connection() as conn:
                result = await conn.delete(key)
            
            self.performance_stats["deletes"] += 1
            self._reset_circuit_breaker()
            
            logger.debug("Cache delete successful", key=key, existed=bool(result))
            return bool(result)
            
        except Exception as e:
            self._record_cache_failure()
            logger.error("Cache delete operation failed", key=key, error=str(e))
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern
        
        Args:
            pattern: Redis pattern (e.g., "hierarchy_tree:*")
            
        Returns:
            Number of keys deleted
        """
        try:
            # If Redis is not available, return 0 immediately
            if not self.redis_pool:
                logger.debug("Cache delete_pattern skipped - Redis not available", pattern=pattern)
                if self.status.get("state") != "disabled":
                    self.status["state"] = "degraded"
                return 0
                
            if self._is_circuit_breaker_open():
                logger.warning("Cache circuit breaker open, skipping pattern delete", pattern=pattern)
                return 0
            
            async with self._get_connection() as conn:
                # Get all keys matching pattern
                keys = await conn.keys(pattern)
                
                if not keys:
                    return 0
                
                # Delete in batches to avoid blocking Redis
                batch_size = 100
                deleted_count = 0
                
                for i in range(0, len(keys), batch_size):
                    batch_keys = keys[i:i + batch_size]
                    deleted = await conn.delete(*batch_keys)
                    deleted_count += deleted
            
            self.performance_stats["deletes"] += deleted_count
            self._reset_circuit_breaker()
            
            logger.info(
                "Cache pattern delete successful",
                pattern=pattern,
                deleted_count=deleted_count
            )
            return deleted_count
            
        except Exception as e:
            self._record_cache_failure()
            logger.error("Cache pattern delete failed", pattern=pattern, error=str(e))
            return 0
    
    async def exists(self, key: str) -> bool:
        """
        Check if key exists in cache
        
        Args:
            key: Cache key to check
            
        Returns:
            True if key exists, False otherwise
        """
        try:
            # If Redis is not available, return False immediately
            if not self.redis_pool:
                logger.debug("Cache exists check skipped - Redis not available", key=key)
                if self.status.get("state") != "disabled":
                    self.status["state"] = "degraded"
                return False
                
            if self._is_circuit_breaker_open():
                return False
            
            async with self._get_connection() as conn:
                result = await conn.exists(key)
            
            self._reset_circuit_breaker()
            return bool(result)
            
        except Exception as e:
            self._record_cache_failure()
            logger.error("Cache exists check failed", key=key, error=str(e))
            return False
    
    async def increment(self, key: str, amount: int = 1, ttl: Optional[int] = None) -> Optional[int]:
        """
        Increment a numeric value in cache
        
        Args:
            key: Cache key
            amount: Amount to increment by
            ttl: TTL for the key if it doesn't exist
            
        Returns:
            New value after increment, or None on error
        """
        try:
            # If Redis is not available, return None immediately
            if not self.redis_pool:
                logger.debug("Cache increment skipped - Redis not available", key=key)
                if self.status.get("state") != "disabled":
                    self.status["state"] = "degraded"
                return None
                
            if self._is_circuit_breaker_open():
                return None
            
            async with self._get_connection() as conn:
                # Use pipeline for atomic operation
                pipe = conn.pipeline()
                pipe.incrby(key, amount)
                
                if ttl:
                    pipe.expire(key, ttl)
                
                results = await pipe.execute()
                new_value = results[0]
            
            self._reset_circuit_breaker()
            return new_value
            
        except Exception as e:
            self._record_cache_failure()
            logger.error("Cache increment failed", key=key, error=str(e))
            return None
    
    async def get_multi(self, keys: List[str]) -> Dict[str, Any]:
        """
        Get multiple keys from cache
        
        Args:
            keys: List of cache keys
            
        Returns:
            Dictionary of key-value pairs
        """
        try:
            # If Redis is not available, return empty dict immediately
            if not self.redis_pool:
                logger.debug("Cache get_multi skipped - Redis not available", key_count=len(keys))
                if self.status.get("state") != "disabled":
                    self.status["state"] = "degraded"
                return {}
                
            if self._is_circuit_breaker_open():
                return {}
            
            if not keys:
                return {}
            
            async with self._get_connection() as conn:
                raw_values = await conn.mget(keys)
            
            result = {}
            hits = 0
            
            for key, raw_value in zip(keys, raw_values):
                if raw_value is not None:
                    try:
                        # Try JSON first, fallback to pickle
                        value = json.loads(raw_value.decode('utf-8'))
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        value = pickle.loads(raw_value)
                    
                    result[key] = value
                    hits += 1
            
            self.performance_stats["hits"] += hits
            self.performance_stats["misses"] += len(keys) - hits
            self._reset_circuit_breaker()
            
            logger.debug(
                "Cache multi-get completed",
                requested_keys=len(keys),
                hits=hits,
                misses=len(keys) - hits
            )
            
            return result
            
        except Exception as e:
            self._record_cache_failure()
            logger.error("Cache multi-get failed", keys_count=len(keys), error=str(e))
            return {}
    
    async def set_multi(
        self,
        key_value_pairs: Dict[str, Any],
        ttl: Optional[int] = None,
        serialization: str = "json"
    ) -> bool:
        """
        Set multiple key-value pairs in cache
        
        Args:
            key_value_pairs: Dictionary of key-value pairs
            ttl: TTL for all keys
            serialization: Serialization method
            
        Returns:
            True if all operations successful
        """
        try:
            if self._is_circuit_breaker_open():
                return False
            
            if not key_value_pairs:
                return True
            
            # Serialize all values
            serialized_pairs = {}
            for key, value in key_value_pairs.items():
                if serialization == "json":
                    try:
                        serialized_pairs[key] = json.dumps(value, default=str).encode('utf-8')
                    except (TypeError, ValueError):
                        serialized_pairs[key] = pickle.dumps(value)
                else:
                    serialized_pairs[key] = pickle.dumps(value)
            
            async with self._get_connection() as conn:
                pipe = conn.pipeline()
                
                # Set all values
                pipe.mset(serialized_pairs)
                
                # Set TTL for each key if specified
                if ttl:
                    for key in serialized_pairs.keys():
                        pipe.expire(key, ttl)
                
                await pipe.execute()
            
            self.performance_stats["sets"] += len(key_value_pairs)
            self._reset_circuit_breaker()
            
            logger.debug(
                "Cache multi-set successful",
                keys_count=len(key_value_pairs),
                ttl=ttl
            )
            return True
            
        except Exception as e:
            self._record_cache_failure()
            logger.error("Cache multi-set failed", keys_count=len(key_value_pairs), error=str(e))
            return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        Get cache performance statistics
        
        Returns:
            Dictionary with performance metrics
        """
        total_operations = (
            self.performance_stats["hits"] + 
            self.performance_stats["misses"] + 
            self.performance_stats["sets"]
        )
        
        hit_rate = (
            self.performance_stats["hits"] / (self.performance_stats["hits"] + self.performance_stats["misses"])
            if (self.performance_stats["hits"] + self.performance_stats["misses"]) > 0
            else 0
        )
        
        return {
            "hit_rate": hit_rate,
            "total_operations": total_operations,
            "circuit_breaker_failures": self.circuit_breaker_failures,
            "circuit_breaker_open": self._is_circuit_breaker_open(),
            **self.performance_stats
        }
    
    async def get_performance_stats(self) -> Dict[str, Any]:
        """
        Get detailed performance statistics including Redis info
        """
        try:
            stats = await self.get_stats()
            
            # Get Redis server info if available
            try:
                async with self._get_connection() as conn:
                    redis_info = await conn.info("stats")
                    stats["redis_stats"] = {
                        "total_commands_processed": redis_info.get("total_commands_processed", 0),
                        "keyspace_hits": redis_info.get("keyspace_hits", 0),
                        "keyspace_misses": redis_info.get("keyspace_misses", 0),
                        "used_memory": redis_info.get("used_memory", 0),
                        "connected_clients": redis_info.get("connected_clients", 0)
                    }
            except Exception as e:
                logger.warning("Could not get Redis server stats", error=str(e))
                stats["redis_stats"] = {}
            
            return stats
            
        except Exception as e:
            logger.error("Failed to get performance stats", error=str(e))
            return {}
    
    def _is_circuit_breaker_open(self) -> bool:
        """Check if circuit breaker is open"""
        if self.circuit_breaker_failures < self.circuit_breaker_threshold:
            return False
        
        if self.circuit_breaker_last_failure:
            # Reset circuit breaker after 60 seconds
            if datetime.utcnow() - self.circuit_breaker_last_failure > timedelta(seconds=60):
                self.circuit_breaker_failures = 0
                self.circuit_breaker_last_failure = None
                return False
        
        return True
    
    def _record_cache_failure(self):
        """Record cache failure for circuit breaker"""
        self.circuit_breaker_failures += 1
        self.circuit_breaker_last_failure = datetime.utcnow()
        self.performance_stats["errors"] += 1
        if self.status.get("state") != "disabled":
            self.status["state"] = "degraded"

    def _reset_circuit_breaker(self):
        """Reset circuit breaker on successful operation"""
        if self.circuit_breaker_failures > 0:
            self.circuit_breaker_failures = 0
            self.circuit_breaker_last_failure = None
        if self.redis_pool and self.status.get("state") not in ("disabled", "ready"):
            self.status["state"] = "ready"
            self.status["last_error"] = None

    def get_status(self) -> Dict[str, Any]:
        """Expose current cache health status"""
        status_copy = dict(self.status)
        status_copy["circuit_breaker_open"] = self._is_circuit_breaker_open()
        status_copy["has_connection"] = self.redis_pool is not None
        return status_copy
