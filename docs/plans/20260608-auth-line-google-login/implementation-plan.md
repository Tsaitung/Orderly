# Implementation Plan — Auth Line/Google 登入模型（removal-class, Large tier）

**Goal:** 把全平台登入從「Line 主 + Email/密碼/Google 備選 + Email OTP」收斂為 **Line（主要）/ Google（次要，須先綁定後可登入）兩種社群登入**；徹底移除密碼登入/重設/變更、Email 認證登入、Email OTP；Email 降為選填非 unique 的財務對帳欄位；平台內部帳號統一走社群登入 + 強制 MFA + 供裝允許名單；帳號恢復改走另一個已綁定社群帳號（雙失效→人工 support）。

**Architecture:** FastAPI monolith（`backend/app/modules/users/*`，dual-prefix 路由 `/api` + root）＋ Next.js App Router 前端（`app/(auth)/*`、`app/api/auth/*`）＋ PostgreSQL（SQLAlchemy + Alembic chain head `0003_acceptance_order_fk`）＋ 共用型別 `shared/types/src/*`。OAuth 既有 `backend/app/modules/users/api/v1/oauth.py`（Line/Google initiate/callback/link/unlink）已存在並保留強化。

**Tech Stack:** Python 3.11 / FastAPI / SQLAlchemy / Alembic / pytest（`scripts/ci/backend-test.sh` 單一 runner，CI 與 `make test-be` 共用）；TypeScript / Next.js / Zod（`lib/validation/auth-schemas.ts`）；Playwright（`playwright.config.ts`，`testDir: ./e2e`，`*.spec.ts`）；Redis（OAuth state / lockout）。

---

## Goals / Why

1. **單一登入真相**：登入只剩 Line（主）+ Google（次）。消除「密碼 / Email 仍可登入」這個與目標模型衝突的第二條認證路徑（Core Behavior #3：暴露衝突、選權威來源，不留第三種寫法）。
2. **攻擊面收斂**：移除密碼雜湊、密碼重設 token、Email OTP 後，與密碼相關的洩漏 / 重設劫持 / OTP 釣魚攻擊面整段消失。
3. **平台端不得降級**：移除「平台獨立 Email+password 登入」的同時，必須補上 **強制 MFA + 供裝允許名單**，否則平台帳號變成「只靠一個社群帳號即可登入」的淨降級（見 Risks #1）。
4. **可恢復性**：用第二個社群綁定取代密碼重設（US-AUTH-022）；強制至少保留 1 個有效社群綁定，避免使用者把自己鎖死。
5. **Email 去認證化**：Email 改 nullable、非 unique，只當財務對帳聯絡欄位，移除 `unique` 約束與 `email_verified*` 認證依賴。

權威來源（衝突時順序）：US-AUTH-001/003/006/008/016/022 → PRD `docs/2-PRD/PRD-Auth-Module.md` §0/§4.1.1/§4.5/§5 → Specs `docs/0-Design/technical-architecture-auth.md` §0 → Tests → code。

---

## In Scope

- **後端移除**：`POST /auth/login`（email+password）、`password.py` 整模組（forgot/reset/change）、`POST /auth/verify-email` + `POST /auth/send-email-verification`、`password_service.py`、`password_history.py` model、login/oauth/MFA 路徑中的 `password_hash` 使用、`POST /auth/register`（email+password 註冊）。
- **後端強化**：OAuth callback 加平台 MFA 強制 + 供裝允許名單；`unlink` 改「保留 ≥1 綁定」且移除 `has_password` fallback；`complete-registration` 移除隨機密碼；新增 account-recovery 端點。
- **DB / 契約**：`users.email` 改 nullable + 去 unique；drop `password_reset_token`/`password_reset_expires`；deprecate `email_verified*`/`password_changed_at`；drop `password_histories` 表；Alembic `0004` 遷移。shared/types 補 SocialProvider/SocialBinding/MFAMethod，去 password 欄位。
- **前端移除/重構**：`app/(auth)/login/page.tsx` email/password 表單 → Line/Google CTA；`app/(auth)/forgot-password/page.tsx` 整頁刪除；`app/api/auth/login/route.ts` 刪除；`app/(auth)/register/page.tsx` 去密碼欄位；`lib/validation/auth-schemas.ts` 去 password schema。
- **驗證**：RED-first integration（pytest）+ E2E（Playwright）+ grep 回歸 + audit 非空。

## Out of Scope

- 原生 App（US-AUTH-018）Line/Google SDK 整合（另案）。
- 既有 **production 密碼帳號** 的實際資料遷移執行（**T0.2 必須先盤點是否存在**；若存在則本計畫只產出決策，不在此 PR 內遷移）。
- gateway 以外其他微服務的 JWT claims 消費端重寫（僅對齊既有 `_build_claims()`）。
- 通知 / Email 寄送基礎建設改造（Email OTP 移除後 `otp_bridge.send_email_otp` 呼叫點清乾淨即可，不重寫寄信層）。

---

## Complexity Budget

| 類別 | 數量 | 明細 |
|---|---|---|
| 新增檔案 | 7 | `backend/.../api/v1/auth/recovery.py`、`backend/.../models/platform_provisioning.py`、Alembic `0004_auth_refactor_social_only.py`、`shared/types/src/social-auth.ts`、`app/(auth)/account-recovery/page.tsx`、`e2e/auth-login.spec.ts`、backend test pkg `backend/app/modules/users/tests/test_auth_social_only.py` |
| 新增 migration | 1 | `0004_auth_refactor_social_only`（down_revision = `0003_acceptance_order_fk`）|
| 新增端點 | 3 | `POST /auth/oauth/recover`（用第二社群恢復）、`POST /auth/account-recovery`（platform_support 人工）、平台供裝 allowlist 管理端點 `POST /auth/admin/platform-provisioning` |
| 移除端點 | 6 | `POST /auth/login`、`POST /auth/forgot-password`、`POST /auth/reset-password`、`PUT /auth/change-password`、`POST /auth/verify-email`、`POST /auth/send-email-verification`（+ 前端 `POST /api/auth/login` route）|
| 刪除整檔 | 6 | `backend/.../auth/login.py`、`backend/.../auth/password.py`、`backend/.../services/password_service.py`、`backend/.../models/password_history.py`、`app/(auth)/forgot-password/page.tsx`、`app/api/auth/login/route.ts` |
| Drop 資料表 | 1 | `password_history`（**單數**，= `__tablename__`，model `password_history.py:17`；非 `password_histories`）|
| Drop 欄位 | 2 | `users.password_reset_token`、`users.password_reset_expires` |
| 改 nullable / 去 unique | 1 | `users.email` |
| Enum 擴充 | 1 | `UserRole` 加 `platform_support`、`super_admin`（`ALTER TYPE ... ADD VALUE`，須在 txn block 外執行）— 否則平台供裝帳號與 platform_support 恢復 actor 無法寫入 |

