# Implementation Plan — Super Admin Impersonation / Act-as

> Owner: us-edit (transient-work-artifact). Does NOT carry canonical business truth — references canonical docs only.
> Canonical truth: US-AUTH-023/024, PRD-Auth §2.5, technical-architecture-auth §10.3, ADR-0005, INV-auth-003.

## 概述與目標

讓 `super_admin` 可從使用者清單為起點，切換進任一帳號/角色，進入其公司或供應商租戶操作，用於支援、問題重現與跨租戶流程驗證。核心安全姿態：**化身目標角色（act-as）**，不是全權 God mode；與既有 `super_user` 緊急 break-glass 為兩套獨立機制。

## In Scope
- impersonation session：start / stop / current 端點 + 帶 `act_as` claim 的短效 token
- effective tenant context = 目標租戶；token/audit 雙記錄 actor + impersonated（INV-auth-003）
- 授權以目標 role/permissions 為準，不繼承 super_user override/bypass
- role-switch（view-as）介面預覽
- 使用者清單每列「切換到此帳號」入口（super_admin only）
- 模擬期間全程橫幅 + 一鍵退出；session TTL 自動到期
- impersonation 審計（不可關閉）

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
 AuthMiddleware (orderly_fastapi_core, 既有)  frontend（清單入口 + 橫幅 + role switch）
