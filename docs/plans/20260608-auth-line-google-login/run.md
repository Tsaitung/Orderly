---
run_id: 20260608-auth-line-google-login
state: implementation_complete_auth_scope_verified
scope: >
  全平台登入模型改為 Line（主要）/ Google（次要，綁定後可登入）。廢除 Email+密碼登入與密碼、
  Email 改財務對帳用途、平台端改社群登入+強制 MFA、新增社群帳號恢復（US-AUTH-022）。
  本 run 原為 US/PRD/Specs/Test 文檔同步 packet；2026-06-08 已擴充為 auth Line/Google
  social-only implementation execution record。
changed_identifiers:
  user_stories:
    modified: [US-AUTH-001, US-AUTH-002, US-AUTH-003, US-AUTH-005, US-AUTH-006, US-AUTH-007, US-AUTH-008, US-AUTH-010, US-AUTH-014, US-AUTH-016, US-AUTH-021]
    deprecated: [US-AUTH-004]
    added: [US-AUTH-022]
  prd_sections: ["§0", "§2.4", "§3.2", "§3.3", "§3.4", "§3.5", "§4.1", "§4.1.1", "§4.2", "§4.5", "§5", "§6", "§7.1", "§8.1", "Appendix A"]
  specs: ["technical-architecture-auth §0/§1.2/§4.1", "API-Endpoints-Essential 登入段"]
  endpoints_removed: ["POST /api/auth/login", "/api/auth/password/*", "POST /api/auth/verify-email", "公開 POST /api/auth/register"]
  endpoints_planned: ["GET /api/auth/oauth/{provider}/initiate|callback", "POST|DELETE /api/auth/social-bindings/{provider}", "POST /api/auth/account-recovery"]
traceability_result: pass — 零孤立（US ↔ PRD ↔ Specs ↔ Test ↔ INDEX 一致，AUTH 22 / 總計 106）
approval_status: requirement approved by user (4 decisions via /us-edit 2026-06-08); implementation pending plan-review (auth 高風險)
keep_until: 2026-06-15
blockers: repo-wide non-auth TS/shared-types gates still fail; auth scope verified below
governance_gate: not-applicable（repo 無專案級治理 FSM / `.claude/skills/`）
---

# Run: Auth Line/Google 登入模型文檔同步

**State:** `implementation_complete_auth_scope_verified`
**Current gate:** implementation complete for auth scope; repo-wide non-auth TS/shared-types debt remains documented below.

## 決策來源（2026-06-08，使用者經 /us-edit 拍板）

| 決策 | 結果 |
|------|------|
| Google 定位 | 次要登入（綁定後可登入）|
| 平台端登入 | 改用 Line/Google（移除 Email+密碼獨立系統，保留強制 MFA + 供裝控管）|
| 密碼 | 完全廢除 |
| Email | 不做登入/恢復，純財務對帳 |

## Scope

見 frontmatter `scope`。本 run 已從原 docs-only packet 延伸為 implementation packet。**已實作**：後端/前端 social-only auth、Alembic 0004、OAuth proxy/callback/MFA/recovery/settings binding、focused tests。**仍未做外部實接**：真實 Line/Google provider credential callback smoke（本地以 route/E2E proxy 驗證）。

## Traceability summary

零孤立。每個變更 US 對應 PRD section + Specs §0；Test Plan（`docs/4-Test/smoke-tests.md`）含對應測試項；INDEX 計數一致。詳見 `diff-manifest.md`。

## Blockers

Auth scope blockers: none after the 2026-06-08 implementation closeout.

Broader repo blockers: `npm run type-check:full` and `npm --workspace shared/types run build` are not repo-wide green; see closeout notes and `handoff.md` for exact residual prompt.

## Implementation execution log

### 2026-06-08 18:26 CST — Codex multi-agent execution started

- Goal: complete the implementation plan end-to-end, with this plan packet as the canonical progress/blocker record.
- Local pre-scan: branch `refactor-login`; password routes and frontend password fields are still active (`/api/auth/login`, forgot/reset/change password, `app/(auth)/login`, register/onboarding password inputs).
- Plan-review gate: `codex-review-2.md` is `VERDICT: APPROVED`; T0.1 considered satisfied for this execution.
- Active agents:
  - Arendt: backend/auth/DB slice only (`backend/app/modules/users/**`, `backend/app/alembic/**`).
  - Plato: frontend/shared/E2E slice only (`app/**`, `lib/**`, `contexts/**`, `shared/types/**`, `e2e/**`).
