# 井然 Orderly Platform - 數位供應鏈平台

> **企業級餐飲供應鏈數位化解決方案**  
> **狀態**: 開發中 (25% 完成)  
> **目標**: 將對帳時間從 8 小時縮短到 30 分鐘  
> **架構**: 微服務 + 雲原生 + 自動化 CI/CD

---

## 🚨 當前專案狀態

### 📊 整體進度: 25% 完成

**技術基礎設施**: ✅ **超標完成 (85%)**

- 8個微服務架構完整部署
- 企業級監控和性能測試框架
- CI/CD 管道和 Docker 容器化

**核心業務功能**: ❌ **嚴重滯後 (20%)**

- 訂單管理、對帳引擎、ERP 整合等核心功能缺失
- 前端用戶介面尚未開發
- 資料庫連接使用 mock 數據

⚠️ **需要立即關注**: 技術優秀但商業價值交付不足

---

## 📚 重要文檔

### 🧑‍💻 開發協作（唯一指南）

- **[開發助手與代碼協作指南](CLAUDE.md)** — 以此為唯一開發助理/代理使用與協作指引

### 📋 最新狀態報告 (必讀)

- **[開發進度綜合報告](docs/DEVELOPMENT-PROGRESS-REPORT.md)** - 專案整體狀況分析
- **[關鍵差距分析](docs/CRITICAL-GAPS-ANALYSIS.md)** - 5個關鍵阻礙及解決方案
- **[緊急衝刺計劃](docs/NEXT-SPRINT-PLAN.md)** - 4週 MVP 交付計劃
- **[部署檢查清單](docs/DEPLOYMENT-CHECKLIST.md)** - 生產部署完整指南

### 📖 技術文檔

- **[計劃與任務追蹤](docs/Plan-and-Tasks.md)** - 詳細開發計劃和進度
- **[技術架構文檔](docs/Technical-Architecture-Summary.md)** - 系統架構設計
- **[API 規格文檔](docs/api-specification.yaml)** - RESTful API 定義
- **[資料庫架構](docs/Database-Schema-Core.md)** - 完整資料庫設計

### 🎨 產品設計

- **[產品需求文檔](docs/PRD-Complete.md)** - 完整產品規格
- **[設計系統](docs/design-system.md)** - UI/UX 設計規範
- **[用戶介面線框](docs/User-Interface-Wireframes.md)** - 頁面設計規劃

---

## 🏗️ 架構概覽

### 🖥️ 前端 (Next.js + TypeScript)

```
app/
├── (routes)/                 # App Router 路由
├── components/              # 可重用元件
├── lib/                     # 工具函式
└── styles/                  # 全域樣式

Port: 3000 | Health: /api/health
```

### ⚡ 後端微服務（FastAPI + SQLAlchemy）

```
backend/
├── api-gateway/                 # API 閘道 (Port 8000)
├── user-service-fastapi/            # 用戶管理（FastAPI + SQLAlchemy, Port 3001）
├── order-service-fastapi/           # 訂單管理（FastAPI + SQLAlchemy, Port 3002）
├── product-service-fastapi/         # 商品目錄（FastAPI + SQLAlchemy, Port 3003）
├── acceptance-service-fastapi/      # 驗收管理（FastAPI, Port 3004）
├── billing-service-fastapi/         # 帳務結算（FastAPI, Port 3005）
└── notification-service-fastapi/    # 通知服務（FastAPI, Port 3006）

所有服務健康檢查: /{service}/health
```

### 🗄️ 資料存儲

- **PostgreSQL**: 主要資料庫（SQLAlchemy ORM + Alembic 遷移）
- **Redis**: 快取和會話管理
- **Google Cloud Storage**: 檔案存儲

### 🔧 基礎設施

- **容器化**: Docker + Google Cloud Run
- **CI/CD**: GitHub Actions (8個工作流程)
- **監控**: Prometheus + APM + 分布式追蹤
- **IaC**: Terraform (Google Cloud Platform)

---

