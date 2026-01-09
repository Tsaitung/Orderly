# PRD / User Story 實作落差盤點（Gap Report）

- **Last updated**: 2025-12-18
- **Owner**: Product + Engineering
- **Scope（本次盤點範圍）**：以近期更新的「合作夥伴邀請（供應商↔餐廳）/ Referral / Favorite」與其跨域依賴（Auth/JWT/Role/OrgType/Gateway）為主；未完整覆蓋訂單/商品/驗收/帳務等所有 PRD。
- **Method**：以 repo 內靜態搜尋與閱讀（`rg`/檔案檢視）比對 PRD/US；未實際啟動服務跑整合測試，因此部分項目需在實作時二次驗證。

## 1) 參考規格（Spec Baseline）

- Auth PRD：`docs/2-PRD/PRD-Auth-Module.md`
- Referral PRD：`docs/2-PRD/PRD-Referral-System.md`
- Onboarding PRD：`docs/2-PRD/PRD-Onboarding-Process.md`
- Auth User Stories：`docs/1-User-Story/by-module/01-auth-user-management.md`（US-AUTH-003、US-AUTH-019~021）

---

## 2) 摘要（P0 會直接卡主流程）

1. **Referral / 邀請核心 API 尚未落地**：PRD 需要 `POST /api/referrals/invitations` 與 `POST /api/referrals/invitations/{code}/accept`，但目前找不到對應實作與 Gateway 路由。
2. **現有「邀請」流程前後端接不上且被停用**：前端有 `supplier-invite` 頁，User Service invitations router 目前註解停用，Gateway 也無 `invitations` mapping。
3. **角色/組織型別/JWT claims 契約不一致**：`shared/types`、PRD、User Service DB enum 與 OAuth token claims 彼此不一致，會造成授權/路由/前端導向與資料層不相容。
4. **Favorite（收藏/常用）關係模型未實作**：PRD 定義 `business_relationships` 與 favorite 欄位，但現行供應商客戶關係模型不含 Favorite 與 partnerDeclaration。

---

## 3) Gap 清單（可追蹤 TODO）

> 格式說明：每個 GAP 都含「證據（Code）/ 期望（PRD/US）/ 影響 / 建議工作 / Owner / 估時 / 依賴」。

### GAP-REF-001（P0）：Referral API 未實作 + Gateway 未路由

- **證據（Code）**
  - API Gateway `PROXY_MAPPING` 未見 `referrals`：`backend/api-gateway-fastapi/app/main.py:60`
  - 全 repo 未找到 `/api/referrals` 實作（僅見 PRD 文件）：`docs/2-PRD/PRD-Referral-System.md:778`
- **期望（PRD/US）**
  - `POST /api/referrals/invitations`、`POST /api/referrals/invitations/{code}/accept`：`docs/2-PRD/PRD-Referral-System.md:778`、`docs/2-PRD/PRD-Referral-System.md:789`
  - 雙向邀請與接受時既有/新宣告 + 預設 Favorite：`docs/2-PRD/PRD-Auth-Module.md:173`、`docs/1-User-Story/by-module/01-auth-user-management.md:131`
- **影響**
  - US-AUTH-019/020/021 無法落地；「供應商↔餐廳」邀請、接受、建立關係、互相收藏皆被阻塞。
- **建議工作（最小可交付）**
  - 建立 Referral 邀請資料模型（邀請碼、inviter/invitee 類型、channels、狀態、expires、審計事件）。
  - 實作 PRD 兩個核心端點（create + accept）並加 rate limit / audit hook。
  - 在 Gateway 加上 `referrals` 路由 mapping（或以既有 catch-all 規則對齊）。
- **Owner**
  - Backend：Referral（新 service 或既有 service）+ API Gateway
- **估時（粗估）**：L（1–2 週，視 DB/審計/通知整合深度）
- **依賴**
  - Role/OrgType/JWT claims 契約先對齊（見 GAP-AUTH-001/002/003）。

