# Implementation Plan — Super Admin Impersonation / Act-as

> Owner: us-edit (transient-work-artifact). Does NOT carry canonical business truth — references canonical docs only.
> Canonical truth: US-AUTH-023/024, PRD-Auth §2.5, technical-architecture-auth §10.3, ADR-0005, INV-auth-003.

## 概述與目標

讓 `super_admin` 可從使用者清單為起點，切換進任一帳號/角色，進入其公司或供應商租戶操作，用於支援、問題重現與跨租戶流程驗證。核心安全姿態：**化身目標角色（act-as）**，不是全權 God mode；與既有 `super_user` 緊急 break-glass 為兩套獨立機制。

## In Scope
- impersonation session：start / stop / current 端點 + 帶 `act_as` claim 的短效 token
- effective tenant context = 目標租戶；token/audit 雙記錄 actor + impersonated（INV-auth-003）
- 授權以目標 role/permissions 為準，不繼承 super_user override/bypass
- view-as 純前端介面預覽 lens（不呼叫後端 role-switch endpoint、不換 token、不建立租戶 session）
- 使用者清單每列「切換到此帳號」入口（super_admin only）
- 模擬期間全程橫幅 + 一鍵退出；session TTL 自動到期
- impersonation mutating request 審計（不可關閉；由 act-as audit middleware 強制）

## Out of Scope
- `super_user` 緊急 break-glass 機制變更（維持 US-AUTH-012 現狀）
- 平台帳號供裝/登入流程變更（US-AUTH-016 不變）
- 前端設計系統元件全套（僅橫幅 + 清單入口 + 角色切換選單）
- `super-admin-guide.md` playbook 全面改寫（本次僅標記過期；改寫另開 task）

## 依賴圖
```
US-AUTH-023/024 (US) ── PRD §2.5 ── tech-arch §10.3 ── ADR-0005 / INV-auth-003
        │                                   │
        ▼                                   ▼
 backend/app/modules/users (auth)     shared/types (impersonation DTO / act_as claim)
        │                                   │
        ▼                                   ▼
 AuthMiddleware (orderly_fastapi_core, 既有)  frontend（清單入口 + 橫幅 + view-as nav-lens）
```

## File Structure（既有 code 錨點 — 2026-06-09 驗證）

> 以下路徑經 plan-review Phase A-2 對實際 repo 驗證。impersonation **複用既有 auth 基礎設施**，避免重造。

