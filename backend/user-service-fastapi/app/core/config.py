"""
User Service Configuration
基於統一配置管理系統的用戶服務配置
"""

import sys
from pathlib import Path

# 添加共享庫路徑
sys.path.append(str(Path(__file__).parent.parent.parent.parent / "libs"))

from orderly_fastapi_core import UnifiedSettings, get_settings
from pydantic import Field


class UserServiceSettings(UnifiedSettings):
    """User Service 特定配置"""
    
    # 覆蓋預設應用名稱和端口
    app_name: str = Field(default="Orderly User Service", description="用戶服務名稱")
    port: int = Field(default=3001, description="用戶服務端口")
    
    # 用戶服務特定配置
    enable_user_registration: bool = Field(default=True, description="啟用用戶註冊")
    enable_email_verification: bool = Field(default=True, description="啟用郵箱驗證")
    enable_password_reset: bool = Field(default=True, description="啟用密碼重置")
    
    # 密碼策略
    password_min_length: int = Field(default=8, description="密碼最小長度")
    password_require_uppercase: bool = Field(default=True, description="密碼需要大寫字母")
    password_require_lowercase: bool = Field(default=True, description="密碼需要小寫字母")
    password_require_numbers: bool = Field(default=True, description="密碼需要數字")
    password_require_symbols: bool = Field(default=False, description="密碼需要符號")
    
    # 用戶會話配置
    session_duration_hours: int = Field(default=24, description="用戶會話持續時間")
    max_login_attempts: int = Field(default=5, description="最大登入嘗試次數")
    account_lockout_duration_minutes: int = Field(default=30, description="帳戶鎖定時間")
    
    # 用戶資料驗證
    enable_phone_verification: bool = Field(default=False, description="啟用手機驗證")
    require_terms_acceptance: bool = Field(default=True, description="需要接受條款")


# 創建配置實例
settings = UserServiceSettings()

# 為了向後兼容，保持原有接口
DATABASE_URL = settings.get_database_url_async()
JWT_SECRET = settings.jwt_secret

