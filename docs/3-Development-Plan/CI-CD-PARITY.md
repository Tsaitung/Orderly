# CI/CD ↔ Local Parity Matrix

**Rule:** nothing that CI/CD can fail on may be untested locally. Every check is
either (a) mirrored by a local `make` target, or (b) marked **N-A-local** with a
reason it *cannot* run locally (real cloud resource / live state) **plus** the
compensating control that catches it.

A check is "repo-content-determined" (MUST be local) when its pass/fail depends
only on files in the repo. It is "cloud-state" (N-A-local) when it depends on a
live GCP resource (Cloud SQL data, a deployed Cloud Run revision, IAM).

Run locally: `make verify-pr-local` (the pre-push gate) + `make predeploy-check`
(heavy Docker builds, before a deploy-branch push).

## ci.yml (the PR quality gate — fully mirrored)

| ci.yml check | Local mirror | Status |
|---|---|---|
| `detect-changes` (paths-filter) | — | N-A: a router, no failure logic |
| frontend-quality · ESLint `npm run lint` | `make lint` → `npm run lint` | ✅ same script |
| frontend-quality · `npm run type-check` | `make typecheck` → `npm run type-check` | ✅ same script |
| frontend-quality · `npm run format:check` | `make format-check` → `npm run format:check` | ✅ same script |
| frontend-test · `jest --ci --shard=N/4` | `make test-fe` → `jest --ci` (unsharded = union of shards) | ✅ same selection + snapshot mode (`--ci`) |
| backend-test · `bash scripts/ci/backend-test.sh` | `make test-be` → **same script** | ✅ shared runner + env contract |
| `ci-gate` (aggregate) | — | N-A: aggregates job results |

## cd.yml (build + deploy — repo-content mirrored, cloud-state gated)

| cd.yml check | Local mirror | Status |
|---|---|---|
| `gate` → ci.yml | (all of the above) | ✅ via CI parity |
| `preflight` · `check-deploy-consistency.sh` (Dockerfile COPY drift) | `make deploy-check` (1/3) — in `verify-pr-local` | ✅ |
| build / migrate / frontend · `docker build` of `Dockerfile.monolith` + `Dockerfile.frontend` | `make predeploy-check` (real builds) | ✅ (manual, pre-deploy; heavy) |
| build-deploy / wire-up / smoke · `cloud-run-names.sh` naming | `make deploy-check` (3/3) `cloud-run-names.test.sh` | ✅ contract locked |
| every cd.yml shell script syntax | `make deploy-check` (2/3) `bash -n` | ✅ |
| `migrate` · `alembic upgrade head` (migration chain) | `make test-be` runs `alembic upgrade head` on a fresh DB | ✅ chain mirrored (cloud *execution* N-A) |
| `resolve` · env/suffix/db + changed-service shell | `scripts/ci/resolve-deploy-context.sh` (cd.yml sources it) + `resolve-deploy-context.test.sh` in `make deploy-check` (4/4) | ✅ logic extracted + 15-case self-test |
| `preflight` · orphan audit `monolith_fk_audit.sql` — SQL syntax + zero-on-clean-schema | `backend/app/tests/test_fk_audit.py` runs the exact .sql against the migrated CI/local DB (in CI backend-test + `make test-be`) | ✅ syntax + invariant. Orphan COUNTS on live prod data stay cloud-only (N-A-local); that part is gated in cd.yml `preflight`. |
| `preflight` · gcloud auth / Cloud SQL proxy / schema-drift `pg_dump` | — | N-A-local: needs GCP creds + live Cloud SQL. Compensating: CD preflight gate. |
| build-deploy / frontend · `gcloud run deploy` | — | N-A-local: deploys to Cloud Run. Compensating: the deploy job fails loud (self-gating — a broken deploy never goes live). |
| build-deploy · health poll + `smoke` · `curl $URL/health` | — | N-A-local: probes a deployed revision URL. Compensating: post-deploy smoke job + monitoring/alerting. |

## Why some checks are N-A-local (and why that is honest, not a gap)

Cloud-state checks fail on conditions that do not exist on a laptop: real orphan
rows in the production DB, a Cloud Run revision that won't boot, an IAM binding.
You cannot fabricate those locally without fabricating the result. They are
caught instead by **(1)** the cd.yml `preflight` job — read-only, runs before any
migrate/deploy, and is itself gated on CI being green; **(2)** the deploy jobs
being self-gating (a build/deploy failure blocks its own rollout); **(3)**
post-deploy `smoke` + monitoring. The *repo-content* portion of each cloud job
(the Dockerfile, the shell scripts, the naming, the migration chain, the audit
SQL logic) **is** mirrored locally per the table above.

## Maintenance contract (so this never drifts again)

When you change a CI/CD gate (command / env / test selection / target / re-root):
1. Make the local mirror call the **same runner** (script), not a re-authored copy.
2. Re-run this matrix: every cd.yml / ci.yml step is `✅ mirrored` or `N-A + reason`
   or `⚠ TODO + reason` — no blank cells, no silent omission.
3. A CI/CD change is not "done" until the local mirror executes the identical
   command + env set. (See `~/.claude/CLAUDE.md` Promoted lessons 2026-06-08.)
