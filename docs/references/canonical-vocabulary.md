# Orderly Canonical Vocabulary（正規詞彙）

`naming-canonical` 的 canonical home。統一 Orderly 領域術語的正規用詞，避免同義漂移。
machine-readable 版見 `docs/references/doc-governance-vocabulary.yaml`。由 `orderly-doc-governance` 治理。

> 規則：文檔/UI/API 命名以「正規詞」為準；「禁用同義詞」不得出現在 primary docs（出現即 drift）。
> identifier（欄位/route/enum）保留英文；對人敘述用正規繁中。

## 領域核心詞

| 正規詞（繁中） | 英文 / identifier | 禁用同義詞 | 說明 |
|----------------|-------------------|------------|------|
| 訂單 | order | 採購單（除非特指 PO） | 餐廳向供應商下的單 |
| 下單 | ordering / place order | 叫貨（口語，非正式文檔） | |
| 驗收 | acceptance | 收貨（指物流到貨，與驗收區分）、點收（口語） | 餐廳對到貨的查驗確認 |
| 配送 | delivery | 出貨（供應商視角，可並用但區分主體） | |
| 對帳 | reconciliation | 核帳 | Orderly 採對帳為主、不開發票（見 business-invariants INV-billing-002） |
| 對帳對照表 | statement | 帳單、發票（invoice，Orderly 不開） | |
| 結算 | settlement | 清算 | |
| 開票 | invoicing | — | Orderly 預設不開發票，僅在明確啟用時使用 |
| 平台抽成 | platform fee / `platform_share_pct` | 手續費、佣金（commission 限程式內部用詞） | 預設 30%（INV-billing-001） |
| SKU | SKU | 品項（指 line item，與 SKU 主檔區分）、貨號 | |
| 品類 | category | 分類（過於泛用） | |
| 供應商 | supplier | 廠商、賣家 | |
| 餐廳 | restaurant | 客戶（customer 指帳務對象，語境區分）、買家 | |
| 租戶 | tenant / `tenant_id` | 組織（organizationId 為相容別名，新碼用 tenant_id） | 租戶隔離見 INV-auth-001 |

## 模組正規名 ↔ 編號
auth(01) / product(02) / order(03) / acceptance(04) / billing(05) / customer-hierarchy(06) / onboarding(07) / referral(08) / erp(09)。
