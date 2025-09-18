#!/bin/bash

# Create Cloud Run optimized Dockerfiles
# Cloud Run specific requirements:
# - Listen on PORT environment variable
# - Non-root user
# - Signal handling for graceful shutdown

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Services and their ports (service_name:port format)
SERVICES=(
    "api-gateway:8000"
    "user-service:8001"
    "order-service:8002"
    "product-service:8003"
    "acceptance-service:8004"
    "billing-service:8005"
    "notification-service:8006"
    "admin-service:8008"
)

create_cloud_run_dockerfile() {
    local service_name=$1
    local service_port=$2
    local service_path="${PROJECT_ROOT}/backend/${service_name}"
    local dockerfile_path="${service_path}/Dockerfile.cloudrun"
    
    echo "Creating Cloud Run Dockerfile for ${service_name}..."
    
    cat > "${dockerfile_path}" << EOF
# Cloud Run optimized Dockerfile for ${service_name}
FROM node:20-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && apk add --no-cache dumb-init curl

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user for Cloud Run
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 ${service_name}

# Create logs directory
RUN mkdir -p /app/logs && chown -R ${service_name}:nodejs /app/logs

# Copy built application
COPY --from=builder --chown=${service_name}:nodejs /app/dist ./dist
COPY --from=builder --chown=${service_name}:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=${service_name}:nodejs /app/package.json ./package.json

# Switch to non-root user
USER ${service_name}

# Cloud Run expects the container to listen on PORT environment variable
ENV PORT=\${PORT:-${service_port}}
ENV NODE_ENV=production

# Expose the port (Cloud Run will override this)
EXPOSE \${PORT}

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
EOF

    echo "Created ${dockerfile_path}"
}

# Create Dockerfiles for all services
for service_entry in "${SERVICES[@]}"; do
    service_name="${service_entry%%:*}"
    service_port="${service_entry##*:}"
    
    if [[ -d "${PROJECT_ROOT}/backend/${service_name}" ]]; then
        create_cloud_run_dockerfile "${service_name}" "${service_port}"
    else
        echo "Warning: Service directory ${service_name} not found, skipping..."
    fi
done

echo "All Cloud Run Dockerfiles created successfully!"
echo ""
echo "Usage:"
echo "  To build for Cloud Run: docker build -f Dockerfile.cloudrun -t service-name ."
echo "  To test locally: docker run -p 8080:8080 -e PORT=8080 service-name"