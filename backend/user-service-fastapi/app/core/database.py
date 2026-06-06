"""
Database configuration and connection management for User Service
"""
import os
import sys

from sqlalchemy.ext.asyncio import AsyncSession

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..', 'libs')))
from orderly_fastapi_core import create_db_engines, get_async_session_dependency

from .config import settings

async_engine, sync_engine, AsyncSessionLocal, SessionLocal = create_db_engines(
    settings.get_database_url_async(), debug=settings.debug
)

get_async_session = get_async_session_dependency(AsyncSessionLocal)


def get_sync_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Alias for backward compatibility
get_db = get_sync_session

