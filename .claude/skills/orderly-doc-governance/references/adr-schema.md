# ADR Schema

## Metadata Axes

每份 ADR 必須獨立表達：

- `Type`
  - `foundational`
  - `module`
  - `operational-remediation`
  - `risk-acceptance`
  - `reserved`
- `Lifecycle Status`
  - `proposed`
  - `accepted`
  - `superseded`
  - `withdrawn`
  - `reserved`

禁止把 phase progress 混進 `Lifecycle Status`。

## Tombstone Rule

`tombstone` 只是 superseded/withdrawn ADR 的呈現方式，不是 `Type`。

Superseded tombstone 至少保留：

- `Type`
- `Lifecycle Status`
- `Date`
- `Superseded By`
- `Primary PRD`
- `FR References`
- `US References`
- 簡短的 replacement reason

不得保留：

- rollout history
- phase progress
- implementation file inventory

## Ledger Rule

`docs/adr/README.md` 是 ADR ledger。它至少要能回答：

- 這份 ADR 的 type
- lifecycle status
- successor / predecessor
- primary PRD
- FR / US references
- `Review By` for risk-acceptance ADRs

## ADR Clusters

Orderly ADR cluster slug 採 freeform，常見 cluster：

- `billing`（對帳 / 結算 / 開票）
- `order`（訂單 lifecycle / state machine）
- `auth`（auth / user / tenant / organizationId）
- `product`（product / SKU / category / pricing）
- `acceptance`（驗收 / receiving）
- `customer-hierarchy`（customer hierarchy / org tree）

ADR 檔名固定為 `docs/adr/ADR-NNN-*.md`（NNN = 三位數流水號）。

## Module-Map ADR Cross-Reference

> Orderly 沒有 HelloGlow 的 `docs/module-map.md`。模組導覽以 `docs/INDEX.md` + 各區
> `docs/<area>/INDEX.md` 為準。當 skill 回寫這些 navigation surface 的模組區塊時，每個模組區塊應新增：

```md
### 相關 ADR
| ADR | Status | Title | Affected FR | Notes |
|-----|--------|-------|-------------|-------|
| ADR-004 | accepted | Authentication Strategy | 01-FR-001~003 | Auth authority |
```

這是 derived output，不是 scope resolution 的唯一來源。