- Main orchestrator owns: plan-doc updates, T0.2 inventory attempt, integration, verification, and handoff if any scope remains incomplete.
- Next immediate gate: T0.2 production/staging password-only account inventory. First action is read-only discovery of available DB/gcloud/direnv configuration; no destructive commands.

### 2026-06-08 18:33 CST — T0.2 password-only account inventory

- Staging target: `orderly-472413:asia-east1:orderly-db-v2`, database `orderly`, user `orderly`.
- Command executed via temporary local Cloud SQL Proxy port `55433` and Secret Manager `postgres-password`:
  - `SELECT count(*) AS pw_only FROM users WHERE "passwordHash" IS NOT NULL AND id NOT IN (SELECT "userId" FROM oauth_links);`
- Result: `pw_only = 0` on `orderly-db-v2`.
- Production discovery:
  - `gcloud sql instances list --project=orderly-472413` shows only `orderly-db-v2`; documented `orderly-db` did not resolve.
  - `ENV=production ./scripts/db/diag.sh` shows all `*-production` Cloud Run services as `(not deployed)`.
- T0.2 conclusion for this accessible project: no password-only accounts require migration before implementing 0004 against the current staging/runtime target. Residual caveat: if a separate production project/instance is introduced later, rerun the same count before production deploy; this execution could not inventory a non-existent or unconfigured production DB target.
- Operator note: one attempted diag command used invalid `direnv exec` syntax (`direnv exec . ENV=production ...`) and was immediately rerun correctly as `direnv exec . bash -lc 'ENV=production ./scripts/db/diag.sh'`.

### 2026-06-08 18:34 CST — Multi-agent recovery

- Arendt and Plato both missed the first heartbeat and a second interrupted partial-summary request; both agents were closed to avoid idle drift.
- Partial edits became visible in the worktree after shutdown:
  - Backend partial: removed password/login/register imports from `auth/__init__.py`, removed public password paths from `main.py`, pruned password schemas, added `platform_provisioning` model/admin route, removed `PasswordHistory` from model exports.
  - Shared-types partial: added `social-auth.ts`, made shared `email` optional, removed supplier onboarding password fields.
- Integration finding: partial edits are useful but incomplete. `auth/__init__.py` imports `recovery.py` which does not exist yet; old password route/service/model files still exist; OAuth still uses raw snake_case `oauth_links` SQL and hand-rolled JWT; no Alembic 0004 yet; frontend password/login routes are untouched.
- Decision: continue locally from the partial patch, preserving useful changes and completing missing backend/frontend slices in small passes.

### 2026-06-08 18:58 CST — Alembic 0004 fresh-DB fix

- Focused backend route-contract and `test_auth_social_only.py` checks passed, but the official local backend gate exposed a migration ordering issue on a fresh test DB.
- Failure: `scripts/ci/backend-test.sh` ran Alembic from a consolidated metadata baseline that already created `platform_provisioning`; 0004 then tried `op.create_table("platform_provisioning")` and failed with `psycopg2.errors.DuplicateTable`.
- Fix applied: 0004 now creates `platform_provisioning` and its indexes with idempotent SQL (`CREATE TABLE IF NOT EXISTS`, guarded unique constraint, `CREATE INDEX IF NOT EXISTS`; downgrade uses `DROP ... IF EXISTS`).
- Next verification: rerun the official backend gate with `direnv exec .` and `PYTHONPATH=.:libs` so the script's internal `cd backend` resolves app imports correctly.

### 2026-06-08 18:59 CST — Backend gate passed

- Command: `direnv exec . bash -lc 'ENVIRONMENT=testing POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-orderly_dev_password} JWT_SECRET=${JWT_SECRET:-test} JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-test} PYTHONPATH=.:libs BACKEND_TEST_PYTHON=python3.11 bash scripts/ci/backend-test.sh'`
- Result: pass.
  - Alembic upgraded `0001_consolidated_schema -> 0002 -> 0003 -> 0004_auth_refactor_social_only`.
  - Monolith pytest result: `9 passed` with existing deprecation/OpenAPI duplicate-operation warnings.
- Decision: backend migration/import/composition gate is no longer blocked by this auth refactor. Continue with frontend/static/E2E verification.

