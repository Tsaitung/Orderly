# 部署環境管理

井然 Orderly 平台的多環境部署架構與管理指南。

## 🌍 環境架構概覽

### 環境層級

| 環境名稱 | 分支 | Cloud SQL實例 | 用途 | 流量來源 |
|---------|------|---------------|------|----------|
| **Development** | feature/* | 本地PostgreSQL | 本地開發與單元測試 | 開發者本機 |
| **Staging** | staging/develop | orderly-db-v2 | 集成測試與預發布驗證 | 內部測試團隊 |
| **Production** | main | orderly-db | 正式生產環境 | 真實用戶流量 |
| **Manual** | 任意 | 用戶指定 | 臨時測試與實驗 | 手動觸發部署 |

### 服務部署命名規則

```
orderly-{service-name}-{environment}${SERVICE_SUFFIX}
```

**範例**：
- 生產環境：`orderly-api-gateway-fastapi-production`
- 測試環境：`orderly-user-service-fastapi-staging`
- v2測試：`orderly-order-service-fastapi-staging-v2`

## 🔧 Development 環境

### 本地開發配置

**基礎設施**：
- PostgreSQL 15 (Docker Compose)
- Redis 7 (Docker Compose) 
- 所有微服務本地運行

**啟動命令**：
```bash
# 啟動基礎設施
docker-compose up -d postgres redis

# 啟動所有後端服務
npm run dev:backend

# 啟動前端
npm run dev:frontend
```

**環境變數**：
```bash
# .env.local 配置
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=orderly_dev
DATABASE_USER=orderly
POSTGRES_PASSWORD=dev_password
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev_jwt_secret_32_chars_long
```

**特點**：
- 熱重載開發體驗
- 本地資料庫可重置
- 無需Cloud Run部署
- 支援斷點調試

## 🧪 Staging 環境

### 預發布測試環境

**基礎設施**：
- Cloud SQL實例：`orderly-db-v2`
- Cloud Run服務（asia-east1）
- GitHub Actions自動部署

**觸發方式**：
```bash
# 自動觸發（推送到staging分支）
git push origin staging

# 手動觸發（使用新版inputs）
gh workflow run "Deploy to Cloud Run" --ref staging \
  -f environment=staging \
  -f db_instance_name=orderly-db-v2 \
  -f service_suffix=-v2
```

**服務配置**：
- **前端**：`orderly-frontend-staging`
- **API Gateway**：`orderly-api-gateway-fastapi-staging-v2`
- **後端服務**：全部8個微服務，後綴`-v2`
- **域名**：`*.run.app` (Cloud Run自動分配)

**測試數據**：
- 使用 `scripts/database/seed_from_real_data.py` 創建測試數據
- 標準化測試客戶：20個客戶（15個企業+5個自然人）
- 完整產品目錄：9供應商+105品類+52SKU

**驗證流程**：
1. 自動部署完成後執行煙霧測試
2. 使用 `scripts/db/diag.sh` 檢查服務健康狀況
3. API Gateway `/ready` 端點驗證下游服務
4. 前端 `/api/env-check` 驗證環境配置

## 🚀 Production 環境

### 正式生產環境

**基礎設施**：
- Cloud SQL實例：`orderly-db`（高可用配置）
- Cloud Run服務（多區域）
- CDN + Load Balancer
- 監控與告警（DataDog + New Relic）

**觸發方式**：
```bash
# 自動觸發（推送到main分支）
git push origin main

# 手動觸發（緊急修復）
gh workflow run "Deploy to Cloud Run" --ref main \
  -f environment=production \
  -f force_backend_redeploy=true
```

**安全配置**：
- 最小權限Service Account
- Secret Manager管理敏感信息
- 网络安全策略（VPC + IAM）
- 定期安全掃描

**部署策略**：
- **高信心度（>95%）**：Fast Track Blue-Green（<30s回滾）
- **中等信心度（80-95%）**：標準Blue-Green（5分鐘等待）
- **低信心度（<80%）**：Progressive Canary（5%→100%流量）

**監控指標**：
- **SLO**：>99.9%可用性，<500ms P95延遲
- **業務指標**：GMV增長、訂單轉換率、履約率
- **技術指標**：錯誤率<0.1%、資料庫連接池利用率

## 🎛️ Manual 環境

### 臨時測試與實驗

**用途**：
- 功能分支測試
- 熱修復驗證
- 性能測試
- 客戶演示環境

**觸發方式**：
```bash
# 創建臨時測試環境
gh workflow run "Deploy to Cloud Run" \
  -f environment=staging \
  -f db_instance_name=orderly-db-test \
  -f service_suffix=-feature-xyz \
  -f services="user-service-fastapi,order-service-fastapi" \
  -f ref_name=feature/new-payment-system
```

**管理原則**：
- 使用唯一的service_suffix避免衝突
- 定期清理不再使用的臨時環境
- 控制成本：僅部署必要服務
- 設定自動過期時間

## 🔄 環境切換與遷移

### Staging to Production 升級

**升級流程**：
1. Staging環境完成所有測試
2. 數據庫遷移腳本驗證
3. 藍綠部署到Production
4. 逐步流量切換
5. 監控關鍵指標
6. 保持回滾能力24小時

**數據遷移**：
```bash
# 從staging導出schema變更
alembic --config backend/user-service-fastapi/alembic.ini revision --autogenerate -m "production_migration"

# 在production執行遷移
ENVIRONMENT=production alembic --config backend/user-service-fastapi/alembic.ini upgrade head
```

### 環境間數據同步

**業務數據遷移**：
```bash
# 導出生產環境業務數據
python scripts/database/database_manager.py export --environment production

# 導入到staging環境
python scripts/database/database_manager.py import \
  --target "postgresql+asyncpg://orderly:$PASSWORD@/cloudsql/orderly-472413:asia-east1:orderly-db-v2/orderly"
```

**測試數據重置**：
```bash
# 清理staging測試數據
python scripts/database/database_manager.py clean --test-data

# 重新創建標準測試數據
python scripts/database/seed_from_real_data.py
```

## 📊 環境監控與維護

### 自動化監控

**健康檢查頻率**：
- Production：30秒間隔
- Staging：2分鐘間隔
- Development：本地Prometheus

**告警規則**：
```yaml
# 服務可用性告警
- alert: ServiceDown
  expr: up{job="orderly-services"} == 0
  for: 1m
  labels:
    severity: critical
    environment: "{{ $labels.environment }}"

# 資料庫連接告警  
- alert: DatabaseConnectionFailed
  expr: db_health_status != 1
  for: 30s
  labels:
    severity: warning
```

### 定期維護任務

**每日任務**：
- [ ] 檢查所有環境服務健康狀況
- [ ] 審查錯誤日誌和異常指標
- [ ] 驗證備份完整性

**每週任務**：
- [ ] 更新staging環境測試數據
- [ ] 清理臨時部署環境
- [ ] 檢查資源使用情況和成本

**每月任務**：
- [ ] 輪換生產環境密鑰
- [ ] 執行災難恢復演練
- [ ] 檢查安全合規性報告

## 🔐 安全與合規

### 環境隔離

**網路隔離**：
- Production使用專用VPC
- Staging與Development共享測試VPC
- 嚴格的防火牆規則

**資料隔離**：
- 生產資料絕不同步到非生產環境
- 使用脫敏數據進行測試
- GDPR/CCPA合規的數據處理

**訪問控制**：
```bash
# Production環境訪問（僅限SRE團隊）
gcloud projects add-iam-policy-binding orderly-472413 \
  --member="group:sre@orderly.com" \
  --role="roles/run.viewer" \
  --condition='expression=request.resource.name.startsWith("projects/orderly-472413/locations/asia-east1/services/orderly-") && request.resource.name.endsWith("-production")'
```

## 🎯 最佳實踐

### 部署原則

1. **統一性**：所有環境使用相同的Docker鏡像和配置模板
2. **可重現性**：通過基礎設施即代碼確保環境一致性
3. **可觀測性**：每個環境都有完整的監控和日誌
4. **安全性**：最小權限原則，定期安全審計

### 故障處理

1. **自動恢復**：>90%異常自動修復
2. **快速回滾**：<5分鐘回滾到上一個穩定版本
3. **事故響應**：24/7監控，15分鐘內響應critical告警
4. **事後分析**：每次事故都進行根因分析和改進

### 成本優化

1. **按需擴縮**：Development和Staging環境自動縮容
2. **資源監控**：定期檢查和優化資源配置
3. **預留實例**：Production環境使用預留實例降低成本
4. **清理策略**：定期清理不使用的資源和數據

---

## 📚 相關文檔

- [CI/CD Secrets 配置](ci-secrets.md) - 環境變數和密鑰管理
- [部署檢查清單](DEPLOYMENT-CHECKLIST.md) - 部署驗證流程
- [故障排除指南](DEPLOYMENT-TROUBLESHOOTING.md) - 常見問題解決
- [資料庫管理](database.md) - 數據遷移和備份策略

---

**最後更新**: 2025-09-24  
**狀態**: ✅ 完整的多環境管理架構