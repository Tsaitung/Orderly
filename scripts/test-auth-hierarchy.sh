#!/bin/bash

# Test Customer Hierarchy Service Authentication
# Tests the /api/v2/hierarchy/tree endpoint with and without authentication

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${1:-staging}"
API_GATEWAY_BASE="https://orderly-api-gateway-fastapi-${ENVIRONMENT}-v2-usg6y7o2ba-de.a.run.app"
FRONTEND_BASE="https://orderly-frontend-${ENVIRONMENT}-usg6y7o2ba-de.a.run.app"

SERVICE_NAME="orderly-customer-hierarchy-service-fastapi-${ENVIRONMENT}-v2"
if [[ "$ENVIRONMENT" == "staging" ]]; then
  SERVICE_NAME="orderly-custhier-staging-v2"
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Customer Hierarchy Auth Test${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"

# Test 1: Direct API Gateway call without auth
echo -e "\n${YELLOW}Test 1: Direct API Gateway - No Auth${NC}"
echo "URL: ${API_GATEWAY_BASE}/api/v2/hierarchy/tree"
response=$(curl -s -w "\n%{http_code}" "${API_GATEWAY_BASE}/api/v2/hierarchy/tree" | tail -1)
if [[ "$response" == "200" ]]; then
    echo -e "${GREEN}✅ Pass: Returns 200 (auth bypassed in development mode)${NC}"
elif [[ "$response" == "401" ]]; then
    echo -e "${RED}❌ Fail: Returns 401 (auth still required)${NC}"
else
    echo -e "${YELLOW}⚠️ Unexpected: HTTP ${response}${NC}"
fi

# Test 2: Direct API Gateway call with dummy auth
echo -e "\n${YELLOW}Test 2: Direct API Gateway - With Dummy Auth${NC}"
echo "URL: ${API_GATEWAY_BASE}/api/v2/hierarchy/tree"
response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer dummy-token" "${API_GATEWAY_BASE}/api/v2/hierarchy/tree" | tail -1)
if [[ "$response" == "200" ]]; then
    echo -e "${GREEN}✅ Pass: Returns 200${NC}"
elif [[ "$response" == "401" ]]; then
    echo -e "${YELLOW}⚠️ Warning: Returns 401 (token validation active)${NC}"
else
    echo -e "${YELLOW}⚠️ Unexpected: HTTP ${response}${NC}"
fi

# Test 3: Frontend BFF endpoint
echo -e "\n${YELLOW}Test 3: Frontend BFF Endpoint${NC}"
echo "URL: ${FRONTEND_BASE}/api/bff/v2/hierarchy/tree"
response=$(curl -s -w "\n%{http_code}" "${FRONTEND_BASE}/api/bff/v2/hierarchy/tree" | tail -1)
if [[ "$response" == "200" ]]; then
    echo -e "${GREEN}✅ Pass: Returns 200${NC}"
elif [[ "$response" == "401" ]]; then
    echo -e "${RED}❌ Fail: Returns 401 (auth issue)${NC}"
else
    echo -e "${YELLOW}⚠️ Unexpected: HTTP ${response}${NC}"
fi

# Test 4: Get actual data to verify
echo -e "\n${YELLOW}Test 4: Data Verification${NC}"
echo "Fetching hierarchy tree data..."
data=$(curl -s "${API_GATEWAY_BASE}/api/v2/hierarchy/tree")
count=$(echo "$data" | jq -r '.data | length' 2>/dev/null || echo "0")
if [[ "$count" -gt 0 ]]; then
    echo -e "${GREEN}✅ Pass: Retrieved ${count} hierarchy nodes${NC}"
else
    echo -e "${RED}❌ Fail: No data returned or invalid JSON${NC}"
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Complete${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if customer-hierarchy-service has ENVIRONMENT variable set
echo -e "\n${YELLOW}Checking service configuration...${NC}"
service_env=$(gcloud run services describe ${SERVICE_NAME} \
    --region=asia-east1 \
    --project=orderly-472413 \
    --format="value(spec.template.spec.containers[0].env[?name=='ENVIRONMENT'].value)" 2>/dev/null || echo "not set")

if [[ "$service_env" == "development" ]]; then
    echo -e "${GREEN}✅ ENVIRONMENT=development is set (auth bypass active)${NC}"
elif [[ "$service_env" == "not set" ]]; then
    echo -e "${RED}❌ ENVIRONMENT variable not set (auth required)${NC}"
    echo -e "${YELLOW}Fix: Run the deployment script or manually set:${NC}"
    echo "gcloud run services update ${SERVICE_NAME} \\""
    echo "  --region=asia-east1 --project=orderly-472413 \\"
    echo "  --set-env-vars=\"ENVIRONMENT=development\""
else
    echo -e "${YELLOW}⚠️ ENVIRONMENT=${service_env} (unexpected value)${NC}"
fi