---

## File Structure

> 路徑為 discovery findings 的 EXACT 路徑（相對 repo root）。

| 檔案 | 動作 | 職責 |
|---|---|---|
| `backend/app/modules/users/api/v1/auth/login.py` | Delete | `POST /auth/login`（email+password）整檔移除；`password_hash` login 使用（L56/L79）消失 |
| `backend/app/modules/users/api/v1/auth/password.py` | Delete | forgot(L34)/reset(L116)/change(L257)-password 三端點整模組移除 |
| `backend/app/modules/users/api/v1/auth/verification.py` | Modify | 刪 `POST /auth/send-email-verification`（L40）、`POST /auth/verify-email`（L110）；保留 `/auth/send-phone-verification`（L209）、`/auth/verify-phone`（L297）；解除 phone 對 email_verified 的前置依賴（L229）|
| `backend/app/modules/users/api/v1/auth/registration.py` | Modify | 移除密碼驗證 + `password_hash` 設定（L88）；email 改選填；公開 email+password 註冊路徑停用（改 OAuth complete-registration 為唯一建帳路徑）|
| `backend/app/modules/users/api/v1/auth/__init__.py` | Modify | 移除 `from .login`（L11）、`from .password`（L12）與對應 `include_router`（L21/L24）|
| `backend/app/modules/users/api/v1/oauth.py` | Modify | `complete-registration` 移除 `password_hash=pwd_context.hash(uuid.uuid4().hex)`（L340）；`unlink` 移除 `has_password` fallback、改「保留 ≥1 綁定」（L499/L508）；callback 加平台 MFA 強制 + 供裝 allowlist（L172-301）|
| `backend/app/modules/users/api/v1/auth/recovery.py` | Create | `POST /auth/oauth/recover`（用第二社群恢復）+ `POST /auth/account-recovery`（platform_support 人工，多證據 + 審計）|
| `backend/app/modules/users/api/v1/mfa.py` | Modify | enable/disable 移除密碼驗證（L204/L442）改社群 / OTP 驗證；MFA method enum 僅 TOTP/SMS |
| `backend/app/modules/users/services/password_service.py` | Delete | 密碼驗證 / 雜湊 / 歷史檢查整服務移除 |
| `backend/app/modules/users/models/password_history.py` | Delete | 密碼歷史 model 移除 |
| `backend/app/modules/users/models/user.py` | Modify | `email` 去 unique 改 nullable（L18）；drop `password_reset_token`/`password_reset_expires`（L58/L59）；`email_verified*`（L38/39）、`password_changed_at`（L57）deprecate；`password_hash`（L19）標註不參與認證 |
| `backend/app/modules/users/models/platform_provisioning.py` | Create | 平台供裝允許名單 model（社群帳號 → 預建平台帳號 mapping + require_mfa）|
| `backend/app/modules/users/schemas/auth.py` | Modify | 刪 `LoginRequest`(L12)/`RegisterRequest`password/`ForgotPasswordRequest`/`ResetPasswordRequest`(L50-69)/`ChangePasswordRequest`(L72)/`VerifyEmailRequest`(L95)；MFA enable/disable schema 去 password（L136-137/L181-182）；email schema 改選填 |
| `backend/app/modules/users/main.py` | Modify | `public_auth_paths` 移除 `/auth/login`(L25)、`/api/auth/login`(L28)、`/auth/forgot-password`(L33)、`/auth/reset-password`(L34)、`/api/auth/forgot-password`(L35)、`/api/auth/reset-password`(L36)、`/auth/verify-email`（L24-49 區塊）|
| `backend/app/alembic/versions/0004_auth_refactor_social_only.py` | Create | drop unique on email、email nullable、drop reset token 欄位、drop `password_histories` 表（down_revision=`0003_acceptance_order_fk`）|
| `shared/types/src/social-auth.ts` | Create | `SocialProvider`('line'\|'google')、`SocialBinding`、`MFAMethod`('totp'\|'sms')、`LoginWithSocialRequest/Response` DTO |
| `shared/types/src/index.ts` | Modify | `User`(L11-18)/`UserProfile`(L29-46)/`AuthClaims`(L57-66) email 改選填、加 socialBindings；移除 password_hash 引用 |
| `shared/types/src/supplier.ts` | Modify | `SupplierOnboardingRequest`(L168) 去 password；`AccountSetupFormData`(L305-306) 去 password/confirmPassword |
| `app/(auth)/login/page.tsx` | Modify | 移除 email/password 表單（L135-220）、`handleLogin`（L82）、forgot-password 連結（L188）；改 Line（主）/ Google（次）OAuth CTA |
| `app/(auth)/forgot-password/page.tsx` | Delete | 密碼重設整頁移除 |
| `app/(auth)/register/page.tsx` | Modify | 移除 password/confirmPassword（L24-25/L42-43/L154-177）；email 改選填 |
| `app/api/auth/login/route.ts` | Delete | email+password 代理登入 route（L60-113）整檔移除 |
| `app/(auth)/account-recovery/page.tsx` | Create | 帳號恢復頁：偵測已綁定社群、導向另一社群登入；雙失效→聯絡 platform_support |
| `lib/validation/auth-schemas.ts` | Modify | 刪 `loginFormSchema`(L76-80) password/`registerFormSchema`(L83-102) password/`passwordResetRequestSchema`(L113-115)/`passwordResetSchema`(L118-127)/`PASSWORD_RULES`(L12-21)/`basePasswordSchema`,`passwordSchema`(L35-40)；加 `socialLoginSchema` |
| `lib/auth/validation.ts` | Modify | 刪 `validatePassword`(L51-59)/`validatePasswordConfirmation`(L64-75)/`validateLoginForm`(L93-106)/`validateRegistrationStep1`(L111-134)/`validatePasswordResetForm`(L181-203)；`FormErrors`(L21-32) 去 password |
| `lib/auth/constants.ts` | Modify | 刪 `PasswordResetStep`、`RESET_MESSAGES`(L28-33)、`forgotPassword` route(L52-60)、MFA Email OTP 訊息；加 `SOCIAL_PROVIDERS` |
| `lib/auth/server.ts` | Modify | `LoginCredentials`(L31-34)/`RegisterData`(L36-44) 去 password；`AuthService.login()`(L122-164)/`register()`(L169-211) 改社群驗證；加 `verifySocialProvider()` |
| `lib/security/auth-service.ts` | Modify | **gut** `SecureAuthService.login()`(L131-215，內 `fetch('/api/auth/login')` L155 + body `{email,password}` L162)、`validateLoginInput()`、`hashPassword()`/`verifyPassword()`(L93-101)、password Zod schema(L17-22)。移除 email+password 登入模型（否則 T4.1 刪 route.ts 後此 class 呼叫死端點）。`grep -rn '/api/auth/login' app lib contexts` 須為 0 |
| `backend/app/modules/users/models/__init__.py` | Modify | 刪 `from ...password_history import PasswordHistory`（L14）與 `__all__` 的 `"PasswordHistory"`（L31）；否則刪 `password_history.py` 後 app boot ImportError（CLAUDE.md import-graph 規則）|
| `contexts/auth/services/auth-service.ts` | Modify | `performLogin()`(L36-81，email+password)→ `performOAuthLogin()` |
| `contexts/auth/AuthProvider.tsx` | Modify | `login()`(L119-147) 簽章由 `LoginFormData` 改 OAuth provider/code |
| `app/(auth)/supplier-onboarding/page.tsx` | Modify | 移除密碼欄位（L51-52/L342-367），改社群綁定選擇 + 引導綁第二社群 |
| `backend/app/modules/users/tests/test_auth_social_only.py` | Create | RED 測試：無密碼登入、Email 非認證、解綁保留 ≥1、平台 MFA、恢復流程 |
| `e2e/auth-login.spec.ts` | Create | RED E2E：登入頁無密碼欄位、Line/Google CTA 導向 OAuth |

