#!/usr/bin/env bash
#
# Orderly Platform - CI/CD Deployment Validation Script
# 
# Purpose: Validate configuration before deployment to prevent common issues
# - Service name length validation (≤30 chars for Cloud Run)
# - DATABASE_PORT environment variable presence
# - Cloud SQL annotation format validation
#
# Usage:
#   ./validate-deployment.sh check-names --environment staging [--suffix -v2]
#   ./validate-deployment.sh check-database-port --environment staging
#   ./validate-deployment.sh check-cloudsql --environment staging
#   ./validate-deployment.sh report
#

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
MAX_SERVICE_NAME_LENGTH=30
REQUIRED_DATABASE_PORT="5432"

# Service list (matching deploy.yml)
declare -a SERVICES=(
  "api-gateway-fastapi"
  "user-service-fastapi"
  "order-service-fastapi"
  "product-service-fastapi"
  "acceptance-service-fastapi"
  "notification-service-fastapi"
  "customer-hierarchy-service-fastapi"
  "supplier-service-fastapi"
)

# Validation results
declare -a ERRORS=()
declare -a WARNINGS=()
declare -a INFO=()

# Helper functions
print_error() {
  echo -e "${RED}❌ $1${NC}" >&2
  ERRORS+=("$1")
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  WARNINGS+=("$1")
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
  INFO+=("$1")
}

print_info() {
  echo -e "ℹ️  $1"
}

# Get Cloud Run service name based on service and environment
get_cloud_run_name() {
  local service="$1"
  local environment="$2"
  local suffix="${3:-}"
  local env_suffix="${environment}${suffix}"
  
  # For staging-v2, use abbreviated service names to stay within 30 char limit
  if [[ "$env_suffix" == "staging-v2" ]]; then
    case "$service" in
      api-gateway-fastapi) echo "orderly-apigw-staging-v2" ;;
      user-service-fastapi) echo "orderly-user-staging-v2" ;;
      order-service-fastapi) echo "orderly-order-staging-v2" ;;
      product-service-fastapi) echo "orderly-product-staging-v2" ;;
      acceptance-service-fastapi) echo "orderly-accept-staging-v2" ;;
      notification-service-fastapi) echo "orderly-notify-staging-v2" ;;
      customer-hierarchy-service-fastapi) echo "orderly-custhier-staging-v2" ;;
      supplier-service-fastapi) echo "orderly-supplier-staging-v2" ;;
      *) echo "orderly-${service}-${env_suffix}" ;;
    esac
  else
    # For other environments, use existing logic
    case "$service" in
      customer-hierarchy-service-fastapi)
        echo "orderly-customer-hierarchy-${env_suffix}"
        ;;
      *) echo "orderly-${service}-${env_suffix}" ;;
    esac
  fi
}

