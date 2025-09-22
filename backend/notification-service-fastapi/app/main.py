import structlog
from fastapi import FastAPI
import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..', 'libs')))
from orderly_fastapi_core.errors import register_exception_handlers
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.notifications import router as notifications_router

structlog.configure(processors=[structlog.stdlib.add_log_level, structlog.processors.JSONRenderer()])
logger = structlog.get_logger()

app = FastAPI(title="Orderly Notification Service (FastAPI)")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
register_exception_handlers(app)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "notification-service-fastapi"}


@app.get("/")
async def root():
    return {"service": "Notification Service", "docs": "/docs"}

app.include_router(notifications_router)
