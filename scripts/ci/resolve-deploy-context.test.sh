#!/usr/bin/env bash
# Self-test for resolve-deploy-context.sh — locks every branch of cd.yml's
# deploy-context logic so a misroute (wrong env / wrong services / skipped
# frontend) is caught locally, not after a bad deploy.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
SCRIPT=scripts/ci/resolve-deploy-context.sh

fail=0
# run <desc> then set REF/INPUT_*/CHANGED_FILES in env of the subshell
check() { # <desc> <expected-substring> <actual-output>
  if printf '%s\n' "$3" | grep -qxF "$2"; then
    echo "  ok: $1 ($2)"
  else
    echo "::error::resolve: $1 — expected line '$2' in:"; printf '%s\n' "$3" | sed 's/^/      /'; fail=1
  fi
}

# main => production / no suffix / orderly-db
out=$(REF=refs/heads/main CHANGED_FILES="docs/x.md" bash "$SCRIPT")
check "main environment"  "environment=production" "$out"
check "main suffix"       "suffix="                "$out"
check "main db"           "db_instance=orderly-db" "$out"

# staging => staging / -v2 / orderly-db-v2
out=$(REF=refs/heads/staging CHANGED_FILES="docs/x.md" bash "$SCRIPT")
check "staging environment" "environment=staging"      "$out"
check "staging suffix"      "suffix=-v2"                "$out"
check "staging db"          "db_instance=orderly-db-v2" "$out"

# backend/app change => deploy monolith + frontend
out=$(REF=refs/heads/staging CHANGED_FILES="backend/app/main.py" bash "$SCRIPT")
check "backend change services" 'services=["backend-monolith"]' "$out"
check "backend change frontend" "frontend=true"                  "$out"

# frontend-only change => no backend, frontend=true
out=$(REF=refs/heads/staging CHANGED_FILES="src/app/page.tsx" bash "$SCRIPT")
check "fe-only services" "services=[]"    "$out"
check "fe-only frontend" "frontend=true"  "$out"

# docs-only change => nothing deploys
out=$(REF=refs/heads/staging CHANGED_FILES="docs/x.md" bash "$SCRIPT")
check "docs-only services" "services=[]"    "$out"
check "docs-only frontend" "frontend=false" "$out"

# force_all => monolith + frontend regardless of changes
out=$(REF=refs/heads/staging INPUT_FORCE_ALL=true CHANGED_FILES="docs/x.md" bash "$SCRIPT")
check "force_all services" 'services=["backend-monolith"]' "$out"
check "force_all frontend" "frontend=true"                 "$out"

# manual services list wins
out=$(REF=refs/heads/staging INPUT_SERVICES="backend-monolith" CHANGED_FILES="docs/x.md" bash "$SCRIPT")
check "manual services" 'services=["backend-monolith"]' "$out"

if [ "$fail" -ne 0 ]; then
  echo "❌ resolve-deploy-context self-test FAILED — cd.yml would resolve the wrong deploy context."
  exit 1
fi
echo "✓ resolve-deploy-context self-test OK"
