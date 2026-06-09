# Adapt orderly-doc-governance Skill onto main's Numbered Docs Taxonomy

**Goal:** Land a *working* `orderly-doc-governance` skill on `main`'s real (numbered) docs taxonomy — not a cosmetic copy whose references point at non-existent flat-taxonomy paths.

**Architecture:** File-level extraction (`git checkout <stale-branch> -- <paths>`) of a fully-built skill from a stale branch (`feat/orderly-doc-gov-and-refactoring`, 120 commits behind main, never merged), followed by a targeted re-point sweep that rewrites every dangling path reference (docs taxonomy + backend monolith layout) to match `main`, plus creation of net-new canonical-home docs, INDEX hand-merge, and hook registration so the skill's gates actually fire.

**Tech Stack:** Bash (`git checkout` / `grep` / `jq`), Markdown/YAML/JSON skill assets, Claude Code hook config (`.claude/settings.json`).

**Risk:** HIGH — cross-module + governance-contract. Codex adversarial review will run.

**Date:** 2026-06-09 · **Branch:** `feat/orderly-doc-governance` (forked off `origin/main` @ e52be22)

---

## Goals / Why

The `orderly-doc-governance` skill (HelloGlow-style: SKILL.md + 4 evals + 9 references + 6 templates + 3 hooks) exists ONLY on a stale branch wired to a **flat** docs taxonomy (`docs/system-spec`, `docs/prd`, `docs/user-stories`, `docs/testing`) and the **old microservice** backend layout (`backend/<svc>-fastapi/`). `main` never adopted either: it uses a **numbered** taxonomy (`docs/0-Design`, `docs/1-User-Story`, `docs/2-PRD`, `docs/3-Development-Plan`, `docs/4-Test`, `docs/plans`) and a **modular monolith** backend (`backend/app/modules/<svc>/`).

A naive copy would install a skill that tells every future agent to `grep docs/prd/...` and `backend/billing-service-fastapi/...` — paths that do not exist on `main`. That is the explicit anti-goal. This plan makes the skill internally consistent with `main`'s real tree, and turns the 3 prose-only hooks into real (registered) enforcement.

## In Scope

1. Extract the skill folder (20 files) + 3 hooks + 7 net-new canonical-home docs (incl. ADR set) from the stale branch via file-level `git checkout`.
2. Re-point **all three classes** of dangling references to `main`'s structure:
   - **Class A** — docs flat taxonomy → numbered (37 refs in 7 skill files + 8 refs in 3 ported docs).
   - **Class B** — curated-dev-doc home (`docs/plans/<curated>.md` → `docs/3-Development-Plan/`) across 6 files (project-paths/stage-gates/plan-residency/smoke.json/deprecation-roadmap) + rewrite the inverted-history note + **rewrite ADR-0001** (an `accepted` ADR recording the false flat-rename decision + `settings.local.json` wiring) to record main's actual choice.
   - **Class C** — backend microservice paths (`backend/<svc>-fastapi/app/{api,schemas,models}/` → `backend/app/modules/<svc>/`) (8 refs in 3 skill files + 1 hook comment).
3. Re-home `business-invariants.md` to `docs/0-Design/business-invariants.md`; create net-new homes `docs/governance/`, `docs/references/`, `docs/incidents/`, `docs/adr/`, `docs/plans/governance-ledger.md`.
4. Hand-merge new doc entries into `main`'s existing `docs/INDEX.md`.
5. Register all 3 hooks in `.claude/settings.json` (Stop / PreToolUse / PostToolUse) and verify each fires. *(Decision Queue D-1 resolved: register — user confirmed 2026-06-09.)*
6. Verify: SKILL.md frontmatter valid; all `references/` paths resolve on `main`; evals present; four-part grep oracle (Class A docs taxonomy + Class B curated-doc filenames + Class C `-fastapi` + ADR-0001 assertion) returns 0 dangling refs.
7. Open a PR to `main` (await user go-ahead before push/merge).

## Out of Scope

- **Do NOT** merge/rebase/cherry-pick the stale branch. Its 120-commit divergence re-introduces the flat-taxonomy reorg and undoes `main`'s file-reorg (PR #13). Extraction is file-level checkout only.
- **Do NOT** bring the flat-taxonomy docs reorg, env-port changes, or cruft-cleanup commits from the stale branch.
- **Do NOT** author new governance run-state, run a governance health-check, or harvest any plan packet. This plan installs the *capability*, it does not *exercise* it.
- **Do NOT** rewrite the internal substance of the skill's logic/evals beyond path re-pointing and the factual inverted-history correction. No feature changes.
- **Do NOT** change `main`'s docs taxonomy itself. The skill adapts to the tree; the tree does not move.
- Backend per-module internal sub-layout audit (does each monolith module actually have `api/schemas/models/` subdirs?) is verified for path-string correctness only; deep reconciliation of the wire-contract subpaths is best-effort to the monolith convention, not a full backend audit.

## Complexity Budget