| 檔案 | 動作 | 職責 / 既有狀態 |
|------|------|----------------|
| `backend/app/modules/users/services/super_user_service.py` | Reference（不改）| 既有緊急 `super_user`（24h、雙核准、audit）；impersonation 為**獨立 sibling service**，沿用其 audit 注入模式但不共用啟用邏輯 |
| `backend/app/modules/users/services/impersonation_service.py` | Create | impersonation start/stop/current 業務邏輯；view-as 不進此 service，僅前端 local UI state |
| `backend/app/modules/users/services/session_service.py` | Modify | 既有 Redis SessionService（create/terminate/blacklist）；新增 impersonation session（存 `act_as` context + TTL）。G1 精確錨點：`SESSION_TTL_SECONDS` 目前固定 7 天（:24），`create_session()` 無 per-session TTL（:61-147），且 `session:<id>` / `user_sessions:<user>` / `jti_session:<jti>` TTL 都寫死該常數（:122-137）→ 需新增相容的 `ttl_seconds` 參數，act-as token `exp`、Redis session、JTI mapping 三者同源 |
| `backend/app/modules/users/services/audit_service.py` | Modify/Reference | 既有 audit 寫入；impersonation 事件走此 |
| `backend/app/modules/users/models/audit_log.py` | Reference（不改）| `AuditLog` **已有** `user_id`(actor)+`target_user_id`(被模擬)+`organization_id`(租戶)+`event_metadata`(JSON) → 雙 id 稽核**免新欄位**。但 `event_type`(:89)、`user_id`(:98)、`organization_id`(:102)、`target_user_id`(:105) 皆 `nullable=True`，只有 `event_metadata`(:115) `nullable=False` → impersonation 非空要求必須由 app 層斷言強制 |
| `backend/app/modules/users/models/user.py` | Reference（不改）| 既有 `role` / `permissions`(JSON) / `tenant_id` / `organization_id` / `is_super_user`；act-as 讀目標的 `role`+`permissions` |
| `backend/app/modules/users/api/v1/auth/core.py` | Modify | **act_as claim 的家**：既有 `_build_claims(user, org)`（core.py:32）+ `create_access_token(data, expires_delta)`（:58-66）簽發 JWT。impersonation 在此簽發帶 `act_as` 的短效 token：effective claims（`sub`/`tenant_id`/`org_id`/`permissions`/`role`）= **目標帳號**，actor（super_admin）只進 `act_as` block 供 audit。G1 要求使用 `expires_delta=timedelta(seconds=IMPERSONATION_SESSION_TTL_SECONDS)`；若需 session 取得 `jti`/`exp`，以相容 helper 回傳 token+payload，保留既有 `create_access_token()` signature |
| `backend/app/modules/users/api/v1/auth/token.py` | Modify | G2 精確錨點：`POST /auth/refresh`（:30-113）是 public refresh endpoint，接受 bearer 或 JSON body（:36-49），只驗 refresh JWT type/sub/token_version（:51-70），再固定簽新 access + refresh（:78-95）；目前不查 DB session row、不查 blacklist、不拒 `act_as`。需在 decode 後、issue tokens 前拒絕任何 `payload.get("act_as")`，並保證 act-as start 不簽 refresh token |
| `backend/app/modules/users/api/v1/auth/` | Create | impersonation router（start/stop/current），與既有 `admin.py`/`token.py`/`core.py` 同 subpackage；**不建立** `/auth/role-switch` |
| `backend/app/middleware/impersonation_audit.py` | Create | app-level act-as audit middleware；接進 `backend/app/main.py` 的 live monolith stack，在 auth context 可用後攔截 act-as mutating request，pre-write audit，失敗 fail-closed |
| `backend/libs/orderly_fastapi_core/middleware/auth.py` | Modify | **唯一活的 auth 中介層**（main.py:19/128 註冊）：`dispatch()`(auth.py:91-135) 解 JWT → `request.state.user`(payload)/`user_id`(=`sub`)/`tenant_id`(=`tenant_id` or `org_id`)/`permissions`。act_as token 帶 target claims 時 effective context **自動透傳給 request.state 消費者**。**但兩個缺口需補**：(1) `dispatch()` 目前只驗簽章+exp、**不查 blacklist**（`is_token_blacklisted` session_service.py:377 僅 write 端呼叫）→ stop 失效契約須在此加 jti blacklist 檢查；(2) 下游 orders/products/billing 讀 **client `X-Tenant-Id`** 非 request.state（見下方 header 調和列）。`backend/app/modules/gateway_compat/` 為退役空殼（git ls-files 無 source，**勿錨**）|
| `backend/app/main.py` | Modify | 將 act-as audit middleware 接進活的 monolith middleware stack，並以 canary test 證明它在 `AuthMiddleware` 填好 `request.state` 後執行，且 business handler 前已有 audit |
| `backend/app/modules/{orders,products,billing}/api/v1/*` 的 tenant helper | Modify（調和）| 既有 `get_tenant_id` 從 client `X-Tenant-Id`/`X-Org-Id` 讀（orders.py:37、products.py:252、billing/fee_configs.py:27、customer_prices.py:88）。impersonation 下須以 `request.state.tenant_id`(effective target) 為準；若 client header 與 effective 不符 → 403（防 client 竄改 X-Tenant-Id 跨租戶）|
| `shared/types/src/` | Create/Modify | impersonation DTO + `act_as` claim 型別 |
| frontend（Next.js App Router）| Create/Modify | 使用者清單列入口 + 全域橫幅 + 帳號選單 view-as nav-lens（local UI state only）|

> **租戶語意註**：codebase 真實租戶主鍵為 `organization_id`（NOT NULL FK），`tenant_id` 為 nullable 別名（符合 CLAUDE.md「現用 organizationId 別名」）。impersonation 的「effective tenant」實作對應 `organization_id`（+ 同步 `tenant_id`）。

