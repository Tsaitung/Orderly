# Performance Optimization Summary

_Last Updated: 2025-12-18_

本文件描述效能測試框架與基準門檻；具體測試數據隨 CI/CD 更新，請以最新執行結果為準。

## 效能測試工具

| 工具 | 路徑 | 用途 |
|------|------|------|
| performance-test.js | `scripts/performance-test.js` | 負載/壓力測試、延遲量測 |
| performance-analysis.js | `scripts/performance-analysis.js` | 即時系統分析、優化建議 |
| performance-benchmark.js | `scripts/performance-benchmark.js` | 基準效能比較 |

## 效能基準門檻

### 回應時間

| 類型 | 目標 |
|------|------|
| Health Check | <20ms |
| Business APIs | <100ms |
| Database Operations | <50ms |
| Cache Operations | <5ms |

### 吞吐量與可用性

| 指標 | 目標 |
|------|------|
| Peak Load | 1000 req/s |
| Normal Load | 100-500 req/s |
| Error Rate | <1% |
| Availability | >99.9% |

## 告警門檻

| 指標 | 觸發條件 |
|------|----------|
| Response Time | P95 >500ms |
| Error Rate | >1% |
| Memory Usage | >85% |

## 監控整合

- **Prometheus**: 指標收集與告警
- **APM**: 請求追蹤（DataDog/New Relic 依環境配置）
- **Business Metrics**: 訂單、用戶、供應鏈追蹤

## 執行方式

```bash
# 負載測試
node scripts/performance-test.js

# 效能分析
node scripts/performance-analysis.js

# 基準比較
node scripts/performance-benchmark.js
```
