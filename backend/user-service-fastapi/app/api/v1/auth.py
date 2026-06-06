"""
認證路由模組 (向後兼容重導出)

此檔案已分解為多個子模組，詳見 app/api/v1/auth/ 目錄：
- core.py: JWT 配置、token 創建、用戶驗證依賴
- login.py: 登入端點
- registration.py: 註冊端點
- token.py: Token 管理端點
- password.py: 密碼相關端點
- verification.py: Email 和手機驗證端點
- admin.py: 管理員端點

保持向後兼容：
- `from app.api.v1.auth import router` 仍然可用
- `from app.api.v1.auth import get_current_user_from_token` 仍然可用
"""

from app.api.v1.auth import get_current_user_from_token, router

__all__ = [
    "router",
    "get_current_user_from_token",
]
