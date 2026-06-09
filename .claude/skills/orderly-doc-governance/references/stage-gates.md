# Governance Stage Gates

## Non-Execution Mode Gates

以下 gates 適用於不進入 Ordered Run Flow 的獨立模式。Health-check / decision-intake 不產 primary-doc write set、不修改 source files；knowledge-harvest 只有在使用者明確要求清理 / harvest 後，才可依本節 source disposition 規則搬遷或瘦身文件。所有模式仍必須通過 exit gate 才算完成。診斷結果只在 `persisted-*` mode 或使用者允許寫檔時落盤；read-only mode 必須保留在 conversation only。

### Health-Check Mode Gate

#### Required Outputs

- health dashboard（drift / conflict / orphan 分類計數）
- actionable items 清單（每項標明 suggested next mode）
- informational items 清單
- blocker 清單（或明確記錄 `none`）
- recommended next step（含 target mode 或 `terminate`）
- content residency check result（per docs/plans/ file），格式：

  | File | Status | Ownership Breakdown | Non-Plan Ratio | Guard Result | Notes |
  |------|--------|-------------------|----------------|-------------|-------|
  | [filename] | Active/Hold/Reference | exec-seq: N%, exec-state: N%, canonical: N%, technical: N%, operational: N% | X% | pass/fail/carve-out | [reason or candidate homes] |

  - pass: non-plan-content < 30%
  - fail: non-plan-content ≥ 30% → reclassify as actionable-drift (content-residency)
  - carve-out: Reference + historical-only authority header
- Completion Summary（格式見 SKILL.md `Mode Completion Protocol`）

#### Exit Gate

- 每個被檢查的文件都已被分類為 `healthy` / `actionable-drift` / `design-intent-conflict` / `hold-draft` / `orphan`
- actionable items 已附 suggested next mode
- Completion Summary 已輸出
- 若 session 即將結束且 mode 允許持久化，summary 已寫入 `docs/plans/health-check-<YYYY-MM-DD>.md`；read-only mode 則明確記錄 `Persisted To: conversation only`
- 不得靜默結束 — 必須輸出 next-action prompt 或明確宣告 terminate
- 每個 docs/plans/ scope 內的檔案都已通過 content residency check：
  - Active / Hold:In-Progress：non-plan-content < 30%，或已 reclassified 為 actionable-drift
  - Reference + historical-only authority header：carve-out 適用
- 若任何 docs/plans/ 檔案未通過 → 不得轉入 closed；必須輸出 section-level disposition table 並建議 harvest

#### Post-Check Transition Protocol

health-check 完成後，依 Guard Result 分流：

| Guard Result | 預設行為 | User 可覆寫為 |
|---|---|---|
| 全部 pass / carve-out | → closed（terminal） | — |
| 任一 fail | stay `inspecting` + Recommended Next Step: knowledge-harvest | immediate-harvest（user 說「清理」/「fix」/「harvest」） |

- **預設**：health-check 只做診斷，不做 source file 修改。fail 結果記在 Completion Summary 的 `Recommended Next Step`，由 user 決定是否啟動 harvest；fail run 不是 terminal closed state。
- **immediate-harvest**：若 user 在同一 session 明確授權（如「完成所有內容清理」），agent 可直接進入 knowledge-harvest mode，但必須先產出完整的 promotion-target-map 再動手。
- health-check mode 本身不得產 primary-doc write set 或 source file 移動/刪除/編輯。只有 persisted health-check 的診斷摘要可落盤。

### Decision-Intake Mode Gate

#### Required Outputs

- decision queue（每個 decision 含 conflict class、evidence、recommended default）
- exact human questions（每個 question 對應一個 decision）
- blocked scopes（因 pending decisions 無法繼續的 scopes）
- Completion Summary（格式見 SKILL.md `Mode Completion Protocol`）

#### Exit Gate

- 每個識別到的衝突都已轉成 decision queue entry
- 每個 entry 都有 recommended default
- decision queue 已寫入 `docs/plans/<run-id>/decisions-pending.md`
- Completion Summary 已輸出
- 不得靜默結束 — 必須向使用者列出待裁決項目

### Knowledge-Harvest Mode Gate

#### Required Outputs

- section-disposition table
- promotion-target-map
- source slimming boundary
- ownership conflict 清單（或明確記錄 `none`）
- Completion Summary（格式見 SKILL.md `Mode Completion Protocol`）

#### Exit Gate

