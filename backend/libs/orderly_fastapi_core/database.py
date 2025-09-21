from __future__ import annotations

from typing import Tuple, Callable

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker


# Factories for session locals (named to avoid confusion when imported)
AsyncSessionLocalFactory = async_sessionmaker
SessionLocalFactory = sessionmaker


def create_db_engines(database_url: str, debug: bool = False) -> Tuple:
    """
    Create async and sync SQLAlchemy engines and session factories.

    Returns a tuple:
      (async_engine, sync_engine, AsyncSessionLocal, SessionLocal)
    """
    async_engine = create_async_engine(database_url, echo=debug)
    sync_engine = create_engine(database_url.replace("+asyncpg", ""), echo=debug)

    AsyncSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

    return async_engine, sync_engine, AsyncSessionLocal, SessionLocal


def get_async_session_dependency(AsyncSessionLocal: async_sessionmaker[AsyncSession]) -> Callable[[], AsyncSession]:
    """
    Build a FastAPI dependency function that yields an AsyncSession
    using the provided AsyncSessionLocal.
    """

    async def _get_async_session() -> AsyncSession:
        async with AsyncSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()

    return _get_async_session