- New dirs: 4 (`docs/governance/`, `docs/references/`, `docs/incidents/`, `docs/adr/`)
- New files brought in: 27 (20 skill + 3 hooks + ... ported docs counted under "ported")
- Ported canonical-home docs: 10 (deprecation-roadmap, canonical-vocabulary, doc-governance-vocabulary.yaml, business-invariants→re-homed, incidents/README, governance-ledger, ADR-0001, ADR-0002, ADR-template, adr/README)
- New config file: 1 (`.claude/settings.json` — hooks block)
- Edited docs: 1 (`docs/INDEX.md` hand-merge)
- New dependency: 0
- New endpoint / migration: 0

## File Structure

### Bring in as-is (file-level checkout, then re-point in later tasks)

| Path | Action | Responsibility |
|------|--------|----------------|
| `.claude/skills/orderly-doc-governance/` (20 files) | Create (checkout) | The skill: SKILL.md + 4 evals + 9 references + 6 templates |
| `.claude/hooks/gov-healthcheck-gate.sh` | Create (checkout) | Stop hook: block session end if health-check scope marker unfulfilled |
| `.claude/hooks/gov-healthcheck-validate.sh` | Create (checkout) | PostToolUse hook: validate health-check output required fields on Write |
| `.claude/hooks/harvest-evidence-gate.sh` | Create (checkout) | PreToolUse hook: block harvest disposition without §0 evidence file |

### Ported canonical-home docs (checkout, re-home, then re-point)

| Stale path | Main path | Action | Responsibility |
|------------|-----------|--------|----------------|
| `docs/governance/deprecation-roadmap.md` | `docs/governance/deprecation-roadmap.md` | Create | tech-debt-with-exit-trigger home |
| `docs/references/canonical-vocabulary.md` | `docs/references/canonical-vocabulary.md` | Create | naming-canonical home |
| `docs/references/doc-governance-vocabulary.yaml` | `docs/references/doc-governance-vocabulary.yaml` | Create | vocabulary schema |
| `docs/system-spec/business-invariants.md` | `docs/0-Design/business-invariants.md` | Create (re-home) | business invariants (system-spec→0-Design) |
| `docs/incidents/README.md` | `docs/incidents/README.md` | Create | incident-postmortem home |
| `docs/plans/governance-ledger.md` | `docs/plans/governance-ledger.md` | Create | closeout-summary ledger (docs/plans exists on main) |
| `docs/adr/ADR-0001-docs-structure-and-governance-alignment.md` | same | Create | ADR-0001 |
| `docs/adr/ADR-0002-hybrid-gcp-identity.md` | same | Create | ADR-0002 |
| `docs/adr/ADR-template.md` | same | Create | ADR template |
| `docs/adr/README.md` | same | Create | ADR index |

### Edit / create on main

| Path | Action | Responsibility |
|------|--------|----------------|
| `.claude/settings.json` | Create | Register 3 hooks (Stop / PreToolUse / PostToolUse) |
| `docs/INDEX.md` | Modify | Hand-merge new canonical-home entries (governance / references / incidents / adr / 0-Design business-invariants) |

## Taxonomy & Path Mapping (load-bearing — verified against real `main` tree)

### Class A — docs flat → numbered

| stale (flat) | main (numbered) | verified on main |
|---|---|---|
| `docs/system-spec/` | `docs/0-Design/` | ✓ has api-specification.yaml, API-Endpoints-Essential.md, Frontend-Backend-Endpoint-Consistency.md, design-system/ |
| `docs/prd/` (PRD-*.md) | `docs/2-PRD/` (PRD-*.md) | ✓ named convention identical |
| `docs/user-stories/` (by-module/by-role/playbooks/) | `docs/1-User-Story/` (same subdirs) | ✓ by-module filenames `01..09-*.md` identical |
| `docs/testing/` | `docs/4-Test/` | ✓ |

### Class B — curated-dev-doc home (handoff table MISSED this)

| stale claim (in project-paths.md) | main reality | fix |
|---|---|---|
| `docs/plans/` root holds CI-CD-ARCHITECTURE.md, DEPLOYMENT-*.md, DEVELOPMENT-PLAN.md, ci-secrets.md, PERFORMANCE-OPTIMIZATION-SUMMARY.md, PRD-US-GAP-REPORT.md, Infra-Runbook.md | those live in `docs/3-Development-Plan/`; `docs/plans/` holds dated run packets + README only | re-point the "curated-durable-doc" section to `docs/3-Development-Plan/` |
| inverted-history note (project-paths.md:5-6): "docs/ 在 2026-06-06 由編號式…改名為…扁平命名" | `main` NEVER renamed; it kept numbered. The note is factually false on `main`. | rewrite the background note to state `main` uses numbered taxonomy (no flat rename happened) |

> `docs/plans/governance-ledger.md`, `docs/plans/runbooks/`, `docs/plans/health-check-*.md`, dated `docs/plans/{run-id}/` stay under `docs/plans/` — unchanged, correct on `main`.

### Class C — backend microservice → modular monolith (handoff table MISSED this)

