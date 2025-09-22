from sqlalchemy.ext.asyncio import AsyncSession
from .config import settings
import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..', 'libs')))
from orderly_fastapi_core import (
    create_db_engines,
    get_async_session_dependency,
)


async_engine, sync_engine, AsyncSessionLocal, SessionLocal = create_db_engines(
    settings.get_database_url_async(), debug=settings.debug
)


get_async_session = get_async_session_dependency(AsyncSessionLocal)
