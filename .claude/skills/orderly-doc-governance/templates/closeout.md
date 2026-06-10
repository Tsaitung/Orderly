---
artifact_role: transient-work-artifact
run_id: ""
status: draft
lifecycle_action: absorb-delete
owner: orderly-doc-governance
source_of_truth: "final state reconciliation + governance-ledger closeout entry"
---

# Closeout

Merged from `governance-ledger-entry.md` + `authority-matrix.md`. Covers both closeout entry and reconciliation.

## Authority Matrix

Use when reconciling README navigation, file headers, and governance-ledger state.

| File | README Category | Header Status / Authority | Ledger State | Final Category | Disposition | Owner | Reason |
|---|---|---|---|---|---|---|---|

Rules:
- Final category must align with the repo's canonical category schema
- `governance-ledger` overrides file header; file header overrides README
- README is a navigation mirror and must be updated only after the matrix is resolved

## Governance Ledger Entry

Write into `docs/governance/governance-ledger.md`.

- Run ID:
- Closed at:
- Scope:
- Outcome:
- Canonical truth updated:
- Promoted knowledge targets:
- Deleted artifact families:
- Residual promoted knowledge:
- Notes:

## Artifact Triage

| Artifact | Role | Lifecycle Action | Reason |
|----------|------|-----------------|--------|

Lifecycle actions: `retain`, `merge-forward`, `absorb-delete`, `delete`

## Deleted Artifacts

| File | Reason |
|------|--------|

## Retained Artifacts

| File | Role | Why Retained | Delete When |
|------|------|-------------|-------------|

## State Cleanup

- README active link cleared:
- Closed run workspace empty:
- Governance ledger updated:
- Promoted knowledge written:
