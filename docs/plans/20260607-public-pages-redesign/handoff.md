# Handoff — Orderly Public Pages 執行後 Review

**Plan:** `docs/plans/20260607-public-pages-redesign/run.md`
**Branch:** `codex-public-pages-redesign`
**Gate:** `.claude/plan-gate-pass.json` 指向此 plan
**本次 handoff refresh 前基準:** `5834557`
**狀態:** implementation 已 committed；plan-review audit 已 approved；Task 19 E2E gap 已於 2026-06-08 補齊；剩餘工作是誠實收尾，不是新一輪 redesign scope
**Review:** 執行前 Codex R1/R2/R3 已收斂到 APPROVED；執行後 Codex R4 抓到 1 個 audit wording must-fix + 1 個 E2E warning；Codex R5 修正後 APPROVED

## 已驗證事實

- `components/HeroSection.tsx`、`components/RoleSelector.tsx`、`components/HeroBackground.tsx` 已刪除。
- `components/landing/` 有預期的 13 個 landing `.tsx` 元件與 `landingData.ts`；`app/page.tsx` 組合 12 個 landing 區塊，且不再 import `SystemStatus`。
- `app/(marketing)/contact/page.tsx`、`app/(marketing)/privacy/page.tsx`、`app/(marketing)/terms/page.tsx`、`app/api/contact/route.ts` 皆存在。
- Hero 圖 runtime source 是本機路徑 (`/hero/restaurant-hero.jpg`)；`images.unsplash.com` 只出現在 provenance 註解，因此排除註解行後 live-usage grep 為 0。
- `/api/contact` 有 3 個 console call，全部 PII-safe：成功只記 `{ requestId, role, timestamp }`；失敗只記 `{ requestId, timestamp }` 或 `{ requestId, timestamp, missing }`。
- `e2e/public-pages.spec.ts` 目前有 11 個 public-pages tests，涵蓋 landing/auth + `/contact` submit success + `/privacy` `/terms` route-200、標題與「整理中」斷言。
- Focused verification：`PLAYWRIGHT_BASE_URL=http://localhost:5612 npx playwright test e2e/public-pages.spec.ts --reporter=line` → 11/11 passed（2026-06-08）。

## 誠實剩餘項

1. **Task 18 dark visual pass**：dark toggle 已測，元件也有 `dark:` variants；但沒有逐區 dark screenshot pass 的紀錄。
2. **僅 nice-to-have**：whileInView/no-JS robustness 與 provenance-comment rewrite。除非 user 明確拉高門檻，這些不應阻擋 merge。

## 下一個精確步驟

Task 19 已完成；若要再收尾，下一個精確步驟是做 Task 18 dark visual pass：

- 用 fresh dev server 開 `/`、`/contact`、`/privacy`、`/terms`。
- 切換 dark mode 後逐頁截圖或目視，確認無白字白底、焦點樣式與主要 CTA 對比正常。
- 若有修，再跑 `PLAYWRIGHT_BASE_URL=http://localhost:<dev-port> npx playwright test e2e/public-pages.spec.ts --reporter=line` 確認 11 tests 維持 green。

## Scope Guard

- 不要擴成 auth page redesign、真 CRM/email delivery、真實 customer testimonials、dashboard mock cleanup，或新增 marketing pages。
- PUBLIC_SCOPE grep 維持只限 public landing/marketing paths；dashboard mock names 仍是 out of scope。
- 此 branch 也有 backend step4-9 plan docs；除非 user 要求，不要碰那些文件。
