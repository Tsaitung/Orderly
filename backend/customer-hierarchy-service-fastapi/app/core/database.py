"""
Database configuration and connection management for Customer Hierarchy Service
"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
from contextlib import asynccontextmanager
import structlog
from .config import settings

logger = structlog.get_logger(__name__)

# Create async engine for normal operations
async_engine = create_async_engine(
    settings.database_url_async,
    echo=settings.database_echo,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_pre_ping=True,  # Validate connections before use
    pool_recycle=3600,   # Recycle connections every hour
)

# Create sync engine for Alembic migrations
sync_engine = create_engine(
    settings.database_url_sync,
    echo=settings.database_echo,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_pre_ping=True,
    pool_recycle=3600,
)

# Create session makers
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=True,
    autocommit=False,
)

SessionLocal = sessionmaker(
    bind=sync_engine,
    autoflush=True,
    autocommit=False,
)

# Use the declarative Base from app.models to keep metadata consistent
from app.models import Base as Base  # re-export for local references


# Dependency for FastAPI
async def get_database() -> AsyncSession:
    """Get database session for dependency injection (alias for compatibility)"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error("Database session error", error=str(e))
            await session.rollback()
            raise
        finally:
            await session.close()

async def get_async_db() -> AsyncSession:
    """Get async database session for dependency injection"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error("Database session error", error=str(e))
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_db():
    """Get sync database session for migrations"""
    with SessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error("Database session error", error=str(e))
            session.rollback()
            raise
        finally:
            session.close()


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
        finally:
            await session.close()


async def init_db():
    """Initialize database - create all tables"""
    try:
        # Import all models to ensure they are registered
        from app.models import (
            CustomerGroup,
            CustomerCompany,
            CustomerLocation,
            BusinessUnit,
            CustomerMigrationLog
        )
        
        # Create all tables
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
        logger.info("Database initialized successfully")
        
    except Exception as e:
        logger.error("Database initialization failed", error=str(e))
        raise


async def close_db():
    """Close database connections"""
    try:
        await async_engine.dispose()
        sync_engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error("Error closing database connections", error=str(e))


# Health check function
async def check_db_health() -> bool:
    """Check database connectivity"""
    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        return False