| stale | main | verified |
|---|---|---|
| `backend/<svc>-fastapi/app/{api,schemas,models}/` | `backend/app/modules/<svc>/` | ✓ NO `*-fastapi` dirs on main; modules = users, orders, products, acceptance, billing, notifications, customer_hierarchy, suppliers |
| svc names: user/order/product/notification/customer-hierarchy (singular/hyphen) | monolith: users/orders/products/notifications/customer_hierarchy (plural/underscore) | map per module |
| `shared/types/` | `shared/types/` | ✓ unchanged |

## Risks & Open Questions

- **R1 (High):** Re-point misses a reference class. Mitigated by the grep oracle covering Class A (`docs/system-spec|docs/prd|docs/user-stories|docs/testing`) AND Class C (`backend/[a-z-]+-fastapi`). Acceptance gate requires both → 0.
- **R2 (Medium):** `git checkout <stale> -- <path>` accidentally stages an unintended file. Mitigated by explicit per-path checkout + `git status` review after each batch (never `git add -A`).
- **R3 (Medium):** Backend monolith module internal layout (`api/schemas/models/`) may not match the old fastapi layout 1:1, leaving wire-contract subpaths imprecise. Mitigated by mapping to the documented monolith convention `backend/app/modules/<svc>/` and noting the subpath as best-effort (Out of Scope guard already records this).
- **R4 (Low):** Hook registration schema typo prevents firing. Mitigated by manual hook-trigger verification (pipe mock JSON / create marker) — not just "wrote settings.json".
- **R5 (Low):** `docs/INDEX.md` hand-merge diverges from `main`'s simple 5-category style. Mitigated by appending a minimal "Governance & References" section consistent with existing format.

## Decision Queue

- **D-1 (RESOLVED 2026-06-09):** Register the 3 hooks in `.claude/settings.json` so they actually fire. User chose "註冊讓 hook 生效". Rationale: matches global rule #9 (deterministic gate → hook not prose) + handoff "working not cosmetic" goal. The worktree path contains `Orderly`, so `harvest-evidence-gate.sh`'s `*Orderly*` CWD guard will match.

---

## Tasks

### Task 1: Extract skill folder + 3 hooks (file-level checkout)

**Files:** `.claude/skills/orderly-doc-governance/` (20), `.claude/hooks/{gov-healthcheck-gate,gov-healthcheck-validate,harvest-evidence-gate}.sh`

- [ ] **Step 1:** Checkout skill folder + hooks from stale branch.
```bash
SRC=feat/orderly-doc-gov-and-refactoring
git checkout $SRC -- .claude/skills/orderly-doc-governance/
git checkout $SRC -- .claude/hooks/gov-healthcheck-gate.sh \
                     .claude/hooks/gov-healthcheck-validate.sh \
                     .claude/hooks/harvest-evidence-gate.sh
```
- [ ] **Step 2:** Confirm exactly the expected paths are staged, nothing else.
```bash
git status --porcelain
# Expect: 20 skill files + 3 hooks, all under .claude/skills/orderly-doc-governance/ and .claude/hooks/. Nothing outside.
chmod +x .claude/hooks/gov-healthcheck-gate.sh .claude/hooks/gov-healthcheck-validate.sh .claude/hooks/harvest-evidence-gate.sh
ls -l .claude/hooks/*.sh
```
- [ ] **Step 3:** Commit (extraction checkpoint).
```bash
git add .claude/skills/orderly-doc-governance/ .claude/hooks/gov-healthcheck-gate.sh .claude/hooks/gov-healthcheck-validate.sh .claude/hooks/harvest-evidence-gate.sh
git commit -m "feat(doc-governance): extract skill folder + 3 hooks from stale branch (pre-repoint)"
```

### Task 2: Extract net-new canonical-home docs (checkout, with business-invariants re-home)

**Files:** `docs/governance/`, `docs/references/`, `docs/incidents/`, `docs/adr/`, `docs/plans/governance-ledger.md`, `docs/0-Design/business-invariants.md`

- [ ] **Step 1:** Checkout the directly-homed docs (paths identical on main).
```bash
SRC=feat/orderly-doc-gov-and-refactoring
git checkout $SRC -- docs/governance/deprecation-roadmap.md \
                     docs/references/canonical-vocabulary.md \
                     docs/references/doc-governance-vocabulary.yaml \
                     docs/incidents/README.md \
                     docs/plans/governance-ledger.md \
                     docs/adr/ADR-0001-docs-structure-and-governance-alignment.md \
                     docs/adr/ADR-0002-hybrid-gcp-identity.md \
                     docs/adr/ADR-template.md \
                     docs/adr/README.md
```
- [ ] **Step 2:** Re-home `business-invariants.md` from `docs/system-spec/` to `docs/0-Design/` (checkout to a temp then move, since the stale path differs from the target).
```bash
git show $SRC:docs/system-spec/business-invariants.md > docs/0-Design/business-invariants.md
```
- [ ] **Step 3:** Confirm staged set; verify nothing landed under `docs/system-spec/`.
```bash
git status --porcelain
test ! -e docs/system-spec/business-invariants.md && echo "OK: not re-created under flat path"
ls docs/governance docs/references docs/incidents docs/adr docs/0-Design/business-invariants.md docs/plans/governance-ledger.md
```
- [ ] **Step 4:** Commit (canonical-home checkpoint, still pre-repoint).
```bash
git add docs/governance docs/references docs/incidents docs/adr docs/plans/governance-ledger.md docs/0-Design/business-invariants.md
git commit -m "feat(doc-governance): bring in net-new canonical-home docs (business-invariants re-homed to 0-Design)"
```

