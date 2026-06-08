# Backend Monolith STEP 4-9 Closure Run Log

**Date:** 2026-06-08
**Worktree:** `/Users/leeyude/Projects/_worktrees/Tsaitung-Orderly-72d17797/codex-backend-step4-9`
**Branch:** `codex-backend-step4-9`

## Incident Note

An earlier completion claim was wrong. It updated the old `20260607-backend-monolith-step0-3/run.md` artifact and did not close the canonical STEP 4-9 acceptance set: V3 runtime frozen-contract curl, D1-D4 decisions, C1-C3 cleanup, and release image smoke. This run log is the canonical closure record for STEP 4-9.

## Acceptance Status

| AC | Status | Evidence |
|---|---:|---|
| V1 fresh PostgreSQL upgrade | Pass | Fresh DB `orderly_v1_fresh_final` upgraded through `0001_consolidated_schema -> 0002_cross_module_fks -> 0003_acceptance_order_fk`; app tables = 42; validated STEP FKs = 7; DB dropped after verification. |
| V2 data-bearing upgrade/audit | Pass | Seeded `orderly_v2_data` upgraded to `0003_acceptance_order_fk`; validated STEP FKs = 7; `monolith_fk_audit.sql` orphan counts all 0; candidate orphan counts for `acceptances.restaurantId`, `acceptances.supplierId`, `notifications.userId` all 0. |
| V3 runtime frozen contract | Pass | Real `uvicorn app.main:app` on port 58888 with Postgres+Redis. Verified login shape, `/auth/login`, `/suppliers`, `/products/prod-runtime-1`, `/api/suppliers/suppliers`, `/api/products/categories`, `/api/v2/hierarchy/tree`, `/api/orders`, `/notifications`, `/acceptance/health`; orders/notifications envelopes contained seeded rows. |
| V3 middleware | Pass | `/service-map` returned SecurityHeaders (`content-security-policy`, `x-frame-options: DENY`, `permissions-policy`); `/auth/login` rate limit returned 429 on the 6th request for a fresh `X-Forwarded-For`; `/api/billing-periods` returned 403 with `Verification level 3 required` for a level-2 token. |
| V3 no loopback | Pass | `/service-map` reported `mode=monolith`, `routing=in-process`, no `localhost:300x`; static scan of `backend/app/modules` and `backend/app/main.py` had zero inter-service `localhost:300x` / service URL hits after excluding external OAuth callback code. |
| V4 type-check | Pass | `npm run type-check` exited 0 (`tsc -p tsconfig.staging.json --noEmit`). |
| R1 image build | Pass | `docker build -f backend/Dockerfile.monolith -t orderly-backend-monolith:verify .` succeeded. |
| R2 image smoke | Pass | Container from `orderly-backend-monolith:verify` ran alembic to `0003_acceptance_order_fk` against throwaway DB `orderly_image_smoke`; `GET /health` returned 200; container and DB were removed. |
| `actionlint cd.yml` | Pass | `actionlint .github/workflows/cd.yml` exited 0. |

Additional checks:

- `PYTHONPATH=backend:backend/libs backend/.venv/bin/python -m compileall -q backend/app backend/libs/orderly_fastapi_core` passed.
- `import app.main` passed against the local Postgres/Redis environment.
- `alembic -c backend/app/alembic.ini heads` returned `0003_acceptance_order_fk (head)`.
- YAML parsing passed for `.github/workflows/cd.yml`, `.github/workflows/security.yml`, `.github/workflows/monitoring.yml`, and `ci/service-manifest.yaml`.
- `actionlint .github/workflows/security.yml .github/workflows/monitoring.yml` still reports existing shellcheck and old action-version warnings; those workflows were not the AC-R release gate. The edited YAML parses, and `cd.yml` actionlint passes.

## Decisions

| Decision | Result | Reason / Unlock Condition |
|---|---|---|
| D1 `integration_service` stub | Partial in-process implementation plus accepted stubs | User permission checks now query the monolith users table in-process. Hierarchy alerts now persist notifications in-process. Order permission validation remains conservative deny-write and order/billing fanout remains an accepted no-op stub because there is no in-process domain owner API yet. Unlock condition: when customer-hierarchy bulk/migration write flows become active, add real order/billing domain handlers. |
| D2 phantom FK | Added `acceptances.orderId -> orders.id` | This is the clearest type-compatible candidate. Added model-level FK and migration `0003_acceptance_order_fk` using orphan audit, `NOT VALID`, then `VALIDATE`. Other candidates remain skipped despite local orphan count 0 because ownership/coupling is less clear. |
| D3 legacy deploy artifacts | Delete | Removed deprecated `.github/workflows/deploy.yml`, 9 per-service Dockerfiles, and 9 per-service `cloudbuild.yaml` files. Repointed security scan and CI deploy helper scripts at `backend-monolith`. Bounded residual audit for `fastapi/Dockerfile`, `fastapi/cloudbuild`, and deprecated deploy workflow references returned 0. |
| D4 legacy per-module Alembic chains | Legal deferral | V1 proves the monolith chain can build the full schema, but staging/prod are not proven to be stamped onto `alembic_version_monolith`. Per-module Alembic directories remain until the database cutover task proves staging/prod are on the monolith chain. `_consolidated_schema.py` docstring was corrected to name the monolith chain as canonical. |

## Cleanup Status

| Cleanup | Status |
|---|---:|
| C1 `gateway_compat` | Done: `backend/app/modules/gateway_compat/` removed; `import app.main` and V3 runtime passed. |
| C2 legacy deploy artifacts | Done: per-service Dockerfiles/cloudbuild files and deprecated deploy workflow removed; security/CD helper references repointed; bounded residual audit returned 0. |
| C3 per-module Alembic chains | Deferred by D4; monolith chain is canonical, but legacy chains stay until staging/prod chain cutover is proven. |

## Not Run

- No staging/prod PostgreSQL migration, Cloud Run deploy, Cloud Build run, or external GitHub Actions run was executed.
- No destructive cleanup was run against real data. All V1/R2 databases were throwaway local DBs.
