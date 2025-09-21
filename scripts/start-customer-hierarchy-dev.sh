#!/bin/bash

# ============================================================================
# Customer Hierarchy Development Startup Script
# ============================================================================
# Starts the customer hierarchy service and its dependencies for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKER_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
OVERRIDE_FILE="${PROJECT_ROOT}/docker-compose.override.yml"

echo -e "${BLUE}🚀 Starting Customer Hierarchy Development Environment${NC}"
echo -e "${BLUE}=================================================${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if docker-compose files exist
if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
    echo -e "${RED}❌ docker-compose.yml not found at $DOCKER_COMPOSE_FILE${NC}"
    exit 1
fi

if [[ ! -f "$OVERRIDE_FILE" ]]; then
    echo -e "${YELLOW}⚠️  docker-compose.override.yml not found at $OVERRIDE_FILE${NC}"
    echo -e "${YELLOW}   Continuing with base configuration only...${NC}"
    OVERRIDE_FILE=""
fi

# Change to project root
cd "$PROJECT_ROOT"

# Function to check service health
check_service_health() {
    local service_name=$1
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for $service_name to be healthy...${NC}"
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose ps "$service_name" | grep -q "healthy\|Up"; then
            echo -e "${GREEN}✅ $service_name is healthy${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts - $service_name not ready yet...${NC}"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name failed to become healthy after $max_attempts attempts${NC}"
    return 1
}

# Create required directories if they don't exist
echo -e "${BLUE}📁 Creating required directories...${NC}"
mkdir -p logs monitoring/prometheus monitoring/grafana/datasources monitoring/grafana/dashboards

# Pull latest images
echo -e "${BLUE}📥 Pulling latest Docker images...${NC}"
if [[ -n "$OVERRIDE_FILE" ]]; then
    docker-compose -f "$DOCKER_COMPOSE_FILE" -f "$OVERRIDE_FILE" pull
else
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
fi

# Start infrastructure services first
echo -e "${BLUE}🔧 Starting infrastructure services...${NC}"
INFRASTRUCTURE_SERVICES="postgres redis elasticsearch"

if [[ -n "$OVERRIDE_FILE" ]]; then
    docker-compose -f "$DOCKER_COMPOSE_FILE" -f "$OVERRIDE_FILE" up -d $INFRASTRUCTURE_SERVICES
else
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d $INFRASTRUCTURE_SERVICES
fi

# Wait for infrastructure to be ready
for service in $INFRASTRUCTURE_SERVICES; do
    check_service_health "$service"
done

# Start core services
echo -e "${BLUE}⚡ Starting core services...${NC}"
CORE_SERVICES="user-service customer-hierarchy-service"

if [[ -n "$OVERRIDE_FILE" ]]; then
    docker-compose -f "$DOCKER_COMPOSE_FILE" -f "$OVERRIDE_FILE" up -d $CORE_SERVICES
else
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d $CORE_SERVICES
fi

# Wait for core services to be ready
for service in $CORE_SERVICES; do
    check_service_health "$service"
done

# Start API Gateway
echo -e "${BLUE}🌐 Starting API Gateway...${NC}"
if [[ -n "$OVERRIDE_FILE" ]]; then
    docker-compose -f "$DOCKER_COMPOSE_FILE" -f "$OVERRIDE_FILE" up -d api-gateway
else
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d api-gateway
fi

check_service_health "api-gateway"

# Start frontend
echo -e "${BLUE}🎨 Starting frontend...${NC}"
if [[ -n "$OVERRIDE_FILE" ]]; then
    docker-compose -f "$DOCKER_COMPOSE_FILE" -f "$OVERRIDE_FILE" up -d frontend
else
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d frontend
fi

# Start monitoring (optional)
echo -e "${BLUE}📊 Starting monitoring services...${NC}"
MONITORING_SERVICES="prometheus grafana"

if [[ -n "$OVERRIDE_FILE" ]]; then
    docker-compose -f "$DOCKER_COMPOSE_FILE" -f "$OVERRIDE_FILE" up -d $MONITORING_SERVICES
else
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d $MONITORING_SERVICES
fi

# Display service URLs
echo -e "${GREEN}🎉 Customer Hierarchy Development Environment is ready!${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
echo -e "${BLUE}🌐 Service URLs:${NC}"
echo -e "   Frontend:                 ${GREEN}http://localhost:3000${NC}"
echo -e "   API Gateway:              ${GREEN}http://localhost:8000${NC}"
echo -e "   Customer Hierarchy API:   ${GREEN}http://localhost:3007${NC}"
echo -e "   API Documentation:        ${GREEN}http://localhost:3007/docs${NC}"
echo ""
echo -e "${BLUE}🛠️  Development URLs:${NC}"
echo -e "   User Service:             ${GREEN}http://localhost:3001${NC}"
echo -e "   PostgreSQL:               ${GREEN}localhost:5432${NC}"
echo -e "   Redis:                    ${GREEN}localhost:6379${NC}"
echo -e "   Elasticsearch:            ${GREEN}http://localhost:9200${NC}"
echo ""
echo -e "${BLUE}📊 Monitoring URLs:${NC}"
echo -e "   Prometheus:               ${GREEN}http://localhost:9090${NC}"
echo -e "   Grafana:                  ${GREEN}http://localhost:3010${NC} (admin/orderly-dev-admin)"
echo ""
echo -e "${BLUE}🧪 Testing the Customer Hierarchy API:${NC}"
echo -e "   Health Check:             ${YELLOW}curl http://localhost:3007/health${NC}"
echo -e "   Get Hierarchy Tree:       ${YELLOW}curl http://localhost:3007/api/v2/hierarchy/tree${NC}"
echo ""
echo -e "${BLUE}📝 Useful commands:${NC}"
echo -e "   View logs:                ${YELLOW}docker-compose logs -f customer-hierarchy-service${NC}"
echo -e "   Stop services:            ${YELLOW}docker-compose down${NC}"
echo -e "   Restart hierarchy:        ${YELLOW}docker-compose restart customer-hierarchy-service${NC}"
echo -e "   Database shell:           ${YELLOW}docker-compose exec postgres psql -U orderly -d orderly${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"