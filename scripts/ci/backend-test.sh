#!/usr/bin/env bash
# Single source of truth for the monolith backend test gate.
#
# WHY THIS FILE EXISTS (recurring-error fix, 2026-06-08):
# CI (.github/workflows/ci.yml backend-test) and the local pre-push mirror
# (`make test-be`) were authored independently — different commands, different
# env, different (retired) targets. The local gate even looped over 9 deleted
# microservice dirs and exited with an error before running anything, so it
# could NEVER surface a CI backend failure. Result: every divergence (% escaping
# in the alembic URL, the ENVIRONMENT config branch, env vars the app needed)
# was discovered one-at-a-time in GitHub Actions instead of once, locally.
#
# This script is the ONE place that defines (a) the FULL env contract the
# monolith backend test needs and (b) the exact commands. ci.yml and `make
# test-be` both call it. They can no longer drift: a missing/renamed env var or
# a command change fails identically in both places, locally first.
#
# Callers supply the env (CI via the job `env:` map; local via `make test-be`).
# This script asserts the full set is present, then runs the gate.
set -euo pipefail

# ── The full env contract (enumerate the WHOLE set here, in one place) ────────
# Add a var here the moment the app starts needing it; both CI and local pick it
# up automatically. This list is the artifact that used to be missing.
REQUIRED_ENV=(
  ENVIRONMENT          # config branch the monolith boots in (mirror deploy: test)
  DATABASE_HOST
  DATABASE_PORT
  DATABASE_USER
  DATABASE_NAME
  POSTGRES_PASSWORD    # NOTE: alembic escapes % in the URL (ConfigParser) — see app/alembic/env.py
  REDIS_HOST
  REDIS_PORT
  JWT_SECRET
  JWT_REFRESH_SECRET
  PYTHONPATH           # backend:backend/libs (monolith app pkg + shared core)
)

missing=()
for var in "${REQUIRED_ENV[@]}"; do
  if [ -z "${!var:-}" ]; then missing+=("$var"); fi
done
if [ ${#missing[@]} -gt 0 ]; then
  echo "::error::backend-test env contract violated — missing: ${missing[*]}" >&2
  echo "  Supply these in BOTH ci.yml (backend-test env:) and make test-be." >&2
  exit 2
fi

PY="${BACKEND_TEST_PYTHON:-python}"
BACKEND_DIR="${BACKEND_DIR:-backend}"
cd "$BACKEND_DIR"

echo "==> alembic upgrade head (monolith chain)"
"$PY" -m alembic -c app/alembic.ini upgrade head

echo "==> pytest (monolith app)"
if find app -path '*/tests/*' -name 'test_*.py' | grep -q .; then
  "$PY" -m pytest -q -n auto app
else
  echo "No monolith tests yet, skipping"
fi
