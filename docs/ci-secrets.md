# CI/CD Secrets Configuration

完整的GitHub Secrets設置指南，用於Orderly平台的CI/CD部署。

## 🔑 必要的GitHub Secrets

### 核心部署Secrets
部署工作流(.github/workflows/deploy.yml)所需的核心secrets：

| Secret名稱 | 描述 | 必需程度 | 範例值 |
|-----------|------|---------|--------|
| `GCP_SA_KEY` | GCP Service Account JSON密鑰 | **必需** | (JSON格式，見下方說明) |
| `GCP_PROJECT_ID` | Google Cloud專案ID | **必需** | `orderly-472413` |
| `POSTGRES_PASSWORD` | PostgreSQL資料庫密碼 | **必需** | 強密碼 |
| `JWT_SECRET` | JWT簽名密鑰 | **必需** | 至少32字符隨機字符串 |
| `JWT_REFRESH_SECRET` | JWT刷新令牌密鑰 | **必需** | 至少32字符隨機字符串 |

### 環境特定Secrets (可選)
| Secret名稱 | 描述 | 預設值 |
|-----------|------|--------|
| `GOOGLE_CLOUD_PROJECT` | 備用GCP專案ID | 使用GCP_PROJECT_ID |
| `STG_DB_USER` | Staging資料庫用戶 | `orderly` |
| `PROD_DB_USER` | Production資料庫用戶 | `orderly` |

## 🚀 設置步驟

### 1. 在GitHub倉庫中設置Secrets
1. 打開GitHub倉庫 → Settings → Secrets and variables → Actions
2. 點擊 "New repository secret"
3. 添加每個必需的secret

### 2. GCP Service Account設置

#### 創建Service Account
```bash
PROJECT_ID="orderly-472413"
SERVICE_ACCOUNT="orderly-cicd"

# 創建Service Account
gcloud iam service-accounts create $SERVICE_ACCOUNT \
  --description="CI/CD deployment service account" \
  --display-name="Orderly CI/CD"

# 生成密鑰文件
gcloud iam service-accounts keys create key.json \
  --iam-account="$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"
```

#### 必需的GCP權限
為Service Account添加以下IAM角色：

```bash
SERVICE_ACCOUNT_EMAIL="orderly-cicd@$PROJECT_ID.iam.gserviceaccount.com"

# 核心權限
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/serviceusage.serviceUsageAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/cloudsql.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/redis.admin"
```

#### 啟用必要的GCP APIs
```bash
# 啟用部署所需的APIs
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable compute.googleapis.com
```

### 3. 將Service Account密鑰添加到GitHub
```bash
# 將key.json內容轉換為base64並添加到GitHub Secrets
cat key.json | base64 | pbcopy
# 在GitHub中創建GCP_SA_KEY secret並貼上內容
```

## 🔒 安全最佳實踐

### 密鑰生成建議
```bash
# 生成強JWT密鑰
openssl rand -base64 32

# 生成資料庫密碼
openssl rand -base64 24
```

### 定期輪換
- **Service Account密鑰**: 每3個月輪換
- **JWT密鑰**: 每6個月輪換
- **資料庫密碼**: 每年輪換

### 權限最小化
Service Account只應具有部署所需的最小權限集。

## 🚨 故障排除

### 常見問題

**問題**: Permission denied to enable service [run.googleapis.com]
**解決**: 確保Service Account具有`roles/serviceusage.serviceUsageAdmin`權限

**問題**: Artifact Registry repository creation failed
**解決**: 確保已啟用artifactregistry.googleapis.com API

**問題**: JWT authentication failed
**解決**: 檢查JWT_SECRET和JWT_REFRESH_SECRET是否設置正確

### 驗證設置
```bash
# 檢查Service Account權限
gcloud projects get-iam-policy $PROJECT_ID \
  --filter="bindings.members:serviceAccount:orderly-cicd@$PROJECT_ID.iam.gserviceaccount.com"

# 檢查已啟用的APIs
gcloud services list --enabled

# 測試GitHub Secrets (在GitHub Actions中)
echo "GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}"
```

## 📚 相關文檔
- [deploy.yml工作流](.github/workflows/deploy.yml) - 主要部署工作流
- [GCP部署腳本](scripts/deploy-cloud-run.sh) - Cloud Run部署腳本
- [Docker配置](docs/docker-containerization-summary.md) - 容器化文檔

---
**最後更新**: 2025-09-21  
**狀態**: ✅ 已整合所有secrets配置文檔
