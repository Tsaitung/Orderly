#!/usr/bin/env bash
set -euo pipefail

# Rotate Secret Manager secret: postgres-password
# Usage:
#   export GOOGLE_CLOUD_PROJECT=your-project
#   ./scripts/secrets/rotate-postgres-password.sh 'new-strong-password'

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <new-password>" >&2
  exit 1
fi

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:?GOOGLE_CLOUD_PROJECT not set}"
SECRET_NAME="postgres-password"
NEW_PASSWORD="$1"

echo -n "$NEW_PASSWORD" | gcloud secrets versions add "$SECRET_NAME" \
  --data-file=- \
  --project="$PROJECT_ID"

echo "✅ Secret '$SECRET_NAME' rotated. New version added as 'latest'."