---

## 命名目標進度表（removal progress）

> 每個命名目標都對應一個「真的把它從 codebase 刪掉」的 task（刪檔 / 刪路由 / 刪欄位使用），**不是** 加 docstring / allowlist / wrapper。grep 符號取自 discovery 實際命中。

| 命名目標（grep-able string） | 動詞 | 狀態 | 真的動的 task | 備註 |
|---|---|---|---|---|
| `POST /api/auth/login`（`@router.post("/auth/login"` in `auth/login.py:35`；前端 `app/api/auth/login/route.ts`）| delete | 真的動了 (T2.3) | T2.3, T4.1 | 後端整檔刪 `login.py` + `__init__.py` 去 `login_router`；前端刪 `route.ts`。`grep -rn '@router.*"/auth/login"' backend` 應為 0 |
| `/api/auth/password/*`（`auth/password.py` forgot/reset/change）+ `password.py` 模組 | delete | 真的動了 (T2.3) | T2.3 | 整檔 `password.py` 刪除 + `__init__.py` 去 `password_router`（L12/L24）。grep `forgot-password`/`reset-password`/`change-password` route 應為 0 |
| `POST /api/auth/verify-email`（`@router.post("/auth/verify-email"` in `verification.py:110`）+ `send-email-verification`（L40）| remove | 真的動了 (T2.3) | T2.3 | 在 `verification.py` 刪兩個 handler；保留 phone 驗證。grep `verify-email`/`send-email-verification` 應為 0 |
| `password_hash` 在 AUTH/login 路徑（`login.py:56,79`；`oauth.py:255-278,340,499,508`；`mfa.py:204,442`）| remove | 真的動了 (T2.1/T2.3) | T2.1, T2.3, T2.6, T2.2 | login 整檔刪；**oauth callback L255-278 email-match→「請使用密碼登入後綁定 OAuth」分支移除**（T2.1）；complete-reg 刪隨機密碼、unlink 刪 has_password fallback；mfa 刪密碼驗證。grep `password_hash` / `請使用密碼登入` 在 auth 分支應為 0 |
| 強制綁定 Email（**分散機制**：`registration.py` email required + `users.email` NOT NULL/unique + `oauth.py:255-278` email-match 綁定分支）| remove | 真的動了 (T2.1/T2.3/T3.1) | T2.1, T2.3, T3.1 | registration email 改選填（T2.3）；DB email 去 NOT NULL/unique（T3.1）；**oauth callback 不再以 email 比對帳號/導向密碼登入**（T2.1）。⚠️ 無單一 grep 字串，驗收需查 3 處 |
| 平台獨立 Email+password 登入（platform independent；`login.py` + `registration.py` 平台分支）| remove | 真的動了 (T2.3) | T2.3, T2.4 | 移除 `login.py`（唯一 email+password 入口）後平台亦只剩 OAuth；T2.4 補供裝 allowlist + 強制 MFA 取代之 |
| 前端 Email+password 登入（`app/(auth)/login/page.tsx` `handleLogin` L82 / `loginForm.password` / `/forgot-password` link L188 + `lib/security/auth-service.ts` `SecureAuthService.login()`→`/api/auth/login`）| remove | 真的動了 (T4.1) | T4.1 | 登入頁改 Line/Google CTA；gut `SecureAuthService` email+password 登入。⚠️ 登入頁用動態 `type={showPassword?...}`，字面 `type="password"` grep 現況已 0 = **false-pass**；權威驗收改 **T1.6 E2E `input[type=password]` count===0** + grep `handleLogin`/`loginForm.password`/`/api/auth/login` 殘留為 0 |

