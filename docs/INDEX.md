# Orderly 文檔索引（Canonical Docs Index）

> 目的：統一文檔入口，明確唯一維護版本，避免重複與分歧。

---

## 🎯 權威文檔（Canonical）

- 開發助手指南：`CLAUDE.md`（唯一開發助理/代理使用與協作指引）
- 產品需求（PRD）：`docs/PRD-Complete.md`
- 使用者 Onboarding 流程：`docs/PRD-Onboarding-Process.md`
- 雙向推薦系統：`docs/PRD-Referral-System.md`
- 設計系統：`docs/design-system.md`
- 技術架構：`docs/Technical-Architecture-Summary.md`
- API（精要）：`docs/API-Endpoints-Essential.md`
- API（OpenAPI 3）：`docs/api-specification.yaml`
- 資料庫（架構核心）：`docs/Database-Schema-Core.md`
- 資料庫（部署運維）：`docs/database.md`
- 資料庫管理工具：`scripts/database/README.md`（統一資料庫管理解決方案）
- CI/CD 部署配置：`docs/ci-secrets.md`（GitHub Secrets 與環境變數完整設定）
- 部署檢查清單：`docs/DEPLOYMENT-CHECKLIST.md`（前後端服務部署驗證流程）
- 環境管理指南：`docs/DEPLOYMENT-ENVIRONMENTS.md`（多環境架構與維護策略）
- 故障排除指南：`docs/DEPLOYMENT-TROUBLESHOOTING.md`（部署問題診斷與解決方案）

---

## 🧭 使用指引（Which doc to use?）

- 規劃/驗收：讀 `PRD-Complete.md`（唯一需求事實來源）
- 使用者引導：讀 `PRD-Onboarding-Process.md`（新用戶註冊流程設計）
- 推薦系統：讀 `PRD-Referral-System.md`（雙向邀請機制設計）
- 設計/組件：讀 `design-system.md`（UI/UX、樣式、語意色）
- 架構決策：讀 `Technical-Architecture-Summary.md`（實作就緒視圖）
- API 開發：
  - 人類可讀 → `API-Endpoints-Essential.md`
  - 機器對接 → `api-specification.yaml`（OpenAPI）
- 數據模型：讀 `Database-Schema-Core.md`
- DB 運維：讀 `database.md`
- DB 管理工具：讀 `scripts/database/README.md`（資料導出/導入、測試資料創建、環境遷移）
- 部署配置：讀 `ci-secrets.md`（GitHub Actions、Cloud Run、Secret Manager 設定）
- 部署驗證：讀 `DEPLOYMENT-CHECKLIST.md`（完整的前後端部署檢查流程）
- 環境切換：讀 `DEPLOYMENT-ENVIRONMENTS.md`（Development/Staging/Production 環境管理）
- 問題排除：讀 `DEPLOYMENT-TROUBLESHOOTING.md`（常見故障診斷與緊急響應）

---

## 🛠️ 維護規範（Maintenance Rules）

- 單一真相：涉及需求的變更，先更新 `PRD-Complete.md`
- 不重複：新增文檔前，先檢查是否已有對應權威文件
- 同步鏈結：新增或重命名文檔時，更新相關交叉引用
- PR 驗收：文檔變更需包含「影響範圍 + 更新的鏈結」

---

## ♻️ 本次整併（2025-09-18）

- 合併至 PRD：`docs/PRD.md`、`requirement.md` → `docs/PRD-Complete.md`
- 合併至 設計系統：根目錄 `Orderly Design System.md` → `docs/design-system.md`
- 合併至 技術架構：`docs/technical-architecture.md` → `docs/Technical-Architecture-Summary.md`
- 合併至 API：`docs/api-specification.md` → `docs/API-Endpoints-Essential.md` + `docs/api-specification.yaml`

## 🔧 資料庫管理工具整合（2025-09-22）

- 整合資料庫腳本：5個分散腳本 → 2個核心工具
  - 統一管理工具：`scripts/database/database_manager.py`（導出、導入、測試資料、清理）
  - 真實資料腳本：`scripts/database/seed_from_real_data.py`（基於生產資料的完整測試）
- 刪除一次性腳本：`export_production_data.py`、`generate_seed_from_export.py`、`seed_test_customers.py`、`import_to_staging.py`
- 更新文檔：`CLAUDE.md`、`docs/database.md`、`scripts/database/README.md`

## 🚀 部署文檔系統化（2025-09-24）

- 新增部署文檔系列：涵蓋完整的 CI/CD 與多環境部署管理
  - `docs/ci-secrets.md`：GitHub Secrets、Cloud SQL 配置、新版 workflow inputs
  - `docs/DEPLOYMENT-CHECKLIST.md`：前後端服務部署驗證（8個微服務 + 前端）
  - `docs/DEPLOYMENT-ENVIRONMENTS.md`：Development/Staging/Production 環境架構
  - `docs/DEPLOYMENT-TROUBLESHOOTING.md`：故障排除與緊急響應流程
- 實作診斷端點：為 6個後端服務添加 `/db/health` 資料庫健康檢查
- 統一診斷工具：`scripts/db/diag.sh` 批量檢查所有服務狀態
- 支援 v2 平行部署：orderly-db-v2 Cloud SQL 實例與服務後綴機制

---

## 📌 提醒

- 若需要復原歷史內容，請使用 Git 歷史（blame/log）查閱已刪除文件版本。
- `docs/blue-green-deployment-guide.md` 已標記為歷史參考文件，實際部署請依本索引列出的權威文檔。