# Check service name lengths
check_service_names() {
  local environment="${1:-staging}"
  local suffix="${2:-}"
  local failed=0
  
  echo "🔍 Checking service name lengths for environment: ${environment}${suffix}"
  echo "   Maximum allowed length: ${MAX_SERVICE_NAME_LENGTH} characters"
  echo ""
  
  for service in "${SERVICES[@]}"; do
    local cloud_run_name
    cloud_run_name=$(get_cloud_run_name "$service" "$environment" "$suffix")
    local name_length=${#cloud_run_name}
    
    if [[ $name_length -gt $MAX_SERVICE_NAME_LENGTH ]]; then
      print_error "Service name too long: $cloud_run_name ($name_length chars > $MAX_SERVICE_NAME_LENGTH)"
      echo "   Suggestion: Use abbreviated name or shorter suffix"
      
      # Provide specific suggestions
      if [[ "$service" == "customer-hierarchy-service-fastapi" ]]; then
        echo "   Example: orderly-custhier-${environment}${suffix} (use 'custhier' abbreviation)"
      elif [[ "$service" == "notification-service-fastapi" ]]; then
        echo "   Example: orderly-notify-${environment}${suffix} (use 'notify' abbreviation)"
      elif [[ "$service" == "acceptance-service-fastapi" ]]; then
        echo "   Example: orderly-accept-${environment}${suffix} (use 'accept' abbreviation)"
      fi
      
      failed=$((failed + 1))
    else
      print_success "$cloud_run_name ($name_length chars)"
    fi
  done
  
  echo ""
  if [[ $failed -gt 0 ]]; then
    print_error "Found $failed service(s) with names exceeding ${MAX_SERVICE_NAME_LENGTH} characters"
    return 1
  else
    print_success "All service names are within the ${MAX_SERVICE_NAME_LENGTH} character limit"
    return 0
  fi
}

# Check DATABASE_PORT configuration
check_database_port() {
  local environment="${1:-staging}"
  local config_file="configs/${environment}/env-vars.yaml"
  local failed=0
  
  echo "🔍 Checking DATABASE_PORT configuration for environment: ${environment}"
  echo ""
  
  # Check if config file exists
  if [[ ! -f "$config_file" ]]; then
    print_warning "Configuration file not found: $config_file"
    echo "   Checking environment-specific files..."
  fi
  
  # Check for DATABASE_PORT in env-vars.yaml
  if [[ -f "$config_file" ]]; then
    if grep -q "DATABASE_PORT:" "$config_file"; then
      local port_value
      port_value=$(grep "DATABASE_PORT:" "$config_file" | awk -F': ' '{print $2}' | tr -d '\"' | tr -d ' ')
      
      if [[ "$port_value" == "$REQUIRED_DATABASE_PORT" ]]; then
        print_success "DATABASE_PORT correctly set to $REQUIRED_DATABASE_PORT in $config_file"
      else
        print_error "DATABASE_PORT set to '$port_value' instead of required '$REQUIRED_DATABASE_PORT' in $config_file"
        failed=$((failed + 1))
      fi
    else
      print_error "DATABASE_PORT not found in $config_file"
      echo "   Add: DATABASE_PORT: \"$REQUIRED_DATABASE_PORT\" to the env_vars section"
      failed=$((failed + 1))
    fi
  fi
  
  # Skip checking deploy scripts - they're handled by CI/CD workflow
  # The workflow itself sets DATABASE_PORT in the deployment configuration
  
  # Check if services are using DATABASE_PORT
  echo ""
  echo "Checking service configurations..."
  
  for service in "${SERVICES[@]}"; do
    local service_dir="backend/${service}"
    if [[ -d "$service_dir" ]]; then
      # Check for unified_config usage (indicates proper DATABASE_PORT handling)
      if grep -r "database_port" "$service_dir" --include="*.py" >/dev/null 2>&1; then
        print_success "$service appears to use database_port configuration"
      else
        print_info "$service: Manual verification needed for DATABASE_PORT usage"
      fi
    fi
  done
  
  echo ""
  if [[ $failed -gt 0 ]]; then
    print_error "DATABASE_PORT configuration issues found"
    return 1
  else
    print_success "DATABASE_PORT configuration appears correct"
    return 0
  fi
}

# Check Cloud SQL configuration
check_cloudsql() {
  local environment="${1:-staging}"
  local expected_instance=""
  
  echo "🔍 Checking Cloud SQL configuration for environment: ${environment}"
  echo ""
  
  # Determine expected instance name based on environment
  case "$environment" in
    staging*)
      expected_instance="orderly-db-v2"
      ;;
    production)
      expected_instance="orderly-db"
      ;;
    *)
      print_warning "Unknown environment: $environment"
      expected_instance="orderly-db"
      ;;
  esac
  
  local expected_annotation="orderly-472413:asia-east1:${expected_instance}"
  print_info "Expected Cloud SQL annotation: $expected_annotation"
  
  # Check deploy.yml for Cloud SQL configuration
  if [[ -f ".github/workflows/deploy.yml" ]]; then
    echo ""
    echo "Checking deploy.yml workflow..."
    
    if grep -q "add-cloudsql-instances" ".github/workflows/deploy.yml"; then
      print_success "Cloud SQL annotation found in deploy.yml"
      
      # Check if using correct instance variable
      if grep -q 'add-cloudsql-instances.*DB_CONNECTION_NAME' ".github/workflows/deploy.yml"; then
        print_success "Using dynamic DB_CONNECTION_NAME variable"
      else
        print_warning "Consider using DB_CONNECTION_NAME variable for flexibility"
      fi
    else
      print_error "Cloud SQL annotation not found in deploy.yml"
    fi
  fi
  
  # Check deploy script
  if [[ -f "scripts/deploy-cloud-run.sh" ]]; then
    echo ""
    echo "Checking deploy-cloud-run.sh..."
    
    if grep -q "add-cloudsql-instances" "scripts/deploy-cloud-run.sh"; then
      print_success "Cloud SQL configuration found in deploy script"
    else
      print_error "Cloud SQL configuration missing in deploy script"
    fi
  fi
  
  echo ""
  print_info "Note: Actual Cloud SQL instances should be verified in GCP Console"
  return 0
}

