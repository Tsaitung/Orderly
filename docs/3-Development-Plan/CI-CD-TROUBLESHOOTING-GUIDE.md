# CI/CD Troubleshooting Guide - 完整解決方案文檔

## 📋 執行摘要

本文檔記錄 2025-09-30 發現並解決的所有 CI/CD 問題，包括根本原因分析和永久解決方案。

## 🔍 發現的問題清單

### 1. CI/CD 不會自動部署所有服務
**症狀**: GitHub Actions 只部署有變更的服務，導致新環境缺少服務  
**根因**: 設計為增量部署以節省資源  
**解決**: staging 分支預設 `force_backend=true` 和 `force_frontend=true`  
**檔案**: `.github/workflows/deploy.yml` 第 113-114 行  

### 2. 服務名稱過長導致 Cloud Run URL 截斷
**症狀**: `orderly-customer-hierarchy-service-fastapi-staging-v2` URL 被截斷  
**根因**: Cloud Run 服務名稱限制 49 字元，URL 限制更短  
**解決**: 
- 創建短名稱服務 `orderly-custhier-staging-v2`
- 新增三層防護：CI 驗證、部署腳本檢查、文檔警告
**檔案**: `scripts/ci/validate-service-names.sh`, `scripts/deploy-cloud-run.sh`

### 3. Frontend 部署失敗 - Cloud Build substitution 錯誤
**症狀**: `key "_NEXT_PUBLIC_API_BASE_URL" not matched`  
**根因**: cloudbuild.yaml 沒有使用傳入的 substitution  
**解決**: 
- `frontend/cloudbuild.yaml` 新增 `--build-arg`
- `Dockerfile.frontend` 新增 `ARG` 和 `ENV`

### 4. Health Check 環境變數缺失
**症狀**: 所有健康檢查失敗  
**根因**: 缺少 `GOOGLE_CLOUD_PROJECT` 和 `GOOGLE_CLOUD_REGION`  
**解決**: deploy.yml Health Check job 新增環境變數

### 5. Gateway-Hierarchy endpoint 401 錯誤
**症狀**: `/api/v2/hierarchy/tree?fast_mode=true` 需要認證  
**根因**: API Gateway 將所有 `/api/v2/*` 標記為需要認證  
**解決**: `backend/api-gateway-fastapi/app/main.py` 新增認證例外

### 6. 資料庫遷移失敗 - alembic: command not found
**症狀**: GitHub Actions runner 無法執行 alembic  
**根因**: CI/CD 環境沒有 Python 依賴  
**解決**: 改用 Cloud Build 執行遷移

### 7. Cloud Build substitutions 不匹配
**症狀**: `key "_INSTANCE" in substitution data is not matched`  
**根因**: migration-job.yaml 使用 `_INSTANCE_CONNECTION_NAME` 而非 `_INSTANCE`  
**解決**: 修正 substitution 變數名稱

### 8. import-staging-data.sh 執行錯誤
**症狀**: `cannot execute binary file: Exec format error`  
**根因**: cloud-sql-proxy 二進制檔案架構不相容  
**解決**: CI/CD 中移除本地專用腳本

### 9. Customer Hierarchy 健康檢查 404
**症狀**: deploy-staging-permanent workflow 健康檢查失敗  
**根因**: 環境變數不匹配（使用 staging 但服務在 staging-v2）  
**解決**: 設置 `ENV=staging-v2` 

## 📊 服務名稱與 URL 對應表

### Staging-v2 環境（主要使用）

| 服務類型 | Cloud Run 服務名稱 | URL |
|---------|-------------------|-----|
| API Gateway | orderly-api-gateway-fastapi-staging-v2 | https://orderly-api-gateway-fastapi-staging-v2-655602747430.asia-east1.run.app |
| User Service | orderly-user-staging-v2 | https://orderly-user-staging-v2-655602747430.asia-east1.run.app |
| Order Service | orderly-order-staging-v2 | https://orderly-order-staging-v2-655602747430.asia-east1.run.app |
| Product Service | orderly-product-staging-v2 | https://orderly-product-staging-v2-655602747430.asia-east1.run.app |
| Customer Hierarchy | **orderly-custhier-staging-v2** | https://orderly-custhier-staging-v2-655602747430.asia-east1.run.app |
| Acceptance Service | orderly-accept-staging-v2 | https://orderly-accept-staging-v2-655602747430.asia-east1.run.app |
| Notification Service | orderly-notify-staging-v2 | https://orderly-notify-staging-v2-655602747430.asia-east1.run.app |
| Supplier Service | orderly-supplier-staging-v2 | https://orderly-supplier-staging-v2-655602747430.asia-east1.run.app |

