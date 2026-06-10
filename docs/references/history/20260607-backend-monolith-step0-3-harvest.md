# Harvest Extraction Report — `20260607-backend-monolith-step0-3`

- **Harvest run**: orderly-doc-governance `harvest` mode, 2026-06-09
- **Target packet**: `docs/plans/20260607-backend-monolith-step0-3/` (run.md + codex-review-1..5)
- **Disposition**: promote-then-delete (`rm -rf`) — default per plan-residency §Source Disposition Decision Tree rule 2
- **Permanent homes**: decision → [ADR-0003](../../adr/ADR-0003-backend-modular-monolith-consolidation.md); closeout → [governance-ledger](../../governance/governance-ledger.md); this file → §0 audit trail
- **Machine-readable evidence**: `.claude/.gov-harvest-evidence.json` (hook-gated)

This packet recorded STEP 0-3 of the backend 9→1 modular-monolith migration. Its embedded "STEP 4-9 Execution Update" was already self-declared **superseded** by the sibling packet `docs/plans/20260607-backend-monolith-step4-9/` (run.md line 13). Sibling `closure-run.md` is the canonical STEP 4-9 closure.

---

## §0 Verification Evidence (Hard Rule #11)

Every `applied / complete / executed / verified` claim was實證 against current `main` HEAD (`065d876`) before disposition. **Zero drift** on the packet's own STEP 0-3 claims.

| # | Claim (packet) | Target dim | Command | Output | Verdict |
|---|----------------|-----------|---------|--------|---------|
| 1 | STEP 0 pyproject created | applied-claim | `ls backend/libs/pyproject.toml` | exists | ✅ |
| 2 | `from libs.orderly_fastapi_core` removed | applied-claim | `grep -rln "from libs.orderly_fastapi_core" backend \| wc -l` | `0` | ✅ |
| 3 | STEP 2 — 9 modules re-rooted | applied-claim | `ls -d backend/app/modules/*/` | 9 dirs (users, orders, products, acceptance, billing, notifications, customer_hierarchy, suppliers, gateway_compat) | ✅ |
| 4 | STEP 3 composition root + restart | applied-claim | `ls backend/app/main.py .claude/restart.yaml` | both exist | ✅ |
| 5 | STEP 1b dead `sku.py` deleted | applied-claim | `ls .../product-service-fastapi/app/models/sku.py` + `ls backend/app/modules/products/models/sku.py` | both absent | ✅ |
| 6 | 8 commit SHAs landed | commit-claim | `git log --oneline -1 <sha>` × {db1d2c5,de26b84,c34f6c7,4356887,64a81cd,448badd,7dd5e51,fd9d852} | all found on main | ✅ |
| 7 | monolith alembic chain | migration-claim | `ls backend/app/alembic/versions/` | `0001_consolidated_schema` .. `0004_auth_refactor_social_only` | ✅ |
| 8 | T1c — 4 CH tables "no migration, deferred" | verification-truth | `grep "create_table('activity_metrics'..." backend/app/alembic` = 0; `_consolidated_schema.py` uses `unified_metadata.create_all(bind)`; `customer_hierarchy/models/__init__.py:19,30-33,46-49` imports the 4 models into unified Base.metadata | **debt RESOLVED on main** — `create_all` builds the 4 tables via metadata reflection (no literal `op.create_table`). Packet's "open debt" claim is superseded by step4-9 create_all strategy, NOT live drift | ✅ |
| 9 | single SQLAlchemy Base (step4-9) | verification-truth | `grep -c declarative_base backend/app/db/base.py` | `1` | ✅ |

**Drift detection**: none. No `P-PACKET-DRIFT`. The only nuance (item 8) is a documented supersession the packet itself acknowledged (run.md §執行後驗證稽核 a), not a contradiction. Verification prevented promoting a phantom open-debt to `deprecation-roadmap`.

---

## §1-2 Inventory + Classify (9-class)

| # | Durable knowledge | 9-class | Promotion target | Status |
|---|-------------------|---------|------------------|--------|
| 1 | 9 distributed-monolith FastAPI services → modular monolith (`backend/app/modules/<svc>` + composition root `backend/app/main.py`); real trade-off vs keep-microservices / one-shot-merge | `architectural-decision-frozen` | **ADR-0003** | ✅ promoted |
| 2 | D2 (billing included), D3 (`/api/api/suppliers` accepted), D-gw (gateway_compat middleware-only, no proxy; alias via dual-mount) | `architectural-decision-frozen` (sub) | ADR-0003 §子決策 | ✅ folded |
| 3 | T1c — 4 customer_hierarchy tables | `tech-debt-with-exit-trigger` | **none** — resolved on main (item 8); recorded as ADR-0003 Consequences note | ✅ not a live debt |
| 4 | Frozen contract list (login JSON shape, dual-prefix, list envelope) — PRESERVED existing contracts | `wire-contract` | backend code + frontend = source of truth (unchanged); no promotion | n/a (unchanged) |
| 5 | 3 contract-table doc typos (notifications `/notifications`, `/api/suppliers/suppliers` not `/api/api/...`, `v1/skus` gap) — audit notes on existing routes | `wire-contract` (accuracy) | runtime curl follow-up executed in step4-9 V3 frozen-contract closure | n/a (verified downstream) |
| 6 | `/restart` monolith profile + throwaway-DB alembic verify procedure | `operator-procedure` | `.claude/restart.yaml` IS the code (source of truth, retained); procedure covered by `restart-authoring` skill | n/a (already code) |
| 7 | 5-round Codex adversarial review + post-execution audit | `incident-postmortem` / historical | git history + this §0 + ADR-0003 Provenance note | ✅ (git preserves) |
| 8 | Closeout (run-id, scope, result, commits) | `closeout-summary` | **governance-ledger** | ✅ promoted |

## §3 Promote — done in this run

- ADR-0003 created + registered in `docs/adr/README.md` ledger.
- governance-ledger closeout row appended.
- `docs/plans/README.md` step0-3 row removed (replaced by retired pointer).

## §4 Rewrite References

- `docs/plans/README.md`: active row → retired pointer to ADR-0003 + ledger + this file.
- step4-9 `closure-run.md` mention of the old step0-3 run.md is **historical narrative** (describing a past wrong claim), not an active link → not an orphan per plan-residency §Step 4. step4-9 itself is a transient packet pending its own harvest.

## §5 Disposition

`rm -rf docs/plans/20260607-backend-monolith-step0-3/`. No KEEP condition met (work done+merged on main, no active decision packet, no live ≤7-day handoff). git history preserves the deleted files.

## Cross-Packet Flag

`20260607-backend-monolith-step4-9/` is the companion canonical closure of the SAME migration and is **still unharvested**. Recommend harvesting it next; its structural STEP 4-9 decisions (consolidated Base / single alembic / single Cloud Run deploy) may amend ADR-0003 (cited there by commit, not by packet path, so deleting either packet leaves no dangling ADR ref).