### Task 3: Re-point Class A (docs flat → numbered) across skill + ported docs

**Files:** 7 skill files (SKILL.md, evals/harvest-truth-verification.json, references/{authority-chain,plan-residency,project-paths,skill-governance,stage-gates}.md) + 3 ported docs (docs/adr/ADR-template.md, docs/plans/governance-ledger.md, docs/0-Design/business-invariants.md)

Apply these substitutions (whole-path, in order — longest/most-specific first to avoid partial clobber):

| from | to |
|------|----|
| `docs/system-spec/api-specification.yaml` | `docs/0-Design/api-specification.yaml` |
| `docs/system-spec/API-Endpoints-Essential.md` | `docs/0-Design/API-Endpoints-Essential.md` |
| `docs/system-spec/Frontend-Backend-Endpoint-Consistency.md` | `docs/0-Design/Frontend-Backend-Endpoint-Consistency.md` |
| `docs/system-spec/business-invariants.md` | `docs/0-Design/business-invariants.md` |
| `docs/system-spec/` | `docs/0-Design/` |
| `docs/system-spec` (bare, e.g. in eval grep lists) | `docs/0-Design` |
| `docs/prd/` | `docs/2-PRD/` |
| `docs/prd` (bare) | `docs/2-PRD` |
| `docs/user-stories/` | `docs/1-User-Story/` |
| `docs/user-stories` (bare) | `docs/1-User-Story` |
| `docs/testing/` | `docs/4-Test/` |
| `docs/testing` (bare) | `docs/4-Test` |

- [ ] **Step 1:** Re-point each file. Use targeted Edit per occurrence (NOT blind sed, to preserve surrounding prose like "Orderly 沒有 HelloGlow 的…"). Work file-by-file:
  - `.claude/skills/orderly-doc-governance/references/project-paths.md` (most refs; also Class B here — see Task 4)
  - `.claude/skills/orderly-doc-governance/references/authority-chain.md`
  - `.claude/skills/orderly-doc-governance/references/plan-residency.md`
  - `.claude/skills/orderly-doc-governance/references/skill-governance.md`
  - `.claude/skills/orderly-doc-governance/references/stage-gates.md`
  - `.claude/skills/orderly-doc-governance/SKILL.md`
  - `.claude/skills/orderly-doc-governance/evals/harvest-truth-verification.json`
  - `docs/adr/ADR-template.md`
  - `docs/plans/governance-ledger.md`
  - `docs/0-Design/business-invariants.md`
- [ ] **Step 2:** Verify Class A grep oracle → 0.
```bash
grep -rnE 'docs/system-spec|docs/prd|docs/user-stories|docs/testing' \
  .claude/skills/orderly-doc-governance docs/governance docs/references docs/incidents docs/adr docs/0-Design/business-invariants.md docs/plans/governance-ledger.md
# Expected: NO output (exit 1). Any hit = unfinished.
```
- [ ] **Step 3:** Spot-check 2 re-pointed targets resolve on main (e.g. `ls docs/2-PRD/PRD-Billing-Master.md docs/1-User-Story/by-module/03-order-management.md`).
- [ ] **Step 4:** Commit.
```bash
git add .claude/skills/orderly-doc-governance docs/adr/ADR-template.md docs/plans/governance-ledger.md docs/0-Design/business-invariants.md
git commit -m "fix(doc-governance): re-point docs flat taxonomy -> numbered (Class A)"
```

### Task 4: Re-point Class B (curated-dev-doc home) + fix inverted-history note + rewrite ADR-0001

**Files:** `.claude/skills/orderly-doc-governance/references/project-paths.md`, `references/stage-gates.md`, `references/plan-residency.md`, `evals/smoke.json`, `docs/governance/deprecation-roadmap.md`, `docs/adr/ADR-0001-docs-structure-and-governance-alignment.md`

> **Codex Round-1 M3 + M1:** Class-B refs are NOT confined to `project-paths.md`. Full set (verified): `project-paths.md:68` (`docs/plans/Infra-Runbook.md`, `docs/plans/runbooks/`), `stage-gates.md:103` + `plan-residency.md:21,146` (`docs/plans/todo.md` alt-home), `evals/smoke.json:9` (`docs/plans/CI-CD-ARCHITECTURE.md`), `docs/governance/deprecation-roadmap.md:17` (`docs/plans/CI-CD-TROUBLESHOOTING-GUIDE.md` / `DEVELOPMENT-PLAN.md` / `DEPLOYMENT-TROUBLESHOOTING.md`). **`docs/plans/` itself is legit on main** (run packets, governance-ledger, runbooks/, health-check), so the Class-B oracle targets the *specific 3-Development-Plan filenames*, not the bare dir.

