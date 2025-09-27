#!/bin/bash
# API Endpoint Validation Script
# Validates all critical API endpoints return expected data counts
# Usage: ./scripts/validate-api-endpoints.sh [environment]

set -e

ENVIRONMENT=${1:-staging}
API_BASE="https://orderly-api-gateway-fastapi-${ENVIRONMENT}-655602747430.asia-east1.run.app"

echo "🔍 Validating API endpoints for environment: $ENVIRONMENT"
echo "📍 Base URL: $API_BASE"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Function to test endpoint
test_endpoint() {
    local endpoint="$1"
    local expected="$2"
    local description="$3"
    local jq_filter="$4"
    
    echo -n "Testing $description... "
    
    local response
    local actual
    
    response=$(curl -s --max-time 10 "$API_BASE$endpoint" 2>/dev/null || echo "ERROR")
    
    if [ "$response" = "ERROR" ]; then
        echo -e "${RED}❌ TIMEOUT/ERROR${NC}"
        ((ERRORS++))
        return 1
    fi
    
    actual=$(echo "$response" | jq -r "$jq_filter" 2>/dev/null || echo "PARSE_ERROR")
    
    if [ "$actual" = "PARSE_ERROR" ]; then
        echo -e "${RED}❌ JSON PARSE ERROR${NC}"
        echo "   Response: $response"
        ((ERRORS++))
        return 1
    fi
    
    if [ "$actual" = "$expected" ]; then
        echo -e "${GREEN}✅ $actual items (correct)${NC}"
        return 0
    else
        echo -e "${RED}❌ $actual items (expected $expected)${NC}"
        ((ERRORS++))
        return 1
    fi
}

# Function to test health endpoint
test_health() {
    local endpoint="$1"
    local description="$2"
    
    echo -n "Testing $description... "
    
    local response
    local status
    
    response=$(curl -s --max-time 10 "$API_BASE$endpoint" 2>/dev/null || echo "ERROR")
    
    if [ "$response" = "ERROR" ]; then
        echo -e "${RED}❌ TIMEOUT/ERROR${NC}"
        ((ERRORS++))
        return 1
    fi
    
    status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "PARSE_ERROR")
    
    if [ "$status" = "PARSE_ERROR" ]; then
        echo -e "${RED}❌ JSON PARSE ERROR${NC}"
        echo "   Response: $response"
        ((ERRORS++))
        return 1
    fi
    
    if [ "$status" = "healthy" ] || [ "$status" = "ready" ] || [ "$status" = "alive" ]; then
        echo -e "${GREEN}✅ $status${NC}"
        return 0
    else
        echo -e "${RED}❌ $status${NC}"
        ((ERRORS++))
        return 1
    fi
}

echo "🔍 Core API Endpoints:"
echo "────────────────────────"

# Test Product APIs
test_endpoint "/api/products/products" "52" "Products API (pagination)" ".data.pagination.totalItems"
test_endpoint "/api/products/categories" "105" "Product Categories API" ".data | length"

# Test Gateway Health
test_health "/health" "API Gateway Health"
test_health "/ready" "API Gateway Readiness"

echo ""
echo "🔍 Service Health Checks:"
echo "────────────────────────"

# Test individual service health endpoints
test_health "/db/health" "Database Health (aggregated)"

# Test specific service URLs from service map
echo -n "Getting service map... "
SERVICE_MAP=$(curl -s --max-time 10 "$API_BASE/service-map" 2>/dev/null || echo "ERROR")

