"""
Product Service Configuration
基於統一配置管理系統的產品服務配置
"""

import sys
from pathlib import Path
from typing import List

# 添加共享庫路徑
sys.path.append(str(Path(__file__).parent.parent.parent.parent / "libs"))

from orderly_fastapi_core import UnifiedSettings, get_settings
from pydantic import Field


class ProductServiceSettings(UnifiedSettings):
    """Product Service 特定配置"""
    
    # 覆蓋預設應用名稱和端口
    app_name: str = Field(default="Orderly Product Service", description="產品服務名稱")
    port: int = Field(default=3003, description="產品服務端口")
    
    # 產品服務特定配置
    enable_product_search: bool = Field(default=True, description="啟用產品搜索")
    enable_category_management: bool = Field(default=True, description="啟用分類管理")
    enable_inventory_tracking: bool = Field(default=True, description="啟用庫存追蹤")
    enable_price_history: bool = Field(default=True, description="啟用價格歷史")
    
    # 產品圖片配置
    max_product_images: int = Field(default=10, description="每個產品最大圖片數")
    max_image_size_mb: int = Field(default=5, description="最大圖片大小（MB）")
    allowed_image_formats: str = Field(default="jpg,jpeg,png,webp", description="允許的圖片格式")
    image_quality: int = Field(default=85, description="圖片壓縮品質")
    
    # 產品驗證規則
    require_product_images: bool = Field(default=True, description="需要產品圖片")
    require_product_description: bool = Field(default=True, description="需要產品描述")
    min_description_length: int = Field(default=20, description="最小描述長度")
    max_description_length: int = Field(default=2000, description="最大描述長度")
    
    # 分類管理
    max_category_depth: int = Field(default=5, description="分類最大層級")
    enable_category_hierarchy: bool = Field(default=True, description="啟用分類層級")
    auto_categorize_products: bool = Field(default=False, description="自動分類產品")
    
    # 庫存管理
    enable_stock_alerts: bool = Field(default=True, description="啟用庫存警報")
    low_stock_threshold: int = Field(default=10, description="低庫存閾值")
    enable_auto_reorder: bool = Field(default=False, description="啟用自動補貨")
    stock_update_batch_size: int = Field(default=100, description="庫存更新批次大小")
    
    # 價格管理
    enable_dynamic_pricing: bool = Field(default=False, description="啟用動態定價")
    enable_bulk_pricing: bool = Field(default=True, description="啟用批量定價")
    enable_promotional_pricing: bool = Field(default=True, description="啟用促銷定價")
    price_change_threshold_percent: float = Field(default=10.0, description="價格變動閾值百分比")
    
    # 產品搜索和索引
    enable_elasticsearch: bool = Field(default=False, description="啟用 Elasticsearch")
    elasticsearch_url: str = Field(default="http://localhost:9200", description="Elasticsearch URL")
    search_index_name: str = Field(default="orderly_products", description="搜索索引名稱")
    enable_fuzzy_search: bool = Field(default=True, description="啟用模糊搜索")
    
    # 產品同步配置
    enable_external_sync: bool = Field(default=False, description="啟用外部同步")
    sync_interval_minutes: int = Field(default=60, description="同步間隔（分鐘）")
    sync_batch_size: int = Field(default=50, description="同步批次大小")
    
    # 緩存配置
    enable_product_cache: bool = Field(default=True, description="啟用產品緩存")
    product_cache_ttl: int = Field(default=3600, description="產品緩存 TTL（秒）")
    category_cache_ttl: int = Field(default=7200, description="分類緩存 TTL（秒）")
    
    # 產品規格配置
    enable_product_variants: bool = Field(default=True, description="啟用產品變體")
    max_variants_per_product: int = Field(default=20, description="每個產品最大變體數")
    enable_custom_attributes: bool = Field(default=True, description="啟用自定義屬性")
    
    # 供應商整合
    enable_supplier_products: bool = Field(default=True, description="啟用供應商產品")
    enable_multi_supplier: bool = Field(default=True, description="啟用多供應商")
    supplier_product_approval: bool = Field(default=True, description="供應商產品需要審核")
    
    # API 限制
    products_per_page: int = Field(default=20, description="每頁產品數")
    max_products_per_page: int = Field(default=100, description="每頁最大產品數")
    max_search_results: int = Field(default=1000, description="最大搜索結果數")
    
    # 雲端儲存配置
    product_images_bucket: str = Field(default="orderly-product-images", description="產品圖片儲存桶")
    enable_cdn: bool = Field(default=True, description="啟用 CDN")
    cdn_domain: str = Field(default="cdn.orderly.com", description="CDN 域名")


# 創建配置實例
settings = ProductServiceSettings()

# 為了向後兼容，保持原有接口
DATABASE_URL = settings.get_database_url_async()
REDIS_URL = settings.get_redis_url()
CORS_ORIGINS = settings.get_cors_origins_list()
APP_NAME = settings.app_name
PORT = settings.port
