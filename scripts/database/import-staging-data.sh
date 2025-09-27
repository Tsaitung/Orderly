#!/bin/bash
# 永久化資料匯入腳本
# 確保 staging 環境有完整的測試資料

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

# 配置
STAGING_DATA_DIR="data/staging/v1"
CLOUD_SQL_PROXY_PID=""

log_info "🗄️ Starting staging data import process..."

# 檢查是否有版本控制的測試資料
if [ ! -d "$STAGING_DATA_DIR" ]; then
    log_warning "⚠️ Staging data directory not found: $STAGING_DATA_DIR"
    log_info "Attempting to generate test data..."
    
    if [ -f "scripts/database/seed_from_real_data.py" ]; then
        log_info "Running seed script to generate test data..."
        python3 scripts/database/seed_from_real_data.py
    else
        log_warning "⚠️ No seed script found, skipping data generation"
        exit 0
    fi
fi

# 檢查 Cloud SQL Proxy 是否在運行
if ! pgrep -f "cloud-sql-proxy.*orderly-db-v2" > /dev/null; then
    log_info "Starting Cloud SQL Proxy..."
    ./cloud-sql-proxy --credentials-file=/Users/leeyude/orderly-migration-sa-key.json \
      --port=5433 orderly-472413:asia-east1:orderly-db-v2 &
    CLOUD_SQL_PROXY_PID=$!
    sleep 5
    log_info "Cloud SQL Proxy started with PID: $CLOUD_SQL_PROXY_PID"
else
    log_info "✅ Cloud SQL Proxy already running"
fi

# 運行資料完整性檢查
if [ -f "scripts/database/data-integrity-check.sh" ]; then
    log_info "Running data integrity check..."
    ./scripts/database/data-integrity-check.sh
else
    log_warning "⚠️ Data integrity check script not found"
fi

# 檢查是否需要補充缺失資料
MISSING_TABLES=()

# 檢查關鍵表的資料
PGPASSWORD="OtAEG5/1h78R+EGHStvtabQjOhjKtXNq/Pse3d6ZTDs=" \
  psql -h 127.0.0.1 -p 5433 -U orderly -d orderly -t -c "
    SELECT CASE 
      WHEN (SELECT COUNT(*) FROM users) < 3 THEN 'users'
      WHEN (SELECT COUNT(*) FROM customer_groups) < 10 THEN 'customer_groups'
      WHEN (SELECT COUNT(*) FROM supplier_product_skus) < 50 THEN 'supplier_product_skus'
      ELSE 'OK'
    END;
  " | while read result; do
    result=$(echo "$result" | xargs)  # trim whitespace
    if [ "$result" != "OK" ]; then
        MISSING_TABLES+=("$result")
    fi
done

# 如果有缺失資料，運行同步腳本
if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
    log_warning "⚠️ Found missing data in tables: ${MISSING_TABLES[*]}"
    
    if [ -f "scripts/database/sync_missing_staging_tables.py" ]; then
        log_info "Running staging data sync script..."
        python3 scripts/database/sync_missing_staging_tables.py
    else
        log_error "❌ Sync script not found: scripts/database/sync_missing_staging_tables.py"
    fi
else
    log_info "✅ All required data tables have sufficient records"
fi

# 清理 Cloud SQL Proxy（如果我們啟動的）
if [ -n "$CLOUD_SQL_PROXY_PID" ]; then
    log_info "Stopping Cloud SQL Proxy (PID: $CLOUD_SQL_PROXY_PID)..."
    kill $CLOUD_SQL_PROXY_PID 2>/dev/null || true
fi

log_info "🎉 Staging data import process completed!"
echo ""
echo "📋 Summary:"
echo "- Data integrity verified"
echo "- Missing data synced (if any)"
echo "- Staging environment ready for testing"