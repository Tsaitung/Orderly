"""
API Gateway Service Configuration
基於統一配置管理系統的 API Gateway 配置
"""

import sys
from pathlib import Path

# 添加共享庫路徑
sys.path.append(str(Path(__file__).parent.parent.parent.parent / "libs"))

from orderly_fastapi_core import UnifiedSettings, get_settings
from pydantic import Field


class APIGatewaySettings(UnifiedSettings):
    """API Gateway 特定配置"""
    
    # 覆蓋預設應用名稱
    app_name: str = Field(default="Orderly API Gateway", description="API Gateway 服務名稱")
    
    # API Gateway 特定配置
    enable_api_docs: bool = Field(default=True, description="啟用 API 文檔")
    enable_metrics_endpoint: bool = Field(default=True, description="啟用指標端點")
    
    # 路由配置
    api_prefix: str = Field(default="/api/v1", description="API 路徑前綴")
    
    # 負載均衡配置
    enable_load_balancing: bool = Field(default=True, description="啟用負載均衡")
    health_check_interval: int = Field(default=30, description="健康檢查間隔（秒）")
    
    # 請求轉發超時
    proxy_timeout: int = Field(default=30, description="代理請求超時時間")
    
    # API Gateway 特定的率限配置
    rate_limit_per_minute: int = Field(default=120, description="API Gateway 每分鐘請求限制")


# 創建配置實例
settings = APIGatewaySettings()

# 為了向後兼容，導出常用配置
DATABASE_URL = settings.get_database_url_async()
REDIS_URL = settings.get_redis_url()
CORS_ORIGINS = settings.get_cors_origins_list()