---

## Risks & Open Questions

1. **平台安全降級（HIGH，gate 必過）**：移除「平台獨立 Email+password」後，若沒同步上 **強制 MFA + 供裝允許名單**，平台帳號將變成「拿到一個社群帳號即可登入」的淨降級。緩解＝T2.4 必須在同一 PR 落地（強制 MFA、未在 allowlist 的社群帳號拒登、3 次失敗鎖 15 分、IP 白名單、審計），且由 **plan-review（auth 高風險）** 驗收逐項到位。**Open**：IP 白名單來源（靜態設定 vs 動態管理）需在 T0.1 確認。
2. **Production 密碼帳號 lockout（HIGH）**：移除密碼登入後，**只有密碼、無任何社群綁定** 的既有帳號會被鎖死。緩解＝T0.2 必須先盤點 production 是否存在此類帳號（`SELECT count(*) FROM users WHERE "passwordHash" IS NOT NULL AND id NOT IN (SELECT "userId" FROM oauth_links)`），**禁止假設沒有**；若存在，產出遷移 / 通知決策（強制綁社群 or 人工 re-provision）再決定 0004 是否 drop 欄位。
3. **`users.email` 去 unique 的歷史資料衝突（MED）**：去 unique 安全（放寬約束）；但若下游有 code 依賴 email 唯一查 user，會邏輯出錯。緩解＝T3.1 前 `grep -rn 'email ==\|where.*email' backend/app/modules/users` 確認登入 / 查詢不再以 email 為 key。
4. **Alembic 斷鏈（MED）**：0004 必須 `down_revision = '0003_acceptance_order_fk'` 且 `alembic upgrade head` 通過（CLAUDE.md 防斷鏈）。緩解＝T3.1 跑 `alembic history --verbose` + 本機 upgrade。
5. **Email OTP 移除後 phone 驗證前置依賴（MED）**：`verification.py:229` phone 驗證目前以 `email_verified` 為前置。緩解＝T2.3 解耦，phone 驗證不再要求 email 已驗。⚠️ `email_verified` 另有消費端 `services/verification_service.py` 與 `api/v1/oauth.py`；若 0004 deprecate `email_verified` 語意，T2.3/T3.1 須一併檢查這兩處（grep `email_verified` 全 module），避免遺留以 email 驗證為前提的邏輯。
6. **plan-review 要求**：此為 auth flow + schema migration + breaking API 三重高風險，**T0.1 plan-review 必過才能進 T1**（CLAUDE.md「高風險 plan 走 plan-review」）。
7. **Open**：Google 必須「先綁定才可登入」——首次以 Google 登入但帳號未綁 Google 時的 UX（拒登 + 引導改用 Line？）需在 T4.1 與 PRD §4.1.1 對齊確認。

---

## Tasks

> TDD：RED 測試先寫先失敗，再實作轉綠。每 task 2–4h。**禁止** mock/stub/fake/placeholder 進 production path。commit 訊息結尾加 Co-Authored-By（見 repo 規範）。後端測試一律 `bash scripts/ci/backend-test.sh`（或 `make test-be`，與 CI 同一 runner）。E2E 用 `npx playwright test e2e/<spec>`（先啟 dev server 於 `PLAYWRIGHT_BASE_URL`）。輸出不截斷：`> /tmp/log 2>&1` 再 `grep -nE 'FAIL|Error|passed|failed'`。

### T0 — Pre-implementation gate

- **T0.1 plan-review（auth 高風險）**
  - 依賴：本 packet。
  - 步驟：invoke `plan-review` skill；reviewer 逐項確認 Risks #1（平台 MFA/供裝/IP/鎖定/審計）、#2（密碼帳號盤點結論）、#7（Google 先綁定 UX）。
  - 驗收：`plan-gate-pass.json` 寫出且 risk mitigations 全部 acknowledged；**未過不得進 T1**。

- **T0.2 production 密碼帳號盤點**
  - 依賴：無。
  - 步驟：對 staging/production DB 跑 `SELECT count(*) AS pw_only FROM users WHERE "passwordHash" IS NOT NULL AND id NOT IN (SELECT "userId" FROM oauth_links);`（連線走 `scripts/db/diag.sh` 環境）。
  - 驗收：明確數字結論。`pw_only = 0` → 0004 可直接收緊；`pw_only > 0` → 在本檔 Risks #2 下記錄遷移 / 通知決策，**禁止「假設沒有」**。

### T1 — RED tests（先寫、先失敗）

- **T1.1 OAuth 登入 integration（RED）**
  - **Files:** Create `backend/app/modules/users/tests/__init__.py`、`backend/app/modules/users/tests/test_auth_social_only.py`。
  - 步驟：寫 `test_line_callback_issues_jwt`（斷言簽出 token decode 後 `type=='access'`、含 `tenant_id`/`org_id`/`token_version`、且回傳 refresh token + 寫入 `UserSession`）、`test_oauth_token_accepted_on_next_request`（用簽出 access token 打一個 authed endpoint 如 `/auth/linked-accounts` 應 200，非 401）、`test_google_callback_requires_prior_binding`（Google 未綁先拒）→ 跑 `bash scripts/ci/backend-test.sh` 確認 RED → commit。
  - 驗收：測試存在且失敗（目前 callback 簽 inline token 缺 `type:'access'`/`token_version`、無 refresh/session → authed 呼叫會 401）。

- **T1.2 無密碼 / Email 非認證（RED）**
  - **Files:** Modify `backend/app/modules/users/tests/test_auth_social_only.py`。
  - 步驟：寫 `test_post_auth_login_returns_404`（`POST /api/auth/login` 應 404/410）、`test_password_endpoints_gone`（forgot/reset/change → 404）、`test_verify_email_gone`、`test_register_does_not_require_email` → `bash scripts/ci/backend-test.sh` RED → commit。
  - 驗收：先紅（端點目前仍在 → 回 200/422，測試失敗）。

