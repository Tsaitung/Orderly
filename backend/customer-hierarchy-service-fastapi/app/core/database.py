"""
Database configuration and connection management for Customer Hierarchy Service
"""
import os
import sys
from contextlib import asynccontextmanager

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from orderly_fastapi_core import create_db_engines, get_async_session_dependency

from .config import settings

logger = structlog.get_logger(__name__)

async_engine, sync_engine, AsyncSessionLocal, SessionLocal = create_db_engines(
    settings.database_url_async, debug=settings.database_echo
)

# Use the declarative Base from app.models to keep metadata consistent
from app.models import Base as Base  # re-export for local references

# Dependency for FastAPI - primary async session getter
get_database = get_async_session_dependency(AsyncSessionLocal)
get_async_db = get_database  # Alias for compatibility


def get_sync_db():
    """Get sync database session for migrations"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@asynccontextmanager
async def get_async_session():
    """Get async session context manager"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error("Database session error", error=str(e))
            await session.rollback()
            raise


async def init_db():
    """Initialize database - create all tables"""
    from app.models import (
        CustomerGroup,
        CustomerCompany,
        CustomerLocation,
        BusinessUnit,
        CustomerMigrationLog
    )
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized successfully")


async def close_db():
    """Close database connections"""
    await async_engine.dispose()
    sync_engine.dispose()
    logger.info("Database connections closed")


async def check_db_health() -> bool:
    """Check database connectivity"""
    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        return False
