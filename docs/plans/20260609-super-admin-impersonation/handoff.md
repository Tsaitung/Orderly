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

- Auth backend：`backend/app/modules/users`（FastAPI modular monolith）；JWT 簽發/claims = `users/api/v1/auth/core.py`（`_build_claims`:32 + `create_access_token`）。G1 anchors：`create_access_token(data, expires_delta)` at `core.py:58-66` already writes `exp/type/jti`; `create_refresh_token()` at `core.py:70-76` signs 7-day refresh tokens.
- 共用契約：`shared/types`
- Auth 中介層（monolith 實況）：**唯一活的** `AuthMiddleware` = `backend/libs/orderly_fastapi_core/middleware/auth.py`（main.py:128 註冊），`dispatch()` 解 JWT → `request.state.user_id`(=`sub`)/`tenant_id`(=`tenant_id` or `org_id`)/`permissions`。部分下游模組（products/orders/billing）另自讀 `X-Tenant-Id`/`X-User-ID`/`X-Org-Id` header（次要路徑）。**`backend/app/modules/gateway_compat/` 已退役、無 source（git ls-files 空），勿錨**
- Audit：既有 `audit_logs` model（`audit_log.py`）+ `audit_service.log(user_id=,target_user_id=,organization_id=,metadata=)`（CLAUDE.md §Audit Log 開發指南）。**G4 anchor**：`event_type`(`audit_log.py:89`)、`user_id`(`:98`)、`organization_id`(`:102`)、`target_user_id`(`:105`) 都 nullable；`audit_service.py:42-59` 接 optional args，`:92-107` 無非空 guard。impersonation audit 可複用既有欄位，但 actor/target/tenant/event_type/session metadata 非空必須由 app-layer assertion + tests 強制。

## 待實作 code 位置（本次規格新增，code 尚未存在）

- `backend/app/modules/users/api/v1/auth/`：impersonation start/stop/current router（**不建立** `/auth/role-switch`）；`core.py` 簽發帶 `act_as` 的 token（effective claims=target）；authz 化身；impersonation audit（待實作）
- `backend/app/middleware/impersonation_audit.py`（待建立）：app-level act-as audit middleware，接進 `backend/app/main.py` live monolith stack；act-as mutating request 在 handler 前 pre-write audit，失敗 fail-closed。
- `backend/app/modules/users/services/session_service.py`：G1 需新增 per-session TTL。現況 `SESSION_TTL_SECONDS` 固定 7 天（:24），`create_session()` 無 `ttl_seconds`（:61-147），`session:<id>` / `user_sessions:<user>` / `jti_session:<jti>` TTL 都寫死該常數（:122-137）。act-as 必須用同一 `IMPERSONATION_SESSION_TTL_SECONDS` 驅動 token `exp` + Redis session TTL + JTI mapping TTL。
- `backend/app/modules/users/api/v1/auth/token.py`：G2 需改 refresh guard。現況 `/auth/refresh`（:30-113）是 public endpoint，接受 bearer/body（:36-49），只驗 type/sub/token_version（:51-70），固定簽新 access+refresh（:78-95），不查 DB session row/blacklist/act_as。需在 decode 後、issue tokens 前拒 `payload.get("act_as")`；act-as start 不呼叫 `create_refresh_token()`、不建立 refresh `UserSession` row。
- `shared/types`：impersonation DTO + `act_as` claim 型別（待實作）
- Auth 中介層：既有 `AuthMiddleware` 解 act_as token 後 `request.state` 即反映 effective target（對 request.state 消費者自動透傳，不需重造 gateway middleware）。**但須補四處**：(a) auth validator 加 `is_token_blacklisted(jti)` 檢查（現 dispatch 不查 blacklist → stop 不生效，C3）；(b) orders/products/billing 讀 client `X-Tenant-Id` 的 tenant helper 以 effective `request.state.tenant_id` 為準、mismatch 回 403（C4）；(c) **act-as token `exp` == session TTL**（middleware 不查 Redis session，TTL 須由 `exp` 強制，Round-5 G1）；(d) **start 不簽 refresh token、refresh 端點拒 `act_as`**（防短效被繞，Round-5 G2）。effective-only context（不繼承 actor `is_super_user`）（待實作）
- MFA guard precondition（G6）：現有 code **沒有** MFA-passed/recent-MFA runtime signal。`_build_claims()` (`auth/core.py:32-55`) 無 MFA claim；token creators (`:58-76`) 只加 `exp/type/jti`；MFA verify success (`mfa.py:425-453`) 簽一般 access/refresh；DB session (`models/session.py:8-17`) 與 Redis session payload (`session_service.py:104-118`) 無 MFA flag/timestamp；grep `amr|acr|mfa_verified|mfa_passed|recent_mfa|last_mfa|auth_time|step_up` 無可用 signal。實作 impersonation start guard 前，先新增 deterministic recent-MFA signal + expiry + tests；`mfa_enabled`/`mfa_enforced_at` 不可當成「本次已過 MFA」。
- frontend：使用者清單列入口 + 全域橫幅 + 角色切換選單 + Playwright E2E 旅程（T3.0）（待實作）
- Alembic：**預設 N/A** —— audit_logs 既有欄位（user_id/target_user_id/organization_id/event_metadata）已足；僅當 act_as 需 User/AuditLog 專屬持久欄位才遷移（待確認）

