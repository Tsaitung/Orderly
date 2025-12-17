# Development Plan（以 repo 現況更新）

_Last Updated: 2025-12-16_

本文件收斂 `docs/3-Development-Plan/` 內「進度／衝刺／缺口」類文件，作為唯一開發計畫主檔；CI/CD、部署與 Runbook 類文件保留為執行手冊，避免重複描述。

## 1) 近期交付目標

- **可演示閉環（staging-v2）**：Restaurant 下單 → Supplier 接單/改單 → 驗收 → 對帳（允許先以簡化/手動處理完成閉環）
- **可重複部署**：能用既有 CI/CD 流程重建環境、跑健康檢查、必要時可回滾

## 2) 現況摘要（以 repo 代碼掃描為準）

### 前端（Next.js App Router）

- 已有 auth 與多角色 dashboard 頁面：`app/(auth)/*`、`app/(dashboard)/*`
- 已有 BFF proxy 與 Cookie/refresh 機制：`app/api/bff/[...path]/route.ts`
- 仍存在 mock / fallback（需逐步替換為真 API）：`contexts/AuthContext.tsx` 與多個 dashboard components

### 後端（FastAPI 微服務）

- API Gateway：`backend/api-gateway-fastapi/app/main.py`（含 `security_headers.py`、`redis_rate_limit.py`）
- User Service：`backend/user-service-fastapi/app/api/v1/*`（auth/mfa/sessions/audit/oauth/organizations/invitations…）
- Order Service：`backend/order-service-fastapi/app/api/v1/orders.py`
- Product Service：`backend/product-service-fastapi/app/api/v1/*` + `backend/product-service-fastapi/app/api/bff/*`
- Billing Service：`backend/billing-service-fastapi/app/api/v1/*`
- Acceptance Service：`backend/acceptance-service-fastapi/app/api/v1/acceptance.py`
- Supplier Service：`backend/supplier-service-fastapi/app/api/v1/suppliers.py`
- Notification Service：`backend/notification-service-fastapi/app/api/v1/notifications.py`、`backend/notification-service-fastapi/app/api/otp.py`
- Customer Hierarchy Service：`backend/customer-hierarchy-service-fastapi/app/api/v2/endpoints/*`

### 測試現況

- 後端各服務已有 pytest 測試目錄：`backend/*/tests`
- Repo 根層級整合/E2E 覆蓋仍偏少：`tests/`（目前僅少量腳本）

## 3) 模組落地狀態（重點，不追求百分比）

| 模組 | 後端（代碼） | 前端（頁面） | 主要缺口（以 repo 現況） |
|---|---|---|---|
| Auth / Org / Role | User Service + Gateway 已具備結構 | `app/(auth)/*`、platform users/roles 頁面 | AuthContext 與部分流程仍有 mock；權限導向導航/守衛需統一 |
| Product / SKU / Category | Product Service API + BFF | platform products/categories、supplier skus/products | SKU analytics/sharing 等仍含 mock/TODO；前端需對齊真 API 與型別契約 |
| Order | Order Service orders API | restaurant/supplier orders | 跨服務事件/通知/對帳串接需補；狀態機與權限校驗需用測試鎖住 |
| Acceptance | Acceptance API | restaurant acceptance | 與驗收影像/附件、Billing 對帳串接（目前仍有 TODO） |
| Billing / Reconciliation | Billing Service reconciliations/fee configs | restaurant reconciliation | 候選訂單、驗收差異、費率公式等仍需補齊與驗證 |
| Customer Hierarchy | v2 hierarchy/group/company/location APIs | platform customers | analytics/快取仍含 mock；Redis/快取 fallback 策略需明確化 |
| Supplier | supplier APIs | supplier onboarding/settings/customers | 指標/近況仍有 TODO（需串 Order/Customer）；管理端點權限依賴需補 |
| Notification | notifications + otp | 供應商通知元件存在 | 真實 Email/SMS provider 與環境配置（Secrets）需落地與演練 |

## 4) P0（優先、阻塞演示閉環）

1. **Auth 真實化（前端）**：移除/隔離所有 `staging-mock-token` 與 mock auth fallback，統一路徑走 `app/api/bff/*` 並以 Cookie 維持登入狀態。
2. **權限與租戶一致性**：前端 route guard + BFF 請求 header/cookie + 後端 tenant_id 欄位/授權檢查對齊（避免「有數字/無列表」或跨租戶讀取）。
3. **資料庫可重建**：以既有 Alembic + seed 流程，確保 staging-v2 可從空 DB 重新建立必要資料（demo 帳號、基礎品類/商品、最小訂單資料）。
4. **Restaurant 下單閉環**：restaurant orders 頁面串 Order Service（建立/查詢/狀態變更最小集合），並能產出可供 supplier 處理的訂單。
5. **Supplier 接單/改單閉環**：supplier orders 頁面串接（確認/拒絕/調整）並回寫訂單狀態。
6. **驗收落地（最小）**：acceptance 頁面可從訂單拉取驗收項、提交驗收結果；附件/照片可先以簡化版（先不做完整檔案儲存也可）。
7. **對帳落地（最小）**：reconciliation 頁面能建立對帳、列出差異、完成人工確認（先確保 API 可用與資料一致）。
8. **最小 Smoke / 回歸**：補齊「登入→下單→接單→驗收→對帳」關鍵 API 的最小 smoke 驗證（可先以腳本/pytest/integration 形式落地）。

## 5) P1（提升可用性與真實整合）

- **替換 mock 指標與 analytics**：supplier/customer-hierarchy/product 的 mock metrics 改以真 DB 統計或明確標記為 demo-only。
- **事件/通知串接**：訂單狀態、驗收完成、對帳完成 → 通知服務（先站內通知，再外部 Email/SMS）。
- **費率與對帳規則完善**：補齊 `fee_configs` 的公式計算、候選訂單策略與差異規則，並以測試鎖住。
- **測試體系**：把關鍵流程搬到 `tests/`（整合測試）並在 CI 跑起來，減少只靠手測/部署後驗證。

## 6) Definition of Done（每個模組/票）

- 有對應 PRD/契約引用（避免自行發明欄位）：`docs/2-PRD/INDEX.md`、`shared/types`
- 最少包含：lint/type-check、服務健康檢查、關鍵路徑測試（單元或整合擇一，但需可重跑）
- staging-v2 能部署並通過：`./DEPLOYMENT-CHECKLIST.md` 的必要項

## 7) 執行手冊索引（避免重複）

- CI/CD：`./CI-CD-ARCHITECTURE.md`、`./ci-secrets.md`、`./CI-CD-TROUBLESHOOTING-GUIDE.md`
- 部署：`./DEPLOYMENT-CHECKLIST.md`、`./DEPLOYMENT-ENVIRONMENTS.md`、`./DEPLOYMENT-TROUBLESHOOTING.md`
- 營運：`./Infra-Runbook.md`、`./staging-permanent-guide.md`
- 測試入口：`docs/4-Test/INDEX.md`

