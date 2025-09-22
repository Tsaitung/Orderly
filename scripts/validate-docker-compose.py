#!/usr/bin/env python3
"""
井然 Orderly Platform - Docker Compose 配置驗證腳本
Docker Compose Configuration Validation Script

驗證 Docker Compose 配置文件的語法和完整性（無需 Docker）
"""

import yaml
import sys
import os
from pathlib import Path
from typing import Dict, List, Set

# Colors for output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'

def print_status(message: str):
    print(f"{Colors.GREEN}✅ {message}{Colors.NC}")

def print_warning(message: str):
    print(f"{Colors.YELLOW}⚠️ {message}{Colors.NC}")

def print_error(message: str):
    print(f"{Colors.RED}❌ {message}{Colors.NC}")

def print_info(message: str):
    print(f"{Colors.BLUE}ℹ️ {message}{Colors.NC}")

class DockerComposeValidator:
    """Docker Compose 配置驗證器"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.errors = []
        self.warnings = []
        self.compose_files = [
            'compose.base.yml',
            'compose.services.yml', 
            'compose.dev.yml',
            'compose.staging.yml',
            'compose.prod.yml',
        ]
        
        # 預期的服務列表（不包含 billing）
        self.expected_services = {
            'postgres', 'redis',  # 基礎服務
            'api-gateway', 'user-service', 'order-service',
            'product-service', 'acceptance-service', 
            'notification-service', 'customer-hierarchy-service',
            'supplier-service'
        }
        
        # 預期的端口映射
        self.expected_ports = {
            'postgres': 5432,
            'redis': 6379,
            'api-gateway': 8000,
            'user-service': 3001,
            'order-service': 3002,
            'product-service': 3003,
            'acceptance-service': 3004,
            'notification-service': 3006,
            'customer-hierarchy-service': 3007,
            'supplier-service': 3008,
        }

    def load_compose_file(self, file_path: Path) -> Dict:
        """載入 Docker Compose 文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            self.errors.append(f"文件不存在: {file_path}")
            return {}
        except yaml.YAMLError as e:
            self.errors.append(f"YAML 語法錯誤 in {file_path}: {e}")
            return {}
        except Exception as e:
            self.errors.append(f"讀取文件錯誤 {file_path}: {e}")
            return {}

    def validate_yaml_syntax(self):
        """驗證所有 Compose 文件的 YAML 語法"""
        print_info("驗證 Docker Compose 文件語法...")
        
        for file_name in self.compose_files:
            file_path = self.project_root / file_name
            
            if not file_path.exists():
                self.errors.append(f"缺少 Compose 文件: {file_name}")
                continue
                
            compose_data = self.load_compose_file(file_path)
            if compose_data:
                print_status(f"{file_name} 語法正確")
            else:
                print_error(f"{file_name} 語法錯誤")

    def validate_service_consistency(self):
        """驗證服務配置的一致性"""
        print_info("驗證服務配置一致性...")
        
        # 載入所有配置
        all_configs = {}
        for file_name in self.compose_files:
            file_path = self.project_root / file_name
            if file_path.exists():
                all_configs[file_name] = self.load_compose_file(file_path)
        
        # 收集所有定義的服務
        all_services = set()
        for file_name, config in all_configs.items():
            if 'services' in config:
                services = set(config['services'].keys())
                all_services.update(services)
                print_info(f"{file_name} 定義的服務: {', '.join(services)}")
        
        # 檢查是否有 billing-service 殘留
        if 'billing-service' in all_services:
            self.errors.append("發現 billing-service 殘留引用，應該移除")
        else:
            print_status("確認沒有 billing-service 引用")
        
        # 檢查必要服務
        missing_services = self.expected_services - all_services
        if missing_services:
            for service in missing_services:
                self.warnings.append(f"缺少預期服務: {service}")
        
        extra_services = all_services - self.expected_services - {'billing-service', 'pgadmin', 'redis-commander'}
        if extra_services:
            for service in extra_services:
                self.warnings.append(f"發現額外服務: {service}")

    def validate_port_mappings(self):
        """驗證端口映射"""
        print_info("驗證端口映射...")
        
        dev_config = self.load_compose_file(self.project_root / 'compose.dev.yml')
        if 'services' in dev_config:
            for service_name, service_config in dev_config['services'].items():
                if 'ports' in service_config:
                    for port_mapping in service_config['ports']:
                        if isinstance(port_mapping, str) and ':' in port_mapping:
                            host_port = int(port_mapping.split(':')[0])
                            expected_port = self.expected_ports.get(service_name)
                            
                            if expected_port and host_port != expected_port:
                                self.warnings.append(
                                    f"{service_name} 端口映射不符預期: {host_port} != {expected_port}"
                                )
                            else:
                                print_status(f"{service_name} 端口映射正確: {port_mapping}")

    def validate_environment_variables(self):
        """驗證環境變數配置"""
        print_info("驗證環境變數配置...")
        
        # 檢查各環境的配置
        environments = ['dev', 'staging', 'prod']
        
        for env in environments:
            file_path = self.project_root / f'compose.{env}.yml'
            if file_path.exists():
                config = self.load_compose_file(file_path)
                if 'services' in config:
                    for service_name, service_config in config['services'].items():
                        if 'environment' in service_config:
                            env_vars = service_config['environment']
                            
                            # 檢查是否設置了 ENVIRONMENT 變數
                            if isinstance(env_vars, dict):
                                if 'ENVIRONMENT' not in env_vars:
                                    self.warnings.append(
                                        f"{service_name} in {env} 環境缺少 ENVIRONMENT 變數"
                                    )
                                else:
                                    # 環境變數映射：使用完整名稱而不是縮寫
                                    env_mapping = {
                                        'dev': 'development',
                                        'staging': 'staging', 
                                        'prod': 'production'
                                    }
                                    expected_env = env_mapping.get(env, env)
                                    if env_vars['ENVIRONMENT'] != expected_env:
                                        self.errors.append(
                                            f"{service_name} ENVIRONMENT 變數錯誤: "
                                            f"{env_vars['ENVIRONMENT']} != {expected_env}"
                                        )

    def validate_service_dependencies(self):
        """驗證服務依賴關係"""
        print_info("驗證服務依賴關係...")
        
        services_config = self.load_compose_file(self.project_root / 'compose.services.yml')
        if 'services' in services_config:
            for service_name, service_config in services_config['services'].items():
                if 'depends_on' in service_config:
                    dependencies = service_config['depends_on']
                    print_info(f"{service_name} 依賴: {list(dependencies.keys())}")
                    
                    # 檢查是否依賴已移除的 billing-service
                    if 'billing-service' in dependencies:
                        self.errors.append(f"{service_name} 仍依賴已移除的 billing-service")

    def validate_health_checks(self):
        """驗證健康檢查配置"""
        print_info("驗證健康檢查配置...")
        
        services_config = self.load_compose_file(self.project_root / 'compose.services.yml')
        if 'services' in services_config:
            services_with_health = []
            services_without_health = []
            
            for service_name, service_config in services_config['services'].items():
                if 'healthcheck' in service_config:
                    services_with_health.append(service_name)
                else:
                    services_without_health.append(service_name)
            
            print_info(f"有健康檢查的服務: {', '.join(services_with_health)}")
            if services_without_health:
                for service in services_without_health:
                    self.warnings.append(f"服務缺少健康檢查: {service}")

    def run_validation(self) -> bool:
        """運行完整驗證"""
        print(f"{Colors.BLUE}🐳 Docker Compose 配置驗證{Colors.NC}")
        print("=" * 60)
        
        # 運行所有驗證
        self.validate_yaml_syntax()
        self.validate_service_consistency()
        self.validate_port_mappings()
        self.validate_environment_variables()
        self.validate_service_dependencies()
        self.validate_health_checks()
        
        # 輸出結果
        print("\n" + "=" * 60)
        print_info("配置驗證結果")
        print("=" * 60)
        
        if self.errors:
            print(f"\n{Colors.RED}錯誤 ({len(self.errors)})::{Colors.NC}")
            for error in self.errors:
                print_error(error)
        
        if self.warnings:
            print(f"\n{Colors.YELLOW}警告 ({len(self.warnings)})::{Colors.NC}")
            for warning in self.warnings:
                print_warning(warning)
        
        if not self.errors and not self.warnings:
            print_status("✨ 所有 Docker Compose 配置驗證通過！")
            return True
        elif not self.errors:
            print_status("✅ 基本配置正確，但有一些建議需要注意")
            return True
        else:
            print_error(f"❌ 發現 {len(self.errors)} 個錯誤，需要修復")
            return False

def main():
    """主函數"""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    validator = DockerComposeValidator(project_root)
    success = validator.run_validation()
    
    if success:
        print(f"\n{Colors.GREEN}📋 驗證通過！Docker Compose 配置可以使用。{Colors.NC}")
        print(f"\n{Colors.BLUE}💡 下一步：{Colors.NC}")
        print("1. 運行 scripts/test-docker-compose.sh 進行完整測試")
        print("2. 使用 docker compose up -d 啟動服務")
        print("3. 運行 scripts/verify-fastapi-health.sh 檢查健康狀態")
    else:
        print(f"\n{Colors.RED}❌ 請修復配置錯誤後重新驗證{Colors.NC}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())