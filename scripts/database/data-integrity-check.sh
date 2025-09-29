#!/bin/bash
# Data Integrity Check Script - Verify expected data counts
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

# Support both local and Cloud SQL connections
if [ -n "$DATABASE_HOST" ] && [[ "$DATABASE_HOST" == /cloudsql/* ]]; then
    # Running in Cloud environment
    DB_HOST="$DATABASE_HOST"
    DB_PORT="${DATABASE_PORT:-5432}"
    DB_NAME="${DATABASE_NAME:-orderly}"
    DB_USER="${DATABASE_USER:-orderly}"
    IS_CLOUD="true"
else
    # Running locally with Cloud SQL Proxy
    LOCAL_PORT="${1:-5433}"
    DB_HOST="localhost"
    DB_PORT="$LOCAL_PORT"
    DB_NAME="${2:-orderly}"
    DB_USER="${3:-orderly}"
    IS_CLOUD="false"
fi

echo "🔍 Running data integrity checks..."
if [ "$IS_CLOUD" = "true" ]; then
    echo "Database: $DB_NAME on Cloud SQL"
else
    echo "Database: $DB_NAME on localhost:$DB_PORT"
    
    # Check if Cloud SQL Proxy is running (only for local)
    if ! nc -z 127.0.0.1 $DB_PORT 2>/dev/null; then
        log_error "Cannot connect to localhost:$DB_PORT"
        echo "Please ensure Cloud SQL Proxy is running"
        exit 1
    fi
fi
echo ""

# Expected data counts (from plan.md - updated 2025-09-29)
EXPECTED_COUNTS="
users:3
organizations:10
business_units:20
customer_companies:20
customer_groups:13
product_categories:105
products:55
product_skus:52
supplier_product_skus:52
supplier_profiles:9
"

# Files to track issues
MISSING_DATA_FILE="/tmp/missing-data-tables.txt"
INTEGRITY_REPORT="/tmp/staging-integrity-report.txt"

# Clear previous reports
> "$MISSING_DATA_FILE"
> "$INTEGRITY_REPORT"

echo "Table Data Integrity Report - $(date)" >> "$INTEGRITY_REPORT"
echo "==========================================" >> "$INTEGRITY_REPORT"
echo "" >> "$INTEGRITY_REPORT"

TOTAL_ISSUES=0

for TABLE_COUNT in $EXPECTED_COUNTS; do
    # Skip empty lines
    [ -z "$TABLE_COUNT" ] && continue
    
    TABLE="${TABLE_COUNT%%:*}"
    EXPECTED="${TABLE_COUNT##*:}"
    
    # Get actual count
    if [ "$IS_CLOUD" = "true" ]; then
        # Use environment variable for password in Cloud
        ACTUAL=$(psql "host=$DB_HOST port=$DB_PORT dbname=$DB_NAME user=$DB_USER" \
                 -t -c "SELECT COUNT(*) FROM $TABLE" 2>/dev/null | xargs)
    else
        ACTUAL=$(PGPASSWORD="$(gcloud secrets versions access latest --secret=postgres-password 2>/dev/null)" \
                 psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
                 -t -c "SELECT COUNT(*) FROM $TABLE" 2>/dev/null | xargs)
    fi
    
    if [ $? -ne 0 ] || [ -z "$ACTUAL" ]; then
        log_error "❌ $TABLE: Table not found or query failed"
        echo "$TABLE: TABLE_NOT_FOUND" >> "$INTEGRITY_REPORT"
        echo "$TABLE" >> "$MISSING_DATA_FILE"
        TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
    elif [ "$ACTUAL" -ne "$EXPECTED" ]; then
        log_warning "⚠️ $TABLE: $ACTUAL (expected $EXPECTED)"
        echo "$TABLE: $ACTUAL (expected $EXPECTED)" >> "$INTEGRITY_REPORT"
        if [ "$ACTUAL" -eq 0 ]; then
            echo "$TABLE" >> "$MISSING_DATA_FILE"
        fi
        TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
    else
        log_info "✅ $TABLE: $ACTUAL"
        echo "$TABLE: $ACTUAL ✅" >> "$INTEGRITY_REPORT"
    fi
done

echo "" >> "$INTEGRITY_REPORT"
echo "Summary:" >> "$INTEGRITY_REPORT"
echo "  Total Issues: $TOTAL_ISSUES" >> "$INTEGRITY_REPORT"

if [ $TOTAL_ISSUES -eq 0 ]; then
    echo "  Status: ALL_GOOD ✅" >> "$INTEGRITY_REPORT"
    log_info "🎉 All data integrity checks passed!"
else
    echo "  Status: ISSUES_FOUND ⚠️" >> "$INTEGRITY_REPORT"
    log_warning "⚠️ Found $TOTAL_ISSUES data integrity issues"
    
    if [ -s "$MISSING_DATA_FILE" ]; then
        echo "" >> "$INTEGRITY_REPORT"
        echo "Tables needing data import:" >> "$INTEGRITY_REPORT"
        cat "$MISSING_DATA_FILE" >> "$INTEGRITY_REPORT"
    fi
fi

echo ""

# Additional supplier data validation
echo "" >> "$INTEGRITY_REPORT"
echo "Supplier Data Validation" >> "$INTEGRITY_REPORT"
echo "-----------------------" >> "$INTEGRITY_REPORT"

# Check products with supplier assignments
if [ "$IS_CLOUD" = "true" ]; then
    PRODUCTS_WITH_SUPPLIER=$(psql "host=$DB_HOST port=$DB_PORT dbname=$DB_NAME user=$DB_USER" \
        -t -c "SELECT COUNT(*) FROM products WHERE \"supplierId\" IS NOT NULL" 2>/dev/null | xargs)
else
    PRODUCTS_WITH_SUPPLIER=$(PGPASSWORD="$(gcloud secrets versions access latest --secret=postgres-password 2>/dev/null)" \
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
        -t -c "SELECT COUNT(*) FROM products WHERE \"supplierId\" IS NOT NULL" 2>/dev/null | xargs)
fi

if [ -n "$PRODUCTS_WITH_SUPPLIER" ]; then
    echo "Products with supplier: $PRODUCTS_WITH_SUPPLIER" >> "$INTEGRITY_REPORT"
    if [ "$PRODUCTS_WITH_SUPPLIER" -ge 50 ]; then
        log_info "✅ Supplier-Product relationships: $PRODUCTS_WITH_SUPPLIER products assigned"
        echo "  Status: GOOD ✅" >> "$INTEGRITY_REPORT"
    else
        log_warning "⚠️ Only $PRODUCTS_WITH_SUPPLIER products have supplier assignments"
        echo "  Status: LOW_COVERAGE ⚠️" >> "$INTEGRITY_REPORT"
    fi
fi

# Check supplier organizations
if [ "$IS_CLOUD" = "true" ]; then
    SUPPLIER_ORGS=$(psql "host=$DB_HOST port=$DB_PORT dbname=$DB_NAME user=$DB_USER" \
        -t -c "SELECT COUNT(*) FROM organizations WHERE type = 'supplier'" 2>/dev/null | xargs)
else
    SUPPLIER_ORGS=$(PGPASSWORD="$(gcloud secrets versions access latest --secret=postgres-password 2>/dev/null)" \
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
        -t -c "SELECT COUNT(*) FROM organizations WHERE type = 'supplier'" 2>/dev/null | xargs)
fi

if [ -n "$SUPPLIER_ORGS" ]; then
    echo "Supplier organizations: $SUPPLIER_ORGS" >> "$INTEGRITY_REPORT"
    if [ "$SUPPLIER_ORGS" -ge 9 ]; then
        log_info "✅ Supplier organizations: $SUPPLIER_ORGS found"
    else
        log_warning "⚠️ Only $SUPPLIER_ORGS supplier organizations (expected >= 9)"
    fi
fi

echo ""
log_info "📋 Full report saved to: $INTEGRITY_REPORT"

# Display report
cat "$INTEGRITY_REPORT"