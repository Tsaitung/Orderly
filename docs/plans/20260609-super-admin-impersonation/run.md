---
run_id: "20260609-super-admin-impersonation"
state: changes_requested
intent: "execute-within-approval"
mode: "prepare-packet+freeze"
scope: ["01", "auth"]
risk_level: "high-risk"
current_stage: "Stage 2.5 (implementation-vs-plan gap review done; rework required before dev)"
pause_reason: "Round-5 gap review found 3 MUST-FIX (G1 TTL-by-exp, G2 no-refresh, G3 audit-enforcement) + 2 SHOULD-FIX (G4 audit-nullable, G5 view-as-write) + 1 VERIFY (G6 MFA-signal); plan edited, awaiting CLAUDE/CODEX rework + re-review"
missing_inputs: []
safe_progress:
  - "US-AUTH-023/024 + US-AUTH-009 mod applied (us-edit)"
  - "PRD §2.5 + tech-arch §10.3 + Test Plan applied (us-edit)"
  - "derived fixes applied (us-edit): platform-roles off-by-one, super-admin-guide stale, INDEX counts"
  - "ADR-0005 created + adr/README ledger row (governance)"
  - "INV-auth-003 added + INV-auth-001 exception note (governance)"
approval_status: draft_approved
---

# Governance Run State — Super Admin Impersonation / Act-as

> Design-completion marker: **needs_rework**（2026-06-09 Round-5 implementation-vs-plan gap review；先前為 `ready_for_implementation`）。
> FSM frontmatter state = `changes_requested`（packet 組裝完成、決策已 freeze、primary docs 已落盤，但 Round-5 gap review 發現 6 項須修，plan 已編輯回 gap，等 CLAUDE/CODEX 重工後重審）。

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
- Frontmatter ↔ Markdown consistency: pass（state=ready_for_review 兩處一致）

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
| G3 | MUST-FIX/scope | 「全程審計不可關閉」靠不存在的「audit 中介層」；跨模組端點不呼叫 audit_service | T2.5 改寫；二選一（加 middleware 或收斂範圍）+ 落 PRD/spec |
| G4 | SHOULD-FIX | AuditLog actor/target/org 欄位 nullable=True，「非空」僅 app 層 | T2.5 加 app 斷言 + 測試 |
| G5 | SHOULD-FIX | view-as「不授寫入」後端強制機制未定義 | T2.6 改寫；定機制 + 拒寫驗收 |
| G6 | VERIFY | start guard「MFA-passed」信號來源未錨 | T2.2 note；實作前先驗信號存在 |

- Approval 影響：**設計決策 D1/D2/D3 仍 FROZEN、未動**；本次只動 implementation plan/tasks 的技術 gap，不改已核准的需求決策。
- 重工指派：CLAUDE 或 CODEX 修 G1-G6（G1/G2/G3 必修）後 re-review → 通過才 `ready_for_implementation`。

## Notes

- Open ambiguities that do not block: 模擬 session TTL 具體分鐘數 → 留 dev/PRD 細化（但 G1 要求 token `exp` 必須綁定該 TTL，故定 TTL 時同步定 `exp`）
- Blockers: **Round-5 G1/G2/G3 為進實作前 MUST-FIX**（safety 紅線：TTL/refresh 失效契約 + 審計強制機制）
- Next gate: **CLAUDE/CODEX 修 G1-G6 → re-review**；通過後才從 tasks.md T0.1（RED 整合測試）開始；上線前驗 INV-auth-003 / INV-auth-001
- Governance Gate: **pass（設計治理）**；Implementation-readiness Gate: **changes_requested（Round-5 gap）**
