#!/bin/bash

# 井然 Orderly Platform - 開發環境設置腳本
# Development Environment Setup Script

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${BLUE}🚀 井然 Orderly Platform - 開發環境設置${NC}"
echo "======================================================"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

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

# Change to project root
cd "$PROJECT_ROOT"

echo -e "${BLUE}📋 檢查系統需求...${NC}"

# Check Docker
if command_exists docker; then
    print_status "Docker 已安裝"
else
    print_error "Docker 未安裝，請先安裝 Docker"
    exit 1
fi

# Check Docker Compose
if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
    print_status "Docker Compose 已安裝"
else
    print_error "Docker Compose 未安裝，請先安裝 Docker Compose"
    exit 1
fi

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_status "Node.js 已安裝 ($NODE_VERSION)"
else
    print_warning "Node.js 未安裝，建議安裝 Node.js 18+ 用於前端開發"
fi

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version)
    print_status "Python 已安裝 ($PYTHON_VERSION)"
else
    print_warning "Python 未安裝，建議安裝 Python 3.11+ 用於後端開發"
fi

echo ""
echo -e "${BLUE}📁 設置環境配置文件...${NC}"

# Create .env.local from template if it doesn't exist
if [ ! -f ".env.local" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        print_status "創建 .env.local 文件"
        print_warning "請檢查並修改 .env.local 中的配置"
    else
        print_error ".env.example 文件不存在"
        exit 1
    fi
else
    print_status ".env.local 文件已存在"
fi

# Create upload directories
echo ""
echo -e "${BLUE}📂 創建必要目錄...${NC}"

mkdir -p uploads temp logs data/postgres data/redis
print_status "創建 uploads, temp, logs 目錄"

# Set permissions
chmod 755 uploads temp logs
print_status "設置目錄權限"

echo ""
echo -e "${BLUE}🐳 設置 Docker 環境...${NC}"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker 未運行，請啟動 Docker Desktop"
    exit 1
fi

# Pull base images
echo "拉取基礎 Docker 映像..."
docker pull python:3.11-slim
docker pull postgres:15-alpine
docker pull redis:7-alpine
print_status "Docker 基礎映像已更新"

echo ""
echo -e "${BLUE}📦 安裝專案依賴...${NC}"

# Install Node.js dependencies if package.json exists
if [ -f "package.json" ]; then
    if command_exists npm; then
        echo "安裝 Node.js 依賴..."
        npm install
        print_status "Node.js 依賴安裝完成"
    elif command_exists yarn; then
        echo "安裝 Node.js 依賴 (使用 Yarn)..."
        yarn install
        print_status "Node.js 依賴安裝完成 (Yarn)"
    else
        print_warning "npm 或 yarn 未安裝，跳過 Node.js 依賴安裝"
    fi
fi

# Install Python dependencies for backend services
echo ""
echo -e "${BLUE}🐍 設置 Python 後端服務...${NC}"

for service_dir in backend/*-fastapi; do
    if [ -d "$service_dir" ] && [ -f "$service_dir/requirements.txt" ]; then
        service_name=$(basename "$service_dir")
        echo "為 $service_name 安裝 Python 依賴..."
        
        # Create virtual environment if it doesn't exist
        if [ ! -d "$service_dir/venv" ]; then
            cd "$service_dir"
            python3 -m venv venv
            cd - > /dev/null
        fi
        
        # Activate virtual environment and install dependencies
        cd "$service_dir"
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
        deactivate
        cd - > /dev/null
        
        print_status "$service_name 依賴安裝完成"
    fi
done

echo ""
echo -e "${BLUE}🔧 驗證配置...${NC}"

# Run configuration validation script
if [ -f "scripts/env/validate-config.py" ]; then
    python3 scripts/env/validate-config.py
else
    print_warning "配置驗證腳本未找到，跳過配置驗證"
fi

echo ""
echo -e "${BLUE}🚀 啟動開發環境...${NC}"

# Start Docker Compose services
if [ -f "compose.dev.yml" ]; then
    echo "啟動後端服務..."
    docker-compose -f compose.dev.yml up -d postgres redis
    
    # Wait for databases to be ready
    echo "等待資料庫啟動..."
    sleep 10
    
    print_status "基礎服務已啟動"
    
    echo ""
    echo -e "${YELLOW}📝 下一步操作：${NC}"
    echo "1. 啟動所有後端服務: docker-compose -f compose.dev.yml up -d"
    echo "2. 啟動前端開發服務: npm run dev"
    echo "3. 查看服務狀態: docker-compose -f compose.dev.yml ps"
    echo "4. 查看服務日誌: docker-compose -f compose.dev.yml logs -f [服務名稱]"
else
    print_warning "compose.dev.yml 文件未找到，請手動啟動服務"
fi

echo ""
echo -e "${BLUE}🌐 服務 URLs：${NC}"
echo "• 前端應用: http://localhost:3000"
echo "• API Gateway: http://localhost:8000"
echo "• API 文檔: http://localhost:8000/docs"
echo "• PostgreSQL: localhost:5432"
echo "• Redis: localhost:6379"

echo ""
echo -e "${BLUE}🛠 有用的命令：${NC}"
echo "• 重啟服務: docker-compose -f compose.dev.yml restart [服務名稱]"
echo "• 查看日誌: docker-compose -f compose.dev.yml logs -f [服務名稱]"
echo "• 進入容器: docker-compose -f compose.dev.yml exec [服務名稱] bash"
echo "• 停止所有服務: docker-compose -f compose.dev.yml down"
echo "• 清理資料: docker-compose -f compose.dev.yml down -v"

echo ""
print_status "開發環境設置完成！"
echo -e "${GREEN}🎉 歡迎來到井然 Orderly 平台開發環境！${NC}"