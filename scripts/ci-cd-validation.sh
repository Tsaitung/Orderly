#!/bin/bash
set -e

# CI/CD Pipeline 驗證腳本
# 驗證 FastAPI 遷移後的 CI/CD 配置是否正確

echo "🔍 CI/CD Pipeline 驗證開始..."

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 驗證函數
validate_step() {
    local step_name="$1"
    local command="$2"
    
    echo -e "${BLUE}⏳ 驗證: $step_name${NC}"
    
    if eval "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $step_name - 通過${NC}"
        return 0
    else
        echo -e "${RED}❌ $step_name - 失敗${NC}"
        return 1
    fi
}

# 計數器
passed=0
total=0

echo ""
echo "=== 🏗️ Build 步驟驗證 ==="

# 1. Node.js 設置驗證
((total++))
if validate_step "Node.js 環境" "node --version"; then
    ((passed++))
fi

# 2. Python 設置驗證
((total++))
if validate_step "Python 環境" "python3 --version"; then
    ((passed++))
fi

# 3. FastAPI 依賴檢查
((total++))
if validate_step "FastAPI 依賴文件" "test -f backend/app/requirements.txt"; then
    ((passed++))
fi

# 4. Docker 配置檢查
((total++))
if validate_step "FastAPI Dockerfile" "test -f backend/Dockerfile.monolith"; then
    ((passed++))
fi

echo ""
echo "=== 🧪 測試配置驗證 ==="

# 5. FastAPI 測試安裝檢查
((total++))
cd backend
if validate_step "FastAPI 依賴安裝" "pip install -r app/requirements.txt --quiet"; then
    ((passed++))
fi
cd ..

# 6. FastAPI 健康檢查端點
((total++))
if validate_step "FastAPI 健康檢查" "curl -f http://localhost:8888/health"; then
    ((passed++))
fi

echo ""
echo "=== 📋 Workflow 配置驗證 ==="

# 7. GitHub Actions workflow 語法
((total++))
if validate_step "main.yml 語法" "python3 -c \"import yaml; yaml.safe_load(open('.github/workflows/main.yml'))\""; then
    ((passed++))
fi

# 8. CI workflow 語法
((total++))
if validate_step "ci.yml 語法" "python3 -c \"import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))\""; then
    ((passed++))
fi

# 9. FastAPI workflow 更新檢查
((total++))
if validate_step "FastAPI workflow 更新" "grep -q 'backend-monolith' .github/workflows/cd.yml"; then
    ((passed++))
fi

echo ""
echo "=== 🐳 容器配置驗證 ==="

# 10. Docker Compose 語法
((total++))
if validate_step "docker-compose.yml 語法" "python3 -c \"import yaml; yaml.safe_load(open('docker-compose.yml'))\""; then
    ((passed++))
fi

# 11. 生產環境 Docker Compose
((total++))
if validate_step "docker-compose.production.yml 語法" "python3 -c \"import yaml; yaml.safe_load(open('docker-compose.production.yml'))\""; then
    ((passed++))
fi

echo ""
echo "=== 📊 驗證結果 ==="

# 計算成功率
success_rate=$(( passed * 100 / total ))

echo -e "${BLUE}總計測試項目: $total${NC}"
echo -e "${GREEN}通過項目: $passed${NC}"
echo -e "${RED}失敗項目: $((total - passed))${NC}"
echo -e "${YELLOW}成功率: ${success_rate}%${NC}"

if [ $success_rate -ge 80 ]; then
    echo ""
    echo -e "${GREEN}🎉 CI/CD Pipeline 驗證通過！${NC}"
    echo -e "${GREEN}FastAPI 遷移的 CI/CD 配置已就緒${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️ CI/CD Pipeline 驗證失敗${NC}"
    echo -e "${RED}需要修復失敗的測試項目${NC}"
    exit 1
fi
