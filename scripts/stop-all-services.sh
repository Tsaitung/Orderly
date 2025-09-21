#!/bin/bash
# Orderly - 一鍵停止所有服務腳本

echo "🛑 井然 Orderly - 停止所有服務..."
echo "================================================="

# 定義要停止的端口
PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 8000)

# 停止服務函數
stop_service() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo "  停止端口 $port 上的服務..."
        for pid in $pids; do
            kill $pid 2>/dev/null && echo "    ✅ 已停止 PID: $pid" || echo "    ⚠️  無法停止 PID: $pid"
        done
    else
        echo "  端口 $port 沒有運行的服務"
    fi
}

# 停止所有服務
for port in "${PORTS[@]}"; do
    stop_service $port
done

# 額外清理：停止可能的殘留進程
echo ""
echo "🧹 清理殘留進程..."

# 停止 uvicorn 進程
uvicorn_pids=$(pgrep -f "uvicorn.*app.main:app" 2>/dev/null || true)
if [ -n "$uvicorn_pids" ]; then
    echo "  停止 uvicorn 進程: $uvicorn_pids"
    echo $uvicorn_pids | xargs kill 2>/dev/null || true
fi

# 停止 npm run dev 進程
npm_pids=$(pgrep -f "npm.*run.*dev" 2>/dev/null || true)
if [ -n "$npm_pids" ]; then
    echo "  停止 npm dev 進程: $npm_pids"
    echo $npm_pids | xargs kill 2>/dev/null || true
fi

# 停止 next dev 進程
next_pids=$(pgrep -f "next.*dev" 2>/dev/null || true)
if [ -n "$next_pids" ]; then
    echo "  停止 next dev 進程: $next_pids"
    echo $next_pids | xargs kill 2>/dev/null || true
fi

echo ""
echo "✅ 所有服務已停止！"
echo ""
echo "💡 使用 ./scripts/start-all-services.sh 重新啟動所有服務"
echo "💡 使用 ./scripts/check-services.sh 檢查服務狀態"