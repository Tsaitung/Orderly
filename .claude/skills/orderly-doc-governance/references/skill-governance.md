# Orderly Doc Governance Skill Governance

Static governance contract for the skill itself.

This file stores durable rules about how the skill is operated and retained. It is not a run-local state file and it is not a product-doc governance ledger.

## Purpose

`orderly-doc-governance` exists to govern 井然 Orderly documentation across:

- `docs/1-User-Story/`
- `docs/2-PRD/`
- `docs/0-Design/`
- `docs/adr/`
- derived traceability surfaces

The skill handles:

- drift detection
- decision-intake for semantic / ownership / compatibility conflicts
- reviewed rewrite packet generation
- execution gating
- artifact lifecycle cleanup

It does not own runtime implementation changes unless those changes are explicitly part of a separate approved execution packet.

## Static Scope

In scope for the skill package itself:

- `.claude/skills/orderly-doc-governance/`
- `docs/references/doc-governance-vocabulary.yaml`
- `docs/governance/governance-ledger.md`
- `docs/governance/runbooks/`

Out of scope for the skill package itself:

- cross-repo discovery / init
- runtime code changes
- permanent repo-level skill plan or handoff files

## Logging And State Model

The skill uses four layers of state:

1. Active execution state
- `docs/plans/<run-id>/run.md` — includes YAML frontmatter as structured state mirror
- `docs/plans/<run-id>/handoff.md`
- `docs/plans/<run-id>/stop-recovery.md`（pause condition 觸發時）
- `docs/plans/<run-id>/decisions-pending.md`（decision-intake mode）
- `docs/plans/<run-id>/extraction-report.md`（knowledge-harvest mode）

2. Non-execution mode snapshots
- `docs/plans/health-check-<YYYY-MM-DD>.md`（health-check mode 完成摘要）

3. Closed-run durable summary
- `docs/governance/governance-ledger.md`

4. Stable governance rules
- this file
- other skill `references/*.md`
- `docs/governance/runbooks/*.md`

### Frontmatter State Mirror

`run.md` YAML frontmatter is a **generated mirror** of the Markdown body state. In Phase 1, the Markdown body remains the authoritative source. The frontmatter provides structured access for faster state reads and future automation.

Frontmatter schema (v1):
- `run_id`: string
- `state`: FSM state (one of 9 defined states)
- `intent`: one of 5 intents
- `mode`: operational mode
- `scope`: array of scope IDs
- `risk_level`: `low-risk` | `high-risk`
- `current_stage`: current stage name
- `pause_reason`: P-code or null
- `missing_inputs`: array of strings
- `safe_progress`: array of completed items
- `approval_status`: `none` | `draft-approved` | `execution-approved`

Rules:

- Active blockers, waivers, completion notes, and decision outcomes belong in the active run-local workspace only.
- Closed runs must collapse into a governance-ledger entry and delete run-local state.
- Legacy repo-level skill plan/handoff filenames must not be recreated as permanent logging sinks.

## Durable Decisions

- Orderly-only v1; no cross-repo abstraction by default
- module-at-a-time segmentation is the default operating model
- `decision-intake` is first-class for unresolved design intent
- `formula-or-logic`, `unit-contract`, and `scope-or-ownership` conflicts require a decision packet before rewrite
- `docs-vs-runtime` drift must freeze compatibility boundaries explicitly
- reviewed work should compress toward execute-ready packets instead of looping through new planning artifacts
- `draft approval` and `execution approval` must be distinguished
- legacy debt requires explicit disposition and may not be vague-deferred twice
- all write sets and patches must be grounded in current repo-state evidence
- navigation-index (`docs/INDEX.md` + per-dir `INDEX.md`) ADR cross-reference remains an output contract, not an input assumption
- content governance is promotion-first, not retention-first
- plan/design/handoff/reference scopes must pass `Content Ownership Extraction Gate` before retain/freeze/delete
- retained plans may not contain unpromoted canonical truth or reusable operational rule
- inspect-only mode must enforce content residency before closing: docs/plans/ files with ≥30% non-execution-sequencing content may not pass as healthy
- Reference files with explicit historical-only authority header are exempt from content residency extraction (historical-evidence carve-out)
- folder location is discovery prior only, never final authority
- large-scale knowledge harvest uses `parallel extraction -> central merge -> write-set lock -> parallel writeback`
- shared canonical homes remain orchestrator-owned during merge/lock

## Long-Term Follow-Ups

| ID | Item | Status |
|----|------|--------|
| F-001 | Populate live navigation-index (`docs/INDEX.md` + per-dir `INDEX.md`) ADR cross-reference tables during a real governance execution run | Pending |
| F-002 | Validate `doc-updater` derived-sync manifest flow during a real governance execution run | Pending |
| F-003 | Add machine-readable run / decision state to reduce Markdown-heavy orchestration | In Progress — Phase 1 frontmatter mirror shipped |
| F-004 | Decide whether to add a cross-repo config seam after Orderly proves stable as a reference implementation | Deferred |

## Migration Note

This file replaces the old repo-level skill state sink pattern that used dedicated repo-level skill plan/handoff files.

The migration is complete only after:

- the skill no longer references those files
- active run-local state is written only under `docs/plans/<run-id>/`
- closed-run summaries are written to `docs/governance/governance-ledger.md`
