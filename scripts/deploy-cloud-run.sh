#!/bin/bash

# Cloud Run Deployment Script for Orderly Platform
# Ultra-simplified single-region deployment (asia-east1)
# 符合 Claude.md 規範：保持簡單，解決真問題

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-orderly-platform}"
REGION="asia-east1"
ZONE="asia-east1-a"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Database Configuration
DB_INSTANCE_NAME="orderly-db"
DB_NAME="orderly"
DB_USER="orderly"
REDIS_INSTANCE_NAME="orderly-cache"

# Service Configuration
declare -A SERVICES=(
    ["api-gateway"]="8000"
    ["user-service"]="3001"
    ["order-service"]="3002"
    ["product-service"]="3003"
    ["acceptance-service"]="3004"
    ["notification-service"]="3006"
    ["customer-hierarchy-service"]="3007"
    ["supplier-service"]="3008"
)

# Map Cloud Run service names to local directories
resolve_service_path() {
  case "$1" in
    api-gateway) echo "$PROJECT_ROOT/backend/api-gateway-fastapi" ;;
    user-service) echo "$PROJECT_ROOT/backend/user-service-fastapi" ;;
    order-service) echo "$PROJECT_ROOT/backend/order-service-fastapi" ;;
    product-service) echo "$PROJECT_ROOT/backend/product-service-fastapi" ;;
    acceptance-service) echo "$PROJECT_ROOT/backend/acceptance-service-fastapi" ;;
    notification-service) echo "$PROJECT_ROOT/backend/notification-service-fastapi" ;;
    customer-hierarchy-service) echo "$PROJECT_ROOT/backend/customer-hierarchy-service-fastapi" ;;
    supplier-service) echo "$PROJECT_ROOT/backend/supplier-service-fastapi" ;;
    *) echo "" ;;
  esac
}

# Print functions
print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_header() { echo -e "${BLUE}==== $1 ====${NC}"; }

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check gcloud CLI
    if ! command -v gcloud &> /dev/null; then
        print_error "Google Cloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker not found. Please install Docker."
        exit 1
    fi
    
    # Check project ID
    if [[ -z "$PROJECT_ID" ]]; then
        print_error "PROJECT_ID not set. Use: export GOOGLE_CLOUD_PROJECT=your-project-id"
        exit 1
    fi
    
    # Verify gcloud auth
    if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" | head -1 > /dev/null; then
        print_error "No active gcloud authentication. Run: gcloud auth login"
        exit 1
    fi
    
    # Set project
    gcloud config set project "$PROJECT_ID"
    
    print_status "Prerequisites verified ✓"
}

# Enable required APIs
enable_apis() {
    print_header "Enabling Google Cloud APIs"
    
    local apis=(
        "run.googleapis.com"
        "cloudbuild.googleapis.com"
        "sql-component.googleapis.com"
        "sqladmin.googleapis.com"
        "redis.googleapis.com"
        "secretmanager.googleapis.com"
        "monitoring.googleapis.com"
        "logging.googleapis.com"
    )
    
    for api in "${apis[@]}"; do
        print_status "Enabling $api..."
        gcloud services enable "$api" --project="$PROJECT_ID"
    done
    
    print_status "APIs enabled ✓"
}

# Create Cloud SQL instance
create_database() {
    print_header "Setting up Cloud SQL Database"
    
    # Check if instance exists
    if gcloud sql instances describe "$DB_INSTANCE_NAME" --project="$PROJECT_ID" &>/dev/null; then
        print_status "Cloud SQL instance $DB_INSTANCE_NAME already exists"
    else
        print_status "Creating Cloud SQL instance..."
        gcloud sql instances create "$DB_INSTANCE_NAME" \
            --database-version=POSTGRES_15 \
            --tier=db-f1-micro \
            --region="$REGION" \
            --storage-type=SSD \
            --storage-size=10GB \
            --storage-auto-increase \
            --deletion-protection \
            --project="$PROJECT_ID"
    fi
    
    # Create database
    if ! gcloud sql databases describe "$DB_NAME" --instance="$DB_INSTANCE_NAME" --project="$PROJECT_ID" &>/dev/null; then
        print_status "Creating database $DB_NAME..."
        gcloud sql databases create "$DB_NAME" \
            --instance="$DB_INSTANCE_NAME" \
            --project="$PROJECT_ID"
    fi
    
    # Create user (if password provided)
    if [[ -n "$POSTGRES_PASSWORD" ]]; then
        print_status "Setting up database user..."
        gcloud sql users set-password "$DB_USER" \
            --instance="$DB_INSTANCE_NAME" \
            --password="$POSTGRES_PASSWORD" \
            --project="$PROJECT_ID" || \
        gcloud sql users create "$DB_USER" \
            --instance="$DB_INSTANCE_NAME" \
            --password="$POSTGRES_PASSWORD" \
            --project="$PROJECT_ID"
    else
        print_warning "POSTGRES_PASSWORD not set. Skipping user creation."
    fi
    
    print_status "Database setup complete ✓"
}