- 每個 section 都已有 disposition（retain / promote / absorb+delete）
- 每個需要 promotion 的 section 都有明確 target
- 若發現 ownership conflict，已轉為 decision-intake 建議
- Completion Summary 已輸出
- 每個 promoted section 的 source file 都已完成 source disposition（**default = promote-then-delete**，per SKILL.md Hard Rule #9 + `references/plan-residency.md` §Source Disposition Decision Tree）：

  | 優先序 | 條件 | Source Disposition |
  |---|---|---|
  | 1 | KEEP Conditions 任一成立（plan-residency §KEEP Conditions：active code dev / active decision packet / ≤7 天 handoff） | KEEP（必須在 ledger 標 KEEP-until 日期，≤14 天 expiry）|
  | 2 | 全部 sections 都已 promote / absorb+delete + 無 historical-evidence 留存價值 | **`rm -rf`（default）** |
  | 3 | Reference + historical-only authority header（明示為歷史檔）| `git mv` 到 `docs/references/history/`（exception）|
  | 4 | Closed parent run + companion artifacts（如 extraction-report 是另一 closed run 的 byproduct，需保留 audit trail）| `git mv` 到 `docs/references/history/{parent-run-id}/`（exception）|
  | 5 | 部分 sections promote，部分 retain（且 retain 部分屬 KEEP Conditions）| slim source in-place：promoted sections 替換為 stub link `> Promoted to [target path]`，re-run content residency check |

  > **archive-to-history（規則 3、4）是 exception，不是 default**。Default 是 `rm -rf`。git history 已保留檔案 history，無需 archive 「以防丟失」。

- Promotion destination 路由（fine-grained 9-class，per plan-residency.md §Knowledge Classes）：

  | Knowledge Class | Destination |
  |---|---|
  | `naming-canonical` | `docs/references/canonical-vocabulary.md` / `doc-governance-vocabulary.yaml` |
  | `architectural-decision-frozen` | `docs/adr/ADR-NNN-*.md`（必須有真正 trade-off；外部平台限制不算 ADR-worthy）|
  | `tech-debt-with-exit-trigger` | `docs/governance/deprecation-roadmap.md` 或 `docs/3-Development-Plan/todo.md` |
  | `operator-procedure` | `docs/plans/runbooks/*.md` |
  | `incident-postmortem` | `docs/incidents/{YYYY-MM-DD}-{slug}.md` |
  | `business-requirement` | US/PRD/Specs（走 `us-edit` handoff，不直接寫）|
  | `wire-contract` | `backend/<svc>-fastapi/app/{api,schemas,models}/` + `shared/types/` + `docs/0-Design/api-specification.yaml` |
  | `closeout-summary` | `docs/plans/governance-ledger.md` |
  | `transient-execution-state` | DELETE（不 promote）|

- Broader category routing（legacy 5-class，保留為 high-level lens；harvest mode 強制使用上面 9-class）：

  | Source Status | 內容性質 | Destination |
  |---|---|---|
  | Active / Hold | canonical-business-truth | `docs/2-PRD/`, `docs/adr/`, `docs/references/` |
  | Active / Hold | technical-contract-truth | `docs/0-Design/` |
  | Active / Hold | reusable-operational-rule | `docs/plans/runbooks/` 或 skill `references/` |
  | Reference / historical-only | 任何 | `docs/references/history/` |

- 檔案搬遷 Cross-Reference Cascade Checklist：
  - [ ] `grep -r "filename"` 跨 `docs/` 找所有引用
  - [ ] 更新 `docs/plans/README.md`（index）
  - [ ] 更新 `docs/plans/governance-ledger.md`（若檔案出現在 closeout entry）
  - [ ] 更新 navigation index（`docs/INDEX.md` / 各區 `INDEX.md`）中的 reference（若有）
  - [ ] 更新新 reference 檔案自身的 `Source` metadata
  - [ ] 驗證無 broken link（`grep` 舊路徑應回傳 0 結果）

### Content Residency Guard

#### Allowed Residue by Artifact-Role

Active / Hold:In-Progress plans:
- execution-sequencing / execution-state / residual follow-ups: keep
- canonical-business-truth: must promote to docs/2-PRD/, docs/adr/, docs/references/
- technical-contract-truth: must promote to docs/0-Design/
- reusable-operational-rule: must promote to docs/plans/runbooks/ or skill references/

Reference plans (frozen historical):
- historical-evidence: keep (carve-out)
- All other types: frozen, do not extract but do not use as canonical source

#### Historical-Evidence Carve-Out
Reference status + explicit historical-only authority header → guard passes without section-level analysis.

#### Threshold
Reuses extraction-bundle.md rule: non-plan sections >= 30% → mandatory extraction
（inspect-only 中為 mandatory reclassification to actionable-drift with content-residency subtype）

#### Source Handling After Promotion

Content Residency Guard 只做分類（pass / fail / carve-out），不做搬遷。

搬遷由 Knowledge-Harvest Mode 的 Source Disposition 規則執行。兩者分工：

| 階段 | 負責 | 產出 |
|---|---|---|
| health-check | Content Residency Guard | 分類 + Guard Result |
| knowledge-harvest | Source Disposition 規則 | 搬遷 + cross-reference cascade |