## 技術選型確認
- 後端：FastAPI modular monolith `backend/app/modules/users`（auth）；Alembic 單一 root
- token：沿用既有 JWT 機制，在 `users/api/v1/auth/core.py`（`_build_claims` + `create_access_token`）簽發帶 `act_as` claim block 的短效 token。**effective identity 契約**：JWT 的 `sub`/`tenant_id`(or `org_id`)/`permissions`/`role` 一律帶 **effective target**（被模擬帳號），`actor_user_id`(super_admin) 只存在 `act_as` block。理由：唯一活的 `AuthMiddleware`（`orderly_fastapi_core/middleware/auth.py:128`）`dispatch()` 把 `request.state.user_id`/`tenant_id`/`permissions` **直接從 JWT claims 推導** → 只要 `sub`/`tenant_id`/`permissions` 帶 target，effective context 即**自動透傳給 request.state 消費者**。**但兩個缺口須補（非全自動）**：(a) **stop 失效**——`dispatch()` 不查 blacklist，須在 auth validator 加 `is_token_blacklisted(jti)` 檢查；(b) **header 調和**——orders/products/billing 讀 client `X-Tenant-Id` 非 request.state，須改以 effective `request.state.tenant_id` 為準、mismatch 回 403。**業務授權與 current-user 一律用 effective target**，**audit 用 actor+target**，**禁止繼承 actor 的 `is_super_user` override**（不破 INV-auth-001 / INV-auth-003）
- session 失效：`stop` 必 `terminate_session` + `blacklist_token(jti)`（既有 `SessionService` 已有此能力）。**但既有 `AuthMiddleware` 與 `get_current_user_from_token` 目前都不查 blacklist**（`is_token_blacklisted` 只在 write 端被呼叫）→ 須在 auth validator 補 `is_token_blacklisted(jti)` 檢查，否則 blacklist 寫了也不生效、舊 act-as token 仍可用。補後：舊 act-as token 對 protected 非 auth route 立即 401/403；`current` 反映 active/expired
- **TTL 自然到期失效（Round-5 gap G1）**：活的 `AuthMiddleware.dispatch()`(`backend/libs/orderly_fastapi_core/middleware/auth.py:91-146`) 只檢查 JWT 簽章/`exp`（`:110-115`）+（C3 補後）blacklist，不查 impersonation Redis session 是否仍存在。`SessionService.create_session()` 目前 TTL 寫死 7 天（`session_service.py:24`, `:122-137`）。若 session TTL < access-token `exp`，session 在 Redis 自然到期（無明確 stop → 無 blacklist 寫入）後、token `exp` 未到前，舊 act-as token **仍能打 protected route**。**契約**：單一 `IMPERSONATION_SESSION_TTL_SECONDS` 同時驅動 act-as access-token `exp`、Redis `session:<id>` TTL、`user_sessions:<user>` expire、`jti_session:<jti>` TTL；不得 > TTL，也不得在 token/Redis/JTI mapping 間漂移。因 `create_access_token()` 只回字串，實作可抽出相容 helper 取得 `jti`/`exp`，但不得破壞既有呼叫者。
- **act-as 不得可 refresh（Round-5 gap G2）**：`create_refresh_token()`(`core.py:70-76`) 存在且簽 7 天；正常登入/MFA/OAuth 會發 refresh（`auth/token.py:78-80`、`oauth.py:273-280`、`mfa.py:425-438`）。`/auth/refresh` 是 public path（`orderly_fastapi_core/middleware/auth.py:33-40`、`users/main.py:23-45`），端點接受 bearer/body（`auth/token.py:36-49`），只驗 JWT type/sub/token_version（`:51-70`），然後固定簽新 access+refresh（`:78-95`）；目前不查 DB `sessions` row，也不拒 `act_as`。**契約**：impersonation start 不得呼叫 `create_refresh_token()`、不得建立 refresh `UserSession` row，Redis session 的 `refresh_token_jti=None`；`refresh_token_endpoint()` decode 後、issue tokens 前遇到 `payload.get("act_as")` 一律拒絕（選擇拒絕，不做 strip/還原 actor）。
- audit：**複用既有 `AuditLog` 欄位**（`user_id`=actor、`target_user_id`=impersonated、`organization_id`=tenant、`event_metadata`=session context）→ **預設不需新 audit 欄位 / 不需 Alembic 遷移**。**Round-6 G3 定案**：repo 目前無 audit middleware，core middleware 只有 `auth`/`rate_limit`/`security_headers`，`audit_service.log` 是 call-site explicit 且住在 users module，orders/products/billing 端點不呼叫 audit_service；因此新增 act-as audit middleware，不收斂「不可關閉」範圍。middleware 偵測帶 `act_as` 的 mutating request（POST/PUT/PATCH/DELETE），在 business handler 執行前寫 `impersonation_mutating_request` audit，metadata 含 actor/target/effective tenant/method/path/request_id/session；缺 context 或 audit write 失敗時 fail closed，避免跨模組 orders/products/billing 出現未審計寫入。**Round-6 G4 驗證**：`AuditLog.event_type`(`audit_log.py:89`)、`user_id`(`:98`)、`organization_id`(`:102`)、`target_user_id`(`:105`) 皆 `nullable=True`（只有 `event_metadata`(`:115`) `nullable=False`）；`audit_service.log()` (`audit_service.py:42-59`) 接受 optional 欄位並在 `:92-107` 原樣寫入，**無非空 guard**。T2.5「非空」必須是 **application 層斷言，DB/service 不強制**；impersonation audit 寫入路徑須拒絕空 `event_type`/actor/target/tenant/session metadata，並加 DB 無 nullable impersonation row 的測試。
- **MFA-passed / recent-MFA signal（Round-6 G6，implementation precondition）**：目前 repo **沒有**可供 impersonation start guard 使用的 runtime signal。證據：`_build_claims()` (`backend/app/modules/users/api/v1/auth/core.py:32-55`) 無 `mfa`/`amr`/`acr`/`auth_time`/`mfa_verified_at`；token creators (`core.py:58-76`) 只加 `exp`/`type`/`jti`；MFA verify success (`backend/app/modules/users/api/v1/mfa.py:425-453`) 用一般 claims 簽 access/refresh，沒有把 MFA 驗證時間/方式寫入 token；DB session (`backend/app/modules/users/models/session.py:8-17`) 與 Redis session payload (`backend/app/modules/users/services/session_service.py:104-118`) 無 MFA flag/timestamp；grep `amr|acr|mfa_verified|mfa_passed|recent_mfa|last_mfa|auth_time|step_up` 未找到可用 signal。`mfa_enabled`/`mfa_enforced_at` 只代表帳號設定狀態。**實作前置條件**：先建立 deterministic recent-MFA signal（token claim 或 server-side session flag + TTL），再讓 T2.2 依此 guard start；未完成前不得宣稱 MFA guard 完成。
- 契約：`shared/types` 定義 impersonation DTO + `act_as` claim 型別
- view-as：**Round-6 G5 定案**為純前端 nav-lens；不建立 `/auth/role-switch`，不簽 access token、不簽 refresh token、不建立 tenant session、不加入 `act_as` claim，也不接受 client preview role 作為後端授權依據。後端仍以真實 super_admin session 授權，view-as 只影響前端導航預覽與 frontend preview event。
- 前端：Next.js App Router；帳號選單 view-as nav-lens + 使用者清單列入口 + 全域橫幅

