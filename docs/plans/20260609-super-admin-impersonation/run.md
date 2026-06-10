---
run_id: "20260609-super-admin-impersonation"
state: ready_for_implementation
intent: "execute-within-approval"
mode: "prepare-packet+freeze"
scope: ["01", "auth"]
risk_level: "high-risk"
current_stage: "Stage 3 (Round-6 rework complete; ready for RED tests/runtime implementation)"
pause_reason: ""
missing_inputs: []
safe_progress:
  - "US-AUTH-023/024 + US-AUTH-009 mod applied (us-edit)"
  - "PRD §2.5 + tech-arch §10.3 + Test Plan applied (us-edit)"
  - "derived fixes applied (us-edit): platform-roles off-by-one, super-admin-guide stale, INDEX counts"
  - "ADR-0005 created + adr/README ledger row (governance)"
  - "INV-auth-003 added + INV-auth-001 exception note (governance)"
  - "G3 resolved: add act-as audit middleware for mutating requests; pre-write audit and fail closed"
  - "G5 resolved: view-as is frontend-only nav-lens; no backend role-switch endpoint or preview token"
approval_status: draft_approved
---

# Governance Run State — Super Admin Impersonation / Act-as

> Design-completion marker: **ready_for_implementation**（2026-06-10 Round-6 multi-agent rework + local re-review；Round-5 `needs_rework` 已收斂）。
> FSM frontmatter state = `ready_for_implementation`（packet 組裝完成、決策已 freeze、Round-5/6 gap 已轉成明確實作契約；runtime code 尚未實作，下一步從 RED tests 開始）。

## Run Metadata

- Run ID: 20260609-super-admin-impersonation
- Date: 2026-06-09
- Mode: prepare-packet + decision freeze（us-edit handoff）
- Scope: module 01 (auth)
- Risk Level: high-risk（cross-tenant + 觸及 INV-auth-001 + 新 ADR）
- Intent: execute-within-approval（決策已由使用者核准；治理落盤 provenance + ADR + invariant）

## Preflight Summary

- Conflict classes seen: design-intent（緊急 break-glass vs 日常 impersonation）、business-invariant tension（租戶隔離）、scope（權限模型）、derived-surface drift（off-by-one、stale playbook）
- Decision packets opened: 3 decisions（D1/D2/D3，inline freeze 見下方 Freeze Decisions）
- Rewrite-safe scopes: US/PRD/spec/test/derived（us-edit 已 apply）+ ADR/invariant（governance 已 apply）
- Blocked scopes: none
- Docs/runtime compatibility boundary: impersonation API endpoints 標 `planned`；OpenAPI 待 backend 實作後同步（不在本 doc run 內偽稱 implemented）

## Operating-State Reconciliation

- Existing run artifacts reused: 無既有重疊 governance run（docs/plans/ 僅 README + 本 packet）
- Current active path: docs/plans/20260609-super-admin-impersonation/
- Operating-state conflicts found: none
- Reconciliation required before edits: no
- Frontmatter ↔ Markdown consistency: pass（state=ready_for_implementation 兩處一致；Round-6 local re-review 後更新）

## Authority Chain

- Primary layers: US（01-auth）→ PRD-Auth §2.5 → tech-arch §10.3 → API contract（planned）→ ADR-0005
- Derived surfaces: US INDEX、platform-roles（by-role）、4-Test INDEX、adr/README ledger（皆已同步）

## Freeze Decisions

- Source precedence: US/PRD/Specs/ADR canonical；本 run 凍結使用者 2026-06-09 三項決策。
- Working-tree policy: main（未 push；本 run 僅 doc 寫入）
- Evidence rule: repo-state-first；diff-manifest 由實際 git diff 抽取
- Vocabulary source: act-as / impersonation / super_user / effective tenant（canonical 詞彙）
- Compatibility rule: impersonation endpoints planned，不偽稱 implemented
- Decision status: **FROZEN**

### D1 — 權限模型（FROZEN）
化身目標帳號角色（act-as）：模擬以**目標帳號實際 role+permissions** 在其租戶運作，非 God-mode 超集；**不**繼承 `super_user` override/bypass。與 US-AUTH-012 / PRD §2.2 緊急 break-glass 為兩套獨立機制。
- Provenance: 使用者 2026-06-09 選「化身目標帳號角色（建議）」
- Canonical home: ADR-0005 §Decision、PRD §2.5、tech-arch §10.3.1

### D2 — 租戶隔離調和（FROZEN）
立 ADR-0005 + 新增 INV-auth-003：effective `tenant_id` = 目標租戶；token/audit 雙記錄真實 actor（super_admin）+ impersonated_user_id。INV-auth-001 仍成立（查詢仍帶 tenant_id，只是 effective context 指向目標租戶）。
- Provenance: 使用者 2026-06-09 選「立 ADR + 改 invariant（建議）」
- Canonical home: ADR-0005、business-invariants INV-auth-003 + INV-auth-001 註記

