#!/bin/bash
# Orderly - 檢查所有服務狀態腳本

echo "🔍 井然 Orderly - 檢查服務狀態..."
echo "================================================="

# 定義服務列表（使用數組）
SERVICES=(
    "前端服務:http://localhost:3000"
    "API Gateway:http://localhost:8000/health"
    "User Service:http://localhost:3001/health"
    "Order Service:http://localhost:3002/health"
    "Product Service:http://localhost:3003/health"
    "Acceptance Service:http://localhost:3004/health"
    "Notification Service:http://localhost:3006/health"
    "Customer Hierarchy Service:http://localhost:3007/health"
)

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 檢查服務函數
check_service() {
    local name=$1
    local url=$2
    local timeout=5
    
    printf "  %-25s " "$name:"
    
    if curl -s --max-time $timeout "$url" > /dev/null 2>&1; then
        printf "${GREEN}✅ 運行中${NC}\n"
        return 0
    else
        printf "${RED}❌ 離線${NC}\n"
        return 1
    fi
}

# 檢查端口使用情況
check_ports() {
    echo ""
    echo "📊 端口使用狀況："
    
    local ports=(3000 3001 3002 3003 3004 3005 3006 3007 8000)
    
    for port in "${ports[@]}"; do
        printf "  Port %-4s: " "$port"
        if lsof -i :$port > /dev/null 2>&1; then
            local pid=$(lsof -ti :$port 2>/dev/null | head -1)
            local process=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
            printf "${GREEN}✅ 使用中${NC} (PID: $pid, $process)\n"
        else
            printf "${RED}❌ 空閒${NC}\n"
        fi
    done
}

# 主要檢查邏輯
echo "🎯 服務健康檢查："

online_count=0
total_count=${#SERVICES[@]}

for service in "${SERVICES[@]}"; do
    IFS=':' read -r name url <<< "$service"
    if check_service "$name" "$url"; then
        ((online_count++))
    fi
done

echo ""
echo "📈 總體狀況："
printf "  在線服務: ${GREEN}%d${NC}/%d\n" $online_count $total_count

if [ $online_count -eq $total_count ]; then
    printf "  狀態: ${GREEN}✅ 所有服務正常${NC}\n"
elif [ $online_count -gt 0 ]; then
    printf "  狀態: ${YELLOW}⚠️  部分服務離線${NC}\n"
else
    printf "  狀態: ${RED}❌ 所有服務離線${NC}\n"
fi

# 檢查端口
check_ports

echo ""
echo "💡 有用的指令："
echo "  • 停止所有服務: ./scripts/dev/stop-all-services.sh"
echo "  • 前端開發服務: npm run dev"
echo "  • 查看端口使用: lsof -i :PORT"

# 如果有服務離線，給出建議
if [ $online_count -lt $total_count ]; then
    echo ""
    echo "🔧 故障排除建議："
    echo "  1. 檢查服務日誌是否有錯誤"
    echo "  2. 確認資料庫連接正常"
    echo "  3. 檢查端口是否被其他進程占用"
    echo "  4. 嘗試重新啟動相關服務"
fi