# Orderly 合約與計費管理參數 PRD

> 目的：列出管理介面所有參數，並針對每項參數提供使用情境與設計邏輯，供產品/工程實作與前端表單設計參考。

---

## 目錄

1. 全域設定（Global Config）
2. 合約基本（Contract Template）
3. 費用行項（Fee Line）
4. 餐廳方案設定（Restaurant Plan）
5. 供應商設定（Supplier Settings）
6. Savings-share 與基線（Savings / Baseline）
7. 計算／公式管理（Formula Editor）
8. 對帳（Reconciliation-only）
9. 對象覆寫（Party / Overrides）
10. 例外與稽核（Exceptions / Audit）
11. 權限與審批（RBAC）
12. 通知與外部整合（Integration）
13. 模擬與報表（Simulation / Reports）
14. 監控指標（Monitoring）
15. 其他系統參數

---

# 1. 全域設定（Global Config）

每個系統層級的預設值與 guardrails，影響所有新建立合約與計算引擎。

- `default_transaction_fee_pct` (numeric, default=0.008)
  - 使用情境：建立新供應商合約時預設交易抽成。前端合約表單自動填入此值。
  - 設計邏輯：提供統一預設，便於快速上線與 AB 測試；變更需經 audit。

- `transaction_fee_min_pct` (numeric, default=0.000)
  - 使用情境：防止錯誤設定低於零的費率。
  - 設計邏輯：作為 validation guardrail。

- `transaction_fee_max_pct` (numeric, default=0.03)
  - 使用情境：阻止意外或惡意設高費率。前端需要顯示警告。
  - 設計邏輯：保護供應商利潤並維持市場可接受範圍。

- `default_subscription_plans` (json: Free/Pro/Enterprise)
  - 使用情境：系統內展示的三種餐廳方案的預設值。新餐廳註冊可自動掛上預設方案。
  - 設計邏輯：集中管理方案參數，方便快速修改與版本控制。

- `proration_policy` (enum: none / month_prorate / day_prorate)
  - 使用情境：合約中途生效或終止時計算應付訂閱費。
  - 設計邏輯：提供彈性計費策略以符合商業需求與合約公平性。

- `currency` (string, default=TWD)
  - 使用情境：發票/報表顯示與計算使用的幣別。
  - 設計邏輯：須一致化系統顯示與匯出格式，未來支援多幣別需增加欄位。

- `tax_vat_pct` (numeric)
  - 使用情境：自動將稅金計入發票與收款明細。
  - 設計邏輯：由財務設定並可因法規變動調整。

- `billing_run_schedule` (enum: daily/weekly/monthly)
  - 使用情境：排定自動計費與發票生成的頻率。
  - 設計邏輯：支援差異化業務需求（例如供應商採 T+7 結算）。

- `dry_run_enabled` (bool)
  - 使用情境：允許財務在執行真實 bill 前先模擬結果。
  - 設計邏輯：降低錯誤上線風險，必須能快速切換。

- `fee_caps_floor` (json: per_fee_type min/max)
  - 使用情境：為特定費用類型設上下限（例如 transaction_fee cap）。
  - 設計邏輯：保護雙方利益並避免數字異常。

- `audit_log_retention_days` (int)
  - 使用情境：定義系統保留變更/計費記錄的天數。
  - 設計邏輯：符合法務與稽核需求，並控管資料庫成長。

---

# 2. 合約基本（Contract Template）

合約元資料與生效管理，支援版本控制與範圍指定。

- `contract_code` (string)
  - 使用情境：系統內唯一識別合約，顯示於 UI 與對帳表中。
  - 設計邏輯：採可讀且不可變的代碼規則（例：CT-YYYYMMDD-XXX）。

- `name` (string)
  - 使用情境：合約標題，供業務與供應商辨識。
  - 設計邏輯：短描述，允許搜尋。

- `scope` (enum: global / supplier_group / supplier / restaurant / sku)
  - 使用情境：決定合約適用範圍。例如 global template 或指定單一 supplier。
  - 設計邏輯：明確覆寫優先順序。前端在選 scope 後顯示對應選擇器。

- `party_id` (uuid, nullable)
  - 使用情境：若 scope 為 supplier 或 restaurant，存放對象 ID。
  - 設計邏輯：nullable 允許 global template。

- `status` (enum: draft / pending_approval / active / paused / terminated)
  - 使用情境：控制合約是否進行計費與對帳。
  - 設計邏輯：狀態變更需記錄 audit 並支援多簽審核。

- `version` (int, auto)
  - 使用情境：合約修改會產生新版本，保留歷史以供稽核。
  - 設計邏輯：版本自增，且計費需繫結到合約版本。

