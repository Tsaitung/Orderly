import structlog
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..', 'libs')))
from orderly_fastapi_core.errors import register_exception_handlers
from orderly_fastapi_core.middleware import AuthMiddleware
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import async_engine
from app.api.v1.notifications import router as notifications_router
from app.api import otp as otp_router
from app.services.otp_service import OTPService
from app.services.email_service import create_email_service
from app.services.sms_service import SMSService

structlog.configure(processors=[structlog.stdlib.add_log_level, structlog.processors.JSONRenderer()])
logger = structlog.get_logger()

# 初始化 OTP, Email, SMS 服務
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
otp_service = OTPService(redis_url=REDIS_URL)
email_service = create_email_service()
sms_service = SMSService()

app = FastAPI(title="Orderly Notification Service (FastAPI)")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
# OTP 端點為內部服務調用，暫時設為公開（生產環境應使用服務間認證）
# 注意：必須包含預設公開路徑，因為 AuthMiddleware 會替換而非合併
notification_public_paths = {
    # 預設公開路徑
    "/", "/health", "/db/health", "/db/info", "/ready", "/live", "/metrics",
    "/docs", "/redoc", "/openapi.json",
    # OTP 端點（內部服務調用）
    "/otp/send-email",
    "/otp/send-sms",
    "/otp/verify",
}
app.add_middleware(AuthMiddleware, settings=settings, public_paths=notification_public_paths)
register_exception_handlers(app)


@app.on_event("startup")
async def startup():
    """啟動時連接 Redis"""
    try:
        await otp_service.connect()
        logger.info("notification_service_started", redis_connected=True)
    except Exception as e:
        logger.error("notification_service_startup_failed", error=str(e))


@app.on_event("shutdown")
async def shutdown():
    """關閉時斷開 Redis 連接"""
    await otp_service.close()
    logger.info("notification_service_shutdown")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "notification-service-fastapi"}


@app.get("/db/health")
async def db_health():
    """Active DB probe: attempts a lightweight SELECT 1."""
    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "healthy"}
    except Exception as e:
        logger.error("db.health.failed", error=str(e))
        return JSONResponse(status_code=503, content={"status": "unhealthy", "error": str(e)})


@app.get("/db/info")
async def db_info():
    """Non-sensitive DB info for diagnostics (masked)."""
    try:
        db_url = settings.get_database_url_async()
        masked = db_url
        if "://" in db_url and "@" in db_url:
            scheme, rest = db_url.split("://", 1)
            creds, hostpart = rest.split("@", 1)
            if ":" in creds:
                user, _ = creds.split(":", 1)
                creds_masked = f"{user}:***"
            else:
                creds_masked = creds
            masked = f"{scheme}://{creds_masked}@{hostpart}"
        # simple ping
        import time
        start = time.time()
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        dur = (time.time() - start) * 1000
        return {"url_masked": masked, "ping_ms": dur}
    except Exception as e:
        logger.error("db.info.failed", error=str(e))
        return JSONResponse(status_code=503, content={"error": str(e)})


@app.get("/")
async def root():
    return {"service": "Notification Service", "docs": "/docs"}

# 設定 OTP router 的服務實例
otp_router.otp_service = otp_service
otp_router.email_service = email_service
otp_router.sms_service = sms_service

# 註冊路由
app.include_router(notifications_router)
app.include_router(otp_router.router)
