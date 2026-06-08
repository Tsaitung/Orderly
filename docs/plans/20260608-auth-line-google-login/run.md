---
run_id: 20260608-auth-line-google-login
state: ready_for_implementation
scope: >
  全平台登入模型改為 Line（主要）/ Google（次要，綁定後可登入）。廢除 Email+密碼登入與密碼、
  Email 改財務對帳用途、平台端改社群登入+強制 MFA、新增社群帳號恢復（US-AUTH-022）。
  本 packet 僅完成 US/PRD/Specs/Test 文檔同步，不含程式實作。
changed_identifiers:
  user_stories:
    modified: [US-AUTH-001, US-AUTH-002, US-AUTH-003, US-AUTH-005, US-AUTH-006, US-AUTH-007, US-AUTH-008, US-AUTH-010, US-AUTH-014, US-AUTH-016, US-AUTH-021]
    deprecated: [US-AUTH-004]
    added: [US-AUTH-022]
  prd_sections: ["§0", "§2.4", "§3.2", "§3.3", "§3.4", "§3.5", "§4.1", "§4.1.1", "§4.2", "§4.5", "§5", "§6", "§7.1", "§8.1", "Appendix A"]
  specs: ["technical-architecture-auth §0/§1.2/§4.1", "API-Endpoints-Essential 登入段"]
  endpoints_removed: ["POST /api/auth/login", "/api/auth/password/*", "POST /api/auth/verify-email", "公開 POST /api/auth/register"]
  endpoints_planned: ["GET /api/auth/oauth/{provider}/initiate|callback", "POST|DELETE /api/auth/social-bindings/{provider}", "POST /api/auth/account-recovery"]
traceability_result: pass — 零孤立（US ↔ PRD ↔ Specs ↔ Test ↔ INDEX 一致，AUTH 22 / 總計 106）
approval_status: requirement approved by user (4 decisions via /us-edit 2026-06-08); implementation pending plan-review (auth 高風險)
keep_until: 2026-06-15
blockers: none
governance_gate: not-applicable（repo 無專案級治理 FSM / `.claude/skills/`）
---

# Run: Auth Line/Google 登入模型文檔同步

**State:** `ready_for_implementation`（us-edit design completion marker）
**Current gate:** docs design complete → 待 implementation（須走 plan-review）

## 決策來源（2026-06-08，使用者經 /us-edit 拍板）

| 決策 | 結果 |
|------|------|
| Google 定位 | 次要登入（綁定後可登入）|
| 平台端登入 | 改用 Line/Google（移除 Email+密碼獨立系統，保留強制 MFA + 供裝控管）|
| 密碼 | 完全廢除 |
| Email | 不做登入/恢復，純財務對帳 |

## Scope

見 frontmatter `scope`。**In scope**：US/PRD/Specs/Test/INDEX 文檔同步。**Out of scope**：後端/前端程式實作、Alembic 遷移、OAuth provider 實接、登入頁重構（屬後續 implementation packet）。

## Traceability summary

零孤立。每個變更 US 對應 PRD section + Specs §0；Test Plan（`docs/4-Test/smoke-tests.md`）含對應測試項；INDEX 計數一致。詳見 `diff-manifest.md`。

## Blockers

none。

## ⚠️ 安全決策註記（provenance）

平台端由「獨立 Email+密碼+MFA 系統」改為「Line/Google + 強制 MFA」是**刻意降低**原獨立系統的防釣魚/降第三方依賴等級，由使用者明確拍板。緩解：強制 MFA + 帳號供裝允許名單 + IP 白名單 + 異常告警 + 完整審計。實作時**必須走 plan-review（auth flow 高風險）**並驗證緩解到位。帳號恢復僅剩另一社群綁定，兩者皆失效須人工支援 → 需在 onboarding 引導使用者綁第二個社群帳號。
