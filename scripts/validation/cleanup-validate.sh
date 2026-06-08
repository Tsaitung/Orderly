#!/usr/bin/env bash
echo "🔍 VALIDATION MODE - Check current state"

echo "==== Checking Prerequisites ===="

REQ_SECRETS=(POSTGRES_PASSWORD JWT_SECRET JWT_REFRESH_SECRET)
FOUND=0
MISSING=()

for secret in "${REQ_SECRETS[@]}"; do
  if [[ -f ".secrets/${secret}" ]]; then
    echo "✅ Found local secret: ${secret}"
  else
    echo "❌ Missing local secret: ${secret}"
    MISSING+=("${secret}")
  fi
done

if [[ ${#MISSING[@]} -eq 0 ]]; then
  echo "✅ All required secrets are present locally"
else
  exit 1
fi
