# ADR-0005: Super Admin 帳號模擬登入（Act-as 化身目標角色，非 God mode）

- **Type**: risk-acceptance
- **Lifecycle Status**: accepted
- **Date**: 2026-06-09
- **Cluster**: auth
- **Primary PRD**: docs/2-PRD/PRD-Auth-Module.md（Section 2.5）
- **FR References**: PRD-Auth-Module §2.5（Orderly PRD 採 Section 編號，無 FR-ID 層）
- **US References**: US-AUTH-023（帳號模擬登入）、US-AUTH-024（角色切換預覽）；相關 US-AUTH-009、US-AUTH-012
- **Supersedes / Superseded By**: —（與 ADR-0004 並列；不取代 §2.2 `super_user` 緊急機制）
- **Review By**: 2026-12-09（risk-acceptance，6 個月複審）

## Context

需求：`super_admin` 需能從使用者清單為起點，切換進任一帳號/角色，進入其所屬公司或供應商租戶實際操作，用於支援、重現使用者問題、驗證跨租戶流程（來源：使用者 2026-06-09 指示 + 切換角色 UI 參考）。

現況衝突點：

1. 既有 **US-AUTH-012 / PRD §2.2 `super_user`** 是**緊急 break-glass**：附加權限標記、跨租戶 override/bypass、24h 過期、>1h 雙人核准。其語意是「緊急情況跨組織存取」，不是日常充當單一帳號。
2. **INV-auth-001**（business-invariants）：所有資料查詢強制帶 `tenant_id`，**禁止跨租戶存取**。超管要合法進入別的租戶操作，與此不變式直接張力。
3. 「擁有所有角色權限 + 充當任何帳號」若做成永久全權超集（God mode），會弱化稽核（分不清「超管做的」vs「該帳號能做的」）與最小權限。

需要一個架構決策：模擬登入的權限模型，以及它如何與租戶隔離不變式調和。

## Decision

採 **act-as 化身目標角色**模型，並與既有 `super_user` 緊急機制**明確分離**。

1. **權限 = 目標帳號的實際 role + permissions**：模擬 session 期間，授權以**被模擬帳號的實際 `role`/`permissions`** 為準，在其 `tenant_id` 內運作。超管**不**取得超出目標角色的權限，**不**繼承 `super_user` 的 override/bypass。
2. **兩套獨立機制，不混用**：
   - `super_user`（§2.2）：緊急 break-glass，跨租戶 override，24h，雙核准。維持現狀（US-AUTH-012）。
   - impersonation（§2.5）：日常支援/維運，化身單一帳號、受目標角色約束、session 時限自動到期。
3. **租戶隔離雙 context（INV-auth-003）**：模擬 session 的 effective `tenant_id` = 目標帳號租戶；下游查詢據此正常帶租戶條件，**INV-auth-001 仍成立**（查詢仍帶 `tenant_id`，只是 effective context 指向目標租戶）。token 與每筆 audit **同時記錄真實 actor**（`super_admin` id）與**被模擬 user**（`impersonated_user_id`），任一操作可回溯真實發起者。
4. **角色切換（view-as，US-AUTH-024）**為介面預覽；實際租戶寫入須走帳號模擬（US-AUTH-023）。
5. **不可關閉的審計** + 全程橫幅 + 一鍵退出 + session TTL + 發起前置 MFA。

技術規格：`docs/0-Design/technical-architecture-auth.md` §10.3。不變式：`docs/0-Design/business-invariants.md` INV-auth-003。

## Consequences

正面：
- 稽核清晰：每筆操作可回溯真實 actor，且操作受目標角色約束，符合最小權限。
- 跨租戶隔離不被破壞：effective tenant 仍滿足 INV-auth-001，repository 層 tenant_id 注入照舊。
- 支援/測試擬真：超管看到的就是該帳號真實能做的。
- 與緊急機制分離，避免把「日常操作」綁上「緊急框架」造成語意污染。

負面 / 新約束：
- 需在 authz 中介層正確切換 effective context；bug 風險 = 跨租戶資料外洩或權限提升 → 以整合測試驗 INV-auth-003 / INV-auth-001 把關（Test Plan: docs/4-Test/smoke-tests.md）。
- 需新增 `act_as` token claim + impersonation audit 欄位（含 Alembic 遷移）。
- risk-acceptance：跨租戶實際操作本質高敏感，靠「MFA 前置 + 不可關閉審計 + TTL + 顯著橫幅」緩解，須 6 個月複審。

## Alternatives Considered

- **A：God-mode 全角色權限超集** — 拒絕。切換只改 tenant context、權限恆為所有角色聯集；稽核與最小權限最弱，難分辨「超管做的」vs「該帳號能做的」。
- **B：併入既有 `super_user` 緊急機制** — 拒絕。把日常 impersonation 綁上「緊急 break-glass + 24h + 雙核准」框架，語意衝突，且讓緊急機制被日常化稀釋。
- **C：不動 invariant，後端代理查詢** — 拒絕。super_admin 自身 tenant 不變、僅 UI 呈現目標資料；寫入操作難實作、稽核語意模糊（無清楚 effective principal），跨租戶寫入路徑不乾淨。
