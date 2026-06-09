#!/usr/bin/env bash
# PreToolUse hook for orderly-doc-governance harvest mode.
#
# Blocks Bash `rm -rf docs/plans/{date}-*/` and Edit on `docs/plans/governance-ledger.md`
# unless a fresh, sufficient §0 verification evidence file exists at
# ${CWD}/.claude/.gov-harvest-evidence.json.
#
# Authority: orderly-doc-governance Hard Rule #11 (Plan Packet Truth
# Verification Gate) + plan-residency.md §Harvest Algorithm Step 0.
#
# Provenance: this gate is ported from the sibling repo helloglow-doc-governance,
# where the failure mode (AI trusting plan-packet text claims — handoff.md saying
# "applied", manifest saying "NOT applied" — without grep / gcloud / git / ls
# verification against actual repo + external state) recurred 3x in a single
# session and was only caught by user reverse-questioning. SKILL.md prose rules
# alone did not stop it; hence this hook-level enforcement. This is a PREVENTIVE
# rule, not a record of any Orderly incident.
#
# Schema for ${CWD}/.claude/.gov-harvest-evidence.json:
#   {
#     "run_id": "20260606-...",
#     "timestamp": "ISO8601",
#     "verifications": [
#       {
#         "command": "grep -c reconciliation_status backend/app/modules/billing/models/...",
#         "command_type": "grep|ls|git|gcloud|alembic|other",
#         "target": "applied-claim|frozen-decision|verification-truth|external-state|commit-claim|migration-claim",
#         "output_excerpt": "9",
#         "timestamp": "ISO8601"
#       }
#     ],
#     "disposition": "rm|keep|promote|partial-promote"
#   }
#
# Five checks (any failure blocks the tool call):
#   1. Evidence file exists
#   2. Mtime age ≤ 600 sec (state may have changed since)
#   3. ≥ 3 verifications (covers §0.1 applied + §0.2 cross-ref + §0.3 truth)
#   4. ≥ 1 non-grep verification (cross-tool — plan packets reference external
#      state that grep on internal docs cannot prove)
#   5. ≥ 2 unique target dimensions (single-dimension can't detect drift)
#
# Exit codes:
#   0 = pass (not a harvest disposition action OR all checks ok)
#   2 = block (intentional decision exit code per Claude Code hook protocol)

set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')

# Only enforce in the Orderly repo
case "$CWD" in
  *Orderly*) : ;;
  *) exit 0 ;;
esac

# Detect harvest disposition action
is_harvest_disposition=false

if [ "$TOOL_NAME" = "Bash" ]; then
  CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
  # rm -rf targeting docs/plans/{YYYYMMDD}-{slug}/ pattern
  if echo "$CMD" | grep -qE 'rm[[:space:]]+-rf?[[:space:]][^|;&]*docs/plans/[0-9]{8}-'; then
    is_harvest_disposition=true
  fi
fi

if [ "$TOOL_NAME" = "Edit" ]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
  if [[ "$FILE_PATH" == *"docs/plans/governance-ledger.md" ]]; then
    is_harvest_disposition=true
  fi
fi

if [ "$is_harvest_disposition" = "false" ]; then
  exit 0
fi

# === Enforce evidence file ===

EV_FILE="$CWD/.claude/.gov-harvest-evidence.json"

# Check 1: file exists
if [ ! -f "$EV_FILE" ]; then
  cat >&2 <<EOF
::error::[harvest-evidence-gate] Missing $EV_FILE.

orderly-doc-governance Hard Rule #11 (Plan Packet Truth Verification Gate)
requires §0 verification evidence persisted before harvest disposition
(rm -rf or governance-ledger entry).

Required schema:
{
  "run_id": "20260606-...",
  "timestamp": "ISO8601",
  "verifications": [
    {
      "command": "the actual command",
      "command_type": "grep|ls|git|gcloud|alembic|other",
      "target": "applied-claim|frozen-decision|verification-truth|external-state|commit-claim|migration-claim",
      "output_excerpt": "first ~80 chars of output",
      "timestamp": "ISO8601"
    }
  ],
  "disposition": "rm|keep|promote|partial-promote"
}

Write the file then retry. See
.claude/skills/orderly-doc-governance/SKILL.md
"Pre-Output Self-Check (harvest mode)" for guidance.
EOF
  exit 2
fi

# Check 2: timestamp ≤ 600 sec
mod_time=$(stat -f %m "$EV_FILE" 2>/dev/null || stat -c %Y "$EV_FILE")
now=$(date +%s)
age=$((now - mod_time))
if [ "$age" -gt 600 ]; then
  cat >&2 <<EOF
::error::[harvest-evidence-gate] $EV_FILE is stale (age ${age}s > 600s).
Re-run §0 verification before disposition — repo state may have changed.
EOF
  exit 2
fi

# Check 3: ≥ 3 verifications
n_verifs=$(jq '.verifications | length' "$EV_FILE" 2>/dev/null || echo 0)
if [ "$n_verifs" -lt 3 ]; then
  cat >&2 <<EOF
::error::[harvest-evidence-gate] Only $n_verifs verifications in $EV_FILE.
At least 3 required (covering §0.1 applied items + §0.2 frozen decisions
cross-ref + §0.3 verification truth claims). Add the missing dimensions.
EOF
  exit 2
fi

# Check 4: ≥ 1 non-grep verification
n_non_grep=$(jq '[.verifications[] | select(.command_type != "grep")] | length' "$EV_FILE" 2>/dev/null || echo 0)
if [ "$n_non_grep" -lt 1 ]; then
  cat >&2 <<EOF
::error::[harvest-evidence-gate] All verifications are grep-only.
Cross-tool verification required: at least one of {ls|git|gcloud|alembic|other}
because plan packets describe external state (commits, GCP, migrations) that
cannot be verified by grep on internal docs alone.

This is the failure mode this gate exists to prevent (see header provenance).
EOF
  exit 2
fi

# Check 5: ≥ 2 unique target dimensions
n_targets=$(jq '[.verifications[].target] | unique | length' "$EV_FILE" 2>/dev/null || echo 0)
if [ "$n_targets" -lt 2 ]; then
  cat >&2 <<EOF
::error::[harvest-evidence-gate] All verifications target the same dimension.
At least 2 unique target dimensions required (e.g. applied-claim +
verification-truth, OR frozen-decision + external-state). Single-dimension
verification cannot detect drift between internal docs and external state.
EOF
  exit 2
fi

# All checks passed
exit 0