### Staging 環境（舊版，逐步淘汰中）

| 服務類型 | Cloud Run 服務名稱 | URL | 問題 |
|---------|-------------------|-----|------|
| Customer Hierarchy (長名) | orderly-customer-hierarchy-service-fastapi-staging | ...stagin-usg6y7o2ba-de.a.run.app | ⚠️ URL 被截斷 |
| Customer Hierarchy (短名) | orderly-customer-hierarchy-staging | https://orderly-customer-hierarchy-staging-usg6y7o2ba-de.a.run.app | ✅ 正常 |

## 🔄 Workflow 差異說明

### 1. Deploy to Cloud Run (deploy.yml)
**觸發**: push to staging/main 或 workflow_dispatch  
**用途**: 主要部署流程  
**特點**: 
- 完整的 CI/CD pipeline
- 包含安全掃描、配置驗證、健康檢查
- 部署到 staging-v2 環境
- **這是主要使用的 workflow**

### 2. Deploy Staging (Permanent) (deploy-staging-permanent.yml)
**觸發**: push to staging 或 workflow_dispatch  
**用途**: 永久配置部署（次要）  
**特點**:
- 使用 configs/staging/ 的永久配置
- 嘗試執行資料庫遷移和資料導入
- 需要設置 ENV=staging-v2 以匹配實際部署
- **這是補充性的 workflow**

## 🛠️ 解決方案實施檢查清單

### ✅ 已完成的修復

- [x] deploy.yml 第 113-114 行：staging 分支預設全量部署
- [x] validate-service-names.sh：服務名稱長度驗證
- [x] frontend/cloudbuild.yaml：新增 build-arg
- [x] Dockerfile.frontend：新增 ARG/ENV
- [x] deploy.yml Health Check：新增環境變數
- [x] API Gateway main.py：hierarchy/tree 認證例外
- [x] deploy-staging-permanent.yml：改用 Cloud Build 遷移
- [x] migration substitutions：修正變數名稱
- [x] deploy-staging-permanent.yml：設置 ENV=staging-v2

### ⚠️ 注意事項

1. **服務名稱長度**: 永遠保持 ≤30 字元（安全）或 ≤49 字元（極限）
2. **環境變數一致性**: 確保 deployment 和 health check 使用相同環境
3. **資料庫遷移**: 必須使用 Cloud Build 或 Cloud Run Jobs，不能在 GitHub Actions runner 執行
4. **本地腳本**: import-staging-data.sh 等需要 Cloud SQL Proxy 的腳本不能在 CI/CD 執行

## 📝 最佳實踐建議

### 1. 新增服務時
- 檢查服務名稱長度（使用 validate-service-names.sh）
- 更新 deploy-cloud-run.sh 的 get_short_name() 函數
- 確認 health-check-simple.sh 包含正確的 URL

### 2. 修改 CI/CD 時
- 測試 staging 分支的完整部署
- 驗證所有環境變數正確傳遞
- 檢查 Cloud Build logs 確認無錯誤

### 3. 資料庫操作
- 使用 Cloud Build 執行遷移
- 本地測試使用 Cloud SQL Proxy
- 生產環境使用 Cloud Run Jobs

## 🚨 常見錯誤與解決

| 錯誤訊息 | 原因 | 解決方法 |
|---------|------|---------|
| `alembic: command not found` | GitHub Actions 沒有 Python | 使用 Cloud Build |
| `key "_XXX" not matched` | Substitution 變數名稱錯誤 | 檢查 YAML 檔案的 substitutions 區塊 |
| `cannot execute binary file` | 二進制檔案架構不相容 | 不要在 CI/CD 執行本地工具 |
| `Customer Hierarchy: Failed (HTTP 404)` | 環境變數不匹配 | 設置正確的 ENV 值 |
| URL 被截斷 | 服務名稱過長 | 使用短名稱（≤30 字元） |

## 📅 維護記錄

- **2025-09-30 17:05**: Frontend 部署問題修復
- **2025-09-30 17:47**: Gateway-Hierarchy 認證問題修復
- **2025-09-30 18:15**: 資料庫遷移改用 Cloud Build
- **2025-09-30 18:30**: Customer Hierarchy 環境變數修復

## 🔗 相關文檔

- [plan.md](../../plan.md) - 問題追蹤和修復進度
- [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md) - 部署檢查清單
- [DEPLOYMENT-TROUBLESHOOTING.md](./DEPLOYMENT-TROUBLESHOOTING.md) - 一般故障排除
- [ci-secrets.md](./ci-secrets.md) - GitHub Secrets 配置

---

**最後更新**: 2025-09-30 18:35  
**維護者**: Claude Code  
**狀態**: 所有已知問題已解決 ✅
