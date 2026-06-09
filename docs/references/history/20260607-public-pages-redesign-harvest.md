# Harvest Extraction Report — `20260607-public-pages-redesign`

- **Harvest run**: orderly-doc-governance `harvest` mode, 2026-06-09
- **Target packet**: `docs/plans/20260607-public-pages-redesign/`（run.md 425 + revision-and-codex-handoff.md 147 + handoff.md 35 + codex-review-1..7）
- **Disposition**: promote-then-delete (`rm -rf`)
- **Machine evidence**: `.claude/.gov-harvest-evidence.json`

公開頁（landing + /contact /privacy /terms）premium 重設計 + 清除可信度地雷（杜撰客戶名、demo 帳密、死按鈕、SystemStatus、hardcoded Unsplash）。v1 已交付並 merge 進 main（via 整合 merge `c63fc47`，PR #7）；frontend 已隨 file-reorg PR #13 搬入 `src/`。

---

## §0 Verification Evidence (Hard Rule #11)

每個 `done/applied/verified` claim 對 current `main` HEAD（`065d876`）實證。**Zero drift。**

| # | Claim | Target dim | Command | Output | Verdict |
|---|-------|-----------|---------|--------|---------|
| 1 | 13 landing 元件 + landingData 交付 | applied-claim | `git ls-files 'src/components/landing/*' \| wc -l` | `14`（13 .tsx + landingData.ts）| ✅ |
| 2 | 新 marketing 頁交付 | applied-claim | `git ls-files \| grep marketing` | `src/app/(marketing)/{contact,privacy,terms}/page.tsx` | ✅ |
| 3 | /api/contact stub | applied-claim | `git ls-files \| grep api/contact` | `src/app/api/contact/route.ts` | ✅ |
| 4 | 過渡元件刪除（HeroSection/RoleSelector/HeroBackground）| applied-claim | `git ls-files \| grep -E 'HeroSection\|RoleSelector\|HeroBackground'` | 0 tracked（committed-deleted）| ✅ |
| 5 | hero 圖在地化 | applied-claim | `git ls-files \| grep hero/restaurant-hero` | `public/hero/restaurant-hero.jpg` | ✅ |
| 6 | PUBLIC_SCOPE 杜撰名/demo/unsplash 清除 | applied-claim | `grep 大樂司\|...\|demo1234\|demo.orderly.tw\|images.unsplash.com src/app/page.tsx src/components/landing/ 'src/app/(marketing)'` | `0` | ✅ |
| 7 | E2E specs | applied-claim | `git ls-files \| grep -E 'public-pages.spec\|dark-mode-visual.spec'` | `tests/e2e/public-pages.spec.ts` + `dark-mode-visual.spec.ts` | ✅ |
| 8 | commits on main | commit-claim | `git log --oneline -1 <sha>` × {114f0a8,866e5bf,9129969,d2ced75,17bffd8,68cd4dc} | 全在 main（via c63fc47 PR #7）| ✅ |
| 9 | **R1-R7 polish 多數未執行** | verification-truth | `git log 9129969..HEAD -- src/components/landing/Hero.tsx RoleTabs.tsx ReconciliationCard.tsx` | 僅 reorg move（`73c424a`），無 rework commit → R1/R4 等 **open** | ✅（backlog confirmed open）|
| 10 | OOS dashboard 杜撰名仍在（tech-debt）| verification-truth | `grep -rln 大樂司\|... src/components/` | 4 檔：UserManagement / invoice-manager / delivery-map / delivery-list | ✅（debt 確認 open）|

**Drift detection**: none. No `P-PACKET-DRIFT`。

---

## §1-2 Inventory + Classify (9-class)

| # | Durable knowledge | 9-class | Promotion target | Status |
|---|-------------------|---------|------------------|--------|
| 1 | v1 landing/marketing redesign（12 區塊、dark mode、新頁、零死連結）| `wire-contract` / frontend code | `src/components/landing/` + `src/app/(marketing)/` = source of truth（unchanged after merge）| n/a（code on main）|
| 2 | §7 P0 backlog（清地雷 + hero 修正 + ERP 卡 + footer）| `business-requirement` (design) | **已 implemented**；competitive-analysis status banner 標 P0 done | ✅ banner |
| 3 | R1-R7 post-v1 設計 polish critique（Hero rework / motion / rhythm / RoleTabs mock / contact layout / auth redesign / real photo）| `business-requirement` (design backlog) | **competitive-analysis §9**（done/open 標註；paste-ready prompt 留 git）| ✅ promoted |
| 4 | OOS dashboard mock 杜撰客戶名（4 檔）| `tech-debt-with-exit-trigger` | **deprecation-roadmap DR-005** | ✅ promoted |
| 5 | P1/P2 marketing backlog（/faq /about /solution 頁、真實 logo、CRM/email）| `business-requirement` | **已 homed** in competitive-analysis §7 P1/P2 | n/a（不重複）|
| 6 | 紀律（禁捏造客戶名、示意標記、真實定價、零死連結、hero 授權）| operational-rule | 已是 repo CLAUDE.md + 全域規則 | n/a |
| 7 | execution log / 7 codex rounds / post-exec audit / Round 7 approval | `transient-execution-state` | DELETE（git 保存）| ✅ |
| 8 | closeout | `closeout-summary` | **governance-ledger** | ✅ promoted |

## §3-4 Promote + Rewrite References

- competitive-analysis-cocomart.md：status banner（P0 done + reorg path 提醒）+ §9 R1-R7 backlog + 路徑提醒。
- deprecation-roadmap DR-005（dashboard 杜撰名）。
- governance-ledger closeout row。
- `docs/plans/README.md`：public-pages row → retired pointer。

## §5 Disposition

`rm -rf docs/plans/20260607-public-pages-redesign/`。無 KEEP 條件：code done+merged、handoff 自承「無已知阻擋 merge 的剩餘項」、R1-R7 為 future backlog（非 active code work）。git history 保存全檔（含 paste-ready Codex prompts）。

## Note — competitive-analysis stale paths

competitive-analysis §6/§7/§相關檔案 仍引用 pre-reorg / 已刪路徑（`components/HeroSection.tsx` 等）。已加 status banner 標示為實作前狀態，未逐行重寫（避免 scope creep）。若日後該 canonical doc 要全面對齊現行 `src/` 結構，屬獨立 doc-accuracy task。
