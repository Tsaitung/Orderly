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

---

## 📌 提醒
- 若需要復原歷史內容，請使用 Git 歷史（blame/log）查閱已刪除文件版本。