## 已知 runtime / doc drift

- `super-admin-guide.md` playbook 多段過期（Prisma / Email+password 建立超管），本次已加 STALE banner；全面改寫為另一 task（未排期）。
- impersonation API endpoints 在 spec 標 `planned`，OpenAPI 尚未含；待 backend 實作後同步（T4.2）。

## 下一步 exact start

> **2026-06-10 Round-6 rework + local re-review：狀態 = `ready_for_implementation`。** Runtime code 尚未實作；先從 RED tests 與 recent-MFA signal 開始，不要直接寫 happy-path endpoint。
> - **G1（MUST）** act-as token `exp`、Redis session TTL、`jti_session` TTL 同源（T2.8）；middleware 不查 Redis session，TTL 須由 `exp` 強制。Exact start：先改 `SessionService.create_session(... ttl_seconds=...)` 保持相容，再讓 act-as start 用 `create_access_token(... expires_delta=timedelta(seconds=IMPERSONATION_SESSION_TTL_SECONDS))`。
> - **G2（MUST）** start 不簽 refresh、不建 refresh `UserSession` row、refresh endpoint 拒 `act_as`（T2.9）。Exact start：在 `auth/token.py:30-113` decode 後、issue tokens 前加 `payload.get("act_as")` guard，選擇拒絕，不做 strip/還原 actor。
> - **G3（MUST，RESOLVED）** 採新增 act-as audit middleware，不收斂「不可關閉」範圍；mutating request pre-write audit，失敗 fail-closed（T2.5）
> - **G4（SHOULD）** AuditLog actor/target/org/event_type 欄位 nullable 且 `audit_service.log` 無 guard → app 層斷言非空 + DB 無 nullable row 測試（T2.5）
> - **G5（SHOULD，RESOLVED）** 採純前端 nav-lens；不建立 `/auth/role-switch`、不換 token、不建 tenant session；direct backend request 不受 preview state 影響（T2.6）
> - **G6（BLOCKER/PRECONDITION）** 已確認沒有既有「MFA-passed/recent-MFA」信號；先新增 deterministic signal + expiry + tests，再 gate impersonation start（T2.2）

1. Governance：建立 ADR-0005、落 INV-auth-003、凍結 3 項決策於 `run.md`、render Governance Gate。（已完成）
2. **Rework（本次）**：G1-G6 plan-level gaps 已收斂並通過 local re-review。（已完成）
3. Dev：從 `tasks.md` T0.1（RED backend pytest）開始 → T1.1 contract → T2.* backend。

## Focused Verification Commands

- G1/G2 RED/green backend tests：`cd backend/app && PYTHONPATH=. pytest tests/test_impersonation.py::test_act_as_natural_expiry_is_enforced_by_token_exp tests/test_impersonation.py::test_act_as_start_does_not_issue_refresh_token tests/test_impersonation.py::test_refresh_endpoint_rejects_act_as_refresh_token -q`
- Stop/blacklist canary：`cd backend/app && PYTHONPATH=. pytest tests/test_impersonation.py::test_stop_blacklists_old_act_as_token_on_protected_route -q`
- Auth composition regression：`cd backend/app && PYTHONPATH=. pytest tests/test_auth_social_only.py tests/test_composition_smoke.py -q`

## Closing Handoff Prompt（給下一位 Codex/Claude）

你正在 `/Users/leeyude/Projects/Orderly` 收尾 `docs/plans/20260609-super-admin-impersonation/`。先讀 `CLAUDE.md`、本 `handoff.md`、`run.md`、`tasks.md`、`implementation-plan.md`，不要回退既有未追蹤 `.claude/*` 或其他人的文件改動。

目標：把目前 doc-only Round-6 rework 轉成 runtime implementation，最後讓 run state 從 `ready_for_implementation` 進到實作完成後的下一個明確 FSM 狀態。從 `tasks.md` T0.1 RED backend pytest 開始，不要先跑大套件。

必做順序：
1. T0.1/T0.2 建 `backend/app/tests/test_impersonation.py` RED tests，覆蓋 G1/G2/G3/G4/G5/G6。
2. T2.2 先新增 deterministic recent-MFA signal + expiry tests；不得用 `mfa_enabled`/`mfa_enforced_at` 當 MFA-passed。
3. T2.1/T2.8/T2.9 實作 act-as start/stop/current、blacklist validation、`exp == TTL`、no refresh。
4. T2.5 新增 act-as audit middleware，mutating request pre-write audit，缺 context/audit failure fail closed，並加 app-layer non-null assertions。
5. T2.6/T3.3 保持 view-as frontend-only nav-lens；不得建立 `/auth/role-switch` backend token endpoint。

驗證先跑 focused commands：本檔 Focused Verification Commands；前端 journey 最後跑 `tests/e2e` 的 T3.0。若無法完成，更新 `run.md` 的 blocker、`tasks.md` 的下一個 exact step，並在最終回覆列出未驗證項。

## 設計決策（provenance 由 governance 凍結，本檔僅引用）

1. 權限模型 = 化身目標角色（act-as），非 God mode；與 super_user 緊急 break-glass 兩套獨立機制。
2. 租戶隔離 = 立 ADR-0005 + INV-auth-003：effective tenant = 目標租戶，token/audit 雙記錄真實 actor。
3. Drift cleanup = 修 platform-roles off-by-one + 標記 super-admin-guide 過期。
