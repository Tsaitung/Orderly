#!/usr/bin/env bash
# 完整健康檢查腳本 - 檢查所有 staging 服務的健康狀態
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
ENV="${1:-staging}"
BASE_URL="https://orderly"
SUFFIX="usg6y7o2ba-de.a.run.app"

# Service definitions
declare -A SERVICES=(
    ["api-gateway"]="${BASE_URL}-api-gateway-fastapi-${ENV}-${SUFFIX}"
    ["user"]="${BASE_URL}-user-service-fastapi-${ENV}-${SUFFIX}"
    ["order"]="${BASE_URL}-order-service-fastapi-${ENV}-${SUFFIX}"
    ["product"]="${BASE_URL}-product-service-fastapi-${ENV}-655602747430.asia-east1.run.app"
    ["customer-hierarchy"]="${BASE_URL}-customer-hierarchy-service-fastapi-stagin-${SUFFIX}"
    ["supplier"]="${BASE_URL}-supplier-service-fastapi-${ENV}-${SUFFIX}"
    ["acceptance"]="${BASE_URL}-acceptance-service-fastapi-${ENV}-${SUFFIX}"
    ["notification"]="${BASE_URL}-notification-service-fastapi-${ENV}-${SUFFIX}"
    ["frontend"]="${BASE_URL}-frontend-${ENV}-${SUFFIX}"
)

# Health check endpoints
declare -A HEALTH_ENDPOINTS=(
    ["api-gateway"]="/ready"
    ["user"]="/health"
    ["order"]="/health"
    ["product"]="/health"
    ["customer-hierarchy"]="/api/v2/health"
    ["supplier"]="/health"
    ["acceptance"]="/acceptance/health"
    ["notification"]="/health"
    ["frontend"]="/api/health"
)

# Database health endpoints
declare -A DB_HEALTH_ENDPOINTS=(
    ["user"]="/db/health"
    ["order"]="/db/health"
    ["product"]="/db/health"
    ["customer-hierarchy"]="/api/v2/health/ready"
    ["supplier"]="/db/health"
    ["acceptance"]="/acceptance/db/health"
    ["notification"]="/db/health"
)

log_section "🏥 Starting comprehensive health check for $ENV environment"
echo "Checking $(echo ${!SERVICES[@]} | wc -w) services..."
echo ""

TOTAL_SERVICES=0
HEALTHY_SERVICES=0
UNHEALTHY_SERVICES=0
HEALTH_RESULTS=()

# Step 1: Basic health checks
log_section "🩺 Step 1: Basic service health checks"

for SERVICE in "${!SERVICES[@]}"; do
    SERVICE_URL="${SERVICES[$SERVICE]}"
    HEALTH_ENDPOINT="${HEALTH_ENDPOINTS[$SERVICE]}"
    
    if [ -z "$HEALTH_ENDPOINT" ]; then
        log_warning "⚠️ No health endpoint defined for $SERVICE"
        continue
    fi
    
    TOTAL_SERVICES=$((TOTAL_SERVICES + 1))
    FULL_URL="${SERVICE_URL}${HEALTH_ENDPOINT}"
    
    log_info "Checking $SERVICE at $FULL_URL"
    
    # Perform health check with timeout
    HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/health_response_${SERVICE}.json \
                --max-time 10 "$FULL_URL" || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        # Check response content
        if [ -f "/tmp/health_response_${SERVICE}.json" ]; then
            RESPONSE=$(cat /tmp/health_response_${SERVICE}.json)
            
            # Parse response based on service type
            if echo "$RESPONSE" | jq -e '.status' >/dev/null 2>&1; then
                STATUS=$(echo "$RESPONSE" | jq -r '.status')
                if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "ready" ]; then
                    log_info "  ✅ $SERVICE: $STATUS (HTTP $HTTP_CODE)"
                    HEALTHY_SERVICES=$((HEALTHY_SERVICES + 1))
                    HEALTH_RESULTS+=("$SERVICE: HEALTHY")
                else
                    log_warning "  ⚠️ $SERVICE: $STATUS (HTTP $HTTP_CODE)"
                    HEALTH_RESULTS+=("$SERVICE: DEGRADED")
                fi
            else
                log_info "  ✅ $SERVICE: Response OK (HTTP $HTTP_CODE)"
                HEALTHY_SERVICES=$((HEALTHY_SERVICES + 1))
                HEALTH_RESULTS+=("$SERVICE: HEALTHY")
            fi
        else
            log_info "  ✅ $SERVICE: HTTP $HTTP_CODE"
            HEALTHY_SERVICES=$((HEALTHY_SERVICES + 1))
            HEALTH_RESULTS+=("$SERVICE: HEALTHY")
        fi
    else
        log_error "  ❌ $SERVICE: HTTP $HTTP_CODE"
        UNHEALTHY_SERVICES=$((UNHEALTHY_SERVICES + 1))
        HEALTH_RESULTS+=("$SERVICE: UNHEALTHY")
        
        # Log response for debugging
        if [ -f "/tmp/health_response_${SERVICE}.json" ]; then
            echo "    Response: $(cat /tmp/health_response_${SERVICE}.json | head -c 200)"
        fi
    fi
