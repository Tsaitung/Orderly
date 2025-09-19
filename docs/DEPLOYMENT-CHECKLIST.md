# 井然 Orderly Platform - 部署檢查清單

> **適用版本**: MVP v1.0  
> **更新日期**: 2025-09-19  
> **環境**: Development → Staging → Production  
> **負責人**: DevOps Team + 開發團隊

---

## 📋 部署前檢查清單

### 🔧 基礎設施準備

#### Google Cloud Platform 設置
- [ ] **GCP 專案建立**
  - [ ] 專案 ID 確認
  - [ ] 計費帳戶連結
  - [ ] 必要 API 啟用
    - [ ] Cloud Run API
    - [ ] Cloud SQL API  
    - [ ] Cloud Storage API
    - [ ] Secret Manager API

- [ ] **IAM 權限設置**
  - [ ] Service Account 建立
  - [ ] 必要權限授予
  - [ ] JSON 金鑰下載和安全存儲

#### 資料庫基礎設施
- [ ] **Cloud SQL 實例**
  - [ ] PostgreSQL 15 實例建立
  - [ ] VPC 網絡設置
  - [ ] 授權網絡配置
  - [ ] 備份策略設置

- [ ] **Redis 實例**
  - [ ] Memorystore for Redis 建立
  - [ ] 網絡連接配置
  - [ ] 記憶體大小設定

#### 密鑰管理
- [ ] **Secret Manager 配置**
  - [ ] 資料庫連接字串
  - [ ] JWT 密鑰
  - [ ] 第三方 API 金鑰
  - [ ] 服務間通信密鑰

---

### 💾 資料庫部署

#### Prisma 資料庫設置
- [ ] **Schema 部署**
  ```bash
  # 執行資料庫遷移
  npx prisma migrate deploy
  
  # 生成 Prisma Client
  npx prisma generate
  
  # 驗證連接
  npx prisma db seed
  ```

- [ ] **測試數據準備**
  - [ ] 管理員用戶建立
  - [ ] 測試公司資料
  - [ ] 範例產品資料
  - [ ] 基礎分類設定

#### 資料庫連接測試
- [ ] **連接驗證**
  - [ ] User Service 連接測試
  - [ ] Order Service 連接測試
  - [ ] Product Service 連接測試
  - [ ] Billing Service 連接測試

---

### 🐳 容器部署

#### Docker 映像建構
- [ ] **所有服務映像建構**
  ```bash
  # API Gateway
  docker build -f backend/api-gateway/Dockerfile.cloudrun -t orderly-api-gateway .
  
  # User Service
  docker build -f backend/user-service/Dockerfile.cloudrun -t orderly-user-service .
  
  # Order Service  
  docker build -f backend/order-service/Dockerfile.cloudrun -t orderly-order-service .
  
  # Product Service
  docker build -f backend/product-service/Dockerfile.cloudrun -t orderly-product-service .
  
  # Billing Service
  docker build -f backend/billing-service/Dockerfile.cloudrun -t orderly-billing-service .
  
  # Notification Service
  docker build -f backend/notification-service/Dockerfile.cloudrun -t orderly-notification-service .
  
  # Frontend
  docker build -f Dockerfile.cloudrun -t orderly-frontend .
  ```

- [ ] **映像推送到 GCR**
  ```bash
  # 推送所有映像
  gcloud auth configure-docker
  docker push gcr.io/PROJECT_ID/orderly-api-gateway
  docker push gcr.io/PROJECT_ID/orderly-user-service
  docker push gcr.io/PROJECT_ID/orderly-order-service
  docker push gcr.io/PROJECT_ID/orderly-product-service
  docker push gcr.io/PROJECT_ID/orderly-billing-service
  docker push gcr.io/PROJECT_ID/orderly-notification-service
  docker push gcr.io/PROJECT_ID/orderly-frontend
  ```

#### Cloud Run 服務部署
- [ ] **服務部署腳本執行**
  ```bash
  # 執行部署腳本
  chmod +x scripts/deploy-cloud-run.sh
  ./scripts/deploy-cloud-run.sh
  ```

- [ ] **服務健康檢查**
  - [ ] API Gateway: `/health` 端點響應
  - [ ] User Service: `/health` 端點響應
  - [ ] Order Service: `/health` 端點響應
  - [ ] Product Service: `/health` 端點響應
  - [ ] Billing Service: `/health` 端點響應
  - [ ] Notification Service: `/health` 端點響應

---

### 🔗 服務整合

#### 內部服務通信
- [ ] **API Gateway 路由配置**
  - [ ] `/api/auth/*` → User Service
  - [ ] `/api/orders/*` → Order Service
  - [ ] `/api/products/*` → Product Service
  - [ ] `/api/billing/*` → Billing Service
  - [ ] `/api/notifications/*` → Notification Service

