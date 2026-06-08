#!/usr/bin/env bash
# Self-test for cloud-run-names.sh — the Cloud Run service-name SSOT that cd.yml
# build-deploy / wire-up / deploy-frontend / smoke all source. A drift here
# silently misroutes every deploy AND the smoke check (smoke would probe the
# wrong/old service and pass), so this locks the naming contract locally instead
# of discovering a misroute in production.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
# shellcheck source=scripts/ci/cloud-run-names.sh
source scripts/ci/cloud-run-names.sh

fail=0
assert() { # <desc> <expected> <actual>
  if [ "$2" != "$3" ]; then
    echo "::error::cloud-run-names: $1 — expected '$2', got '$3'"; fail=1
  else
    echo "  ok: $1 -> $3"
  fi
}

# The two contracts cd.yml resolve produces: staging (suffix=-v2) and prod (suffix="").
assert "staging backend-monolith" "orderly-backend-staging-v2" "$(cr_service_name backend-monolith staging -v2)"
assert "prod backend-monolith"    "orderly-backend-production"  "$(cr_service_name backend-monolith production '')"

if [ "$fail" -ne 0 ]; then
  echo "❌ cloud-run-names self-test FAILED — cd.yml would deploy/smoke the wrong service name."
  exit 1
fi
echo "✓ cloud-run-names self-test OK"
