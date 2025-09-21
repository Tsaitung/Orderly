#!/bin/bash

# Generate Cloud Run optimized Dockerfiles for FastAPI services
# - Python 3.11 slim
# - uvicorn listens on $PORT
# - Optional Alembic migration before start

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# FastAPI services (directory:port)
SERVICES=(
  "api-gateway-fastapi:8000"
  "user-service-fastapi:3001"
  "order-service-fastapi:3002"
  "product-service-fastapi:3003"
  "acceptance-service-fastapi:3004"
  "billing-service-fastapi:3005"
  "notification-service-fastapi:3006"
  "customer-hierarchy-service-fastapi:3007"
)

create_cloud_run_dockerfile() {
  local service_dir=$1
  local service_port=$2
  local service_path="${PROJECT_ROOT}/backend/${service_dir}"
  local dockerfile_path="${service_path}/Dockerfile.cloudrun"

  echo "Creating Cloud Run Dockerfile for ${service_dir}..."

  local alembic_copy=""
  local alembic_dir_copy=""
  local alembic_cmd=""
  if [[ -f "${service_path}/alembic.ini" ]]; then
    alembic_copy=$'COPY alembic.ini ./alembic.ini'
    alembic_cmd='alembic upgrade head && '
  fi
  if [[ -d "${service_path}/alembic" ]]; then
    alembic_dir_copy=$'\nCOPY alembic ./alembic'
  fi

  cat > "${dockerfile_path}" << EOF
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
${alembic_copy}${alembic_dir_copy}
EXPOSE 8080
CMD ["sh", "-c", "${alembic_cmd}uvicorn app.main:app --host 0.0.0.0 --port \${PORT:-8080} --workers 1"]
EOF

  echo "Created ${dockerfile_path}"
}

for entry in "${SERVICES[@]}"; do
  dir="${entry%%:*}"
  port="${entry##*:}"
  if [[ -d "${PROJECT_ROOT}/backend/${dir}" ]]; then
    create_cloud_run_dockerfile "$dir" "$port"
  else
    echo "Warning: backend/${dir} not found, skipping"
  fi
done

echo "All Cloud Run Dockerfiles generated."
echo "Build example: docker build -f backend/user-service-fastapi/Dockerfile.cloudrun -t <image> backend/user-service-fastapi"
echo "Run locally: docker run -p 8080:8080 -e PORT=8080 <image>"

