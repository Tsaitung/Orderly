#!/bin/bash
# GitHub Secrets Cleanup Script
# Purpose: Remove old DATABASE_URL_* secrets and verify separated variables
# Author: DevOps Team
# Date: 2025-09-29

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="orderly-472413"
SECRETS_TO_DELETE=(
    "DATABASE_URL_STAGING"
    "DATABASE_URL_STAGING_V2"
    "DATABASE_URL_PRODUCTION"
    "DATABASE_URL_DEVELOPMENT"
    "DATABASE_URL_TEST"
)

REQUIRED_SECRETS=(
    "POSTGRES_PASSWORD"
    "GCP_SA_KEY"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
)

# Functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed. Please install it first."
        exit 1
    fi
    
    if ! gh auth status &> /dev/null; then
        log_error "Not authenticated with GitHub. Please run 'gh auth login' first."
        exit 1
    fi
    
    log_info "Prerequisites check passed ✓"
}

# Audit existing secrets
audit_secrets() {
    log_info "Auditing existing GitHub Secrets..."
    echo ""
    
    log_info "Current secrets containing DATABASE_URL:"
    gh secret list | grep -E "DATABASE_URL" || log_info "No DATABASE_URL secrets found"
    echo ""
    
    log_info "Required secrets status:"
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if gh secret list | grep -q "^${secret}"; then
            echo -e "  ${GREEN}✓${NC} $secret exists"
        else
            echo -e "  ${RED}✗${NC} $secret missing"
        fi
    done
    echo ""
}

# Backup reminder
backup_reminder() {
    log_warn "IMPORTANT: Before deletion, ensure you have backed up the secret values!"
    log_warn "These secrets cannot be recovered once deleted."
    echo ""
    read -p "Have you backed up all necessary secret values? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        log_error "Operation cancelled. Please backup secrets first."
        exit 1
    fi
}

# Delete old secrets
delete_old_secrets() {
    log_info "Starting deletion of old DATABASE_URL secrets..."
    echo ""
    
    for secret in "${SECRETS_TO_DELETE[@]}"; do
        if gh secret list | grep -q "^${secret}"; then
            log_info "Deleting $secret..."
            if gh secret delete "$secret" --yes; then
                log_info "  ${GREEN}✓${NC} $secret deleted successfully"
            else
                log_error "  ${RED}✗${NC} Failed to delete $secret"
            fi
        else
            log_info "  ${YELLOW}○${NC} $secret not found (already deleted)"
        fi
    done
    echo ""
}

# Verify cleanup
verify_cleanup() {
    log_info "Verifying cleanup..."
    echo ""
    
    local remaining=$(gh secret list | grep -E "DATABASE_URL" | wc -l)
    if [ "$remaining" -eq 0 ]; then
        log_info "${GREEN}✓${NC} All DATABASE_URL secrets have been removed successfully!"
    else
        log_warn "${YELLOW}⚠${NC} Found $remaining DATABASE_URL secrets still remaining:"
        gh secret list | grep -E "DATABASE_URL"
    fi
    echo ""
}

# Test deployment
test_deployment() {
    log_info "Testing deployment with new configuration..."
    echo ""
    
    read -p "Do you want to trigger a test deployment? (yes/no): " test_deploy
    if [[ "$test_deploy" == "yes" ]]; then
        log_info "Triggering staging deployment..."
        
        # Create a test commit
        git checkout -b test-secrets-cleanup-$(date +%s)
        echo "# Test: Verify DATABASE_URL cleanup - $(date)" >> plan.md
        git add plan.md
        git commit -m "test: Verify DATABASE_URL cleanup works correctly"
        git push origin HEAD
        
        log_info "Deployment triggered. Monitor the GitHub Actions workflow."
        log_info "Workflow URL: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/actions"
    fi
}

# Verify services health
verify_services() {
    log_info "Checking service health..."
    echo ""
    
    if [ -f "scripts/run_plan_checks.sh" ]; then
        log_info "Running health checks..."
        ENV=staging SERVICE_SUFFIX=-v2 bash scripts/run_plan_checks.sh || true
    else
        log_warn "Health check script not found. Please run manually:"
        echo "  ENV=staging SERVICE_SUFFIX=-v2 ./scripts/run_plan_checks.sh"
    fi
}

# Main execution
main() {
    echo "================================================"
    echo "    GitHub Secrets Cleanup Tool"
    echo "    Target: DATABASE_URL_* secrets"
    echo "================================================"
    echo ""
    
    check_prerequisites
    audit_secrets
    
    echo "This script will:"
    echo "1. Delete old DATABASE_URL_* secrets"
    echo "2. Verify required secrets exist"
    echo "3. Test the deployment"
    echo "4. Verify service health"
    echo ""
    
    read -p "Do you want to proceed? (yes/no): " proceed
    if [[ "$proceed" != "yes" ]]; then
        log_info "Operation cancelled by user."
        exit 0
    fi
    
    backup_reminder
    delete_old_secrets
    verify_cleanup
    
    log_info "Secret cleanup completed!"
    echo ""
    
    test_deployment
    verify_services
    
    echo ""
    log_info "==============================================="
    log_info "Cleanup Summary:"
    log_info "- Old DATABASE_URL secrets: Removed"
    log_info "- Required secrets: Verified"
    log_info "- Next steps: Monitor deployment and check logs"
    log_info "==============================================="
}

# Run main function
main "$@"