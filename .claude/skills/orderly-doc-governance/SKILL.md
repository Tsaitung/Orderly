---
name: orderly-doc-governance
description: Govern 井然 Orderly documentation across User Stories, PRD, system/design specs, API contract, ADR, and derived traceability surfaces. Use this whenever the user asks to整理文檔、同步 US/PRD/Specs/API/ADR、修 drift、補 traceability、重建 INDEX/mapping、比對 code/tests 與文檔、或要釐清商業語意/公式/ownership/compatibility 意圖，即使對方沒有明說「governance」。
---

# Orderly Doc Governance

用於 井然 Orderly 專案的文檔治理與追溯對齊。Orderly-only skill，不做 cross-repo discovery。

如果同一個 session 也存在全域 `doc-governance` skill：
- 在 Orderly repo 內優先使用這個 `orderly-doc-governance`
- 全域 `doc-governance` 只應作為 router/fallback

核心原則：先判斷是 `documentation drift` 還是 `design-intent conflict`。若是設計意圖衝突，先開 `decision packet`，不要直接進 rewrite。

## When To Use

- 整理或重寫 Orderly 文檔
- 對齊 `US → PRD → System/Design Specs → API contract → ADR`
- 掃 drift、找 orphan references、補 MECE/cardinality
- 重新整理 ADR 類型、supersession、traceability
- 重建 `docs/INDEX.md`、各區 `INDEX.md`、derived mapping 表
- 掃描 code/tests 與文檔是否一致
- 釐清商業詞彙、公式語意、scope ownership、compatibility boundary

不要在一般問答、單純解釋文件內容、或只改一行文字時載入完整流程。

## First Action — Intent Classification & Lazy Load

1. 判斷 intent（見下方 Intent 表）
2. 依 intent 載入必要 references
3. 只在 scope 涉及 ADR 時才讀 `docs/adr/README.md`
4. 只在 scope 與既有治理 run 重疊時才讀 `references/skill-governance.md`
5. 若無法判斷 intent → 輸出 `P-SCOPE-UNCLEAR`，不讀全部 references

| Intent | 必讀 references | 視需要 |
|--------|----------------|--------|
| `inspect-only` | authority-chain, project-paths | stage-gates (if docs/plans/ files in scope) |
| `prepare-packet` | authority-chain, project-paths, evidence-and-vocabulary | adr-schema |
| `harvest` | authority-chain, project-paths, stage-gates, **plan-residency** | evidence-and-vocabulary |
| `execute-within-approval` | authority-chain, project-paths, stage-gates, execution-rules | evidence-and-vocabulary, adr-schema |
| `closeout-only` | project-paths, stage-gates | — |

References 路徑：`.claude/skills/orderly-doc-governance/references/`

## FSM State Model

9 個顯式狀態：

```
inspecting → needs_scope → inspecting
inspecting → needs_decision → inspecting
inspecting → ready_for_review
inspecting → closed (clean health-check: label/state AND content residency both pass)
inspecting → inspecting (health-check finds actionable drift/content-residency fail; recommend next mode)
ready_for_review → ready_for_execution_approval (draft approved)
ready_for_review → needs_decision (new conflict)
ready_for_execution_approval → executing (execution approved + S2.75 passed)
ready_for_execution_approval → execution_gate_blocked (gate failed)
execution_gate_blocked → needs_scope | needs_decision | ready_for_execution_approval
executing → closeout_ready | needs_decision | execution_gate_blocked
closeout_ready → closed
```

| State | 說明 |
|-------|------|
| `inspecting` | 初始掃描、scope resolution、health-check |
| `needs_scope` | scope 不清楚或需拆分 |
| `needs_decision` | 設計意圖衝突，等使用者裁決 |
| `ready_for_review` | packet 已完成，等 review |
| `ready_for_execution_approval` | draft approved，等 execution approval |
| `execution_gate_blocked` | execution start gate 未通過 |
| `executing` | 已通過 gate，正在 patch |
| `closeout_ready` | execution 完成，準備 closeout |
| `closed` | run 結束（terminal） |

