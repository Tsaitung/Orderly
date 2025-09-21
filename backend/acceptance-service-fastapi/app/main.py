import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.acceptance import router as acceptance_router

structlog.configure(processors=[structlog.stdlib.add_log_level, structlog.processors.JSONRenderer()])
logger = structlog.get_logger()

app = FastAPI(title="Orderly Acceptance Service (FastAPI)")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/acceptance/health")
async def health():
    return {"status": "healthy", "service": "acceptance-service-fastapi"}


@app.get("/")
async def root():
    return {"service": "Acceptance Service", "docs": "/docs"}

app.include_router(acceptance_router)
