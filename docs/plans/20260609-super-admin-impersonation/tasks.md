# Tasks — Super Admin Impersonation / Act-as

> Owner: us-edit (transient-work-artifact). 2-4h tasks, tests-first.
> 禁止引入未批准 mock / stub / fake / no-op / placeholder runtime 行為（CLAUDE.md #14）。
> Canonical: US-AUTH-023/024, PRD §2.5, tech-arch §10.3, ADR-0005, INV-auth-003.

## Group 0 — RED tests first (pre-implementation)

- **T0.1** 寫 impersonation 整合測試骨架（RED）
  - 依賴：—
  - 產出：`tests/integration/test_impersonation.py`（先紅）
  - 驗收：涵蓋 act-as 權限約束、跨租戶隔離、雙 context audit、start/stop/current、role-switch、TTL 到期；初次執行全紅
- **T0.2** 寫 INV-auth-003 / INV-auth-001 不變式斷言測試（RED）
  - 依賴：T0.1
  - 產出：跨租戶讀取隔離 + effective tenant 切換的 assertion
  - 驗收：模擬 A 租戶帳號讀不到 B 租戶（紅）

## Group 1 — Contract

- **T1.1** `shared/types` 定 impersonation DTO + `act_as` claim 型別
  - 依賴：—
  - 產出：impersonation DTO（start req/resp、current resp）+ `act_as` claim interface
  - 驗收：type-check 通過；前後端共用同一契約

## Group 2 — Backend

- **T2.1** impersonation endpoints（start/stop/current）
  - 依賴：T1.1
  - 產出：新 `backend/app/modules/users/services/impersonation_service.py` + `api/v1/` router；session 走既有 `session_service.py`；start 簽發帶 `act_as` 的短效 token（sibling 既有 `super_user_service.py`，不共用啟用邏輯）
  - **stop 失效契約**：`stop` 必須 `terminate_session` 該 impersonation Redis session **並** `blacklist_token(jti)`，使同一 act-as token 之後呼叫 API 回 401/403；`current` 依 session active/expired 回應（過期回 null）
  - 驗收：T0.1 中 start/stop/current 案例轉綠；stop 後用舊 act-as token 呼叫 API 回 401/403（一條測試）
- **T2.2** start guard
  - 依賴：T2.1
  - 產出：caller 必為 super_admin + MFA-passed；target 必 active；讀 target `user.py` 的 `role`+`permissions`+`organization_id`
  - 驗收：非 super_admin 呼叫回 403；MFA 未過回 403
- **T2.3** authz 化身（effective identity 契約）
  - 依賴：T2.1、T1.1
  - **effective identity 契約**：act-as token / auth context 必須同時保留 `actor_user_id`（super_admin）與 `effective_user_id`(= `impersonated_user_id`)。**業務授權與 current-user 行為一律用 effective target**（`role`/`permissions`/`organization_id` 皆取目標）；**audit 用 actor + target**；**禁止**從 actor 的 `is_super_user` 套用任何 override（即使 actor 本身是 super_user 也不繼承其權限到 effective context）。
  - 產出：先讀 `gateway_compat/middleware/` 確認 auth context 傳遞機制，再讓下游 authorize 用 effective context；確保 `sub` 不被誤用成 actor id
  - 驗收：act-as operator 不能做 operator 不可做的操作（403）；actor 為 super_admin 時 effective context 仍只有目標角色權限（不出現 super_user override）；INV-auth-001 仍成立（查詢帶 organization_id）
- **T2.4** 跨租戶隔離（INV-auth-003）
  - 依賴：T2.3
  - 產出：effective tenant = 目標租戶；不可讀其他租戶
  - 驗收：T0.2 轉綠
- **T2.5** impersonation audit（不可關閉，複用既有 `AuditLog`）
  - 依賴：T2.3
  - 產出：經既有 `audit_service.py` 寫 `AuditLog`，填 `user_id`(actor) + `target_user_id`(impersonated) + `organization_id`(tenant) + `event_metadata`(act_as session)；start/stop 入審計
  - 驗收：審計案例轉綠；上述欄位非空（依 CLAUDE.md audit 規範）；複用既有欄位、不新增 schema
- **T2.6** role-switch（view-as）endpoint
  - 依賴：T1.1
  - 產出：`POST /auth/role-switch`；介面預覽角色，不授特定租戶寫入權
  - 驗收：role-switch 不產生跨租戶寫入能力
- **T2.7** Alembic 遷移（條件性 — 預設 N/A）
  - 依賴：T2.5
  - 產出：**僅當** T2.5 確認既有 `AuditLog`/`User` 欄位不足（如需 `act_as` 專屬持久欄位）才 autogenerate 遷移 + server_default
  - 驗收：若觸發 → `alembic upgrade head` 通過、`alembic history` 鏈不斷；若不需要 → 明確記錄「既有欄位足夠，無遷移」

## Group 3 — Frontend

- **T3.1** 使用者清單「切換到此帳號」入口（super_admin only）
  - 依賴：T2.1
  - 產出：US-AUTH-009 清單列動作；非 super_admin 不顯示
  - 驗收：點擊發起模擬，進入目標租戶
- **T3.2** 全域 impersonation 橫幅 + 一鍵退出
  - 依賴：T2.1
  - 產出：「正在以 {帳號} 身分操作」橫幅 + stop（呼叫 T2.1 stop 失效契約：terminate session + blacklist jti）
  - 驗收：模擬期間恆顯示；退出還原超管；退出後前端持有的舊 act-as token 不再可用（後端回 401/403）
- **T3.3** 帳號選單角色切換（view-as）
  - 依賴：T2.6
  - 產出：角色清單切換 + 還原超管視角
  - 驗收：切換改變導航/可見功能分區

## Group 4 — Verification

- **T4.1** 全 Test Plan 轉整合測試並通過
  - 依賴：T2.*、T3.*
  - 產出：docs/4-Test/smoke-tests.md impersonation section → `tests/integration` 全綠
  - 驗收：act-as 約束 / 跨租戶隔離 / 雙 context audit / TTL / 入口 各至少一條通過
- **T4.2** OpenAPI 同步
  - 依賴：T2.*
  - 產出：impersonation endpoints 由實作同步至 `docs/0-Design/api-specification.yaml`（planned → implemented）
  - 驗收：spec 與實作一致
