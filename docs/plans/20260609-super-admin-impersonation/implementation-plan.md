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
| `backend/libs/orderly_fastapi_core/middleware/auth.py` | Reference（happy-path 不改）| **唯一活的 auth 中介層**（main.py:19/128 註冊）：`dispatch()` 解 JWT → `request.state.user`(payload) / `user_id`(=`sub`) / `tenant_id`(=`tenant_id` or `org_id`) / `permissions`。**effective context 全由 JWT claims 推導** → act_as token 帶 target claims 時 effective context **自動透傳，無需改中介層**。`backend/app/modules/gateway_compat/` 為退役空殼（git ls-files 無 source，**勿錨**）|
| `shared/types/src/` | Create/Modify | impersonation DTO + `act_as` claim 型別 |
| frontend（Next.js App Router）| Create/Modify | 使用者清單列入口 + 全域橫幅 + 帳號選單角色切換 |

> **租戶語意註**：codebase 真實租戶主鍵為 `organization_id`（NOT NULL FK），`tenant_id` 為 nullable 別名（符合 CLAUDE.md「現用 organizationId 別名」）。impersonation 的「effective tenant」實作對應 `organization_id`（+ 同步 `tenant_id`）。

## 技術選型確認
- 後端：FastAPI modular monolith `backend/app/modules/users`（auth）；Alembic 單一 root
- token：沿用既有 JWT 機制，在 `users/api/v1/auth/core.py`（`_build_claims` + `create_access_token`）簽發帶 `act_as` claim block 的短效 token。**effective identity 契約**：JWT 的 `sub`/`tenant_id`(or `org_id`)/`permissions`/`role` 一律帶 **effective target**（被模擬帳號），`actor_user_id`(super_admin) 只存在 `act_as` block。理由：唯一活的 `AuthMiddleware`（`orderly_fastapi_core/middleware/auth.py:128`）`dispatch()` 把 `request.state.user_id`/`tenant_id`/`permissions` **直接從 JWT claims 推導** → 只要 `sub`/`tenant_id`/`permissions` 帶 target，effective context 即**自動透傳給下游**，無需新增中介層。**業務授權與 current-user 一律用 effective target**，**audit 用 actor+target**，**禁止繼承 actor 的 `is_super_user` override**（不破 INV-auth-001 / INV-auth-003）
- session 失效：`stop` 必 `terminate_session` + `blacklist_token(jti)`（既有 `SessionService` 已有此能力）→ 舊 act-as token 立即 401/403；`current` 反映 active/expired
- audit：**複用既有 `AuditLog` 欄位**（`user_id`=actor、`target_user_id`=impersonated、`organization_id`=tenant、`event_metadata`=session context）→ **預設不需新 audit 欄位 / 不需 Alembic 遷移**
- 契約：`shared/types` 定義 impersonation DTO + `act_as` claim 型別
- 前端：Next.js App Router；帳號選單（角色切換）+ 使用者清單列入口 + 全域橫幅

## 實作順序（backend → contract → frontend → verification）
1. **Contract**：`shared/types` 定 impersonation DTO + `act_as` claim 型別
2. **Backend auth**：新 `impersonation_service.py` + `api/v1/auth/` router（start/stop/current + role-switch）；session 走既有 `SessionService`；於 `core.py`（`_build_claims`/`create_access_token`）簽發帶 `act_as` 的 token，effective claims（`sub`/`tenant_id`/`permissions`/`role`）= 目標帳號；guard（super_admin + MFA-passed + target active）
3. **Backend authz**：**happy-path 不需新中介層** —— 既有 `AuthMiddleware`（`orderly_fastapi_core/middleware/auth.py`）已把 `request.state.user_id`/`tenant_id`/`permissions` 從 JWT claims 推導，act_as token 帶 target claims 即自動生效。authz 工作縮為三條斷言：(a) effective context 只取 target 的 `role`/`permissions`/`organization_id`；(b) `act_as.actor_id` 僅供 audit，不參與授權；(c) 不從 actor `is_super_user` 套 override。確保 INV-auth-001 仍成立（查詢仍帶 effective tenant_id）
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
- **跨租戶資料外洩**：authz bug 致 effective tenant 未正確切換 → 用整合測試驗「模擬 A 讀不到 B」；repository 層強制 tenant_id（INV-auth-001）
- **權限提升**：act_as 誤繼承 super_user override → 測「act-as operator 不能改價目」回 403
- **審計缺漏**：impersonated 操作未記 actor → audit 強制中介層，start/stop 亦記
- **token 偽冒**：`act_as` claim 被竄改 → 沿用既有 JWT 簽章；start 端點 server-side 驗 super_admin + MFA

## SDTDD Authority Chain
US-AUTH-023/024 → PRD §2.5 → tech-arch §10.3 → ADR-0005 / INV-auth-003 → Test Plan（docs/4-Test/smoke-tests.md）→ `tests/integration`。Repo 無 SDTDD hook，但依 CLAUDE.md 測試/audit 規範執行。

## 開發前完成度檢查表
- [x] US/PRD/Spec/Test Plan/derived 已同步（us-edit）
- [x] ADR-0005 已建立（governance）
- [x] INV-auth-003 已落 business-invariants（governance）
- [x] 決策凍結落盤 run.md（governance）
- [x] Governance Gate: pass
- [x] 計畫技術 claim 對實際後端 code 驗證（plan-review Phase A-2）

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
- **驗證認可（不需改）**：C1/C2 契約 + M2 audit 複用 + super_admin/super_user 區分，經 ultra 驗證**全部有既有 code 撐**（session_service blacklist:359、audit_service 雙 id:101、role enum super_admin:11）。