## 實作順序（backend → contract → frontend → verification）
1. **Contract**：`shared/types` 定 impersonation DTO + `act_as` claim 型別
2. **Backend auth**：新 `impersonation_service.py` + `api/v1/auth/` router（start/stop/current；不含 role-switch）；session 走既有 `SessionService`；於 `core.py`（`_build_claims`/`create_access_token`）簽發帶 `act_as` 的 token，effective claims（`sub`/`tenant_id`/`permissions`/`role`）= 目標帳號；guard（super_admin + **real recent-MFA signal** + target active）。注意：現有 `mfa_enabled` 不足以代表 recent-MFA，須先完成 G6 precondition。
3. **Backend authz**：既有 `AuthMiddleware`（`orderly_fastapi_core/middleware/auth.py`）已把 `request.state.user_id`/`tenant_id`/`permissions` 從 JWT claims 推導，**對 request.state 消費者 effective context 自動生效**（移除「重造 gateway middleware」的假工作）。但須補三類真工作：(a) **blacklist 檢查**——在 auth validator 加 `is_token_blacklisted(jti)`，使 stop 後舊 act-as token 401/403（既有 dispatch 不查 blacklist）；(b) **header 調和**——orders/products/billing 的 tenant helper 改以 `request.state.tenant_id`(effective) 為準，client `X-Tenant-Id` mismatch 回 403（防跨租戶）；(c) **effective-only 斷言**——只取 target 的 `role`/`permissions`/`organization_id`，`act_as.actor_id` 僅供 audit，不從 actor `is_super_user` 套 override。確保 INV-auth-001/003 仍成立
4. **Backend audit**：start/stop 走 impersonation service explicit audit；跨模組 mutating request 走新增 act-as audit middleware，填 `user_id`(actor) + `target_user_id`(impersonated) + `organization_id`(tenant) + `event_metadata`（session/method/path/request_id）。所有 impersonation audit 寫入路徑先做 app 層非空 assertion；audit 缺 context 或寫入失敗時 fail closed
5. **Alembic（條件性）**：**預設不需要**——僅當 `act_as` session 需要 User/AuditLog 上的專屬持久欄位（如 `impersonated_by`）才 autogenerate 遷移 + server_default。先確認既有欄位不足再加。
6. **Frontend**：使用者清單「切換到此帳號」入口（super_admin only）；帳號選單 view-as nav-lens（local state only，不呼叫 role-switch endpoint）；全域「正在以 X 身分操作」橫幅 + 一鍵退出
7. **Verification**：將 smoke Test Plan（docs/4-Test）轉 `backend/app/tests/test_impersonation.py` backend pytest 可執行；跨租戶隔離 + 權限約束 + 雙 context audit 各驗一條。focused backend commands：`cd backend/app && PYTHONPATH=. pytest tests/test_impersonation.py -q`；G1/G2 slices：`cd backend/app && PYTHONPATH=. pytest tests/test_impersonation.py::test_act_as_natural_expiry_is_enforced_by_token_exp tests/test_impersonation.py::test_act_as_start_does_not_issue_refresh_token tests/test_impersonation.py::test_refresh_endpoint_rejects_act_as_refresh_token -q`；回歸：`cd backend/app && PYTHONPATH=. pytest tests/test_auth_social_only.py tests/test_composition_smoke.py -q`

