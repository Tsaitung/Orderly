# Docker / Compose 容器化策略

本文件說明 Orderly 在本機與部署環境使用 Docker/Compose 的方式，並明確標示「真實來源」檔案位置，避免混用過期的 `docker-compose.*` 設定。

## 快速開始（本機）

啟動所有後端服務（含 Postgres/Redis）：

```bash
docker compose -f compose.base.yml -f compose.services.yml -f compose.dev.yml up -d
```

僅啟動依賴（供你在本機跑後端/前端，但 DB/Redis 用容器）：

```bash
docker compose -f compose.base.yml up -d postgres redis
```

基本驗證：

- API Gateway：`http://localhost:8000/health`
- 端口與 Gateway 基底路徑：以 `docs/0-Design/Documentation-Management-API.md` 表格為準

## Compose 檔案分工（單一真實來源）

- `compose.base.yml`：Postgres/Redis、共用環境變數模板、volume/network 定義。
- `compose.services.yml`：後端服務共用設定（healthcheck、depends_on、預設服務 URL）。
- `compose.dev.yml`：本機開發覆寫（build、ports、可選 admin tools）。
- `compose.staging.yml`：staging 覆寫（image + ENVIRONMENT）。
- `compose.prod.yml`：production 覆寫（image + ENVIRONMENT）。

> 建議用 `docker compose ... config` 檢視合併結果；CI 亦可參考 `scripts/dev/test-docker-compose.sh` 的驗證方式。

## Dockerfile 來源

- API Gateway：`backend/api-gateway-fastapi/Dockerfile`
- 後端服務：`backend/*-service-fastapi/Dockerfile`
- 前端：`Dockerfile.frontend`

## 端口與路由標準

- 本機：API Gateway 固定 `8000`；其餘服務使用 `3001+`（詳見 `docs/0-Design/Documentation-Management-API.md`）。
- Cloud Run：平台注入 `PORT=8080`；服務需監聽 `0.0.0.0:$PORT`，並由 API Gateway 統一入口與驗證。

## 維護規則（避免文件再度失真）

1) 新增/調整服務或端口：同步更新 `compose.services.yml` 與對應環境 compose 檔。  
2) 端口/路由登記：同步更新 `docs/0-Design/Documentation-Management-API.md` 的表格。  
3) 前後端硬編碼掃描：必要時補充到 `docs/0-Design/Frontend-Backend-Endpoint-Consistency.md`。