### D3 — Drift cleanup（FROZEN）
核准修 platform-roles.md off-by-one + 標記 super-admin-guide.md 過期（兩者 us-edit 已 apply）。
- Provenance: 使用者 2026-06-09 多選「修 platform-roles off-by-one」+「標記 super-admin-guide 過期」
- Canonical home: derived surfaces（platform-roles、super-admin-guide banner）

## Review Gate

- Local plan-review required: 高風險，但需求決策已由使用者直接裁決並 freeze；doc 變更為 approved-content writes
- External Claude artifact required: no（doc-only governance freeze）
- User approval needed before primary edits: 已取得（D1/D2/D3）
- User decision needed before affected scopes: 已解決

## Approval Receipt

- Exact approval text: AskUserQuestion 回覆「化身目標帳號角色（建議）」「立 ADR + 改 invariant（建議）」「修 platform-roles.md off-by-one, 標記 super-admin-guide 過期」
- Approval class: design-decision freeze（非 code execution approval）
- Approved at: 2026-06-09
- Approved scope: impersonation 權限模型 + 租戶隔離調和 + drift cleanup
- Approved holds: code execution 未授權（屬下一階段 dev）
- Approval source: 使用者（yl@tsaitung.com）

## Frozen Boundary

- In scope: US-AUTH-023/024、US-AUTH-009 mod、PRD §2.5、tech-arch §10.3、Test Plan、ADR-0005、INV-auth-003、derived 同步
- Out of scope: code 實作、OpenAPI 實際同步、super_user（US-AUTH-012）變更、平台供裝流程（US-AUTH-016）、super-admin-guide 全面改寫
- Stop conditions unchanged: 跨租戶寫入需整合測試驗 INV-auth-003/INV-auth-001 才上線

## Traceability Result

| 鏈 | 結果 |
|----|------|
| US-AUTH-023 ↔ PRD §2.5 ↔ tech-arch §10.3 ↔ Test Plan ↔ ADR-0005 ↔ INV-auth-003 | OK |
| US-AUTH-024 ↔ PRD §2.5 ↔ tech-arch §10.3（role-switch）↔ Test Plan | OK |
| US-AUTH-009（mod）↔ PRD §9.1 | OK（entry-point）|
| 孤立項 | 零 |

## Plan Packet Disposition

- KEEP — 理由：active cross-session implementation handoff（Hard Rule #9(c)，≤7 天）
- KEEP-until: 2026-06-16
- Ledger closeout entry: 延後至 run 真正 closed（實作完成後）；目前 packet active，不寫 closeout、不 harvest、不 delete

## Round-5 Gap Review（2026-06-09，implementation-vs-plan）

- 觸發：使用者要求審 implementation vs plan，找 gap 編回 plan、更新狀態，交 CLAUDE 或 CODEX 重工。
- 現況確認：**impersonation code 零實作**（`git ls-files` 僅 docs）；review 對象 = plan 的 code 錨點 vs 實際 repo。
- 錨點驗證：14 個技術錨點逐一對實 repo 重驗 → **準確度高**（gateway_compat 死殼空、X-Tenant-Id 10 檔[products6/orders1/billing3]、audit_service.log keyword 簽名、AuditLog 雙 id 欄位、user model FK 語意、AuthMiddleware request.state 推導、super_admin role 皆證實）；唯 session_service 行號輕微漂移（is_token_blacklisted 實為 :372、plan 寫 :377），function 存在、不阻擋。
- 新發現（codex 4 輪全漏，源於「活的 auth 路徑只查 `exp`+blacklist」主軸盲點）：

| ID | 嚴重度 | Gap | 修在 |
|----|--------|-----|------|
| G1 | MUST-FIX | session TTL < token `exp` 時，自然到期（無 stop→無 blacklist）的 act-as token 仍能打 protected route；middleware 不查 Redis session 存在性 | T2.8 新增；技術選型 session 失效段；釘 `exp == TTL` |
| G2 | MUST-FIX | act-as 可 refresh → 短效 TTL 被繞過 | T2.9 新增；start 不簽 refresh、refresh 拒 `act_as` |
| G3 | MUST-FIX/scope | 「全程審計不可關閉」靠不存在的「audit 中介層」；跨模組端點不呼叫 audit_service | **RESOLVED**：T2.5 定案新增 act-as audit middleware；mutating request pre-write audit，失敗 fail-closed；已落 PRD/spec/test |
| G4 | SHOULD-FIX | AuditLog actor/target/org 欄位 nullable=True，「非空」僅 app 層 | T2.5 加 app 斷言 + 測試 |
| G5 | SHOULD-FIX | view-as「不授寫入」需明確 write boundary | **RESOLVED**：T2.6 定案純前端 nav-lens；無 `/auth/role-switch`、無 preview token；direct backend request 不受 preview state 影響 |
| G6 | VERIFY | start guard「MFA-passed」信號來源未錨 | T2.2 note；實作前先驗信號存在 |