done

echo ""

# Step 2: Database health checks
log_section "🗄️ Step 2: Database connectivity checks"

DB_HEALTHY=0
DB_TOTAL=0

for SERVICE in "${!DB_HEALTH_ENDPOINTS[@]}"; do
    SERVICE_URL="${SERVICES[$SERVICE]}"
    DB_ENDPOINT="${DB_HEALTH_ENDPOINTS[$SERVICE]}"
    
    if [ -z "$SERVICE_URL" ]; then
        continue
    fi
    
    DB_TOTAL=$((DB_TOTAL + 1))
    FULL_URL="${SERVICE_URL}${DB_ENDPOINT}"
    
    log_info "Checking $SERVICE database at $FULL_URL"
    
    HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/db_health_${SERVICE}.json \
                --max-time 10 "$FULL_URL" || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        if [ -f "/tmp/db_health_${SERVICE}.json" ]; then
            RESPONSE=$(cat /tmp/db_health_${SERVICE}.json)
            
            if echo "$RESPONSE" | jq -e '.database' >/dev/null 2>&1; then
                DB_STATUS=$(echo "$RESPONSE" | jq -r '.database.status // .database' 2>/dev/null || echo "unknown")
                if [ "$DB_STATUS" = "healthy" ] || [ "$DB_STATUS" = "connected" ]; then
                    log_info "  ✅ $SERVICE DB: $DB_STATUS"
                    DB_HEALTHY=$((DB_HEALTHY + 1))
                else
                    log_warning "  ⚠️ $SERVICE DB: $DB_STATUS"
                fi
            else
                log_info "  ✅ $SERVICE DB: Connected (HTTP $HTTP_CODE)"
                DB_HEALTHY=$((DB_HEALTHY + 1))
            fi
        else
            log_info "  ✅ $SERVICE DB: HTTP $HTTP_CODE"
            DB_HEALTHY=$((DB_HEALTHY + 1))
        fi
    elif [ "$HTTP_CODE" = "404" ]; then
        log_warning "  ⚠️ $SERVICE DB: Endpoint not found (HTTP 404)"
    else
        log_error "  ❌ $SERVICE DB: HTTP $HTTP_CODE"
    fi
done

echo ""

# Step 3: API endpoint tests
log_section "🧪 Step 3: Critical API endpoint tests"

API_GATEWAY="${SERVICES["api-gateway"]}"

