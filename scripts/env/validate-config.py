#!/usr/bin/env python3
"""
井然 Orderly Platform - 配置驗證腳本
Configuration Validation Script

驗證統一配置管理系統的配置完整性和正確性
"""

import os
import sys
import re
from pathlib import Path
from typing import Dict, List, Optional, Union
import json

# Colors for output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

def print_status(message: str, color: str = Colors.GREEN):
    """Print colored status message"""
    print(f"{color}✅ {message}{Colors.NC}")

def print_warning(message: str):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠️ {message}{Colors.NC}")

def print_error(message: str):
    """Print error message"""
    print(f"{Colors.RED}❌ {message}{Colors.NC}")

def print_info(message: str):
    """Print info message"""
    print(f"{Colors.BLUE}ℹ️ {message}{Colors.NC}")

class ConfigValidator:
    """統一配置驗證器"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.errors = []
        self.warnings = []
        self.info = []
        
        # 必需的環境變數
        self.required_vars = {
            # 核心配置
            'ENVIRONMENT': ['development', 'staging', 'production'],
            'SECRET_KEY': None,
            'JWT_SECRET': None,
            
            # 資料庫配置
            'DATABASE_HOST': None,
            'DATABASE_PORT': None,
            'DATABASE_NAME': None,
            'DATABASE_USER': None,
            'POSTGRES_PASSWORD': None,
            
            # Redis 配置
            'REDIS_HOST': None,
            'REDIS_PORT': None,
            'REDIS_URL': None,
        }
        
        # 推薦的環境變數
        self.recommended_vars = {
            'APP_VERSION': None,
            'LOG_LEVEL': ['DEBUG', 'INFO', 'WARNING', 'ERROR'],
            'CORS_ORIGINS': None,
            'ENABLE_SWAGGER': ['true', 'false'],
            'ENABLE_DOCS': ['true', 'false'],
            'MAX_FILE_SIZE': None,
            'ALLOWED_FILE_TYPES': None,
        }
        
        # 服務 URL 配置
        self.service_urls = [
            'API_GATEWAY_URL',
            'USER_SERVICE_URL',
            'ORDER_SERVICE_URL',
            'PRODUCT_SERVICE_URL',
            'ACCEPTANCE_SERVICE_URL',
            'NOTIFICATION_SERVICE_URL',
            'CUSTOMER_HIERARCHY_SERVICE_URL',
            'SUPPLIER_SERVICE_URL',
        ]

    def load_env_file(self, env_path: Path) -> Dict[str, str]:
        """載入 .env 文件"""
        env_vars = {}
        if env_path.exists():
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key.strip()] = value.strip()
        return env_vars

    def validate_env_var(self, key: str, value: str, allowed_values: Optional[List[str]] = None) -> bool:
        """驗證單個環境變數"""
        if not value:
            self.errors.append(f"環境變數 {key} 為空")
            return False
            
        if allowed_values and value not in allowed_values:
            self.errors.append(f"環境變數 {key} 值 '{value}' 不在允許的值中: {allowed_values}")
            return False
            
        # 特殊驗證
        if key == 'REDIS_URL':
            if not value.startswith('redis://'):
                self.errors.append(f"REDIS_URL 格式不正確: {value}")
                return False
                
        elif key.endswith('_PORT'):
            try:
                port = int(value)
                if not (1 <= port <= 65535):
                    self.errors.append(f"端口 {key} 超出有效範圍 (1-65535): {port}")
                    return False
            except ValueError:
                self.errors.append(f"端口 {key} 不是有效數字: {value}")
                return False
                
        elif key.endswith('_URL') and key in self.service_urls:
            if not (value.startswith('http://') or value.startswith('https://')):
                self.errors.append(f"服務 URL {key} 格式不正確: {value}")
                return False
                
        return True

    def validate_security_settings(self, env_vars: Dict[str, str]):
        """驗證安全設置"""
        environment = env_vars.get('ENVIRONMENT', '').lower()
        
        # 檢查生產環境的安全設置
        if environment == 'production':
            insecure_defaults = [
                ('SECRET_KEY', 'dev-app-secret-key-change-in-production'),
                ('JWT_SECRET', 'dev-jwt-secret-change-in-production'),
                ('JWT_REFRESH_SECRET', 'dev-jwt-refresh-secret-change-in-production'),
                ('POSTGRES_PASSWORD', 'orderly_dev_password'),
            ]
            
            for key, default_value in insecure_defaults:
                if env_vars.get(key) == default_value:
                    self.errors.append(f"生產環境中 {key} 仍使用預設值，存在安全風險")
                    
        # 檢查密鑰長度
        secret_keys = ['SECRET_KEY', 'JWT_SECRET', 'JWT_REFRESH_SECRET']
        for key in secret_keys:
            value = env_vars.get(key, '')
            if value and len(value) < 32:
                self.warnings.append(f"{key} 長度少於 32 字符，建議使用更長的密鑰")

    def validate_service_consistency(self, env_vars: Dict[str, str]):
        """驗證服務配置一致性"""
        # 檢查資料庫配置一致性
        db_host = env_vars.get('DATABASE_HOST', 'localhost')
        db_port = env_vars.get('DATABASE_PORT', '5432')
        db_name = env_vars.get('DATABASE_NAME', 'orderly')
        db_user = env_vars.get('DATABASE_USER', 'orderly')
        db_password = env_vars.get('POSTGRES_PASSWORD', '')
        
        actual_db_url = env_vars.get('DATABASE_URL', '')
        if actual_db_url:
            self.warnings.append(
                "偵測到舊的 DATABASE_URL 設定，建議改用 DATABASE_HOST / DATABASE_PORT / DATABASE_NAME / "
                "DATABASE_USER / POSTGRES_PASSWORD 由程式自動組裝連線字串"
            )
            
        # 檢查 Redis 配置一致性
        redis_host = env_vars.get('REDIS_HOST', 'localhost')
        redis_port = env_vars.get('REDIS_PORT', '6379')
        expected_redis_url = f"redis://{redis_host}:{redis_port}/0"
        actual_redis_url = env_vars.get('REDIS_URL', '')
        
        if actual_redis_url and actual_redis_url != expected_redis_url:
            self.warnings.append(f"REDIS_URL 與其他 Redis 配置不一致\n  期望: {expected_redis_url}\n  實際: {actual_redis_url}")

    def validate_business_rules(self, env_vars: Dict[str, str]):
        """驗證業務規則配置"""
        # 檢查檔案大小限制
        max_file_size = env_vars.get('MAX_FILE_SIZE', '')
        if max_file_size:
            try:
                size = int(max_file_size)
                if size > 100 * 1024 * 1024:  # 100MB
                    self.warnings.append(f"MAX_FILE_SIZE 設置過大 ({size} bytes)，可能影響性能")
            except ValueError:
                self.errors.append(f"MAX_FILE_SIZE 不是有效數字: {max_file_size}")
                
        # 檢查率限設置
        rate_limit = env_vars.get('RATE_LIMIT_PER_MINUTE', '')
        if rate_limit:
            try:
                limit = int(rate_limit)
                if limit > 10000:
                    self.warnings.append(f"RATE_LIMIT_PER_MINUTE 設置過高 ({limit})，可能無法有效防止濫用")
                elif limit < 10:
                    self.warnings.append(f"RATE_LIMIT_PER_MINUTE 設置過低 ({limit})，可能影響正常使用")
            except ValueError:
                self.errors.append(f"RATE_LIMIT_PER_MINUTE 不是有效數字: {rate_limit}")

    def validate_service_name_lengths(self, environment: str = 'staging', suffix: str = ''):
        """驗證 Cloud Run 服務名稱長度（必須 ≤30 字元）"""
        MAX_LENGTH = 30
        services = [
            'api-gateway-fastapi',
            'user-service-fastapi',
            'order-service-fastapi',
            'product-service-fastapi',
            'acceptance-service-fastapi',
            'notification-service-fastapi',
            'customer-hierarchy-service-fastapi',
            'supplier-service-fastapi',
        ]
        
        print_info(f"檢查服務名稱長度 (環境: {environment}{suffix}, 最大長度: {MAX_LENGTH})")
        
        for service in services:
            # 特殊處理 customer-hierarchy-service
            if service == 'customer-hierarchy-service-fastapi':
                if f"{environment}{suffix}" == "staging-v2":
                    cloud_run_name = "orderly-custhier-staging-v2"
                else:
                    cloud_run_name = f"orderly-customer-hierarchy-{environment}{suffix}"
            else:
                cloud_run_name = f"orderly-{service}-{environment}{suffix}"
            
            name_length = len(cloud_run_name)
            
            if name_length > MAX_LENGTH:
                self.errors.append(
                    f"服務名稱過長: {cloud_run_name} ({name_length} 字元 > {MAX_LENGTH})"
                )
                # 提供縮寫建議
                if 'customer-hierarchy' in service:
                    self.info.append("  建議: 使用 'custhier' 縮寫")
                elif 'notification' in service:
                    self.info.append("  建議: 使用 'notify' 縮寫")
                elif 'acceptance' in service:
                    self.info.append("  建議: 使用 'accept' 縮寫")
            else:
                self.info.append(f"✓ {cloud_run_name} ({name_length} 字元)")
    
    def validate_database_port(self, env_vars: Dict[str, str]):
        """驗證 DATABASE_PORT 配置（必須為 5432）"""
        REQUIRED_PORT = "5432"
        
        db_port = env_vars.get('DATABASE_PORT', '')
        
        if not db_port:
            self.errors.append(
                "缺少必要的 DATABASE_PORT 環境變數（所有 FastAPI 服務都需要）"
            )
            self.info.append(f"  請設置: DATABASE_PORT=\"{REQUIRED_PORT}\"")
        elif db_port != REQUIRED_PORT:
            self.errors.append(
                f"DATABASE_PORT 值不正確: '{db_port}' (應為 '{REQUIRED_PORT}')"
            )
        else:
            self.info.append(f"✓ DATABASE_PORT 正確設置為 {REQUIRED_PORT}")

    def validate_docker_compose(self):
        """驗證 Docker Compose 配置"""
        compose_files = [
            'compose.base.yml',
            'compose.dev.yml',
            'compose.monolith.yml',
            'compose.staging.yml',
            'compose.prod.yml'
        ]
        
        missing_files = []
        for file in compose_files:
            compose_path = self.project_root / file
            if not compose_path.exists():
                missing_files.append(file)
                
        if missing_files:
            self.warnings.append(f"缺少 Docker Compose 文件: {', '.join(missing_files)}")

    def validate_service_configs(self):
        """驗證服務配置文件"""
        services = [
            'api-gateway-fastapi',
            'user-service-fastapi',
            'order-service-fastapi',
            'product-service-fastapi',
            'acceptance-service-fastapi',
            'billing-service-fastapi',
            'notification-service-fastapi',
            'customer-hierarchy-service-fastapi',
            'supplier-service-fastapi',
        ]
        
        for service in services:
            config_path = self.project_root / 'backend' / service / 'app' / 'core' / 'config.py'
            if not config_path.exists():
                self.warnings.append(f"缺少服務配置文件: {config_path}")
            else:
                # 檢查配置文件是否使用統一配置
                with open(config_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'UnifiedSettings' not in content:
                        self.warnings.append(f"服務 {service} 尚未遷移到統一配置系統")

    def run_validation(self) -> bool:
        """運行完整驗證"""
        print_info("開始配置驗證...")
        
        # 載入環境變數
        env_files = [
            self.project_root / '.env.local',
            self.project_root / '.env.example',
        ]
        
        env_vars = {}
        for env_file in env_files:
            if env_file.exists():
                file_vars = self.load_env_file(env_file)
                env_vars.update(file_vars)
                print_info(f"載入配置文件: {env_file}")
                break
        else:
            self.errors.append("找不到任何環境配置文件")
            
        # 檢查系統環境變數
        for key in self.required_vars.keys():
            if key in os.environ:
                env_vars[key] = os.environ[key]
                
        # 驗證必需變數
        for key, allowed_values in self.required_vars.items():
            value = env_vars.get(key, '')
            if not value:
                self.errors.append(f"缺少必需的環境變數: {key}")
            else:
                self.validate_env_var(key, value, allowed_values)
                
        # 驗證推薦變數
        for key, allowed_values in self.recommended_vars.items():
            value = env_vars.get(key, '')
            if value:
                self.validate_env_var(key, value, allowed_values)
            else:
                self.warnings.append(f"建議設置環境變數: {key}")
                
        # 驗證服務 URLs
        for key in self.service_urls:
            value = env_vars.get(key, '')
            if value:
                self.validate_env_var(key, value)
            else:
                self.warnings.append(f"建議設置服務 URL: {key}")
                
        # 運行專項驗證
        self.validate_security_settings(env_vars)
        self.validate_service_consistency(env_vars)
        self.validate_business_rules(env_vars)
        self.validate_docker_compose()
        self.validate_service_configs()
        
        # 新增: Cloud Run 相關驗證
        environment = env_vars.get('ENVIRONMENT', 'staging')
        service_suffix = env_vars.get('SERVICE_SUFFIX', '')
        self.validate_service_name_lengths(environment, service_suffix)
        self.validate_database_port(env_vars)
        
        # 輸出結果
        print("\n" + "="*60)
        print_info("配置驗證結果")
        print("="*60)
        
        if self.errors:
            print(f"\n{Colors.RED}錯誤 ({len(self.errors)})::{Colors.NC}")
            for error in self.errors:
                print_error(error)
                
        if self.warnings:
            print(f"\n{Colors.YELLOW}警告 ({len(self.warnings)})::{Colors.NC}")
            for warning in self.warnings:
                print_warning(warning)
                
        if not self.errors and not self.warnings:
            print_status("✨ 所有配置驗證通過！")
            return True
        elif not self.errors:
            print_status("✅ 基本配置正確，但有一些建議需要注意")
            return True
        else:
            print_error(f"❌ 發現 {len(self.errors)} 個錯誤，需要修復")
            return False


def main():
    """主函數"""
    print(f"{Colors.BLUE}🔧 井然 Orderly Platform - 配置驗證{Colors.NC}")
    print("=" * 60)
    
    # 確定專案根目錄
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    
    # 運行驗證
    validator = ConfigValidator(project_root)
    success = validator.run_validation()
    
    # 返回適當的退出碼
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
