# Orderly Business Invariants（業務不變式）

> Canonical home for business invariants（不變式：系統永遠該成立的數學/邏輯關係）。
> 由 `orderly-doc-governance` skill 治理。CLAUDE.md 要求「數字轉換 / mirror / migration / 報表修正時至少驗一個 invariant」——本檔即該驗證的 **oracle（事先確認的正確答案）** 來源。

## 使用規則
- 每條 invariant 必附 **來源**（PRD/US/spec 檔:行號，或 code 路徑）。無來源不得列為 `confirmed`。
- `confirmed` = 有明確文件/程式來源支持；`inferred` = 業務上合理但來源未明說具體條件，**需人工確認後才可升 confirmed，禁止當成已驗證事實**。
- 新增/變更 invariant 走 `orderly-doc-governance`（屬 canonical-business-truth）。
- ID 格式：`INV-<module>-###`，module ∈ auth / product / order / acceptance / billing / customer-hierarchy。

## Confirmed Invariants（有來源）

| ID | 不變式（白話） | Formal 條件 | 模組 | 驗證方式 | 來源 | 狀態 |
|----|----------------|-------------|------|----------|------|------|
| INV-order-001 | 訂單狀態只能沿固定 8 節點順序前進，不可跳轉/逆轉 | state ∈ {草稿→待確認→已確認→配送中→已送達→驗收中→已完成→已結算}，transition 僅允許相鄰前進（取消為明確例外路徑） | order | 狀態機 unit test：列舉合法/非法轉移；DB 觸發或 service 層 guard | `docs/1-User-Story/by-module/03-order-management.md:40` | confirmed |
| INV-product-001 | 每個 SKU 前台展示有且僅有一張主圖片 | count(images where is_primary AND sku_id=X) == 1 | product | DB unique partial index 或 service assertion；API 回傳檢查 | `docs/1-User-Story/by-module/02-product-sku-management.md:205` | confirmed |
| INV-billing-001 | 平台抽成依設定比例計算 | platform_fee == GMV × `platform_share_pct`（預設 30%） | billing | 結算計算 unit test 對拍；對帳匯出檢查 | `docs/2-PRD/PRD-Billing-Master.md:187` | confirmed |
| INV-billing-002 | Orderly 採「對帳為主、不開發票」；產對帳對照表（statement）而非 invoice | billing 流程輸出 statement；`statement_generation == true` | billing | 設定/流程檢查；不得出現 invoice 開立路徑 | `docs/2-PRD/PRD-Billing-Master.md:168,171` | confirmed（policy constraint） |
| INV-auth-001 | 所有資料查詢強制帶 tenant_id；缺則拒絕或回 401/403 | ∀ query：tenant_id IS NOT NULL（租戶隔離） | auth / 全模組 | repository 層強制注入 tenant_id；整合測試驗跨租戶不可讀 | `CLAUDE.md` §Auth/User 整合風險與緩解（租戶隔離）+ §使用者資料模型 | confirmed |
| INV-auth-002 | refresh token 綁 `token_version`；異常時 bump 版本，舊 token 立即失效 | token.token_version == user.token_version；bump 後舊 token 驗證失敗 | auth | 登入/refresh 整合測試：bump 後舊 token 應 401 | `CLAUDE.md` §Auth/User（Refresh 吊銷）| confirmed |
| INV-acceptance-001 | 驗收差異/異常必須留紀錄（5 類異常標記 + 差異協商軌跡） | 任一驗收異常 → 對應 acceptance_discrepancy 紀錄存在 | acceptance | 驗收流程整合測試；異常標記寫入檢查 | `docs/1-User-Story/by-module/04-acceptance-receiving.md:42,82` | confirmed |

## 候選 Invariants（inferred — 需人工確認來源/公式後才可升 confirmed）

> ⚠ 以下為業務上**應該**成立、但目前 PRD/US **未明確寫出公式或邊界**的候選。升 confirmed 前需從 PRD/spec/code 補確切來源；**在補來源前不得當成已驗證的 oracle**。

| 候選 ID | 不變式（待確認） | 待釐清點 | 建議來源 |
|---------|------------------|----------|----------|
| INV-order-002? | 訂單總額 == Σ(品項數量 × 單價)（+稅/折扣規則） | 是否含稅、折扣、運費的精確公式未見於 US | order PRD / `backend/app/modules/orders` model |
| INV-billing-003? | 結算金額 == Σ(已驗收明細金額) − 抽成/調整 | 結算與驗收的精確勾稽公式未見明文 | PRD-Billing-Master 結算章節 / billing service |
| INV-billing-004? | 對帳對照表借貸/應收應付平衡 | 「平衡」的具體欄位與容差未明文 | PRD-Billing-Master §對帳策略 |
| INV-acceptance-002? | 驗收數量 ≤ 訂單數量 | US 04 有「數量不符」異常，但**超收似為允許之異常情境**，故「≤」未必硬成立 → 須釐清是 hard 上界或 soft 告警 | acceptance PRD / business rule |
| INV-product-002? | SKU 價格非負、稅率於合法區間 | 未見「非負」明文約束 | product PRD / `backend/app/modules/products` model |

## 維護
- 每次 schema migration / 報表 / 結算邏輯變更，對照本檔驗至少一條相關 invariant（CLAUDE.md 規則）。
- 候選升 confirmed：補來源 + formal 條件 + 驗證方式，移入上表，並於 `docs/plans/governance-ledger.md` 記一條。
