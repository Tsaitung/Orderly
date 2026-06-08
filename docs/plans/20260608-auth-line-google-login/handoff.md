# Handoff — Auth Line/Google 登入模型

> Dev-reference 指引（非 FSM authority）。需求文檔已同步完成；本檔指引開發者從何處接手。

## 涉及的 User Stories

| ID | 標題 | 狀態 |
|----|------|------|
| US-AUTH-001 | 餐廳快速註冊 | modified（僅 Line）|
| US-AUTH-002 | 供應商完整註冊 | modified（僅 Line）|
| US-AUTH-003 | 標準登入流程 | modified（Line 主 / Google 次）|
| US-AUTH-004 | 密碼重設 | **Deprecated** |
| US-AUTH-005 | 帳戶驗證等級 | modified（Level 1 → Line）|
| US-AUTH-006 | Line 主要登入與 Google 次要綁定 | renamed+modified |
| US-AUTH-007 | MFA 雙因素驗證 | modified（移除 Email OTP）|
| US-AUTH-008 | Google 綁定與次要登入 | renamed+modified |
| US-AUTH-010 | 組織用戶管理 | modified（綁定狀態 Line/Google）|
| US-AUTH-014 | 行動裝置生物辨識 | modified（回退社群）|
| US-AUTH-016 | 平台用戶登入（Line/Google + 強制 MFA）| renamed+modified |
| US-AUTH-021 | 受邀加入並確認合作關係 | modified |
| US-AUTH-022 | 社群帳號恢復（取代密碼重設）| **added** |

## 需求與規格文件路徑

- US（主）：`docs/1-User-Story/by-module/01-auth-user-management.md`
- PRD（主，§0 權威）：`docs/2-PRD/PRD-Auth-Module.md`
- Specs（§0 權威）：`docs/0-Design/technical-architecture-auth.md`
- API（runtime-derived contract）：`docs/0-Design/API-Endpoints-Essential.md`（登入段已改 OAuth）

## 測試與追溯文件路徑

- Test Plan：`docs/4-Test/smoke-tests.md`（Auth Test Plan 段）
- 落差盤點：`docs/3-Development-Plan/PRD-US-GAP-REPORT.md`（GAP-AUTH-003/004/005 相關）
- 衍生計數：`docs/1-User-Story/INDEX.md`、`docs/2-PRD/INDEX.md`（AUTH 22 / 總計 106）
- Diff manifest：本 packet `diff-manifest.md`

## 已存在 code 位置

- 後端 OAuth（已部分有 line/google）：`backend/app/modules/users/api/v1/oauth.py`（initiate/callback/unlink/providers）
- 後端密碼/登入（待移除）：`backend/app/modules/users/api/v1/auth.py`、`.../password.py`
- 前端登入頁（待重構）：`app/(auth)/login/page.tsx`（目前 email/password 表單）

## 待實作 code 位置（新增）

- social-bindings 綁定/解綁（保留至少一）：`backend/app/modules/users/api/v1/`（新端點）（待實作）
- account-recovery 人工恢復：`backend/app/modules/users/api/v1/`（新端點）（待實作）
- 平台供裝允許名單 + 強制 MFA：user-service auth/oauth 邏輯（待實作）
- 前端設定頁 Google 綁定 + onboarding 引導（待實作）

## 已知 runtime/doc drift 與下一步 exact start

1. 登入頁仍 email/password（`app/(auth)/login/page.tsx`）↔ 文檔已改 Line/Google → **下一步**：先做 `tasks.md` T0.1 plan-review + T0.2 production 密碼帳號盤點，再 T1 RED 測試。
2. 後端仍有 password 端點 ↔ 文檔停用 → T2.3 移除。
3. OAuth token claims 與 auth claims 可能不一致（GAP-AUTH-004）→ T2.1 統一 claims。

**Exact start**：執行 `tasks.md` T0.1（plan-review，auth 高風險），不得跳過。

---

## 2026-06-08 implementation handoff（若需再交接）

