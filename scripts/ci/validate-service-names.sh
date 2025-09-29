#!/bin/bash
# CI validation for Cloud Run service name lengths
# Ensures service names won't be truncated by Cloud Run

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Maximum allowed length for Cloud Run service names
MAX_LENGTH=30

# Service names to check (based on deploy.yml logic)
SERVICES="api-gateway-fastapi user-service-fastapi order-service-fastapi product-service-fastapi acceptance-service-fastapi notification-service-fastapi customer-hierarchy-service-fastapi supplier-service-fastapi"

# Get environment suffix from inputs
ENVIRONMENT="${1:-staging}"
SERVICE_SUFFIX="${2:--v2}"

echo "=== Cloud Run Service Name Validation ==="
echo "Environment: $ENVIRONMENT"
echo "Service Suffix: $SERVICE_SUFFIX"
echo "Max Length: $MAX_LENGTH chars"
echo ""

# Function to generate Cloud Run service name (mirrors deploy-cloud-run.sh logic)
cloud_run_service_name() {
    local service_name="$1"
    local env_suffix="${ENVIRONMENT}${SERVICE_SUFFIX}"
    
    # For staging-v2, use abbreviated service names
    if [[ "$env_suffix" == "staging-v2" ]]; then
        case "$service_name" in
            api-gateway-fastapi) echo "orderly-apigw-staging-v2" ;;
            user-service-fastapi) echo "orderly-user-staging-v2" ;;
            order-service-fastapi) echo "orderly-order-staging-v2" ;;
            product-service-fastapi) echo "orderly-product-staging-v2" ;;
            acceptance-service-fastapi) echo "orderly-accept-staging-v2" ;;
            notification-service-fastapi) echo "orderly-notify-staging-v2" ;;
            customer-hierarchy-service-fastapi) echo "orderly-custhier-staging-v2" ;;
            supplier-service-fastapi) echo "orderly-supplier-staging-v2" ;;
            *) echo "orderly-${service_name}-${env_suffix}" ;;
        esac
    else
        # For other environments
        case "$service_name" in
            customer-hierarchy-service-fastapi)
                echo "orderly-customer-hierarchy-${env_suffix}"
                ;;
            *) echo "orderly-${service_name}-${env_suffix}" ;;
        esac
    fi
}

# Check all service names
FAILED=false
for service_name in $SERVICES; do
    cloud_run_name=$(cloud_run_service_name "$service_name")
    name_length=${#cloud_run_name}
    
    if [[ $name_length -gt $MAX_LENGTH ]]; then
        echo -e "${RED}✗ FAIL${NC} $service_name → $cloud_run_name (${name_length} chars)"
        echo "       Exceeds limit by $((name_length - MAX_LENGTH)) chars"
        FAILED=true
    else
        echo -e "${GREEN}✓ PASS${NC} $service_name → $cloud_run_name (${name_length} chars)"
    fi
done

echo ""
if [[ "$FAILED" == true ]]; then
    echo -e "${RED}=== VALIDATION FAILED ===${NC}"
    echo "Some service names exceed the $MAX_LENGTH character limit."
    echo "Cloud Run will truncate these names, causing deployment failures."
    echo ""
    echo "Solutions:"
    echo "1. Use shorter service names in the mapping"
    echo "2. Reduce environment suffix length"
    echo "3. Use abbreviations for long service names"
    exit 1
else
    echo -e "${GREEN}=== VALIDATION PASSED ===${NC}"
    echo "All service names are within the $MAX_LENGTH character limit."
    exit 0
fi