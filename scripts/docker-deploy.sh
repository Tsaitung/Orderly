#!/bin/bash

# Docker Deployment Script for Orderly Platform
# Usage: ./scripts/docker-deploy.sh [dev|prod] [service_name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY="${DOCKER_REGISTRY:-gcr.io/orderly-platform}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    print_status "Prerequisites check passed ✓"
}

# Build single service
build_service() {
    local service_name=$1
    local service_path="${PROJECT_ROOT}/backend/${service_name}"
    
    if [[ ! -d "${service_path}" ]]; then
        print_error "Service directory ${service_path} does not exist"
        return 1
    fi
    
    if [[ ! -f "${service_path}/Dockerfile" ]]; then
        print_error "Dockerfile not found in ${service_path}"
        return 1
    fi
    
    print_status "Building ${service_name}..."
    
    cd "${service_path}"
    
    # Build the Docker image
    docker build \
        --build-arg NODE_ENV=production \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --tag "orderly-${service_name}:latest" \
        --tag "orderly-${service_name}:$(git rev-parse --short HEAD || echo 'dev')" \
        --tag "${DOCKER_REGISTRY}/orderly-${service_name}:latest" \
        --tag "${DOCKER_REGISTRY}/orderly-${service_name}:$(git rev-parse --short HEAD || echo 'dev')" \
        .
    
    print_status "Successfully built ${service_name} ✓"
}

# Build all services
build_all_services() {
    print_status "Building all services..."
    
    local services=(
        "api-gateway"
        "user-service"
        "order-service"
        "product-service"
        "acceptance-service"
        "billing-service"
        "notification-service"
        "admin-service"
    )
    
    local failed_builds=()
    
    for service in "${services[@]}"; do
        if build_service "${service}"; then
            print_status "✓ ${service}"
        else
            print_error "✗ ${service}"
            failed_builds+=("${service}")
        fi
    done
    
    if [[ ${#failed_builds[@]} -gt 0 ]]; then
        print_error "Failed to build the following services:"
        printf '%s\n' "${failed_builds[@]}"
        exit 1
    fi
    
    print_status "All services built successfully ✓"
}

# Deploy development environment
deploy_dev() {
    print_status "Deploying development environment..."
    
    cd "${PROJECT_ROOT}"
    
    # Use development docker-compose file
    export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-orderly_dev_password}"
    
    # Stop any running containers
    docker-compose -f docker-compose.dev.yml down --remove-orphans
    
    # Pull latest images for external services
    docker-compose -f docker-compose.dev.yml pull postgres redis
    
    # Start services
    docker-compose -f docker-compose.dev.yml up -d --build
    
    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if docker-compose -f docker-compose.dev.yml ps | grep -q "unhealthy"; then
            print_warning "Some services are still starting... (attempt $((attempt + 1))/$max_attempts)"
            sleep 10
            ((attempt++))
        else
            break
        fi
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        print_error "Services did not become healthy within expected time"
        docker-compose -f docker-compose.dev.yml ps
        exit 1
    fi
    
    print_status "Development environment deployed successfully ✓"
    docker-compose -f docker-compose.dev.yml ps
}

# Deploy production environment
deploy_prod() {
    print_status "Deploying production environment..."
    
    # Check required environment variables
    if [[ -z "${POSTGRES_PASSWORD}" ]]; then
        print_error "POSTGRES_PASSWORD environment variable is required for production"
        exit 1
    fi
    
    cd "${PROJECT_ROOT}"
    
    # Use production docker-compose file
    docker-compose -f docker-compose.production.yml down --remove-orphans
    docker-compose -f docker-compose.production.yml up -d --build
    
    print_status "Production environment deployed successfully ✓"
    docker-compose -f docker-compose.production.yml ps
}

# Push images to registry
push_images() {
    print_status "Pushing images to registry..."
    
    local services=(
        "api-gateway"
        "user-service"
        "order-service"
        "product-service"
        "acceptance-service"
        "billing-service"
        "notification-service"
        "admin-service"
    )
    
    for service in "${services[@]}"; do
        print_status "Pushing ${service}..."
        docker push "${DOCKER_REGISTRY}/orderly-${service}:latest"
        
        # Push tagged version if available
        local git_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "")
        if [[ -n "${git_hash}" ]]; then
            docker push "${DOCKER_REGISTRY}/orderly-${service}:${git_hash}"
        fi
    done
    
    print_status "All images pushed successfully ✓"
}

# Show logs for a service
show_logs() {
    local service_name=$1
    local env=${2:-dev}
    local compose_file="docker-compose.${env}.yml"
    
    if [[ ! -f "${PROJECT_ROOT}/${compose_file}" ]]; then
        print_error "Compose file ${compose_file} not found"
        exit 1
    fi
    
    cd "${PROJECT_ROOT}"
    docker-compose -f "${compose_file}" logs -f "${service_name}"
}

# Health check
health_check() {
    local env=${1:-dev}
    local compose_file="docker-compose.${env}.yml"
    
    print_status "Performing health check..."
    
    cd "${PROJECT_ROOT}"
    
    # Check container status
    docker-compose -f "${compose_file}" ps
    
    # Test API endpoints
    local services=(
        "api-gateway:8000"
        "user-service:8001"
        "order-service:8002"
        "product-service:8003"
        "acceptance-service:8004"
        "billing-service:8005"
        "notification-service:8006"
        "admin-service:8008"
    )
    
    for service_port in "${services[@]}"; do
        local service="${service_port%%:*}"
        local port="${service_port##*:}"
        
        if curl -sf "http://localhost:${port}/health" > /dev/null; then
            print_status "✓ ${service} (${port}) - Healthy"
        else
            print_error "✗ ${service} (${port}) - Unhealthy"
        fi
    done
}

# Show usage
show_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  build [service]     Build Docker images (all services if no service specified)"
    echo "  deploy [dev|prod]   Deploy environment (dev by default)"
    echo "  push               Push images to registry"
    echo "  logs <service>     Show logs for a service"
    echo "  health [env]       Perform health check"
    echo "  help               Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  POSTGRES_PASSWORD  Required for production deployment"
    echo "  DOCKER_REGISTRY    Docker registry URL (default: gcr.io/orderly-platform)"
    echo ""
    echo "Examples:"
    echo "  $0 build                      # Build all services"
    echo "  $0 build order-service        # Build specific service"
    echo "  $0 deploy dev                 # Deploy development environment"
    echo "  $0 deploy prod                # Deploy production environment"
    echo "  $0 logs api-gateway           # Show API Gateway logs"
    echo "  $0 health prod                # Check production health"
}

# Main script logic
main() {
    local command=${1:-help}
    
    case $command in
        "build")
            check_prerequisites
            if [[ -n "$2" ]]; then
                build_service "$2"
            else
                build_all_services
            fi
            ;;
        "deploy")
            check_prerequisites
            local env=${2:-dev}
            if [[ "$env" == "dev" ]]; then
                deploy_dev
            elif [[ "$env" == "prod" ]]; then
                deploy_prod
            else
                print_error "Invalid environment: $env. Use 'dev' or 'prod'"
                exit 1
            fi
            ;;
        "push")
            check_prerequisites
            push_images
            ;;
        "logs")
            if [[ -z "$2" ]]; then
                print_error "Service name required"
                show_usage
                exit 1
            fi
            show_logs "$2" "${3:-dev}"
            ;;
        "health")
            health_check "${2:-dev}"
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function
main "$@"