## 里程碑
- M1 Contract + backend endpoints（start/stop/current）green
- M2 authz 化身 + 跨租戶隔離整合測試 green（驗 INV-auth-003 / INV-auth-001）
- M3 frontend 入口 + 橫幅 + view-as nav-lens
- M4 audit 完整 + 全 Test Plan 轉整合測試通過

## 風險評估
- **跨租戶資料外洩**：authz bug 致 effective tenant 未正確切換 → 用整合測試驗「模擬 A 讀不到 B」；repository 層強制 tenant_id（INV-auth-001）。**具體向量**：orders/products/billing 讀 client `X-Tenant-Id` header，impersonation 下若不以 effective `request.state.tenant_id` 為準，client 竄改 header 即可跨租戶 → 須 reconcile + mismatch 回 403（見 T2.4）
- **權限提升**：act_as 誤繼承 super_user override → 測「act-as operator 不能改價目」回 403
- **審計缺漏**：impersonated 操作未記 actor。**Round-6 修正**：repo **無既有 audit 中介層**（core middleware 僅 auth/rate_limit/security_headers，audit_service.log 為 call-site explicit，跨模組端點不呼叫）→ 本 plan 選定新增 act-as audit middleware，覆蓋帶 `act_as` 的 mutating request，缺 context 或 audit write 失敗時 fail closed；start/stop 本身仍 explicit audit。
- **token 偽冒**：`act_as` claim 被竄改 → 沿用既有 JWT 簽章；start 端點 server-side 驗 super_admin + MFA
- **短效 TTL 被繞過（Round-5）**：(G1) session TTL < token `exp` 時自然到期不擋後端 → 釘 token `exp`、Redis session TTL、JTI mapping TTL 同源；(G2) act-as 可 refresh → 短效形同虛設 → start 不簽 refresh token、不建 refresh session row、refresh 端點拒 `act_as`。兩者見技術選型 session 失效段與 tasks T2.8/T2.9。
- **view-as 越權寫入（Round-6 G5 resolved）**：view-as 定為純前端 nav-lens，不換 token、不建 tenant session；後端直打 mutating endpoint 仍以真實 super_admin session 授權，不因 preview role/tenant 寫入。
- **MFA-passed 信號不存在（Round-6 G6）**：T2.2 要求 caller MFA-passed，但已確認現有 token/session/user model 沒有 recent-MFA runtime signal；`mfa_enabled=True` 不是本次已驗證。先新增 signal + expiry + tests，再實作 impersonation start guard；否則 start guard 無法可靠判定。

