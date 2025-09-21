# Orderly 計費策略主文檔

> **目的**：定義 Orderly 平台的計費策略、費率結構與配置參數，作為定價的單一事實來源。  
> **版本**：v1.0  
> **基於**：`Orderly_Contracts_Config_PRD_Reconciliation.md`

---

## 1. 核心計費架構

### 1.1 系統設計原則
- **基於合約系統**：所有計費通過合約（Contract Template）管理
- **靈活配置**：支援多種定價模式和收費對象
- **參數驅動**：透過系統參數控制計費行為
- **雙邊市場**：供應商和餐廳分別管理

### 1.2 費用行項結構
每個合約包含多個費用行項（Fee Line），每行項支援：

```
Fee Line = {
  fee_type: transaction_fee | subscription | savings_share | promo | fast_payout | other
  pricing_model: percentage | fixed | tiered | formula
  who_pays: supplier | restaurant | platform | shared
  value: numeric | json
  billing_cycle: per_order | daily | monthly | one_time
}
```

---

## 2. 供應商計費策略

### 2.1 基本費率
- **主要收入來源**：交易佣金（transaction_fee）
- **預設費率**：0.8% (系統預設值 `default_transaction_fee_pct`)
- **實際範圍**：0.0% - 3.0% (受 `transaction_fee_min_pct` 和 `transaction_fee_max_pct` 限制)

### 2.2 定價模式
供應商費率支援四種定價模式：

#### A. 百分比模式 (percentage)
```json
{
  "pricing_model": "percentage",
  "value": 0.008,  // 0.8%
  "applies_to": "all"
}
```

#### B. 固定費用模式 (fixed)  
```json
{
  "pricing_model": "fixed",
  "value": 50,  // 每筆訂單固定 50 元
  "billing_cycle": "per_order"
}
```

#### C. 分層費率模式 (tiered)
```json
{
  "pricing_model": "tiered", 
  "value": {
    "tiers": [
      {"min_gmv": 0, "max_gmv": 50000, "rate": 0.03},
      {"min_gmv": 50001, "max_gmv": 200000, "rate": 0.025},
      {"min_gmv": 200001, "max_gmv": 500000, "rate": 0.02},
      {"min_gmv": 500001, "max_gmv": null, "rate": 0.015}
    ]
  }
}
```

#### D. 公式模式 (formula)
```json
{
  "pricing_model": "formula",
  "value": "base_rate * (1 - rating_discount) * gmv_multiplier"
}
```

### 2.3 增值服務
- **快速撥款** (fast_payout)：額外收取 0.5%-1% 手續費
- **曝光推廣** (exposure_package)：依套餐計價
- **庫存同步** (saas_package)：SaaS 服務費

---

## 3. 餐廳計費策略

### 3.1 訂閱制方案
餐廳端採用訂閱制，三種方案：

| 方案類型 | 月費 | 包含用戶數 | 超額費用 | 主要功能 |
|---------|------|----------|----------|----------|
| **Free** | NT$ 0 | 3人/門店 | NT$ 150/人 | 基本下單、對帳、驗收 |
| **Pro** | NT$ 3,000 | 無限制 | - | 進階分析、批量操作、API |
| **Enterprise** | 自定義 | 無限制 | - | 客製化功能、專屬客服 |

### 3.2 功能權限控制
通過 `feature_flags` 控制：
- `auto_reorder`: 自動重新訂購
- `cost_report`: 成本報表
- `multi_store`: 多門店管理
- `consolidated_po`: 集中採購
- `fast_recon_export`: 快速對帳匯出

---

## 4. 全域配置參數

### 4.1 預設值設定
- `default_transaction_fee_pct`: 0.008 (0.8%)
- `transaction_fee_min_pct`: 0.000 (0%)
- `transaction_fee_max_pct`: 0.03 (3%)
- `currency`: TWD
- `tax_vat_pct`: 依法規設定

