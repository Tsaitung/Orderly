#!/bin/bash
# Staging 永久化部署腳本 v1.0
# 將所有服務配置、環境變數、Cloud SQL 連線永久化到版本控制

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
PROJECT_ID="orderly-472413"
REGION="asia-east1"
CLOUD_SQL_INSTANCE="orderly-472413:asia-east1:orderly-db-v2"
CONFIG_DIR="infra/staging"

# Check prerequisites
if [ ! -d "$CONFIG_DIR" ]; then
    log_error "Configuration directory $CONFIG_DIR not found"
    exit 1
fi

if ! gcloud auth list --format="value(account)" --filter="status:ACTIVE" | grep -q .; then
    log_error "No active gcloud authentication found"
    log_info "Available authentication methods:"
    gcloud auth list
    exit 1
fi

# Verify we can access the project
if ! gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
    log_error "Cannot access project $PROJECT_ID. Check authentication and permissions."
    exit 1
fi

log_info "✅ Authentication verified for project $PROJECT_ID"

log_section "🚀 Starting permanent staging deployment..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Cloud SQL: $CLOUD_SQL_INSTANCE"
echo ""

# Phase 1: Deploy all services with permanent configuration
log_section "📋 Phase 1: Deploying services with permanent configuration"

SERVICES=(api-gateway user order product customer-hierarchy supplier acceptance notification)
DEPLOYED_SERVICES=()
FAILED_SERVICES=()

for SERVICE in "${SERVICES[@]}"; do
    CONFIG_FILE="$CONFIG_DIR/${SERVICE}.yaml"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        log_warning "⚠️ Configuration file $CONFIG_FILE not found, skipping"
        continue
    fi
    
    log_info "Deploying $SERVICE from $CONFIG_FILE..."
    
    if gcloud run services replace "$CONFIG_FILE" --region="$REGION" --quiet; then
        log_info "✅ $SERVICE deployed successfully"
        DEPLOYED_SERVICES+=("$SERVICE")
    else
        log_error "❌ Failed to deploy $SERVICE"
        FAILED_SERVICES+=("$SERVICE")
    fi
done

echo ""
log_section "📊 Phase 1 Results:"
echo "✅ Successfully deployed: ${DEPLOYED_SERVICES[*]}"
if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    echo "❌ Failed deployments: ${FAILED_SERVICES[*]}"
fi

# Phase 2: Database migrations notice
log_section "🗄️ Phase 2: Database Migrations"

log_info "Database migrations should be run separately using Cloud Build or Cloud Run Jobs"
log_info "To run migrations manually, use:"
echo "  gcloud builds submit --config=scripts/cloudbuild/migration-job.yaml \\"
echo "    --substitutions=_INSTANCE='orderly-472413:asia-east1:orderly-db-v2' \\"
echo "    --project=orderly-472413"

# Phase 3: Verify data integrity
log_section "🔍 Phase 3: Verifying data integrity"

if [ -f "scripts/database/data-integrity-check.sh" ]; then
    log_info "Running data integrity checks..."
    ./scripts/database/data-integrity-check.sh
else
    log_warning "⚠️ Data integrity script not found: scripts/database/data-integrity-check.sh"
fi

# Phase 4: Health checks
log_section "🏥 Phase 4: Running health checks"

if [ -f "scripts/health-check-all.sh" ]; then
    if ./scripts/health-check-all.sh; then
        log_info "✅ All health checks passed"
    else
        log_warning "⚠️ Some health checks failed"
    fi
else
    log_warning "⚠️ Health check script not found: scripts/health-check-all.sh"
fi

# Summary
echo ""
log_section "📊 Deployment Summary"
echo "========================================"
echo "Total services processed: ${#SERVICES[@]}"
echo "Successfully deployed: ${#DEPLOYED_SERVICES[@]}"
echo "Failed deployments: ${#FAILED_SERVICES[@]}"
echo ""

if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
    log_info "🎉 Permanent staging deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Run API tests: curl https://orderly-api-gateway-fastapi-staging-*.run.app/ready"
    echo "2. Check frontend: https://orderly-frontend-staging-*.run.app"
    echo "3. Monitor logs: gcloud logging read 'resource.type=\"cloud_run_revision\"' --limit=50"
else
    log_warning "⚠️ Deployment completed with issues. Check failed services:"
    for service in "${FAILED_SERVICES[@]}"; do
        echo "  - $service"
    done
fi

echo ""
log_info "📋 Full deployment report saved to /tmp/staging-deployment-report-$(date +%Y%m%d-%H%M%S).txt"

# Save detailed report
REPORT_FILE="/tmp/staging-deployment-report-$(date +%Y%m%d-%H%M%S).txt"
{
    echo "Staging Permanent Deployment Report"
    echo "Generated: $(date)"
    echo "Project: $PROJECT_ID"
    echo "Region: $REGION"
    echo ""
    echo "Deployed Services (${#DEPLOYED_SERVICES[@]}):"
    for service in "${DEPLOYED_SERVICES[@]}"; do
        echo "  ✅ $service"
    done
    echo ""
    if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
        echo "Failed Services (${#FAILED_SERVICES[@]}):"
        for service in "${FAILED_SERVICES[@]}"; do
            echo "  ❌ $service"
        done
        echo ""
    fi
    echo "Configuration files used:"
    ls -la "$CONFIG_DIR"/*.yaml
} > "$REPORT_FILE"

log_info "🎯 Permanent staging deployment process completed!"