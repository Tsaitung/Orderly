#!/usr/bin/env bash
#
# GitHub Secrets Cleanup Script for Orderly Platform
# 
# Purpose: Remove legacy DATABASE_URL_* secrets and validate separated variables
# This script helps migrate from monolithic DATABASE_URL to separated variables:
# - DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_NAME (env vars)
# - POSTGRES_PASSWORD (Secret Manager)
#
# Prerequisites:
# - GitHub CLI installed and authenticated (gh auth login)
# - Appropriate repository permissions
# - Backup of existing secret values (recommended)
#
# Usage:
#   ./cleanup-github-secrets.sh --dry-run    # Review what would be deleted
#   ./cleanup-github-secrets.sh --execute    # Execute the cleanup
#   ./cleanup-github-secrets.sh --validate   # Validate current state
#

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_OWNER="${GITHUB_REPOSITORY_OWNER:-leeyude}"
REPO_NAME="${GITHUB_REPOSITORY_NAME:-Orderly}"

# Legacy secrets to be removed
declare -a LEGACY_SECRETS=(
  "DATABASE_URL_STAGING"
  "DATABASE_URL_STAGING_V2"
  "DATABASE_URL_PRODUCTION"
  "DATABASE_URL_DEVELOPMENT"
  "DATABASE_URL_TEST"
)

# Required secrets that should exist
declare -a REQUIRED_SECRETS=(
  "POSTGRES_PASSWORD"
  "JWT_SECRET"
  "JWT_REFRESH_SECRET"
  "GCP_SA_KEY"
  "GCP_PROJECT_ID"
)

# Helper functions
print_error() {
  echo -e "${RED}❌ $1${NC}" >&2
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
  echo -e "${BLUE}==== $1 ====${NC}"
}

# Check prerequisites
check_prerequisites() {
  print_header "Checking Prerequisites"
  
  # Check if gh CLI is installed
  if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI not found. Install: https://cli.github.com/"
    exit 1
  fi
  
  # Check if authenticated
  if ! gh auth status &> /dev/null; then
    print_error "GitHub CLI not authenticated. Run: gh auth login"
    exit 1
  fi
  
  # Check repository access
  if ! gh repo view "$REPO_OWNER/$REPO_NAME" &> /dev/null; then
    print_error "Cannot access repository $REPO_OWNER/$REPO_NAME"
    print_info "Make sure you have the correct permissions and repository name"
    exit 1
  fi
  
  print_success "Prerequisites verified"
}

# List current secrets
list_current_secrets() {
  print_header "Current Repository Secrets"
  
  echo "📋 All secrets in $REPO_OWNER/$REPO_NAME:"
  gh secret list --repo "$REPO_OWNER/$REPO_NAME" | sort
  echo ""
}

# Audit legacy secrets
audit_legacy_secrets() {
  print_header "Auditing Legacy DATABASE_URL Secrets"
  
  local found_legacy=0
  
  for secret in "${LEGACY_SECRETS[@]}"; do
    if gh secret list --repo "$REPO_OWNER/$REPO_NAME" | grep -q "^$secret"; then
      print_warning "Found legacy secret: $secret"
      found_legacy=$((found_legacy + 1))
    else
      print_info "Legacy secret not found: $secret (already cleaned up)"
    fi
  done
  
  echo ""
  if [[ $found_legacy -gt 0 ]]; then
    print_warning "Found $found_legacy legacy DATABASE_URL secret(s) that should be removed"
    return 1
  else
    print_success "No legacy DATABASE_URL secrets found"
    return 0
  fi
}

# Validate required secrets
validate_required_secrets() {
  print_header "Validating Required Secrets"
  
  local missing_secrets=0
  
  for secret in "${REQUIRED_SECRETS[@]}"; do
    if gh secret list --repo "$REPO_OWNER/$REPO_NAME" | grep -q "^$secret"; then
      print_success "Required secret exists: $secret"
    else
      print_error "Missing required secret: $secret"
      missing_secrets=$((missing_secrets + 1))
    fi
  done
  
  echo ""
  if [[ $missing_secrets -gt 0 ]]; then
    print_error "$missing_secrets required secret(s) are missing"
    print_info "Add missing secrets before proceeding with deployment"
    return 1
  else
    print_success "All required secrets are present"
    return 0
  fi
}