---

## Execution Stage Gates

以下 gates 適用於進入 Ordered Run Flow 的執行模式（incremental / full-governance）。

## Governance Stage 0: Preflight & Decision Intake

### Required Outputs

- conflict classification per issue
- decision queue
- exact human questions
- recommended defaults
- blocked scopes
- rewrite-safe scopes
- docs/runtime compatibility boundary

### Exit Gate

- 每個衝突都已被標成明確 conflict class
- 需要人為裁決的項目已有 `decision packet`
- 沒有任何 scope 在語意未凍結前直接進 write set

## Governance Stage 1: Freeze & Scope

### Required Outputs

- mode
- scope list
- risk level
- operating-state reconciliation summary
- source precedence
- working-tree policy
- evidence rule
- vocabulary source
- review gate
- decision status

### Exit Gate

- scope 可明確分段
- risk level 已明確
- overlap intake 的 active path 已選定
- 需要的 primary docs 清單已鎖定
- 受 decision queue 影響的 scopes 已被標記為 `blocked` 或 `safe`

不得在 Stage 1 產 write set。

## Content Ownership Extraction Gate

### Required Outputs

- authority check
- `section-disposition-table`
- `promotion-target-map`
- source slimming boundary
- destination readiness
- knowledge domain / canonical home / dependent surfaces（若 scope 為 plan/design/handoff/reference 類）

### Exit Gate

- 每個 retained source file 都已有 per-section disposition
- 每個需要 promotion 的 section 都有明確 target destination
- `retain / freeze / absorb+delete` 尚未發生在 extraction 完成之前
- 不需要長留的 canonical truth / reusable operational rule 不再被允許停留在 source plan 中

## Extraction Merge Gate

### Required Outputs

- merged extraction inventory
- de-duplicated promotion targets
- shared-target collision report
- `promotion-merge-map`
- unresolved destination ambiguities

### Exit Gate

- 每個 extracted section 都有唯一 canonical destination
- shared-target collisions 已解決或升級為 blocker
- 不再存在「兩個 source docs 各自假設自己擁有同一個 target」的情況
- 若使用 `parallel-knowledge-harvest`，未通過此 gate 不得啟動 writer agents

## Write-Set Lock Gate

### Required Outputs

- final writer ownership map
- `write-set-lock`
- shared-files manifest
- orchestrator-only files list
- blocked / deferred write groups

### Exit Gate

- 沒有兩個 writers 共享同一個 target file
- shared files 已被明確保留給 orchestrator
- 每個 writer 都有明確 stop condition
- 若 write set 有任何重疊，不得進 writeback

## Governance Stage 2: Scoped Scan & Rewrite Packet

### Required Outputs

- per-scope conflict inventory
- per-scope conflict classes
- per-scope current repo-state evidence
- MECE/cardinality issues
- vocabulary violations
- promotion patches / source slimming patches / navigation sync patches（若有經過 extraction gate）
- decision dependencies
- docs/runtime boundary
- legacy debt disposition
- ADR impacts
- proposed diffs
- derived impacts
- merged rewrite packet
- resolved decision ledger

### Exit Gate

- rewrite packet 可直接做 review
- write set 已清楚分成 `primary docs` 與 `derived surfaces`
- unresolved blockers 已被標示
- 未解的人為決策沒有混進可執行 write set
- 沒有任何 legacy item 以模糊 `for now` 狀態滾入下一輪
- write set 建立於實際 repo-state evidence，而不是預期狀態

## Governance Stage 2.5: Execution Packet

### Required Outputs

- exact write set
- repo-state evidence snapshot
- legacy debt register with disposition
- family boundary
- explicit hold options
- verification commands
- rollback / downgrade steps
- approval receipt placeholders
- approval class:
  - `draft-only`
  - `execute-ready`

### Exit Gate

- packet 不是高層方向摘要，而是可直接執行的工作單元
- hold options 與 rollback steps 已寫清楚
- 已標明收到哪一種 approval 才能真的執行
- 沒有任何 legacy item 在第二次無條件 defer
- 所有 rename / alias / migration 都可追溯到當前 repo-state evidence

## Governance Stage 2.75: Execution Start Gate

### Required Outputs

- execution approval receipt recorded in repo artifacts
- operating-state reconciliation result
- active path before / after
- status transition:
  - `review-ready -> execution-approved`
  - 或 `execution-approved -> executing`
- stale active-reference sweep result
- README / index sync result when active navigation changed

### Exit Gate

- exact execution approval wording is recorded in the execution packet
- `run.md` / `handoff.md` / latest retained compact / `README.md` agree on the current gate
- active path has been updated before patching starts
- no stale active link still points to a superseded compact / packet
- if any of the above is false, execution may not start

## Governance Stage 3: Execute & Verify

