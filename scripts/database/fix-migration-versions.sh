#!/bin/bash
# 修復 Alembic 版本追蹤 - 將所有服務標記為當前版本
# 這是因為資料庫已經存在且有數據，但版本追蹤不一致

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查 Cloud SQL Proxy 連接
if ! nc -z 127.0.0.1 5433 2>/dev/null; then
    log_error "Cannot connect to localhost:5433. Please ensure Cloud SQL Proxy is running."
    exit 1
fi

ORIGINAL_DIR=$(pwd)

# 服務配置：服務名和版本
SERVICES=(
    "user-service-fastapi:003_add_missing_fields"
    "product-service-fastapi:f2fcfbdc3a33"
    "order-service-fastapi:001_initial_order_schema"
    "customer-hierarchy-service-fastapi:001_initial_hierarchy"
    "supplier-service-fastapi:001_supplier_tables"
    "acceptance-service-fastapi:001_acceptance_schema"
    "notification-service-fastapi:001_notification_schema"
)

log_info "🔧 Starting migration version fix..."

for SERVICE_VERSION in "${SERVICES[@]}"; do
    SERVICE="${SERVICE_VERSION%%:*}"
    VERSION="${SERVICE_VERSION##*:}"
    SERVICE_DIR="backend/${SERVICE}"
    
    if [ ! -d "$SERVICE_DIR" ]; then
        log_error "⚠️ Service directory not found: $SERVICE_DIR"
        continue
    fi
    
    log_info "Fixing $SERVICE -> $VERSION"
    cd "$SERVICE_DIR"
    
    # Set PYTHONPATH for imports
    export PYTHONPATH="$(pwd):$PYTHONPATH"
    
    # Try to stamp the version
    if alembic stamp "$VERSION" 2>/dev/null; then
        log_info "✅ $SERVICE: Version fixed to $VERSION"
    else
        log_error "❌ $SERVICE: Failed to fix version"
    fi
    
    cd "$ORIGINAL_DIR"
done

log_info "🎉 Migration version fix completed!"

# Verify the fix
log_info "📊 Current migration states:"
for SERVICE_VERSION in "${SERVICES[@]}"; do
    SERVICE="${SERVICE_VERSION%%:*}"
    SERVICE_DIR="backend/${SERVICE}"
    cd "$SERVICE_DIR"
    export PYTHONPATH="$(pwd):$PYTHONPATH"
    
    CURRENT=$(alembic current 2>/dev/null | tail -n 1 | awk '{print $1}' || echo "NOT_SET")
    echo "  $SERVICE: $CURRENT"
    
    cd "$ORIGINAL_DIR"
done