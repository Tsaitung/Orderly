# ⚠️ DEPRECATED - 請使用 docs/ci-secrets.md

**此文件已被整合到主要的CI/CD文檔中。**

請查看: [docs/ci-secrets.md](./ci-secrets.md) 獲取最新的secrets配置指南。

---

## 🚨 安全警告

此文件之前包含敏感的GCP憑證資料。
- 已於2025-09-21移除洩漏的私鑰
- 相關Service Account密鑰已被輪換
- 所有secrets配置已移至docs/ci-secrets.md

## 設置步驟

### 1. 進入 GitHub 倉庫設置
1. 在 GitHub 上打開您的 `Orderly` 倉庫
2. 點擊 "Settings" 標籤
3. 在左側選單選擇 "Secrets and variables" → "Actions"

### 2. 添加每個 Secret
對於每個上述的 Secret：
1. 點擊 "New repository secret"
2. 在 "Name" 欄位輸入 Secret 名稱（例如：`GCP_SA_KEY`）
3. 在 "Secret" 欄位貼上對應的值
4. 點擊 "Add secret"

### 3. 驗證設置
設置完成後，您應該看到以下 4 個 Secrets：
- ✅ `GCP_SA_KEY`
- ✅ `GCP_PROJECT_ID`
- ✅ `JWT_SECRET`
- ✅ `JWT_SECRET_PROD`

## 安全注意事項

⚠️ **重要**: 
- 這些 Secrets 包含敏感資訊，切勿在代碼或公開場所分享
- Production JWT 密鑰應該使用強隨機字符串
- 定期輪換生產環境的密鑰
- 確保只有必要的團隊成員有訪問權限

## 環境配置

### Staging 環境
- 觸發條件：推送到 `develop` 分支
- 部署到：Cloud Run staging 服務
- JWT 密鑰：使用 `JWT_SECRET`

### Production 環境
- 觸發條件：推送到 `main` 分支
- 部署到：Cloud Run production 服務
- JWT 密鑰：使用 `JWT_SECRET_PROD`
- 需要手動批准部署

## 下一步

設置完 GitHub Secrets 後，您可以：
1. 推送代碼到 `develop` 分支來觸發 staging 部署
2. 推送代碼到 `main` 分支來觸發 production 部署
3. 監控 GitHub Actions 頁面查看部署狀態

部署完成後，您將收到服務的 URL，可以直接訪問您的 Hello World 應用程式！