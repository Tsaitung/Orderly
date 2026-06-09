# Deprecation Roadmap

`tech-debt-with-exit-trigger` 的 canonical home。記錄 legacy code / workaround / deprecated surface 與其**明確退場觸發條件**。由 `orderly-doc-governance` 治理。

## Disposition 類別（每項必選一）
- `execute-now`：本輪即清
- `defer-once`：明確延後一次（附下次觸發點），禁止第二次模糊 defer（違反 → `P-LEGACY-VAGUE-DEFER`）
- `permanent-compatibility`：刻意永久相容（附理由）
- `retire`：已排定移除（附目標日期/條件）

## Ledger

| ID | 項目 | 現況 | Exit Trigger（退場條件） | Disposition | 來源 / 備註 |
|----|------|------|--------------------------|-------------|-------------|
| _（尚無登錄項；新增 tech-debt 時填此表，勿留在 plan packet / handoff）_ | | | | | |

> 候選（待確認後登錄，非保證為 debt）：`docs/plans/CI-CD-TROUBLESHOOTING-GUIDE.md` dangling 引用（`plan.md` / `DEVELOPMENT-PLAN.md` 指向不存在檔，真實檔為 `DEPLOYMENT-TROUBLESHOOTING.md`）。
