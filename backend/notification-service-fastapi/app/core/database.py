from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
import os, sys
# Add monorepo libs to sys.path so shared core can be imported in dev/monorepo context
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..', 'libs')))
from orderly_fastapi_core import (
    create_db_engines,
    get_async_session_dependency,
)


async_engine, sync_engine, AsyncSessionLocal, SessionLocal = create_db_engines(
    settings.database_url, debug=settings.debug
)


get_async_session = get_async_session_dependency(AsyncSessionLocal)
