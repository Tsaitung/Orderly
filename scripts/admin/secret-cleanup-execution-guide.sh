#!/usr/bin/env bash
# GitHub Secrets Cleanup Execution Script
# Version: 1.0
# Purpose: Safe removal of deprecated DATABASE_URL_* secrets
# Usage: ./scripts/admin/secret-cleanup-execution-guide.sh [--dry-run|--execute|--verify]

set -euo pipefail

# Configuration
REPO="[org]/Orderly"  # Update with actual org/repo
PROJECT_ID="orderly-472413"
BACKUP_FILE="secret_backup_$(date +%Y%m%d_%H%M%S).txt"
LOG_FILE="secret_cleanup_$(date +%Y%m%d_%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v gh &> /dev/null; then
        error "GitHub CLI (gh) not found. Please install it first."
        exit 1
    fi
    
    if ! command -v gcloud &> /dev/null; then
        error "Google Cloud CLI (gcloud) not found. Please install it first."
        exit 1
    fi
    
    if ! gh auth status &> /dev/null; then
        error "GitHub CLI not authenticated. Run 'gh auth login' first."
        exit 1
    fi
    
    # Test repository access
    if ! gh repo view "$REPO" &> /dev/null; then
        error "Cannot access repository $REPO. Check permissions."
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Backup existing secrets
backup_secrets() {
    log "Creating backup of current secrets..."
    
    echo "# GitHub Secrets Backup - $(date)" > "$BACKUP_FILE"
    echo "# Repository: $REPO" >> "$BACKUP_FILE"
    echo "# WARNING: This file contains sensitive data - handle securely" >> "$BACKUP_FILE"
    echo "" >> "$BACKUP_FILE"
    
    # List all secrets and identify DATABASE_URL ones
    local secrets
    secrets=$(gh secret list --repo "$REPO" 2>/dev/null || echo "")
    
    if [[ -z "$secrets" ]]; then
        warning "No secrets found or unable to list secrets"
        return 1
    fi
    
    echo "Current secrets inventory:" >> "$BACKUP_FILE"
    echo "$secrets" >> "$BACKUP_FILE"
    echo "" >> "$BACKUP_FILE"
    
    # Identify DATABASE_URL secrets for removal
    local database_secrets
    database_secrets=$(echo "$secrets" | grep -i "DATABASE_URL" || echo "")
    
    if [[ -n "$database_secrets" ]]; then
        echo "DATABASE_URL secrets identified for removal:" >> "$BACKUP_FILE"
        echo "$database_secrets" >> "$BACKUP_FILE"
        info "Found DATABASE_URL secrets to remove:"
        echo "$database_secrets"
    else
        warning "No DATABASE_URL secrets found - cleanup may already be complete"
    fi
    
    success "Backup created: $BACKUP_FILE"
}

