#!/bin/bash
# 統一資料庫遷移腳本
# 運行所有微服務的 Alembic migrations

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 服務列表（按依賴順序）
SERVICES=(
    "user-service-fastapi"
    "product-service-fastapi"
    "order-service-fastapi"
    "customer-hierarchy-service-fastapi"
    "supplier-service-fastapi"
    "acceptance-service-fastapi"
    "notification-service-fastapi"
)

ORIGINAL_DIR=$(pwd)
MIGRATION_RESULTS=()

log_info "🗄️ Starting database migrations for all services..."

for SERVICE in "${SERVICES[@]}"; do
    SERVICE_DIR="backend/${SERVICE}"
    
    if [ ! -d "$SERVICE_DIR" ]; then
        log_warning "⚠️ Service directory not found: $SERVICE_DIR"
        MIGRATION_RESULTS+=("$SERVICE: SKIPPED (directory not found)")
        continue
    fi
    
    if [ ! -f "$SERVICE_DIR/alembic.ini" ]; then
        log_warning "⚠️ No alembic.ini found in $SERVICE_DIR"
        MIGRATION_RESULTS+=("$SERVICE: SKIPPED (no alembic.ini)")
        continue
    fi
    
    log_info "Running migrations for $SERVICE..."
    cd "$SERVICE_DIR"
    
    if alembic upgrade head 2>/dev/null; then
        log_info "✅ $SERVICE: Migration completed successfully"
        MIGRATION_RESULTS+=("$SERVICE: SUCCESS")
    else
        log_error "❌ $SERVICE: Migration failed"
        MIGRATION_RESULTS+=("$SERVICE: FAILED")
    fi
    
    cd "$ORIGINAL_DIR"
done

echo ""
log_info "📊 Migration Summary:"
echo "======================"
for result in "${MIGRATION_RESULTS[@]}"; do
    if [[ $result == *"SUCCESS"* ]]; then
        echo -e "${GREEN}✅ $result${NC}"
    elif [[ $result == *"FAILED"* ]]; then
        echo -e "${RED}❌ $result${NC}"
    else
        echo -e "${YELLOW}⚠️ $result${NC}"
    fi
done

# 計算統計
SUCCESS_COUNT=$(printf '%s\n' "${MIGRATION_RESULTS[@]}" | grep -c "SUCCESS" || echo "0")
FAILED_COUNT=$(printf '%s\n' "${MIGRATION_RESULTS[@]}" | grep -c "FAILED" || echo "0")
SKIPPED_COUNT=$(printf '%s\n' "${MIGRATION_RESULTS[@]}" | grep -c "SKIPPED" || echo "0")

echo ""
echo "Total services: ${#SERVICES[@]}"
echo "✅ Successful: $SUCCESS_COUNT"
echo "❌ Failed: $FAILED_COUNT"
echo "⚠️ Skipped: $SKIPPED_COUNT"

if [ "$FAILED_COUNT" -gt 0 ]; then
    log_warning "Some migrations failed. Check individual service logs for details."
    exit 1
else
    log_info "🎉 All migrations completed successfully!"
    exit 0
fi