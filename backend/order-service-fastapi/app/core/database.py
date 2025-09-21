from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from .config import settings


async_engine = create_async_engine(settings.database_url, echo=settings.debug)
sync_engine = create_engine(settings.database_url.replace("+asyncpg", ""), echo=settings.debug)

AsyncSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


async def get_async_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

