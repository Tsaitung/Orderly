"""
FastAPI 應用程式工廠
提供統一的微服務初始化模式，減少樣板程式碼
"""
from contextlib import asynccontextmanager
from typing import Callable, List, Optional, Set

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncEngine

from .errors import register_exception_handlers
from .health import create_health_router
from .middleware import AuthMiddleware, DEFAULT_PUBLIC_PATHS


def configure_structlog(service_name: str) -> None:
    """配置結構化日誌"""
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
    )


def create_service_app(
    service_name: str,
    version: str,
    async_engine: AsyncEngine,
    get_db_url: Callable[[], str],
    settings: object,
    cors_origins: Optional[List[str]] = None,
    public_paths: Optional[Set[str]] = None,
    debug: bool = False,
    title: Optional[str] = None,
    description: Optional[str] = None,
) -> FastAPI:
    """
    建立標準化的 FastAPI 微服務應用程式

    Args:
        service_name: 服務名稱（如 "user-service-fastapi"）
        version: 服務版本
        async_engine: SQLAlchemy async engine
        get_db_url: 取得資料庫 URL 的函數
        settings: 服務設定物件（需要有 jwt_secret 等屬性）
        cors_origins: CORS 允許的來源列表
        public_paths: 不需要認證的路徑集合
        debug: 是否啟用除錯模式
        title: API 文件標題（預設使用 service_name）
        description: API 文件描述

    Returns:
        配置好的 FastAPI 應用程式
    """
    configure_structlog(service_name)
    logger = structlog.get_logger()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logger.info(f"{service_name}.start", version=version)
        yield
        logger.info(f"{service_name}.stop")
        await async_engine.dispose()

    app = FastAPI(
        title=title or f"Orderly {service_name.replace('-', ' ').title()}",
        version=version,
        description=description or f"井然 Orderly {service_name}",
        docs_url="/api/docs" if debug else None,
        redoc_url="/api/redoc" if debug else None,
        openapi_url="/api/openapi.json" if debug else None,
        lifespan=lifespan,
    )

    # CORS 配置
    default_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
    if debug:
        default_origins.extend(["http://localhost:3001", "http://127.0.0.1:3001"])

    origins = cors_origins or default_origins

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "X-CSRF-Token",
            "X-Correlation-ID",
        ],
        expose_headers=["X-Correlation-ID"],
    )

    # Auth 中介層
    auth_public_paths = public_paths or DEFAULT_PUBLIC_PATHS
    app.add_middleware(AuthMiddleware, settings=settings, public_paths=auth_public_paths)

    # 統一錯誤處理
    register_exception_handlers(app)

    # 健康檢查端點
    health_router = create_health_router(
        service_name=service_name,
        version=version,
        async_engine=async_engine,
        get_db_url=get_db_url,
    )
    app.include_router(health_router)

    # 根端點
    @app.get("/")
    async def root():
        return {"service": f"Orderly {service_name}", "docs": "/api/docs"}

    return app
