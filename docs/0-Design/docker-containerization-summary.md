# Docker / Compose 容器化策略

本文件說明 Orderly 在本機與部署環境使用 Docker/Compose 的方式，並標示「真實來源」檔案位置，避免混用過期設定。

> 後端已從多微服務整併為 **modular monolith**（`backend/app/modules/<svc>`、共用 `backend/libs/`，單一 `backend/Dockerfile.monolith`）。舊的 per-service compose（`compose.services.yml`）與 per-service Dockerfile 已退役。

## 快速開始（本機）

啟動後端 monolith（self-contained，含 Postgres/Redis）：

```bash
docker compose -f compose.monolith.yml up -d        # 等同 npm run dev:backend
```

僅啟動依賴（在本機直接跑後端/前端，DB/Redis 用容器）：

```bash
docker compose -f compose.base.yml -f compose.dev.yml up -d postgres redis
```

可選 admin 工具（pgAdmin / redis-commander）：

```bash
docker compose -f compose.base.yml -f compose.dev.yml --profile admin up -d
```

基本驗證：後端 `http://localhost:${BACKEND_PORT:-8888}/health`、`/db/health`。

## Compose 檔案分工（單一真實來源）

- `compose.monolith.yml`：**本機後端的真實來源** —— monolith + Postgres + Redis，self-contained；`.claude/restart.yaml` 與 `npm run dev:backend` 用它。
- `compose.base.yml`：Postgres/Redis 服務 + 共用環境變數模板 + volume/network 定義。
- `compose.dev.yml`：dev 覆寫（在 base 上曝露 DB host 端口 + 可選 admin tools）。
- `compose.staging.yml` / `compose.prod.yml`：環境覆寫（image + ENVIRONMENT），供以容器模擬對應環境。

## Dockerfile 來源

- 後端 monolith：`backend/Dockerfile.monolith`（Cloud Build 設定 `backend/cloudbuild.monolith.yaml`）。
- 前端：`Dockerfile.frontend`（Cloud Run 用 `Dockerfile.frontend.cloudrun`）。

## 端口與路由標準

- 本機：後端 monolith `${BACKEND_PORT:-8888}`（容器內 `8080`）；DB/Redis host 端口由 direnv 提供（`POSTGRES_PORT` / `REDIS_PORT`）。
- Cloud Run：平台注入 `PORT=8080`；服務需監聽 `0.0.0.0:$PORT`。

## 維護規則（避免文件再度失真）

1) 後端模組/端口調整：同步更新 `backend/Dockerfile.monolith` 與 `compose.monolith.yml`。
2) 端口/路由登記：同步更新 `docs/0-Design/Documentation-Management-API.md` 的表格。
3) 部署：Cloud Run 一律走 `.github/workflows/cd.yml`（build `backend/Dockerfile.monolith` + `Dockerfile.frontend`）。
