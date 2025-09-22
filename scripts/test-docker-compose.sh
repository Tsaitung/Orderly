#!/bin/bash
"""
井然 Orderly Platform - Docker Compose 環境測試腳本
Docker Compose Environment Testing Suite

測試所有環境的 Docker Compose 配置完整性和功能性
"""

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT"

echo -e "${BLUE}🐳 井然 Orderly Platform - Docker Compose 環境測試${NC}"
echo "=========================================================="

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    print_info "測試 $TOTAL_TESTS: $test_name"
    
    if eval "$test_command" > /tmp/test_output.log 2>&1; then
        print_status "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_error "$test_name"
        echo "錯誤詳情:"
        cat /tmp/test_output.log
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Function to cleanup
cleanup() {
    print_info "清理測試環境..."
    docker compose down -v --remove-orphans 2>/dev/null || true
    docker system prune -f 2>/dev/null || true
    rm -f /tmp/test_output.log
}

# Function to wait for service
wait_for_service() {
    local url="$1"
    local timeout="${2:-30}"
    local counter=0
    
    print_info "等待服務啟動: $url"
    
    while [ $counter -lt $timeout ]; do
        if curl -fsSL "$url" > /dev/null 2>&1; then
            print_status "服務已啟動: $url"
            return 0
        fi
        counter=$((counter + 1))
        sleep 1
        echo -n "."
    done
    
    print_error "服務啟動超時: $url"
    return 1
}

# Trap to cleanup on exit
trap cleanup EXIT

echo ""
echo -e "${BLUE}📋 第一階段：Docker Compose 配置驗證${NC}"
echo "=========================================================="

# Test 1: Validate compose file syntax
run_test "開發環境配置語法驗證" \
    "docker compose -f compose.base.yml -f compose.services.yml -f compose.dev.yml config --quiet"

run_test "預發布環境配置語法驗證" \
    "docker compose -f compose.base.yml -f compose.services.yml -f compose.staging.yml config --quiet"

run_test "生產環境配置語法驗證" \
    "docker compose -f compose.base.yml -f compose.services.yml -f compose.prod.yml config --quiet"

echo ""
echo -e "${BLUE}📋 第二階段：基礎服務測試（PostgreSQL & Redis）${NC}"
echo "=========================================================="

# Test 2: Start basic services
run_test "啟動基礎服務 (PostgreSQL & Redis)" \
    "docker compose -f compose.base.yml up -d postgres redis"

if [ $? -eq 0 ]; then
    # Wait for services to be ready
    sleep 10
    
    run_test "PostgreSQL 健康檢查" \
        "docker compose -f compose.base.yml exec postgres pg_isready -U orderly"
    
    run_test "Redis 健康檢查" \
        "docker compose -f compose.base.yml exec redis redis-cli ping"
fi

echo ""
echo -e "${BLUE}📋 第三階段：完整開發環境測試${NC}"
echo "=========================================================="

# Test 3: Start full development environment
print_info "構建並啟動所有開發服務..."

# First, build all images
run_test "構建所有 Docker 映像" \
    "docker compose -f compose.base.yml -f compose.services.yml -f compose.dev.yml build --parallel"

if [ $? -eq 0 ]; then
    # Start all services
    run_test "啟動完整開發環境" \
        "docker compose -f compose.base.yml -f compose.services.yml -f compose.dev.yml up -d"
    
    if [ $? -eq 0 ]; then
        print_info "等待所有服務啟動..."
        sleep 30
        
        # Test individual service health
        echo ""
        echo -e "${BLUE}📋 第四階段：服務健康檢查${NC}"
        echo "=========================================================="
        
        # List of services to check (excluding billing)
        declare -a SERVICES=(
            "user-service:3001"
            "order-service:3002" 
            "product-service:3003"
            "acceptance-service:3004"
            "notification-service:3006"
            "customer-hierarchy-service:3007"
            "supplier-service:3008"
            "api-gateway:8000"
        )
        
        HEALTHY_SERVICES=0
        for service_port in "${SERVICES[@]}"; do
            service=${service_port%:*}
            port=${service_port#*:}
            
            if wait_for_service "http://localhost:$port/health" 5; then
                HEALTHY_SERVICES=$((HEALTHY_SERVICES + 1))
            fi
        done
        
        print_info "健康服務數量: $HEALTHY_SERVICES/${#SERVICES[@]}"
        
        if [ $HEALTHY_SERVICES -eq ${#SERVICES[@]} ]; then
            print_status "所有服務健康檢查通過！"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            print_error "部分服務健康檢查失敗"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        
        # Test service communication
        echo ""
        echo -e "${BLUE}📋 第五階段：服務間通訊測試${NC}"
        echo "=========================================================="
        
        run_test "API Gateway 路由測試" \
            "curl -fsSL http://localhost:8000/health"
        
        run_test "API Gateway 到 User Service 路由" \
            "curl -fsSL http://localhost:8000/api/users/health || curl -fsSL http://localhost:8000/users/health"
        
        run_test "API Gateway 到 Product Service 路由" \
            "curl -fsSL http://localhost:8000/api/products/health"
    fi
fi

echo ""
echo -e "${BLUE}📋 第六階段：環境變數傳遞測試${NC}"
echo "=========================================================="

# Check if environment variables are properly passed
run_test "檢查環境變數傳遞" \
    "docker compose -f compose.base.yml -f compose.services.yml -f compose.dev.yml exec -T user-service printenv | grep ENVIRONMENT=development"

echo ""
echo -e "${BLUE}📋 第七階段：清理和資源測試${NC}"
echo "=========================================================="

# Test cleanup
run_test "停止所有服務" \
    "docker compose -f compose.base.yml -f compose.services.yml -f compose.dev.yml down"

run_test "清理所有容器和卷" \
    "docker compose -f compose.base.yml -f compose.services.yml -f compose.dev.yml down -v --remove-orphans"

echo ""
echo "=========================================================="
echo -e "${BLUE}📊 測試總結${NC}"
echo "=========================================================="

echo "總測試數: $TOTAL_TESTS"
echo -e "通過測試: ${GREEN}$TESTS_PASSED${NC}"
echo -e "失敗測試: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    print_status "🎉 所有 Docker Compose 環境測試通過！"
    echo ""
    echo -e "${GREEN}📋 環境狀態摘要：${NC}"
    echo "• ✅ 配置文件語法正確"
    echo "• ✅ 基礎服務 (PostgreSQL, Redis) 正常"
    echo "• ✅ 所有 FastAPI 服務健康"
    echo "• ✅ 服務間通訊正常"
    echo "• ✅ 環境變數傳遞正確"
    echo "• ✅ 清理功能正常"
    echo ""
    echo -e "${BLUE}🚀 Docker Compose 環境已就緒，可以開始開發！${NC}"
    exit 0
else
    echo ""
    print_error "❌ 部分測試失敗，請檢查錯誤並修復"
    echo ""
    echo -e "${YELLOW}📋 建議檢查項目：${NC}"
    echo "• 確保所有服務的 Dockerfile 存在且正確"
    echo "• 檢查服務配置和端口設置"
    echo "• 確認環境變數設置正確"
    echo "• 查看服務日誌：docker compose logs [service-name]"
    echo ""
    exit 1
fi