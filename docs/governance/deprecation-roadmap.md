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
| DR-001 | `customer_hierarchy/integration_service` order/billing fanout = no-op stub | partial in-process（user 權限 + hierarchy alert 已 in-process）；order/billing fanout 仍 deny-write / no-op | customer-hierarchy bulk/migration **write flow 啟用**時，補真 in-process order/billing domain handler | `defer-once` | step4-9 D1；[ADR-0003](../adr/ADR-0003-backend-modular-monolith-consolidation.md) 子決策 D1 |
| DR-002 | legacy per-service staging Cloud Run 服務（`orderly-*-service-fastapi-staging-v2` 等）與 monolith `orderly-backend-staging-v2` 並存 | 並存（gcloud 2026-06-09 確認）| monolith staging 確認穩定後 teardown 舊 per-service 服務 | `retire` | step4-9 §5；[runbook](runbooks/backend-monolith-production-cutover.md) §5 |
| DR-003 | 8 個 `orderly-*-service-fastapi-production` 服務指向不存在的 `orderly-db` | production 實質未運作 | production cutover 時 decommission（依 runbook D-prod-1 決定 prod DB target 後）| `retire` | step4-9 §4；runbook §1/§5 |
| DR-004 | `cd.yml` smoke job `if: always() && build-deploy.result != 'failure'` 在 deploy skip 時仍跑 | 服務已存在故無害 | 下次 touch `cd.yml` 時改為要求 `build-deploy == 'success'` | `defer-once` | step4-9 §10「仍開放」cosmetic |
| DR-005 | dashboard mock 杜撰客戶名（大樂司/樂多多/烤食組合/稻舍）殘留於 4 檔：`src/components/admin/UserManagement.tsx`、`src/components/supplier/finance/invoice-manager.tsx`、`src/components/supplier/logistics/{delivery-map,delivery-list}.tsx` | 登入後 dashboard 假資料（非公開行銷背書）；2026-06-09 grep 確認仍在 | 獨立 mock-data 清理 task：換成中性/匿名情境假資料（守「禁捏造真實客戶名」紀律）| `defer-once` | public-pages packet 明列 OOS（PUBLIC_SCOPE grep 不擴及）；[competitive-analysis](../0-Design/competitive-analysis-cocomart.md) §8 |
| DR-006 | auth social-only：真實 Line/Google provider callback smoke 未跑（本地僅 route/E2E proxy 驗證）| auth 實作已 merge + CI-green；外部 provider 端從未實接 | **G3**：取得 staging OAuth credentials + 設定 redirect URI `/auth/callback/{provider}` 後，跑真實 Line+Google callback，驗 httpOnly cookie / SecureStorage 寫入、Google-unbound→引導 Line、平台需 MFA、audit rows 非空。**G4**：若日後引入獨立 production DB 實例，deploy 前重跑 password-only count（連動 [cutover runbook](runbooks/backend-monolith-production-cutover.md) D-prod-1）| `defer-once` | auth packet G3/G4；[ADR-0004](../adr/ADR-0004-auth-social-only-login-model.md) Consequences |

> 候選（待確認後登錄，非保證為 debt）：`docs/3-Development-Plan/CI-CD-TROUBLESHOOTING-GUIDE.md` dangling 引用（`plan.md` / `DEVELOPMENT-PLAN.md` 指向不存在檔，真實檔為 `DEPLOYMENT-TROUBLESHOOTING.md`）。
