#!/bin/bash
# Build and push missing Docker images for staging deployment

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
PROJECT_ID="orderly-472413"
ARTIFACT_REGISTRY="asia-east1-docker.pkg.dev/$PROJECT_ID/orderly"

# Services that need images
SERVICES=(
    "user-service-fastapi"
    "acceptance-service-fastapi"
    "notification-service-fastapi"
)

# Configure Docker authentication for Artifact Registry
log_info "Configuring Docker authentication..."
gcloud auth configure-docker asia-east1-docker.pkg.dev --quiet

# Build and push each service
for SERVICE in "${SERVICES[@]}"; do
    SERVICE_DIR="backend/$SERVICE"
    IMAGE_NAME="$ARTIFACT_REGISTRY/orderly-$SERVICE"
    
    if [ ! -d "$SERVICE_DIR" ]; then
        log_error "Service directory $SERVICE_DIR not found"
        continue
    fi
    
    log_info "Building $SERVICE..."
    
    # Build the Docker image
    docker build -t "$IMAGE_NAME:latest" \
        -f "$SERVICE_DIR/Dockerfile" \
        "$SERVICE_DIR"
    
    if [ $? -eq 0 ]; then
        log_info "Successfully built $SERVICE"
        
        # Push to Artifact Registry
        log_info "Pushing $SERVICE to Artifact Registry..."
        docker push "$IMAGE_NAME:latest"
        
        if [ $? -eq 0 ]; then
            log_info "✅ Successfully pushed $SERVICE"
        else
            log_error "Failed to push $SERVICE"
        fi
    else
        log_error "Failed to build $SERVICE"
    fi
done

log_info "🎯 Docker image build and push process completed!"