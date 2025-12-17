# 0. Design

本資料夾收斂所有「產品／技術／UX 設計」相關文件（Architecture、Data/API、Design System、Wireframes）。

> 原則：`docs/INDEX.md` 是全站單一入口；本檔提供 `docs/0-Design/` 的文件定位（哪一份是單一真實來源 SSOT、哪一份是摘要／實作指南），避免文件越積越亂。

## 快速入口（依角色）
- 產品/PM：`./User-Interface-Wireframes.md`、`./erp-integration-guide.md`
- 前端：`./design-system/INDEX.md`、`./API-Endpoints-Essential.md`、`./Frontend-Backend-Endpoint-Consistency.md`
- 後端：`./api-specification.yaml`、`./Database-Schema-Core.md`、`./technical-architecture-auth.md`
- Infra/DevOps：`./docker-containerization-summary.md`、`./database.md`

## 單一真實來源（SSOT）
- Design System：`./design-system/INDEX.md`
- UI Wireframes：`./User-Interface-Wireframes.md`
- Technical Architecture：`./Technical-Architecture-Summary.md`
- OpenAPI Spec：`./api-specification.yaml`
- Database Core Schema：`./Database-Schema-Core.md`

## 衍生/輔助文件（請以 SSOT 為準）
- API 精要與前端使用方式：`./API-Endpoints-Essential.md`（應與 OpenAPI 同步）
- Auth 深入規格：`./technical-architecture-auth.md`（若與 `shared/types`/實作不一致，以實作與 SSOT 為準）
- DB 維運/環境/遷移流程：`./database.md`、`./SQLALCHEMY-MIGRATION.md`
- 文件/端口登記提案：`./Documentation-Management-API.md`
- 前後端端點對齊掃描紀錄：`./Frontend-Backend-Endpoint-Consistency.md`
- 產品分類主檔：`./product_categories_final.md`
- ERP 整合落地指南：`./erp-integration-guide.md`
- Docker/Compose 容器化策略：`./docker-containerization-summary.md`

## 文件清單（用途與同步關係）
| 文件 | 定位 | 主要讀者 | 需要同步的內容 |
| --- | --- | --- | --- |
| `./design-system/INDEX.md` | SSOT（設計系統入口） | UI/UX、前端 | 元件/Token 變更需同步實作與對應頁面 |
| `./User-Interface-Wireframes.md` | SSOT（線框/流程） | 產品、UI/UX、前端 | 流程變更需同步 PRD 與頁面導覽/權限導向 |
| `./Technical-Architecture-Summary.md` | SSOT（整體架構） | 全體工程 | 重大架構調整需同步 `docs/INDEX.md` 與對應子設計（API/DB/Auth） |
| `./api-specification.yaml` | SSOT（API 合約） | 前後端、整合商 | 端點/Schema 變更需同步 BFF/Gateway、測試與 `API-Endpoints-Essential.md` |
| `./Database-Schema-Core.md` | SSOT（核心資料模型） | 後端 | Schema 變更需同步 Alembic 遷移、模型與 PRD 引用 |
| `./API-Endpoints-Essential.md` | 摘要（可讀性優先） | 前端、產品 | 以 `api-specification.yaml` 為準；避免雙邊歧異 |
| `./technical-architecture-auth.md` | 深入規格（Auth） | 後端 | 以 `shared/types`、User Service 實作與 Gateway 驗證行為為準 |
| `./database.md` | 指南（DB 維運/環境） | 後端、DevOps | 需與 `compose.*.yml`、`scripts/` DB 工具與 env 規範一致 |
| `./SQLALCHEMY-MIGRATION.md` | 歷史背景（遷移摘要） | 工程 | 僅供脈絡回顧；不作為現行操作手冊 |
| `./Documentation-Management-API.md` | 提案（文件/端口登記） | 平台、後端 | 若落地需同步 `shared/types`、Gateway 路由與 CI 檢查 |
| `./Frontend-Backend-Endpoint-Consistency.md` | 掃描紀錄（對齊檢查） | 全體工程 | 硬編碼修正後需同步 `.env.example` 與相關路由/設定 |
| `./product_categories_final.md` | 主檔（分類） | 產品、後端 | 分類異動需同步 Product Service、匯入/種子資料流程 |
| `./erp-integration-guide.md` | 指南（對外整合） | ERP 廠商、SI | 需與 `api-specification.yaml`、Webhook 事件與權限模型一致 |
| `./docker-containerization-summary.md` | 指南（Docker/Compose） | DevOps、後端 | 需與 `compose.*.yml`、部署腳本與服務端口表一致 |

## 維護規則（避免再次混亂）
- 新增或重命名文件：同步更新 `docs/INDEX.md` 與本檔。
- 契約/Schema 變更：同步更新 `./api-specification.yaml` / `./Database-Schema-Core.md`，並在 PRD 內引用它們。
- 一次性「完成回報/整理輸出」：請改寫成可長期維護的指南，或明確標註為歷史文件並移出主閱讀路徑。