### GAP-AUTH-001（P0）：現有 invitations router 被停用，前端頁面會 404

- **證據（Code）**
  - User Service invitations router 註解停用：`backend/user-service-fastapi/app/main.py:205`
  - 前端驗證邀請碼呼叫 `GET /api/invitations/verify/{code}`：`app/(auth)/supplier-invite/page.tsx:44`
  - Gateway 未見 `invitations` mapping：`backend/api-gateway-fastapi/app/main.py:60`
- **期望（PRD/US）**
  - Invite Landing + 驗證/接受流程：`docs/2-PRD/PRD-Auth-Module.md:185`
- **影響**
  - 現行 UI「供應商邀請驗證」頁無法使用（無法 verify code → 無法 onboarding）。
- **建議工作**
  - 決策：`/api/invitations/*` 要 **淘汰**（全面改走 `/api/referrals/*`）或保留成 **相容層**。
  - 若保留：修復 invitations API 並重新 include router；同時在 Gateway 增加路由。
  - 若淘汰：前端改接 `/api/referrals/invitations/{code}`（PRD 亦需補對應 read/verify 規格），並移除舊 invitations flow。
- **Owner**
  - Backend：User Service / Referral Service / API Gateway
  - Frontend：Auth/Invite pages
- **估時**：M（3–5 天，取決於「相容層」策略）
- **依賴**
  - Referral API 規格最終定稿（verify/read 是否需要獨立端點）。

### GAP-REF-002（P0）：邀請落地頁路由與 PRD 不一致（缺 `/invite?code=...`）

- **證據（Code）**
  - PRD 指定 invite landing：`/invite?code={INVITE_CODE}`：`docs/2-PRD/PRD-Referral-System.md:173`
  - 目前僅見供應商邀請頁：`app/(auth)/supplier-invite/page.tsx:1`（未見 `app/invite/*`）
- **期望（PRD/US）**
  - 受邀者可由 invite link/QR 進入落地頁，並導向登入/註冊/綁定：`docs/2-PRD/PRD-Auth-Module.md:185`、`docs/1-User-Story/by-module/01-auth-user-management.md:169`
- **影響**
  - Line QR/分享連結的「公開入口」缺失，無法承接跨組織分享的邀請旅程。
- **建議工作**
  - 新增 `app/invite/page.tsx`（或等價路由）承接 `code`，顯示 inviter 資訊 + CTA（Line 登入優先）。
  - 與 Referral API 對接：verify code、顯示狀態（pending/expired/accepted）、accept flow。
- **Owner**：Frontend（Auth/Onboarding）
- **估時**：M（3–5 天）
- **依賴**
  - Referral verify/read API（或 accept 前的查詢介面）。

### GAP-AUTH-002（P0）：UserRole 契約不一致（shared/types vs user-service DB enum）

- **證據（Code）**
  - `shared/types` 定義含 `supplier_operator/platform_support/super_admin`：`shared/types/src/index.ts:10`
  - User Service `UserRole` enum 缺上述角色：`backend/user-service-fastapi/app/models/user.py:8`
- **期望（PRD/US）**
  - PRD/US 角色集合（餐廳/供應商 admin/manager/operator + 平台 admin/support + super_admin）：`docs/2-PRD/PRD-Auth-Module.md:50`
- **影響**
  - DB/ORM 無法存取或查詢缺失角色；API 回傳/前端導向（依 role）可能出錯。
- **建議工作**
  - 對齊單一真實來源（建議以 `shared/types` + PRD 為準），更新 DB enum + migration + ORM enum。
  - 同步 API 層授權判斷（如 super user 啟用、audit、business verification 等）。
- **Owner**：Backend（User Service + DB）
- **估時**：M（3–5 天）
- **依賴**
  - 需確認既有資料是否已存在「非 enum」角色（migration 需資料清理策略）。

### GAP-AUTH-003（P0）：OrganizationType 契約不一致（platform/partner 未落地）