- **T1.3 social-bindings 解綁保留 ≥1（RED）**
  - **Files:** Modify `backend/app/modules/users/tests/test_auth_social_only.py`。
  - 步驟：寫 `test_unlink_last_binding_rejected`（僅 1 綁定時 `DELETE /auth/oauth/{provider}/unlink` 回 4xx，不依賴 `has_password`）、`test_unlink_one_of_two_ok` → RED → commit。
  - 驗收：先紅。

- **T1.4 平台供裝 allowlist + 強制 MFA（RED）**
  - **Files:** Modify `backend/app/modules/users/tests/test_auth_social_only.py`。
  - 步驟：寫 `test_platform_social_not_in_allowlist_rejected`、`test_platform_login_requires_mfa`（platform_admin OAuth callback 後在 MFA 通過前不簽 access token）→ RED → commit。
  - 驗收：先紅。

- **T1.5 帳號恢復 US-AUTH-022（RED）**
  - **Files:** Modify `backend/app/modules/users/tests/test_auth_social_only.py`。
  - 步驟：寫 `test_recover_via_other_social`（Line 失效→Google 登入成功）、`test_both_lost_requires_manual_support`（雙失效→人工端點 + 審計）→ RED → commit。
  - 驗收：先紅。

- **T1.6 登入頁 E2E（RED，必須早於 T4.1 impl）**
  - **Files:** Create `e2e/auth-login.spec.ts`。
  - 步驟：寫 `test('login page has no password field')`（`page.locator('input[type=password]')` count = 0）、`test('Line CTA navigates to oauth initiate')`、`test('Google CTA present')`；先啟 dev server（`PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run dev`）→ `npx playwright test e2e/auth-login.spec.ts` 確認 RED（目前頁面仍有 password input）→ commit。
  - 驗收：spec 存在且失敗（password input 仍在）。**此 task 必須在 T4.1 之前完成。**

### T2 — Backend

- **T2.1 OAuth 登入 + 帳號建立（修正 token 簽發 + 移除 email-match 分支）**
  - **Files:** Modify `backend/app/modules/users/api/v1/oauth.py`（`POST /{provider}/callback` L172-301、`POST /complete-registration` L304-376）。
  - 步驟：
    1. **統一 token 簽發**（修 callback L232-239 與 complete-reg L369-376 的 hand-rolled inline token）：load `Organization`；`claims = _build_claims(user, org)`；`access = create_access_token(claims)`；`refresh = create_refresh_token({'sub': str(user.id), 'token_version': user.token_version})`；寫一筆 `UserSession(user_id, token=refresh, expires_at=...)`；response 回 access **與** refresh（鏡像 `login.py:167-178`）。否則 token 缺 `type:'access'`/`token_version`，`get_current_user_from_token`（core.py:111,139）下一個請求即 401，且無 refresh 可續期。
    2. **移除 email-match→密碼登入分支**（callback L255-278）：刪除「以 email 比對既有帳號並回『此 Email 已註冊，請使用密碼登入後綁定 OAuth』」整段；社群登入不得以 email 解析帳號或導向密碼登入。
    3. **complete-registration**：移除 `password_hash=pwd_context.hash(uuid.uuid4().hex)`（L340，不設密碼）；`OAuthCompleteRegistrationRequest.email` 改 `Optional`（L91）、移除 duplicate-email 拒絕（L326）（否則無 email 的 Line 用戶無法經唯一建帳路徑完成註冊）；補 `tenant_id`/`tenant_type` 設定（對齊 `registration.py`）。
    4. **email 查詢去重**：callback/complete-reg 內 `User.email == ...` 的 `scalar_one_or_none()`（L259、L323）改 `.first()` 或顯式處理（email 去 unique 後可能 `MultipleResultsFound`）。
    → `bash scripts/ci/backend-test.sh`（T1.1 轉綠）→ commit。
  - 驗收：T1.1 綠（token `type=access` + `tenant_id`/`org_id`/`token_version` + 後續 authed 呼叫 200 + refresh/UserSession 寫入）；`grep -n 'uuid4().hex\|請使用密碼登入' backend/app/modules/users/api/v1/oauth.py` 為 0。

- **T2.2 social-bindings 綁定 / 解綁（保留 ≥1）**
  - **Files:** Modify `backend/app/modules/users/api/v1/oauth.py`（`POST /link` L404、`DELETE /{provider}/unlink` L484-512）。
  - 步驟：unlink 移除 `has_password = current_user.password_hash is not None`（L499）與 `if not has_password and oauth_count <= 1`（L508）改為「`oauth_count <= 1` 即拒」；綁定 / 解綁寫 audit → `bash scripts/ci/backend-test.sh`（T1.3 轉綠）→ commit。
  - 驗收：T1.3 綠；`grep -n has_password backend/app/modules/users/api/v1/oauth.py` 為 0。

- **T2.3 移除密碼面（核心 removal）**
  - **Files:** Delete `backend/app/modules/users/api/v1/auth/login.py`、`backend/app/modules/users/api/v1/auth/password.py`、`backend/app/modules/users/services/password_service.py`、`backend/app/modules/users/models/password_history.py`。Modify `backend/app/modules/users/api/v1/auth/__init__.py`（移除 `from .login`(L10)、`from .password`(L11)、`include_router(login_router)`(L21)、`include_router(password_router)`(L24)）、**`backend/app/modules/users/models/__init__.py`（移除 `from ...password_history import PasswordHistory`(L14) + `__all__` 的 `"PasswordHistory"`(L31)；否則刪 model 檔後 app boot ImportError）**、`backend/app/modules/users/api/v1/auth/verification.py`（刪 L40 `send-email-verification`、L110 `verify-email` handler；解耦 L229 phone 對 email_verified 依賴）、`backend/app/modules/users/api/v1/auth/registration.py`（**移除 `from ...password_service import PasswordService`(L17)** + 密碼驗證 + `password_hash` 設定 L88，email 改選填）、`backend/app/modules/users/schemas/auth.py`（刪 `LoginRequest`/`ForgotPasswordRequest`/`ResetPasswordRequest`/`ChangePasswordRequest`/`VerifyEmailRequest`，`RegisterRequest` 去 password）、`backend/app/modules/users/main.py`（`public_auth_paths` 移除 L25/L28/L33/L34/L35/L36 與 verify-email）。
  - 步驟：先 `grep -rn 'password_history\|PasswordHistory\|password_service\|PasswordService\|from .login\|from .password' backend/app/modules/users` 列全部 import 引用 → 刪檔 + 改 import → `python3 -c "import ast; ast.parse(open('backend/app/modules/users/api/v1/auth/__init__.py').read())"` + 同樣對 `models/__init__.py` ast.parse → `bash scripts/ci/backend-test.sh`（T1.2 轉綠）→ commit。
  - 驗收：T1.2 綠；`grep -rn 'PasswordService\|password_history\|PasswordHistory\|@router.*"/auth/login"\|forgot-password\|verify-email' backend/app/modules/users` 無 route/import 命中；app boot（alembic+pytest）不報 ImportError。

