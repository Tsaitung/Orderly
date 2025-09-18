#!/bin/bash

# Orderly Development Environment Startup Script
# This script starts PostgreSQL and Redis for local development

set -e

echo "🚀 Starting Orderly Development Environment"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_step "Stopping any existing containers..."
docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

print_step "Pulling latest images..."
docker-compose -f docker-compose.dev.yml pull

print_step "Starting PostgreSQL and Redis..."
docker-compose -f docker-compose.dev.yml up -d postgres redis

print_step "Waiting for services to be healthy..."
echo -n "Waiting for PostgreSQL"
while ! docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U orderly -d orderly > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✓${NC}"

echo -n "Waiting for Redis"
while ! docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✓${NC}"

print_status "Database services are ready!"
echo ""
echo "📊 Service Status:"
echo "==================="
echo "PostgreSQL: Running on localhost:5432"
echo "Redis:      Running on localhost:6379"
echo ""
echo "🔧 Connection Details:"
echo "======================"
echo "Database URL: postgresql://orderly:orderly_dev_password@localhost:5432/orderly"
echo "Redis URL:    redis://localhost:6379"
echo ""
echo "🎯 Optional Management Tools:"
echo "============================="
echo "PgAdmin:       http://localhost:5050 (admin@orderly.dev / admin123)"
echo "Redis Commander: http://localhost:8081"
echo ""
echo "To start management tools, run:"
echo "docker-compose -f docker-compose.dev.yml --profile admin up -d"
echo ""
print_status "Development environment is ready! 🎉"
echo ""
echo "Next steps:"
echo "1. Install Prisma CLI: npm install -g prisma"
echo "2. Generate Prisma client: npx prisma generate"
echo "3. Run migrations: npx prisma migrate dev"
echo "4. Start your microservices: npm run dev"