- **證據（Code）**
  - User Service `OrganizationType` 僅 `restaurant/supplier`：`backend/user-service-fastapi/app/models/organization.py:31`
  - `shared/types` enum 含 `platform`：`shared/types/src/supplier.ts:19`
  - OAuth complete registration 直接寫入 `type=request.organization_type`（可能包含 platform）：`backend/user-service-fastapi/app/api/v1/oauth.py:329`
- **期望（PRD/US）**
  - Auth PRD 描述組織類型含 platform（且平台側登入獨立）：`docs/2-PRD/PRD-Auth-Module.md:284`
- **影響**
  - 平台端帳號/組織模型在 DB 層缺口；OAuth/註冊流程可能寫入不被允許的型別。
- **建議工作**
  - 決策：平台端是否需要 `organizations.type=platform`，或平台使用獨立 tenant 模型（不依賴 organizations）。
  - 依決策更新 enum、資料模型、授權與前端導向。
- **Owner**：Backend（User Service）+ Product（模型決策）
- **估時**：M～L（視是否牽涉多服務）

### GAP-AUTH-004（P0）：OAuth JWT claims/有效期與 Auth token 不一致，可能導致 Gateway/中介層解析失敗

- **證據（Code）**
  - Auth token claims 以 `tenant_id/org_id` 為主：`backend/user-service-fastapi/app/api/v1/auth.py:69`
  - OAuth token claims 使用 `organization_id` 且有效期 24h：`backend/user-service-fastapi/app/api/v1/oauth.py:33`、`backend/user-service-fastapi/app/api/v1/oauth.py:369`
  - 中介層 tenant 解析只看 `tenant_id/org_id`：`backend/libs/orderly_fastapi_core/middleware/auth.py:101`
- **期望（PRD/US）**
  - 單一身份源 + JWT schema 一致（Gateway/前端/後端共用）：`docs/2-PRD/PRD-Auth-Module.md:10`
- **影響**
  - OAuth 登入 token 可能在 Gateway 或其他服務被視為缺少 tenant（導致 401/403 或資料隔離失效）。
- **建議工作**
  - OAuth 簽發 token 改共用 `auth.py` 的 `_build_claims` 與 `create_access_token`（或至少對齊 claims key）。
  - 統一 access token 有效期策略（PRD 建議 15–30 分鐘）。
- **Owner**：Backend（User Service + Gateway）
- **估時**：S～M（2–5 天）

### GAP-AUTH-005（P1）：Line Login「主要路徑」尚未體現在前端登入頁

- **證據（Code）**
  - 登入頁目前為 Email + 密碼表單（未見 Line OAuth 按鈕/導向）：`app/(auth)/login/page.tsx:32`
  - PRD 定義 Line 為主要登入方式：`docs/2-PRD/PRD-Auth-Module.md:229`
- **期望（PRD/US）**
  - US-AUTH-003：登入頁首選顯示「使用 Line 登入」：`docs/1-User-Story/by-module/01-auth-user-management.md:54`
- **影響**
  - 主要轉換漏斗與 PRD 不符，無法驗證「Line 降門檻」假設。
- **建議工作**
  - 前端新增 Line Login 主 CTA（串 `/auth/oauth/line/initiate`），並處理 callback/綁定 Email/完成註冊 UI。
- **Owner**：Frontend（Auth）+ Backend（OAuth/Email 綁定流程）
- **估時**：L（1–2 週）

### GAP-AUTH-006（P1）：Remember Me（Refresh 30 天）未落地

- **證據（Code）**
  - User Story 要求 remember me 延長 refresh token 30 天：`docs/1-User-Story/by-module/01-auth-user-management.md:65`
  - 後端 refresh 固定 7 天：`backend/user-service-fastapi/app/api/v1/auth.py:55`
- **期望（PRD/US）**
  - 記住我（可選）→ refresh 30 天；未勾選則較短：US-AUTH-003
