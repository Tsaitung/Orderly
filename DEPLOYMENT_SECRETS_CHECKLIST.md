# GitHub Secrets Configuration Checklist

## 核心部署必需Secrets ✅

部署工作流(.github/workflows/deploy.yml)所需的核心secrets：

### 必需配置
- [ ] `GCP_SA_KEY` - Google Cloud Service Account JSON密鑰
- [ ] `GCP_PROJECT_ID` - Google Cloud專案ID (備用: 'orderly-472413')
- [ ] `POSTGRES_PASSWORD` - PostgreSQL資料庫密碼
- [ ] `JWT_SECRET` - JWT令牌簽名密鑰
- [ ] `JWT_REFRESH_SECRET` - JWT刷新令牌密鑰

### 可選但推薦的Secrets
- [ ] `GOOGLE_CLOUD_PROJECT` - 備用GCP專案ID
- [ ] `STAGING_DATABASE_URL` - 測試環境資料庫連接
- [ ] `PRODUCTION_DATABASE_URL` - 生產環境資料庫連接

## 監控和告警Secrets (擴展功能)

這些secrets用於高級監控和告警，可稍後配置：

### ML品質門檻
- [ ] `ML_CONFIDENCE_THRESHOLD_HIGH` - ML高信心閾值 (>95%)
- [ ] `ML_CONFIDENCE_THRESHOLD_MEDIUM` - ML中信心閾值 (80-95%)
- [ ] `ML_CONFIDENCE_THRESHOLD_LOW` - ML低信心閾值 (60-80%)

### 成本監控
- [ ] `COST_THRESHOLD_DAILY` - 每日成本預警閾值
- [ ] `COST_THRESHOLD_MONTHLY` - 月度成本預警閾值

### APM整合
- [ ] `DATADOG_API_KEY` - DataDog監控API密鑰
- [ ] `NEWRELIC_LICENSE_KEY` - New Relic授權密鑰

### 告警通知
- [ ] `SLACK_WEBHOOK_URL` - Slack通知webhook
- [ ] `PAGERDUTY_INTEGRATION_KEY` - PagerDuty整合密鑰

## 驗證指令

檢查當前配置的secrets：
```bash
gh secret list
```

設定基本部署secrets範例：
```bash
# 設定核心secrets
gh secret set GCP_SA_KEY < path/to/service-account-key.json
gh secret set GCP_PROJECT_ID --body "orderly-472413"
gh secret set POSTGRES_PASSWORD --body "your-secure-password"
gh secret set JWT_SECRET --body "your-jwt-secret-key"
gh secret set JWT_REFRESH_SECRET --body "your-jwt-refresh-secret"
```

## 安全注意事項

1. **GCP_SA_KEY**: 確保Service Account只有必要的權限
2. **JWT密鑰**: 使用強隨機字符串，至少32字符
3. **資料庫密碼**: 使用複雜密碼，定期輪換
4. **定期審查**: 每季度檢查secrets使用情況和權限

---
**狀態**: 🔧 準備階段 - 需要配置核心secrets後才能開始部署
**最後更新**: $(date)