# 文檔管理 API 與端口登記設計（多角色一致性）

## 背景與目標
- 過往前後端目錄與檔案路徑不一致，導致代理與協作者難以定位文檔與服務端點。
- 需要一個**文檔管理 API**，集中提供「文件索引、權限控制、服務/端口對應」的單一入口，避免各端自行硬編碼。
- 服務對象涵蓋餐廳、供應商、平台管理與超管四大角色，需支援角色導向的可見性與審計。

## 核心原則
- **Single Source of Truth**：文件實體仍以 Git 儲存（`docs/` 等），API 只管理「中繼資料＋端口登記」並回傳可追蹤的存取位址。
- **Gateway First**：所有存取經 API Gateway，統一身份驗證（JWT/RBAC）與審計。
- **共享型別**：DTO 必須放在 `shared/types/`，後端服務引用同一型別契約，避免重複定義。
- **可觀測性**：每個 API 須內建 request id、審計欄位與健康檢查路由。

## 服務範圍與介面
- 新增微服務：`documentation-service-fastapi`（暫定本地埠 3009，Cloud Run 走 8080，自動適配 `PORT`）。
- Gateway 路由前綴：`/documentation/*`
- 覆蓋範圍：文件中繼資料（來源、類型、角色可見性、版本）、端口/基礎路由登記、搜尋與訂閱通知（後續）。

## 資料模型（中繼資料層）
`Document`：
- `id` (uuid)、`slug`、`title`、`doc_type`（prd/adr/runbook/design/api-index/guide）
- `path`（Git 相對路徑）、`repo_ref`（branch/commit）、`version`、`tags[]`
- `service_scope[]`（如 `order-service-fastapi`）、`role_scope[]`（對應 `shared/types` 的角色枚舉）
- `status`（published/draft/deprecated）、`owner_id`、`created_at`、`updated_at`

`PortRegistry`：
- `service`（對應微服務資料夾名）、`port_local`、`port_cloud_run`
- `gateway_base_path`（例如 `/order/*`）、`health_paths[]`（`/health`, `/db/health` 等）
- `notes`（是否需要租戶隔離/私有端點）

## API 規格（v1 提案）
| Method | Path | 說明 | 權限 |
| --- | --- | --- | --- |
| GET | `/documentation/docs` | 列表 + 篩選（`service`, `role`, `tag`, `type`, `status`） | 所有登入角色 |
| GET | `/documentation/docs/{id}` | 讀取單筆中繼資料與來源路徑 | 所有登入角色（須符合 `role_scope`） |
| POST | `/documentation/docs` | 建立/註冊文件中繼資料 | 平台/超管 |
| PUT | `/documentation/docs/{id}` | 更新標題、tags、role_scope、service_scope、狀態 | 平台/超管 |
| GET | `/documentation/search` | 關鍵字/標籤全文搜尋（內建分頁） | 所有登入角色 |
| GET | `/documentation/ports` | 端口/路由登記列表 | 所有登入角色 |
| PUT | `/documentation/ports/{service}` | 更新單一服務的端口/健康檢查設定 | 平台/超管 |
| GET | `/documentation/ports/{service}` | 查詢特定服務的端口與健康檢查 | 所有登入角色 |

> 後續版本可加：Webhook（文件狀態變更通知）、快取層（CDN/Edge 提供索引）、審計查詢（CRUD 活動）、版本比對（與 Git commit 對應）。

## 端口與路由登記（當前標準 + 新服務）
| 服務 | 本地埠 | Cloud Run 埠 | Gateway 基底路徑 | 健康檢查 |
| --- | --- | --- | --- | --- |
| api-gateway-fastapi | 8000 | 8080 | `/` | `/health`, `/db/health` |
| user-service-fastapi | 3001 | 8080 | `/user/*` | `/health`, `/db/health` |
| order-service-fastapi | 3002 | 8080 | `/order/*` | `/health`, `/db/health` |
| product-service-fastapi | 3003 | 8080 | `/product/*` | `/health`, `/db/health` |
| acceptance-service-fastapi | 3004 | 8080 | `/acceptance/*` | `/acceptance/health`, `/acceptance/db/health` |
| billing-service-fastapi | 3005 | 8080 | `/billing/*` | `/health`, `/db/health` |
| notification-service-fastapi | 3006 | 8080 | `/notification/*` | `/health`, `/db/health` |
| customer-hierarchy-service-fastapi | 3007 | 8080 | `/customer-hierarchy/*` | `/api/v2/health`, `/api/v2/health/ready` |
| supplier-service-fastapi | 3008 | 8080 | `/supplier/*` | `/health`, `/db/health` |
| **documentation-service-fastapi（新）** | **3009（建議）** | **8080** | **`/documentation/*`** | **`/health`, `/db/health`** |

> 若新增服務，必須同時更新此表與 `docs/INDEX.md`，並同步 API Gateway 的 `/service-map`。

## 權限與安全
- 統一透過 API Gateway 驗證 JWT；`role_scope` 參照 `shared/types` 中的角色枚舉。
- 讀取：符合 `role_scope` 即可；寫入/更新：限平台管理與超管。
- 變更需寫入審計表（`action`, `actor`, `document_id`, `service`, `before/after`, `at`）。
- 預設隱私：未設 `role_scope` 的文件視為內部專用（不對外部角色開放）。

## 作業流程最佳實務
1) 新增/更新文件：PR 內更新 Markdown + `docs/INDEX.md`；合併後由 CI 呼叫 `POST /documentation/docs` 同步中繼資料。  
2) 服務端口變更：修改 compose / Cloud Run 設定後，提交 PR 時同步更新 PortRegistry（`PUT /documentation/ports/{service}`），並在部署後透過健康檢查驗證。  
3) 角色可見性：PR 審查時檢查 `role_scope` 是否符合預期；對外文件需明確標註可見範圍。  
4) 版本對齊：中繼資料的 `repo_ref` 記錄 commit hash，便於回溯。  
5) 硬編碼禁止：前端/後端不得硬編碼文檔路徑或端口，統一透過 API 取得。

## 落地里程碑（建議）
1. 建立 `documentation-service-fastapi` skeleton（FastAPI + Postgres + Alembic），共用 `shared/types` DTO。  
2. 定義 `Document` 與 `PortRegistry` 資料表，實作 GET/PUT/POST 基本 API。  
3. 在 API Gateway 加上 `/documentation/*` 路由與 `/service-map` 更新。  
4. 增加 CI Job：文件 PR 合併後觸發中繼資料同步；Smoke Test 檢查 `/documentation/ports` 回傳是否含最新服務。  
5. 前端（App Router）補管理頁：列表、篩選、端口檢視與健康檢查狀態。

## 風險與待決議
- 授權界線：是否允許供應商查看平台內部 Runbook？建議預設封鎖，只允許公開類別（PRD/公版 API）。  
- 儲存位置：附件（非 Markdown）是否進物件儲存（GCS/S3）？需決定後在 `Document` 增加 `storage_url`。  
- 搜尋來源：全文索引若依賴 Git 工作樹，需確保與部署版本一致；可考慮同步到 Postgres tsvector 或外部搜尋服務。