if [ "$SERVICE_MAP" = "ERROR" ]; then
    echo -e "${RED}❌ SERVICE MAP UNAVAILABLE${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅${NC}"
    
    # Extract and test individual services
    PRODUCT_SERVICE_URL=$(echo "$SERVICE_MAP" | jq -r '.internal_service_map.products' 2>/dev/null)
    USER_SERVICE_URL=$(echo "$SERVICE_MAP" | jq -r '.internal_service_map.users' 2>/dev/null)
    HIERARCHY_SERVICE_URL=$(echo "$SERVICE_MAP" | jq -r '.internal_service_map.customer_hierarchy_v2' 2>/dev/null)
    
    if [ "$PRODUCT_SERVICE_URL" != "null" ] && [ "$PRODUCT_SERVICE_URL" != "" ]; then
        echo -n "Testing Product Service directly... "
        DIRECT_HEALTH=$(curl -s --max-time 5 "$PRODUCT_SERVICE_URL/health" 2>/dev/null || echo "ERROR")
        if echo "$DIRECT_HEALTH" | jq -e '.status == "healthy"' >/dev/null 2>&1; then
            echo -e "${GREEN}✅ healthy${NC}"
        else
            echo -e "${RED}❌ unhealthy or unreachable${NC}"
            ((ERRORS++))
        fi
    fi
    
    if [ "$USER_SERVICE_URL" != "null" ] && [ "$USER_SERVICE_URL" != "" ]; then
        echo -n "Testing User Service directly... "
        DIRECT_HEALTH=$(curl -s --max-time 5 "$USER_SERVICE_URL/health" 2>/dev/null || echo "ERROR")
        if echo "$DIRECT_HEALTH" | jq -e '.status == "healthy"' >/dev/null 2>&1; then
            echo -e "${GREEN}✅ healthy${NC}"
        else
            echo -e "${RED}❌ unhealthy or unreachable${NC}"
            ((ERRORS++))
        fi
    fi
    
    if [ "$HIERARCHY_SERVICE_URL" != "null" ] && [ "$HIERARCHY_SERVICE_URL" != "" ]; then
        echo -n "Testing Customer Hierarchy Service directly... "
        DIRECT_HEALTH=$(curl -s --max-time 5 "$HIERARCHY_SERVICE_URL/health" 2>/dev/null || echo "ERROR")
        if echo "$DIRECT_HEALTH" | jq -e '.status == "healthy"' >/dev/null 2>&1; then
            echo -e "${GREEN}✅ healthy${NC}"
        else
            echo -e "${RED}❌ unhealthy or unreachable${NC}"
            ((ERRORS++))
        fi
    fi
fi

echo ""
echo "🔍 Critical V2 Endpoints:"
echo "────────────────────────"

# Test V2 endpoints (these require auth, so we test for proper error responses)
echo -n "Testing V2 Health endpoint... "
V2_HEALTH_RESPONSE=$(curl -s --max-time 10 "$API_BASE/api/v2/health" 2>/dev/null || echo "ERROR")

if [ "$V2_HEALTH_RESPONSE" = "ERROR" ]; then
    echo -e "${RED}❌ TIMEOUT/ERROR${NC}"
    ((ERRORS++))
elif echo "$V2_HEALTH_RESPONSE" | jq -e '.detail == "Not Found"' >/dev/null 2>&1; then
    echo -e "${RED}❌ V2 Router Not Found (deployment issue)${NC}"
    ((ERRORS++))
elif echo "$V2_HEALTH_RESPONSE" | jq -e '.status' >/dev/null 2>&1; then
    V2_STATUS=$(echo "$V2_HEALTH_RESPONSE" | jq -r '.status')
    echo -e "${GREEN}✅ $V2_STATUS (V2 router working)${NC}"
else
    echo -e "${YELLOW}⚠️  Unexpected response (might need auth)${NC}"
    echo "   Response: $V2_HEALTH_RESPONSE"
fi

echo -n "Testing V2 Companies endpoint... "
V2_COMPANIES_RESPONSE=$(curl -s --max-time 10 "$API_BASE/api/v2/companies" 2>/dev/null || echo "ERROR")

if [ "$V2_COMPANIES_RESPONSE" = "ERROR" ]; then
    echo -e "${RED}❌ TIMEOUT/ERROR${NC}"
    ((ERRORS++))
elif echo "$V2_COMPANIES_RESPONSE" | jq -e '.detail == "Not Found"' >/dev/null 2>&1; then
    echo -e "${RED}❌ V2 Router Not Found (deployment issue)${NC}"
    ((ERRORS++))
elif echo "$V2_COMPANIES_RESPONSE" | jq -e '.detail == "Authentication required"' >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Authentication required (V2 router working)${NC}"
else
    echo -e "${YELLOW}⚠️  Unexpected response${NC}"
    echo "   Response: $V2_COMPANIES_RESPONSE"
fi

echo ""
echo "📊 Validation Summary:"
echo "────────────────────────"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All endpoints validated successfully!${NC}"
    echo -e "${GREEN}🎉 API infrastructure is working correctly${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS issues${NC}"
    echo -e "${RED}🚨 API infrastructure needs attention${NC}"
    echo ""
    echo "Common fixes:"
    echo "• For V2 router issues: Redeploy Customer Hierarchy Service"
    echo "• For timeout issues: Check service health and scaling"
    echo "• For data count issues: Verify database migrations"
    echo ""
    echo "Run with DEBUG=1 for more verbose output:"
    echo "DEBUG=1 $0 $ENVIRONMENT"
    exit 1
fi