# Create Redis instance
create_redis() {
    print_header "Setting up Redis Memorystore"
    
    if gcloud redis instances describe "$REDIS_INSTANCE_NAME" --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
        print_status "Redis instance $REDIS_INSTANCE_NAME already exists"
    else
        print_status "Creating Redis instance..."
        gcloud redis instances create "$REDIS_INSTANCE_NAME" \
            --size=1 \
            --region="$REGION" \
            --redis-version=redis_7_0 \
            --project="$PROJECT_ID"
    fi
    
    print_status "Redis setup complete ✓"
}

# Store secrets in Secret Manager
create_secrets() {
    print_header "Setting up Secret Manager"
    
    local secrets=(
        "postgres-password:${POSTGRES_PASSWORD:-default_password_change_me}"
        "jwt-secret:${JWT_SECRET:-default_jwt_secret_change_me}"
        "jwt-refresh-secret:${JWT_REFRESH_SECRET:-default_refresh_secret_change_me}"
    )
    
    for secret_pair in "${secrets[@]}"; do
        local secret_name="${secret_pair%%:*}"
        local secret_value="${secret_pair##*:}"
        
        if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
            print_status "Secret $secret_name already exists"
        else
            print_status "Creating secret $secret_name..."
            echo -n "$secret_value" | gcloud secrets create "$secret_name" \
                --data-file=- \
                --project="$PROJECT_ID"
        fi
    done
    
    print_status "Secrets setup complete ✓"
}

# Build and push Docker images
build_and_push_images() {
    print_header "Building and Pushing Docker Images"
    
    for service_name in "${!SERVICES[@]}"; do
        local service_path
        service_path=$(resolve_service_path "$service_name")
        
        if [[ -z "$service_path" || ! -d "$service_path" ]]; then
            print_warning "Service directory $service_path not found, skipping..."
            continue
        fi
        
        if [[ ! -f "$service_path/Dockerfile.cloudrun" ]]; then
            print_warning "Dockerfile.cloudrun not found for $service_name, skipping..."
            continue
        fi
        
        print_status "Building $service_name..."
        
        # Build and push using Cloud Build
        gcloud builds submit "$service_path" \
            --tag="gcr.io/$PROJECT_ID/orderly-$service_name:latest" \
            --dockerfile="Dockerfile.cloudrun" \
            --project="$PROJECT_ID"
        
        print_status "✓ $service_name built and pushed"
    done
    
    print_status "All images built and pushed ✓"
}

# Deploy services to Cloud Run
deploy_services() {
    print_header "Deploying Services to Cloud Run"
    
    # Get database connection name
    local db_connection_name
    db_connection_name=$(gcloud sql instances describe "$DB_INSTANCE_NAME" \
        --format="value(connectionName)" --project="$PROJECT_ID")
    
    # Get Redis IP
    local redis_host
    redis_host=$(gcloud redis instances describe "$REDIS_INSTANCE_NAME" \
        --region="$REGION" --format="value(host)" --project="$PROJECT_ID")
    
    for service_name in "${!SERVICES[@]}"; do
        local service_port="${SERVICES[$service_name]}"
        
        print_status "Deploying $service_name..."
        
        # Deploy to Cloud Run
        gcloud run deploy "orderly-$service_name" \
            --image="gcr.io/$PROJECT_ID/orderly-$service_name:latest" \
            --platform=managed \
            --region="$REGION" \
            --allow-unauthenticated \
            --port="$service_port" \
            --memory=512Mi \
            --cpu=1 \
            --min-instances=0 \
            --max-instances=10 \
            --concurrency=100 \
            --timeout=300 \
            --set-env-vars="ENVIRONMENT=production,PORT=$service_port" \
            --set-env-vars="REDIS_URL=redis://$redis_host:6379" \
            --set-env-vars="DATABASE_URL=postgresql+asyncpg://$DB_USER:$POSTGRES_PASSWORD@/$DB_NAME?host=/cloudsql/$db_connection_name" \
            --set-secrets="POSTGRES_PASSWORD=postgres-password:latest" \
            --set-secrets="JWT_SECRET_KEY=jwt-secret:latest" \
            --set-secrets="JWT_REFRESH_SECRET=jwt-refresh-secret:latest" \
            --add-cloudsql-instances="$db_connection_name" \
            --project="$PROJECT_ID"
        
        print_status "✓ $service_name deployed"
    done
    
    print_status "All services deployed ✓"
}

