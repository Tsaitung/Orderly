#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT_DIR"

run_case() {
  local description="$1"
  shift
  local output

  echo "[test] $description"
  if ! output="$("$@" 2>&1)"; then
    echo "[test] command failed unexpectedly" >&2
    echo "$output" >&2
    exit 1
  fi

  if ! grep -q "orderly-apigw-staging-v2" <<<"$output"; then
    echo "[test] expected orderly-apigw-staging-v2 in output" >&2
    echo "$output" >&2
    exit 1
  fi

  if ! grep -qi "defaulting to '-v2'" <<<"$output"; then
    echo "[test] expected defaulting message" >&2
    echo "$output" >&2
    exit 1
  fi
}

run_case "Empty suffix defaults to -v2" ./scripts/ci/validate-deployment.sh check-names --environment staging --suffix ""
run_case "Whitespace suffix defaults to -v2" ./scripts/ci/validate-deployment.sh check-names --environment staging --suffix "   "

echo "[test] All suffix validation scenarios passed"
