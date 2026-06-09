#!/usr/bin/env bash
# Single source of truth for cd.yml's deploy-context resolution. Extracted from
# the cd.yml `resolve` job so the logic (which branch deploys what) is unit-tested
# locally (resolve-deploy-context.test.sh) instead of only ever exercised in
# Actions. cd.yml `resolve` calls this and appends stdout to $GITHUB_OUTPUT.
#
# Inputs (env):
#   REF              github.ref (refs/heads/main => production, else staging)
#   INPUT_SERVICES   workflow_dispatch services (comma-separated; empty = auto)
#   INPUT_FORCE_ALL  workflow_dispatch force_all ("true" => deploy everything)
#   CHANGED_FILES    OPTIONAL newline-separated list (tests inject this); when
#                    unset, computed from `git diff --name-only HEAD~1 HEAD`.
# Output (stdout), one per line: environment, suffix, db_instance, services, frontend
set -euo pipefail

REF="${REF:-}"
INPUT_SERVICES="${INPUT_SERVICES:-}"
INPUT_FORCE_ALL="${INPUT_FORCE_ALL:-}"
ALL='["backend-monolith"]'

# ── environment / suffix / db_instance (always emitted, derived from the ref) ──
if [ "$REF" = "refs/heads/main" ]; then
  echo "environment=production"
  echo "suffix="
  echo "db_instance=orderly-db"
else
  echo "environment=staging"
  echo "suffix=-v2"
  echo "db_instance=orderly-db-v2"
fi

# ── services / frontend ──
# Manual explicit list wins.
if [ -n "$INPUT_SERVICES" ]; then
  json=$(printf '%s' "$INPUT_SERVICES" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | grep -v '^$' \
    | python3 -c 'import sys,json;print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')
  echo "services=$json"
  echo "frontend=true"
  exit 0
fi
if [ "$INPUT_FORCE_ALL" = "true" ]; then
  echo "services=$ALL"
  echo "frontend=true"
  exit 0
fi

if [ -n "${CHANGED_FILES+x}" ]; then
  changed="$CHANGED_FILES"
else
  changed=$(git diff --name-only HEAD~1 HEAD || true)
fi

# Shared libs / workflow / shared types / monolith build inputs => rebuild monolith.
if echo "$changed" | grep -qE '(backend/app/|backend/libs/|shared/types/|\.github/workflows/cd\.yml|backend/Dockerfile\.monolith|backend/cloudbuild\.monolith\.yaml)'; then
  echo "services=$ALL"
  echo "frontend=true"
  exit 0
fi

svcs=()
if echo "$changed" | grep -qE 'backend/(api-gateway-fastapi|user-service-fastapi|order-service-fastapi|product-service-fastapi|acceptance-service-fastapi|notification-service-fastapi|customer-hierarchy-service-fastapi|supplier-service-fastapi)/'; then
  svcs+=("\"backend-monolith\"")
fi
if [ ${#svcs[@]} -eq 0 ]; then
  echo "services=[]"
else
  echo "services=[$(IFS=,; echo "${svcs[*]}")]"
fi

if echo "$changed" | grep -qE '(src/app/|src/components/|src/lib/|src/contexts/|src/hooks/|src/stores/|src/middleware\.ts|public/|next\.config\.js|tailwind\.config\.ts|package(-lock)?\.json)'; then
  echo "frontend=true"
else
  echo "frontend=false"
fi
