# Billing Service - Simple

## 概述

這是井然 Orderly 平台的簡化版計費服務，專門為平台管理端前端頁面提供 API 支持。

## 特點

- ✅ 零依賴複雜初始化
- ✅ Mock 資料驅動，確保前端穩定運行
- ✅ 標準化 API 響應格式
- ✅ 完整的 CORS 支持
- ✅ 自動 API 文檔生成

## 支持的 API Endpoints

### 1. 儀表板指標
- **GET** `/api/v1/platform/billing/dashboard/metrics`
- 支持時間範圍: `7d`, `30d`, `90d`
- 返回: 月度佣金、活躍供應商、平均費率、成長率

### 2. 系統健康度
- **GET** `/api/v1/platform/billing/dashboard/health`
- 返回: 計費成功率、付款成功率、爭議率、系統正常運行時間

### 3. 系統告警
- **GET** `/api/v1/platform/billing/dashboard/alerts`
- 支持參數: `limit` (預設 10)
- 返回: 告警列表

### 4. 健康檢查
- **GET** `/health`
- 返回: 服務狀態

## 快速啟動

```bash
cd backend/billing-service-simple
pip install -r requirements.txt
python app.py
```

服務將在 http://localhost:3005 啟動

## API 文檔

啟動服務後訪問：
- Swagger UI: http://localhost:3005/docs
- ReDoc: http://localhost:3005/redoc

## 未來擴展

當前版本使用 Mock 資料，後續可以：
1. 接入真實資料庫
2. 實現實時數據聚合
3. 添加緩存機制
4. 實現告警系統