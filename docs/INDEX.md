# Orderly Documentation Index (v3.0 · 2025-09-27)

> 單一入口導覽。本索引涵蓋所有 Markdown 文件，並依用途分組，方便開發、營運與產品團隊快速定位資訊。新增或異動文件時，請同步更新此表。

---

## 1. 起點與治理（Start Here & Governance）
- `README.md` — 專案概覽、架構與快速啟動說明。
- `docs/README.md` — 文件資料夾導覽指南。
- `docs/PROJECT-OVERVIEW.md` — Orderly 平台願景、目標與里程碑摘要。
- `plan.md` — Staging 永久化計畫（v3.0），列出近期環境修復與待辦。
- `CLAUDE.md` — 代理/協作守則與開發輔助流程（唯一權威版本）。
- `CLAUDE.local.md` — 本機代理設定補充。

---

## 2. 企劃、進度與決策（Planning & Status）
- `docs/DEVELOPMENT-PROGRESS-REPORT.md` — 專案進度現況分析。
- `docs/CRITICAL-GAPS-ANALYSIS.md` — 關鍵風險與缺口彙總。
- `docs/NEXT-SPRINT-PLAN.md` — 下一階段衝刺計畫與交付目標。
- `ULTRA-DEEP-ANALYSIS-FINAL-SUMMARY.md` — 深度狀況盤點與策略結論。
- `PERMANENT-SOLUTIONS-IMPLEMENTATION.md` — 永久性修復方案一覽。
- `DEPLOYMENT-FIX-SUMMARY.md` — 部署修復摘要。
- `API-DATA-INCOMPLETENESS-ROOT-CAUSE-ANALYSIS.md` — API 資料缺失調查報告。
- `temp_deploy_trigger.md` — 2025-09-24 臨時部署觸發紀錄。

---

## 3. 產品需求與體驗（Product & UX）
- 核心 PRD：
  - `docs/PRD-Complete.md` — 產品需求唯一事實來源。
  - `docs/PRD-Auth-Module.md`
  - `docs/PRD-Billing-Master.md`
  - `docs/PRD-Customer-Hierarchy.md`
  - `docs/PRD-Customer-Hierarchy-Dashboard-Redesign.md`
  - `docs/PRD-Onboarding-Process.md`
  - `docs/PRD-Referral-System.md`
  - `docs/PRD-SKU-Management-Enhanced.md`
  - `docs/PRD-SKU-Sharing-System.md`
  - `docs/PRD-User-Management.md`
  - `docs/Orderly_Contracts_Config_PRD_Reconciliation.md`
  - `backend/supplier-service-fastapi/docs/PRD-Supplier-Frontend-Refactoring.md`
- 使用者體驗：
  - `docs/User-Interface-Wireframes.md`
  - `docs/supplier-onboarding-playbook.md`
  - `docs/super-admin-guide.md`
- 設計系統：
  - `docs/design-system.md`（概覽）
  - 子文件位於 `docs/design-system/`：`README.md`、`index.md`、`color-system.md`、`component-guidelines.md`、`layout-system.md`、`spacing-system.md`、`new-module-guide.md`

---

## 4. 架構與工程設計（Architecture & Engineering）
- `docs/Technical-Architecture-Summary.md` — 全域技術架構說明。
- `docs/technical-architecture-auth.md` — 身分驗證模組架構。
- `docs/PERFORMANCE-OPTIMIZATION-SUMMARY.md` — 系統效能優化與量測。
- `docs/docker-containerization-summary.md` — 容器化策略與部署考量。
- `CICD-init-guide.md` — GitHub Actions / CI 初始化指引。

---

## 5. 資料庫、資料與 API（Data & API）
- `docs/Database-Schema-Core.md` — 主要資料庫結構。
- `docs/database.md` — 資料庫操作、環境與維運。
- `docs/SQLALCHEMY-MIGRATION.md` — SQLAlchemy/Alembic 遷移指南。
- `docs/product_categories_final.md` — 產品分類資料定義。
- `docs/API-Endpoints-Essential.md` — API 端點摘要。
- `docs/smoke-tests.md` — API Smoke Test 列表。
- `docs/erp-integration-guide.md` — ERP 整合指引。
- `scripts/database/README.md` — 資料庫工具與腳本說明。

---

## 6. 營運與部署（Operations & Deployment）
- `docs/DEPLOYMENT-CHECKLIST.md` — 部署前/後檢查表。
- `docs/DEPLOYMENT-ENVIRONMENTS.md` — 多環境切換策略。
- `docs/DEPLOYMENT-TROUBLESHOOTING.md` — 故障排除手冊。
- `docs/staging-permanent-guide.md` — Staging 永久化部署指南。
- `docs/Infra-Runbook.md` — 雲端基礎架構 Runbook。
- `docs/ci-secrets.md` 與 `docs/github-secrets-setup.md` — GitHub / Cloud Secrets 配置。
- `docs/blue-green-deployment-guide.md` — 藍綠部署（歷史參考）。
- `scripts/docker-deployment-guide.md` — Docker 部署流程。
- `temp_deploy_trigger.md` — 臨時部署紀錄（亦見第 2 節）。

---

## 7. 工具與其他資源（Tooling & Misc）
- `docs/design-system/` 子資料夾所含原型指南（見第 3 節）。
- `public/images/hero/README.md` — 行銷素材使用說明。

---

## 8. 規格、需求模板與草稿（Specifications & Templates）
- `specs/requirements.md` — 專案需求範本。
- `specs-cloud-run-port/requirements.md` — Cloud Run PORT 變更需求。
- `requirements.md` — Cloud Run PORT 修復需求草稿模板。

---

## 9. 歷史紀錄與事後檢討（Historical Archive）
> 與第 2 節內容互相參照，保留完整調查與修復紀錄。
- `ULTRA-DEEP-ANALYSIS-FINAL-SUMMARY.md`
- `PERMANENT-SOLUTIONS-IMPLEMENTATION.md`
- `DEPLOYMENT-FIX-SUMMARY.md`
- `API-DATA-INCOMPLETENESS-ROOT-CAUSE-ANALYSIS.md`
- `temp_deploy_trigger.md`

---

## 10. 維護準則
- 所有新增文件需於本索引加入條目與簡介。
- 若文件被取代或合併，請在此標註「歷史紀錄」並更新指向。
- 嚴禁建立重複用途文件；若需差異化版本，請明確標示用途與維護者。
