# Evidence And Vocabulary

## Evidence Rule

### Primary Evidence

以這個順序對齊：

1. module user story
2. module PRD
3. necessary module spec
4. necessary frontend API module spec
5. ADR

### Exceptions

- cross-cutting FR without a single US:
  - 可寫 `US References: N/A — cross-cutting capability`
- operational remediation / risk acceptance:
  - 可用 audit, runbook, CI, security artifacts 作 primary evidence

### Evidence Format

每個衝突都要附：

- source file
- source section or ID
- drift type
- conflict class
- current repo-state evidence
- proposed resolution

不要只寫模糊敘述。

## Repo-State-First Execution

任何 write proposal 都要附上實際 repo-state evidence，至少包含一種：

- exact file excerpt
- exact field / symbol / route list
- exact SQL / view formula
- exact test / consumer reference

禁止：

- 只根據舊 packet 預測當前欄位名稱
- 只根據「理論上應該存在」的 symbol 做 rename 計畫
- patch 失敗後繼續沿用舊假設

若 patch 失敗或 evidence mismatch：

- 重新讀檔
- 更新 packet 中的 write set 與 compatibility boundary
- 再做下一步

> Provenance: 「repo-state-first，不可只憑舊 packet 文字 claim」這條 preventive rule 由
> sibling repo `helloglow-doc-governance` 移植。在該 repo，這個 failure mode（不先 grep /
> git / ls 驗證就相信 plan-packet 文字 claim）曾在單一 session 內重複發生 3 次。移植到
> Orderly 作為 preventive rule，**不是** Orderly 的事故紀錄。

## Conflict Classification

每個衝突都必須先分類：

- `rename-only`
- `formula-or-logic`
- `unit-contract`
- `scope-or-ownership`
- `lifecycle-or-compatibility`
- `docs-vs-runtime`
- `content-residency`

判斷規則：

- `rename-only`: 只有名稱或詞彙改變，公式、單位、ownership、lifecycle 不變
- `formula-or-logic`: 計算順序、結算邏輯、split 位置、snapshot semantics 不同
- `unit-contract`: `%` 與 `ratio`、整數與小數、含稅/未稅等邊界不同
- `scope-or-ownership`: active scope 是否存在、屬於哪個模組、是否仍有 US/FR anchor 不清楚
- `lifecycle-or-compatibility`: active、deprecated、compatibility-only、historical 的界線不同
- `docs-vs-runtime`: truth-layer docs 已凍結，但 runtime / schema 仍採舊語意
- `content-residency`: 內容的 knowledge ownership type 與 folder prior 不符；canonical-business-truth / technical-contract-truth / reusable-operational-rule 停留在 docs/plans/ 中超過 30% 閾值

## Decision Intake Triggers

遇到以下情況，不要直接進 rewrite，先開 `decision packet`：

- 同一名詞背後其實對應不同公式
- 同一欄位在不同層有不同單位
- 同一功能在不同模組爭奪 ownership
- active scope 與 legacy/compatibility boundary 不清楚
- docs 與 runtime 各自自洽，但彼此不一致

若 authority chain 可以直接解決，也要明寫為什麼可以直接解決。

### Decision Intake Question Patterns

提問必須具體，避免模糊問句。優先使用這些問法：

1. 哪一個應作為 canonical truth：現有 docs / 現有 runtime / 新模型
2. 這個能力要被凍結成哪一種狀態：`active scope` / `compatibility-only` / `historical debt` / `remove`
3. 這個差異只是 rename，還是其實是：公式差異 / 單位差異 / ownership 差異 / lifecycle 差異
4. 若是對帳/結算語意：base 是含稅還是未稅 / split 發生在 platform take 內還是 supplier payout 外 / setup-time 與 settlement-time 哪一層才有權決定最終值
5. 舊欄位要如何處理：`dual-read / write-new` / compatibility alias / freeze but deprecated / drop

如果問題可以被 authority chain 直接解決，仍要在 freeze 中明確記錄「不需人為裁決的理由」。

## Legacy Debt Disposition

每個 legacy / compatibility item 都必須標記 disposition：

- `execute-now`
- `defer-once`
- `permanent-compatibility`
- `retire`

`defer-once` 必須附：

- next packet ID
- owner
- exit trigger
- slip risk

同一 item 不得連續兩次模糊 defer。

## Runtime Identifier And Refactor Tagging

不要把 exact runtime identifiers 預設打成 generic refactor backlog。

判斷規則：

- 真實 DB table / column 名、真實 migration / trigger / index 名：
  - 若只是引用 canonical runtime identifier，優先視為 compatibility residue
- 真實 route path：
  - 只在 runtime contract、repo-state evidence、或必要 integration 說明中保留 exact path
  - 若 legacy path 滲入 active business vocabulary，改標 `docs-vs-runtime` 或 `lifecycle-or-compatibility`
- append-only historical quoted payload：
  - 只有在 fenced / quoted 的 historical evidence 內可視為 `historical residue`
  - 若以 unfenced example / payload 出現，視為 violation，不可假裝是 residue

標記規則：

- 每個 item 仍必須先有 `execute-now` / `defer-once` / `permanent-compatibility` / `retire` 其中之一
- `refactor-candidate` 只能作為次標記，不能取代 disposition
- 只有在存在實際 runtime rename、contract cleanup、或 alias retirement 路徑時，才加 `refactor-candidate`
- 若是否保留仍有爭議，先開 `decision packet`，不要直接把 item 掃進 rewrite backlog

## Controlled Vocabulary

Vocabulary source: `docs/references/doc-governance-vocabulary.yaml`

### Required Fields

- `term`
- `scope`
- `status`
- `allowed_contexts`
- `replacement`
- `source_ref`
- `notes`

### Enforcement

- 只做 text/regex 掃描
- 在 approved scope 內回報 violations
- 只對已凍結的 terms 提 proposed diffs
- 避免在未凍結區域做大面積 rename
- 不得把 `formula-or-logic` / `unit-contract` / `scope-or-ownership` 假裝成 vocabulary-only 問題

### Canonical Domain Terms

Orderly 為餐飲供應鏈平台，controlled vocabulary 的 canonical 域詞（繁中 + en）：

- 訂單 order、下單 ordering
- 驗收 acceptance / receiving
- 對帳 reconciliation、對帳單 statement
- 結算 settlement
- 開票 invoicing、發票 invoice
- SKU、品類 category
- 供應商 supplier、餐廳 restaurant
- 租戶 tenant（alias: `organizationId`）
- 出貨 / 配送 delivery

### Current Hotspots

- 05 billing settlement / reconciliation semantics
- 01 auth tenant / organizationId boundary
- 03 order lifecycle state machine
- 05 billing invoicing 含稅/未稅 unit contract
- 09 erp export ownership
- ADR Type / Lifecycle Status

## Derived Surface Rule

Derived surfaces 只能鏡像已批准的 primary changes，不得自行修正 truth layers。
