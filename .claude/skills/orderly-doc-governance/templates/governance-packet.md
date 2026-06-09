---
artifact_role: transient-work-artifact
run_id: ""
status: draft
lifecycle_action: retain
owner: orderly-doc-governance
source_of_truth: "current repo-state evidence + approved freeze decisions"
---

# Governance Packet

Merged from `scope-packet.md` + `rewrite-packet.md` + `execution-packet.md`. Use `packet_type` to distinguish.

## Packet Metadata

- Run ID:
- Packet ID:
- Packet Type: `scope` | `rewrite` | `execution`
- Scope / Families:
- Risk Level:
- Mode:
- Approval Class: `draft-only` | `execute-ready`
- Status:
- Review Status: `pending` | `reviewed` | `approved`

## Scope Snapshot

- Scope ID:
- Scope Type:
- Primary docs read:
- Secondary evidence:
- Current repo-state evidence:
- ADRs consulted:
- Derived surfaces touched:

## Preflight Result

- Rewrite required:
- Highest-risk cluster:
- Conflict classes seen:
- Product-decision blocker present:
- Docs-only safe before runtime change:

## Conflicts

| ID | Conflict Class | Drift Type | Evidence | Proposed Resolution | Decision Needed |
|----|----------------|------------|----------|---------------------|-----------------|

## MECE / Cardinality Issues

| Item | Problem | Impact |
|------|---------|--------|

## Vocabulary Violations

| Term | Location | Replacement | Source Ref |
|------|----------|-------------|------------|

## Decision Queue

| Decision ID | Question | Recommended Default | Status | Impacted Scopes |
|-------------|----------|---------------------|--------|-----------------|

## Legacy Debt Register

| Item | Current Meaning | Disposition | Why Not Now | Next Packet / Owner | Exit Trigger |
|------|-----------------|-------------|-------------|---------------------|--------------|

## ADR Impacts

| ADR | Impact Type | Related FR/US | Action |
|-----|-------------|---------------|--------|

## Write Sets

### Primary-Doc Write Set

| File | Scope | Change Type | Why |
|------|-------|-------------|-----|

### Derived-Surface Write Set

| File | Source Scope | Change Type | Auto Sync Allowed |
|------|--------------|-------------|-------------------|

### Exact Write Set (Execution)

| Family | Files / Surfaces | Change Type | Hold Allowed |
|--------|-------------------|-------------|--------------|

## Repo-State Evidence Snapshot

| Surface | Current State Evidence | Why It Matters |
|---------|------------------------|----------------|

## Derived Sync Manifest

| Derived File | Source of Truth | Allowed Operation | Notes |
|--------------|-----------------|-------------------|-------|

## Verification Commands

| Area | Command | Expected Result |
|------|---------|-----------------|

## Rollback / Downgrade

| Family | Rollback Trigger | Downgrade Path |
|--------|------------------|----------------|

## Approval Receipt

- Exact approval text:
- Approval class:
- Approved at:
- Approved scope / holds:
- Approval source:
- Status transition:

## Execution Readiness

- Reviewed:
- Decisions frozen:
- New blocker since review:
- Operating-state reconciled:
- Current active path:
- Execution start gate passed:

## Review Checklist

- [ ] Conflicts cite evidence
- [ ] Conflict classes are explicit
- [ ] Decision-bearing scopes are resolved or fenced
- [ ] Write set split into primary vs derived
- [ ] High-risk gate satisfied if required
- [ ] Unresolved blockers listed

## Next Artifact

- Recommended next artifact:
- Why this is not another planning loop:
- Expected approval text:

## Blockers

-
