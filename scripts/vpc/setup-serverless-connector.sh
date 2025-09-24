#!/usr/bin/env bash
set -euo pipefail

# Create a Serverless VPC Access Connector for Cloud Run -> VPC resources (e.g., Memorystore)
# Usage:
#   export GOOGLE_CLOUD_PROJECT=your-project
#   ./scripts/vpc/setup-serverless-connector.sh asia-east1 default orderly-svpc-connector 10.8.0.0/28

REGION="${1:?region}"
NETWORK="${2:-default}"
CONNECTOR_NAME="${3:-orderly-svpc-connector}"
RANGE="${4:-10.8.0.0/28}"

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:?GOOGLE_CLOUD_PROJECT not set}"

if gcloud compute networks vpc-access connectors describe "$CONNECTOR_NAME" \
  --region="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "✅ Connector exists: $CONNECTOR_NAME ($REGION)"
else
  echo "🆕 Creating connector: $CONNECTOR_NAME in $REGION on $NETWORK with range $RANGE"
  gcloud compute networks vpc-access connectors create "$CONNECTOR_NAME" \
    --region="$REGION" \
    --network="$NETWORK" \
    --range="$RANGE" \
    --min-instances=2 \
    --max-instances=3 \
    --project="$PROJECT_ID"
fi

echo "Connector URI: projects/$PROJECT_ID/locations/$REGION/connectors/$CONNECTOR_NAME"
echo "✅ Done"

