#!/usr/bin/env bash
set -euo pipefail

# Checks the repo for references to deprecated/removed documentation filenames.
# Fails CI or pre-commit if any matches are found (excluding docs/INDEX.md).

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

patterns='(docs/PRD\.md|requirement\.md|Orderly Design System\.md|docs/technical-architecture\.md|docs/api-specification\.md)'

echo "[docs-check] Scanning for references to deprecated docs..."

if command -v rg >/dev/null 2>&1; then
  # ripgrep path excludes
  rg -n -i -I \
    -g '!.git' -g '!node_modules' -g '!dist' -g '!build' \
    -g '!docs/INDEX.md' \
    -e "$patterns" || {
      echo "[docs-check] OK: no forbidden references found."
      exit 0
    }
  echo "\n[docs-check] ERROR: Found references to deprecated documentation files above." >&2
  echo "Please update links to canonical docs. See docs/INDEX.md for correct targets." >&2
  exit 1
else
  # Fallback to grep
  matches=$(grep -RInEI "$patterns" . \
    --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
    --exclude=docs/INDEX.md || true)
  if [[ -n "$matches" ]]; then
    echo "$matches"
    echo "\n[docs-check] ERROR: Found references to deprecated documentation files above." >&2
    echo "Please update links to canonical docs. See docs/INDEX.md for correct targets." >&2
    exit 1
  else
    echo "[docs-check] OK: no forbidden references found."
  fi
fi

