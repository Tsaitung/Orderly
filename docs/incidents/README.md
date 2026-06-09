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
| _（尚無事故登錄）_ | | | | |
