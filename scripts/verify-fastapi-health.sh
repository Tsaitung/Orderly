#!/usr/bin/env bash
set -euo pipefail

urls=(
  "http://localhost:8000/health"
  "http://localhost:8000/api/products/health"
  "http://localhost:8000/api/acceptance/health"
  "http://localhost:8000/api/notifications/health"
  "http://localhost:3001/health"            # user-service-fastapi
  "http://localhost:3002/health"            # order-service-fastapi
  "http://localhost:3003/health"            # product-service-fastapi
  "http://localhost:3004/acceptance/health" # acceptance-service-fastapi
  "http://localhost:3006/health"            # notification-service-fastapi
  "http://localhost:3007/health"            # customer-hierarchy-service-fastapi
  "http://localhost:3008/health"            # supplier-service-fastapi
)

echo "Verifying FastAPI services health..."
failures=0
for url in "${urls[@]}"; do
  printf "- %s ... " "$url"
  if curl -fsS "$url" >/dev/null; then
    echo "OK"
  else
    echo "FAILED"
    failures=$((failures+1))
  fi
done

if [[ $failures -gt 0 ]]; then
  echo "Health check failures: $failures"
  exit 1
else
  echo "All endpoints healthy."
fi
