#!/usr/bin/env python3
"""
井然 Orderly Platform - 配置載入測試腳本
Configuration Loading Test Script

測試所有服務的統一配置系統是否正常工作
"""

import sys
import os
from pathlib import Path

# 設置項目根目錄路徑
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root / "backend" / "libs"))

def test_unified_config():
    """測試統一配置系統"""
    print("🔧 測試統一配置系統...")
    
    try:
        from orderly_fastapi_core import UnifiedSettings
        
        # 測試基本配置載入
        settings = UnifiedSettings()
        print(f"✅ 基本配置載入成功")
        print(f"   環境: {settings.environment}")
        print(f"   應用名稱: {settings.app_name}")
        print(f"   端口: {settings.port}")
        print(f"   資料庫 URL: {settings.get_database_url_async()}")
        print(f"   Redis URL: {settings.get_redis_url()}")
        
        return True
    except Exception as e:
        print(f"❌ 統一配置系統測試失敗: {e}")
        return False

def test_service_configs():
    """測試各服務配置"""
    print("\n🚀 測試服務配置...")
    
    services = [
        ("api-gateway-fastapi", "APIGatewaySettings"),
        ("user-service-fastapi", "UserServiceSettings"),
        ("order-service-fastapi", "OrderServiceSettings"),
        ("product-service-fastapi", "ProductServiceSettings"),
        ("acceptance-service-fastapi", "AcceptanceServiceSettings"),
        ("notification-service-fastapi", "NotificationServiceSettings"),
        ("customer-hierarchy-service-fastapi", "CustomerHierarchyServiceSettings"),
        ("supplier-service-fastapi", "SupplierServiceSettings"),
    ]
    
    success_count = 0
    total_count = len(services)
    
    for service_name, settings_class in services:
        try:
            # 動態導入服務配置
            service_path = project_root / "backend" / service_name / "app" / "core"
            sys.path.insert(0, str(service_path))
            
            config_module = __import__("config")
            settings_instance = getattr(config_module, "settings")
            
            print(f"✅ {service_name}: {settings_instance.app_name} (端口: {settings_instance.port})")
            success_count += 1
            
            # 清理路徑
            sys.path.remove(str(service_path))
            
        except Exception as e:
            print(f"❌ {service_name}: 配置載入失敗 - {e}")
    
    print(f"\n📊 測試結果: {success_count}/{total_count} 服務配置成功載入")
    return success_count == total_count

def test_environment_configs():
    """測試環境配置文件"""
    print("\n🌍 測試環境配置文件...")
    
    env_files = [
        ".env.local",
        "configs/local.env",
        "configs/staging.env", 
        "configs/production.env",
    ]
    
    success_count = 0
    
    for env_file in env_files:
        env_path = project_root / env_file
        if env_path.exists():
            try:
                # 讀取環境文件
                with open(env_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    
                # 統計配置項數量
                config_count = 0
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        config_count += 1
                        
                print(f"✅ {env_file}: {config_count} 個配置項")
                success_count += 1
                
            except Exception as e:
                print(f"❌ {env_file}: 讀取失敗 - {e}")
        else:
            print(f"⚠️ {env_file}: 文件不存在")
    
    return success_count > 0

def main():
    """主測試函數"""
    print("🔧 井然 Orderly Platform - 配置測試")
    print("=" * 60)
    
    # 設置環境變數以確保能正確載入配置
    os.environ.setdefault('ENVIRONMENT', 'development')
    os.environ.setdefault('DATABASE_HOST', 'localhost')
    os.environ.setdefault('DATABASE_PORT', '5432')
    os.environ.setdefault('DATABASE_NAME', 'orderly')
    os.environ.setdefault('DATABASE_USER', 'orderly')
    os.environ.setdefault('POSTGRES_PASSWORD', 'orderly_dev_password')
    os.environ.setdefault('REDIS_URL', 'redis://localhost:6379/0')
    
    # 運行測試
    tests = [
        ("統一配置系統", test_unified_config),
        ("服務配置", test_service_configs),
        ("環境配置文件", test_environment_configs),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append(result)
        except Exception as e:
            print(f"❌ 測試 {test_name} 時發生錯誤: {e}")
            results.append(False)
    
    # 輸出總結
    print("\n" + "=" * 60)
    print("📋 測試總結")
    print("=" * 60)
    
    success_count = sum(results)
    total_count = len(results)
    
    if success_count == total_count:
        print("🎉 所有測試通過！統一配置系統工作正常。")
        return 0
    else:
        print(f"⚠️ {success_count}/{total_count} 測試通過，請檢查失敗的測試。")
        return 1

if __name__ == "__main__":
    sys.exit(main())