- **T2.4 平台供裝 allowlist + 強制 MFA**
  - **Files:** Create `backend/app/modules/users/models/platform_provisioning.py`。Modify `backend/app/modules/users/api/v1/oauth.py`（callback L200-253 加 role 判斷）。
  - 步驟：新增 allowlist model（social provider+external_id → 預建 platform user，require_mfa=true）；callback 對 `role in (platform_admin, platform_support, super_admin)` 校驗 allowlist 命中、未命中拒登、命中則強制 MFA challenge（MFA 通過前不簽 access token）；3 次失敗鎖 15 分（重用既有 lockout）→ `bash scripts/ci/backend-test.sh`（T1.4 轉綠）→ commit。
  - 驗收：T1.4 綠；plan-review Risk #1 緩解逐項對得上。

- **T2.5 account-recovery（社群 + 人工）**
  - **Files:** Create `backend/app/modules/users/api/v1/auth/recovery.py`。Modify `backend/app/modules/users/api/v1/auth/__init__.py`（include `recovery_router`）、**`backend/app/modules/users/main.py`（`public_auth_paths` 加 `/auth/oauth/recover`、`/auth/account-recovery` 及 `/api` 前綴版本）**。
  - 步驟：`POST /auth/oauth/recover`（列出已綁社群、用另一社群登入）；`POST /auth/account-recovery`（platform_support 人工，多證據 + 寫 audit）；⚠️ 恢復端點服務的是**已登出**用戶（無有效 token），**必須加入 `public_auth_paths`**，否則回 401 恢復不可達 → `bash scripts/ci/backend-test.sh`（T1.5 轉綠）→ commit。
  - 驗收：T1.5 綠；未帶 token 可達 recovery 端點；recovery 事件寫入 `audit_logs` 欄位非空。

- **T2.6 MFA 移除 Email OTP + 去密碼驗證**
  - **Files:** Modify `backend/app/modules/users/api/v1/mfa.py`（enable L204、disable L442 移除密碼驗證改社群 / OTP；application-level 拒 `mfa_method=='email'`）、`backend/app/modules/users/schemas/auth.py`（`MFAEnableRequest`/`MFADisableRequest` L136-137/L181-182 去 password 欄位）、`backend/app/modules/users/models/user.py`（`mfa_method` 註記僅 TOTP/SMS L47）。
  - 步驟：enable/disable 改以已綁社群或 OTP 驗證；⚠️ `mfa_method` 是 free `String(20)`（非 DB enum，comment 含 'EMAIL'）→ 在 app 層拒 'email'，並對既有 `mfa_method='EMAIL'` 的 row 決策（0004 backfill 改 NULL 並要求重設 MFA，或標記需重新註冊第二因素，**不得靜默失效**）→ `bash scripts/ci/backend-test.sh` → commit。
  - 驗收：`grep -n 'verify_password\|password' backend/app/modules/users/api/v1/mfa.py` 無密碼驗證；MFA enable 拒 email method；既有 `EMAIL` row 有明確處置（非靜默）。

### T3 — DB / shared-types

- **T3.1 users 欄位調整 + UserRole enum 擴充 + Alembic 0004**
  - **Files:** Create `backend/app/alembic/versions/0004_auth_refactor_social_only.py`（`down_revision = '0003_acceptance_order_fk'`）。Modify `backend/app/modules/users/models/user.py`（`UserRole` enum L8-12 加 `platform_support`/`super_admin`；`email` 去 unique 改 nullable L18；drop `password_reset_token`/`password_reset_expires` L58/59；deprecate 註記 `email_verified*` L38/39、`password_changed_at` L57、`password_hash` L19）。
  - 步驟：
    1. **UserRole enum 擴充**：migration 加 `op.execute("ALTER TYPE \"UserRole\" ADD VALUE IF NOT EXISTS 'platform_support'")` 與 `'super_admin'`；同步把兩值加進 `user.py` enum 定義。⚠️ `ALTER TYPE ... ADD VALUE` 舊版 PG 不可在 transaction block 內，須隔離（`op.get_bind().execution_options(isolation_level='AUTOCOMMIT')` 或放在其他 DDL 之前獨立 `op.execute`）。**否則 T2.4 平台供裝帳號與 T2.5 platform_support 恢復 actor 無法寫入（DB enum 約束）→ Risk #1 緩解與 both-lost 恢復雙雙失效。**
    2. email 去 unique + nullable：`op.drop_constraint`（email unique）、`op.alter_column('users','email', nullable=True)`。
    3. drop reset token 兩欄；`op.drop_table('password_history')`（**單數**，= model `__tablename__`(password_history.py:17)；用 `password_histories`(複數) 會 `table does not exist` 中止 upgrade）。
    4. downgrade 對稱（enum 值無法移除 → downgrade 註記不可逆）。依 T0.2 結論決定 `password_hash` 是否一併收緊。
    → `python3 -c "import ast; ast.parse(open('backend/app/alembic/versions/0004_auth_refactor_social_only.py').read())"` → `bash scripts/ci/backend-test.sh`（內含 `alembic upgrade head`）→ `cd backend && python -m alembic -c app/alembic.ini history --verbose`（鏈 0003→0004 不斷）→ commit。
  - 驗收：`alembic upgrade head` 通過；history 連續；invariant：upgrade 後 `password_history` 表不存在、`users.email` 可為 NULL 且非 unique、**插入一筆 `role='platform_support'` user 成功**。

