"""
Order Service Configuration
基於統一配置管理系統的訂單服務配置
"""

import sys
from pathlib import Path

# 添加共享庫路徑
sys.path.append(str(Path(__file__).parent.parent.parent.parent / "libs"))

from orderly_fastapi_core import UnifiedSettings, get_settings
from pydantic import Field


class OrderServiceSettings(UnifiedSettings):
    """Order Service 特定配置"""
    
    # 覆蓋預設應用名稱和端口
    app_name: str = Field(default="Orderly Order Service", description="訂單服務名稱")
    port: int = Field(default=3002, description="訂單服務端口")
    
    # 訂單服務特定配置
    enable_order_notifications: bool = Field(default=True, description="啟用訂單通知")
    enable_auto_confirmation: bool = Field(default=False, description="啟用自動確認")
    enable_order_tracking: bool = Field(default=True, description="啟用訂單追蹤")
    
    # 訂單業務規則
    max_order_items: int = Field(default=50, description="最大訂單項目數")
    order_expiry_hours: int = Field(default=24, description="訂單過期時間（小時）")
    min_order_amount: float = Field(default=0.0, description="最小訂單金額")
    max_order_amount: float = Field(default=1000000.0, description="最大訂單金額")
    
    # 訂單狀態管理
    enable_draft_orders: bool = Field(default=True, description="啟用草稿訂單")
    enable_order_cancellation: bool = Field(default=True, description="啟用訂單取消")
    auto_cancel_after_hours: int = Field(default=72, description="自動取消未確認訂單時間")
    
    # 庫存集成
    enable_inventory_check: bool = Field(default=True, description="啟用庫存檢查")
    inventory_reserve_timeout: int = Field(default=30, description="庫存預留超時時間（分鐘）")
    
    # 支付集成
    enable_payment_integration: bool = Field(default=True, description="啟用支付集成")
    payment_timeout_minutes: int = Field(default=15, description="支付超時時間")
    
    # 配送設定
    enable_delivery_scheduling: bool = Field(default=True, description="啟用配送排程")
    default_delivery_days: int = Field(default=3, description="預設配送天數")


# 創建配置實例
settings = OrderServiceSettings()

# 為了向後兼容，保持原有接口
DATABASE_URL = settings.get_database_url_async()
APP_NAME = settings.app_name
PORT = settings.port
