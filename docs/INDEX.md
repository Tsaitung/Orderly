# Orderly 文檔索引（Canonical Docs Index）

> 目的：統一文檔入口，明確唯一維護版本，避免重複與分歧。

---

## 🎯 權威文檔（Canonical）
- 產品需求（PRD）：`docs/PRD-Complete.md`
- 使用者 Onboarding 流程：`docs/PRD-Onboarding-Process.md`
- 雙向推薦系統：`docs/PRD-Referral-System.md`
- 設計系統：`docs/design-system.md`
- 技術架構：`docs/Technical-Architecture-Summary.md`
- API（精要）：`docs/API-Endpoints-Essential.md`
- API（OpenAPI 3）：`docs/api-specification.yaml`
- 資料庫（架構核心）：`docs/Database-Schema-Core.md`
- 資料庫（部署運維）：`docs/database.md`

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

---

## 📌 提醒
- 若需要復原歷史內容，請使用 Git 歷史（blame/log）查閱已刪除文件版本。