## P-codes (Pause Reasons)

每個 P-code 都需要人工介入。

| Code | 類別 | 觸發條件 |
|------|------|---------|
| `P-SCOPE-UNCLEAR` | Preflight | scope 不清楚 |
| `P-SCOPE-SPLIT` | Preflight | 需跨 2+ 模組但未拆 scope |
| `P-REVIEW-MISSING` | Gate Violation | 高風險 run 缺少 review artifact |
| `P-DESIGN-FORMULA` | Design Conflict | 公式/邏輯衝突未凍結 |
| `P-DESIGN-UNIT` | Design Conflict | 單位/契約衝突未凍結 |
| `P-DESIGN-OWNERSHIP` | Design Conflict | scope/ownership 衝突未凍結 |
| `P-COMPAT-BOUNDARY` | Design Conflict | docs-vs-runtime 邊界未釐清 |
| `P-WRITE-UNAPPROVED` | Approval Missing | primary-doc write set 未批准 |
| `P-DESIGN-CONTRADICTION` | Design Conflict | primary docs 互相矛盾 |
| `P-APPROVAL-DRAFT-ONLY` | Approval Mismatch | 只有 draft 但需 execution |
| `P-LEGACY-VAGUE-DEFER` | Legacy Debt | 同一 item 第二次模糊 defer |
| `P-STATE-EXPECTED` | Evidence Violation | write set 建於預期而非實際狀態 |
| `P-OWNERLESS-DECISION` | Design Conflict | durable knowledge 沒有 canonical owner（per Hard Rule #8）|
| `P-PACKET-STALE` | Legacy Debt | Plan packet KEEP-until 日期逾期 ≥14 天（per Hard Rule #9）|
| `P-PACKET-DRIFT` | Evidence Violation | Plan packet `applied/complete/executed/verified` claim 跟 repo 實際 state 不一致（per Hard Rule #11）|

觸發 P-code 時：輸出 `PAUSE: [P-CODE]` → 產出結構化 recovery → 更新 frontmatter `pause_reason` → 持久化（session 結束時）→ 引導使用者。

### Intervention Budget

**必須人工停下**：P-SCOPE-*, P-DESIGN-*, P-WRITE-UNAPPROVED, P-APPROVAL-DRAFT-ONLY, P-LEGACY-VAGUE-DEFER, P-OWNERLESS-DECISION, P-PACKET-STALE, P-PACKET-DRIFT

**可自動繼續**：clean health-check → closed, packet → needs_decision, draft approved → ready_for_execution_approval, primary done → derived sync, closeout → closed

**絕不 auto-default**：canonical business truth, execution approval, primary-doc write set, compatibility boundary, legacy disposition

## Hard Rules