## SDTDD Authority Chain
US-AUTH-023/024 → PRD §2.5 → tech-arch §10.3 → ADR-0005 / INV-auth-003 → Test Plan（docs/4-Test/smoke-tests.md）→ backend executable tests in `backend/app/tests/test_impersonation.py`（目前 repo 的 Python backend test home）。Repo 無 SDTDD hook，但依 CLAUDE.md 測試/audit 規範執行。

## 開發前完成度檢查表
- [x] US/PRD/Spec/Test Plan/derived 已同步（us-edit）
- [x] ADR-0005 已建立（governance）
- [x] INV-auth-003 已落 business-invariants（governance）
- [x] 決策凍結落盤 run.md（governance）
- [x] Governance Gate: pass
- [x] 計畫技術 claim 對實際後端 code 驗證（plan-review Phase A-2）
- [x] **Round-6 rework/re-review complete**：G1/G2/G3/G4/G5 已轉成明確實作契約並同步 PRD/spec/test/packet；G6 已確認為 implementation precondition（先新增 recent-MFA signal + expiry + tests）。Local re-review pass → ready_for_implementation；runtime code 尚未實作。

## Plan Review Log

### Changes Made — Round 1 (self)
- **M1（準確度）** → §File Structure 新增「既有 code 錨點」表；技術選型/實作順序/tasks 改指 `impersonation_service.py`（new）、`session_service.py`/`audit_service.py`/`super_user_service.py`/`audit_log.py`/`user.py`（既有）；補租戶語意註（`organization_id` 為真實 FK、`tenant_id` nullable 別名）。
- **M2（縮小範圍）** → audit 改為**複用既有 `AuditLog` 欄位**（`user_id`/`target_user_id`/`organization_id`/`event_metadata`）；T2.7 Alembic 降為**條件性（預設 N/A）**。研究發現既有 schema 已支援雙 id 稽核，移除臆測性 migration。
- **M3（軟化未驗 claim）** → 移除「API Gateway 注入 `x-tenant-id` header」的硬斷言；改為「先讀 `gateway_compat/middleware/` 確認既有 auth context 傳遞機制再接」。grep 未證實具體 header 名。

### Changes Made — Round 2 (codex, kept 2 of 2 fatals)
- **C1（effective identity 契約）** → 技術選型 token 段 + tasks T2.3 補明確契約：token 同時保留 `actor_user_id` 與 `effective_user_id`；授權/current-user 用 effective target、audit 用 actor+target、**禁止繼承 actor `is_super_user` override**。堵住 super_user 權限漏進下游。
- **C2（stop 失效契約）** → tasks T2.1 + T3.2 + 技術選型補：`stop` 必 `terminate_session` + `blacklist_token(jti)` → 舊 act-as token 立即 401/403；`current` 反映 active/expired。靠既有 `SessionService` 能力。

### Changes Made — Round 3 (self, ultra-extensive verification)
> 14 個技術 claim cluster 對實際 repo 徹底驗證：12 真，挖出 1 死錨 + 1 stale ref。修法**縮小範圍**（移除不需要的中介層改動），不擴張。
- **M1（準確度＋簡化）** → File Structure / 技術選型 / 實作順序 step 2-3 的死錨 `gateway_compat/middleware/`（`git ls-files` 回空，退役空殼）改指真實：act_as claim 家 = `users/api/v1/auth/core.py`（`_build_claims`:32 + `create_access_token`）；唯一活 auth 層 = `orderly_fastapi_core/middleware/auth.py`（`dispatch()` 解 JWT → `request.state.user_id`/`tenant_id`/`permissions`）。**關鍵簡化**：effective context 全由 JWT claims 推導，act_as token 帶 target claims 即自動透傳 → T2.3 happy-path **不需改中介層**，authz 縮為三條斷言。
- **M2（一致性）** → handoff.md「API Gateway middleware + x-* header」stale ref 改述 monolith 實況；tasks T2.5 audit 改用驗證過的 keyword 簽名 `audit_service.log(user_id=, target_user_id=, organization_id=, metadata=)`（audit_service.py:42-106 直接映射 `AuditLog`，免新 schema 確認）。
- **M3（runtime-validation guard）** → US-AUTH-023/024 為 super_admin UI 旅程但 evidence 全是後端 `tests/integration`，前端 banner/退出旅程零 runtime 證據 → 新增 tasks T3.0 一條 Playwright E2E RED（排在 T3.1 前）：清單發起 → banner 顯示 → 一鍵退出 → 還原超管 + 舊 act-as token 後端 401/403。
- **驗證認可（不需改）**：M2 audit 複用 + super_admin/super_user 區分，經 ultra 驗證**有既有 code 撐**（audit_service 雙 id:101、role enum super_admin:11）。

