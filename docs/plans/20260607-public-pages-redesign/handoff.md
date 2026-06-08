# Handoff — Orderly Public Pages 執行後 Review

**Plan:** `docs/plans/20260607-public-pages-redesign/run.md`
**Branch:** `codex-public-pages-redesign`
**Gate:** `.claude/plan-gate-pass.json` 指向此 plan
**本次 handoff refresh 前基準:** `5834557`
**狀態:** implementation 已 committed；plan-review audit 已 approved；Task 18 dark pass、Task 19 E2E gap、whileInView robustness、provenance rewrite 已於 2026-06-08 補齊；目前無已知阻擋 merge 的剩餘項
**Review:** 執行前 Codex R1/R2/R3 已收斂到 APPROVED；執行後 Codex R4 抓到 1 個 audit wording must-fix + 1 個 E2E warning；Codex R5 修正後 APPROVED

## 已驗證事實

- `components/HeroSection.tsx`、`components/RoleSelector.tsx`、`components/HeroBackground.tsx` 已刪除。
- `components/landing/` 有預期的 13 個 landing `.tsx` 元件與 `landingData.ts`；`app/page.tsx` 組合 12 個 landing 區塊，且不再 import `SystemStatus`。
- `app/(marketing)/contact/page.tsx`、`app/(marketing)/privacy/page.tsx`、`app/(marketing)/terms/page.tsx`、`app/api/contact/route.ts` 皆存在。
- Hero 圖 runtime source 是本機路徑 (`/hero/restaurant-hero.jpg`)；PUBLIC_SCOPE 內 `images.unsplash.com` 0 hit，provenance 以 Unsplash photo id 保留。
- `/api/contact` 有 3 個 console call，全部 PII-safe：成功只記 `{ requestId, role, timestamp }`；失敗只記 `{ requestId, timestamp }` 或 `{ requestId, timestamp, missing }`。
- `e2e/public-pages.spec.ts` 目前有 11 個 public-pages tests，涵蓋 landing/auth + `/contact` submit success + `/privacy` `/terms` route-200、標題與「整理中」斷言。
- `e2e/dark-mode-visual.spec.ts` 目前有 4 個 dark-mode visual evidence tests，會對 `/`、`/contact`、`/privacy`、`/terms` 產生 dark screenshot，並檢查 body 背景與 h1 對比。
- Reveal 初始狀態不再使用 `opacity:0`，full-page screenshots 不會因未觸發 `whileInView` 而顯示大面積空白。
- Dark visual pass 已檢查 `/`、`/contact`、`/privacy`、`/terms`；`/privacy` footer 已改為 flex layout，避免高 viewport 下 footer 後方留空。
- Focused verification：`PLAYWRIGHT_BASE_URL=http://localhost:5613 npx playwright test e2e/public-pages.spec.ts --reporter=line` → 11/11 passed；`PLAYWRIGHT_BASE_URL=http://localhost:5613 npx playwright test e2e/dark-mode-visual.spec.ts --reporter=line` → 4/4 passed（2026-06-08）；focused ESLint（landing/marketing/spec）通過。

## 誠實剩餘項

無已知阻擋 merge 的剩餘項。

## 下一個精確步驟

沒有阻擋 merge 的下一步。若後續還要做，請先重新定義新 scope（例如 auth page redesign 或真 CRM/email delivery），不要把它混入本 public-pages 收尾。

## Scope Guard

- 不要擴成 auth page redesign、真 CRM/email delivery、真實 customer testimonials、dashboard mock cleanup，或新增 marketing pages。
- PUBLIC_SCOPE grep 維持只限 public landing/marketing paths；dashboard mock names 仍是 out of scope。
- 此 branch 也有 backend step4-9 plan docs；除非 user 要求，不要碰那些文件。