### 2026-06-08 19:23 CST — Implementation closeout

- Multi-agent sidecar findings were integrated, not just recorded:
  - Frontend gaps fixed: `/auth/callback/{provider}` alias now exists; MFA has `/mfa` completion page + `/api/auth/mfa/verify` proxy; account recovery has social-provider verification mode + manual evidence path; supplier onboarding stores tokens via `SecureStorage`; middleware no longer lists deleted `/api/auth/login` or `/api/auth/register`; supplier settings has social binding/link/unlink UI.
  - Backend gaps fixed: Line first registration now uses short-lived server-side `registration_ticket` recorded in `audit_logs`; `complete-registration` no longer trusts frontend `provider_user_id`; `oauth_links(provider, "providerUserId")` has a guarded DB unique constraint; platform provisioning requires active platform users and cannot disable MFA; platform OAuth enforces static IP allowlist, 3 failed attempts -> 15 minute lock, max 3 active sessions, active/status checks, and audit entries; MFA verify uses auth-core token/claims helpers and enforces platform session limit; manual recovery requires at least two evidence points.
  - Alembic 0004 was updated for fresh/current DB safety: enum additions use `autocommit_block()`, `platform_provisioning` creation is idempotent, and the `oauth_links` unique constraint is guarded with duplicate-data detection.
  - Stale unmounted invitation onboarding no longer hashes or requires passwords; its schema is social-provider based and token issuance uses auth-core helpers if the route is ever mounted later.
- Final focused verification:
  - `python3.11 -m compileall -q backend/app/modules/users backend/app/tests/test_auth_social_only.py` — pass.
  - Backend import smoke (`oauth`, `mfa`, `invitations`, `recovery`) — pass (`imports-ok 3 True True True`).
  - Focused social-only pytest — pass: `5 passed`.
  - Official backend gate: `direnv exec . bash -lc 'ENVIRONMENT=testing POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-orderly_dev_password} JWT_SECRET=${JWT_SECRET:-test} JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-test} PYTHONPATH=.:libs BACKEND_TEST_PYTHON=python3.11 bash scripts/ci/backend-test.sh'` — pass: Alembic + monolith pytest `12 passed`.
  - `npm run type-check` — pass.
  - Playwright auth spec against worktree dev server `http://localhost:5577`: `PLAYWRIGHT_BASE_URL=http://localhost:5577 npx playwright test e2e/auth-login.spec.ts` — pass: `5 passed`.
  - Auth/password-removal grep: product paths have no active password login/register/reset/verify-email route or frontend call; remaining hits are the negative tests and the retained historical `users.passwordHash` column/model assignment to `None`.
- Broader verification truth:
  - `npm run type-check:full` still fails, but the auth-scope filter for `app/(auth)`, `app/auth`, `app/api/auth`, `contexts/auth`, `lib/auth`, `lib/security/{auth-service,jwt-service}`, `lib/validation/auth-schemas`, `components/supplier/profile/SupplierProfileSettings`, and `shared/types/src/{index,supplier,social-auth}` has no matches. Remaining errors are outside this auth slice.
  - `npm --workspace shared/types run build` still fails in existing `src/customer-hierarchy.ts` enum merge errors (`TS2567` at lines 389 and 431); no `social-auth`, `index`, or `supplier` errors were reported.
  - Earlier dependency setup caveat: `python3.11 -m pip install -r backend/app/requirements.txt` completed but pip reported a global package conflict (`google-genai 1.75.0` wants `httpx>=0.28.1`, repo pins `httpx==0.27.0`). `npm install` completed and reported 29 vulnerabilities.
- Residual risk not claimed as verified: real Line/Google provider credential callback was not exercised against external OAuth providers in this run; local verification covered routes, proxies, callback pages, MFA page, tests, and migration/composition gates.

## ⚠️ 安全決策註記（provenance）

平台端由「獨立 Email+密碼+MFA 系統」改為「Line/Google + 強制 MFA」是**刻意降低**原獨立系統的防釣魚/降第三方依賴等級，由使用者明確拍板。緩解：強制 MFA + 帳號供裝允許名單 + IP 白名單 + 異常告警 + 完整審計。實作時**必須走 plan-review（auth flow 高風險）**並驗證緩解到位。帳號恢復僅剩另一社群綁定，兩者皆失效須人工支援 → 需在 onboarding 引導使用者綁第二個社群帳號。