- **影響**
  - 行動端/長期操作情境需頻繁重新登入，體驗不符 MVP。
- **建議工作**
  - login API 支援 `rememberMe`，動態調整 refresh token 期限與 session expires。
- **Owner**：Backend（User Service）+ Frontend（已具欄位）
- **估時**：S～M（2–5 天）

### GAP-REL-001（P0）：Favorite/合作關係資料模型與 API 尚未落地

- **證據（Code）**
  - PRD 定義 `business_relationships.favorite_by_supplier/favorite_by_restaurant/...`：`docs/2-PRD/PRD-Referral-System.md:918`
  - 現行供應商-客戶關係為 `supplier_customers.relationshipType`（active/inactive/...），無 favorite：`backend/supplier-service-fastapi/app/models/supplier_profile.py:145`
- **期望（PRD/US）**
  - 受邀成功後「互相 Favorite」且可取消：`docs/2-PRD/PRD-Auth-Module.md:205`、`docs/1-User-Story/by-module/01-auth-user-management.md:169`
- **影響**
  - 即使完成邀請，也無法在「供應商池/餐廳池」中標記收藏/常用；後續選取效率與 PRD 不符。
- **建議工作**
  - 決策：關係模型以 `business_relationships`（supplier↔restaurant）為主，或擴充現有 `supplier_customers`。
  - 補上 favorite 欄位與更新端點（PRD: `PATCH /api/relationships/{relationshipId}/favorite`）。
- **Owner**：Backend（Supplier/Customer/Relationship 所屬 service）+ Data
- **估時**：L（1–2 週）

### GAP-CONTRACT-001（P1）：Invitation DTO casing 不一致（snake_case vs camelCase）

- **證據（Code）**
  - 前端/共享型別使用 camelCase：`shared/types/src/supplier.ts:148`
  - 後端 invitation schema 使用 snake_case：`backend/user-service-fastapi/app/schemas/invitation.py:138`
- **期望（PRD/US）**
  - 前後端/共享 types 單一契約，避免 BFF/DTO 漂移：`docs/2-PRD/PRD-Auth-Module.md:14`
- **影響**
  - 真正串接 API 時容易出現欄位對不上（尤其在 TS 嚴格型別下）。
- **建議工作**
  - 後端統一回傳 casing（alias/serializer），或調整 shared/types 與 API 實際回傳一致。
- **Owner**：Backend（對外 API 契約）+ Frontend（types）
- **估時**：S（1–2 天）

---

## 4) 建議拆分成 Epics（方便排程）

1. **Epic A：Partner Invitation / Referral（雙向）**
   - 覆蓋 GAP-REF-001、GAP-AUTH-001、GAP-REF-002
2. **Epic B：Relationship & Favorite**
   - 覆蓋 GAP-REL-001（並與邀請 accept 串接）
3. **Epic C：Auth Contract Alignment（Role / OrgType / JWT Claims）**
   - 覆蓋 GAP-AUTH-002、GAP-AUTH-003、GAP-AUTH-004、GAP-CONTRACT-001
4. **Epic D：Line Login 主路徑 + Email 綁定**
   - 覆蓋 GAP-AUTH-005（並連動 Epic C）
5. **Epic E：Remember Me**
   - 覆蓋 GAP-AUTH-006（可獨立快做）

---

## 5) 待釐清（需要 Product/Tech Decision）

- **Favorite 是否「雙方互相預設」或僅「邀請發起方預設」？**（目前 PRD/US 偏向互相預設）
- **平台端（platform）是否需要 organizations.type=platform？** 或平台採獨立 tenant 模型不使用 organizations？
- **Referral 邀請碼長度/格式**：現行 supplier invitation 是 8 碼，PRD schema 為 `VARCHAR(20)`（是否維持 8 碼、或改為高熵 token）？
- **相容策略**：既有 `/api/invitations/*` 與新 `/api/referrals/*` 是否並存一期？

