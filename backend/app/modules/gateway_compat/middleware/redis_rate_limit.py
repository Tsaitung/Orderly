"""
Redis-based distributed rate limiter middleware.

Implements token bucket algorithm using Redis for multi-instance deployments.
Prevents brute force attacks on authentication endpoints.
"""

import time
from typing import Dict, Optional
from redis import asyncio as aioredis
import structlog

logger = structlog.get_logger()


class RedisRateLimiter:
    """
    Distributed rate limiter using Redis and token bucket algorithm.

    Rate limits are enforced per-endpoint and per-client (IP address).
    Supports multi-instance deployments by using Redis as shared state.
    """

    # Rate limit configurations (endpoint -> {max requests, window in seconds})
    LIMITS = {
        "/api/auth/login": {"max": 5, "window": 900},  # 5 requests per 15 minutes
        "/api/auth/register": {"max": 3, "window": 3600},  # 3 requests per hour
        "/api/auth/forgot-password": {"max": 3, "window": 3600},  # 3 requests per hour
        "/api/auth/reset-password": {"max": 5, "window": 900},  # 5 requests per 15 minutes
    }

    # Default limit for endpoints not in LIMITS
    DEFAULT_LIMIT = {"max": 100, "window": 60}  # 100 requests per minute

    def __init__(self, redis_url: str):
        """
        Initialize rate limiter with Redis connection.

        Args:
            redis_url: Redis connection URL (e.g., redis://localhost:6379/0)
        """
        self.redis_url = redis_url
        self.redis: Optional[aioredis.Redis] = None

    async def connect(self):
        """Establish Redis connection."""
        try:
            self.redis = await aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            # Test connection
            await self.redis.ping()
            logger.info("redis_rate_limiter_connected", redis_url=self.redis_url)
        except Exception as e:
            logger.error("redis_rate_limiter_connection_failed", error=str(e))
            # Fail open - allow requests if Redis is down (availability over security)
            self.redis = None

    async def close(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()
            logger.info("redis_rate_limiter_disconnected")

    async def check(
        self,
        key_identifier: str,
        endpoint: str,
    ) -> Dict[str, any]:
        """
        Check if request is allowed under rate limit using token bucket algorithm.

        Args:
            key_identifier: Unique identifier for the client (e.g., IP address)
            endpoint: API endpoint being accessed

        Returns:
            Dict with:
                - allowed (bool): Whether request is allowed
                - remaining (int): Remaining requests in window
                - retry_after (int): Seconds until limit resets (if not allowed)
                - limit (int): Maximum requests allowed
                - window (int): Window duration in seconds
        """
        # If Redis is unavailable, fail open (allow request)
        if not self.redis:
            logger.warn(
                "redis_unavailable_allowing_request",
                key_identifier=key_identifier,
                endpoint=endpoint
            )
            return {
                "allowed": True,
                "remaining": 999,
                "retry_after": 0,
                "limit": 999,
                "window": 60,
            }

        # Get rate limit config for this endpoint
        limit_config = self.LIMITS.get(endpoint, self.DEFAULT_LIMIT)
        max_requests = limit_config["max"]
        window_seconds = limit_config["window"]

        # Redis key format: ratelimit:{endpoint}:{identifier}
        redis_key = f"ratelimit:{endpoint}:{key_identifier}"

        try:
            # Get current count
            current = await self.redis.get(redis_key)

            if current is None:
                # First request in this window
                await self.redis.setex(redis_key, window_seconds, "1")
                logger.debug(
                    "rate_limit_new_window",
                    key=key_identifier,
                    endpoint=endpoint,
                    remaining=max_requests - 1
                )
                return {
                    "allowed": True,
                    "remaining": max_requests - 1,
                    "retry_after": 0,
                    "limit": max_requests,
                    "window": window_seconds,
                }

            count = int(current)

            if count >= max_requests:
                # Rate limit exceeded
                ttl = await self.redis.ttl(redis_key)
                retry_after = max(0, ttl)

                logger.warn(
                    "rate_limit_exceeded",
                    key=key_identifier,
                    endpoint=endpoint,
                    count=count,
                    limit=max_requests,
                    retry_after=retry_after
                )

                return {
                    "allowed": False,
                    "remaining": 0,
                    "retry_after": retry_after,
                    "limit": max_requests,
                    "window": window_seconds,
                }

            # Increment counter
            await self.redis.incr(redis_key)

            logger.debug(
                "rate_limit_allowed",
                key=key_identifier,
                endpoint=endpoint,
                count=count + 1,
                remaining=max_requests - count - 1
            )

            return {
                "allowed": True,
                "remaining": max_requests - count - 1,
                "retry_after": 0,
                "limit": max_requests,
                "window": window_seconds,
            }

        except Exception as e:
            logger.error(
                "rate_limit_check_error",
                error=str(e),
                key=key_identifier,
                endpoint=endpoint
            )
            # Fail open on errors
            return {
                "allowed": True,
                "remaining": 999,
                "retry_after": 0,
                "limit": 999,
                "window": 60,
            }

    def get_limit_config(self, endpoint: str) -> Dict[str, int]:
        """
        Get rate limit configuration for an endpoint.

        Args:
            endpoint: API endpoint path

        Returns:
            Dict with max requests and window in seconds
        """
        return self.LIMITS.get(endpoint, self.DEFAULT_LIMIT)
