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
| [ADR-0003](ADR-0003-backend-modular-monolith-consolidation.md) | foundational | accepted | Backend 收斂為模組化單體（9 FastAPI 服務 → 1） | — | — | — | — |
| [ADR-0004](ADR-0004-auth-social-only-login-model.md) | risk-acceptance | accepted | 全平台社群登入（Line 主/Google 次，廢密碼）+ 平台端安全 trade-off | PRD-Auth-Module | US-AUTH-001..022 | — | 2026-12-09 |
| [ADR-0005](ADR-0005-auth-super-admin-impersonation.md) | risk-acceptance | accepted | Super Admin 帳號模擬登入（act-as 化身目標角色，非 God mode）+ 租戶隔離雙 context | PRD-Auth-Module | US-AUTH-023, US-AUTH-024 | — | 2026-12-09 |

## Clusters

常見 ADR cluster slug（freeform）：`billing`、`order`、`auth`、`product`、`acceptance`、`customer-hierarchy`。