Class-B mapping: a curated dev-doc filename under `docs/plans/` → `docs/3-Development-Plan/`. The real resident set on main is `{CI-CD-ARCHITECTURE, CI-CD-PARITY, ci-secrets, DEPLOYMENT-CHECKLIST, DEPLOYMENT-ENVIRONMENTS, DEPLOYMENT-TROUBLESHOOTING, DEVELOPMENT-PLAN, docker-deployment-guide, Infra-Runbook, PERFORMANCE-OPTIMIZATION-SUMMARY, PRD-US-GAP-REPORT, STATUS-SUMMARY}`. `docs/plans/todo.md` does not exist on either branch (illustrative alt-home) — re-point its prefix to `docs/3-Development-Plan/todo.md` for consistency. `docs/plans/runbooks/` stays under `docs/plans/` (net-new runbook home, correct on main).

- [ ] **Step 1:** In `project-paths.md`, re-point the `curated-durable-doc` section so the curated dev-doc home is `docs/3-Development-Plan/` (CI-CD-ARCHITECTURE.md, DEPLOYMENT-*.md, DEVELOPMENT-PLAN.md, ci-secrets.md, PERFORMANCE-OPTIMIZATION-SUMMARY.md, PRD-US-GAP-REPORT.md). Re-point `docs/plans/Infra-Runbook.md` → `docs/3-Development-Plan/Infra-Runbook.md` (line 68). Keep `docs/plans/{run-id}/`, `governance-ledger.md`, `runbooks/`, `health-check-*.md` under `docs/plans/`.
- [ ] **Step 2:** Re-point `docs/plans/todo.md` → `docs/3-Development-Plan/todo.md` in `stage-gates.md:103` and `plan-residency.md:21,146`.
- [ ] **Step 3:** Re-point `evals/smoke.json:9` `docs/plans/CI-CD-ARCHITECTURE.md` → `docs/3-Development-Plan/CI-CD-ARCHITECTURE.md`.
- [ ] **Step 4:** Re-point the curated-doc names in `docs/governance/deprecation-roadmap.md:17` (`docs/plans/DEVELOPMENT-PLAN.md` → `docs/3-Development-Plan/DEVELOPMENT-PLAN.md`, `docs/plans/DEPLOYMENT-TROUBLESHOOTING.md` → `docs/3-Development-Plan/DEPLOYMENT-TROUBLESHOOTING.md`; `CI-CD-TROUBLESHOOTING-GUIDE.md` is a fictional dangling-ref example — keep its prefix as `docs/3-Development-Plan/` for consistency or neutralize the candidate note since it describes a stale-branch-specific observation, not a main fact).
- [ ] **Step 5:** Rewrite the inverted-history background note (project-paths.md:5-6). Replace the false "2026-06-06 改名為扁平命名" claim with an accurate statement: `main` uses a numbered taxonomy (`0-Design`/`1-User-Story`/`2-PRD`/`3-Development-Plan`/`4-Test`); this skill was ported from sibling repo `helloglow-doc-governance` and re-pointed to match `main`'s numbered structure (the flat rename described on the sibling branch was NOT adopted on `main`).
- [ ] **Step 6 (M1):** Rewrite `docs/adr/ADR-0001-docs-structure-and-governance-alignment.md` to record the decision **`main` actually took**, not the stale branch's. The stale ADR (`Lifecycle Status: accepted`) records "rename `0-Design → system-spec` … 228 處引用" + "hooks 於 `.claude/settings.local.json` 接線" — both false on `main` and contradicting D-1. Rewrite Decision to: (1) **keep** numbered taxonomy (`main` chose the ADR's own "Alternative A" naming); (2) port `helloglow-doc-governance` → `orderly-doc-governance` adapted to numbered paths; (3) register the 3 hooks in **`.claude/settings.json`** (not settings.local.json); (4) global `doc-governance` stays router/fallback. Update Context/Consequences/Alternatives to match (numbered taxonomy retained; no 228-ref rename happened). Keep ADR metadata (`accepted`, date) but correct the body.
- [ ] **Step 7:** Verify Class-B oracle → 0 across skill + ported docs (run targeted filename set, since bare `docs/plans/` is legit).
```bash
grep -rnE 'docs/plans/(CI-CD-ARCHITECTURE|CI-CD-PARITY|ci-secrets|DEPLOYMENT-CHECKLIST|DEPLOYMENT-ENVIRONMENTS|DEPLOYMENT-TROUBLESHOOTING|DEVELOPMENT-PLAN|docker-deployment-guide|Infra-Runbook|PERFORMANCE-OPTIMIZATION-SUMMARY|PRD-US-GAP-REPORT|STATUS-SUMMARY|todo|CI-CD-TROUBLESHOOTING-GUIDE)' \
  .claude/skills/orderly-doc-governance docs/governance docs/references docs/incidents docs/adr docs/plans/governance-ledger.md docs/0-Design/business-invariants.md
# Expected: NO output.
# Also confirm ADR-0001 no longer asserts the flat rename:
grep -nE 'system-spec|settings\.local\.json|228 處' docs/adr/ADR-0001-docs-structure-and-governance-alignment.md
# Expected: NO output (rewritten to numbered reality).
```
- [ ] **Step 8:** Commit.
```bash
git add .claude/skills/orderly-doc-governance docs/governance/deprecation-roadmap.md docs/adr/ADR-0001-docs-structure-and-governance-alignment.md
git commit -m "fix(doc-governance): re-point curated-dev-doc home to 3-Development-Plan, correct inverted-history note, rewrite ADR-0001 to main reality (Class B + M1)"
```