- `effective_from` / `effective_to` (date)
  - 使用情境：定義合約生效窗。用於 prorate 與 billing window 判斷。
  - 設計邏輯：UI 提示重疊範圍與衝突檢查。

---

# 3. 費用行項（Fee Line）

合約中可自由新增多個費用項，模型必須可擴充與可複用。

- `fee_line_id` (uuid)
  - 使用情境：每筆費用行的唯一識別。

- `fee_type` (enum: transaction_fee / subscription / savings_share / promo / fast_payout / other)
  - 使用情境：決定此行的商業語義與計價方式。
  - 設計邏輯：前端依 type 顯示不同欄位。transaction_fee 為 per_order 計算。

- `label` (string)
  - 使用情境：供 UI 顯示的友善名稱（例：平台交易抽成 0.8%）。

- `pricing_model` (enum: percentage / fixed / tiered / formula)
  - 使用情境：決定如何計算金額。百分比常用於交易抽成與 savings_share。
  - 設計邏輯：公式模式允許複雜邏輯但需受限在安全的 expression sandbox。

- `value` (numeric or json for tiers/formula)
  - 使用情境：儲存百分比或固定金額或 tier 結構。
  - 設計邏輯：前端驗證與 schema 驗證；小數到 0.0001 以支援精算，但最終顯示四捨五入到 0.01。

- `who_pays` (enum: supplier / restaurant / platform / shared)
  - 使用情境：決定費用承擔方，影響 statement 發送對象與會計分錄。
  - 設計邏輯：支援 shared 時需定義分攤比例。

- `applies_to` (enum: all / categories / sku_list)
  - 使用情境：限定某些費用只作用於特定商品或分類。
  - 設計邏輯：提供 SKU 級別彈性，支持批量上傳應用規則。

- `billing_cycle` (enum: per_order / daily / monthly / one_time)
  - 使用情境：決定何時將該費用計入 billing_run。
  - 設計邏輯：per_order 對應實時計算；monthly 用於 subscription。

- `fee_cap` / `fee_floor` (numeric, optional)
  - 使用情境：為避免過高/過低扣款，設定上下限。
  - 設計邏輯：系統在計算時應自動 clamp 到 cap/floor。

---

# 4. 餐廳方案設定（Restaurant Plan）

控制餐廳端 SaaS 權益與收費邏輯。

- `plan_type` (enum: free / pro / enterprise)
  - 使用情境：決定餐廳是否免費或付費並顯示對應功能集。

- `included_users` (int, default=3 for free)
  - 使用情境：Free 計劃包含每門市的使用者數量上限；超過按 extra_user_fee 計費。
  - 設計邏輯：限制可在 UI 立即顯示超額成本，降低採用阻力。

- `extra_user_fee` (numeric, default=150)
  - 使用情境：每店超出 included_users 時按月收費單位。
  - 設計邏輯：簡單明確的 overage 模型，便於銷售溝通。

- `monthly_fee` (numeric, e.g., pro=3000)
  - 使用情境：HQ/Pro 月費，用於 HQ 型客戶集中帳務。

- `feature_flags` (list: auto_reorder, cost_report, multi_store, consolidated_po, fast_recon_export)
  - 使用情境：控制前端功能顯示與 API 權限。
  - 設計邏輯：功能以 flag 管理，方便組合與 AB 測試。

- `consolidated_billing` (bool)
  - 使用情境：HQ 是否採集中開票模式。
  - 設計邏輯：影響 statement generation 與 store-level allocation。

- `per_store_cost_allocation_method` (enum: equal / by_gmv / by_orders)
  - 使用情境：HQ 月費如何分配到各門市。
  - 設計邏輯：提供可由財務選擇的分攤算法。

---

# 5. 供應商設定（Supplier Settings）

供應商面向的預設與可選服務。

- `supplier_default_transaction_fee_pct` (numeric, default inherits global)
  - 使用情境：供應商合約顯示的實際交易抽成，可在 supplier 級別覆寫 global。
  - 設計邏輯：支援階段性優惠或例外情況。

- `supplier_saas_package_id` (ref)
  - 使用情境：將供應商綁定某 SaaS 套餐（例如庫存同步、EDI）。

- `supplier_exposure_package` (ref)
  - 使用情境：供應商購買的曝光/推廣服務設定。

- `fast_payout_enabled` (bool)
  - 使用情境：是否允許供應商使用次日或即時撥款服務。

- `fast_payout_fee_pct` (numeric)
  - 使用情境：若啟用，計算 fast payout 的手續費。

- `settlement_terms` (enum: T+0 / T+1 / T+7 / weekly / monthly)
  - 使用情境：供應商與平台之間的結算週期。
  - 設計邏輯：決定下一次 payout scheduling 與對帳窗口。

---

