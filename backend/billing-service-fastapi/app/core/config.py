"""
Billing Service Configuration
基於統一配置管理系統的計費服務配置
"""

import sys
from pathlib import Path

# 添加共享庫路徑
sys.path.append(str(Path(__file__).parent.parent.parent.parent / "libs"))

from orderly_fastapi_core import UnifiedSettings, get_settings
from pydantic import Field


class BillingServiceSettings(UnifiedSettings):
    """Billing Service 特定配置"""

    # 覆蓋預設應用名稱和端口
    app_name: str = Field(default="Orderly Billing Service", description="計費服務名稱")
    port: int = Field(default=3005, description="計費服務端口")

    # 計費服務特定配置
    enable_auto_reconciliation: bool = Field(default=True, description="啟用自動對帳")
    enable_invoice_generation: bool = Field(default=False, description="啟用發票生成（目前為對帳單）")
    enable_payment_tracking: bool = Field(default=True, description="啟用付款追蹤")

    # 對帳配置（依 PRD-Billing-Master.md）
    reconciliation_window_days: int = Field(default=7, description="對帳窗口天數")
    reconciliation_amount_tolerance: float = Field(default=0.01, description="金額容差比例")
    reconciliation_auto_close_days: int = Field(default=30, description="自動結案天數")
    auto_approve_threshold: float = Field(default=0.95, description="自動審批信心閾值")

    # 費率配置
    default_transaction_fee_pct: float = Field(default=0.008, description="預設交易佣金 (0.8%)")
    transaction_fee_min_pct: float = Field(default=0.0, description="最低佣金")
    transaction_fee_max_pct: float = Field(default=0.03, description="最高佣金 (3%)")

    # 快速撥款配置
    fast_payout_fee_min: float = Field(default=0.005, description="快速撥款最低費率")
    fast_payout_fee_max: float = Field(default=0.02, description="快速撥款最高費率")

    # 訂閱方案配置
    free_plan_monthly_fee: float = Field(default=0.0, description="免費方案月費")
    free_plan_included_users: int = Field(default=3, description="免費方案包含用戶數")
    free_plan_extra_user_fee: float = Field(default=150.0, description="免費方案額外用戶費")
    pro_plan_monthly_fee: float = Field(default=3000.0, description="專業方案月費")

    # 結算週期
    settlement_terms: str = Field(default="T+7", description="結算條款")
    billing_run_schedule: str = Field(default="daily", description="計費執行週期")

    # 稽核配置
    enable_audit_trail: bool = Field(default=True, description="啟用稽核軌跡")
    audit_log_retention_days: int = Field(default=365, description="稽核日誌保留天數")

    # Savings Share 配置
    platform_share_pct: float = Field(default=0.3, description="平台節省分成 (30%)")
    min_saving_threshold_pct: float = Field(default=0.01, description="最低節省門檻 (1%)")


# 創建配置實例
settings = BillingServiceSettings()

# 為了向後兼容，保持原有接口
DATABASE_URL = settings.get_database_url_async()
APP_NAME = settings.app_name
PORT = settings.port
