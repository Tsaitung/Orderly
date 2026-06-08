# Docs Diff Manifest — Auth Line/Google 登入模型

> 來源：`git diff -- docs`（2026-06-08，branch `refactor-login`）。10 檔變更，+274 / −180。

## Changed files

| 檔案 | 變更 | 層 |
|------|------|----|
| `docs/1-User-Story/by-module/01-auth-user-management.md` | modified | US（主真相）|
| `docs/1-User-Story/INDEX.md` | modified | US 衍生（計數）|
| `docs/1-User-Story/by-role/restaurant-roles.md` | modified | US 衍生 |
| `docs/1-User-Story/by-role/supplier-roles.md` | modified | US 衍生 |
| `docs/2-PRD/PRD-Auth-Module.md` | modified | PRD（主真相）|
| `docs/2-PRD/INDEX.md` | modified | PRD 衍生（計數）|
| `docs/0-Design/technical-architecture-auth.md` | modified | Specs |
| `docs/0-Design/API-Endpoints-Essential.md` | modified | Specs |
| `docs/4-Test/smoke-tests.md` | modified | Test |
| `docs/3-Development-Plan/PRD-US-GAP-REPORT.md` | modified | Dev plan（盤點）|

## Changed identifiers — User Stories

| ID | 狀態 | 變更摘要 | Traceability |
|----|------|----------|--------------|
| US-AUTH-001 | modified | 註冊唯一路徑 Line；移除 Email+密碼註冊；Email 改選填對帳用 | PRD 3.4 / Specs §0 |
| US-AUTH-002 | modified | 同 001（供應商）| PRD 3.4 |
| US-AUTH-003 | modified | 登入加 Google 次要；移除 Email+密碼登入 | PRD 4.1.1 |
| US-AUTH-004 | deprecated | 密碼重設停用（密碼廢除）| PRD 5（改帳號恢復）|
| US-AUTH-005 | modified | Level 1 Email→Line 帳號建立 | PRD 6 |
| US-AUTH-006 | renamed+modified | 改「Line 主要登入與 Google 次要綁定」；移除強制 Email 綁定；解綁保留至少一綁定 | PRD 4.1.1 |
| US-AUTH-007 | modified | MFA 方法移除 Email OTP | PRD 4.2 |
| US-AUTH-008 | renamed+modified | 改「Google 綁定與次要登入」；移除綁定 Email | PRD 4.1.1 |
| US-AUTH-010 | modified | 綁定狀態 Line/Email→Line/Google | PRD 9 |
| US-AUTH-014 | modified | 生物辨識回退 Line/Google（非密碼）| PRD 4.6 |
| US-AUTH-016 | renamed+modified | 平台改 Line/Google + 強制 MFA；移除獨立 Email+密碼系統 | PRD 4.5 |
| US-AUTH-021 | modified | 邀請流程 Email 備選→Google 次要；移除 Email 綁定 | PRD 3.5 |
| US-AUTH-022 | **added** | 社群帳號恢復（取代密碼重設）| PRD 5 |

## Changed identifiers — PRD sections（`PRD-Auth-Module.md`）

- **§0 登入模型變更（added，權威）**、§2.4 認證流程、§3.2 必填欄位、§3.3 驗證規則、§3.4 用戶故事、§3.5.2/3.5.3 邀請、§4.1 標準登入、§4.1.1（renamed: Line 主要登入與 Google 次要綁定）、§4.2 MFA、§4.5（renamed: 平台用戶登入 Line/Google+MFA）、§5（renamed: 帳號恢復流程）、§6 驗證等級、§7.1 加密與 Token、§8.1 路由、Appendix A 註冊範例、Document History（v1.1）。

## Changed identifiers — Specs（`technical-architecture-auth.md` / `API-Endpoints-Essential.md`）

- **§0 Auth Model Update（added，權威）**、§1.2 Password Hashing（移除）、§4.1 Login Endpoints（deprecated）、Password Management（deprecated）、`User.passwordHash`/`User.email`（deprecated-for-auth / billing-only）。
- `API-Endpoints-Essential.md`：`POST /api/auth/login`（password）→ 換為 `GET /api/auth/oauth/{provider}/initiate|callback`。

## Endpoint inventory（planned vs deprecated）

| 端點 | 狀態 | 來源檔 |
|------|------|--------|
| `GET /api/auth/oauth/{line\|google}/initiate` | planned/kept | PRD 8.1, API-Endpoints-Essential |
| `GET/POST /api/auth/oauth/{provider}/callback` | planned/kept | 同上（code 已部分有）|
| `POST /api/auth/social-bindings/{provider}` | planned | PRD 8.1 |
| `DELETE /api/auth/social-bindings/{provider}`（留至少一）| planned | PRD 8.1 |
| `POST /api/auth/account-recovery`（人工）| planned | PRD 5 |
| `POST /api/auth/mfa/{enable\|disable\|verify}`（僅 TOTP/SMS）| kept | PRD 8.1 |
| `POST /api/auth/login`（email/password）| **deprecated/remove** | Specs §4.1 |
| `/api/auth/password/{forgot\|reset\|change}` | **deprecated/remove** | Specs Password Mgmt |
| `POST /api/auth/verify-email` | **deprecated/remove** | PRD 8.1 |
| 公開 `POST /api/auth/register`（Email）| **deprecated/remove** | PRD 8.1 |

## DB / 契約

- `users.password_hash`：deprecated-for-auth（可保留 nullable，不參與登入）。
- `users.email`：選填、僅財務對帳、不要求 unique、不作登入識別。
- 社群綁定模型：需支援同帳號同時綁 Line + Google，解綁須保留至少一個。

## Frontend route

- `app/(auth)/login/page.tsx`：目前 Email+密碼表單 → 需重構為 Line（主）/ Google（次）CTA。

## Traceability check result

- US ↔ PRD ↔ Specs ↔ Test ↔ INDEX：每個變更 US 皆有對應 PRD section 與 Specs §0 條目，Test Plan（smoke-tests）已含對應測試項，INDEX 計數一致（AUTH 22 / 總計 106）。**零孤立**。
