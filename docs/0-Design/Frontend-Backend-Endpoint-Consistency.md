# 前後端端點與埠對齊檢查（初始紀錄）

## 範圍與目的
- 針對 App Router 前端與 FastAPI 微服務的預設 URL/埠/路徑，列出目前代碼中的潛在不一致，方便後續修正或建立 CI 檢查。
- 基準埠：API Gateway 8000、各服務 3001–3008（詳見 `Documentation-Management-API.md`）。

## 快速掃描結果（需決策/修正）
1) 接受驗收服務路徑不一致 **(已調整)**  
   - BFF 直連改用防重複拼接的 join，預設 `ACCEPTANCE_SERVICE_URL` 改為 `http://localhost:3004/acceptance`，避免 /acceptance 重複或缺失。
   - Gateway 仍維持 `/api/acceptance/*` → `…/acceptance/*` 映射。

2) 訂單 WebSocket 端口硬編碼 **(已調整)**  
   - `lib/websocket/order-websocket.ts` 改用 `NEXT_PUBLIC_WS_ORDERS_URL | NEXT_PUBLIC_WS_URL | NEXT_PUBLIC_WS_BASE_URL`，否則從 backend base 推導並自動轉 `ws/wss`。

3) metadataBase 預設指向 8000 **(已調整)**  
   - `app/layout.tsx` fallback 改為 `http://localhost:3000`，若未設 `NEXT_PUBLIC_APP_URL` 仍指向前端站點。

4) 健康檢查/展示頁硬編碼 **(部分調整)**  
   - `components/SystemStatus.tsx` 改讀環境變數與 Gateway 基底組裝；env-check 仍保留現有行為（僅讀 env）。

5) Customer Hierarchy 直連基底路徑 **(已調整)**  
   - `app/api/platform/customers/route.ts` 改由 Gateway 基底 (`ORDERLY_BACKEND_URL|BACKEND_URL|NEXT_PUBLIC_API_BASE_URL`) + `/api/v2` 推導，亦可用 `NEXT_PUBLIC_CUSTOMER_HIERARCHY_API_URL` 覆寫。

6) Auth 端點重複 `/api/api` **(已調整)**  
   - `app/api/auth/login|refresh` 透過 `resolveBackendBase` 去除 `/api` 或 `/api/bff` 尾綴後再拼 `/api/auth/*`，避免出現 `/api/api/auth/login`。

> 上述項目為初步掃描，請確認實際部署需求後統一路徑與埠設定。

## 建議的落地做法
- 規則化來源：所有服務基底 URL 以 `.env.local` + `/documentation/ports`（未來文檔管理 API）為唯一真實來源。
- CI 檢查：加入腳本比對 `docs/0-Design/Documentation-Management-API.md` 埠表與代碼中的預設 URL，若硬編碼不符則 fail。
- WebSocket：改成環境變數與 Gateway 兼容的 `wss://` URL，避免本地 mock 留在正式。
- Acceptance 路徑：決定單一標準後，更新 Gateway 配置、BFF 預設與 `.env.example`。