# Backup legacy secrets (display values for manual backup)
backup_legacy_secrets() {
  print_header "Legacy Secrets Backup Instructions"
  
  print_warning "IMPORTANT: GitHub CLI cannot retrieve secret values for security reasons"
  print_info "Before deleting, ensure you have backed up the following secrets manually:"
  
  for secret in "${LEGACY_SECRETS[@]}"; do
    if gh secret list --repo "$REPO_OWNER/$REPO_NAME" | grep -q "^$secret"; then
      echo "  - $secret"
    fi
  done
  
  echo ""
  print_info "💡 If you need these values, retrieve them from your secure storage or"
  print_info "   regenerate them from the original database connection parameters"
}

# Execute cleanup (delete legacy secrets)
execute_cleanup() {
  print_header "Executing Secrets Cleanup"
  
  local deleted_count=0
  
  for secret in "${LEGACY_SECRETS[@]}"; do
    if gh secret list --repo "$REPO_OWNER/$REPO_NAME" | grep -q "^$secret"; then
      echo "🗑️  Deleting legacy secret: $secret"
      if gh secret delete "$secret" --repo "$REPO_OWNER/$REPO_NAME"; then
        print_success "Deleted: $secret"
        deleted_count=$((deleted_count + 1))
      else
        print_error "Failed to delete: $secret"
      fi
    else
      print_info "Skip (not found): $secret"
    fi
  done
  
  echo ""
  if [[ $deleted_count -gt 0 ]]; then
    print_success "Successfully deleted $deleted_count legacy secret(s)"
  else
    print_info "No legacy secrets to delete"
  fi
}

# Verify separated variables configuration
verify_separated_config() {
  print_header "Verifying Separated Variables Configuration"
  
  print_info "Checking environment variable configuration files..."
  
  # Check staging environment config
  local config_file="configs/staging/env-vars.yaml"
  if [[ -f "$config_file" ]]; then
    echo "📁 Checking $config_file:"
    
    local vars_found=0
    for var in "DATABASE_HOST" "DATABASE_PORT" "DATABASE_USER" "DATABASE_NAME"; do
      if grep -q "$var:" "$config_file"; then
        print_success "  $var: configured"
        vars_found=$((vars_found + 1))
      else
        print_warning "  $var: not found"
      fi
    done
    
    if [[ $vars_found -eq 4 ]]; then
      print_success "All database environment variables are properly configured"
    else
      print_warning "Some database environment variables are missing"
    fi
  else
    print_warning "Configuration file not found: $config_file"
  fi
  
  echo ""
  print_info "Checking deployment scripts..."
  
  # Check deploy script
  if [[ -f "scripts/deploy-cloud-run.sh" ]]; then
    if grep -q "DATABASE_PORT" "scripts/deploy-cloud-run.sh"; then
      print_success "  deploy-cloud-run.sh: DATABASE_PORT referenced"
    else
      print_warning "  deploy-cloud-run.sh: DATABASE_PORT not found"
    fi
  fi
  
  # Check CI workflow
  if [[ -f ".github/workflows/deploy.yml" ]]; then
    if grep -q "POSTGRES_PASSWORD.*secrets" ".github/workflows/deploy.yml"; then
      print_success "  deploy.yml: POSTGRES_PASSWORD uses secrets"
    else
      print_warning "  deploy.yml: POSTGRES_PASSWORD secret reference not found"
    fi
  fi
}

# Generate cleanup report
generate_report() {
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  
  echo ""
  print_header "GitHub Secrets Cleanup Report"
  echo "Generated: $timestamp"
  echo "Repository: $REPO_OWNER/$REPO_NAME"
  echo ""
  
  # Current secrets state
  echo "## Current Secrets State"
  gh secret list --repo "$REPO_OWNER/$REPO_NAME" | head -20
  echo ""
  
  # Validation results
  echo "## Validation Results"
  
  if audit_legacy_secrets 2>/dev/null; then
    echo "✅ Legacy secrets: Clean (no DATABASE_URL_* secrets found)"
  else
    echo "⚠️  Legacy secrets: Found legacy DATABASE_URL_* secrets that should be removed"
  fi
  
  if validate_required_secrets 2>/dev/null; then
    echo "✅ Required secrets: All present"
  else
    echo "❌ Required secrets: Some required secrets are missing"
  fi
  
  echo ""
  echo "## Next Steps"
  echo "1. Verify all CI/CD workflows use separated variables"
  echo "2. Test deployment with current configuration"
  echo "3. Monitor for any remaining DATABASE_URL references"
  echo ""
  echo "---"
  echo "*Report generated by: $0*"
}