1. **Execution Bias** — 無未解 blocker + freeze + reviewed packet → 壓成 execution packet。已有 execution approval → 不退回 planning。
2. **Execution Start Gate** — 記錄 exact approval wording → state reconciliation（含 frontmatter ↔ body） → 切 status（double-write）。Gate 未過不得 patch。
3. **Legacy Debt** — 每個 item 必須 `execute-now` / `defer-once` / `permanent-compatibility` / `retire`。禁止第二次模糊 defer。
4. **Repo-State-First** — write set 必須基於 repo 當前實際狀態。patch 失敗 → 重讀 → 更新 packet → 再 patch。
5. **Delta-Only Commentary** — 同一 run 內已確認結論不重述。更新格式：status delta → files → next action。
6. **Content Residency Guard** — inspecting → closed 需要 label/state + content residency 雙通過。docs/plans/ 內 ≥30% non-execution-sequencing content 的檔案不得標為 healthy。Reclassify 為 actionable-drift (content-residency)，recommend harvest。
7. **Health-Check Audit Trail** — persisted health-check mode 啟動後，第一個寫入動作必須 Write `.claude/.gov-healthcheck-scope`（內容：scope 檔案路徑列表）。若使用者要求 read-only / 不改檔，或本次 mode 明確為 read-only health-check，禁止寫檔，並在 summary 記錄 `Persisted To: conversation only`。
8. **Ownerless Decision Re-home** — 任一決策（naming / architectural / tech-debt / operator-procedure / business / wire-contract / incident-postmortem）無 canonical owner → 必須升格 (re-home) 到對應 canonical（per `references/plan-residency.md` §Knowledge Classes 9-class）。**禁止位置**：plan packet `§Frozen Decisions` / handoff Current truth / run log / dev-reference / compact / closeout summary（任一單獨存放即違反）。違反 → `P-OWNERLESS-DECISION`。
9. **Plan Packet KEEP-Only-If-Active-Development** — Plan packet（`docs/plans/{date}-*/`）退役 **default = promote-then-delete**（`rm -rf`，git history 已保留檔案 history）。唯一 KEEP 例外為以下任一：(a) active code/test work，(b) active decision packet 未裁決，(c) ≤7 天內 cross-session handoff onboarding。**不算 KEEP**：等 deploy / 等 sign-off / 等 observe / 等 operator E2E / 等 replacement data 決定 / 等其他 packet 收斂 / 文件量大怕資訊流失。詳見 `references/plan-residency.md` §KEEP Conditions + §Source Disposition Decision Tree。違反 KEEP-until 14 天 expiry → `P-PACKET-STALE`。
10. **ADR-Worthiness Gate** — 升格成 ADR 必須有真正的 trade-off 結構（「我們選 X 而非 Y，因為 Z，替代方案有 A/B/C」）。**外部平台限制**（如 Cloud Run port 規則、GCP IAM constraint、瀏覽器同源策略）**不算** ADR-worthy；該進 spec / runbook / PRD constraint 區段。違反 → ADR review 階段 reject + reclassify。
11. **Plan Packet Truth Verification Gate** — Plan packet（`docs/plans/{date}-*/`）內所有「applied / complete / executed / verified」claim 都是 **AI 生成的二手描述**，不是 source of truth。harvest mode 在判斷 KEEP/DELETE、推進 promotion-target-map、或執行 source disposition 前，必須對每個 claim 實證（`grep` / `ls` / `git log` / `alembic heads` / `gcloud`），**不得僅依 `handoff.md` / `run.md` / `compact.md` 等 plan 文件文字採信**。詳細 6-step harvest algorithm（Step 0 Verify Plan Claims）見 `references/plan-residency.md` §Harvest Algorithm Step 0。違反 → `P-PACKET-DRIFT`。

## Ordered Run Flow

依序執行，詳見 `references/stage-gates.md`：

1. State Reconciliation Gate
2. Stage 0: Preflight & Decision Intake
3. Stage 1: Freeze & Scope（寫入 frontmatter）
4. Content Ownership Extraction Gate
5. Stage 2: Scoped Scan & Rewrite Packet
6. Stage 2.5: Execution Packet
7. Stage 2.75: Execution Start Gate
8. Stage 3: Execute & Verify
9. Stage 4: Promote, Collapse & Zero-Residue Closeout
10. State Reconciliation Gate

### Frontmatter Protocol

每個 run 的 `run.md` 開頭包含 YAML frontmatter。每次 state transition 同時更新 frontmatter + Markdown body（double-write）。

```yaml
---
run_id: ""
state: inspecting
intent: ""
mode: ""
scope: []
risk_level: ""
current_stage: "Stage 0"
pause_reason: null
missing_inputs: []
safe_progress: []
approval_status: none
---
```

## Scope Rules

只允許四種 scope：

