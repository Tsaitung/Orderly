#!/bin/bash
# 簡化健康檢查腳本 - 檢查核心 staging 服務
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

# Service URLs
ENVIRONMENT="${ENV:-staging}"
SUFFIX="usg6y7o2ba-de.a.run.app"
API_GATEWAY="https://orderly-api-gateway-fastapi-${ENVIRONMENT}-${SUFFIX}"
USER_SERVICE="https://orderly-user-service-fastapi-${ENVIRONMENT}-${SUFFIX}"
ORDER_SERVICE="https://orderly-order-service-fastapi-${ENVIRONMENT}-${SUFFIX}"
PRODUCT_SERVICE="https://orderly-product-service-fastapi-${ENVIRONMENT}-655602747430.asia-east1.run.app"
if [[ "$ENVIRONMENT" == "staging-v2" ]]; then
    CUSTOMER_SERVICE="https://orderly-custhier-staging-v2-${SUFFIX}"
else
    CUSTOMER_SERVICE="https://orderly-customer-hierarchy-${ENVIRONMENT}-${SUFFIX}"
fi
FRONTEND="https://orderly-frontend-${ENVIRONMENT}-${SUFFIX}"

log_section "🏥 ${ENVIRONMENT} Environment Health Check"
echo "Timestamp: $(date)"
echo ""

TOTAL_CHECKS=0
PASSED_CHECKS=0

# Function to check service health
check_service() {
    local SERVICE_NAME="$1"
    local SERVICE_URL="$2"
    local HEALTH_ENDPOINT="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    log_info "Checking $SERVICE_NAME..."
    
    HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/health_check.json \
                --max-time 10 "${SERVICE_URL}${HEALTH_ENDPOINT}" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        if [ -f "/tmp/health_check.json" ]; then
            RESPONSE=$(cat /tmp/health_check.json)
            if echo "$RESPONSE" | grep -q '"status".*"healthy"' || \
               echo "$RESPONSE" | grep -q '"status".*"ready"' || \
               [ ${#RESPONSE} -lt 200 ]; then
                log_info "  ✅ $SERVICE_NAME: Healthy (HTTP $HTTP_CODE)"
                PASSED_CHECKS=$((PASSED_CHECKS + 1))
                return 0
            else
                log_warning "  ⚠️ $SERVICE_NAME: Degraded (HTTP $HTTP_CODE)"
                echo "    Response: $(echo "$RESPONSE" | head -c 100)..."
                return 1
            fi
        else
            log_info "  ✅ $SERVICE_NAME: Healthy (HTTP $HTTP_CODE)"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            return 0
        fi
    else
        log_error "  ❌ $SERVICE_NAME: Failed (HTTP $HTTP_CODE)"
        return 1
    fi
}

# Basic health checks
log_section "🩺 Service Health Checks"

check_service "API Gateway" "$API_GATEWAY" "/ready"
check_service "User Service" "$USER_SERVICE" "/health"
check_service "Order Service" "$ORDER_SERVICE" "/health"
check_service "Product Service" "$PRODUCT_SERVICE" "/health"
check_service "Customer Hierarchy" "$CUSTOMER_SERVICE" "/api/v2/health"
check_service "Frontend" "$FRONTEND" "/api/health"

echo ""

# Database health checks
log_section "🗄️ Database Health Checks"

check_service "User Service DB" "$USER_SERVICE" "/db/health"
check_service "Order Service DB" "$ORDER_SERVICE" "/db/health"  
check_service "Product Service DB" "$PRODUCT_SERVICE" "/db/health"

echo ""

# API functionality tests
log_section "🧪 API Functionality Tests"

log_info "Testing API Gateway service map..."
SERVICE_MAP=$(curl -s "$API_GATEWAY/service-map" 2>/dev/null || echo "{}")
if echo "$SERVICE_MAP" | grep -q '"services"'; then
    SERVICE_COUNT=$(echo "$SERVICE_MAP" | grep -o '"[^"]*":\s*{' | wc -l)
    log_info "  ✅ Service map: $SERVICE_COUNT services registered"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    log_warning "  ⚠️ Service map: Not available"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

log_info "Testing product categories API..."
CATEGORIES=$(curl -s "$API_GATEWAY/api/products/categories" 2>/dev/null || echo "[]")
CATEGORY_COUNT=$(echo "$CATEGORIES" | grep -o '"id"' | wc -l)
if [ "$CATEGORY_COUNT" -gt 100 ]; then
    log_info "  ✅ Product categories: $CATEGORY_COUNT items"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    log_warning "  ⚠️ Product categories: $CATEGORY_COUNT items (expected >100)"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

log_info "Testing products API..."
PRODUCTS=$(curl -s "$API_GATEWAY/api/products/products" 2>/dev/null || echo "[]")
PRODUCT_COUNT=$(echo "$PRODUCTS" | grep -o '"id"' | wc -l)
if [ "$PRODUCT_COUNT" -gt 40 ]; then
    log_info "  ✅ Products: $PRODUCT_COUNT items"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    log_warning "  ⚠️ Products: $PRODUCT_COUNT items (expected >40)"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo ""

# Summary
log_section "📊 Health Check Summary"
echo "========================================"
echo "Total checks: $TOTAL_CHECKS"
echo "Passed: $PASSED_CHECKS"
echo "Failed: $((TOTAL_CHECKS - PASSED_CHECKS))"

HEALTH_PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
echo "Health percentage: $HEALTH_PERCENTAGE%"
echo ""

if [ $HEALTH_PERCENTAGE -ge 90 ]; then
    log_info "🎉 System health: EXCELLENT ($HEALTH_PERCENTAGE%)"
    echo ""
    echo "✅ Staging environment is healthy and ready for use!"
    exit 0
elif [ $HEALTH_PERCENTAGE -ge 75 ]; then
    log_warning "⚠️ System health: GOOD ($HEALTH_PERCENTAGE%)"
    echo ""
    echo "✅ Staging environment is mostly healthy with minor issues"
    exit 0
elif [ $HEALTH_PERCENTAGE -ge 50 ]; then
    log_warning "⚠️ System health: DEGRADED ($HEALTH_PERCENTAGE%)"
    echo ""
    echo "⚠️ Staging environment has significant issues"
    exit 1
else
    log_error "❌ System health: CRITICAL ($HEALTH_PERCENTAGE%)"
    echo ""
    echo "❌ Staging environment requires immediate attention"
    exit 1
fi

# Cleanup
rm -f /tmp/health_check.json