### 4.2 計費週期
- `billing_run_schedule`: daily | weekly | monthly
- `settlement_terms`: T+0 | T+1 | T+7 | weekly | monthly

### 4.3 訂閱方案預設
```json
{
  "default_subscription_plans": {
    "free": {
      "monthly_fee": 0,
      "included_users": 3,
      "extra_user_fee": 150
    },
    "pro": {
      "monthly_fee": 3000,
      "included_users": 999,
      "extra_user_fee": 0
    },
    "enterprise": {
      "monthly_fee": "custom",
      "included_users": 999,
      "extra_user_fee": 0
    }
  }
}
```

---

## 5. 對帳策略

### 5.1 系統定位
Orderly 採用 **對帳為主，不開發票** 的策略：
- `reconciliation_enabled`: true
- `statement_generation`: true (產生對帳對照表)
- `invoice_generation`: false (不產生正式發票)

### 5.2 對帳配置
- `reconciliation_window_days`: 7-30 天
- `reconciliation_amount_tolerance`: 金額容差
- `reconciliation_auto_close_days`: 自動對帳天數
- `reconciliation_match_rules`: 配對規則

---

## 6. Savings-Share 分成機制

### 6.1 節省分成
- `platform_share_pct`: 30% (平台抽成)
- `min_saving_threshold_pct`: 1% (最低節省門檻)
- `savings_validation_required`: 是否需人工驗證

### 6.2 基線設定
- `baseline_method`: historical_avg | custom_period | manual_value
- `observation_window_months`: 觀察窗口長度

---

## 7. 權限與稽核

### 7.1 角色權限
- **ADMIN**: 全權限
- **FINANCE**: 財務相關操作
- **SALES**: 業務相關操作
- **SUPPLIER_USER**: 供應商用戶
- **RESTAURANT_USER**: 餐廳用戶

### 7.2 稽核控制
- `enable_audit_trail`: true
- `audit_log_retention_days`: 資料保留天數
- `required_approvals`: 審批流程設定

---

## 8. 系統整合

### 8.1 通知機制
- `notification_templates`: 通知模板
- `webhook_endpoints`: 外部整合端點
- `email_provider_config`: 郵件服務設定

### 8.2 模擬與測試
- `simulation_enabled`: true
- `dry_run_enabled`: true
- `simulation_api_key`: 模擬 API 金鑰

---

## 9. 費率上下限保護

### 9.1 全域限制
```json
{
  "fee_caps_floor": {
    "transaction_fee": {"min": 0.000, "max": 0.03},
    "subscription": {"min": 0, "max": 50000},
    "fast_payout": {"min": 0.005, "max": 0.02}
  }
}
```

### 9.2 異常處理
- `exception_queue_threshold_amount`: 異常金額門檻
- `auto_flag_rules`: 自動標記規則
- `change_approval_window_days`: 審批時限

---

## 10. 實作指引

### 10.1 前端表單設計
1. **合約創建**：根據 `scope` 顯示對應選擇器
2. **費率設定**：依 `pricing_model` 切換表單欄位
3. **權限控制**：根據用戶角色顯示功能
4. **驗證邏輯**：遵循 `fee_caps_floor` 限制

### 10.2 後端實作
1. **參數驅動**：所有計費邏輯基於配置參數
2. **版本控制**：合約修改產生新版本
3. **稽核記錄**：記錄所有重要變更
4. **安全沙箱**：公式計算需安全限制

---

## 附錄：參考文檔

- **技術參數詳細**：`Orderly_Contracts_Config_PRD_Reconciliation.md`
- **總體產品需求**：`PRD-Complete.md`（計費章節已移除，參照本文檔）
- **API 規格**：`api-specification.yaml`
- **資料庫結構**：`Database-Schema-Core.md`

---

**維護說明**：本文檔為計費定價的單一事實來源，任何費率或計費策略變更都應更新此文檔。