# Handoff — Orderly Public Pages 重設計

**Plan:** `docs/plans/20260607-public-pages-redesign/run.md`
**Branch:** refactor
**Gate:** `.claude/plan-gate-pass.json`
**Risk:** medium（frontend；含破壞性刪 3 元件、新增 2 deps、移除 live 杜撰客戶名）
**Review:** self-review round-1 ✓ + Codex round 1-3（最終 APPROVED, must-fix 0）

## Execution Mode
未定 — 由 H-1 詢問 user（預設 subagent-driven）。

## Next Exact Step
**Task 1 Step 1**：移除 `components/HeroSection.tsx` L147-165 整段「信任標誌」區塊（含「已獲得以下企業信任」+ 4 個杜撰客戶名 大樂司/樂多多/烤食組合/稻舍）。然後 `grep -rn '大樂司\|樂多多\|烤食組合\|稻舍' $PUBLIC_SCOPE` → 0 hit（PUBLIC_SCOPE 不含 OOS dashboard mock）。

> Task 0 ✅ 完成（commit 114f0a8）。**驗證標準已改**：repo 有 1074 pre-existing type error，task 判定＝相對 baseline 零新增（非 exit-0）——見 run.md AC6。

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