# Test CI/CD compatibility
test_ci_compatibility() {
  print_header "Testing CI/CD Compatibility"
  
  print_info "Checking if current configuration is CI/CD compatible..."
  
  # Check if validation script passes
  if [[ -f "scripts/ci/validate-deployment.sh" ]]; then
    chmod +x scripts/ci/validate-deployment.sh
    echo "🔧 Running deployment validation..."
    if ./scripts/ci/validate-deployment.sh check-database-port --environment staging; then
      print_success "CI/CD validation passes"
    else
      print_warning "CI/CD validation has issues - review configuration"
    fi
  else
    print_warning "Deployment validation script not found"
  fi
  
  # Check for remaining DATABASE_URL references
  echo ""
  echo "🔍 Scanning for remaining DATABASE_URL references..."
  
  local found_refs=0
  if grep -r "DATABASE_URL" .github/workflows/ --exclude-dir=node_modules 2>/dev/null; then
    print_warning "Found DATABASE_URL references in workflows"
    found_refs=$((found_refs + 1))
  fi
  
  if grep -r "DATABASE_URL" scripts/ --exclude-dir=node_modules 2>/dev/null; then
    print_warning "Found DATABASE_URL references in scripts"
    found_refs=$((found_refs + 1))
  fi
  
  if [[ $found_refs -eq 0 ]]; then
    print_success "No problematic DATABASE_URL references found"
  else
    print_warning "Found $found_refs file(s) with DATABASE_URL references"
    print_info "Review these references to ensure they use separated variables"
  fi
}

# Main script logic
main() {
  local command="${1:-help}"
  
  case "$command" in
    --dry-run|dry-run)
      echo "🧪 DRY RUN MODE - No changes will be made"
      echo ""
      check_prerequisites
      list_current_secrets
      audit_legacy_secrets
      validate_required_secrets
      backup_legacy_secrets
      verify_separated_config
      test_ci_compatibility
      echo ""
      print_info "Dry run completed. Use --execute to perform actual cleanup."
      ;;
      
    --execute|execute)
      echo "🚀 EXECUTE MODE - Changes will be made"
      echo ""
      
      read -p "Are you sure you want to delete legacy DATABASE_URL secrets? (y/N): " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cleanup cancelled by user"
        exit 0
      fi
      
      check_prerequisites
      backup_legacy_secrets
      execute_cleanup
      validate_required_secrets
      verify_separated_config
      generate_report
      ;;
      
    --validate|validate)
      echo "🔍 VALIDATION MODE - Check current state"
      echo ""
      check_prerequisites
      list_current_secrets
      audit_legacy_secrets
      validate_required_secrets
      verify_separated_config
      test_ci_compatibility
      generate_report
      ;;
      
    --help|help|*)
      echo "GitHub Secrets Cleanup Script for Orderly Platform"
      echo ""
      echo "This script helps migrate from DATABASE_URL_* secrets to separated variables."
      echo ""
      echo "Usage:"
      echo "  $0 --dry-run     Review what would be changed (recommended first)"
      echo "  $0 --execute     Execute the cleanup (removes legacy secrets)"
      echo "  $0 --validate    Validate current configuration"
      echo "  $0 --help        Show this help message"
      echo ""
      echo "Legacy secrets to be removed:"
      for secret in "${LEGACY_SECRETS[@]}"; do
        echo "  - $secret"
      done
      echo ""
      echo "Required secrets (must exist):"
      for secret in "${REQUIRED_SECRETS[@]}"; do
        echo "  - $secret"
      done
      echo ""
      echo "Environment variables (should be in configs/):"
      echo "  - DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_NAME"
      echo ""
      echo "Examples:"
      echo "  $0 --dry-run      # Safe review of current state"
      echo "  $0 --validate     # Check configuration compatibility"
      echo "  $0 --execute      # Perform actual cleanup"
      ;;
  esac
}

# Run main function
main "$@"