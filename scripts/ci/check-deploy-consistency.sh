#!/usr/bin/env bash
# check-deploy-consistency.sh — pre-deploy drift guard (added 2026-06-08).
#
# WHY THIS EXISTS
#   cd.yml builds the backend monolith with:
#       docker build -f backend/Dockerfile.monolith -t ... .   (context = repo root)
#   The Dockerfile then `COPY backend/app ./app`, `COPY backend/libs ./libs`,
#   `COPY backend/app/requirements.txt ...`. If a refactor MOVES or DELETES those
#   paths but does NOT update Dockerfile.monolith, `docker build` fails at the COPY
#   step — but only at CD build time, in Actions, AFTER CI is green
#   (ci.yml backend-test is advisory / continue-on-error).
#
#   This guard asserts that every repo-relative COPY source in
#   backend/Dockerfile.monolith still exists in the build context, so deploy-config
#   vs code drift fails FAST and LOCAL, with the root cause named, instead of as a
#   cryptic "COPY failed: no such file" mid-deploy.
#
# INCIDENTS
#   2026-06-06  cd.yml build/import fail -> fix -> redispatch loop (root causes
#               only visible in Actions, never reproduced locally).
#   2026-06-08  monolith (backend/app) vs microservice deploy-config (cd.yml) drift
#               surfaced while preparing a "deploy to production" run.
#   See ~/.claude/CLAUDE.md — "CI/CD 過不了即刻喊停 → 直接根因分析".
#
# USAGE
#   scripts/ci/check-deploy-consistency.sh      # or: make deploy-check
#   Wired as cd.yml `preflight` job: build-deploy / deploy-frontend gate on it.
#
# EXIT
#   0  every Dockerfile.monolith COPY source exists in the build context
#   1  drift: a COPY source path is missing (deploy config drifted from code)
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

CD_YML=".github/workflows/cd.yml"
DOCKERFILE="backend/Dockerfile.monolith"

if [ ! -f "$CD_YML" ]; then
  echo "deploy-consistency: no $CD_YML — nothing to check"
  exit 0
fi

# Post-monolith deploy contract: cd.yml builds exactly one backend image from
# backend/Dockerfile.monolith with `context: .` (repo root). Assert that the
# Dockerfile cd.yml references actually exists and matches what we audit.
if ! grep -qE '^[[:space:]]*file:[[:space:]]*backend/Dockerfile\.monolith' "$CD_YML"; then
  echo "::error::deploy-consistency: $CD_YML does not build backend/Dockerfile.monolith"
  echo "  Expected the monolith deploy contract (cd.yml build-deploy file: backend/Dockerfile.monolith)."
  exit 1
fi

if [ ! -f "$DOCKERFILE" ]; then
  echo "::error::deploy-consistency: $DOCKERFILE is missing but $CD_YML deploys it"
  exit 1
fi

fail=0
checked=0

# For each `COPY <src> <dst>` line, audit the FIRST source argument when it is a
# repo-relative path. Skip:
#   - `COPY --from=<stage>` (multi-stage copies from a build stage, not the context)
#   - absolute paths (e.g. /root/.local) which are not repo-relative
# Naive `awk '{print $2}'` on a `COPY --from=deps ...` line yields '--from=deps'
# (false positive), so we filter those lines out explicitly first.
while IFS= read -r line; do
  # Drop the leading COPY keyword, normalise whitespace.
  rest=$(printf '%s' "$line" | sed -E 's/^[[:space:]]*COPY[[:space:]]+//')
  # Skip multi-stage copies.
  case "$rest" in
    --from=*) continue ;;
  esac
  # First token is the source path.
  src=$(printf '%s' "$rest" | awk '{print $1}')
  [ -n "$src" ] || continue
  # Skip absolute paths (not part of the repo build context).
  case "$src" in
    /*) continue ;;
  esac
  checked=$((checked + 1))
  if [ ! -e "$src" ]; then
    echo "::error::$DOCKERFILE COPYs '$src' which does NOT exist in the build context (deploy config drifted from code)"
    fail=1
  fi
done < <(grep -E '^[[:space:]]*COPY[[:space:]]' "$DOCKERFILE")

if [ "$checked" -eq 0 ]; then
  echo "::error::deploy-consistency: parsed no repo-relative COPY sources from $DOCKERFILE"
  echo "  Expected at least one (e.g. backend/app, backend/libs). Parser or Dockerfile drifted."
  exit 1
fi

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "❌ deploy-consistency FAILED."
  echo "   $CD_YML will try to build the monolith image whose Dockerfile COPY"
  echo "   build-context no longer exists. Converge the Dockerfile + code paths"
  echo "   before pushing to a deploy branch (main/staging)."
  echo "   Do NOT push to a deploy branch to let CD discover this."
  exit 1
fi

echo "✓ deploy-consistency OK: backend/Dockerfile.monolith"
echo "  ($checked repo-relative COPY-source paths verified present in context)"
exit 0