# Generate summary report
generate_report() {
  echo "## 📊 CI/CD Configuration Validation Report"
  echo ""
  
  if [[ ${#ERRORS[@]} -eq 0 && ${#WARNINGS[@]} -eq 0 ]]; then
    echo "### ✅ All validations passed successfully!"
  else
    if [[ ${#ERRORS[@]} -gt 0 ]]; then
      echo "### ❌ Errors Found (${#ERRORS[@]})"
      for error in "${ERRORS[@]}"; do
        echo "- $error"
      done
      echo ""
    fi
    
    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
      echo "### ⚠️ Warnings (${#WARNINGS[@]})"
      for warning in "${WARNINGS[@]}"; do
        echo "- $warning"
      done
      echo ""
    fi
  fi
  
  if [[ ${#INFO[@]} -gt 0 ]]; then
    echo "### ✅ Successful Checks (${#INFO[@]})"
    for info in "${INFO[@]:0:5}"; do  # Show first 5 successes
      echo "- $info"
    done
    if [[ ${#INFO[@]} -gt 5 ]]; then
      echo "- ... and $((${#INFO[@]} - 5)) more"
    fi
    echo ""
  fi
  
  echo "---"
  echo "*Validation completed at: $(date '+%Y-%m-%d %H:%M:%S')*"
}

# Main script logic
main() {
  local command="${1:-help}"
  shift || true
  
  case "$command" in
    check-names)
      local environment="staging"
      local suffix=""
      
      while [[ $# -gt 0 ]]; do
        case "$1" in
          --environment|-e)
            environment="$2"
            shift 2
            ;;
          --suffix|-s)
            suffix="$2"
            shift 2
            ;;
          *)
            shift
            ;;
        esac
      done
      
      check_service_names "$environment" "$suffix"
      ;;
      
    check-database-port)
      local environment="staging"
      
      while [[ $# -gt 0 ]]; do
        case "$1" in
          --environment|-e)
            environment="$2"
            shift 2
            ;;
          *)
            shift
            ;;
        esac
      done
      
      check_database_port "$environment"
      ;;
      
    check-cloudsql)
      local environment="staging"
      
      while [[ $# -gt 0 ]]; do
        case "$1" in
          --environment|-e)
            environment="$2"
            shift 2
            ;;
          *)
            shift
            ;;
        esac
      done
      
      check_cloudsql "$environment"
      ;;
      
    report)
      generate_report
      ;;
      
    all)
      local environment="${1:-staging}"
      local suffix="${2:-}"
      
      echo "🚀 Running all validation checks..."
      echo "=================================="
      echo ""
      
      check_service_names "$environment" "$suffix"
      echo ""
      echo "=================================="
      echo ""
      check_database_port "$environment"
      echo ""
      echo "=================================="
      echo ""
      check_cloudsql "$environment"
      echo ""
      echo "=================================="
      echo ""
      generate_report
      
      # Exit with error if any errors found
      if [[ ${#ERRORS[@]} -gt 0 ]]; then
        exit 1
      fi
      ;;
      
    help|*)
      echo "Orderly Platform - CI/CD Deployment Validation"
      echo ""
      echo "Usage:"
      echo "  $0 check-names [--environment ENV] [--suffix SUFFIX]"
      echo "    Check service name lengths (must be ≤30 chars)"
      echo ""
      echo "  $0 check-database-port [--environment ENV]"
      echo "    Verify DATABASE_PORT configuration"
      echo ""
      echo "  $0 check-cloudsql [--environment ENV]"
      echo "    Validate Cloud SQL annotations"
      echo ""
      echo "  $0 all [ENVIRONMENT] [SUFFIX]"
      echo "    Run all validation checks"
      echo ""
      echo "  $0 report"
      echo "    Generate summary report"
      echo ""
      echo "Examples:"
      echo "  $0 check-names --environment staging --suffix -v2"
      echo "  $0 check-database-port --environment production"
      echo "  $0 all staging -v2"
      ;;
  esac
}

# Run main function
main "$@"