- **T3.2 shared/types 對齊**
  - **Files:** Create `shared/types/src/social-auth.ts`。Modify `shared/types/src/index.ts`、`shared/types/src/supplier.ts`、`lib/auth/server.ts`、`contexts/auth/types.ts`。
  - 步驟：新增 `SocialProvider`/`SocialBinding`/`MFAMethod`/`LoginWithSocialRequest/Response`；`User`/`UserProfile`/`AuthClaims` email 改選填 + 加 socialBindings；`SupplierOnboardingRequest`(L168)、`AccountSetupFormData`(L305-306) 去 password；`LoginCredentials`/`RegisterData` 去 password → `npm run type-check` 通過 → commit。
  - 驗收：`grep -rn 'password' shared/types/src` 僅剩非 auth 用途（或 0）；`npm run type-check` 綠。

### T4 — Frontend

- **T4.1 登入頁重構（impl，須在 T1.6 RED 之後）**
  - **Files:** Modify `app/(auth)/login/page.tsx`（移除 L135-220 email/password 表單、L82 `handleLogin`、L188 forgot 連結）。Delete `app/api/auth/login/route.ts`。Modify `lib/security/auth-service.ts`（**gut** `SecureAuthService.login()`/`validateLoginInput()`/`hashPassword()`/`verifyPassword()` + password Zod schema，移除 `/api/auth/login` 呼叫）、`contexts/auth/services/auth-service.ts`（`performLogin`→`performOAuthLogin`）、`contexts/auth/AuthProvider.tsx`（`login()` 改 OAuth 簽章）、`lib/validation/auth-schemas.ts`（刪 `loginFormSchema` password、加 `socialLoginSchema`）、`lib/auth/validation.ts`（刪 `validateLoginForm`/`validatePassword`/`validatePasswordConfirmation`）、`lib/auth/constants.ts`（刪 `forgotPassword` route + `RESET_MESSAGES`）。
  - 步驟：登入頁改 Line（主）+ Google（次）CTA，點擊導向 `/api/auth/oauth/{provider}/initiate`；Google 未綁時依 PRD §4.1.1 拒登並引導改用 Line；gut `SecureAuthService` 的 email+password 登入 → 啟 dev server → `npx playwright test e2e/auth-login.spec.ts`（T1.6 轉綠）→ `npm run type-check` → commit。
  - 驗收：T1.6 綠（E2E `input[type=password]` count===0 為**權威**；登入頁動態 `type={showPassword?...}` 使字面 `type="password"` grep false-pass，不採用）；`grep -rnE 'handleLogin|loginForm\.password|/api/auth/login' "app/(auth)/login/page.tsx" lib/security/auth-service.ts` 為 0；`app/api/auth/login/route.ts` 不存在。

- **T4.2 forgot-password 頁刪除 + 帳號恢復頁**
  - **Files:** Delete `app/(auth)/forgot-password/page.tsx`。Create `app/(auth)/account-recovery/page.tsx`。Modify `lib/validation/auth-schemas.ts`（刪 `passwordResetRequestSchema`/`passwordResetSchema`）、`lib/auth/validation.ts`（刪 `validatePasswordResetForm`）、`lib/auth/constants.ts`（刪 `PasswordResetStep`）。
  - 步驟：刪頁 → `grep -rn "forgot-password" app lib contexts` 把殘留連結改指 account-recovery → 新增 recovery 頁（偵測已綁社群、導向另一社群；雙失效→聯絡 platform_support）→ `npm run type-check` + dev server 手動點通 → commit。
  - 驗收：`app/(auth)/forgot-password/page.tsx` 不存在；`grep -rn "forgot-password" app lib contexts` 無 dangling link。

- **T4.3 register 去密碼 + onboarding 引導綁第二社群**
  - **Files:** Modify `app/(auth)/register/page.tsx`（移除 password/confirmPassword L24-25/L42-43/L154-177、email 改選填）、`app/(auth)/supplier-onboarding/page.tsx`（移除密碼欄位 L51-52/L342-367，改社群綁定選擇 + 引導綁第二社群）、`lib/validation/auth-schemas.ts`（刪 `registerFormSchema` password）。
  - 步驟：去密碼欄位、email 選填、onboarding 加「綁 Google 作恢復保險」步驟 → `npm run type-check` + dev server 手動驗 → commit。
  - 驗收：`grep -rn 'type="password"' "app/(auth)/register/page.tsx" "app/(auth)/supplier-onboarding/page.tsx"` 為 0。

### T5 — Verification

- **T5.1 全測試綠**
  - 步驟：`bash scripts/ci/backend-test.sh > /tmp/be.log 2>&1; grep -nE 'FAIL|Error|passed|failed' /tmp/be.log`（全綠、無截斷）；`npx playwright test e2e/auth-login.spec.ts`。
  - 驗收：T1.1–T1.6 全綠，無 skip 掩蓋失敗。

- **T5.2 audit 非空驗證**
  - 步驟：跑登入 / 綁定 / 解綁 / 恢復一輪後 `SELECT count(*) FROM audit_logs WHERE entity_type IS NULL OR actor_id IS NULL;` 應為 0。
  - 驗收：audit 事件寫入且關鍵欄位非空（CLAUDE.md Audit Log 指南）。

