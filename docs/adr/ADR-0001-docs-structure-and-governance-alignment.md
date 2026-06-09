# ADR-0001: Docs structure + governance alignment with sibling repo

- **Type**: foundational
- **Lifecycle Status**: accepted
- **Date**: 2026-06-06
- **Cluster**: —
- **Primary PRD**: —
- **FR References**: —
- **US References**: —
- **Supersedes / Superseded By**: —
- **Review By**: —

## Context

Orderly `docs/` 原採編號式頂層命名（`0-Design` / `1-User-Story` / `2-PRD` /
`3-Development-Plan` / `4-Test`），提供閱讀順序但與 sibling repo HelloGlow 的扁平命名不一致。
HelloGlow 已有成熟的 repo-local 文檔治理 skill（`helloglow-doc-governance`）與 hook-level
enforcement；Orderly 先前只能依賴較弱的全域 `doc-governance` router。

目標：讓 Orderly 擁有與 HelloGlow 一致的文檔治理能力（authority chain、FSM、P-codes、
stage gates、harvest plan-residency、hook enforcement），並讓兩 repo 使用同一套文檔資料夾命名，
降低跨 repo 心智負擔與 skill 移植成本。

## Decision

1. 將 `docs/` 頂層資料夾改名為與 HelloGlow 一致的扁平命名：
   `0-Design → system-spec`、`1-User-Story → user-stories`、`2-PRD → prd`、
   `3-Development-Plan → plans`、`4-Test → testing`，並新增 `docs/adr/`。
   改名以 `git mv` 進行（保留 history），同步更新全 repo 228 處引用。
2. 將 `helloglow-doc-governance` 忠實移植為 repo-local skill `orderly-doc-governance`
   （1 SKILL + 9 references + 6 templates + 4 evals），路徑 / 詞彙 / 模組編號改為 Orderly 版。
3. 加入三個治理 hook（`harvest-evidence-gate.sh`、`gov-healthcheck-gate.sh`、
   `gov-healthcheck-validate.sh`）於 `.claude/hooks/`，並於 `.claude/settings.local.json` 接線。
4. 全域 `doc-governance` skill 在 Orderly repo 內降為 router/fallback，優先使用 `orderly-doc-governance`。

## Consequences

- (+) 兩 repo 文檔結構與治理規則一致；skill 與規則可雙向沿用。
- (+) 取得 drift 偵測、authority-chain 對齊、harvest plan-residency、ownerless-decision 防呆等治理能力。
- (−) 失去頂層數字閱讀順序（改由 `docs/INDEX.md` 提供導覽順序）。
- (−) `docs/plans/` 現同時容納**長存 curated 開發文件**（CI-CD、deployment、dev plan 等）與
  **ephemeral governance run-state**（dated `{run-id}/` 子目錄）。此分界已寫入
  `.claude/skills/orderly-doc-governance/references/project-paths.md`，Content Residency / harvest
  規則只作用於 dated 子目錄與治理產物，不得瘦身或刪除根層 curated 文件。
- hook 腳本已 commit（repo-shared），但 `.claude/settings.local.json` 接線為 local-only，
  新環境需手動重接（見 skill 安裝說明）。

## Alternatives Considered

- **A：保留編號命名 + 僅用全域 router**（精簡 adapter）— rejected：與 HelloGlow 深度差最大，
  無法取得完整治理能力與跨 repo 一致性。
- **B：新增 `docs/adr/` 與 `docs/plans/` 但不改既有資料夾名** — rejected：使用者明確要求兩 repo
  採同一套命名系統，半套改名反而留下長期不一致。