### Task 5: Re-point Class C (backend microservice → modular monolith)

**Files (verified full set — Codex Round-1 M2):** `.claude/skills/orderly-doc-governance/evals/harvest-truth-verification.json` (lines 5,10,11,71,79), `evals/regression.json` (214), `references/plan-residency.md` (25,83,97,150), `references/project-paths.md` (116,126), **`references/stage-gates.md` (107)** ← was missing from Round-1, and `.claude/hooks/harvest-evidence-gate.sh` (comment line 25)

Mapping: `backend/<svc>-fastapi/app/{api,schemas,models}/` → `backend/app/modules/<svc>/` with svc name normalization (user→users, order→orders, product→products, notification→notifications, customer-hierarchy→customer_hierarchy; acceptance/billing unchanged; supplier→suppliers — verify against actual module dir names). **`api-gateway` has NO monolith module** (gateway folded into the monolith) — where the stale `<svc>` set lists `api-gateway`, drop it from the module enumeration.

> **Alembic/migration nuance:** the evals contain illustrative drift scenarios like `cd backend/billing-service-fastapi && python3.11 -m alembic heads`. The monolith has a **single** alembic root (not per-service). Re-point these to the monolith's alembic location (`cd backend && … alembic heads`, or `backend/app/...`), not `backend/app/modules/billing/`. These are *illustrative* ("示意"/"fictional") examples — keep them monolith-shaped so they don't teach the dead microservice layout.

- [ ] **Step 1:** Re-point each occurrence. Update `project-paths.md` "Backend Microservice 落點" prose from "後端為微服務；source of truth 依服務分散 `backend/<svc>-fastapi/app/...`" to the monolith reality: `backend/app/modules/<svc>/` (modules: users/orders/products/acceptance/billing/notifications/customer_hierarchy/suppliers), shared DTO in `shared/types/`, OpenAPI derived from `docs/0-Design/api-specification.yaml`.
- [ ] **Step 2:** Re-point `stage-gates.md:107` wire-contract row (`backend/<svc>-fastapi/app/{api,schemas,models}/` → `backend/app/modules/<svc>/`).
- [ ] **Step 3:** Re-point the illustrative concrete refs in `evals/harvest-truth-verification.json` (billing-service-fastapi, order-service-fastapi → `backend/app/modules/billing`, `backend/app/modules/orders`; alembic refs → single monolith alembic) + `evals/regression.json:214` + `plan-residency.md` (placeholder + concrete + alembic).
- [ ] **Step 4:** Update the `harvest-evidence-gate.sh:25` comment example `backend/billing-service-fastapi/app/models/...` → `backend/app/modules/billing/models/...`.
- [ ] **Step 5:** Verify Class C grep oracle → 0. **Oracle fixed (M2):** `[a-z-]+-fastapi` does NOT match the placeholder `backend/<svc>-fastapi`; use a `-fastapi`-suffix oracle that catches both placeholder and concrete spellings.
```bash
grep -rnE '\-fastapi' .claude/skills/orderly-doc-governance .claude/hooks
# Expected: NO output. (Catches backend/<svc>-fastapi, billing-service-fastapi, order-service-fastapi alike.)
```
- [ ] **Step 6:** Spot-check monolith module paths resolve (e.g. `ls -d backend/app/modules/billing backend/app/modules/orders backend/app/modules/users`).
- [ ] **Step 7:** Commit.
```bash
git add .claude/skills/orderly-doc-governance .claude/hooks/harvest-evidence-gate.sh
git commit -m "fix(doc-governance): re-point backend microservice paths -> modular monolith (Class C, incl stage-gates.md + alembic)"
```

### Task 6: Hand-merge new entries into docs/INDEX.md

**Files:** `docs/INDEX.md` (Modify)

