#!/bin/bash
# Orderly - 一鍵啟動所有後端服務腳本

set -e  # 遇到錯誤立即退出

echo "🚀 井然 Orderly - 啟動所有服務..."
echo "================================================="

# 檢查是否在正確目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤：請在專案根目錄執行此腳本"
    exit 1
fi

# 檢查 Python 是否安裝
if ! command -v python3 &> /dev/null; then
    echo "❌ 錯誤：未找到 Python 3"
    exit 1
fi

# 檢查 Node.js 是否安裝
if ! command -v npm &> /dev/null; then
    echo "❌ 錯誤：未找到 npm"
    exit 1
fi

# 定義服務列表
declare -A SERVICES=(
    ["user-service"]="backend/user-service-fastapi:3001"
    ["order-service"]="backend/order-service-fastapi:3002"
    ["product-service"]="backend/product-service-fastapi:3003"
    ["acceptance-service"]="backend/acceptance-service-fastapi:3004"
    ["notification-service"]="backend/notification-service-fastapi:3006"
    ["customer-hierarchy-service"]="backend/customer-hierarchy-service-fastapi:3007"
    ["api-gateway"]="backend/api-gateway-fastapi:8000"
)

# 存儲 PID 的陣列
declare -A PIDS=()

# 清理函數
cleanup() {
    echo "🛑 正在停止所有服務..."
    for name in "${!PIDS[@]}"; do
        if kill -0 "${PIDS[$name]}" 2>/dev/null; then
            echo "  停止 $name (PID: ${PIDS[$name]})"
            kill "${PIDS[$name]}" 2>/dev/null || true
        fi
    done
    exit
}

# 註冊清理函數
trap cleanup INT TERM

# 啟動後端服務
echo "📡 啟動後端服務..."
for name in "${!SERVICES[@]}"; do
    IFS=':' read -r path port <<< "${SERVICES[$name]}"
    
    echo "  啟動 $name (端口 $port)..."
    
    # 檢查端口是否已被使用
    if lsof -i :$port > /dev/null 2>&1; then
        echo "    ⚠️  端口 $port 已被使用，跳過 $name"
        continue
    fi
    
    # 啟動服務
    cd "$path"
    
    if [ "$name" = "api-gateway" ]; then
        # API Gateway 需要環境變數
        PRODUCT_SERVICE_URL=http://localhost:3003 \
        USER_SERVICE_URL=http://localhost:3001 \
        ORDER_SERVICE_URL=http://localhost:3002 \
        ACCEPTANCE_SERVICE_URL=http://localhost:3004 \
        BILLING_SERVICE_URL=http://localhost:3005 \
        NOTIFICATION_SERVICE_URL=http://localhost:3006 \
        CUSTOMER_HIERARCHY_SERVICE_URL=http://localhost:3007 \
        PYTHONPATH=. uvicorn app.main:app --reload --host 0.0.0.0 --port $port > /dev/null 2>&1 &
    else
        PYTHONPATH=. uvicorn app.main:app --reload --host 0.0.0.0 --port $port > /dev/null 2>&1 &
    fi
    
    PIDS[$name]=$!
    cd - > /dev/null
    
    # 等待服務啟動
    sleep 2
    
    # 檢查服務是否成功啟動
    if curl -s http://localhost:$port/health > /dev/null 2>&1; then
        echo "    ✅ $name 啟動成功 (PID: ${PIDS[$name]})"
    else
        echo "    ❌ $name 啟動失敗"
    fi
done

echo ""
echo "🎨 啟動前端服務..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "  ⚠️  端口 3000 已被使用，跳過前端服務"
else
    npm run dev > /dev/null 2>&1 &
    PIDS["frontend"]=$!
    sleep 3
    echo "  ✅ 前端服務啟動成功 (PID: ${PIDS["frontend"]})"
fi

echo ""
echo "🎉 所有服務啟動完成！"
echo "================================================="
echo "📊 服務狀態："
echo "  • 前端服務:     http://localhost:3000"
echo "  • API Gateway:  http://localhost:8000"
echo "  • User Service: http://localhost:3001"
echo "  • Order Service: http://localhost:3002"
echo "  • Product Service: http://localhost:3003"
echo "  • Acceptance Service: http://localhost:3004"
echo "  • Notification Service: http://localhost:3006"
echo "  • Customer Hierarchy Service: http://localhost:3007"
echo ""
echo "💡 使用 Ctrl+C 停止所有服務"
echo "💡 使用 ./scripts/check-services.sh 檢查服務狀態"
echo ""

# 保持腳本運行
while true; do
    sleep 1
done