- [ ] **服務間認證**
  - [ ] JWT Token 驗證
  - [ ] 服務間 API Key 設置
  - [ ] 請求簽名驗證

#### 外部服務整合
- [ ] **Email 服務**
  - [ ] SendGrid API 配置
  - [ ] 發信測試
  - [ ] 範本設置

- [ ] **支付服務**
  - [ ] ECPay/TapPay API 配置
  - [ ] 測試交易
  - [ ] Webhook 設置

- [ ] **檔案存儲**
  - [ ] Google Cloud Storage 設置
  - [ ] 上傳權限配置
  - [ ] CDN 設置

---

### 🖥️ 前端部署

#### 靜態資源準備
- [ ] **建構優化**
  ```bash
  # 前端建構
  npm run build
  
  # 建構驗證
  npm run preview
  ```

- [ ] **環境配置**
  - [ ] API 端點配置
  - [ ] 認證配置
  - [ ] 第三方服務配置

#### CDN 和快取設置
- [ ] **Cloud CDN 配置**
  - [ ] 靜態資源快取
  - [ ] 壓縮設置
  - [ ] 瀏覽器快取策略

---

### 📊 監控和日誌

#### 日誌設置
- [ ] **結構化日誌**
  - [ ] JSON 格式輸出
  - [ ] 關聯 ID 追蹤
  - [ ] 錯誤等級分類

- [ ] **日誌聚合**
  - [ ] Cloud Logging 整合
  - [ ] 日誌查詢設置
  - [ ] 日誌保留政策

#### 監控設置
- [ ] **Health Check 配置**
  - [ ] 所有服務健康檢查
  - [ ] 自動重啟設置
  - [ ] 負載均衡配置

- [ ] **APM 監控**
  - [ ] Prometheus 指標收集
  - [ ] 分布式追蹤設置
  - [ ] 業務指標監控

#### 告警設置
- [ ] **關鍵指標告警**
  - [ ] 服務可用性 <99%
  - [ ] 回應時間 >500ms
  - [ ] 錯誤率 >1%
  - [ ] 記憶體使用 >80%

---

### 🔒 安全檢查

#### 網絡安全
- [ ] **HTTPS 設置**
  - [ ] SSL 憑證配置
  - [ ] 強制 HTTPS 重導向
  - [ ] HSTS 設置

- [ ] **CORS 配置**
  - [ ] 允許的來源設置
  - [ ] 允許的方法設置
  - [ ] 預檢請求處理

#### 應用安全
- [ ] **認證和授權**
  - [ ] JWT Token 安全設置
  - [ ] 角色權限驗證
  - [ ] API 金鑰管理

- [ ] **輸入驗證**
  - [ ] API 請求驗證
  - [ ] SQL 注入防護
  - [ ] XSS 攻擊防護

#### 密鑰管理
- [ ] **敏感資料保護**
  - [ ] 環境變數設置
  - [ ] Secret Manager 使用
  - [ ] 密鑰輪替策略

---

### ⚡ 性能優化

#### 應用性能
- [ ] **快取策略**
  - [ ] Redis 快取配置
  - [ ] API 回應快取
  - [ ] 資料庫查詢優化

- [ ] **連接池設置**
  - [ ] 資料庫連接池
  - [ ] Redis 連接池
  - [ ] HTTP 連接復用

#### 基礎設施性能
- [ ] **資源配置**
  - [ ] CPU 和記憶體限制
  - [ ] 自動擴縮設置
  - [ ] 負載平衡策略

---

### 🧪 部署測試

#### 功能測試
- [ ] **端到端測試**
  - [ ] 用戶註冊/登入流程
  - [ ] 訂單創建/管理流程
  - [ ] 對帳處理流程
  - [ ] 通知發送測試

- [ ] **整合測試**
  - [ ] 服務間通信測試
  - [ ] 外部 API 整合測試
  - [ ] 資料庫操作測試

#### 性能測試
- [ ] **負載測試**
  ```bash
  # 執行性能測試
  node scripts/performance-test.js
  
  # 分析性能結果
  node scripts/performance-analysis.js
  ```

- [ ] **壓力測試**
  - [ ] 高併發用戶測試
  - [ ] 大量數據處理測試
  - [ ] 長時間運行測試

#### 安全測試
- [ ] **漏洞掃描**
  - [ ] OWASP ZAP 掃描
  - [ ] 依賴漏洞檢查
  - [ ] 容器安全掃描

---

### 🔄 CI/CD 流程

#### GitHub Actions 設置
- [ ] **工作流程驗證**
  - [ ] 建構工作流程正常
  - [ ] 測試工作流程通過
  - [ ] 部署工作流程成功

- [ ] **密鑰設置**
  - [ ] `GCP_SA_KEY` 設置
  - [ ] `GCP_PROJECT_ID` 設置
  - [ ] 其他必要密鑰設置