# Configure service-to-service communication
configure_service_mesh() {
    print_header "Configuring Service Communication"
    
    # Get service URLs
    declare -A service_urls
    for service_name in "${!SERVICES[@]}"; do
        local service_url
        service_url=$(gcloud run services describe "orderly-$service_name" \
            --region="$REGION" --format="value(status.url)" --project="$PROJECT_ID")
        service_urls["$service_name"]="$service_url"
        
        print_status "$service_name: $service_url"
    done
    
    # Update API Gateway with service URLs
    if [[ -n "${service_urls[api-gateway]}" ]]; then
        print_status "Updating API Gateway configuration..."
        
        local env_vars="ENVIRONMENT=production,GATEWAY_ENFORCE_ROLES=true"
        env_vars+=",USER_SERVICE_URL=${service_urls[user-service]}"
        env_vars+=",ORDER_SERVICE_URL=${service_urls[order-service]}"
        env_vars+=",PRODUCT_SERVICE_URL=${service_urls[product-service]}"
        env_vars+=",ACCEPTANCE_SERVICE_URL=${service_urls[acceptance-service]}"
        env_vars+=",BILLING_SERVICE_URL=${service_urls[billing-service]}"
        env_vars+=",NOTIFICATION_SERVICE_URL=${service_urls[notification-service]}"
        env_vars+=",CUSTOMER_HIERARCHY_SERVICE_URL=${service_urls[customer-hierarchy-service]}/api/v2"
        
        gcloud run services update "orderly-api-gateway" \
            --region="$REGION" \
            --set-env-vars="$env_vars" \
            --project="$PROJECT_ID"
    fi
    
    print_status "Service communication configured ✓"
}

# Setup monitoring and logging
setup_monitoring() {
    print_header "Setting up Monitoring and Logging"
    
    # Create log-based metrics
    print_status "Creating log-based metrics..."
    
    # Error rate metric
    gcloud logging metrics create "orderly_error_rate" \
        --description="Error rate across all services" \
        --log-filter='resource.type="cloud_run_revision" AND severity>=ERROR' \
        --project="$PROJECT_ID" || print_warning "Error rate metric may already exist"
    
    # Request latency metric
    gcloud logging metrics create "orderly_request_latency" \
        --description="Request latency across all services" \
        --log-filter='resource.type="cloud_run_revision" AND httpRequest.latency' \
        --project="$PROJECT_ID" || print_warning "Latency metric may already exist"
    
    print_status "Monitoring setup complete ✓"
}

# Health check all services
health_check() {
    print_header "Performing Health Check"
    
    for service_name in "${!SERVICES[@]}"; do
        local service_url
        service_url=$(gcloud run services describe "orderly-$service_name" \
            --region="$REGION" --format="value(status.url)" --project="$PROJECT_ID" 2>/dev/null)
        
        if [[ -n "$service_url" ]]; then
            print_status "Checking $service_name..."
            if curl -sf "$service_url/health" &>/dev/null; then
                print_status "✓ $service_name - Healthy"
            else
                print_warning "✗ $service_name - Unhealthy"
            fi
        else
            print_warning "✗ $service_name - Not found"
        fi
    done
}

# Display deployment summary
show_summary() {
    print_header "Deployment Summary"
    
    echo "Project ID: $PROJECT_ID"
    echo "Region: $REGION"
    echo "Database: $DB_INSTANCE_NAME"
    echo "Redis: $REDIS_INSTANCE_NAME"
    echo ""
    echo "Service URLs:"
    
    for service_name in "${!SERVICES[@]}"; do
        local service_url
        service_url=$(gcloud run services describe "orderly-$service_name" \
            --region="$REGION" --format="value(status.url)" --project="$PROJECT_ID" 2>/dev/null)
        
        if [[ -n "$service_url" ]]; then
            echo "  $service_name: $service_url"
        fi
    done
    
    echo ""
    print_status "Deployment completed successfully! 🚀"
    print_status "API Gateway URL: ${service_urls[api-gateway]}"
    print_status "Monitor at: https://console.cloud.google.com/run?project=$PROJECT_ID"
}