### Changes Made — Round 4 (codex, kept 2 of 2 fatals — 修正 Round-3 過簡)
> Codex 壓測 Round-3 的「happy-path 不需改中介層」斷言，抓出 2 個真缺口：我只驗了 request.state 會帶 target claims，沒驗 (a) blacklist 是否被讀、(b) 下游是否真讀 request.state。兩條都修正過簡、未擴張範圍。
- **C3（stop 失效未被活的 auth 路徑強制）** → `is_token_blacklisted`(session_service.py:377) 只有 write 端呼叫，`AuthMiddleware.dispatch()`(auth.py:91-135) 與 `get_current_user_from_token` **都不查 blacklist** → `blacklist_token(jti)` 寫了也不生效，舊 act-as token 仍可用。修：技術選型 session-失效 + File Structure + 實作順序 step3 + tasks T2.1 補「auth validator 加 `is_token_blacklisted(jti)` 檢查，stop 後舊 token 對 protected 非 auth route 401/403」。
- **C4（X-Tenant-Id header 跨租戶缺口）** → orders.py:37 / products.py:252 / billing/fee_configs.py:27 / customer_prices.py:88 讀 **client `X-Tenant-Id`** 非 request.state → 光帶 target JWT 不保證下游用 target tenant，client 可竄改 header 跨租戶。修：File Structure 加 header 調和列 + 實作順序 step3 + tasks T2.3/T2.4 補「下游 tenant helper 以 `request.state.tenant_id`(effective) 為準，header mismatch 回 403，整合測試蓋 ≥1 條 orders/products/billing route」。
- **W（前端 context 替換）** → tasks T3.0/T3.1 補：前端發起時以 effective target 替換 active user context（`user.id`/`role`/`organizationId`），stop 後還原超管；E2E 斷言不只驗 token，也驗 context 替換生效。

### Changes Made — Round 5 (implementation-vs-plan gap review, 2026-06-09)
> 觸發：使用者要求審 implementation vs plan。**現況：impersonation code 零實作（git ls-files 僅 docs），review 對象 = plan 的 code 錨點 vs 實際 repo。** 14 個錨點全數對實 repo 重驗：**準確度高**（gateway_compat 死殼、X-Tenant-Id 10 檔=products6+orders1+billing3、audit_service.log keyword 簽名、AuditLog 雙 id 欄位、user model FK 語意、AuthMiddleware request.state 推導、super_admin role 皆**逐一證實**；僅 session_service 行號 372/359 vs plan 377 輕微漂移，function 存在）。但挖出 **codex 4 輪審查全漏的 3 個 MUST-FIX + 2 SHOULD-FIX**，全源於「活的 auth 路徑只查 `exp`+blacklist」這條主軸的衍生盲點。
- **G1（MUST-FIX，TTL 自然到期不被後端強制）** → 技術選型 session 失效段 + 風險評估 + 新 task **T2.8**。middleware 不查 Redis session 存在性 → 釘 act-as `exp == session TTL`。C3 的自然到期孿生。
- **G2（MUST-FIX，act-as 可 refresh 繞過短效）** → 技術選型 + 風險評估 + 新 task **T2.9**。start 不簽 refresh、refresh 端點拒 `act_as`。
- **G3（MUST-FIX/scope，「全程審計」無強制機制）** → 已定案為新增 act-as audit middleware（不收斂「不可關閉」範圍），技術選型 audit 段 + 風險評估 + **T2.5** 已改成 mutating request pre-write + fail-closed 契約。
- **G4（SHOULD-FIX，audit 欄位 nullable）** → 技術選型 audit 段 + **T2.5** 驗收。`user_id`/`target_user_id`/`organization_id` 皆 nullable=True，「非空」僅 app 層；加 app 斷言 + 測試。
- **G5（SHOULD-FIX，view-as write boundary）** → 已定案為純前端 nav-lens；不建立 `/auth/role-switch`、不換 token、不建 tenant session，**T2.6** 驗收改為無 token endpoint + direct backend request 不受 preview state 影響。
- **G6（VERIFY，MFA-passed 信號來源未錨）** → 風險評估 + **T2.2** note。
- **狀態變更**：design-completion marker `ready_for_implementation` → **`needs_rework`**；run.md FSM `state: ready_for_review` → **`changes_requested`**。交 CLAUDE 或 CODEX 修上述 6 項後重審。

