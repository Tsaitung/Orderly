#!/usr/bin/env bash
set -euo pipefail

echo "Scanning for forbidden Zustand store usage (no selector)..."

violations=$(rg -n "useCustomerHierarchyStore\(\)" --glob '!node_modules' || true)

if [[ -n "$violations" ]]; then
  echo "Found calls to useCustomerHierarchyStore without a selector:" >&2
  echo "$violations" >&2
  echo "Please replace with: useCustomerHierarchyStore(s => s.<fieldOrAction>)" >&2
  exit 1
else
  echo "No violations found."
fi

