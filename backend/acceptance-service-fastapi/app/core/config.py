"""
Acceptance Service Configuration
基於統一配置管理系統的驗收服務配置
"""

import sys
from pathlib import Path

# 添加共享庫路徑
sys.path.append(str(Path(__file__).parent.parent.parent.parent / "libs"))

from orderly_fastapi_core import UnifiedSettings, get_settings
from pydantic import Field


class AcceptanceServiceSettings(UnifiedSettings):
    """Acceptance Service 特定配置"""
    
    # 覆蓋預設應用名稱和端口
    app_name: str = Field(default="Orderly Acceptance Service", description="驗收服務名稱")
    port: int = Field(default=3004, description="驗收服務端口")
    
    # 驗收服務特定配置
    enable_photo_verification: bool = Field(default=True, description="啟用照片驗證")
    enable_signature_verification: bool = Field(default=True, description="啟用簽名驗證")
    enable_barcode_scanning: bool = Field(default=True, description="啟用條碼掃描")
    
    # 檔案上傳配置
    max_photo_size_mb: int = Field(default=10, description="最大照片大小（MB）")
    allowed_photo_formats: str = Field(default="jpg,jpeg,png", description="允許的照片格式")
    max_photos_per_acceptance: int = Field(default=10, description="每次驗收最大照片數")
    
    # 驗收業務規則
    require_photo_for_acceptance: bool = Field(default=True, description="驗收需要照片")
    require_signature_for_completion: bool = Field(default=False, description="完成需要簽名")
    auto_complete_after_hours: int = Field(default=24, description="自動完成驗收時間（小時）")
    
    # 異常處理
    enable_discrepancy_reporting: bool = Field(default=True, description="啟用差異報告")
    enable_damage_reporting: bool = Field(default=True, description="啟用損壞報告")
    require_manager_approval_for_discrepancy: bool = Field(default=True, description="差異需要主管批准")
    
    # 通知設定
    send_acceptance_notifications: bool = Field(default=True, description="發送驗收通知")
    send_completion_notifications: bool = Field(default=True, description="發送完成通知")
    send_discrepancy_alerts: bool = Field(default=True, description="發送差異警報")
    
    # 整合設定
    enable_inventory_sync: bool = Field(default=True, description="啟用庫存同步")
    enable_order_status_sync: bool = Field(default=True, description="啟用訂單狀態同步")
    
    # 雲端儲存配置
    photo_storage_bucket: str = Field(default="orderly-acceptance-photos", description="照片儲存桶")
    signature_storage_bucket: str = Field(default="orderly-signatures", description="簽名儲存桶")


# 創建配置實例
settings = AcceptanceServiceSettings()

# 為了向後兼容，保持原有接口
DATABASE_URL = settings.get_database_url_async()
APP_NAME = settings.app_name
PORT = settings.port
