# Incidents

`incident-postmortem` 的 canonical home。記錄真實事故的還原、根因、修復與保留證據。由 `orderly-doc-governance` 治理。

- 檔名：`{YYYY-MM-DD}-{slug}.md`
- 只記**真實發生過**的事故（禁捏造；無事故不建檔）。
- 與 ADR 區分：ADR 是架構抉擇（trade-off）；incident 是故障 postmortem。外部平台限制走 spec/runbook，不進此處。

## Schema（每篇 incident）
- **Date / Severity / Modules affected**
- **Timeline**（偵測 → 緩解 → 修復）
- **Root cause**（實證）
- **Fix**（commit/PR）
- **Preventive actions**（含是否升 invariant / runbook / ADR）

## Ledger
| Date | Slug | Severity | Module | Root cause（摘要） |
|------|------|----------|--------|--------------------|
| 2026-06-08 | [monolith-reroot-drift](2026-06-08-monolith-reroot-drift.md) | medium (averted) | backend 部署層 | re-root 搬走 `app/` 但 `cd.yml` `COPY ${SERVICE_PATH}/app` + 8-service matrix 未同步 → CD 將部署空殼；部署前守衛攔截 |
