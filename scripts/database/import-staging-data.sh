#!/bin/bash
# 資料匯入腳本 - 將缺失的測試資料匯入到 staging 環境
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

log_section() {
    echo -e "${BLUE}[SECTION]${NC} $1"
}

# Configuration
LOCAL_PORT="${1:-5433}"
DB_NAME="${2:-orderly}"
DB_USER="${3:-orderly}"
DATA_DIR="data/staging/v1"
PROXY_PID=""

log_section "📊 Starting staging data import process"
echo "Database: $DB_NAME on localhost:$LOCAL_PORT"
echo "Data directory: $DATA_DIR"
echo ""

# Function to cleanup proxy on exit
cleanup() {
    if [ ! -z "$PROXY_PID" ] && kill -0 $PROXY_PID 2>/dev/null; then
        log_info "Stopping Cloud SQL Proxy (PID: $PROXY_PID)"
        kill $PROXY_PID
    fi
}
trap cleanup EXIT

# Check if Cloud SQL Proxy is already running
if ! nc -z 127.0.0.1 $LOCAL_PORT 2>/dev/null; then
    log_info "Starting Cloud SQL Proxy on port $LOCAL_PORT..."
    
    if [ ! -f "./cloud-sql-proxy" ]; then
        log_error "Cloud SQL Proxy binary not found. Please download it first:"
        echo "wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud-sql-proxy"
        echo "chmod +x cloud-sql-proxy"
        exit 1
    fi
    
    ./cloud-sql-proxy --port=$LOCAL_PORT orderly-472413:asia-east1:orderly-db-v2 &
    PROXY_PID=$!
    
    # Wait for proxy to be ready
    for i in {1..30}; do
        if nc -z 127.0.0.1 $LOCAL_PORT 2>/dev/null; then
            log_info "✅ Cloud SQL Proxy ready"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Cloud SQL Proxy failed to start after 30 seconds"
            exit 1
        fi
        sleep 1
    done
else
    log_info "✅ Cloud SQL Proxy already running on port $LOCAL_PORT"
fi

# Step 1: Check current data state
log_section "🔍 Step 1: Checking current data state"

./scripts/database/data-integrity-check.sh || true

if [ ! -f "/tmp/missing-data-tables.txt" ]; then
    log_info "🎉 No data integrity issues found!"
    echo "All expected data is present. Exiting."
    exit 0
fi

MISSING_TABLES=$(cat /tmp/missing-data-tables.txt | tr '\n' ' ')
log_warning "Missing data in tables: $MISSING_TABLES"

# Step 2: Create data directory and export existing data if needed
log_section "📋 Step 2: Preparing data files"

mkdir -p "$DATA_DIR"

# Check if we have existing data files
if [ ! -f "$DATA_DIR/export_summary.json" ]; then
    log_info "Creating test data using database_manager.py..."
    
    if [ -f "scripts/database/database_manager.py" ]; then
        # Export existing data first
        python scripts/database/database_manager.py export --output-dir "$DATA_DIR"
        
        # Create test customers if users table is empty
        if echo "$MISSING_TABLES" | grep -q "users"; then
            log_info "Creating test customers data..."
            python scripts/database/database_manager.py create-test-customers --output-dir "$DATA_DIR"
        fi
        
        log_info "✅ Test data prepared"
    else
        log_error "database_manager.py not found"
        exit 1
    fi
else
    log_info "✅ Data files already exist in $DATA_DIR"
fi

# Step 3: Import missing data
log_section "📥 Step 3: Importing missing data"

# Get database password
DB_PASSWORD=$(gcloud secrets versions access latest --secret=postgres-password 2>/dev/null)
if [ -z "$DB_PASSWORD" ]; then
    log_error "Could not retrieve database password from Secret Manager"
    exit 1
fi

# Build connection string
DATABASE_URL="postgresql+asyncpg://orderly:${DB_PASSWORD}@127.0.0.1:$LOCAL_PORT/orderly"

log_info "Importing data to staging database..."
if python scripts/database/database_manager.py import \
    --target "$DATABASE_URL" \
    --data-dir "$DATA_DIR"; then
    log_info "✅ Data import completed successfully"
else
    log_warning "⚠️ Data import had some issues (this may be expected for existing data)"
fi

# Step 4: Seed additional real data if needed
log_section "🌱 Step 4: Seeding additional real data"

if [ -f "scripts/database/seed_from_real_data.py" ]; then
    log_info "Running seed_from_real_data.py to create comprehensive test data..."
    
    # Set environment for the script
    export DATABASE_HOST="/cloudsql/orderly-472413:asia-east1:orderly-db-v2"
    export DATABASE_NAME="orderly"
    export DATABASE_USER="orderly"
    export POSTGRES_PASSWORD="$DB_PASSWORD"
    
    if python scripts/database/seed_from_real_data.py; then
        log_info "✅ Real data seeding completed"
    else
        log_warning "⚠️ Real data seeding had issues"
    fi
else
    log_warning "⚠️ seed_from_real_data.py not found, skipping"
fi

# Step 5: Verify data integrity after import
log_section "🔍 Step 5: Post-import data verification"

log_info "Running data integrity checks..."
./scripts/database/data-integrity-check.sh

# Step 6: Test API endpoints
log_section "🧪 Step 6: Testing API endpoints"

API_GATEWAY="https://orderly-api-gateway-fastapi-staging-usg6y7o2ba-de.a.run.app"

log_info "Testing critical API endpoints..."

# Test product categories
CATEGORIES_COUNT=$(curl -s "$API_GATEWAY/api/products/categories" | jq '. | length' 2>/dev/null || echo "0")
log_info "Product categories API: $CATEGORIES_COUNT items"

# Test products
PRODUCTS_COUNT=$(curl -s "$API_GATEWAY/api/products/products" | jq '. | length' 2>/dev/null || echo "0")
log_info "Products API: $PRODUCTS_COUNT items"

# Test customer companies (if endpoint exists)
CUSTOMERS_COUNT=$(curl -s "$API_GATEWAY/api/customer-companies" | jq '. | length' 2>/dev/null || echo "0")
log_info "Customer companies API: $CUSTOMERS_COUNT items"

# Summary
log_section "📊 Import Summary"
echo "========================================"
echo "✅ Data import process completed"
echo "📋 API test results:"
echo "  - Product categories: $CATEGORIES_COUNT"
echo "  - Products: $PRODUCTS_COUNT" 
echo "  - Customer companies: $CUSTOMERS_COUNT"
echo ""

if [ "$CATEGORIES_COUNT" -gt 100 ] && [ "$PRODUCTS_COUNT" -gt 40 ]; then
    log_info "🎉 Core data import successful!"
    echo ""
    echo "Next steps:"
    echo "1. Run full health check: ./scripts/health-check-all.sh"
    echo "2. Test frontend: https://orderly-frontend-staging-*.run.app"
    echo "3. Monitor for issues: gcloud logging read 'resource.type=\"cloud_run_revision\"' --limit=20"
else
    log_warning "⚠️ Data import may be incomplete"
    echo "Consider running manual data verification"
fi

log_info "🎯 Data import process completed!"