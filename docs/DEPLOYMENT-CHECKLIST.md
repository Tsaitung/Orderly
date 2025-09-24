# 部署檢查清單（Cloud Run）

> 本清單聚焦於前端（Next.js, App Router, standalone）在 Cloud Run 的環境變數設定與驗證，與 README 同步。

## 環境變數與優先順序

- 伺服端 `backendUrl` 解析優先序：
  - 1) `ORDERLY_BACKEND_URL`
  - 2) `BACKEND_URL`
  - 3) 自 `NEXT_PUBLIC_API_BASE_URL` 推導（取其 Origin，例如 `https://gateway.run.app`）
  - 4) 回退 `http://localhost:8000`
- 推薦：部署時以 gcloud CLI 在執行期注入三者（至少前兩者），避免依賴 build-time 的 publicRuntimeConfig。

## gcloud 部署前端（示例）

```bash
ENVIRONMENT=staging
PROJECT="<your-gcp-project>"
REGION="asia-east1"
IMAGE="asia-east1-docker.pkg.dev/$PROJECT/orderly/orderly-frontend:$ENVIRONMENT-<sha>"
BACKEND_URL="https://orderly-api-gateway-fastapi-$ENVIRONMENT-xxxxx.run.app"

# 部署前端，於執行時注入環境變數
 gcloud run deploy "orderly-frontend-$ENVIRONMENT" \
  --image="$IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=$ENVIRONMENT,ORDERLY_BACKEND_URL=$BACKEND_URL,BACKEND_URL=$BACKEND_URL,NEXT_PUBLIC_API_BASE_URL=$BACKEND_URL/api" \
  --memory=1Gi --cpu=1 --min-instances=0 --max-instances=10 --concurrency=100 --port=8080
```

說明：
- `ORDERLY_BACKEND_URL` 與 `BACKEND_URL` 供伺服端於執行時讀取。
- `NEXT_PUBLIC_API_BASE_URL` 提供瀏覽器端使用，且伺服端可在缺省時據此推導（保險機制）。

## 本地開發 .env.local 建議

```env
ORDERLY_BACKEND_URL=http://localhost:8000
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

## 部署後驗證

- 呼叫前端服務的 `GET /api/env-check`，檢查：
  - `raw_environment_variables.ORDERLY_BACKEND_URL` 與 `BACKEND_URL` 應等於 Cloud Run API Gateway 根網址
  - `computed_config.backendUrl` 應與上列相同
  - `validation.backend_url_resolved = true`

## 注意事項（Next.js App Router + Standalone）

- 不使用 `publicRuntimeConfig` 作為執行時變數來源；僅使用 `process.env`（伺服端）與 `NEXT_PUBLIC_*`（瀏覽器端）。
- Standalone 輸出模式下，環境變數必須由 Cloud Run 執行時注入，而非建置時硬編碼。