# 6. Savings-share 與基線（Savings / Baseline）

用於成效分成的量化與驗證配置。

- `baseline_method` (enum: historical_avg / custom_period / manual_value)
  - 使用情境：選擇如何建立 baseline 成本或損耗率作比較基準。
  - 設計邏輯：自動 historical_avg 常見於 pilot；custom_period 用於特定談判。

- `observation_window_months` (int)
  - 使用情境：baseline 與實際比較的時間窗口長度。

- `baseline_data_upload_enabled` (bool)
  - 使用情境：允許雙方上傳歷史數據 CSV 作為 baseline。

- `platform_share_pct` (numeric, default=0.30)
  - 使用情境：平台從淨節省中抽取的比例。
  - 設計邏輯：預設值可調整，實際落地需雙方契約同意。

- `restaurant_share_pct` / `supplier_share_pct` (numeric)
  - 使用情境：若合約指定多方分配，顯示與計算專用欄位。

- `min_saving_threshold_pct` (numeric, default=0.01)
  - 使用情境：節省低於門檻則不觸發分成，避免噪音。

- `savings_validation_required` (bool)
  - 使用情境：是否需要人工/文件驗證後才能發生付款。

- `savings_dispute_window_days` (int)
  - 使用情境：雙方可在該天數內提出爭議，暫凍分成付款。

---

# 7. 計算／公式管理（Formula Editor）

控制系統允許的可視化公式與測試。

- `allowed_variables` (list)
  - 使用情境：定義公式可使用的變數名稱（order_amount, gmv, sku_cost, baseline_cost 等）。
  - 設計邏輯：避免不安全運算與資料洩漏。

- `formula_templates` (list: transaction_fee_formula, savings_formula, subscription_proration)
  - 使用情境：提供常用公式樣板給非工程人員使用。

- `formula_test_case` (json input/output)
  - 使用情境：在後台測試公式準確性與回歸。

- `formula_versioning_enabled` (bool)
  - 使用情境：公式變更需版本控制以利追溯。

---

# 8. 對帳（Reconciliation-only）

系統僅作對帳，不產生發票。此節替代傳統「開票與對帳」章節，並包含新增對帳專用參數。

- `reconciliation_enabled` (bool)
  - 使用情境：是否啟用自動對帳流程。若關閉，系統僅產生原始 billing_items 供人工下載。
  - 設計邏輯：讓商業可選擇自動化或人工流程。

- `reconciliation_window_days` (int)
  - 使用情境：對帳視窗長度（例如 7 天 / 30 天），用於合併訂單與帳務匹配。
  - 設計邏輯：較短窗口提高即時性，較長窗口降低爭議率。

- `reconciliation_match_rules` (json)
  - 使用情境：對帳規則集（例如：match by order_id, by_po_no, by_date_range, by_amount_tolerance）。
  - 設計邏輯：提供可組合的 rule engine 以應付不同客戶 ERP 規格。

- `reconciliation_amount_tolerance` (numeric)
  - 使用情境：金額容差值（絕對或相對百分比），小於此差異自動標為已對帳。
  - 設計邏輯：降低人工作業量，同時允許合理微差。

- `reconciliation_auto_close_days` (int)
  - 使用情境：無爭議項目自動標記為已對帳的等待天數。
  - 設計邏輯：避免對帳項目長期懸而未決影響結算。

- `reconciliation_report_template` (ref)
  - 使用情境：匯出的對帳報表格式範本（CSV/XLSX），含欄位 mapping。
  - 設計邏輯：提供 ERP-friendly 欄位映射，使客戶可直接匯入。

- `reconciliation_export_formats` (list: csv, xlsx, json)
  - 使用情境：支援匯出格式。
  - 設計邏輯：涵蓋常見 ERP / BI 工具需求。

- `statement_generation` (bool)
  - 使用情境：是否產生對帳對照表（statement），非發票。Statement 可供雙方 download / attach 到 ERP。
  - 設計邏輯：statement 僅作參考與結算用途，非法定文件。

- `statement_delivery_methods` (list: download / email / webhook)
  - 使用情境：對帳表傳遞方式。注意：email 只作通知與附件傳送，不具法律稅務功能。
  - 設計邏輯：增加 webhook 支援以便自動化導入到客戶系統。

- `ledger_mapping` (json)
  - 使用情境：對帳明細到會計科目 (GL) 的對應規則。
  - 設計邏輯：導出時即帶上 GL code，方便客戶帳務自動入帳。

- `dispute_workflow` (json)
  - 使用情境：例：{open_days, required_fields_for_dispute, escalation_roles}。
  - 設計邏輯：明確化爭議處理 SLA 與責任人，縮短解決週期。