## 🚀 快速啟動

### 📋 系統需求

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### 🛠️ 開發環境設置

#### 1. 專案設置

```bash
# 複製專案
git clone <repository-url>
cd orderly

# 安裝依賴
npm install

# 設置環境變數
cp .env.example .env.local
```

#### 2. 資料庫設置（SQLAlchemy + Alembic）

```bash
# 啟動本地資料庫與 Redis（若尚未啟動）
docker-compose up -d postgres redis

# 執行資料庫遷移（各 FastAPI 服務）
cd backend/user-service-fastapi && alembic upgrade head && cd -
cd backend/order-service-fastapi && alembic upgrade head && cd -
cd backend/product-service-fastapi && alembic upgrade head && cd -
```

#### 3. 啟動開發服務

```bash
# 啟動所有服務
npm run dev

# 或分別啟動
npm run dev:frontend    # 前端 (Port 3000)
npm run dev:backend     # 所有後端服務
```

#### 4. 驗證安裝

```bash
# 檢查服務狀態
curl http://localhost:3000/api/health    # 前端
curl http://localhost:8000/health        # API Gateway
curl http://localhost:3001/health        # User Service
# ... 其他服務
```

---

## 🧪 測試和品質保證

### 單元測試

```bash
npm test                    # 執行所有測試
npm run test:watch          # 監視模式
npm run test:coverage       # 測試覆蓋率
```

### 整合測試

```bash
npm run test:integration    # API 整合測試
npm run test:e2e           # 端到端測試
```

### 性能測試

```bash
node scripts/performance-test.js      # 負載測試
node scripts/performance-analysis.js  # 性能分析
```

### 程式碼品質

```bash
npm run lint              # ESLint 檢查
npm run format            # Prettier 格式化
npm run type-check        # TypeScript 類型檢查
```

---

## 🚢 部署指南

### 🏠 本地完整環境

```bash
# Docker Compose 完整環境
docker-compose up -d

# 檢查所有服務狀態
docker-compose ps
docker-compose logs -f
```

### ☁️ 生產部署 (Google Cloud Run)

```bash
# 使用自動化部署腳本
chmod +x scripts/deploy-cloud-run.sh
./scripts/deploy-cloud-run.sh

# 或使用 Terraform
cd infrastructure/terraform
terraform init
terraform plan -var-file="production.tfvars"
terraform apply
```

詳細部署流程請參考 **[部署檢查清單](docs/DEPLOYMENT-CHECKLIST.md)**

---

## 🔍 監控和觀測

### 📊 關鍵指標

- **API 響應時間**: P95 < 5ms (已達成)
- **系統可用性**: 目標 99.9%
- **錯誤率**: < 0.1%
- **測試覆蓋率**: 85% (已達成)

### 🔭 監控端點

```bash
/health                    # 服務健康狀態
/metrics                   # Prometheus 指標
/apm/status               # APM 狀態
/metrics/business         # 業務指標
```

### 📈 效能監控

- **分布式追蹤**: OpenTelemetry 相容
- **日誌聚合**: 結構化 JSON 日誌
- **APM 整合**: DataDog + New Relic 支援
- **告警系統**: 基於閾值的自動告警

---

## 🏃‍♂️ 當前開發重點

### 🔥 緊急優先 (本週)

1. **執行資料庫遷移** - 連接真實資料庫
2. **移除 mock 數據依賴** - 實現真實 CRUD
3. **開發核心前端頁面** - 登入、訂單、對帳介面
4. **實現基本業務邏輯** - 訂單流程和簡化對帳

### ⚡ 高優先 (2-4週)

1. **完成對帳引擎** - 自動匹配和差異檢測
2. **ERP 系統整合** - 至少 1 個外部系統
3. **通知系統** - Email 和系統內通知
4. **用戶體驗優化** - 錯誤處理和回饋機制

### 📅 中期目標 (1-3個月)

