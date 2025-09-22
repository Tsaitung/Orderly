import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..', 'libs')))
from orderly_fastapi_core.errors import register_exception_handlers
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import async_engine
from app.api.v1.health import router as health_router
from app.api.v1.orders import router as orders_router


structlog.configure(processors=[structlog.stdlib.add_log_level, structlog.processors.JSONRenderer()])
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("order-service.start")
    yield
    logger.info("order-service.stop")
    await async_engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
    openapi_url="/api/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Register shared exception handlers for consistent error responses
register_exception_handlers(app)


@app.get("/")
async def root():
    return {"service": "Orderly Order Service (FastAPI)", "docs": "/api/docs"}


app.include_router(health_router, prefix="/api", tags=["Health"])
app.include_router(orders_router, prefix="/api", tags=["Orders"])
# Also expose at root so API Gateway '/api/orders' -> '' mapping works
app.include_router(orders_router, prefix="", tags=["Orders"])
