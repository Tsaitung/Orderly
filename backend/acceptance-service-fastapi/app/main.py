import structlog
from fastapi import FastAPI
import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..', 'libs')))
from orderly_fastapi_core.errors import register_exception_handlers
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.acceptance import router as acceptance_router

structlog.configure(processors=[structlog.stdlib.add_log_level, structlog.processors.JSONRenderer()])
logger = structlog.get_logger()

app = FastAPI(title="Orderly Acceptance Service (FastAPI)")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
register_exception_handlers(app)


@app.get("/acceptance/health")
async def health():
    return {"status": "healthy", "service": "acceptance-service-fastapi"}


@app.get("/")
async def root():
    return {"service": "Acceptance Service", "docs": "/docs"}

app.include_router(acceptance_router)