# Show usage
show_usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  full              Complete deployment (default)"
    echo "  infra             Setup infrastructure only (DB, Redis, Secrets)"
    echo "  deploy            Build and deploy services only"
    echo "  update [service]  Update specific service or all services"
    echo "  health            Perform health check"
    echo "  urls              Show service URLs"
    echo "  logs [service]    Show logs for service"
    echo "  cleanup           Delete all resources"
    echo ""
    echo "Environment Variables:"
    echo "  GOOGLE_CLOUD_PROJECT  Google Cloud project ID (required)"
    echo "  POSTGRES_PASSWORD     Database password (recommended)"
    echo "  JWT_SECRET           JWT signing secret (recommended)"
    echo ""
    echo "Examples:"
    echo "  export GOOGLE_CLOUD_PROJECT=my-project"
    echo "  export POSTGRES_PASSWORD=secure_password"
    echo "  $0 full"
    echo "  $0 update api-gateway"
    echo "  $0 logs order-service"
}

# Update single service
update_service() {
    local service_name=$1
    
    if [[ -z "$service_name" ]]; then
        print_status "Updating all services..."
        build_and_push_images
        deploy_services
        configure_service_mesh
    else
        if [[ -z "${SERVICES[$service_name]}" ]]; then
            print_error "Unknown service: $service_name"
            exit 1
        fi
        
        print_status "Updating $service_name..."
        
        local service_path
        service_path=$(resolve_service_path "$service_name")
        
        # Build and push
        gcloud builds submit "$service_path" \
            --tag="gcr.io/$PROJECT_ID/orderly-$service_name:latest" \
            --dockerfile="Dockerfile.cloudrun" \
            --project="$PROJECT_ID"
        
        # Deploy
        gcloud run deploy "orderly-$service_name" \
            --image="gcr.io/$PROJECT_ID/orderly-$service_name:latest" \
            --platform=managed \
            --region="$REGION" \
            --project="$PROJECT_ID"
        
        print_status "$service_name updated successfully ✓"
    fi
}

# Show logs
show_logs() {
    local service_name=$1
    
    if [[ -z "$service_name" ]]; then
        print_error "Service name required"
        exit 1
    fi
    
    if [[ -z "${SERVICES[$service_name]}" ]]; then
        print_error "Unknown service: $service_name"
        exit 1
    fi
    
    gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=orderly-$service_name" \
        --limit=100 \
        --format="table(timestamp,severity,textPayload)" \
        --project="$PROJECT_ID"
}

# Cleanup resources
cleanup() {
    print_header "Cleaning up resources"
    print_warning "This will delete ALL Orderly resources!"
    
    read -p "Are you sure? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        print_status "Cleanup cancelled"
        return
    fi
    
    # Delete Cloud Run services
    for service_name in "${!SERVICES[@]}"; do
        print_status "Deleting orderly-$service_name..."
        gcloud run services delete "orderly-$service_name" \
            --region="$REGION" \
            --quiet \
            --project="$PROJECT_ID" || true
    done
    
    # Delete Cloud SQL instance
    print_status "Deleting Cloud SQL instance..."
    gcloud sql instances delete "$DB_INSTANCE_NAME" \
        --quiet \
        --project="$PROJECT_ID" || true
    
    # Delete Redis instance
    print_status "Deleting Redis instance..."
    gcloud redis instances delete "$REDIS_INSTANCE_NAME" \
        --region="$REGION" \
        --quiet \
        --project="$PROJECT_ID" || true
    
    print_status "Cleanup completed"
}

# Main execution
main() {
    local command=${1:-full}
    
    case $command in
        "full")
            check_prerequisites
            enable_apis
            create_database
            create_redis
            create_secrets
            build_and_push_images
            deploy_services
            configure_service_mesh
            setup_monitoring
            health_check
            show_summary
            ;;
        "infra")
            check_prerequisites
            enable_apis
            create_database
            create_redis
            create_secrets
            print_status "Infrastructure setup complete ✓"
            ;;
        "deploy")
            check_prerequisites
            build_and_push_images
            deploy_services
            configure_service_mesh
            ;;
        "update")
            check_prerequisites
            update_service "$2"
            ;;
        "health")
            health_check
            ;;
        "urls")
            for service_name in "${!SERVICES[@]}"; do
                local service_url
                service_url=$(gcloud run services describe "orderly-$service_name" \
                    --region="$REGION" --format="value(status.url)" --project="$PROJECT_ID" 2>/dev/null)
                echo "$service_name: $service_url"
            done
            ;;
        "logs")
            show_logs "$2"
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            show_usage
            ;;
    esac
}

# Execute main function
main "$@"
