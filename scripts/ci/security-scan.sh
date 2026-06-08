#!/usr/bin/env bash
# Single source of truth for the security scan. Called by BOTH the ci.yml
# security-scan job AND `make security-scan` (wired into verify-pr-local), so the
# scan runs locally before push instead of CI-only — same reasoning as
# scripts/ci/backend-test.sh. Tool installation stays env-specific (CI installs
# gitleaks/pip-audit; locally they advisory-skip if absent); the SCAN logic +
# blocking policy live here so CI and local can't drift.
#
# Policy:
#   - npm audit (production deps) BLOCKS on critical. The 3 low-exploitability
#     prod highs (next DoS / glob / minimatch) are surfaced, not blocking, until
#     the next major bump.
#   - gitleaks (secret scan) + pip-audit are ADVISORY (surface, never block) until
#     git history is swept once / backend findings are triaged.
set -uo pipefail   # deliberately NOT -e: per-check exit is controlled below
fail=0

echo "==> gitleaks (secret scan, advisory)"
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --source=. --redact --verbose --exit-code 1 \
    || echo "::warning::gitleaks: potential secrets found (advisory until history is swept)"
else
  echo "::warning::gitleaks not on PATH — skipped (CI installs + runs it; install locally to mirror)"
fi

echo "==> npm audit --omit=dev --audit-level=critical (BLOCKING)"
if command -v npm >/dev/null 2>&1; then
  npm audit --omit=dev --audit-level=critical \
    || { echo "::error::npm audit: production CRITICAL vulnerability — blocking"; fail=1; }
else
  echo "::error::npm not found — cannot run npm audit"; fail=1
fi

echo "==> npm audit --omit=dev --audit-level=high (advisory surface)"
if command -v npm >/dev/null 2>&1; then
  npm audit --omit=dev --audit-level=high \
    || echo "::warning::npm audit: production HIGH vulns (advisory until next major bump: next/glob/minimatch)"
fi

echo "==> pip-audit backend deps (advisory surface)"
if [ -f backend/app/requirements.txt ]; then
  if command -v pip-audit >/dev/null 2>&1; then
    pip-audit -r backend/app/requirements.txt \
      || echo "::warning::pip-audit: backend findings (advisory)"
  else
    echo "::warning::pip-audit not installed — skipped (CI installs it; pip install pip-audit to mirror)"
  fi
fi

if [ "$fail" -ne 0 ]; then
  echo "❌ security-scan FAILED (blocking finding above)"
  exit 1
fi
echo "✓ security-scan passed (blocking checks clean; advisory findings surfaced above)"