- [ ] **Step 1:** Read current `docs/INDEX.md` (5 numbered categories + REPO-STRUCTURE pointer). Append a minimal "Governance & References" section listing the new canonical homes, matching the existing terse bullet style.
```markdown
## Governance & References
- `docs/governance/deprecation-roadmap.md` — tech-debt exit-trigger roadmap
- `docs/references/canonical-vocabulary.md` — canonical naming vocabulary
- `docs/references/doc-governance-vocabulary.yaml` — vocabulary schema
- `docs/incidents/` — incident postmortems
- `docs/adr/` — Architecture Decision Records（`ADR-NNN-*.md`）
- `docs/plans/governance-ledger.md` — governance run closeout ledger
- `docs/0-Design/business-invariants.md` — cross-module business invariants（`INV-*`）
```
- [ ] **Step 2:** Confirm the edit applied cleanly and is the ONLY change to INDEX.md (do NOT diff-apply the stale branch's INDEX.md edit — different file).
```bash
git diff docs/INDEX.md
```
- [ ] **Step 3:** Commit.
```bash
git add docs/INDEX.md
git commit -m "docs(doc-governance): hand-merge canonical-home entries into INDEX"
```

### Task 7: Register 3 hooks in .claude/settings.json + verify firing

**Files:** `.claude/settings.json` (Create)

- [ ] **Step 1:** Create `.claude/settings.json` registering the hooks. (Verify exact schema against Claude Code hooks docs before writing; the shape below is the expected form.)
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Edit",
        "hooks": [
          { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/harvest-evidence-gate.sh" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/gov-healthcheck-validate.sh" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/gov-healthcheck-gate.sh" }
        ]
      }
    ]
  }
}
```
- [ ] **Step 2:** Validate JSON parses.
```bash
jq -e . .claude/settings.json >/dev/null && echo "settings.json valid"
```
- [ ] **Step 3:** Manually verify each hook script fires + behaves (immediate trigger, not deferred — per global rule). Pipe mock JSON / create marker:
```bash
# harvest-evidence-gate (PreToolUse) — should BLOCK (exit 2) when no evidence file + rm targets dated plan dir, in an Orderly cwd
echo '{"tool_name":"Bash","cwd":"'"$PWD"'","tool_input":{"command":"rm -rf docs/plans/20260601-foo/"}}' | .claude/hooks/harvest-evidence-gate.sh; echo "exit=$?  (expect 2 block)"
# non-harvest Bash — should PASS (exit 0)
echo '{"tool_name":"Bash","cwd":"'"$PWD"'","tool_input":{"command":"ls"}}' | .claude/hooks/harvest-evidence-gate.sh; echo "exit=$?  (expect 0 pass)"
# gov-healthcheck-validate (PostToolUse) — non health-check Write should PASS
echo '{"tool_input":{"file_path":"/tmp/not-a-healthcheck.md"}}' | .claude/hooks/gov-healthcheck-validate.sh; echo "exit=$?  (expect 0 pass)"
# gov-healthcheck-gate (Stop) — no marker should PASS
rm -f .claude/.gov-healthcheck-scope; .claude/hooks/gov-healthcheck-gate.sh </dev/null; echo "exit=$?  (expect 0 pass)"
```
- [ ] **Step 4:** Commit.
```bash
git add .claude/settings.json
git commit -m "feat(doc-governance): register 3 governance hooks (Stop/PreToolUse/PostToolUse)"
```

### Task 8: Final verification sweep

- [ ] **Step 1:** SKILL.md frontmatter valid (name/description present, parseable).
```bash
head -20 .claude/skills/orderly-doc-governance/SKILL.md
```
- [ ] **Step 2:** All `references/` internal cross-links + path mentions resolve on main. For every `docs/...` path referenced in the skill, confirm the target exists (or is an intentional on-demand/derived-candidate noted as not-yet-existing).
```bash
grep -rhoE 'docs/[0-9A-Za-z._/-]+\.(md|yaml)' .claude/skills/orderly-doc-governance | sort -u | while read p; do test -e "$p" || echo "DANGLING: $p"; done
# Triage any DANGLING: real bug vs intentional on-demand home (e.g. docs/references/history/ noted as 尚未建立).
```
- [ ] **Step 3:** Evals present (4 JSON files parse).
```bash
for f in .claude/skills/orderly-doc-governance/evals/*.json; do jq -e . "$f" >/dev/null && echo "OK $f" || echo "BAD $f"; done
```
- [ ] **Step 4:** Combined grep oracle (Class A + Class B + Class C) → 0 across the whole skill + hooks + ported docs. This is the DONE oracle.
```bash
TARGETS=".claude/skills/orderly-doc-governance .claude/hooks docs/governance docs/references docs/incidents docs/adr docs/0-Design/business-invariants.md docs/plans/governance-ledger.md"
# Class A — docs flat taxonomy
grep -rnE 'docs/system-spec|docs/prd|docs/user-stories|docs/testing' $TARGETS
# Class B — curated dev-doc names under docs/plans/ (bare docs/plans/ is legit, so target the filenames)
grep -rnE 'docs/plans/(CI-CD-ARCHITECTURE|CI-CD-PARITY|ci-secrets|DEPLOYMENT-CHECKLIST|DEPLOYMENT-ENVIRONMENTS|DEPLOYMENT-TROUBLESHOOTING|DEVELOPMENT-PLAN|docker-deployment-guide|Infra-Runbook|PERFORMANCE-OPTIMIZATION-SUMMARY|PRD-US-GAP-REPORT|STATUS-SUMMARY|todo|CI-CD-TROUBLESHOOTING-GUIDE)' $TARGETS
# Class C — backend microservice -fastapi (placeholder + concrete; NOT [a-z-]+-fastapi which misses <svc>)
grep -rnE '\-fastapi' $TARGETS
# ADR-0001 must not re-assert the flat rename
grep -nE 'system-spec|settings\.local\.json|228 處' docs/adr/ADR-0001-docs-structure-and-governance-alignment.md
# Expected: ALL FOUR return NO output (exit 1). Any hit = not done.
```
- [ ] **Step 5:** No commit (verification only). Record results in handoff.md.

### Task 9: Open PR to main (await user go-ahead before push)

- [ ] **Step 1:** Review full diff vs main.
```bash
git log --oneline origin/main..HEAD
git diff --stat origin/main..HEAD
```
- [ ] **Step 2:** STOP. Report to user. Do NOT push without explicit go-ahead. When approved: push branch + `gh pr create` against `main` with summary (3 reference-classes re-pointed, hooks registered, grep oracle == 0).

---

## Acceptance Criteria

- **AC1:** `.claude/skills/orderly-doc-governance/` present on `feat/orderly-doc-governance` with all 20 files (1 SKILL.md + 4 evals + 9 references + 6 templates).
- **AC2:** Combined grep oracle (Task 8 Step 4) returns **0** dangling refs (Class A docs flat taxonomy + Class C backend `-fastapi`).
- **AC3:** Class B fixed: no file references a curated dev-doc by a `docs/plans/<name>` path; inverted-history note corrected to reflect `main`'s numbered taxonomy; **ADR-0001 rewritten** so it records main's actual decision (numbered kept, hooks in `settings.json`) and no longer asserts `system-spec` rename / `settings.local.json` / `228 處`.
- **AC4:** Net-new canonical homes exist + linked from `docs/INDEX.md`: `docs/governance/`, `docs/references/`, `docs/incidents/`, `docs/adr/`, `docs/plans/governance-ledger.md`, `docs/0-Design/business-invariants.md`.
- **AC5:** 3 hooks present, executable, registered in `.claude/settings.json` (valid JSON), and each verified to fire (Task 7 Step 3 exit codes match expectations).
- **AC6:** No file landed under any flat-taxonomy path (`docs/system-spec/`, `docs/prd/`, `docs/user-stories/`, `docs/testing/` not created).
- **AC7:** No stale-branch reorg/env/cruft commits pulled in; only file-level extraction + re-point commits present.
- **AC8:** PR opened against `main` (awaiting user approval to push/merge).

---

## 命名目標進度表 (named-target removal oracle)

This adapt has a teardown-flavored oracle: the flat-taxonomy + microservice path strings must `grep` to **0** after re-point. Tracked as named targets.

| 命名目標 (grep-able string) | 動詞 | 狀態 (initial draft) | 真的動的 task | 備註 |
|---|---|---|---|---|
| `docs/system-spec` | re-point (rename path) | 沒碰到 (pre-execution) | T-3 | → `docs/0-Design` (+ business-invariants re-home) |
| `docs/prd` | re-point | 沒碰到 | T-3 | → `docs/2-PRD` |
| `docs/user-stories` | re-point | 沒碰到 | T-3 | → `docs/1-User-Story` |
| `docs/testing` | re-point | 沒碰到 | T-3 | → `docs/4-Test` |
| `docs/plans/(CI-CD-ARCHITECTURE\|...\|STATUS-SUMMARY\|todo\|CI-CD-TROUBLESHOOTING-GUIDE)` (curated-doc names) | re-point | 沒碰到 | T-4 | → `docs/3-Development-Plan`（bare `docs/plans/` stays legit）|
| `-fastapi` (matches placeholder `<svc>-fastapi` + concrete `xxx-service-fastapi`) | re-point | 沒碰到 | T-5 | → `backend/app/modules/<svc>`；oracle uses `-fastapi` suffix not `[a-z-]+-fastapi` |
| ADR-0001 stale decision (`system-spec` rename / `settings.local.json` / `228 處`) | rewrite | 沒碰到 | T-4 Step 6 | → record main's actual choice (numbered kept, settings.json) |

Done = every row's grep returns 0 (verified Task 8 Step 4, four-part oracle) AND each row has a real touching task (T-3/T-4/T-5), not a doc-only note.

---

## Changes Made — Round 1 (codex)

Codex Round-1 verdict: REVISE — 3 must-fixes, all verified valid against the stale tree and applied:

- **C1 (M1):** ADR-0001 is an `accepted` ADR recording the *flat-rename* decision (`0-Design → system-spec` … 228 refs) + hook wiring in `.claude/settings.local.json` — both false on main + contradicting D-1. Its `0-Design → system-spec` phrasing escaped the Class-A grep. → Task 4 Step 6 added: rewrite ADR-0001 to record main's actual decision (numbered kept = the ADR's own "Alternative A"; hooks in `settings.json`). AC3 + named-target table + Task-8 oracle updated to assert ADR-0001 no longer asserts the rename.
- **C2 (M2):** Class-C file list missed `references/stage-gates.md:107`, and the oracle `backend/[a-z-]+-fastapi` does NOT match the placeholder `backend/<svc>-fastapi`. → Task 5 file list + alembic-on-monolith nuance added; oracle changed to `-fastapi` suffix (catches placeholder + concrete) in Task 5 + Task 8.
- **C3 (M3):** Class-B refs live outside `project-paths.md` (`evals/smoke.json:9`, `deprecation-roadmap.md:17`, `stage-gates.md:103`, `plan-residency.md:21,146`), and Task-8 omitted Class B. Since bare `docs/plans/` is legit on main, the oracle targets the specific 3-Development-Plan filename set. → Task 4 expanded to 6 files; Task-8 done-oracle now four-part (Class A + Class B + Class C + ADR-0001).
