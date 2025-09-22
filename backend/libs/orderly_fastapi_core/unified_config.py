"""
井然 Orderly Platform - 統一配置管理系統
Unified Configuration Management System

提供統一的配置載入、驗證和管理機制，支援多環境配置。
"""

import os
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from functools import lru_cache

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from pydantic import Field, field_validator
    PYDANTIC_V2 = True
except ImportError:
    from pydantic import BaseSettings, Field, validator
    PYDANTIC_V2 = False
    # For compatibility
    SettingsConfigDict = None


logger = logging.getLogger(__name__)


class UnifiedSettings(BaseSettings):
    """
    統一的配置管理基類
    
    自動載入配置的優先級：
    1. 環境變數
    2. 環境特定配置文件 (configs/{environment}.env)
    3. 基礎配置文件 (configs/base.env)
    4. 代碼中的默認值
    """
    
    if PYDANTIC_V2:
        model_config = SettingsConfigDict(
            env_file_encoding='utf-8',
            case_sensitive=False,
            extra='allow'
        )
    else:
        class Config:
            env_file_encoding = 'utf-8'
            case_sensitive = False
            extra = 'allow'
    
    # === 核心應用配置 ===
    app_name: str = Field(default="Orderly Service", description="應用名稱")
    app_version: str = Field(default="2.0.0", description="應用版本")
    api_version: str = Field(default="1.0.0", description="API 版本")
    environment: str = Field(default="development", description="運行環境")
    debug: bool = Field(default=False, description="調試模式")
    
    # === 服務器配置 ===
    host: str = Field(default="0.0.0.0", description="服務器監聽地址")
    port: int = Field(default=8080, description="服務器端口")
    workers: int = Field(default=1, description="Uvicorn worker 數量")
    
    # === 資料庫配置 ===
    database_url: str = Field(
        default="postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly",
        description="資料庫連接 URL"
    )
    database_host: str = Field(default="localhost", description="資料庫主機")
    database_port: int = Field(default=5432, description="資料庫端口")
    database_name: str = Field(default="orderly", description="資料庫名稱")
    database_user: str = Field(default="orderly", description="資料庫用戶")
    database_echo: bool = Field(default=False, description="SQLAlchemy 回顯")
    database_pool_size: int = Field(default=10, description="資料庫連接池大小")
    database_max_overflow: int = Field(default=20, description="資料庫連接池最大溢出")
    
    # === Redis 配置 ===
    redis_url: str = Field(default="redis://localhost:6379/0", description="Redis 連接 URL")
    redis_host: str = Field(default="localhost", description="Redis 主機")
    redis_port: int = Field(default=6379, description="Redis 端口")
    redis_ttl: int = Field(default=300, description="Redis 預設 TTL")
    
    # === JWT 配置 ===
    jwt_secret: str = Field(default="dev-jwt-secret-change-in-production", description="JWT 密鑰")
    jwt_refresh_secret: str = Field(default="dev-jwt-refresh-secret-change-in-production", description="JWT 刷新密鑰")
    jwt_algorithm: str = Field(default="HS256", description="JWT 算法")
    jwt_expires_in: int = Field(default=30, description="JWT 過期時間（分鐘）")
    access_token_expire_minutes: int = Field(default=30, description="訪問令牌過期時間")
    refresh_token_expire_days: int = Field(default=7, description="刷新令牌過期天數")
    
    # === CORS 配置 ===
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:8000", 
        description="CORS 允許的來源"
    )
    allowed_hosts: List[str] = Field(default=["localhost", "127.0.0.1"], description="允許的主機")
    
    # === 日誌配置 ===
    log_level: str = Field(default="INFO", description="日誌級別")
    log_format: str = Field(default="json", description="日誌格式")
    
    # === 服務發現配置 ===
    api_gateway_url: str = Field(default="http://localhost:8000", description="API Gateway URL")
    user_service_url: str = Field(default="http://localhost:3001", description="用戶服務 URL")
    order_service_url: str = Field(default="http://localhost:3002", description="訂單服務 URL")
    product_service_url: str = Field(default="http://localhost:3003", description="產品服務 URL")
    acceptance_service_url: str = Field(default="http://localhost:3004", description="驗收服務 URL")
    billing_service_url: str = Field(default="http://localhost:3005", description="計費服務 URL")
    notification_service_url: str = Field(default="http://localhost:3006", description="通知服務 URL")
    customer_hierarchy_service_url: str = Field(default="http://localhost:3007", description="客戶層級服務 URL")
    supplier_service_url: str = Field(default="http://localhost:3008", description="供應商服務 URL")
    
    # === 安全配置 ===
    secret_key: str = Field(default="dev-app-secret-key-change-in-production", description="應用密鑰")
    bcrypt_rounds: int = Field(default=12, description="Bcrypt 加密輪數")
    session_timeout: int = Field(default=3600, description="會話超時時間")
    password_min_length: int = Field(default=8, description="密碼最小長度")
    
    # === 業務規則配置 ===
    max_order_items: int = Field(default=50, description="最大訂單項目數")
    default_order_expiry_hours: int = Field(default=24, description="預設訂單過期時間")
    max_file_size: int = Field(default=10485760, description="最大文件大小 (10MB)")
    allowed_file_types: str = Field(default="jpg,jpeg,png,pdf,xlsx,csv", description="允許的文件類型")
    
    # === 緩存配置 ===
    cache_short_ttl: int = Field(default=300, description="短期緩存 TTL")
    cache_medium_ttl: int = Field(default=1800, description="中期緩存 TTL")
    cache_long_ttl: int = Field(default=3600, description="長期緩存 TTL")
    
    # === 監控配置 ===
    enable_metrics: bool = Field(default=True, description="啟用指標收集")
    enable_tracing: bool = Field(default=True, description="啟用分佈式追蹤")
    metrics_port: int = Field(default=9090, description="指標服務端口")
    
    # === Cloud Run 配置 ===
    min_instances: int = Field(default=0, description="最小實例數")
    max_instances: int = Field(default=10, description="最大實例數")
    memory: str = Field(default="512Mi", description="內存限制")
    cpu: str = Field(default="1", description="CPU 限制")
    concurrency: int = Field(default=100, description="並發請求數")
    timeout: int = Field(default=300, description="請求超時時間")
    
    # === 功能開關 ===
    enable_swagger: bool = Field(default=True, description="啟用 Swagger 文檔")
    enable_docs: bool = Field(default=True, description="啟用 API 文檔")
    enable_debug_toolbar: bool = Field(default=False, description="啟用調試工具欄")
    disable_auth: bool = Field(default=False, description="禁用身份驗證（僅開發環境）")
    
    # === 率限配置 ===
    rate_limit_per_minute: int = Field(default=60, description="每分鐘請求限制")
    rate_limit_burst: int = Field(default=10, description="突發請求限制")
    
    def __init__(self, **kwargs):
        """初始化配置，自動載入環境配置文件"""
        self._load_environment_configs()
        super().__init__(**kwargs)
        self._post_init_validation()
    
    def _load_environment_configs(self):
        """載入環境特定的配置文件"""
        try:
            # 查找 .env.local 文件
            possible_env_files = [
                Path.cwd() / ".env.local",  # 項目根目錄
                Path.cwd().parent / ".env.local",  # 服務目錄的上一級
                Path.cwd().parent.parent / ".env.local",  # 更上一級
            ]
            
            for env_file in possible_env_files:
                if env_file.exists():
                    logger.info(f"載入配置文件: {env_file}")
                    self._load_env_file(env_file)
                    break
            else:
                logger.debug("未找到 .env.local 文件，使用默認配置")
                    
        except Exception as e:
            logger.error(f"載入環境配置時發生錯誤: {e}")
    
    def _load_env_file(self, file_path: Path):
        """載入環境變數文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, _, value = line.partition('=')
                        key = key.strip()
                        value = value.strip()
                        # 只設置尚未設置的環境變數
                        os.environ.setdefault(key, value)
        except Exception as e:
            logger.error(f"讀取配置文件 {file_path} 時發生錯誤: {e}")
    
    def _post_init_validation(self):
        """初始化後的驗證"""
        # 開發環境安全檢查
        if self.environment == "development":
            if "dev" not in self.jwt_secret.lower():
                logger.warning("開發環境建議使用包含 'dev' 的 JWT 密鑰")
        
        # 生產環境安全檢查
        elif self.environment == "production":
            security_warnings = []
            
            if "dev" in self.jwt_secret.lower():
                security_warnings.append("生產環境不應使用開發用的 JWT 密鑰")
            
            if self.debug:
                security_warnings.append("生產環境不應啟用調試模式")
            
            if self.enable_swagger and self.environment == "production":
                security_warnings.append("生產環境建議禁用 Swagger 文檔")
            
            if security_warnings:
                for warning in security_warnings:
                    logger.error(f"安全警告: {warning}")
    
    if PYDANTIC_V2:
        @field_validator('port')
        @classmethod
        def validate_port(cls, v):
            """驗證端口範圍"""
            if v < 1 or v > 65535:
                raise ValueError('端口必須在 1-65535 範圍內')
            return v
        
        @field_validator('cors_origins')
        @classmethod
        def validate_cors_origins(cls, v):
            """驗證 CORS 來源"""
            if isinstance(v, str):
                return [origin.strip() for origin in v.split(',') if origin.strip()]
            return v
        
        @field_validator('environment')
        @classmethod
        def validate_environment(cls, v):
            """驗證環境名稱"""
            valid_envs = ['development', 'staging', 'production', 'testing']
            if v not in valid_envs:
                logger.warning(f"未知的環境: {v}，有效值: {valid_envs}")
            return v
    else:
        @validator('port')
        def validate_port(cls, v):
            """驗證端口範圍"""
            if v < 1 or v > 65535:
                raise ValueError('端口必須在 1-65535 範圍內')
            return v
        
        @validator('cors_origins')
        def validate_cors_origins(cls, v):
            """驗證 CORS 來源"""
            if isinstance(v, str):
                return [origin.strip() for origin in v.split(',') if origin.strip()]
            return v
        
        @validator('environment')
        def validate_environment(cls, v):
            """驗證環境名稱"""
            valid_envs = ['development', 'staging', 'production', 'testing']
            if v not in valid_envs:
                logger.warning(f"未知的環境: {v}，有效值: {valid_envs}")
            return v
    
    # === 動態屬性方法 ===
    
    def get_database_url_async(self) -> str:
        """獲取異步資料庫連接 URL"""
        if self.database_url and "postgresql+asyncpg://" in self.database_url:
            return self.database_url
        
        # 如果是普通 postgresql URL，轉換為 asyncpg
        if self.database_url and self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+asyncpg://")
        
        # 構建異步 URL
        password = os.getenv("POSTGRES_PASSWORD", "orderly_dev_password")
        if self.database_host.startswith("/cloudsql/"):
            # Cloud SQL 連接
            return f"postgresql+asyncpg://{self.database_user}:{password}@/{self.database_name}?host={self.database_host}"
        else:
            # 標準連接
            return f"postgresql+asyncpg://{self.database_user}:{password}@{self.database_host}:{self.database_port}/{self.database_name}"
    
    def get_database_url_sync(self) -> str:
        """獲取同步資料庫連接 URL（用於 Alembic）"""
        url = self.get_database_url_async()
        return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    
    def get_redis_url(self) -> str:
        """獲取 Redis 連接 URL"""
        if self.redis_url and "redis://" in self.redis_url:
            return self.redis_url
        return f"redis://{self.redis_host}:{self.redis_port}/0"
    
    def get_cors_origins_list(self) -> List[str]:
        """獲取 CORS 來源列表"""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]
        return self.cors_origins
    
    def get_allowed_file_types_list(self) -> List[str]:
        """獲取允許的文件類型列表"""
        return [ft.strip().lower() for ft in self.allowed_file_types.split(',') if ft.strip()]
    
    def is_cloud_run(self) -> bool:
        """檢查是否運行在 Cloud Run 環境"""
        return bool(os.getenv("K_SERVICE"))
    
    def is_development(self) -> bool:
        """檢查是否為開發環境"""
        return self.environment == "development"
    
    def is_production(self) -> bool:
        """檢查是否為生產環境"""
        return self.environment == "production"
    
    def is_staging(self) -> bool:
        """檢查是否為測試環境"""
        return self.environment == "staging"
    
    def get_config_summary(self) -> Dict[str, Any]:
        """獲取配置摘要（用於調試）"""
        return {
            "app_name": self.app_name,
            "environment": self.environment,
            "debug": self.debug,
            "database_host": self.database_host,
            "redis_host": self.redis_host,
            "is_cloud_run": self.is_cloud_run(),
            "cors_origins_count": len(self.get_cors_origins_list()),
        }


@lru_cache()
def get_settings() -> UnifiedSettings:
    """
    獲取配置單例
    
    使用 lru_cache 確保配置只載入一次，提高性能。
    """
    return UnifiedSettings()


# 為了向後兼容，提供一個全域配置實例
settings = get_settings()