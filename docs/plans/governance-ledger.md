# Governance Ledger

`orderly-doc-governance` 治理 run 的收斂索引（closeout-summary 的 canonical home）。
每個 closed run 在此留一行：run-id、日期、scope、結果、產物/commit。run-local 工作檔（`docs/plans/{run-id}/`）closeout 後刪除，知識升格到對應 canonical home，唯一索引留在本檔。

| Run ID | 日期 | Scope | 結果摘要 | Promotion / 產物 |
|--------|------|-------|----------|------------------|
| 20260606-canonical-home-bootstrap | 2026-06-06 | full（canonical-home gap inspect + 建立） | 盤點 9-class home，補建 7 個缺口（business-invariants、ledger、runbooks/、incidents/、deprecation-roadmap、canonical-vocabulary、doc-governance-vocabulary） | 見 `docs/system-spec/business-invariants.md`、本 ledger、`docs/governance/`、`docs/references/`、`docs/incidents/`、`docs/plans/runbooks/`；health-check：`docs/plans/health-check-2026-06-06.md` |
