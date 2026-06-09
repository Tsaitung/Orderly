# Integration Contract

## With `doc-updater`

### `orderly-doc-governance` owns

- US/PRD/spec/frontend-api/ADR truth-layer alignment
- drift detection
- MECE/cardinality checks
- controlled vocabulary validation
- rewrite packet generation
- derived-sync trigger

### `doc-updater` owns

- code-driven derived refresh
- README and index maintenance
- link/reference hygiene

### Forbidden Overlap

- `doc-updater` must not redefine user stories, PRD, specs, or ADR semantics
- `orderly-doc-governance` must not pretend to be a code-introspection generator

### Handoff

如果治理 run 需要 derived refresh，治理 skill 應提供 `derived-sync manifest`：

- target derived files
- source scopes
- allowed operations
- blocked operations

## With repo test/commit rules（同 session 也改 code 時）

- Orderly 沒有 SDTDD hook 機制；本節不引用任何 progress-gate hook。
- 文檔治理執行後，相關 work log 要記錄到 plan/handoff（`docs/plans/<run-id>/run.md` + `handoff.md`）。
- 若同一 session 也改動 code，仍要遵守 repo 既有的 test/commit 規則（per repo CLAUDE.md：alembic 遷移鏈、整合測試、type-check / lint），並把該次工作記錄到對應的 run packet。

## With 既有 alignment / governance run

若 scope 涵蓋 `billing` / `order` / `acceptance` / `customer-hierarchy` 模組或對應 ADR cluster：

- 開新 packet 前，先掃 `docs/plans/` 是否有既有的 alignment / governance run（dated `{run-id}/` 子目錄、`governance-ledger.md`、`health-check-*.md`）
- 若有，先讀其 `run.md` / handoff / compact packets
- 優先重用既有 freeze 判決與 blocker queue

compact intake 規則：

- compact 仍是必讀 intake
- 但讀完後必須立即做 artifact triage：
  - `in-progress`
  - `completed-integrate-then-delete`
  - `completed-stale-delete`
  - `todo-merge-forward`
- 若有多份 compact，同一 run 只能保留最新 compact；未完成事項必須整併進去
- 若 run 已 closeout，compact count 必須為 `0`
- 若 `plan / handoff / latest compact / README` 對 current gate 有衝突，先做 state reconciliation，再開新治理 packet
- 若使用者已給 execution approval，先補 approval receipt 與 active path sync，再做 code/doc execution

不要再造第二套相互矛盾的 freeze 結果。

## With us-edit

### us-edit owns

- Intent classification（additive / modifying / reconciling）
- Conversation context inheritance
- US/PRD/Specs 同步文檔更新（Phase 4）
- Test Plan / test-mapping 同步要求的檢查與初始 patch（當需求變更影響測試規劃時）
- `diff-manifest.md` 產出：從實際 docs diff 抽取 changed files、US/FR/spec section、endpoint/table/route/schema identifiers
- `implementation-plan.md` / `tasks.md` / dev-reference `handoff.md` 的內容草稿與維護
- MECE 驗證（Phase 5）
- Design completion marker（`ready_for_implementation`）的提出；不是 governance FSM state
- UX 層：呈現衝突、收集使用者決策

### orderly-doc-governance owns

- 衝突分類體系（7 classes）
- Authority chain 定義（5 truth layers）
- Vocabulary enforcement
- Decision artifact 持久化（freeze artifact、decision packet）
- Governance FSM state 管理
- `run.md` frontmatter/body double-write、approval receipt、current gate、pause_reason
- `docs/plans/README.md` active path sync
- KEEP / closeout / harvest / plan-residency disposition
- 最終 `Governance Gate: pass|blocked|pending` 裁定
- 跨模組影響分析

### Handoff 規則

1. us-edit Phase 3 偵測到除 `rename-only`/編號衝突外的任何衝突時：
   - us-edit 呈現衝突並收集使用者決策（UX 層）
   - 決策 provenance 由 governance 落盤（寫入 `docs/plans/<run-id>/decisions-pending.md` 或 scope-packet 中 inline freeze）
   - 即使 authority chain 可直接解決，也必須留下 freeze note 記錄理由
   - us-edit 不得繞過治理落盤直接進入 Phase 4