- `reconciliation_audit_report` (ref)
  - 使用情境：稽核使用的對帳異動報表。
  - 設計邏輯：包含每筆 matched/unmatched 的證據鏈（order_id, timestamps, matched_by）。

---

# 9. 對象覆寫（Party / Overrides）

管理合約覆寫規則與批次套用功能。

- `party_override_allowed` (bool)
  - 使用情境：是否允許為單一 supplier/restaurant 設定特例合約。

- `party_override_rules` (json: priority order, e.g., SKU > Supplier > Group > Global)
  - 使用情境：定義覆寫優先順序與衝突解法。

- `batch_apply_csv_enabled` (bool)
  - 使用情境：支援大量商家/商品批次套用規則以節省人力。

---

# 10. 例外與稽核（Exceptions / Audit）

例外處理與稽核相關參數。

- `exception_queue_threshold_amount` (numeric)
  - 使用情境：若單筆 billing item 超過此金額，自動進入例外隊列。

- `auto_flag_rules` (json)
  - 使用情境：判定何種情況需自動 flag（如 sudden_fee_change > 50%）。

- `required_approvals` (json: {change_type: [sales, finance]})
  - 使用情境：對重要變更指定必需的審批角色。

- `change_approval_window_days` (int)
  - 使用情境：指定審批流程的時限，超時自動提醒或回退。

- `enable_audit_trail` (bool)
  - 使用情境：是否保留詳細的 user/timestamp/diff。

---

# 11. 權限與審批（RBAC）

角色與權限控制。

- `roles` (list: ADMIN, FINANCE, SALES, SUPPLIER_USER, RESTAURANT_USER)
  - 使用情境：系統內最小角色集。

- `role_permissions_map` (json)
  - 使用情境：定義每個 role 的 CRUD 與操作權限。

- `mfa_required_for_sensitive_ops` (bool)
  - 使用情境：開啟後敏感操作（例如變更 global fee）需 MFA。

- `RECONCILE_CREATE`, `RECONCILE_APPROVE`, `DISPUTE_MANAGE` (granular perms)
  - 使用情境：對帳流程相關的細緻權限。

---

# 12. 通知與外部整合（Integration）

外部系統與通知機制。

- `notification_templates` (list)
  - 使用情境：email/SMS/webhook 的內容模板。

- `email_provider_config` (json)
  - 使用情境：SMTP/SendGrid 等服務設定。

- `erp_api_credentials` (secure)
  - 使用情境：提供 ERP 系統整合的 API 金鑰與 endpoint。

- `payment_gateway_config` (secure)
  - 使用情境：收款/撥款相關的第三方設定。注意：系統不會自動開發票，但仍可支援付款/撥款功能。

- `webhooks_enabled` (bool)
  - 使用情境：是否允許外部系統接收事件推送。

- `webhook_endpoints` (list)
  - 使用情境：列出允許的 webhook URL 與事件類型。

---

# 13. 模擬與報表（Simulation / Reports）

用於 dry-run 與 KPI 報表的預設與權限。

- `simulation_enabled` (bool)
  - 使用情境：是否允許使用 /api/billing/dry-run 模擬。

- `simulation_default_sample_order` (json)
  - 使用情境：提供前端模擬用的範例 payload。

- `simulation_api_key` (string)
  - 使用情境：限制模擬 API 的存取權限。

- `report_presets` (list: monthly_income, savings_summary, dispute_report)
  - 使用情境：常用報表預設，供財務與 BD 使用。

- `report_export_formats` (list: csv, pdf, xlsx)
  - 使用情境：匯出格式選項。

---

# 14. 監控指標（Monitoring）

KPI 與告警門檻設置。

- `kpi_definitions` (json)
  - 使用情境：系統內 KPI 名稱與計算邏輯（如 ARPU, GMV）。

- `kpi_alert_thresholds` (json)
  - 使用情境：超過門檻時發送告警。

- `kpi_notification_channels` (list)
  - 使用情境：告警發送到 Slack / Email / PagerDuty。

---

# 15. 其他系統參數

平台運維與精算行為的最後一層控制參數。

- `maintenance_window` (cron)
  - 使用情境：指定系統維護時間以安排批次 job。

- `data_retention_policy_days` (int)
  - 使用情境：決定 historical data 保留天數。

- `rounding_policy` (enum: round_2_decimals / round_up / round_bankers)
  - 使用情境：決定貨幣四捨五入策略。

- `currency_precision` (int)
  - 使用情境：貨幣小數精度。

---

# 附註

- 本文件聚焦於「管理介面參數」與「對帳導向」的設計邏輯。未包含細節前端 UI mock 或 JSON Schema。如需我將該內容輸出為 CSV 欄位清單、JSON Schema 或前端表單欄位定義（含 type/validation），我可以立刻產出。
