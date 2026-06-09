# Handoff — Super Admin Impersonation / Act-as

> Owner: us-edit. Role: dev-reference / implementation handoff. **NOT FSM authority** — authoritative state lives in `run.md` (governance-owned). 若本檔與 `run.md` gate 衝突，以 `run.md` 經 state reconciliation 後為準。

## 涉及的 User Story

| US | 標題 | 優先級 | 狀態 |
|----|------|--------|------|
| US-AUTH-023 | 超管帳號模擬登入（Impersonation / Act-as）| P1 | Active（本次新增）|
| US-AUTH-024 | 超管角色切換預覽（Role Switch / View-as Role）| P2 | Active（本次新增）|
| US-AUTH-009 | 使用者清單管理 | P1 | 修改（+「切換到此帳號」入口）|

## 需求與規格文件路徑

- US: `docs/1-User-Story/by-module/01-auth-user-management.md`（US-AUTH-023/024、US-AUTH-009）
- PRD: `docs/2-PRD/PRD-Auth-Module.md` §2.5 Impersonation / Act-as
- System spec: `docs/0-Design/technical-architecture-auth.md` §10.3 Impersonation / Act-as Session System
- ADR: `docs/adr/ADR-0005-auth-super-admin-impersonation.md`（governance 建立中）
- Invariant: `docs/0-Design/business-invariants.md` INV-auth-003（governance 落盤中）+ INV-auth-001 例外註記
- API contract（runtime-derived）: `docs/0-Design/api-specification.yaml`（impersonation endpoints 狀態 planned，待實作後同步）

## 測試與追溯文件路徑

- Test Plan: `docs/4-Test/smoke-tests.md` §Auth Test Plan — Impersonation / Act-as
- Test INDEX: `docs/4-Test/INDEX.md`
- 追溯：US ↔ PRD §2.5 ↔ spec §10.3 ↔ ADR-0005 ↔ INV-auth-003 ↔ Test Plan（無 module-map / test-mapping-matrix；Orderly 以 INDEX 為導航，per project-paths.md）

## 已存在 code 位置

- Auth backend：`backend/app/modules/users`（FastAPI modular monolith）；JWT 簽發/claims = `users/api/v1/auth/core.py`（`_build_claims`:32 + `create_access_token`）
- 共用契約：`shared/types`
- Auth 中介層（monolith 實況）：**唯一活的** `AuthMiddleware` = `backend/libs/orderly_fastapi_core/middleware/auth.py`（main.py:128 註冊），`dispatch()` 解 JWT → `request.state.user_id`(=`sub`)/`tenant_id`(=`tenant_id` or `org_id`)/`permissions`。部分下游模組（products/orders/billing）另自讀 `X-Tenant-Id`/`X-User-ID`/`X-Org-Id` header（次要路徑）。**`backend/app/modules/gateway_compat/` 已退役、無 source（git ls-files 空），勿錨**
- Audit：既有 `audit_logs` model（`audit_log.py`）+ `audit_service.log(user_id=,target_user_id=,organization_id=,metadata=)`（CLAUDE.md §Audit Log 開發指南）

## 待實作 code 位置（本次規格新增，code 尚未存在）

- `backend/app/modules/users/api/v1/auth/`：impersonation start/stop/current + role-switch router；`core.py` 簽發帶 `act_as` 的 token（effective claims=target）；authz 化身；impersonation audit（待實作）
- `shared/types`：impersonation DTO + `act_as` claim 型別（待實作）
- Auth 中介層：既有 `AuthMiddleware` 解 act_as token 後 `request.state` 即反映 effective target（對 request.state 消費者自動透傳，不需重造 gateway middleware）。**但須補兩處**：(a) auth validator 加 `is_token_blacklisted(jti)` 檢查（現 dispatch 不查 blacklist → stop 不生效）；(b) orders/products/billing 讀 client `X-Tenant-Id` 的 tenant helper 以 effective `request.state.tenant_id` 為準、mismatch 回 403。effective-only context（不繼承 actor `is_super_user`）（待實作）
- frontend：使用者清單列入口 + 全域橫幅 + 角色切換選單 + Playwright E2E 旅程（T3.0）（待實作）
- Alembic：**預設 N/A** —— audit_logs 既有欄位（user_id/target_user_id/organization_id/event_metadata）已足；僅當 act_as 需 User/AuditLog 專屬持久欄位才遷移（待確認）

## 已知 runtime / doc drift

- `super-admin-guide.md` playbook 多段過期（Prisma / Email+password 建立超管），本次已加 STALE banner；全面改寫為另一 task（未排期）。
- impersonation API endpoints 在 spec 標 `planned`，OpenAPI 尚未含；待 backend 實作後同步（T4.2）。

## 下一步 exact start

1. Governance：建立 ADR-0005、落 INV-auth-003、凍結 3 項決策於 `run.md`、render Governance Gate。
2. Dev：從 `tasks.md` T0.1（RED 整合測試）開始 → T1.1 contract → T2.* backend。

## 設計決策（provenance 由 governance 凍結，本檔僅引用）

1. 權限模型 = 化身目標角色（act-as），非 God mode；與 super_user 緊急 break-glass 兩套獨立機制。
2. 租戶隔離 = 立 ADR-0005 + INV-auth-003：effective tenant = 目標租戶，token/audit 雙記錄真實 actor。
3. Drift cleanup = 修 platform-roles off-by-one + 標記 super-admin-guide 過期。
