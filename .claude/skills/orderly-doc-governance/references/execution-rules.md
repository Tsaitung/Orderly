# Execution Rules

執行相關規則：working tree policy、retention guardrails、operating-state precedence、approval semantics、artifact metadata。

## Working Tree Policy

- Baseline denominator: current `HEAD`
- Authoring target: current branch working tree within approved scope
- In-scope dirty docs are part of the scan and must be marked `in-flight`
- Out-of-scope dirty files are read-only and must not be reverted

## Operating-State Read Order And Conflict Authority

當治理 repo 的 current state 不一致時，先用固定順序讀取狀態，再套用衝突裁決規則。

讀取順序：

```
1. run.md frontmatter（if state != closed）
2. run.md Markdown body
3. handoff.md
4. latest retained compact
5. README.md（fallback discovery only）
```

衝突裁決：

- `run.md` frontmatter 是 generated fast index，不是最終人工語意來源
- `run.md` frontmatter ≠ `run.md` Markdown body 時，以 Markdown body 為權威，更新 frontmatter 以匹配
- `README.md` 是 derived mirror，只能在 state reconciliation 後同步

補充規則：

- `README.md` 是 derived operating-state mirror
- latest compact 是暫時進度記憶，不是 canonical state
- overlap scope 若引用既有 run，先做 state reconciliation，再決定是否沿用或刪除舊 artifacts
- execution approval 進場時，也要先做 state reconciliation，再進 execution
- run 一旦 closeout 完成，active-operating-state 應被折疊刪除，只留下 governance ledger 與 promoted knowledge

## Approval Semantics

| Approval 類型 | 允許動作 | 禁止動作 |
|---------------|---------|---------|
| decision approval | 凍結產品/設計意圖 | 進 write set |
| draft approval | 起草下一份 packet | 執行 code/schema/test 變更 |
| execution approval | 在既定 write set 內直接執行 | 退回新 plan/review artifact（除非有新 blocker） |

## Retention Guardrails

- active run 最多保留一份最新 compact
- closed run 不保留 run-local operating-state
- closed run 不保留 compact
- closed run 不保留 run-local packets 或 raw audits
- `transient-work-artifact` 不得成為 canonical truth
- 每份 retained artifact 都必須能回答：
  - 它的 `artifact_role` 是什麼
  - 為何仍留在 `HEAD`
  - 何時可以被整合或刪除
- 若 repo 已有 `residue-policy`、`governance-ledger`、`runbook`，後續 run 只能產生 `delta baseline` 與 execution artifacts，不得再新建平行 governance 規則文檔

## Artifact Triage

- `plan` / `handoff` 是 canonical intake
- `compact` 是必讀 checkpoint intake，但不是 canonical truth
- 讀到多份 compact 時，必須把其中資訊分類為：
  - `in-progress`
  - `completed-integrate-then-delete`
  - `completed-stale-delete`
  - `todo-merge-forward`
- older compact 內仍未完成的項目必須整併到最新 compact / handoff
- 已完成且已整合、或已過時的 compact，不得繼續留在 `HEAD`

## Artifact Metadata Contract

所有新建或重寫的治理 artifact 都必須在開頭標出最少 metadata。

最低必要欄位：`artifact_role`, `run_id`, `status`, `lifecycle_action`, `owner`, `source_of_truth`

條件性欄位：`supersedes`, `absorbed_into`, `delete_when`, `retention_reason`, `next_exact_start`

| artifact_role | 允許的 lifecycle_action |
|---|---|
| canonical-truth | retain |
| operating-state | retain |
| transient-work-artifact | retain / merge-forward / absorb-delete / delete |
| durable-evidence | retain / absorb-delete |

## Execution Status Vocabulary

execution 相關狀態固定使用：

- `draft`
- `review-ready`
- `execution-approved`
- `executing`
- `executed`
- `merged`
- `closed`

規則：

- 不要混用模糊狀態如 `active draft but basically executing`
- 只要開始 patch，status 就不能停在 `review-ready`
- `execution-approved` 與 `executing` 都必須有 approval receipt 可追溯

## Governance Ledger

closed run 不再保留 local run workspace 作為長留記錄。

必須在 `docs/plans/governance-ledger.md` 留一筆 closeout entry，至少包含：

- `run_id`
- `closed_at`
- `scope`
- `outcome`
- `promoted_to`
- `deleted_artifact_families`
- `residual_promoted_knowledge`

## Skill-Level Governance

- active run-local state must live under `docs/plans/<run-id>/`
- closed-run summaries belong in `docs/plans/governance-ledger.md`
- stable skill governance rules belong in `.claude/skills/orderly-doc-governance/references/`
- repo-level skill plan/handoff files are migration-period compatibility artifacts only and must not be recreated after migration

## Authored vs Generated Artifact Contract

| Artifact | 分類 | 說明 |
|----------|------|------|
| decision-packet | **hand-authored** | 設計意圖衝突需人工判斷 |
| execution-packet | **hand-authored** | write set 需人工審查 |
| scope-packet | **hand-authored** | 衝突清單需人工分類 |
| run.md frontmatter | **generated** | 從 FSM 狀態自動更新 |
| execution-start-update | **generated** | approval receipt + state transition 自動記錄 |
| handoff delta | **generated** | 每個 checkpoint 自動追加 |
| README active path | **generated** | 從 run.md frontmatter 同步 |
| verification-summary | **semi-generated** | 指令結果自動收集，判斷人工 |
