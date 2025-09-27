#!/bin/bash
# Schema 同步腳本 - 建立 staging 與本地環境的 schema 基準線
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
BASELINE_DIR="configs/staging"

log_section "🗄️ Starting database schema synchronization"
echo "Database: $DB_NAME on localhost:$LOCAL_PORT"
echo "Baseline directory: $BASELINE_DIR"
echo ""

# Check if Cloud SQL Proxy is running
if ! nc -z 127.0.0.1 $LOCAL_PORT 2>/dev/null; then
    log_error "Cannot connect to localhost:$LOCAL_PORT"
    echo "Please ensure Cloud SQL Proxy is running:"
    echo "./cloud-sql-proxy --port=5433 orderly-472413:asia-east1:orderly-db-v2 &"
    exit 1
fi

# Create baseline directory
mkdir -p "$BASELINE_DIR"

# Step 1: Export current staging schema as baseline
log_section "📋 Step 1: Exporting staging schema baseline"

BASELINE_SCHEMA="$BASELINE_DIR/baseline-schema.sql"
log_info "Exporting schema to $BASELINE_SCHEMA"

if PGPASSWORD="$(gcloud secrets versions access latest --secret=postgres-password 2>/dev/null)" \
   pg_dump -h 127.0.0.1 -p $LOCAL_PORT -U $DB_USER -d $DB_NAME \
   --schema-only --no-owner --no-privileges > "$BASELINE_SCHEMA"; then
    log_info "✅ Schema baseline exported successfully"
    echo "Schema file size: $(wc -l < "$BASELINE_SCHEMA") lines"
else
    log_error "❌ Failed to export schema baseline"
    exit 1
fi

# Step 2: Create unified migration runner
log_section "🔄 Step 2: Creating unified migration script"

MIGRATION_SCRIPT="scripts/database/run-migrations.sh"
log_info "Creating $MIGRATION_SCRIPT"

cat > "$MIGRATION_SCRIPT" << 'SCRIPT'
#!/bin/bash
# 統一資料庫遷移腳本 - 在所有 FastAPI 服務中執行 Alembic migrations
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

# FastAPI services with Alembic
SERVICES=(
    "user-service-fastapi"
    "product-service-fastapi" 
    "order-service-fastapi"
    "customer-hierarchy-service-fastapi"
    "supplier-service-fastapi"
)

CURRENT_DIR=$(pwd)
MIGRATION_RESULTS=()

echo "🔄 Running Alembic migrations for all services"
echo "Current directory: $CURRENT_DIR"
echo ""

for SERVICE in "${SERVICES[@]}"; do
    SERVICE_DIR="backend/$SERVICE"
    
    if [ ! -d "$SERVICE_DIR" ]; then
        log_warning "⚠️ Service directory not found: $SERVICE_DIR"
        MIGRATION_RESULTS+=("$SERVICE: DIRECTORY_NOT_FOUND")
        continue
    fi
    
    if [ ! -f "$SERVICE_DIR/alembic.ini" ]; then
        log_warning "⚠️ Alembic not configured for $SERVICE"
        MIGRATION_RESULTS+=("$SERVICE: NO_ALEMBIC")
        continue
    fi
    
    log_info "Running migrations for $SERVICE..."
    
    cd "$SERVICE_DIR"
    
    # Check current Alembic status
    if alembic current 2>/dev/null | grep -q "head"; then
        log_info "  Current revision: $(alembic current 2>/dev/null)"
    else
        log_warning "  Alembic state unclear, attempting to upgrade"
    fi
    
    # Run migration
    if alembic upgrade head 2>/dev/null; then
        log_info "  ✅ Migration completed successfully"
        MIGRATION_RESULTS+=("$SERVICE: SUCCESS")
    else
        log_error "  ❌ Migration failed"
        MIGRATION_RESULTS+=("$SERVICE: FAILED")
    fi
    
    cd "$CURRENT_DIR"
    echo ""
done

# Summary
echo "📊 Migration Summary:"
echo "===================="
for result in "${MIGRATION_RESULTS[@]}"; do
    service="${result%%:*}"
    status="${result##*:}"
    case $status in
        "SUCCESS")
            echo "✅ $service: Migration completed"
            ;;
        "FAILED")
            echo "❌ $service: Migration failed"
            ;;
        "DIRECTORY_NOT_FOUND")
            echo "⚠️ $service: Directory not found"
            ;;
        "NO_ALEMBIC")
            echo "⚠️ $service: Alembic not configured"
            ;;
    esac
done

echo ""
echo "🎯 Migration process completed!"
SCRIPT

chmod +x "$MIGRATION_SCRIPT"
log_info "✅ Migration script created and made executable"

# Step 3: Reset Alembic states (optional)
log_section "🔧 Step 3: Alembic state management (optional)"

read -p "Do you want to reset Alembic states to baseline? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Resetting Alembic states..."
    
    SERVICES=("user-service-fastapi" "product-service-fastapi" "order-service-fastapi" "customer-hierarchy-service-fastapi" "supplier-service-fastapi")
    
    for SERVICE in "${SERVICES[@]}"; do
        if [ -d "backend/$SERVICE" ] && [ -f "backend/$SERVICE/alembic.ini" ]; then
            log_info "Resetting $SERVICE Alembic state..."
            cd "backend/$SERVICE"
            
            # Create baseline revision
            if alembic revision --autogenerate -m "baseline_staging_$(date +%Y%m%d)" 2>/dev/null; then
                log_info "  ✅ Baseline revision created for $SERVICE"
            else
                log_warning "  ⚠️ Could not create baseline revision for $SERVICE"
            fi
            
            cd - > /dev/null
        fi
    done
else
    log_info "Skipping Alembic state reset"
fi

# Step 4: Validate schema consistency
log_section "🔍 Step 4: Schema validation"

log_info "Checking for common schema issues..."

# Check for missing critical tables
CRITICAL_TABLES=("users" "organizations" "products" "product_categories" "business_units")
SCHEMA_ISSUES=()

for TABLE in "${CRITICAL_TABLES[@]}"; do
    if PGPASSWORD="$(gcloud secrets versions access latest --secret=postgres-password 2>/dev/null)" \
       psql -h 127.0.0.1 -p $LOCAL_PORT -U $DB_USER -d $DB_NAME \
       -c "SELECT 1 FROM $TABLE LIMIT 1" > /dev/null 2>&1; then
        log_info "✅ Table $TABLE exists and is accessible"
    else
        log_warning "⚠️ Table $TABLE missing or inaccessible"
        SCHEMA_ISSUES+=("$TABLE")
    fi
done

if [ ${#SCHEMA_ISSUES[@]} -eq 0 ]; then
    log_info "🎉 Schema validation completed successfully!"
else
    log_warning "⚠️ Schema issues found: ${SCHEMA_ISSUES[*]}"
    echo "Consider running migrations or manual schema fixes"
fi

echo ""
log_section "📊 Schema Sync Summary"
echo "========================================"
echo "✅ Schema baseline exported: $BASELINE_SCHEMA"
echo "✅ Migration script created: $MIGRATION_SCRIPT"
echo "📋 Schema issues found: ${#SCHEMA_ISSUES[@]}"
echo ""

log_info "🎯 Schema synchronization completed!"
echo ""
echo "Next steps:"
echo "1. Run migrations: ./scripts/database/run-migrations.sh"
echo "2. Verify data integrity: ./scripts/database/data-integrity-check.sh"
echo "3. Import missing data: ./scripts/database/import-staging-data.sh"