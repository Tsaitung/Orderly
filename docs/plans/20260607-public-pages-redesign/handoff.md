# Handoff — Orderly Public Pages 重設計

**Plan:** `docs/plans/20260607-public-pages-redesign/run.md`
**Branch:** refactor
**Gate:** `.claude/plan-gate-pass.json`
**Risk:** medium（frontend；含破壞性刪 3 元件、新增 2 deps、移除 live 杜撰客戶名）
**Review:** self-review round-1 ✓ + Codex round 1-3（最終 APPROVED, must-fix 0）

## Execution Mode
未定 — 由 H-1 詢問 user（預設 subagent-driven）。

## Next Exact Step
**Task 8 — `components/landing/LandingNav.tsx`**：sticky nav，讀 `landingData.NAV_LINKS`（#features/#roles/#pricing/#faq 錨點）+ logo + 登入(`/login`) + 預約Demo(`/contact`) + **dark 切換鈕（必加 `aria-label="切換深色模式"`，用 next-themes `useTheme`）** + 滾動縮高 + 手機漢堡。dark: classes、focus ring、響應式。接著 Task 9-13 其餘元件，全部讀 `landingData.ts`。

> 已完成並 committed：Task 0(114f0a8)、Task 1(866e5bf 移除杜撰客戶名)、Task 4a(f0784d6 修死登入)、Task 7+6(0943f29 landingData+E2E RED)、playwright dep(ffd95bf)。
> **驗證標準**：repo 1074 pre-existing tsc error，task 判定＝相對 baseline 零新增（非 exit-0）。E2E 驗證需 dev server 在 5566（或設 PLAYWRIGHT_BASE_URL）。
> **Phase 1 redundancy 決議**：T2/T3/T5/T4b 在同 PR 由 Phase 2 取代，已略過（見 run.md Execution Progress）。

## 階段順序
1. Task 0：deps + tailwind dark + ThemeProvider
2. Phase 1（T1-T5）：P0 清地雷（T1 杜撰客戶名務必最先；同 PR 交付時 T2/T5 可略過——見 plan Phase 1 交付策略註）
3. Phase 2（T6-T18）：新 landing 元件組（E2E RED T6 先於 compose GREEN T14；T15-17 刪過渡元件）
4. Phase 3（T19-T22）：新頁 /contact /privacy /terms + 全量驗收（type-check:full + Playwright 全綠 + 命名目標 PUBLIC_SCOPE grep 0 hit）

## 硬約束（每 batch 遵守）
- 示意數據必標「（示意）」；禁捏造客戶名/假精度；定價真實級距。
- 每個按鈕都要有對照頁/錨點，零死連結（T22 最終驗）。
- 命名目標 grep 只限 `$PUBLIC_SCOPE`，不得擴及 OOS dashboard mock。
- verify 用 `npm run type-check:full`（非 type-check）；輸出 `> /tmp/out.log 2>&1` 完整讀不截斷。
- commit 精準路徑；每 batch 後更新 run.md + handoff.md 再 compact。

## Dirty tree note
- 無關 untracked：`.claude/wf-*.js`（workflow 腳本，勿 commit 進本 plan）。
