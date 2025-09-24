#!/usr/bin/env bash

# Cloud SQL + Cloud Run diagnostic helper
# Prints, for each service, the Cloud SQL connector binding, key DB env/secret bindings,
# service URL, and /db/health status if available.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-${GOOGLE_CLOUD_PROJECT:-orderly-472413}}"
REGION="${REGION:-asia-east1}"
ENV="${ENV:-staging}"

services=(
  api-gateway-fastapi
  product-service-fastapi
  customer-hierarchy-service-fastapi
  user-service-fastapi
  order-service-fastapi
  acceptance-service-fastapi
  notification-service-fastapi
  supplier-service-fastapi
)

echo "Project: $PROJECT_ID | Region: $REGION | Env: $ENV"
echo ""

for svc in "${services[@]}"; do
  name="orderly-${svc}-${ENV}${SERVICE_SUFFIX:-}"
  echo "=== Service: $name ==="
  url=$(gcloud run services describe "$name" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)' 2>/dev/null || true)
  if [[ -z "$url" ]]; then
    echo "(not deployed)"
    echo ""
    continue
  fi

  ann=$(gcloud run services describe "$name" --region="$REGION" --project="$PROJECT_ID" --format='json' \
    | jq -r '.spec.template.metadata.annotations["run.googleapis.com/cloudsql-instances"] // ""')
  sa=$(gcloud run services describe "$name" --region="$REGION" --project="$PROJECT_ID" --format='value(spec.template.spec.serviceAccountName)')

  env_dump=$(gcloud run services describe "$name" --region="$REGION" --project="$PROJECT_ID" --format='json' \
    | jq '.spec.template.spec.containers[0].env // []')

  # Extract key env values (value or secretRef)
  db_host=$(echo "$env_dump" | jq -r 'map(select(.name=="DATABASE_HOST"))|.[0].value // ""')
  db_name=$(echo "$env_dump" | jq -r 'map(select(.name=="DATABASE_NAME"))|.[0].value // ""')
  db_user=$(echo "$env_dump" | jq -r 'map(select(.name=="DATABASE_USER"))|.[0].value // ""')
  db_url=$(echo "$env_dump" | jq -r 'map(select(.name=="DATABASE_URL"))|.[0].value // ""')
  pw_secret=$(echo "$env_dump" | jq -r 'map(select(.name=="POSTGRES_PASSWORD"))|.[0].valueFrom.secretKeyRef.name // ""')
  pw_key=$(echo "$env_dump" | jq -r 'map(select(.name=="POSTGRES_PASSWORD"))|.[0].valueFrom.secretKeyRef.key // ""')

  echo "URL:           $url"
  echo "SA:            $sa"
  echo "CloudSQL:      ${ann:-"(none)"}"
  echo "DATABASE_HOST: ${db_host:-""}"
  echo "DATABASE_NAME: ${db_name:-""}"
  echo "DATABASE_USER: ${db_user:-""}"
  echo "DATABASE_URL:  ${db_url:-"(not set)"}"
  if [[ -n "$pw_secret" ]]; then
    echo "POSTGRES_PASSWORD: secretRef ${pw_secret}:${pw_key}"
  else
    echo "POSTGRES_PASSWORD: (not bound via secret)"
  fi

  # DB health probe (if implemented) with correlation id
  CID=$(uuidgen || echo "diag-$(date +%s%N)")
  if curl -sf -m 10 -H "X-Correlation-ID: $CID" "$url/db/health" >/dev/null 2>&1; then
    echo "/db/health:   healthy"
  else
    code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 -H "X-Correlation-ID: $CID" "$url/db/health" || true)
    [[ -n "$code" ]] && echo "/db/health:   http $code" || echo "/db/health:   unreachable"
  fi
  echo "CID:           $CID"

  echo ""
done

echo "Done."