### Changes Made — Round 6 (codex, G4/G6 verification and packet hardening, 2026-06-10)
> 只驗證與加硬 plan packet；未改 code、未改 canonical PRD/spec。
- **G4 precise anchors** → AuditLog 可複用但 nullable 邊界已釘行號：`audit_log.py:89/98/102/105` nullable，`:115` metadata non-null；`audit_service.py:42-59` optional kwargs，`:92-107` 無 guard 原樣寫入。T2.5 改為明確 app-layer assertion requirement，並列必補測試：success row 非空、缺 actor/target 拒寫且 DB 無 row、缺 tenant/event_type 拒寫且 DB 無 row。
- **G6 stop condition resolved** → 已確認 repo 無 MFA-passed/recent-MFA runtime signal：`core.py:32-55` claims 無 MFA；`core.py:58-76` token creators 只加 exp/type/jti；`mfa.py:425-453` MFA success 不把驗證狀態寫入 token；`session.py:8-17` 與 `session_service.py:104-118` 無 MFA flag/timestamp；grep `amr|acr|mfa_verified|mfa_passed|recent_mfa|last_mfa|auth_time|step_up` 無可用 signal。G6 從 VERIFY 收斂為 implementation precondition/blocker：先新增 deterministic recent-MFA signal + expiry + tests，否則不得宣稱 start guard 完成。

### Changes Made — Round 7 (codex, G1/G2 code-anchor hardening, 2026-06-10)
> 只驗證與加硬 plan packet；未改 code、未改 canonical PRD/spec。
- **G1 precise anchors** → `core.py:58-66` 已支援 `expires_delta` 且寫 `exp/type/jti`；`session_service.py:24` TTL 固定 7 天，`:61-147` `create_session()` 無 per-session TTL，`:122-137` session/JTI mapping TTL 寫死同一常數。T2.8 改成明確要求單一 `IMPERSONATION_SESSION_TTL_SECONDS` 同步 token `exp`、Redis session、`user_sessions` expire、`jti_session` TTL，並保留既有 `create_access_token()` signature。
- **G2 precise anchors** → `create_refresh_token()` (`core.py:70-76`) 簽 7 天；`/auth/refresh` (`auth/token.py:30-113`) 是 public endpoint，接受 bearer/body、只驗 type/sub/token_version、固定簽新 access+refresh，且不查 DB session row/blacklist/act_as。T2.9 改成明確拒絕 `payload.act_as`，act-as start 不簽 refresh、不建 refresh `UserSession` row，且選擇「拒絕」而非 strip/還原 actor。
- **Executable verification path fixed** → backend RED/green tests 指向目前 repo 實際 Python test home `backend/app/tests/test_impersonation.py`，並補 focused pytest commands；保留 T3.0 Playwright 作前端 journey 驗證。

### Changes Made — Round 8 (codex, G3/G5 canonical decision sync, 2026-06-10)
- **G3 resolved（audit enforcement）** → 選定新增 act-as audit middleware，不收斂「審計不可關閉」範圍；PRD §2.5、tech-arch §10.3、smoke-tests、tasks T2.5 同步為 mutating request fail-closed 契約。
- **G5 resolved（view-as write boundary）** → 選定純前端 nav-lens；不建立 `/auth/role-switch`、不換 token、不建 tenant session、不帶 `act_as`；PRD/spec/test/tasks 同步。
