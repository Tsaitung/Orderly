# ADR-0001: Docs governance alignment (numbered taxonomy retained)

- **Type**: foundational
- **Lifecycle Status**: accepted
- **Date**: 2026-06-09
- **Cluster**: —
- **Primary PRD**: —
- **FR References**: —
- **US References**: —
- **Supersedes / Superseded By**: —
- **Review By**: —

## Context

Orderly `docs/` 採**編號式**頂層命名（`0-Design` / `1-User-Story` / `2-PRD` /
`3-Development-Plan` / `4-Test`），提供閱讀順序。sibling repo HelloGlow 有成熟的 repo-local
文檔治理 skill（`helloglow-doc-governance`）與 hook-level enforcement，但採**扁平**命名
（topic 資料夾不帶數字編號）。Orderly 先前只能依賴較弱的全域 `doc-governance` router。

目標：讓 Orderly 取得與 HelloGlow 同等的文檔治理能力（authority chain、FSM、P-codes、
stage gates、harvest plan-residency、hook enforcement），但**不犧牲** Orderly 既有的編號 taxonomy
與已合併的目錄重整（file-reorg PR #13）。

## Decision

1. **保留 Orderly 既有的編號式頂層命名**（`0-Design` / `1-User-Story` / `2-PRD` /
   `3-Development-Plan` / `4-Test`）。**不**改名為 HelloGlow 的扁平命名——扁平改名會回退 `main`
   已合併的 file-reorg 並破壞全 repo 引用，淨損大於跨 repo 一致性的收益。
2. 將 `helloglow-doc-governance` 移植為 repo-local skill `orderly-doc-governance`
   （1 SKILL + 9 references + 6 templates + 4 evals），所有路徑 / 詞彙 / 模組編號 re-point 為
   Orderly 的**編號** taxonomy 與**模組化單體**後端（`backend/app/modules/<svc>/`）。
3. 新增治理 canonical homes：`docs/adr/`、`docs/governance/`、`docs/references/`、
   `docs/incidents/`、`docs/governance/governance-ledger.md`，並把 `business-invariants.md` 收於
   `docs/0-Design/`。
4. 加入三個治理 hook（`harvest-evidence-gate.sh`、`gov-healthcheck-gate.sh`、
   `gov-healthcheck-validate.sh`）於 `.claude/hooks/`，並於 **`.claude/settings.json`**（repo-shared）
   接線，使治理 gate 真正生效（非僅 prose）。
5. 全域 `doc-governance` skill 在 Orderly repo 內降為 router/fallback，優先使用 `orderly-doc-governance`。

## Consequences

- (+) 取得 drift 偵測、authority-chain 對齊、harvest plan-residency、ownerless-decision 防呆等治理能力。
- (+) 保留編號頂層的閱讀順序；不回退 file-reorg，不破壞既有引用。
- (+) 三個 hook 於 `.claude/settings.json` 接線（repo-shared，跨環境一致），治理 gate 為實際 enforcement。
- (−) 與 HelloGlow 的資料夾命名仍不一致；跨 repo 移植 skill 時需做一次 path re-point（本 skill 已完成）。
- (分界) 長存 curated 開發文件住 `docs/3-Development-Plan/`；`docs/plans/` 只放 governance run-state
  （dated `{run-id}/` 子目錄、`governance-ledger.md`、`runbooks/`、`health-check-*.md`、`README.md`）。
  此分界寫入 `.claude/skills/orderly-doc-governance/references/project-paths.md`；Content Residency /
  harvest 規則只作用於 `docs/plans/` 治理產物，不得瘦身或刪除 `docs/3-Development-Plan/` 的 curated 文件。

## Alternatives Considered

- **A：改名為 HelloGlow 式扁平命名（把編號頂層改成不帶編號的 topic 資料夾）+ 同步全 repo 引用** — rejected：
  會回退 `main` 已合併的 file-reorg（PR #13），破壞既有 build / CI / docs 引用，淨損大於跨 repo 命名一致性。
- **B：保留編號命名 + 僅用全域 router**（精簡 adapter）— rejected：無法取得完整 hook-level enforcement
  與 authority-chain / harvest plan-residency 能力。
- **採用（本 ADR）：保留編號命名 + 移植 repo-local skill 並 re-point** — 取兩者之長：保留 Orderly 結構，
  同時取得 HelloGlow 等級的治理能力。