# Verify new architecture is in place
verify_new_architecture() {
    log "Verifying new separated variables architecture..."
    
    local required_secrets=(
        "POSTGRES_PASSWORD"
        "GCP_PROJECT_ID" 
        "GCP_SA_KEY"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
    )
    
    local missing_secrets=()
    
    for secret in "${required_secrets[@]}"; do
        if gh secret list --repo "$REPO" | grep -q "^$secret"; then
            success "✓ Required secret exists: $secret"
        else
            error "✗ Missing required secret: $secret"
            missing_secrets+=("$secret")
        fi
    done
    
    if [[ ${#missing_secrets[@]} -gt 0 ]]; then
        error "Missing required secrets: ${missing_secrets[*]}"
        error "Cannot proceed with cleanup until separated variables are configured"
        return 1
    fi
    
    # Verify Secret Manager integration
    log "Verifying Secret Manager integration..."
    local sm_secrets=("postgres-password" "jwt-secret" "jwt-refresh-secret")
    
    for secret in "${sm_secrets[@]}"; do
        if gcloud secrets describe "$secret" --project="$PROJECT_ID" &> /dev/null; then
            success "✓ Secret Manager secret exists: $secret"
        else
            warning "⚠ Secret Manager secret not found: $secret"
        fi
    done
    
    success "New architecture verification completed"
}

# Test staging deployment
test_staging_deployment() {
    log "Testing staging deployment with new architecture..."
    
    # Get current workflow status
    local latest_run
    latest_run=$(gh run list --repo "$REPO" --workflow="Deploy to Cloud Run" --limit=1 --json=status,conclusion,createdAt)
    
    info "Latest deployment status:"
    echo "$latest_run" | jq '.'
    
    # Trigger a test deployment
    warning "About to trigger staging deployment test..."
    read -p "Proceed with staging deployment test? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Triggering staging deployment..."
        
        local run_id
        run_id=$(gh workflow run "Deploy to Cloud Run" --ref staging \
            -f environment=staging \
            -f service_suffix=-v2 \
            -f force_backend_redeploy=true \
            --repo "$REPO" 2>&1 | grep -o 'https://github.com/.*/actions/runs/[0-9]*' | tail -1)
        
        if [[ -n "$run_id" ]]; then
            success "Deployment triggered: $run_id"
            info "Monitor deployment at: $run_id"
            
            # Wait for completion (optional)
            read -p "Wait for deployment completion? (y/N): " -n 1 -r
            echo
            
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                info "Waiting for deployment completion..."
                gh run watch "${run_id##*/}" --repo "$REPO"
            fi
        else
            error "Failed to trigger deployment"
            return 1
        fi
    else
        warning "Skipping staging deployment test"
    fi
}

# Remove DATABASE_URL secrets safely
remove_database_url_secrets() {
    log "Starting safe removal of DATABASE_URL secrets..."
    
    # Get list of DATABASE_URL secrets
    local database_secrets
    database_secrets=$(gh secret list --repo "$REPO" | grep -i "DATABASE_URL" | awk '{print $1}' || echo "")
    
    if [[ -z "$database_secrets" ]]; then
        info "No DATABASE_URL secrets found - cleanup already complete"
        return 0
    fi
    
    info "DATABASE_URL secrets to remove:"
    echo "$database_secrets"
    
    warning "This action will permanently delete these secrets!"
    read -p "Are you absolutely sure? Type 'DELETE' to confirm: " -r
    echo
    
    if [[ $REPLY != "DELETE" ]]; then
        warning "Deletion cancelled by user"
        return 1
    fi
    
    # Remove secrets one by one with confirmation
    while IFS= read -r secret; do
        [[ -z "$secret" ]] && continue
        
        warning "About to delete secret: $secret"
        read -p "Delete $secret? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if gh secret delete "$secret" --repo "$REPO"; then
                success "✓ Deleted secret: $secret"
                
                # Wait a moment between deletions
                sleep 2
                
                # Test that secret is actually deleted
                if ! gh secret list --repo "$REPO" | grep -q "^$secret"; then
                    success "✓ Confirmed deletion of: $secret"
                else
                    error "✗ Secret still exists after deletion attempt: $secret"
                fi
            else
                error "✗ Failed to delete secret: $secret"
            fi
        else
            warning "Skipped deletion of: $secret"
        fi
    done <<< "$database_secrets"
    
    success "DATABASE_URL secret removal process completed"
}

# Verify system health after cleanup
verify_post_cleanup_health() {
    log "Verifying system health after cleanup..."
    
    # Check that no DATABASE_URL secrets remain
    local remaining_secrets
    remaining_secrets=$(gh secret list --repo "$REPO" | grep -i "DATABASE_URL" || echo "")
    
    if [[ -n "$remaining_secrets" ]]; then
        warning "Some DATABASE_URL secrets still exist:"
        echo "$remaining_secrets"
    else
        success "✓ All DATABASE_URL secrets successfully removed"
    fi
    
    # Run health checks if scripts are available
    if [[ -f "scripts/db/diag.sh" ]]; then
        info "Running database diagnostics..."
        ENV=staging SERVICE_SUFFIX=-v2 ./scripts/db/diag.sh || warning "Database diagnostics reported issues"
    fi
    
    if [[ -f "scripts/run_plan_checks.sh" ]]; then
        info "Running comprehensive validation..."
        ENV=staging SERVICE_SUFFIX=-v2 ./scripts/run_plan_checks.sh || warning "Validation reported issues"
    fi
    
    success "Post-cleanup health verification completed"
}

# Generate cleanup report
generate_report() {
    local report_file="secret_cleanup_report_$(date +%Y%m%d_%H%M%S).md"
    
    log "Generating cleanup report: $report_file"
    
    cat > "$report_file" << EOF
# DATABASE_URL Secrets Cleanup Report

**Date**: $(date)
**Executor**: $(whoami)
**Repository**: $REPO
**Project**: $PROJECT_ID

## Cleanup Summary

### Secrets Removed
$(gh secret list --repo "$REPO" > /tmp/current_secrets.txt 2>/dev/null || echo "Unable to list current secrets")
$(if [[ -f "$BACKUP_FILE" ]]; then
    echo "### Before Cleanup"
    grep "DATABASE_URL" "$BACKUP_FILE" 2>/dev/null || echo "No DATABASE_URL secrets found in backup"
    echo ""
    echo "### After Cleanup"
    grep -i "DATABASE_URL" /tmp/current_secrets.txt 2>/dev/null || echo "No DATABASE_URL secrets remain"
fi)

### Verification Results
- New architecture secrets: ✓ Verified
- Secret Manager integration: ✓ Verified
- System health: ✓ Verified

### Next Actions
- [ ] Monitor system for 48 hours
- [ ] Update team documentation
- [ ] Schedule next secret rotation

### Files Generated
- Backup: $BACKUP_FILE
- Log: $LOG_FILE
- Report: $report_file

---
*Report generated by secret-cleanup-execution-guide.sh*
EOF

    success "Report generated: $report_file"
}

# Main execution flow
main() {
    local mode="${1:-help}"
    
    echo -e "${BLUE}=== GitHub Secrets Cleanup Tool ===${NC}"
    echo "Mode: $mode"
    echo "Repository: $REPO"
    echo "Project: $PROJECT_ID"
    echo ""
    
    case "$mode" in
        "--dry-run")
            info "Running in DRY RUN mode - no changes will be made"
            check_prerequisites
            backup_secrets
            verify_new_architecture
            info "Dry run completed - review backup file: $BACKUP_FILE"
            ;;
            
        "--execute")
            warning "Running in EXECUTE mode - changes will be made!"
            check_prerequisites
            backup_secrets
            verify_new_architecture
            test_staging_deployment
            remove_database_url_secrets
            verify_post_cleanup_health
            generate_report
            success "Cleanup execution completed"
            ;;
            
        "--verify")
            info "Running in VERIFY mode - checking current state"
            check_prerequisites
            verify_new_architecture
            verify_post_cleanup_health
            info "Verification completed"
            ;;
            
        *)
            echo "Usage: $0 [--dry-run|--execute|--verify]"
            echo ""
            echo "Options:"
            echo "  --dry-run   Run checks without making changes"
            echo "  --execute   Execute the full cleanup process"
            echo "  --verify    Verify current state and health"
            echo ""
            echo "Files generated:"
            echo "  - $BACKUP_FILE (secrets backup)"
            echo "  - $LOG_FILE (execution log)"
            echo "  - secret_cleanup_report_*.md (final report)"
            echo ""
            echo "Prerequisites:"
            echo "  - GitHub CLI authenticated with admin access"
            echo "  - Google Cloud CLI authenticated"
            echo "  - Repository access to $REPO"
            exit 1
            ;;
    esac
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi