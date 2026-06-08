# Tasks — Auth Line/Google 登入模型實作

> 每個 task 2–4 小時可執行，測試先行。**禁止**引入 mock/demo/stub/fake/placeholder runtime 行為作為產品真相。開工前須完成 plan-review（auth 高風險）。

## T0 — Pre-implementation（gate）

- **T0.1 plan-review（auth 高風險）**
  - 依賴：本 packet
  - 產出：plan-review 通過紀錄
  - 驗收：reviewer 確認平台端社群登入緩解（MFA/供裝/IP/審計）到位、恢復策略可行
- **T0.2 production 密碼帳號盤點**
  - 依賴：無
  - 產出：是否存在密碼登入帳號的結論 + 遷移/通知決策（若有）
  - 驗收：明確結論，無「假設沒有」

## T1 — RED tests（測試先行）

- **T1.1 OAuth 登入 integration 測試（RED）**
  - 產出：`tests/integration` Line/Google initiate→callback 簽發 JWT 測試（先紅）
  - 驗收：測試存在且因功能未接齊而失敗
- **T1.2 無密碼 / Email 非認證 測試（RED）**
  - 產出：`POST /api/auth/login`(email/password) 與 `/auth/password/*` 回 404/410；註冊不要求 Email
  - 驗收：先紅
- **T1.3 social-bindings 解綁保留至少一 測試（RED）**
  - 產出：解綁至零被拒測試
  - 驗收：先紅
- **T1.4 平台供裝允許名單 + 強制 MFA 測試（RED）**
  - 產出：未在允許名單社群帳號被拒；平台登入要求 MFA
  - 驗收：先紅
- **T1.5 帳號恢復（US-AUTH-022）測試（RED）**
  - 產出：Line 失效→Google 登入成功；雙失效→人工恢復路徑 + 審計
  - 驗收：先紅

## T2 — Backend

- **T2.1 OAuth 登入 + 帳號建立**：Line/Google callback 簽發統一 claims JWT（對齊 GAP-AUTH-004），新帳號補租戶/角色。依賴 T1.1。驗收：T1.1 綠。
- **T2.2 social-bindings 綁定/解綁**：雙 provider 綁定 + 解綁保留至少一 + 審計。依賴 T1.3。驗收：T1.3 綠。
- **T2.3 移除密碼面**：停用/移除 `password.py`、login(email/password)、verify-email、公開 Email register；`users.password_hash` 不參與登入。依賴 T1.2。驗收：T1.2 綠；grep 無 active password 登入路徑。
- **T2.4 平台供裝 + 強制 MFA**：社群帳號→預建平台帳號允許名單；強制 MFA；3 次鎖 15 分；IP 白名單；併發 3。依賴 T1.4。驗收：T1.4 綠。
- **T2.5 account-recovery（人工）**：platform_support 恢復端點 + 多證據 + 審計（US-AUTH-022）。依賴 T1.5。驗收：T1.5 綠。
- **T2.6 MFA 移除 Email OTP**：保留 TOTP/SMS。驗收：MFA enable 不接受 email method。

## T3 — DB / 契約

- **T3.1 users 欄位調整**：`email` 改 nullable、非 unique、僅對帳；`password_hash` 標 deprecated。Alembic 遷移含 server_default、可 `upgrade head`。依賴 T2.x。驗收：遷移鏈不斷、本機 upgrade 通過。
- **T3.2 shared/types 對齊**：role/orgType/JWT claims（GAP-AUTH-002/003/004）。驗收：前後端契約一致。

## T4 — Frontend

- **T4.1 登入頁重構**：`app/(auth)/login/page.tsx` 改 Line（主）/ Google（次）CTA，移除 email/password 表單。驗收：頁面無密碼欄位；Playwright 點擊導向 OAuth。
- **T4.2 設定頁 Google 綁定**：綁定/解綁 UI（解綁保留至少一）。驗收：UI + API 串接。
- **T4.3 onboarding 引導綁第二社群**：提示綁 Google 作恢復保險。驗收：流程含引導步驟。

## T5 — Verification

- **T5.1 全測試綠**：T1.x 全綠 + `tests/integration` auth 套件通過。
- **T5.2 audit 驗證**：登入/綁定/解綁/恢復事件寫入 `audit_logs`，欄位非空。
- **T5.3 端點移除回歸**：grep 前端無殘留 `/auth/login`、`/password/*` 呼叫。
- **T5.4 plan-review 緩解確認**：平台端緩解逐項驗證到位。

## 完成定義

所有 T1 紅測轉綠、T5 驗證通過、audit 非空、plan-review 緩解確認；無 mock/stub 進 production path；文檔（本 packet + US/PRD/Specs/Test）與實作一致。
