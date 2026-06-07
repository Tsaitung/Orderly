# Handoff — Orderly Public Pages 執行後 Review

**Plan:** `docs/plans/20260607-public-pages-redesign/run.md`
**Branch:** `codex-public-pages-redesign`
**Gate:** `.claude/plan-gate-pass.json` 指向此 plan
**本次 handoff refresh 前基準:** `5834557`
**狀態:** implementation 已 committed；plan-review audit 已 approved；剩餘工作是誠實收尾，不是新一輪 redesign scope
**Review:** 執行前 Codex R1/R2/R3 已收斂到 APPROVED；執行後 Codex R4 抓到 1 個 audit wording must-fix + 1 個 E2E warning；Codex R5 修正後 APPROVED

## 已驗證事實

- `components/HeroSection.tsx`、`components/RoleSelector.tsx`、`components/HeroBackground.tsx` 已刪除。
- `components/landing/` 有預期的 13 個 landing `.tsx` 元件與 `landingData.ts`；`app/page.tsx` 組合 12 個 landing 區塊，且不再 import `SystemStatus`。
- `app/(marketing)/contact/page.tsx`、`app/(marketing)/privacy/page.tsx`、`app/(marketing)/terms/page.tsx`、`app/api/contact/route.ts` 皆存在。
- Hero 圖 runtime source 是本機路徑 (`/hero/restaurant-hero.jpg`)；`images.unsplash.com` 只出現在 provenance 註解，因此排除註解行後 live-usage grep 為 0。
- `/api/contact` 有 3 個 console call，全部 PII-safe：成功只記 `{ requestId, role, timestamp }`；失敗只記 `{ requestId, timestamp }` 或 `{ requestId, timestamp, missing }`。
- `e2e/public-pages.spec.ts` 目前有 8 個 landing/auth tests，且明確排除 `/contact /privacy /terms`。

## 誠實剩餘項

1. **Task 19 E2E gap（建議的下一個收尾）**：補 Playwright 覆蓋 `/contact` submit success、`/privacy` `/terms` route-200 + 標題/「整理中」斷言。這會關閉 AC4 automation。若現在不做，需把 AC4 降級為 manual verification + E2E follow-up。
2. **Task 18 dark visual pass**：dark toggle 已測，元件也有 `dark:` variants；但沒有逐區 dark screenshot pass 的紀錄。
3. **僅 nice-to-have**：whileInView/no-JS robustness 與 provenance-comment rewrite。除非 user 明確拉高門檻，這些不應阻擋 merge。
4. **僅 nice-to-have（Round 7 新增）**：`e2e/public-pages.spec.ts:3-10` 檔頭註解仍描述 RED/未建狀態，但 spec 自 Task 14 已 GREEN；下次觸及 spec 時順手把註解更新為現況即可，非阻擋。

## 下一個精確步驟

只 patch `e2e/public-pages.spec.ts`：

- 補 `/contact` test：前往 `/contact`，填 `company`、`name`、`email`、`needs`，submit `送出需求`，assert status text `已收到你的需求，謝謝！`。
- 補 `/privacy` test：`page.goto('/privacy')`，expect 200、title `隱私權政策`、text `整理中`。
- 補 `/terms` test：`page.goto('/terms')`，expect 200、title `服務條款`、text `整理中`。

該 patch 後的 focused verification：

```bash
PLAYWRIGHT_BASE_URL=http://localhost:<dev-port> npx playwright test e2e/public-pages.spec.ts --reporter=line
```

Expected decision：若通過，在 `run.md` 標記 Task 19 與 AC4 automation closed；若跳過，保留目前已記錄的 gap。

## Scope Guard

- 不要擴成 auth page redesign、真 CRM/email delivery、真實 customer testimonials、dashboard mock cleanup，或新增 marketing pages。
- PUBLIC_SCOPE grep 維持只限 public landing/marketing paths；dashboard mock names 仍是 out of scope。
- 此 branch 也有 backend step4-9 plan docs；除非 user 要求，不要碰那些文件。