### Required Outputs

- approved decision references for impacted scopes
- approved primary-doc edits
- derived-surface sync record
- verification summary
- updated handoff

### Exit Gate

- no orphan references inside scope
- no unapproved primary-doc edits
- derived surfaces 沒有新增新決策語意
- blockers/waivers/completions 已記錄
- verification artifact 引用了相關 decision IDs 或明確記錄 `none`

## Governance Stage 4: Collapse & Prune

### Required Outputs

- repo artifact role mapping for retained docs
- artifact triage ledger:
  - `in-progress`
  - `completed-integrate-then-delete`
  - `completed-stale-delete`
  - `todo-merge-forward`
- promotion target map
- governance ledger closeout entry
- latest compact checkpoint，或明確記錄 `none`
- deleted artifact list
- retained artifact list with reason

### Exit Gate

- 每個 retained artifact 都已標明 `artifact_role`
- 每個 retained artifact 都已被歸類到明確 action class
- `HEAD` 不再保留已吸收的 transient packets
- active run 只剩最小工作集，且最多保留一份最新 compact
- older compacts 的 open/todo 已 merge-forward 到最新 compact
- closed run 的 compact count = `0`
- closed run 的 completed review / rewrite / decision / execution packets 已被吸收或刪除
- closed run 的 `run.md` / `handoff.md` 已被折疊刪除
- closed run local workspace 不再殘留 raw audit / packet / compact
- closeout 結果已記入 governance ledger
- README 不再把 closed run 列為 active path
- skill-level static rules 已回寫到 skill `references/` 或 runbooks，而不是停留在 repo-level skill plan/handoff

## State Reconciliation Gate

### Required Outputs

- operating-state precedence result
- active path snapshot
- operating-state conflict list
- stale reference sweep result
- README / index sync result
- retained-artifact manifest vs filesystem result
- frontmatter ↔ Markdown body consistency result

### State Read Protocol

1. **先讀 frontmatter** — 從 `run.md` YAML frontmatter 讀取 `state`, `current_stage`, `pause_reason`, `approval_status`
2. **再讀 Markdown body** — 從 Markdown body 讀取對應狀態欄位
3. **比對一致性** — 若 frontmatter ≠ Markdown body → 觸發 reconciliation
4. **衝突解決** — frontmatter ≠ Markdown body 時，以 Markdown body 為權威，更新 frontmatter 以匹配

### Double-Write Protocol

所有 status 更新必須同時寫入：
- `run.md` YAML frontmatter（結構化）
- `run.md` Markdown body（人類可讀）

不允許只更新其中一個。

### Operating-State Precedence

```
1. run.md frontmatter（if state != closed）
2. run.md Markdown body
3. handoff.md
4. latest retained compact
5. README.md（fallback discovery only）
```

### Exit Gate

- `run.md` frontmatter 與 Markdown body 一致
- `run.md`、`handoff.md`、latest retained compact、`README.md` 對 current gate 沒有互相矛盾
- active navigation 不再指向 superseded compact / packet
- active run 的 retained artifact set 與實際檔案一致
- closed run 沒有殘留 run-local operating-state / compact / absorbed transient artifacts
- closed run 已被移出 active navigation，且 governance ledger 已可作為唯一 closeout 索引
- 若 gate 失敗，不得開新 packet 或宣稱 closeout 完成

## Review Gates

### Local Gate

所有 rewrite packet 都要先經過本地 `plan-review`。

### External Claude Gate

只在 `high-risk` run 為 hard gate。若缺少 artifact，停止在 Stage 2。

### User Gate

- 所有 primary-doc write set 都要使用者批准。
- 所有受 `decision packet` 影響的 scope 都要先有明確決策。
- 批准後，同 stage 的 derived sync 可自動執行。
- `Draft ...` 只代表 draft approval。
- `Execute ...` 才代表 execution approval。
- 已完成 review 的 execution packet 若拿到 execution approval，不要回退到新的 planning artifact。
- execution approval 拿到後，先過 `Governance Stage 2.75: Execution Start Gate`，再 patch。

## Template Routing

| Stage | Template | Notes |
|---|---|---|
| Stage 0 | `templates/decision-packet.md` | 設計意圖衝突 |
| Stage 1 | `templates/run-state.md` | 含 frontmatter + freeze |
| Content Ownership | `templates/extraction-bundle.md` | 整合 disposition/promotion/merge/lock |
| Stage 2 / 2.5 | `templates/governance-packet.md` | `packet_type`: scope / rewrite / execution |
| Stage 2.75 | `templates/run-state.md` | 更新 Approval Receipt + State Reconciliation 區段 |
| Stage 3 | `templates/verification-summary.md` | 驗證結果 |
| Stage 4 | `templates/closeout.md` | 整合 ledger entry + authority matrix |