- Approval 影響：**設計決策 D1/D2/D3 仍 FROZEN、未動**；本次只動 implementation plan/tasks 的技術 gap，不改已核准的需求決策。
- 重工結果：G1/G2/G3/G4/G5/G6 已完成 plan-level rework；G6 明確成為 runtime implementation precondition（先新增 recent-MFA signal），不再是未錨定 plan gap。

## Notes

- 2026-06-10 CODEX G1/G2 rework progress: started code-anchor verification for auth/token/session paths before doc patch. Initial packet already names G1/G2, but needs exact anchors for `create_access_token` / `create_refresh_token`, refresh route behavior, `SessionService` TTL/JTI storage, and `AuthMiddleware` blacklist/`exp` enforcement so implementation can start without rediscovering these paths. No code edits planned; write scope remains this plan packet.
- 2026-06-10 CODEX G1/G2 rework complete: exact anchors patched into `tasks.md`, `implementation-plan.md`, and `handoff.md`. G1 evidence: `core.py:58-66` supports `expires_delta` and writes `jti`; `session_service.py:24` has fixed 7-day `SESSION_TTL_SECONDS`; `session_service.py:61-147` `create_session()` lacks per-session TTL and `:122-137` writes session/JTI TTL from the fixed constant. Required implementation is now explicit: one `IMPERSONATION_SESSION_TTL_SECONDS` drives token `exp`, Redis session TTL, `user_sessions` expire, and `jti_session` TTL. G2 evidence: `core.py:70-76` signs refresh tokens; `/auth/refresh` (`auth/token.py:30-113`) is public, accepts bearer/body, validates only type/sub/token_version, and always issues new access+refresh without DB session/blacklist/act_as guard. Required implementation is now explicit: act-as start issues no usable refresh token and creates no refresh `UserSession`; refresh endpoint rejects `payload.act_as` before issuing tokens. Focused verification commands are recorded in `handoff.md`.
- 2026-06-10 CODEX G4/G6 verification progress: exact anchors verified before doc patch. G4 evidence: `backend/app/modules/users/models/audit_log.py:89` `event_type nullable=True`, `:98` `user_id nullable=True`, `:102` `organization_id nullable=True`, `:105` `target_user_id nullable=True`, while `:115` `event_metadata nullable=False`; `backend/app/modules/users/services/audit_service.py:42-59` accepts nullable kwargs and `:92-107` writes them through without non-null validation. G6 evidence: `backend/app/modules/users/api/v1/auth/core.py:32-55` `_build_claims` has no MFA/recent-MFA claim; `:58-76` token creators add only `exp`/`type`/`jti`; `backend/app/modules/users/api/v1/mfa.py:425-453` MFA success signs normal access/refresh tokens from those claims; `backend/app/modules/users/models/session.py:8-17` session rows have no MFA-passed timestamp/flag; `backend/app/modules/users/services/session_service.py:104-118` Redis session payload has no MFA flag. Grep for `amr|acr|mfa_verified|mfa_passed|recent_mfa|last_mfa|auth_time|step_up` found no runtime signal in backend auth/session models. Problem: no existing MFA-passed/recent-MFA signal exists; G6 must be recorded as an implementation precondition/blocker, not assumed runtime behavior.
- 2026-06-10 CODEX G3/G5 design-contract rework complete: G3 no longer remains a scope choice; canonical contract is an app-level act-as audit middleware for every impersonated mutating request (`POST`/`PUT`/`PATCH`/`DELETE`), with audit pre-write before handler and fail-closed behavior on missing context/write failure. G5 no longer uses a backend role-switch endpoint/token; canonical contract is pure frontend nav-lens local UI state, with direct backend requests still authorized as the real session. Updated PRD §2.5, tech-arch §10.3, smoke Test Plan, US-AUTH-023/024 acceptance, tasks T2.5/T2.6/T3.3/T4.1, implementation-plan, and handoff.
- Open ambiguities that do not block: 模擬 session TTL 具體分鐘數 → 留 dev/PRD 細化（但 G1 要求 token `exp` 必須綁定該 TTL，故定 TTL 時同步定 `exp`）
- 2026-06-10 local re-review result: **pass for implementation readiness**. G1/G2/G3 MUST-FIX red lines are now explicit contracts in PRD/spec/test/tasks; G4 app-layer assertion and G6 recent-MFA signal are explicit implementation tasks with tests. No runtime code has been implemented or verified yet.
- Runtime implementation blockers/tasks: G1/G2 require code + focused tests; G4 requires app-layer non-null assertions + DB no-nullable-row tests; G6 requires deterministic recent-MFA signal + expiry tests before impersonation start guard can be claimed complete.
- Next gate: start dev from `tasks.md` T0.1/T0.2 RED backend pytest → T1.1 contract → T2.* backend;上線前驗 INV-auth-003 / INV-auth-001
- Governance Gate: **pass（設計治理）**；Implementation-readiness Gate: **pass（plan ready；runtime unimplemented）**