- module（`05` 或 slug `billing`）
- ADR cluster（`billing` / `order` / `auth` / `product`）
- derived-only（`docs-index` / `prd-index` / `us-index`）
- path-list / artifact-family（僅限 inspect-only / harvest，例如 `docs/plans/*.md` content residency check）

Orderly 模組編號：`01` auth / `02` product / `03` order / `04` acceptance / `05` billing / `06` customer-hierarchy / `07` onboarding / `08` referral / `09` erp。

預設 module-at-a-time。跨模組 semantic conflict 先開 shared decision packet。path-list scope 不得用來繞過 module 或 ADR cluster 的 semantic freeze；若掃描中發現 primary-doc 語意衝突，必須轉成 module / ADR cluster scope 或 shared decision packet。

## Review And Write Gates

| 條件 | 風險等級 |
|------|---------|
| full-governance / 2+ modules / ADR 大重構 / authority chain 變更 | high-risk |
| 其餘 | low-risk |

primary-doc write set 必須 user approval。decision packet scope 必須先有 user decision。approved primary 後，同 stage derived sync 可自動執行。

## Mode Completion Protocol

每個 mode 完成時必須產出：

```
## Governance Run Summary
- **Mode**: [mode name]
- **State**: [FSM state after this mode]
- **Scope**: [what was examined]
- **Findings**: [count] actionable / [count] informational
- **Content Residency** (if docs/plans/ in scope):
  - [filename]: [pass | fail (ratio%)] — [ownership breakdown or "carve-out"]
- **Actionable Items**: [list with suggested mode]
- **Blockers**: [list or "none"]
- **Recommended Next Step**: [action + target mode]
- **Persisted To**: [file path or "conversation only"]
```

Session 即將結束且本次 mode 允許持久化 → 必須寫入檔案。read-only mode 則必須在 summary 明確標示 conversation only。不允許靜默結束。

### Health-Check Persistence Modes

Health-check / inspect-only 不產生 primary-doc write set，也不得修改 source files。診斷結果持久化分兩種：

- `persisted-health-check`: 允許寫 `.claude/.gov-healthcheck-scope` 與 `docs/plans/health-check-YYYY-MM-DD.md`
- `read-only-health-check`: 不寫任何檔案，Completion Summary 必須明確標示 `Persisted To: conversation only`

使用者明確要求「不改檔」「只分析」「read-only」時，一律使用 `read-only-health-check`。

### Pre-Output Self-Check (health-check mode)

輸出 Governance Run Summary 前，逐項確認：
- [ ] Content Residency table 已產出（if docs/plans/ in scope）
- [ ] 每個 docs/plans/ 檔案都有 Ownership Breakdown
- [ ] Guard Result 為 pass / fail / carve-out 之一
- [ ] Governance Run Summary 含全部 9 欄位
- [ ] persisted-health-check 已 Write 到 `docs/plans/health-check-YYYY-MM-DD.md`；read-only-health-check 已標示 `Persisted To: conversation only`

缺任何一項 → 補齊後再輸出。

### Pre-Output Self-Check (harvest mode)

輸出 promotion-target-map / source disposition decision / `rm -rf` 計畫前，逐項確認（per Hard Rule #11 + plan-residency.md §Harvest Algorithm Step 0）：

