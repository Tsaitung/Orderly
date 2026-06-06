"""
FastAPI Notification Service Application
使用統一的應用程式工廠簡化初始化
"""
import os
import sys

import structlog

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..", "libs")))

from orderly_fastapi_core import create_service_app, DEFAULT_PUBLIC_PATHS

from app.core.config import settings
from app.core.database import async_engine
from app.api.v1.notifications import router as notifications_router
from app.api import otp as otp_router
from app.services.otp_service import OTPService
from app.services.email_service import create_email_service
from app.services.sms_service import SMSService

logger = structlog.get_logger()

# 初始化 OTP, Email, SMS 服務
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
otp_service = OTPService(redis_url=REDIS_URL)
email_service = create_email_service()
sms_service = SMSService()

# OTP 端點為內部服務調用，暫時設為公開
notification_public_paths = DEFAULT_PUBLIC_PATHS | {
    "/otp/send-email",
    "/otp/send-sms",
    "/otp/verify",
}

app = create_service_app(
    service_name="notification-service-fastapi",
    version="1.0.0",
    async_engine=async_engine,
    get_db_url=settings.get_database_url_async,
    settings=settings,
    public_paths=notification_public_paths,
    debug=getattr(settings, "debug", False),
)


@app.on_event("startup")
async def startup():
    """啟動時連接 Redis"""
    try:
        await otp_service.connect()
        logger.info("notification_service_started", redis_connected=True)
    except Exception as e:
        logger.error("notification_service_startup_failed", error=str(e))


# 設定 OTP router 的服務實例
otp_router.otp_service = otp_service
otp_router.email_service = email_service
otp_router.sms_service = sms_service

# 註冊路由
app.include_router(notifications_router)
app.include_router(otp_router.router)
