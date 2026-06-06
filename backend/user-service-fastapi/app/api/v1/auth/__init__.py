"""
認證模組

整合所有認證相關的路由和功能
"""

from fastapi import APIRouter

from .admin import router as admin_router
from .core import get_current_user_from_token
from .login import router as login_router
from .password import router as password_router
from .registration import router as registration_router
from .token import router as token_router
from .verification import router as verification_router

# 建立主路由器
router = APIRouter()

# 整合所有子路由
router.include_router(login_router)
router.include_router(registration_router)
router.include_router(token_router)
router.include_router(password_router)
router.include_router(verification_router)
router.include_router(admin_router)

# 導出供其他模組使用的依賴
__all__ = [
    "router",
    "get_current_user_from_token",
]
