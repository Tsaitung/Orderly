# Handoff — orderly-doc-governance adapt

**Plan:** `docs/plans/20260609-orderly-doc-governance-adapt/run.md`
**Branch:** `feat/orderly-doc-governance`
**Gate:** `.claude/plan-gate-pass.json`
**Risk:** high · **Execution mode:** inline (single-agent bounded batches)
**Self-review rounds:** 1 · **Codex rounds:** 2 (APPROVED)

## Next Exact Step

Task 1, Step 1 — file-level checkout of the skill folder + 3 hooks from the stale branch:
```bash
SRC=feat/orderly-doc-gov-and-refactoring
git checkout $SRC -- .claude/skills/orderly-doc-governance/
git checkout $SRC -- .claude/hooks/gov-healthcheck-gate.sh \
                     .claude/hooks/gov-healthcheck-validate.sh \
                     .claude/hooks/harvest-evidence-gate.sh
```
Then `git status --porcelain` to confirm only the 20 skill files + 3 hooks are staged, `chmod +x` the hooks, and commit (Task 1 Step 3).

## Task order

1. T1 — extract skill folder + 3 hooks (checkout + commit)
2. T2 — extract net-new canonical docs (incl. business-invariants re-home to 0-Design) (checkout + commit)
3. T3 — re-point Class A (docs flat → numbered) + commit
4. T4 — re-point Class B (curated-doc home, 6 files) + inverted-history note + **rewrite ADR-0001** + commit
5. T5 — re-point Class C (`-fastapi` → monolith, incl. stage-gates.md + alembic nuance) + commit
6. T6 — hand-merge docs/INDEX.md + commit
7. T7 — register 3 hooks in `.claude/settings.json` + fire-test + commit
8. T8 — final four-part grep oracle (must == 0) — verification only, record results here
9. T9 — open PR to main (STOP, await user go-ahead before push)

## DONE oracle (Task 8 Step 4)

Four greps over `.claude/skills/orderly-doc-governance .claude/hooks docs/{governance,references,incidents,adr} docs/0-Design/business-invariants.md docs/plans/governance-ledger.md` must ALL return empty:
1. Class A: `docs/system-spec|docs/prd|docs/user-stories|docs/testing`
2. Class B: `docs/plans/(CI-CD-ARCHITECTURE|CI-CD-PARITY|ci-secrets|DEPLOYMENT-CHECKLIST|DEPLOYMENT-ENVIRONMENTS|DEPLOYMENT-TROUBLESHOOTING|DEVELOPMENT-PLAN|docker-deployment-guide|Infra-Runbook|PERFORMANCE-OPTIMIZATION-SUMMARY|PRD-US-GAP-REPORT|STATUS-SUMMARY|todo|CI-CD-TROUBLESHOOTING-GUIDE)`
3. Class C: `-fastapi`
4. ADR-0001: `system-spec|settings\.local\.json|228 處` in `docs/adr/ADR-0001-*.md`

## Dirty-tree policy

- `git add` exact paths only (never `-A`/`.`).
- No unrelated paths staged. No intentional dirty paths recorded.

## Constraints (load-bearing)

- NEVER merge/rebase/cherry-pick `feat/orderly-doc-gov-and-refactoring` — file-level checkout only.
- NEVER create a flat-taxonomy path (`docs/system-spec/`, `docs/prd/`, `docs/user-stories/`, `docs/testing/`).
- `docs/plans/` bare is legit on main (run packets / governance-ledger / runbooks / health-check) — only the curated-doc *filenames* move to `docs/3-Development-Plan/`.
- T9: do NOT push without explicit user go-ahead.

## Verification log (fill during execution)

- T8 Class A: _pending_
- T8 Class B: _pending_
- T8 Class C: _pending_
- T8 ADR-0001: _pending_
- T7 hook fire-test exit codes: _pending_