2. us-edit Phase 4 完成後 → 產出或更新 `diff-manifest.md`，並把 changed identifier inventory 交給 governance gate。
3. us-edit Phase 5 若發現下列任一 blocker，必須輸出 `DESIGN-COMPLETE BLOCKED`，並交由 governance 更新 `run.md` / gate state：
   - 缺 Test Plan / test-mapping entry（在 Orderly 的 test/coverage 規則（per repo CLAUDE.md）下為 blocker）
   - US ↔ PRD ↔ Specs ↔ Test Plan ↔ derived surfaces 斷鏈
   - `run.md` frontmatter/body state 不一致
   - primary doc write set 未批准
   - plan packet 路徑、KEEP-until、scope、current gate 互相矛盾
4. governance 不重新探索 us-edit 已捕捉的結構；只做 gate validation、state reconciliation、必要的 cross-module / vocabulary / plan-residency 檢查。
5. **唯二**可完全留在 us-edit 的例外：`rename-only` 和編號衝突。

### Design Completion Packet Contract

Orderly 的 `/us-edit` design completion packet 使用 `docs/plans/YYYYMMDD-<slug>/`。

| Artifact | Owner | Role | Notes |
|---|---|---|---|
| `run.md` | orderly-doc-governance | active-operating-state | 唯一 governance FSM state；frontmatter/body double-write 必須一致；不得使用未定義 FSM state |
| `diff-manifest.md` | us-edit | durable evidence / transient-work-artifact | Phase 5 docs diff manifest；跨模組、high-risk、或 >3 docs files 時必須建立 |
| `implementation-plan.md` | us-edit | transient-work-artifact | 開發計畫；不得承載 canonical business truth，只可引用 canonical docs |
| `tasks.md` | us-edit | transient-work-artifact | 2-4 小時任務拆分；測試先行；不得引入未批准 mock/runtime placeholder |
| `handoff.md` | us-edit | dev-reference / implementation handoff | 開發參照文件；不得承載 authoritative FSM state；若 body 與 `run.md` gate 衝突，以 `run.md` 經 state reconciliation 後為準 |
| `docs/plans/README.md` | orderly-doc-governance | generated active-path mirror | 只能由 governance gate sync，不能作為 canonical state |

`ready_for_implementation` 是 us-edit 的 design completion marker，不是 Orderly governance FSM state。治理 `run.md` frontmatter 必須使用 `SKILL.md` 定義的合法 state（9 個之一）；若要記錄設計完成，寫在 body 的 gate summary / design completion marker 欄位。

Final recap 必須同時包含：

- `US-EDIT COMPLETE`（表示需求文件與 diff manifest 產出完成）
- `Governance Gate: pass|blocked|pending`
- 若 gate 不是 `pass`，必須使用 `DESIGN-COMPLETE BLOCKED`，並列出 next exact action

### Blocker Mapping

| us-edit blocker | Governance handling |
|---|---|
| 缺 Test Plan / test-mapping entry | `execution_gate_blocked`；body 記錄 missing test-plan surfaces |
| US/FR/spec traceability 斷鏈 | `execution_gate_blocked` 或 `P-DESIGN-CONTRADICTION`（若 primary docs 互相矛盾） |
| 非 rename/id 衝突未 freeze | `needs_decision` + decision packet / inline freeze |
| `run.md` frontmatter/body 不一致 | State Reconciliation Gate；以 body 為權威更新 frontmatter |
| packet claim 與 repo 實際 state 不一致 | `P-PACKET-DRIFT` |
| ownerless durable decision 只留在 plan/handoff | `P-OWNERLESS-DECISION` |
| KEEP 理由不符合 active code/decision/≤7-day handoff | `P-PACKET-STALE` 或 gate block，依時間與 state 判定 |

### Forbidden Overlap

- us-edit 不建或覆寫 governance FSM state（`run.md` frontmatter、current gate、approval receipt、pause_reason）
- us-edit 不把 `ready_for_implementation` 寫入 Orderly governance FSM frontmatter state
- `handoff.md` 可由 us-edit 產出，但只作 dev-reference；不得作 FSM authority
- governance 不重寫 us-edit 已完成的 US/PRD/Specs/Test Plan semantic edits，除非 gate 發現衝突或 drift
- governance 不產生 dev-reference 內容，但可要求 us-edit/handoff 修正 state conflict、missing paths、orphan refs
- Decision artifact 由 governance 建、由 us-edit 偵測需求