#### 自動部署
- [ ] **分支策略**
  - [ ] `develop` → Staging 自動部署
  - [ ] `main` → Production 手動部署
  - [ ] 功能分支不自動部署

---

### 📝 文檔和培訓

#### 操作文檔
- [ ] **部署手冊**
  - [ ] 詳細部署步驟
  - [ ] 故障排除指南
  - [ ] 回滾程序

- [ ] **監控手冊**
  - [ ] 監控指標說明
  - [ ] 告警處理程序
  - [ ] 性能調優指南

#### 用戶文檔
- [ ] **用戶手冊**
  - [ ] 功能使用說明
  - [ ] 常見問題解答
  - [ ] 故障排除指南

- [ ] **API 文檔**
  - [ ] 端點說明
  - [ ] 請求/回應範例
  - [ ] 錯誤代碼說明

---

## 🚨 部署後驗證

### 立即驗證 (部署後 30 分鐘內)

#### 基本功能驗證
- [ ] **服務狀態檢查**
  ```bash
  # 檢查所有服務狀態
  curl https://api.orderly.example.com/health
  curl https://auth.orderly.example.com/health
  curl https://orders.orderly.example.com/health
  ```

- [ ] **關鍵流程測試**
  - [ ] 用戶可以成功註冊
  - [ ] 用戶可以成功登入
  - [ ] 創建測試訂單成功
  - [ ] 對帳流程可以執行

#### 監控指標檢查
- [ ] **系統指標正常**
  - [ ] CPU 使用率 <70%
  - [ ] 記憶體使用率 <80%
  - [ ] 回應時間 <200ms
  - [ ] 錯誤率 <1%

### 短期驗證 (部署後 24 小時內)

#### 穩定性測試
- [ ] **持續運行測試**
  - [ ] 24小時無服務中斷
  - [ ] 無記憶體洩漏
  - [ ] 無資料丟失
  - [ ] 日誌無異常錯誤

#### 業務指標驗證
- [ ] **核心功能指標**
  - [ ] 訂單創建成功率 >95%
  - [ ] 對帳處理成功率 >90%
  - [ ] 通知發送成功率 >95%
  - [ ] 用戶登入成功率 >98%

### 長期驗證 (部署後 1 週內)

#### 性能趨勢分析
- [ ] **性能指標趨勢**
  - [ ] 回應時間無劣化
  - [ ] 錯誤率維持低水平
  - [ ] 資源使用穩定
  - [ ] 用戶滿意度良好

---

## 🔧 故障排除

### 常見問題及解決方案

#### 服務啟動失敗
```bash
# 檢查服務日誌
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# 檢查環境變數
gcloud run services describe SERVICE_NAME --region=asia-east1

# 重新部署服務
gcloud run deploy SERVICE_NAME --image=gcr.io/PROJECT_ID/IMAGE_NAME
```

#### 資料庫連接問題
```bash
# 檢查 Cloud SQL 狀態
gcloud sql instances describe INSTANCE_NAME

# 測試連接
gcloud sql connect INSTANCE_NAME --user=postgres

# 檢查網絡設置
gcloud compute networks subnets list
```

#### 性能問題
```bash
# 檢查資源使用
gcloud monitoring metrics list --filter="metric.type:cloud_run"

# 分析慢查詢
# 查看 Cloud SQL 慢查詢日誌

# 檢查快取命中率
# 查看 Redis 監控指標
```

### 緊急回滾程序

#### 快速回滾
```bash
# 回滾到前一版本
gcloud run services update-traffic SERVICE_NAME --to-revisions=PREVIOUS_REVISION=100

# 批量回滾所有服務
./scripts/rollback-services.sh
```

#### 資料庫回滾
```bash
# 使用資料庫備份恢復
gcloud sql backups restore BACKUP_ID --restore-instance=INSTANCE_NAME

# 檢查資料完整性
npx prisma db seed --preview-feature
```

---

## 📊 部署成功標準

### 技術成功標準
- [ ] 所有服務 Health Check 正常
- [ ] API 回應時間 <200ms (P95)
- [ ] 系統可用性 >99.9%
- [ ] 錯誤率 <0.1%
- [ ] 零資料遺失

### 業務成功標準
- [ ] 端到端業務流程可完整執行
- [ ] 用戶可以完成所有核心操作
- [ ] 對帳功能正常運作
- [ ] 通知系統正常發送
- [ ] 基本報表可以產生

### 用戶體驗標準
- [ ] 前端頁面載入時間 <3秒
- [ ] 操作回應及時且流暢
- [ ] 錯誤訊息清晰易懂
- [ ] 行動端基本可用

---

*此檢查清單將隨專案進展持續更新，確保部署流程的完整性和可靠性。*

**檢查清單負責人**: DevOps Team  
**技術審核**: 技術負責人  
**業務驗收**: 產品經理  
**最後更新**: 2025-09-19