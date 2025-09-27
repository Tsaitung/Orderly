#!/usr/bin/env bash
set -euo pipefail

# Create per-service Service Accounts and grant minimal roles
# - roles/cloudsql.client (access Cloud SQL through connector)
# - roles/secretmanager.secretAccessor (read bound secrets)
# Optionally: roles/logging.logWriter, roles/monitoring.metricWriter (usually granted by default runtime SA)

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:?Set GOOGLE_CLOUD_PROJECT}"

# Map logical services to shortened service-account IDs (<30 chars)
get_service_account_id() {
  case "$1" in
    "api-gateway-fastapi") echo "orderly-apigw-fastapi" ;;
    "user-service-fastapi") echo "orderly-user-fastapi" ;;
    "order-service-fastapi") echo "orderly-order-fastapi" ;;
    "product-service-fastapi") echo "orderly-product-fastapi" ;;
    "acceptance-service-fastapi") echo "orderly-accept-fastapi" ;;
    "notification-service-fastapi") echo "orderly-notify-fastapi" ;;
    "customer-hierarchy-service-fastapi") echo "orderly-custhier-fastapi" ;;
    "supplier-service-fastapi") echo "orderly-supplier-fastapi" ;;
    "billing-service-fastapi") echo "orderly-billing-fastapi" ;;
    *) echo "" ;;
  esac
}

SERVICES=(
  api-gateway-fastapi
  user-service-fastapi
  order-service-fastapi
  product-service-fastapi
  acceptance-service-fastapi
  notification-service-fastapi
  customer-hierarchy-service-fastapi
  supplier-service-fastapi
  billing-service-fastapi
)

create_sa() {
  local sa_id="$1"; local display="$2"
  if gcloud iam service-accounts describe "$sa_id@$PROJECT_ID.iam.gserviceaccount.com" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "✅ SA exists: $sa_id@$PROJECT_ID.iam.gserviceaccount.com"
  else
    echo "🆕 Creating SA: $sa_id"
    gcloud iam service-accounts create "$sa_id" \
      --display-name "$display" \
      --project "$PROJECT_ID"
  fi
}

bind_role() {
  local sa_id="$1"; local role="$2"
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${sa_id}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="$role" \
    --quiet >/dev/null
}

echo "Project: $PROJECT_ID"

for svc in "${SERVICES[@]}"; do
  sa_id=$(get_service_account_id "$svc")
  if [[ -z "$sa_id" ]]; then
    echo "⚠️  Skipping $svc (no service-account alias configured)"
    continue
  fi
  create_sa "$sa_id" "Orderly SA for $svc"
  bind_role "$sa_id" roles/cloudsql.client
  bind_role "$sa_id" roles/secretmanager.secretAccessor
  echo "SA: ${sa_id}@${PROJECT_ID}.iam.gserviceaccount.com"
done

echo "\nExport these for reference (deploy step will auto-detect):"
for svc in "${SERVICES[@]}"; do
  sa_id=$(get_service_account_id "$svc")
  if [[ -n "$sa_id" ]]; then
    echo "export SA_${svc//-/_}=${sa_id}@${PROJECT_ID}.iam.gserviceaccount.com"
  fi
done

echo "✅ Service accounts ready."