1. **行動端優化** - PWA 功能實現
2. **進階分析** - BI 儀表板和報表
3. **多重整合** - 支付、發票、多ERP系統
4. **規模化準備** - 性能優化和自動擴展

---

## 👥 團隊協作

### 🔄 開發流程

- **分支策略**: GitFlow (main → staging → feature)
- **程式碼審查**: 所有 PR 需要審查
- **提交規範**: Conventional Commits
- **CI/CD**: 自動測試、建構、部署

### 📅 會議節奏

- **每日站會**: 9:30 AM (15分鐘)
- **週回顧**: 週五 4:00 PM (60分鐘)
- **Sprint 規劃**: 每兩週一次
- **架構討論**: 按需安排

### 📢 溝通渠道

- **技術討論**: GitHub Issues/Discussions
- **即時協作**: Slack/Teams
- **文檔更新**: 直接提交到 docs/
- **重大決策**: 架構會議 + RFC

---

## 🆘 故障排除

### 常見問題

#### 🔴 服務啟動失敗

```bash
# 檢查端口占用
lsof -i :3000
lsof -i :8000

# 檢查 Docker 狀態
docker-compose ps
docker-compose logs [service-name]

# 重啟服務
npm run dev:restart
```

#### 🔴 資料庫連接問題

```bash
# 檢查資料庫狀態
docker-compose exec postgres psql -U postgres -c "\\l"

# 重新執行資料庫遷移（FastAPI 服務）
cd backend/user-service-fastapi && alembic upgrade head && cd -
cd backend/order-service-fastapi && alembic upgrade head && cd -
cd backend/product-service-fastapi && alembic upgrade head && cd -
```

#### 🔴 建構/部署錯誤

```bash
# 檢查建構日誌
npm run build 2>&1 | tee build.log

# 驗證 Docker 映像
docker build -f Dockerfile.cloudrun -t test-build .
docker run --rm test-build
```

### 📞 支援資源

- **技術文檔**: docs/ 目錄
- **API 文檔**: docs/api-specification.yaml
- **錯誤追蹤**: GitHub Issues
- **性能分析**: scripts/performance-analysis.js

---

## 🔮 未來發展

### 🎯 短期目標 (3個月)

- ✅ 完成核心 MVP 功能
- ✅ 至少 3 個客戶 PoC 成功
- ✅ 對帳效率提升 >70%
- ✅ 系統穩定性 >99.5%

### 🚀 中期目標 (6個月)

- 🎯 支援 100+ 餐廳客戶
- 🎯 整合 5+ ERP 系統
- 🎯 AI 驅動的智能對帳
- 🎯 多地區部署

### 🌟 長期願景 (12個月)

- 🌟 餐飲供應鏈數位化領導者
- 🌟 平台生態系統建立
- 🌟 國際市場擴展
- 🌟 IPO 準備就緒

---

## 📄 授權與貢獻

### 📜 授權

本專案採用 MIT 授權條款，詳見 [LICENSE](LICENSE) 檔案。

### 🤝 貢獻指南

1. Fork 本專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'feat: add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

### 📈 專案統計

- **程式碼行數**: 50,000+ 行
- **測試覆蓋率**: 85%
- **文檔頁數**: 20+ 份技術文檔
- **微服務數量**: 8 個服務
- **CI/CD 流水線**: 8 個工作流程

---

## 📞 聯絡資訊

### 🏢 專案團隊

- **技術負責人**: 後端架構團隊
- **產品經理**: 產品策略團隊
- **DevOps 工程師**: 基礎設施團隊
- **UI/UX 設計師**: 用戶體驗團隊

### 📧 聯絡方式

- **技術支援**: GitHub Issues
- **產品反饋**: 產品團隊
- **商業合作**: 業務開發團隊
- **媒體詢問**: 公關團隊

---

_最後更新: 2025-09-19 | 版本: v1.0-alpha | 建構: #2025.09.19.1_

**🎯 記住我們的使命**: 將餐飲業的對帳時間從 8 小時縮短到 30 分鐘，讓每一筆交易都井然有序。