- **T5.3 端點移除回歸 grep（命名目標歸零）**
  - 步驟：依命名目標進度表逐項 grep：
    - `grep -rn '@router.*"/auth/login"' backend/app/modules/users` → 0
    - `grep -rn 'forgot-password\|reset-password\|change-password' backend/app/modules/users/api` route 定義 → 0
    - `grep -rn 'verify-email\|send-email-verification' backend/app/modules/users/api` → 0
    - `grep -rn 'PasswordService\|password_history\|PasswordHistory' backend/app/modules/users` → 0
    - `grep -rn 'has_password\|uuid4().hex\|請使用密碼登入' backend/app/modules/users/api/v1/oauth.py` → 0
    - `grep -rn '/api/auth/login' app lib contexts` → 0（含 `lib/security/auth-service.ts`）
    - 登入頁（動態 type）：E2E `input[type=password]` count===0（**權威**）+ `grep -rnE 'handleLogin|loginForm\.password' "app/(auth)/login/page.tsx"` → 0（**不**用字面 `type="password"`）
    - register/onboarding（字面 type 有效）：`grep -rn 'type="password"' "app/(auth)/register/page.tsx" "app/(auth)/supplier-onboarding/page.tsx"` → 0
    - `test -e app/api/auth/login/route.ts` → 不存在；`test -e "app/(auth)/forgot-password/page.tsx"` → 不存在
  - 驗收：全部 0 / 不存在；每個命名目標真的消失。

- **T5.4 plan-review 緩解確認 + verify-pr-local**
  - 步驟：對照 T0.1 plan-review Risk #1/#2/#7 逐項確認落地；跑 `direnv exec . make verify-pr-local > /tmp/vpl.log 2>&1; grep -nE 'FAIL|Error|passed' /tmp/vpl.log`。
  - 驗收：緩解逐項到位；`verify-pr-local` 綠（與 CI 同一 runner）。

### 完成定義

T1.1–T1.6 全部由紅轉綠；T5.1–T5.4 通過；7 個命名目標 grep 全部歸零 / 檔案不存在；audit 非空；Alembic `upgrade head` 通過且鏈不斷；plan-review 緩解逐項確認；無 mock/stub/placeholder 進 production path；本 packet 與 US/PRD/Specs/Test 一致。

---

## SDTDD authority chain

衝突時自上而下覆蓋：

1. **US-AUTH-001/003/006/008/016/022**（使用者需求事實）
2. **PRD `docs/2-PRD/PRD-Auth-Module.md` §0 / §4.1.1 / §4.5 / §5**（覆蓋下游 specs）
3. **Specs `docs/0-Design/technical-architecture-auth.md` §0**（實作 PRD）
4. **Tests**（`backend/app/modules/users/tests/test_auth_social_only.py`、`e2e/auth-login.spec.ts`、`docs/4-Test/smoke-tests.md`）— 驗證 Specs
5. **Code** — 實作已驗證的 specs

任何衝突一律以 PRD §0 / Specs §0 為準。

## 開發前完成度檢查表

- [ ] T0.1 plan-review（auth 高風險）通過，`plan-gate-pass.json` 新鮮且 risk mitigations 已 acknowledge
- [ ] T0.2 production 密碼帳號盤點有明確數字結論（非「假設沒有」），且 0004 收緊範圍依此決定
- [ ] 7 個命名目標每個都對到「真的刪除」的 task（T2.3/T2.6/T2.2/T4.1），非 docstring/allowlist/wrapper
- [ ] RED 測試（T1.1–T1.6）皆先寫先失敗，且 E2E（T1.6）排在 login 重構（T4.1）之前
- [ ] Alembic 0004 `down_revision='0003_acceptance_order_fk'`，本機 `upgrade head` + `history --verbose` 驗過
- [ ] 後端測試一律 `bash scripts/ci/backend-test.sh`（與 CI 同一 runner），輸出不截斷（`> /tmp/log` 再 grep）
- [ ] 刪 / 搬檔前 `grep -rn` 掃 import / route / public_auth_paths / Makefile，確認無 dangling 引用
- [ ] Risks #1（平台 MFA/供裝/IP/鎖定/審計）在同一 PR 落地，不留隱性 debt

---

## Changes Made — Round 1（workflow 3-lens 對抗 review）

workflow（removal-completeness / correctness / tdd-ordering 三 lens，reviewer 實讀 code）抓到 7 個 code-grounded must-fix，全部已套：

- **M1（removal 漏網，HIGH）** `lib/security/auth-service.ts` `SecureAuthService.login()`→`/api/auth/login` 整段未被任何 task 觸及 → 補進 File Structure + T4.1 Files + 進度表 target #7 + T5.3 grep。
- **M2（dangling import boot break，HIGH）** 刪 `password_history.py` 但 `models/__init__.py:14/31` 仍 import/export、`registration.py:17` import `PasswordService` → 補進 T2.3 Files + ast.parse 檢查。
- **M3（殘留密碼登入分支，HIGH）** `oauth.py:255-278` email-match→「請使用密碼登入後綁定」分支無人移除 → 補進 T2.1 step 2 + 進度表 target #4/#5 + T5.3 grep `請使用密碼登入`。
- **M4（migration boot break，HIGH）** `op.drop_table('password_histories')` 表名錯（實為單數 `password_history`）→ 修 T3.1 + Complexity Budget。
- **M5（target unachievable，HIGH）** `UserRole` enum 無 `platform_support`/`super_admin`，平台供裝帳號與恢復 actor 無法寫入 → T3.1 加 `ALTER TYPE ADD VALUE`（txn block 外）+ user.py enum + invariant test。
- **M6（primary login broken，HIGH）** OAuth callback hand-rolled token 缺 `type:'access'`/`token_version`、無 refresh/session → 下個 authed 請求即 401 → 重寫 T2.1 step 1（`_build_claims`+`create_refresh_token`+`UserSession`）+ T1.1 斷言。
- **M7（false-pass 驗收，MED）** 登入頁動態 `type={showPassword?...}` 使字面 `type="password"` grep 現況已 0 → T4.1/T5.3 改 E2E `input[type=password]` count===0 為權威。

折入 warnings：recovery 端點進 `public_auth_paths`（T2.5）、`complete-registration` email 改 Optional + 去 dup 拒絕 + `.first()` 去重（T2.1）、`mfa_method='EMAIL'` backfill（T2.6）、`email_verified` 其他消費端（Risks #5）。
