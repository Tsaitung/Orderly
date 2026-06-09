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

- Auth backend：`backend/app/modules/users`（FastAPI modular monolith）
- 共用契約：`shared/types`
- API Gateway middleware：JWT 驗證 + 上游 header（`x-user-id` / `x-tenant-id` / `x-role` / `x-permissions`）
- Audit：既有 `audit_logs`（CLAUDE.md §Audit Log 開發指南）

## 待實作 code 位置（本次規格新增，code 尚未存在）

- `backend/app/modules/users`：impersonation start/stop/current + role-switch endpoints、`act_as` claim 簽發、authz 化身、impersonation audit（待實作）
- `shared/types`：impersonation DTO + `act_as` claim 型別（待實作）
- API Gateway：`act_as` 透傳 + effective-context authorize（待實作）
- frontend：使用者清單列入口 + 全域橫幅 + 角色切換選單（待實作）
- Alembic：audit_logs 欄位遷移（若需）（待實作）

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