- [ ] §0 Verification Evidence section 已落筆 in extraction-report，每筆 packet `applied/complete/executed/verified` claim 對應實證命令（`grep` / `ls` / `git log` / `alembic heads` / `gcloud`）+ 輸出摘要
- [ ] Frozen Decisions 全部 cross-ref 到 canonical home（依 9-class routing：PRD / spec / US / ADR / runbook / deprecation-roadmap），不得留 ownerless
- [ ] Verification Truth claims（migration head / commit SHA / test count）跟當前 repo state 對齊；packet 落筆 > 7 天 → 標 stale 重跑或標註 `stale-but-recorded`
- [ ] KEEP/DELETE 決定的依據是 verified state，**不是** plan packet 二手描述
- [ ] 任何 drift 已 surface 為 `P-PACKET-DRIFT`，不 default 到 promote-then-delete
- [ ] **Write `.claude/.gov-harvest-evidence.json`** (machine-readable, hook-enforced)，schema 如下：

  ```json
  {
    "run_id": "20260606-...",
    "timestamp": "ISO8601",
    "verifications": [
      {
        "command": "the actual command (e.g. 'grep -c reconciliation_status docs/2-PRD/PRD-Billing-Master.md')",
        "command_type": "grep|ls|git|gcloud|alembic|other",
        "target": "applied-claim|frozen-decision|verification-truth|external-state|commit-claim|migration-claim",
        "output_excerpt": "first ~80 chars of actual output",
        "timestamp": "ISO8601"
      }
    ],
    "disposition": "rm|keep|promote|partial-promote"
  }
  ```

  Hook gate `.claude/hooks/harvest-evidence-gate.sh` 強制檢查：
  1. file 存在
  2. age ≤ 600 sec
  3. `verifications.length ≥ 3`
  4. `≥ 1 non-grep verification`（cross-tool — plan packets reference external state, grep on internal docs cannot prove）
  5. `≥ 2 unique target dimensions`

  任一不過 → hook block `Bash rm -rf docs/plans/*` 與 `Edit docs/plans/governance-ledger.md`。

缺任何一項 → 補齊後再輸出。違反 → `P-PACKET-DRIFT`。

> **反失敗模式 reminder**：「我看 handoff 寫 applied 應該就 applied 了吧」是已記錄的高發 failure mode。
> **Provenance**：此 preventive rule 自 sibling repo `helloglow-doc-governance` 移植 —— 該 repo 在 2026-05-04 同一 session 內觸發 **3 次**（plan packet 文字 claim 未經 `grep`/`git`/`ls` 驗證即採信），每次都靠使用者反問才修正；prose 規則無法擋 prompt-level 跳過，故後續加上 hook-level enforcement（evidence file + 5-check gate）。此處為 **預防規則**，**非** Orderly 既有事故紀錄。**不要重複**：先 verify 後決定，並把 verification 記錄寫進 `.claude/.gov-harvest-evidence.json`。

## Detailed Rules（按需查閱 references）

| 規則領域 | Reference |
|---------|-----------|
| Orderly 路徑、artifact roles、naming、knowledge ownership（broader 5 + fine-grained 9） | `references/project-paths.md` |
| Plan packet residency、KEEP conditions、9-class promotion routing、harvest 5-step algorithm、source disposition decision tree | `references/plan-residency.md` |
| Truth layers、derived surfaces、scope resolution、code/test evidence | `references/authority-chain.md` |
| Stage gate outputs、exit gates、template routing、State Reconciliation | `references/stage-gates.md` |
| Evidence format、conflict classification、vocabulary、legacy debt、decision questions | `references/evidence-and-vocabulary.md` |
| Working tree、operating-state precedence、approval semantics、retention、artifact metadata | `references/execution-rules.md` |
| ADR metadata axes、tombstone、ledger | `references/adr-schema.md` |
| 與 doc-updater / us-edit 的分工 | `references/integration-contract.md` |
| Skill 自身的 logging、state model、durable decisions | `references/skill-governance.md` |

## Logging

| 事件 | 寫入位置 |
|------|---------|
| blocker / waiver / 完成工作 / decision | `docs/plans/<run-id>/run.md` + `handoff.md` |
| persisted health-check 完成 | `docs/plans/health-check-<YYYY-MM-DD>.md` |
| decision-intake queue | `docs/plans/<run-id>/decisions-pending.md` |
| knowledge-harvest report | `docs/plans/<run-id>/extraction-report.md` |
| pause recovery state | `docs/plans/<run-id>/stop-recovery.md` |
| closed run closeout | `docs/plans/governance-ledger.md` |
| stable skill rules | `references/skill-governance.md` |
