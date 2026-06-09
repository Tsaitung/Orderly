---
run_id: "20260609-super-admin-impersonation"
state: ready_for_review
intent: "execute-within-approval"
mode: "prepare-packet+freeze"
scope: ["01", "auth"]
risk_level: "high-risk"
current_stage: "Stage 2 (packet assembled, decisions frozen, primary docs landed)"
pause_reason: null
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

> Design-completion marker: **ready_for_implementation**（us-edit marker；非 FSM state）。
> FSM frontmatter state = `ready_for_review`（packet 組裝完成、決策已 freeze、primary docs 已落盤，等實作/review）。

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

## Notes

- Open ambiguities that do not block: 模擬 session TTL 具體分鐘數 → 留 dev/PRD 細化（不阻擋設計完成）
- Blockers: none
- Next gate: dev 從 tasks.md T0.1（RED 整合測試）開始；上線前驗 INV-auth-003 / INV-auth-001
- Governance Gate: **pass**
