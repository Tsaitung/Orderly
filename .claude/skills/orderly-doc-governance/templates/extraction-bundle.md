---
artifact_role: transient-work-artifact
run_id: ""
status: draft
lifecycle_action: retain
owner: orderly-doc-governance
source_of_truth: "content ownership scan + promotion target map"
---

# Extraction Bundle

Merged from `section-disposition-table.md` + `promotion-target-map.md` + `promotion-merge-map.md` + `write-set-lock.md` + `extraction-report.md`. Single document for the entire extraction flow.

## Extraction Metadata

- Source files:
- Knowledge domains:
- Canonical home candidates:
- Dependent surfaces:

## Section Disposition Table

| File | Section | Current Role | Target Destination | Action | Notes |
|------|---------|--------------|-------------------|--------|-------|

Action vocabulary: `keep`, `promote`, `freeze`, `absorb+delete`, `hold-until-migration`

Rules:
- Every retained source file must have all non-trivial sections classified
- `canonical-business-truth`, `technical-contract-truth`, and `reusable-operational-rule` may not remain in plans without explicit reason
- If `non-plan sections >= 30%`, mandatory extraction

## Promotion Target Map

| Source File | Section / Knowledge Unit | Destination File | Destination Role | Required Action | Status |
|---|---|---|---|---|---|

Destination Role vocabulary: `canonical-business-truth`, `technical-contract-truth`, `reusable-operational-rule`, `historical-evidence`, `execution-sequencing`

Rules:
- No extraction may proceed without a canonical home
- If destination does not exist, create first or open blocker
- Source slimming must describe what remains after promotion

## Promotion Merge Map

### Inputs

- `source_docs`:
- `extraction_reports`:

### Canonical Destinations

| Destination | Incoming Sections | Owner | Collision? | Resolution |
|---|---|---|---|---|

### Merge Decisions

- unique destination choices:
- deferred items:
- blockers requiring decision packet:

### Ready For Writeback

- `yes/no`
- reason:

## Write-Set Lock

### Shared Files (Orchestrator Only)

- `README`
- `governance-ledger`
- `runbooks`
- other shared references/specs as applicable

### Writer Ownership

| Writer | Files Owned | Upstream Inputs | Stop Condition |
|---|---|---|---|

### Collision Check

- overlapping files:
- result:

### Lock Result

- `locked` | `blocked`
- notes:

## Shared-Target Warnings

- `none` or list collisions / ambiguous destinations

## Recommended Next Step

- `merge`
- `single-writer patch`
- `needs decision packet`
