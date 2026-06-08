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

# Service names to check (based on cd.yml logic)
SERVICES="backend-monolith"

# Get environment suffix from inputs
ENVIRONMENT="${1:-staging}"
SERVICE_SUFFIX="${2:--v2}"

echo "=== Cloud Run Service Name Validation ==="
echo "Environment: $ENVIRONMENT"
echo "Service Suffix: $SERVICE_SUFFIX"
echo "Max Length: $MAX_LENGTH chars"
echo ""

source scripts/ci/cloud-run-names.sh

# Check all service names
FAILED=false
for service_name in $SERVICES; do
    cloud_run_name=$(cr_service_name "$service_name" "$ENVIRONMENT" "$SERVICE_SUFFIX")
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
