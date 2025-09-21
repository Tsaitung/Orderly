# Docker 部署指南 - FastAPI Migration

## 🚀 概述
本指南說明如何部署更新後的 Docker 容器，包含從 Node.js 到 FastAPI 的 Product Service 遷移。

## 📋 更新摘要

### 開發環境 (docker-compose.yml)
- ✅ **Product Service**: 已從 Node.js 遷移至 FastAPI
- ✅ **健康檢查**: 新增 FastAPI Product Service 健康檢查
- ✅ **服務通信**: 修復所有內部服務 URL 配置
- ✅ **依賴關係**: 優化服務啟動順序

### 生產環境 (docker-compose.production.yml)
- ✅ **Product Service**: 更新至 FastAPI 版本
- ✅ **端口映射**: 8003:3003 (外部:內部)
- ✅ **環境變量**: 生產環境優化配置

## 🔧 快速部署

### 開發環境
```bash
# 停止現有服務
docker compose down

# 重新構建並啟動
docker compose up --build -d

# 驗證服務健康狀態
docker compose ps
```

### 生產環境
```bash
# 停止現有服務
docker compose -f docker-compose.production.yml down

# 重新構建並啟動
docker compose -f docker-compose.production.yml up --build -d

# 驗證服務健康狀態
docker compose -f docker-compose.production.yml ps
```

## 📊 服務架構

### 核心服務端口配置
| 服務 | 開發環境 | 生產環境 | 協議 |
|------|----------|----------|------|
| Frontend | 3000 | - | HTTP |
| API Gateway | 8000 | 8000 | HTTP |
| Product Service | - | 8003 | HTTP |
| PostgreSQL | 5432 | 5432 | TCP |
| Redis | 6379 | 6379 | TCP |

### 內部通信端口
| 服務 | 內部端口 | 說明 |
|------|----------|------|
| User Service | 3001 | FastAPI |
| Order Service | 3002 | FastAPI |
| Product Service | 3003 | FastAPI |
| Acceptance Service | 3004 | FastAPI |
| Billing Service | 3005 | FastAPI |
| Notification Service | 3006 | FastAPI |

## 🔍 健康檢查端點

### FastAPI Product Service
```bash
# 開發環境
curl http://localhost:3003/health

# 通過 API Gateway
curl http://localhost:8000/api/products/health

# 生產環境
curl http://localhost:8003/health
```

### 預期響應
```json
{
  "status": "healthy",
  "service": "product-service",
  "version": "1.0.0",
  "timestamp": "2024-XX-XX"
}
```

## 🗄️ 資料庫遷移

### Alembic 遷移 (自動執行)
Product Service 容器啟動時會自動執行：
```bash
alembic upgrade head
```

### 手動執行遷移
```bash
# 進入容器
docker compose exec product-service bash

# 執行遷移
alembic upgrade head

# 檢查遷移狀態
alembic current
```

## 🔧 故障排除

### 常見問題

#### 1. Product Service 無法啟動
```bash
# 檢查日誌
docker compose logs product-service

# 可能原因：資料庫連接失敗
# 解決方案：確保 PostgreSQL 已正常啟動
docker compose ps postgres
```

#### 2. API Gateway 無法連接 Product Service
```bash
# 檢查網路連接
docker compose exec api-gateway ping product-service

# 檢查 Product Service 健康狀態
docker compose exec api-gateway curl http://product-service:3003/health
```

#### 3. 資料庫遷移失敗
```bash
# 重置資料庫（開發環境）
docker compose down -v
docker compose up postgres -d
# 等待 30 秒讓 PostgreSQL 完全啟動
docker compose up product-service
```

### 效能調優

#### 生產環境建議
```yaml
# docker-compose.production.yml
environment:
  - ENVIRONMENT=production
  - LOG_LEVEL=INFO
  - WORKERS=4  # 根據 CPU 核心數調整
  - MAX_CONNECTIONS=100
```

## 📈 監控指標

### 重要監控端點
1. **健康檢查**: `/health`
2. **指標收集**: `/metrics` (如果啟用)
3. **API 文檔**: `/docs` (開發環境)

### Docker 監控
```bash
# 查看資源使用
docker stats

# 查看特定服務日誌
docker compose logs -f product-service

# 查看服務狀態
docker compose ps
```

## 🚀 部署檢查清單

### 部署前
- [ ] 停止現有服務
- [ ] 備份資料庫（生產環境）
- [ ] 確認環境變量配置
- [ ] 驗證 Docker Compose 語法

### 部署中
- [ ] 構建新映像
- [ ] 啟動服務
- [ ] 等待健康檢查通過
- [ ] 驗證資料庫遷移

### 部署後
- [ ] 測試 API 端點
- [ ] 檢查日誌無錯誤
- [ ] 驗證前端連接
- [ ] 確認性能指標

## 🔄 回滾計劃

### 快速回滾
```bash
# 回滾到上一個版本
git checkout HEAD~1
docker compose down
docker compose up --build -d
```

### 資料庫回滾
```bash
# 回滾資料庫遷移
docker compose exec product-service alembic downgrade -1
```

## 📝 更新日誌

### v2.0.0 - FastAPI Migration
- 將 Product Service 從 Node.js 遷移至 FastAPI
- 優化 Docker 配置和健康檢查
- 改善服務間通信配置
- 新增效能監控和故障排除工具

---

**備註**: 此指南基於 2024 年 9 月的系統架構。如有疑問請參考 `CLAUDE.md` 或聯繫開發團隊。