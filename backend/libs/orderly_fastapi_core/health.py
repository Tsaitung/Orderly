"""
共用健康檢查端點
提供標準化的 /health, /db/health, /db/info 端點
"""
import time
from typing import Any, Callable, Dict

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine
import structlog

logger = structlog.get_logger()


def mask_database_url(db_url: str) -> str:
    """遮蔽資料庫 URL 中的密碼"""
    if "://" not in db_url or "@" not in db_url:
        return db_url
    scheme, rest = db_url.split("://", 1)
    creds, hostpart = rest.split("@", 1)
    if ":" in creds:
        user, _ = creds.split(":", 1)
        creds_masked = f"{user}:***"
    else:
        creds_masked = creds
    return f"{scheme}://{creds_masked}@{hostpart}"


async def check_db_health(async_engine: AsyncEngine) -> Dict[str, Any]:
    """執行資料庫健康檢查"""
    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "healthy"}
    except Exception as e:
        logger.error("db.health.failed", error=str(e))
        return {"status": "unhealthy", "error": str(e)}


async def get_db_info(async_engine: AsyncEngine, db_url: str) -> Dict[str, Any]:
    """取得資料庫連線資訊（含延遲）"""
    try:
        masked = mask_database_url(db_url)
        start = time.time()
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        dur = (time.time() - start) * 1000
        return {"url_masked": masked, "ping_ms": round(dur, 2)}
    except Exception as e:
        logger.error("db.info.failed", error=str(e))
        return {"error": str(e)}


def create_health_router(
    service_name: str,
    version: str,
    async_engine: AsyncEngine,
    get_db_url: Callable[[], str],
) -> APIRouter:
    """
    建立標準健康檢查路由

    Args:
        service_name: 服務名稱 (如 "order-service-fastapi")
        version: 服務版本
        async_engine: SQLAlchemy async engine
        get_db_url: 取得資料庫 URL 的函數
    """
    router = APIRouter(tags=["Health"])

    @router.get("/health")
    async def health():
        return {"status": "healthy", "service": service_name, "version": version}

    @router.get("/db/health")
    async def db_health():
        result = await check_db_health(async_engine)
        if result.get("status") != "healthy":
            return JSONResponse(status_code=503, content=result)
        return result

    @router.get("/db/info")
    async def db_info():
        result = await get_db_info(async_engine, get_db_url())
        if "error" in result:
            return JSONResponse(status_code=503, content=result)
        return result

    return router