```

## File Structure（既有 code 錨點 — 2026-06-09 驗證）

> 以下路徑經 plan-review Phase A-2 對實際 repo 驗證。impersonation **複用既有 auth 基礎設施**，避免重造。

| 檔案 | 動作 | 職責 / 既有狀態 |
|------|------|----------------|
| `backend/app/modules/users/services/super_user_service.py` | Reference（不改）| 既有緊急 `super_user`（24h、雙核准、audit）；impersonation 為**獨立 sibling service**，沿用其 audit 注入模式但不共用啟用邏輯 |
| `backend/app/modules/users/services/impersonation_service.py` | Create | impersonation start/stop/current + role-switch 業務邏輯 |
| `backend/app/modules/users/services/session_service.py` | Modify | 既有 Redis SessionService（create/terminate/blacklist）；新增 impersonation session（存 `act_as` context + TTL） |
| `backend/app/modules/users/services/audit_service.py` | Modify/Reference | 既有 audit 寫入；impersonation 事件走此 |
| `backend/app/modules/users/models/audit_log.py` | Reference（不改）| `AuditLog` **已有** `user_id`(actor)+`target_user_id`(被模擬)+`organization_id`(租戶)+`event_metadata`(JSON) → 雙 id 稽核**免新欄位** |
| `backend/app/modules/users/models/user.py` | Reference（不改）| 既有 `role` / `permissions`(JSON) / `tenant_id` / `organization_id` / `is_super_user`；act-as 讀目標的 `role`+`permissions` |
| `backend/app/modules/users/api/v1/auth/core.py` | Modify | **act_as claim 的家**：既有 `_build_claims(user, org)`（core.py:32）+ `create_access_token(claims)` 簽發 JWT。impersonation 在此簽發帶 `act_as` 的短效 token：effective claims（`sub`/`tenant_id`/`org_id`/`permissions`/`role`）= **目標帳號**，actor（super_admin）只進 `act_as` block 供 audit |
| `backend/app/modules/users/api/v1/auth/` | Create | impersonation router（start/stop/current/role-switch），與既有 `admin.py`/`token.py`/`core.py` 同 subpackage |
| `backend/libs/orderly_fastapi_core/middleware/auth.py` | Modify | **唯一活的 auth 中介層**（main.py:19/128 註冊）：`dispatch()`(auth.py:91-135) 解 JWT → `request.state.user`(payload)/`user_id`(=`sub`)/`tenant_id`(=`tenant_id` or `org_id`)/`permissions`。act_as token 帶 target claims 時 effective context **自動透傳給 request.state 消費者**。**但兩個缺口需補**：(1) `dispatch()` 目前只驗簽章+exp、**不查 blacklist**（`is_token_blacklisted` session_service.py:377 僅 write 端呼叫）→ stop 失效契約須在此加 jti blacklist 檢查；(2) 下游 orders/products/billing 讀 **client `X-Tenant-Id`** 非 request.state（見下方 header 調和列）。`backend/app/modules/gateway_compat/` 為退役空殼（git ls-files 無 source，**勿錨**）|
| `backend/app/modules/{orders,products,billing}/api/v1/*` 的 tenant helper | Modify（調和）| 既有 `get_tenant_id` 從 client `X-Tenant-Id`/`X-Org-Id` 讀（orders.py:37、products.py:252、billing/fee_configs.py:27、customer_prices.py:88）。impersonation 下須以 `request.state.tenant_id`(effective target) 為準；若 client header 與 effective 不符 → 403（防 client 竄改 X-Tenant-Id 跨租戶）|
| `shared/types/src/` | Create/Modify | impersonation DTO + `act_as` claim 型別 |
| frontend（Next.js App Router）| Create/Modify | 使用者清單列入口 + 全域橫幅 + 帳號選單角色切換 |

> **租戶語意註**：codebase 真實租戶主鍵為 `organization_id`（NOT NULL FK），`tenant_id` 為 nullable 別名（符合 CLAUDE.md「現用 organizationId 別名」）。impersonation 的「effective tenant」實作對應 `organization_id`（+ 同步 `tenant_id`）。

## 技術選型確認
- 後端：FastAPI modular monolith `backend/app/modules/users`（auth）；Alembic 單一 root
- token：沿用既有 JWT 機制，在 `users/api/v1/auth/core.py`（`_build_claims` + `create_access_token`）簽發帶 `act_as` claim block 的短效 token。**effective identity 契約**：JWT 的 `sub`/`tenant_id`(or `org_id`)/`permissions`/`role` 一律帶 **effective target**（被模擬帳號），`actor_user_id`(super_admin) 只存在 `act_as` block。理由：唯一活的 `AuthMiddleware`（`orderly_fastapi_core/middleware/auth.py:128`）`dispatch()` 把 `request.state.user_id`/`tenant_id`/`permissions` **直接從 JWT claims 推導** → 只要 `sub`/`tenant_id`/`permissions` 帶 target，effective context 即**自動透傳給 request.state 消費者**。**但兩個缺口須補（非全自動）**：(a) **stop 失效**——`dispatch()` 不查 blacklist，須在 auth validator 加 `is_token_blacklisted(jti)` 檢查；(b) **header 調和**——orders/products/billing 讀 client `X-Tenant-Id` 非 request.state，須改以 effective `request.state.tenant_id` 為準、mismatch 回 403。**業務授權與 current-user 一律用 effective target**，**audit 用 actor+target**，**禁止繼承 actor 的 `is_super_user` override**（不破 INV-auth-001 / INV-auth-003）
- session 失效：`stop` 必 `terminate_session` + `blacklist_token(jti)`（既有 `SessionService` 已有此能力）。**但既有 `AuthMiddleware` 與 `get_current_user_from_token` 目前都不查 blacklist**（`is_token_blacklisted` 只在 write 端被呼叫）→ 須在 auth validator 補 `is_token_blacklisted(jti)` 檢查，否則 blacklist 寫了也不生效、舊 act-as token 仍可用。補後：舊 act-as token 對 protected 非 auth route 立即 401/403；`current` 反映 active/expired
- **TTL 自然到期失效（Round-5 gap G1）**：活的 `AuthMiddleware.dispatch()`(auth.py:91-135) **只檢查 JWT `exp` +（C3 補後）blacklist，不查 impersonation Redis session 是否仍存在**。若 session TTL < access-token `exp`，session 在 Redis 自然到期（無明確 stop → 無 blacklist 寫入）後、token `exp` 未到前，舊 act-as token **仍能打 protected route**（orders/products/billing）。`current` 反映 expired 只影響前端橫幅，不擋後端。**契約**：act-as access-token 的 `exp` 必須 **== impersonation session TTL**（不得 > TTL），使自然到期＝`exp` 到期，由活的 middleware 唯一會查的 `exp` 強制。這是 C3（明確 stop 路徑）的**自然到期孿生**，兩條都要堵。
- **act-as 不得可 refresh（Round-5 gap G2）**：`create_refresh_token`(core.py:70) 存在、正常登入會簽 refresh token。若 impersonation start 沿用登入流程一併簽 refresh token，**短效 TTL 即被 refresh 繞過**（refresh → 換新 access token，繞掉 exp）。**契約**：impersonation start **不得簽發 refresh token**；refresh 端點偵測到帶 `act_as` 的 token 須拒絕（或 strip 掉 `act_as` 後僅還原為 actor 自己的非模擬 session，不得續發 act-as access token）。
- audit：**複用既有 `AuditLog` 欄位**（`user_id`=actor、`target_user_id`=impersonated、`organization_id`=tenant、`event_metadata`=session context）→ **預設不需新 audit 欄位 / 不需 Alembic 遷移**。**兩個 Round-5 修正**：(G3) **無 audit 中介層存在**——core middleware 只有 `auth`/`rate_limit`/`security_headers`，`audit_service.log` 是 call-site explicit 且住在 users module，orders/products/billing 端點**不呼叫 audit_service** → 跨模組的被模擬操作目前**零 audit hook**。「impersonation 審計不可關閉」須先**選定強制機制**（見 T2.5）：(a) 新增 act-as audit middleware，偵測 `act_as` 時對每個 mutating request 寫 actor+target+tenant；或 (b) 把 In-Scope 的「不可關閉」收斂為 start/stop + auth-module call-site，明確標記「跨模組逐操作審計」為 deferred。**不得保留「audit 強制中介層」這個指向不存在元件的 claim。** (G4) `AuditLog` 的 `user_id`/`target_user_id`/`organization_id`/`event_type` 皆 `nullable=True`（只有 `event_metadata` nullable=False）→ T2.5「非空」是 **application 層斷言，DB 不強制**；impersonation audit 寫入路徑須在 app 層斷言 actor+target 皆非空並加測試，或明記 DB 容許 null。
- 契約：`shared/types` 定義 impersonation DTO + `act_as` claim 型別
- 前端：Next.js App Router；帳號選單（角色切換）+ 使用者清單列入口 + 全域橫幅

## 實作順序（backend → contract → frontend → verification）
1. **Contract**：`shared/types` 定 impersonation DTO + `act_as` claim 型別
2. **Backend auth**：新 `impersonation_service.py` + `api/v1/auth/` router（start/stop/current + role-switch）；session 走既有 `SessionService`；於 `core.py`（`_build_claims`/`create_access_token`）簽發帶 `act_as` 的 token，effective claims（`sub`/`tenant_id`/`permissions`/`role`）= 目標帳號；guard（super_admin + MFA-passed + target active）
3. **Backend authz**：既有 `AuthMiddleware`（`orderly_fastapi_core/middleware/auth.py`）已把 `request.state.user_id`/`tenant_id`/`permissions` 從 JWT claims 推導，**對 request.state 消費者 effective context 自動生效**（移除「重造 gateway middleware」的假工作）。但須補三類真工作：(a) **blacklist 檢查**——在 auth validator 加 `is_token_blacklisted(jti)`，使 stop 後舊 act-as token 401/403（既有 dispatch 不查 blacklist）；(b) **header 調和**——orders/products/billing 的 tenant helper 改以 `request.state.tenant_id`(effective) 為準，client `X-Tenant-Id` mismatch 回 403（防跨租戶）；(c) **effective-only 斷言**——只取 target 的 `role`/`permissions`/`organization_id`，`act_as.actor_id` 僅供 audit，不從 actor `is_super_user` 套 override。確保 INV-auth-001/003 仍成立
4. **Backend audit**：impersonated 操作走既有 `audit_service.py` 寫 `AuditLog`，填 `user_id`(actor) + `target_user_id`(impersonated) + `organization_id`(tenant) + `event_metadata`；start/stop 本身入審計（複用既有欄位，預設無新 schema）
5. **Alembic（條件性）**：**預設不需要**——僅當 `act_as` session 需要 User/AuditLog 上的專屬持久欄位（如 `impersonated_by`）才 autogenerate 遷移 + server_default。先確認既有欄位不足再加。
6. **Frontend**：使用者清單「切換到此帳號」入口（super_admin only）；帳號選單角色切換；全域「正在以 X 身分操作」橫幅 + 一鍵退出
7. **Verification**：將 smoke Test Plan（docs/4-Test）轉 `tests/integration` 可執行；跨租戶隔離 + 權限約束 + 雙 context audit 各驗一條

## 里程碑
- M1 Contract + backend endpoints（start/stop/current）green
- M2 authz 化身 + 跨租戶隔離整合測試 green（驗 INV-auth-003 / INV-auth-001）
- M3 frontend 入口 + 橫幅 + role switch
- M4 audit 完整 + 全 Test Plan 轉整合測試通過

## 風險評估
- **跨租戶資料外洩**：authz bug 致 effective tenant 未正確切換 → 用整合測試驗「模擬 A 讀不到 B」；repository 層強制 tenant_id（INV-auth-001）。**具體向量**：orders/products/billing 讀 client `X-Tenant-Id` header，impersonation 下若不以 effective `request.state.tenant_id` 為準，client 竄改 header 即可跨租戶 → 須 reconcile + mismatch 回 403（見 T2.4）
- **權限提升**：act_as 誤繼承 super_user override → 測「act-as operator 不能改價目」回 403
- **審計缺漏**：impersonated 操作未記 actor。**Round-5 修正**：repo **無 audit 中介層**（core middleware 僅 auth/rate_limit/security_headers，audit_service.log 為 call-site explicit，跨模組端點不呼叫）→ 不能假設「audit 強制中介層」。須在 T2.5 二選一定案：新增 act-as audit middleware（每 mutating request 寫 actor+target）或收斂「不可關閉」範圍至 start/stop + auth-module。start/stop 本身必入審計。
- **token 偽冒**：`act_as` claim 被竄改 → 沿用既有 JWT 簽章；start 端點 server-side 驗 super_admin + MFA
- **短效 TTL 被繞過（Round-5）**：(G1) session TTL < token `exp` 時自然到期不擋後端 → 釘 `exp == TTL`；(G2) act-as 可 refresh → 短效形同虛設 → start 不簽 refresh token、refresh 端點拒 `act_as`。兩者見技術選型 session 失效段。
- **view-as 越權寫入（Round-5 gap G5）**：role-switch「不授寫入權」的後端強制機制未定義（前端 nav-lens？真換 token？）→ T2.6 須明定機制與後端拒寫驗收。
- **MFA-passed 信號來源未驗（Round-5 gap G6）**：T2.2 要求 caller MFA-passed，但未錨定該狀態從何而來（recent-MFA claim？session flag？）→ 實作前須先確認既有信號存在。

## SDTDD Authority Chain
US-AUTH-023/024 → PRD §2.5 → tech-arch §10.3 → ADR-0005 / INV-auth-003 → Test Plan（docs/4-Test/smoke-tests.md）→ `tests/integration`。Repo 無 SDTDD hook，但依 CLAUDE.md 測試/audit 規範執行。

## 開發前完成度檢查表
- [x] US/PRD/Spec/Test Plan/derived 已同步（us-edit）
- [x] ADR-0005 已建立（governance）
- [x] INV-auth-003 已落 business-invariants（governance）
- [x] 決策凍結落盤 run.md（governance）
- [x] Governance Gate: pass
- [x] 計畫技術 claim 對實際後端 code 驗證（plan-review Phase A-2）
- [ ] **implementation-vs-plan gap review（Round-5）：14 錨點準確，但發現 3 MUST-FIX（G1 TTL、G2 refresh、G3 audit 機制）+ 2 SHOULD-FIX（G4 nullable、G5 view-as）+ 1 VERIFY（G6 MFA）→ 需 CLAUDE/CODEX 重工後才可進實作**

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
- **G3（MUST-FIX/scope，「全程審計」無強制機制）** → 技術選型 audit 段 + 風險評估 + 改寫 **T2.5**。無 audit 中介層存在、跨模組端點不呼叫 audit_service → 二選一：加 act-as audit middleware 或收斂「不可關閉」範圍。移除指向不存在元件的「audit 強制中介層」claim。
- **G4（SHOULD-FIX，audit 欄位 nullable）** → 技術選型 audit 段 + **T2.5** 驗收。`user_id`/`target_user_id`/`organization_id` 皆 nullable=True，「非空」僅 app 層；加 app 斷言 + 測試。
- **G5（SHOULD-FIX，view-as 後端拒寫機制未定義）** → 風險評估 + 改寫 **T2.6**。
- **G6（VERIFY，MFA-passed 信號來源未錨）** → 風險評估 + **T2.2** note。
- **狀態變更**：design-completion marker `ready_for_implementation` → **`needs_rework`**；run.md FSM `state: ready_for_review` → **`changes_requested`**。交 CLAUDE 或 CODEX 修上述 6 項後重審。
