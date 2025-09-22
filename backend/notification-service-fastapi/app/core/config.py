"""
Notification Service Configuration
基於統一配置管理系統的通知服務配置
"""

import sys
from pathlib import Path

# 添加共享庫路徑
sys.path.append(str(Path(__file__).parent.parent.parent.parent / "libs"))

from orderly_fastapi_core import UnifiedSettings, get_settings
from pydantic import Field


class NotificationServiceSettings(UnifiedSettings):
    """Notification Service 特定配置"""
    
    # 覆蓋預設應用名稱和端口
    app_name: str = Field(default="Orderly Notification Service", description="通知服務名稱")
    port: int = Field(default=3006, description="通知服務端口")
    
    # 通知服務特定配置
    enable_email_notifications: bool = Field(default=True, description="啟用電子郵件通知")
    enable_sms_notifications: bool = Field(default=False, description="啟用簡訊通知")
    enable_push_notifications: bool = Field(default=True, description="啟用推播通知")
    enable_webhooks: bool = Field(default=True, description="啟用 Webhook 通知")
    
    # 電子郵件配置
    smtp_host: str = Field(default="smtp.gmail.com", description="SMTP 主機")
    smtp_port: int = Field(default=587, description="SMTP 端口")
    smtp_use_tls: bool = Field(default=True, description="使用 TLS")
    smtp_username: str = Field(default="", description="SMTP 用戶名")
    smtp_password: str = Field(default="", description="SMTP 密碼")
    email_from_address: str = Field(default="noreply@orderly.com", description="發送郵件地址")
    email_from_name: str = Field(default="井然 Orderly", description="發送者名稱")
    
    # 簡訊配置（Twilio）
    twilio_account_sid: str = Field(default="", description="Twilio 帳號 SID")
    twilio_auth_token: str = Field(default="", description="Twilio 認證令牌")
    twilio_phone_number: str = Field(default="", description="Twilio 電話號碼")
    
    # 推播通知配置（Firebase）
    firebase_credentials_path: str = Field(default="", description="Firebase 憑證路徑")
    firebase_project_id: str = Field(default="orderly-firebase", description="Firebase 專案 ID")
    
    # 通知業務規則
    max_retry_attempts: int = Field(default=3, description="最大重試次數")
    retry_delay_seconds: int = Field(default=60, description="重試延遲時間（秒）")
    notification_timeout_seconds: int = Field(default=30, description="通知超時時間（秒）")
    
    # 通知類型開關
    enable_order_notifications: bool = Field(default=True, description="啟用訂單通知")
    enable_payment_notifications: bool = Field(default=True, description="啟用支付通知")
    enable_shipping_notifications: bool = Field(default=True, description="啟用配送通知")
    enable_system_notifications: bool = Field(default=True, description="啟用系統通知")
    enable_marketing_notifications: bool = Field(default=False, description="啟用行銷通知")
    
    # 通知偏好管理
    allow_user_preferences: bool = Field(default=True, description="允許用戶設定偏好")
    default_notification_channels: str = Field(default="email,push", description="預設通知渠道")
    
    # 批量通知配置
    enable_batch_notifications: bool = Field(default=True, description="啟用批量通知")
    batch_size: int = Field(default=100, description="批量大小")
    batch_delay_seconds: int = Field(default=5, description="批量延遲時間（秒）")
    
    # 通知模板配置
    template_cache_ttl: int = Field(default=3600, description="模板緩存 TTL（秒）")
    enable_template_validation: bool = Field(default=True, description="啟用模板驗證")
    
    # WebSocket 實時通知
    enable_websocket_notifications: bool = Field(default=True, description="啟用 WebSocket 通知")
    websocket_heartbeat_interval: int = Field(default=30, description="WebSocket 心跳間隔（秒）")
    
    # 通知統計和分析
    enable_delivery_tracking: bool = Field(default=True, description="啟用投遞追蹤")
    enable_open_rate_tracking: bool = Field(default=True, description="啟用開啟率追蹤")
    enable_click_tracking: bool = Field(default=True, description="啟用點擊追蹤")


# 創建配置實例
settings = NotificationServiceSettings()

# 為了向後兼容，保持原有接口
DATABASE_URL = settings.get_database_url_async()
APP_NAME = settings.app_name
PORT = settings.port
