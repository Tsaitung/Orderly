**Must-Fix**

1. **Task 14 的 GREEN gate 目前不可達。** §Task 6 要驗 `/contact` 回 200，§Task 14 要 Playwright PASS，但 `/contact`、`/privacy`、`/terms` 到 §Task 20-21 才建立。這會讓 Phase 2 自己卡死。最小修正：把 §Task 19-21 移到 §Task 14 前，或在 §Task 13/14 前先建立三個 stub route。

2. **命名目標 grep 範圍太廣，會誤打 Out of Scope dashboard。** §Task 1、§Task 22 用 `grep ... app/ components/` 要 0 hit，但現有 dashboard/mock files 仍有 `大樂司/樂多多/稻舍/烤食組合`，例如 [delivery-list.tsx](/Users/leeyude/Projects/Orderly/components/supplier/logistics/delivery-list.tsx:35)、[UserManagement.tsx](/Users/leeyude/Projects/Orderly/components/admin/UserManagement.tsx:28)。這會迫使改 dashboard，違反 Out of Scope。最小修正：把驗收改成公開頁範圍，例如 `app/page.tsx components/HeroSection.tsx components/RoleSelector.tsx components/HeroBackground.tsx components/landing/`。

3. **Tailwind 檔名錯，照做會改錯檔。** Plan 多處寫 `tailwind.config.js`，但 repo 目前是 [tailwind.config.ts](/Users/leeyude/Projects/Orderly/tailwind.config.ts:1)。最小修正：§Complexity Budget、§File Structure、§Task 0 全部改成 `tailwind.config.ts`，並用 TS config 形式加 `darkMode: 'class'`。

**Warnings**

- `npm run type-check` 目前跑的是 `tsconfig.staging.json`，它排除 `app/**/*` 和 `components/**/*`；所以不會驗到 landing 變更。建議 final gate 加 `npm run type-check:full` 或明確說這次以前端檔案用 full type-check。
- §Task 20 的 `/api/contact` 不建議 `console.log` 完整表單，會把 email/聯絡人/需求內容寫進 logs。改成只 log request id、role、timestamp 即可。
- Footer 的「公司」連結要明確指定現有目標或做純文字；不要因此新增 `/about`，因為 §Out of Scope 已排除。

VERDICT: REVISE