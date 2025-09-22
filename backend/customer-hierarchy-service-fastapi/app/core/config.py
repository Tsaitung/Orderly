"""
Customer Hierarchy Service Configuration
基於統一配置管理系統的客戶層級服務配置
"""

import sys
from pathlib import Path
from typing import Optional, List

# 添加共享庫路徑
sys.path.append(str(Path(__file__).parent.parent.parent.parent / "libs"))

from orderly_fastapi_core import UnifiedSettings, get_settings
from pydantic import Field


class CustomerHierarchyServiceSettings(UnifiedSettings):
    """Customer Hierarchy Service 特定配置"""
    
    # 覆蓋預設應用名稱和端口
    app_name: str = Field(default="Customer Hierarchy Service", description="客戶層級服務名稱")
    api_version: str = Field(default="1.0.0", description="API 版本")
    api_v2_str: str = Field(default="/api/v2", description="API v2 路徑前綴")
    port: int = Field(default=3007, description="客戶層級服務端口")
    workers: int = Field(default=4, description="Worker 數量")
    
    # 環境和CORS配置
    environment: str = Field(default="development", description="運行環境")
    backend_cors_origins: List[str] = Field(default=["http://localhost:3000"], description="CORS 允許的來源")
    allowed_hosts: List[str] = Field(default=["localhost", "127.0.0.1"], description="允許的主機")
    redis_url: str = Field(default="redis://localhost:6379/0", description="Redis 連接 URL")
    
    # 客戶層級業務規則
    max_hierarchy_depth: int = Field(default=4, description="最大層級深度")
    max_locations_per_company: int = Field(default=100, description="每個公司最大地點數")
    max_units_per_location: int = Field(default=50, description="每個地點最大單位數")
    default_migration_batch_size: int = Field(default=100, description="預設遷移批次大小")
    
    # 台灣稅號驗證規則
    taiwan_company_tax_id_pattern: str = Field(default=r"^\d{8}$", description="台灣公司統編格式")
    taiwan_individual_id_pattern: str = Field(default=r"^[A-Z]\d{9}$", description="台灣個人身分證格式")
    
    # 緩存設定（覆蓋統一設定以符合業務需求）
    cache_tree_ttl: int = Field(default=600, description="層級樹緩存 TTL（10分鐘）")
    cache_entity_ttl: int = Field(default=300, description="個別實體緩存 TTL（5分鐘）")
    redis_ttl: int = Field(default=300, description="Redis 預設 TTL（5分鐘）")
    
    # 客戶管理配置
    enable_customer_verification: bool = Field(default=True, description="啟用客戶驗證")
    enable_auto_hierarchy_creation: bool = Field(default=True, description="啟用自動層級創建")
    enable_bulk_operations: bool = Field(default=True, description="啟用批量操作")
    enable_hierarchy_validation: bool = Field(default=True, description="啟用層級驗證")
    
    # 公司管理配置
    require_business_registration: bool = Field(default=True, description="需要商業登記")
    enable_company_verification: bool = Field(default=True, description="啟用公司驗證")
    company_verification_timeout_days: int = Field(default=7, description="公司驗證超時天數")
    
    # 地點管理配置
    enable_location_coordinates: bool = Field(default=True, description="啟用地點座標")
    enable_delivery_zones: bool = Field(default=True, description="啟用配送區域")
    max_delivery_radius_km: float = Field(default=50.0, description="最大配送半徑（公里）")
    
    # 單位管理配置
    enable_unit_budgets: bool = Field(default=True, description="啟用單位預算")
    enable_cost_centers: bool = Field(default=True, description="啟用成本中心")
    enable_approval_workflows: bool = Field(default=True, description="啟用審核工作流")
    
    # 層級權限管理
    enable_inherited_permissions: bool = Field(default=True, description="啟用繼承權限")
    enable_permission_overrides: bool = Field(default=True, description="啟用權限覆蓋")
    max_permission_inheritance_depth: int = Field(default=3, description="最大權限繼承深度")
    
    # 客戶分類配置
    enable_customer_segmentation: bool = Field(default=True, description="啟用客戶分群")
    enable_auto_categorization: bool = Field(default=False, description="啟用自動分類")
    customer_tier_levels: str = Field(default="bronze,silver,gold,platinum", description="客戶等級")
    
    # 審計和合規
    enable_audit_logging: bool = Field(default=True, description="啟用審計日誌")
    enable_data_retention_policies: bool = Field(default=True, description="啟用資料保留政策")
    audit_log_retention_days: int = Field(default=2555, description="審計日誌保留天數（7年）")
    
    # 整合設定
    enable_erp_integration: bool = Field(default=False, description="啟用 ERP 整合")
    enable_crm_sync: bool = Field(default=True, description="啟用 CRM 同步")
    sync_interval_minutes: int = Field(default=60, description="同步間隔（分鐘）")
    
    # 報告和分析
    enable_hierarchy_analytics: bool = Field(default=True, description="啟用層級分析")
    enable_customer_insights: bool = Field(default=True, description="啟用客戶洞察")
    enable_performance_metrics: bool = Field(default=True, description="啟用績效指標")
    
    # API 配置
    api_rate_limit_per_minute: int = Field(default=300, description="API 每分鐘限制")
    enable_bulk_api: bool = Field(default=True, description="啟用批量 API")
    max_bulk_operation_size: int = Field(default=1000, description="最大批量操作大小")
    
    # 搜索和篩選
    enable_fuzzy_search: bool = Field(default=True, description="啟用模糊搜索")
    enable_advanced_filters: bool = Field(default=True, description="啟用進階篩選")
    search_result_limit: int = Field(default=1000, description="搜索結果限制")
    
    # 通知配置
    enable_hierarchy_change_notifications: bool = Field(default=True, description="啟用層級變更通知")
    enable_verification_notifications: bool = Field(default=True, description="啟用驗證通知")
    enable_approval_notifications: bool = Field(default=True, description="啟用審核通知")
    
    # 資料匯入匯出
    enable_data_import: bool = Field(default=True, description="啟用資料匯入")
    enable_data_export: bool = Field(default=True, description="啟用資料匯出")
    max_import_file_size_mb: int = Field(default=100, description="最大匯入檔案大小（MB）")
    supported_import_formats: str = Field(default="csv,xlsx,json", description="支援的匯入格式")
    
    # 業務邏輯驗證
    enable_duplicate_detection: bool = Field(default=True, description="啟用重複檢測")
    enable_data_quality_checks: bool = Field(default=True, description="啟用資料品質檢查")
    enable_business_rule_validation: bool = Field(default=True, description="啟用業務規則驗證")
    
    # 為了向後兼容，保留舊的 property 方法
    @property
    def database_url_async(self) -> str:
        """Get async database URL"""
        return self.get_database_url_async()
    
    @property
    def database_url_sync(self) -> str:
        """Get sync database URL for Alembic"""
        return self.get_database_url_sync()


# 創建配置實例
settings = CustomerHierarchyServiceSettings()
