# Architecture Decision Records (ADR)

本目錄是 Orderly 的 ADR 庫。ADR 記錄具有真正 trade-off 結構的架構抉擇
（「我們選 X 而非 Y，因為 Z，替代方案有 A/B/C」）。**外部平台限制**（如 Cloud Run
port 規則、GCP IAM constraint）**不算** ADR-worthy，應進 spec / runbook / PRD constraint 區段。

- 檔名格式：`ADR-NNN-*.md`（NNN = 三位數流水號）
- Schema 與 lifecycle 規則見 `.claude/skills/orderly-doc-governance/references/adr-schema.md`
- 新增 / 變更 ADR 由 `orderly-doc-governance` skill 治理；ADR 升格門檻見該 skill Hard Rule #10

## Ledger

| ADR | Type | Status | Title | Primary PRD | FR / US Refs | Successor / Predecessor | Review By |
|-----|------|--------|-------|-------------|--------------|-------------------------|-----------|
| [ADR-0001](ADR-0001-docs-structure-and-governance-alignment.md) | foundational | accepted | Docs structure + governance alignment with sibling repo | — | — | — | — |
| [ADR-0002](ADR-0002-hybrid-gcp-identity.md) | foundational | accepted | Hybrid GCP/Drive 身份（tsaitung 身份 + orderly-472413 資源） | — | — | — | — |

## Clusters

常見 ADR cluster slug（freeform）：`billing`、`order`、`auth`、`product`、`acceptance`、`customer-hierarchy`。