> 上方「待實作」段落是原 docs-only handoff，已過期。以本段與 `run.md` 的 2026-06-08 19:23 closeout 為準。

### Current implementation state

- Auth scope implementation is complete in this worktree (`refactor-login`).
- Backend social-only flow implemented:
  - Removed email/password login/register/reset/change routes and email verification routes from mounted auth.
  - OAuth Line first-registration / Google bound-login implemented.
  - Line registration uses server-side short-lived `registration_ticket`; frontend no longer sends trusted `provider_user_id`.
  - `oauth_links(provider, "providerUserId")` unique constraint added in model + Alembic 0004.
  - Platform social login has provisioning allowlist, forced MFA, static IP allowlist via `PLATFORM_AUTH_ALLOWED_IPS`, 3 failed attempts -> 15 minute lock, max 3 active sessions, active/status checks, and audit rows.
  - Manual account recovery requires multiple evidence points and writes pending audit.
- Frontend social-only flow implemented:
  - Login/register pages no longer have password form.
  - Same-origin OAuth initiate/callback/complete-registration/recover/link/unlink/linked-accounts/MFA proxies exist.
  - `/auth/callback/{provider}` alias exists for OAuth provider redirects.
  - `/mfa` page completes platform MFA challenge.
  - `/account-recovery` supports social verification plus manual support request.
  - Supplier settings has Line/Google binding UI; supplier onboarding stores tokens in `SecureStorage`.

### Verified

- T0.2 accessible DB inventory: `pw_only = 0` on `orderly-472413:asia-east1:orderly-db-v2`; no separate production DB/service was discoverable in this project.
- `python3.11 -m compileall -q backend/app/modules/users backend/app/tests/test_auth_social_only.py` passed.
- Backend import smoke passed for `oauth`, `mfa`, `invitations`, `recovery`.
- Focused pytest passed: `backend/app/tests/test_auth_social_only.py` -> `5 passed`.
- Official backend gate passed: `direnv exec . bash -lc 'ENVIRONMENT=testing POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-orderly_dev_password} JWT_SECRET=${JWT_SECRET:-test} JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-test} PYTHONPATH=.:libs BACKEND_TEST_PYTHON=python3.11 bash scripts/ci/backend-test.sh'` -> Alembic + monolith pytest `12 passed`.
- `npm run type-check` passed.
- Playwright auth spec passed against worktree dev server: `PLAYWRIGHT_BASE_URL=http://localhost:5577 npx playwright test e2e/auth-login.spec.ts` -> `5 passed`.
- Password-removal grep has no product-path hits for active email/password auth/reset/verify-email routes; remaining hits are negative tests and retained historical `users.passwordHash` storage column assigned to `None`.

### Not completed / next exact prompt

Use this prompt only if the plan must be closed beyond auth-scope verification:

```text
Continue from /Users/leeyude/Projects/_worktrees/Tsaitung-Orderly-72d17797/refactor-login on branch refactor-login.

Read CLAUDE.md and docs/plans/20260608-auth-line-google-login/run.md first. Do not redo the auth implementation. Current auth scope is implemented and verified with:
- backend gate: scripts/ci/backend-test.sh -> 12 passed
- npm run type-check -> passed
- Playwright auth spec -> 5 passed

Close the remaining broader verification gaps:
1. If business requires repo-wide TS full green, fix the non-auth `npm run type-check:full` failures. The auth-scope filter currently has no matches; failures are in dashboard/supplier/shared areas.
2. Fix `npm --workspace shared/types run build`, currently blocked by existing `shared/types/src/customer-hierarchy.ts` enum merge errors at lines 389 and 431.
3. Run real Line and Google OAuth provider callback smoke with staging credentials and configured redirect URI `/auth/callback/{provider}`. Verify callback writes httpOnly cookies and SecureStorage, Google-unbound guides to Line, platform users require MFA, and audit rows are non-empty.
4. Record results back to docs/plans/20260608-auth-line-google-login/run.md before final.

Do not revert the auth changes. Use wt guard before edits.
```