if [ ! -z "$API_GATEWAY" ]; then
    log_info "Testing critical API endpoints via $API_GATEWAY"
    
    # Test service map
    SERVICE_MAP=$(curl -s "$API_GATEWAY/service-map" 2>/dev/null || echo "{}")
    if echo "$SERVICE_MAP" | jq -e '.services' >/dev/null 2>&1; then
        SERVICE_COUNT=$(echo "$SERVICE_MAP" | jq '.services | length')
        log_info "  ✅ Service map: $SERVICE_COUNT services registered"
    else
        log_warning "  ⚠️ Service map: Not available or invalid"
    fi
    
    # Test product categories
    CATEGORIES=$(curl -s "$API_GATEWAY/api/products/categories" 2>/dev/null || echo "[]")
    CATEGORY_COUNT=$(echo "$CATEGORIES" | jq '. | length' 2>/dev/null || echo "0")
    if [ "$CATEGORY_COUNT" -gt 100 ]; then
        log_info "  ✅ Product categories API: $CATEGORY_COUNT items"
    else
        log_warning "  ⚠️ Product categories API: $CATEGORY_COUNT items (expected >100)"
    fi
    
    # Test products
    PRODUCTS=$(curl -s "$API_GATEWAY/api/products/products" 2>/dev/null || echo "[]")
    PRODUCT_COUNT=$(echo "$PRODUCTS" | jq '. | length' 2>/dev/null || echo "0")
    if [ "$PRODUCT_COUNT" -gt 40 ]; then
        log_info "  ✅ Products API: $PRODUCT_COUNT items"
    else
        log_warning "  ⚠️ Products API: $PRODUCT_COUNT items (expected >40)"
    fi
    
else
    log_error "API Gateway URL not available"
fi

echo ""

# Step 4: Frontend health check
log_section "🌐 Step 4: Frontend health check"

FRONTEND_URL="${SERVICES["frontend"]}"
if [ ! -z "$FRONTEND_URL" ]; then
    log_info "Checking frontend at $FRONTEND_URL"
    
    FRONTEND_HTTP=$(curl -s -w "%{http_code}" -o /dev/null --max-time 10 "$FRONTEND_URL" || echo "000")
    if [ "$FRONTEND_HTTP" = "200" ]; then
        log_info "  ✅ Frontend: HTTP $FRONTEND_HTTP"
        
        # Check environment configuration
        ENV_CHECK=$(curl -s "$FRONTEND_URL/api/env-check" 2>/dev/null || echo "{}")
        if echo "$ENV_CHECK" | jq -e '.NEXT_PUBLIC_API_BASE_URL' >/dev/null 2>&1; then
            API_BASE=$(echo "$ENV_CHECK" | jq -r '.NEXT_PUBLIC_API_BASE_URL')
            log_info "  ✅ Frontend API base: $API_BASE"
        else
            log_warning "  ⚠️ Frontend environment configuration unclear"
        fi
    else
        log_error "  ❌ Frontend: HTTP $FRONTEND_HTTP"
    fi
else
    log_warning "Frontend URL not configured"
fi

echo ""

# Summary report
log_section "📊 Health Check Summary"
echo "========================================"
echo "Environment: $ENV"
echo "Timestamp: $(date)"
echo ""
echo "Service Health:"
echo "  Total services: $TOTAL_SERVICES"
echo "  Healthy: $HEALTHY_SERVICES"
echo "  Unhealthy: $UNHEALTHY_SERVICES"
echo ""
echo "Database Health:"
echo "  Total DB checks: $DB_TOTAL"
echo "  Healthy connections: $DB_HEALTHY"
echo ""

# Detailed results
echo "Detailed Results:"
for result in "${HEALTH_RESULTS[@]}"; do
    service="${result%%:*}"
    status="${result##*:}"
    case $status in
        "HEALTHY")
            echo "  ✅ $service"
            ;;
        "DEGRADED")
            echo "  ⚠️ $service"
            ;;
        "UNHEALTHY")
            echo "  ❌ $service"
            ;;
    esac
done

echo ""

# Overall status
HEALTH_PERCENTAGE=$((HEALTHY_SERVICES * 100 / TOTAL_SERVICES))

if [ $HEALTH_PERCENTAGE -ge 90 ]; then
    log_info "🎉 Overall system health: EXCELLENT ($HEALTH_PERCENTAGE%)"
    exit 0
elif [ $HEALTH_PERCENTAGE -ge 75 ]; then
    log_warning "⚠️ Overall system health: GOOD ($HEALTH_PERCENTAGE%)"
    exit 0
elif [ $HEALTH_PERCENTAGE -ge 50 ]; then
    log_warning "⚠️ Overall system health: DEGRADED ($HEALTH_PERCENTAGE%)"
    exit 1
else
    log_error "❌ Overall system health: CRITICAL ($HEALTH_PERCENTAGE%)"
    exit 1
fi

# Cleanup temp files
rm -f /tmp/health_response_*.json /tmp/db_health_*.json