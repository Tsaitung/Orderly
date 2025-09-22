"""
Supplier Service Configuration
基於統一配置管理系統的供應商服務配置
"""

import sys
from pathlib import Path

# 添加共享庫路徑
sys.path.append(str(Path(__file__).parent.parent.parent.parent / "libs"))

from orderly_fastapi_core import UnifiedSettings, get_settings
from pydantic import Field


class SupplierServiceSettings(UnifiedSettings):
    """Supplier Service 特定配置"""
    
    # 覆蓋預設應用名稱和端口
    app_name: str = Field(default="Orderly Supplier Service", description="供應商服務名稱")
    port: int = Field(default=3008, description="供應商服務端口")
    
    # 供應商服務特定配置
    enable_supplier_registration: bool = Field(default=True, description="啟用供應商註冊")
    enable_supplier_verification: bool = Field(default=True, description="啟用供應商驗證")
    enable_supplier_onboarding: bool = Field(default=True, description="啟用供應商入駐")
    enable_supplier_catalog: bool = Field(default=True, description="啟用供應商目錄")
    
    # 供應商驗證配置
    require_business_license: bool = Field(default=True, description="需要營業執照")
    require_tax_certificate: bool = Field(default=True, description="需要稅務證明")
    require_bank_account: bool = Field(default=True, description="需要銀行帳戶")
    verification_timeout_days: int = Field(default=7, description="驗證超時天數")
    
    # 供應商等級管理
    enable_supplier_tiers: bool = Field(default=True, description="啟用供應商等級")
    default_supplier_tier: str = Field(default="bronze", description="預設供應商等級")
    tier_upgrade_criteria: str = Field(default="orders,revenue,rating", description="等級升級標準")
    
    # 供應商評級系統
    enable_supplier_rating: bool = Field(default=True, description="啟用供應商評級")
    min_rating_score: float = Field(default=1.0, description="最低評分")
    max_rating_score: float = Field(default=5.0, description="最高評分")
    rating_required_orders: int = Field(default=5, description="評級所需訂單數")
    
    # 產品管理
    enable_supplier_products: bool = Field(default=True, description="啟用供應商產品管理")
    max_products_per_supplier: int = Field(default=1000, description="每個供應商最大產品數")
    require_product_approval: bool = Field(default=True, description="產品需要審核")
    auto_approve_trusted_suppliers: bool = Field(default=False, description="自動批准信任供應商")
    
    # 庫存管理
    enable_inventory_management: bool = Field(default=True, description="啟用庫存管理")
    enable_real_time_inventory: bool = Field(default=True, description="啟用實時庫存")
    inventory_sync_interval: int = Field(default=300, description="庫存同步間隔（秒）")
    low_stock_notification: bool = Field(default=True, description="低庫存通知")
    
    # 訂單管理
    enable_order_management: bool = Field(default=True, description="啟用訂單管理")
    auto_accept_orders: bool = Field(default=False, description="自動接受訂單")
    order_acceptance_timeout: int = Field(default=30, description="訂單接受超時時間（分鐘）")
    enable_partial_fulfillment: bool = Field(default=True, description="啟用部分履行")
    
    # 財務管理
    enable_financial_management: bool = Field(default=True, description="啟用財務管理")
    enable_commission_tracking: bool = Field(default=True, description="啟用佣金追蹤")
    default_commission_rate: float = Field(default=0.03, description="預設佣金率（3%）")
    payment_term_days: int = Field(default=30, description="付款期限天數")
    
    # 供應商門戶配置
    enable_supplier_portal: bool = Field(default=True, description="啟用供應商門戶")
    enable_analytics_dashboard: bool = Field(default=True, description="啟用分析儀表板")
    enable_performance_reports: bool = Field(default=True, description="啟用績效報告")
    enable_sales_forecasting: bool = Field(default=False, description="啟用銷售預測")
    
    # 文件管理
    max_document_size_mb: int = Field(default=10, description="最大文件大小（MB）")
    allowed_document_types: str = Field(default="pdf,jpg,jpeg,png,doc,docx", description="允許的文件類型")
    document_retention_days: int = Field(default=2555, description="文件保留天數（7年）")
    
    # 通知配置
    enable_order_notifications: bool = Field(default=True, description="啟用訂單通知")
    enable_payment_notifications: bool = Field(default=True, description="啟用付款通知")
    enable_inventory_alerts: bool = Field(default=True, description="啟用庫存警報")
    enable_performance_alerts: bool = Field(default=True, description="啟用績效警報")
    
    # API 整合
    enable_third_party_integrations: bool = Field(default=True, description="啟用第三方整合")
    api_rate_limit_per_minute: int = Field(default=1000, description="API 每分鐘限制")
    enable_webhook_notifications: bool = Field(default=True, description="啟用 Webhook 通知")
    
    # 供應鏈管理
    enable_supply_chain_tracking: bool = Field(default=True, description="啟用供應鏈追蹤")
    enable_delivery_scheduling: bool = Field(default=True, description="啟用配送排程")
    default_lead_time_days: int = Field(default=3, description="預設交貨時間天數")
    
    # 質量管理
    enable_quality_control: bool = Field(default=True, description="啟用質量控制")
    enable_return_management: bool = Field(default=True, description="啟用退貨管理")
    quality_score_threshold: float = Field(default=4.0, description="質量分數閾值")
    
    # 合規性管理
    enable_compliance_tracking: bool = Field(default=True, description="啟用合規性追蹤")
    require_food_safety_cert: bool = Field(default=True, description="需要食品安全證書")
    require_halal_cert: bool = Field(default=False, description="需要清真認證")
    cert_expiry_alert_days: int = Field(default=30, description="證書到期提醒天數")


# 創建配置實例
settings = SupplierServiceSettings()

# 為了向後兼容，保持原有接口
DATABASE_URL = settings.get_database_url_async()
JWT_SECRET = settings.jwt_secret
USER_SERVICE_URL = settings.user_service_url
ORDER_SERVICE_URL = settings.order_service_url
APP_NAME = settings.app_name
PORT = settings.port
