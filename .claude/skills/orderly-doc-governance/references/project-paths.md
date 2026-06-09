# Orderly Project Paths

Orderly-specific 路徑、命名規則、scope 定義。

> 背景：Orderly `docs/` 在 2026-06-06 由編號式（`0-Design` / `1-User-Story` / `2-PRD` /
> `3-Development-Plan` / `4-Test`）改名為與 sibling repo HelloGlow 一致的扁平命名
> （`system-spec` / `user-stories` / `prd` / `plans` / `testing` + 新增 `adr`）。

## Paths

- User Stories: `docs/user-stories/by-module/`（另有 `by-role/`、`playbooks/`）
- PRD: `docs/prd/`（檔名為 `PRD-*.md`，**具名而非編號**）
- System / Design specs: `docs/system-spec/`（topic 文件 + `design-system/`）
- API contract: `docs/system-spec/api-specification.yaml`、`docs/system-spec/API-Endpoints-Essential.md`、`docs/system-spec/Frontend-Backend-Endpoint-Consistency.md`
- ADR: `docs/adr/`
- Testing plans: `docs/testing/`
- Derived surfaces:
  - `docs/INDEX.md`（總入口）
  - 各區 `docs/<area>/INDEX.md`（`system-spec` / `user-stories` / `prd` / `plans` / `testing`）
  - `docs/testing/*.md` 的 coverage/status 鏡像欄位
  - （derived-surface candidate，尚未存在）跨模組 traceability mapping 表

> Orderly 沒有 HelloGlow 的 `docs/module-map.md` / `docs/USER_STORIES.md` /
> `docs/USER_STORY_MAPPING.md` / `docs/testing/test-mapping-matrix.md`。navigation 以
> `docs/INDEX.md` + 各區 `INDEX.md` 為準；上述 mapping 表若日後建立即視為 derived surface。

## Naming Rules

- Module file pattern（US by-module）：`NN-*.md`（NN = `01`..`09`）
- PRD file pattern：`PRD-*.md`（具名，例 `PRD-Billing-Master.md`、`PRD-Auth-Module.md`）
- ADR file pattern：`ADR-NNN-*.md`
- Scope IDs:
  - module: `01`..`09`，或對應 slug（`auth` / `product` / `order` / `acceptance` / `billing` / `customer-hierarchy` / `onboarding` / `referral` / `erp`）
  - ADR cluster: freeform slug，例 `billing`、`order`、`auth`、`product`
  - derived-only: explicit derived surface slug，例 `docs-index`、`prd-index`、`us-index`
  - path-list / artifact-family: explicit file list 或 glob-like family，僅供 inspect-only / harvest，例 `docs/plans/*.md`

### Module ID 對照

| ID | slug | 域 |
|----|------|----|
| 01 | auth | auth / user / tenant / identity |
| 02 | product | product / SKU / category / pricing |
| 03 | order | order lifecycle / state machine |
| 04 | acceptance | acceptance / receiving / 驗收 |
| 05 | billing | billing / settlement / reconciliation / invoicing |
| 06 | customer-hierarchy | customer hierarchy / org tree |
| 07 | onboarding | onboarding process |
| 08 | referral | referral system |
| 09 | erp | ERP integration |

## Repo Artifact Roles

- `canonical-truth`
  - `docs/user-stories/`
  - `docs/prd/`
  - `docs/system-spec/`
  - `docs/adr/`
- `active-operating-state`
  - active run local:
    - `docs/plans/**/run.md`
    - `docs/plans/**/handoff.md`
  - repo navigation for active runs:
    - `docs/plans/README.md`
- `promoted-durable-knowledge`
  - `docs/references/` — active promoted knowledge（on demand；Orderly 尚未建立）
  - `docs/references/history/` — archived residue from completed governance runs（historical-only）
  - `docs/plans/runbooks/`（Orderly 目前 `docs/plans/Infra-Runbook.md` 在根層；新 runbook 進 `runbooks/`）
  - `docs/plans/governance-ledger.md`
- `curated-durable-doc`（Orderly-specific）
  - `docs/plans/` 根層的開發計畫文件（`CI-CD-ARCHITECTURE.md`、`DEPLOYMENT-*.md`、`DEVELOPMENT-PLAN.md`、`ci-secrets.md`、`PERFORMANCE-OPTIMIZATION-SUMMARY.md`、`PRD-US-GAP-REPORT.md` 等）
  - 這些是**長存 curated 文件**，不是 ephemeral governance run；治理 run-state 只住在 dated `{run-id}/` 子目錄 + `health-check-*.md` + `governance-ledger.md`
- `transient-work-artifact`
  - `docs/plans/{date}-*/compact/*.md`
  - `docs/plans/{date}-*/*packet*.md`
  - scoped review / rewrite artifacts under `docs/plans/{date}-*/`
  - raw audit / verification artifacts before promotion

> **重要分界**：HelloGlow `docs/plans/` 幾乎全是 ephemeral run packet。Orderly `docs/plans/`
> 根層同時放**長存的開發計畫 curated 文件**。Content Residency / harvest 規則只針對 dated
> `{run-id}/` 子目錄與治理產物，**不得**把根層 curated 開發文件當成 plan packet 來瘦身或刪除。

## Knowledge Ownership Types

兩層分類並存：**broader 5 類**（high-level lens）+ **fine-grained 9 類**（harvest mode 強制使用，因為 5 類粒度不足以決定 promotion target）。

### Broader Categories (Legacy 5-class)

舊 governance run 的 ledger entry 沿用此分類；保留為 high-level lens：

- `execution-sequencing`
- `canonical-business-truth`
- `technical-contract-truth`
- `reusable-operational-rule`
- `historical-evidence`

判斷規則：

- `canonical-business-truth` → `docs/prd/`, `docs/adr/`, `docs/references/`
- `technical-contract-truth` → `docs/system-spec/`, `docs/system-spec/api-specification.yaml`
- `reusable-operational-rule` → `docs/plans/runbooks/`, skill `references/`
- `historical-evidence` → `docs/plans/governance-ledger.md`（closeout index）或 `docs/references/history/`（archived residue files）

### Fine-grained 9-class (Harvest Mode)

當執行 `harvest` mode（plan packet 退役）時，必須用以下 9 類做 classify。完整定義 + Orderly 落點見 `references/plan-residency.md` §Knowledge Classes：

| 9-class | 對應 broader category | Orderly 落點（簡） |
|---|---|---|
| `naming-canonical` | canonical-business-truth | `docs/references/canonical-vocabulary.md` / `docs/references/doc-governance-vocabulary.yaml`（on demand）|
| `architectural-decision-frozen` | canonical-business-truth | `docs/adr/ADR-NNN-*.md`（含真正 trade-off 才升格 ADR；外部平台限制不算）|
| `tech-debt-with-exit-trigger` | reusable-operational-rule | `docs/governance/deprecation-roadmap.md`（on demand）|
| `operator-procedure` | reusable-operational-rule | `docs/plans/runbooks/*.md` |
| `incident-postmortem` | historical-evidence | `docs/incidents/{YYYY-MM-DD}-{slug}.md`（on demand）|
| `business-requirement` | canonical-business-truth | US/PRD/Specs（走 `us-edit` handoff，不直接寫）|
| `wire-contract` | technical-contract-truth | `backend/<svc>-fastapi/app/{api,schemas,models}/` + `shared/types/` + `docs/system-spec/api-specification.yaml` |
| `closeout-summary` | historical-evidence | `docs/plans/governance-ledger.md` |
| `transient-execution-state` | execution-sequencing | DELETE（不 promote）|

> harvest mode 用 9 類做 promotion routing；ledger / inspect-only summary 可用 broader 5 類做 high-level summary。兩層並用不衝突。

### Backend Microservice 落點（wire-contract）

Orderly 後端為微服務；`wire-contract` class 的 source of truth 依服務分散：

`backend/<svc>-fastapi/app/{api,schemas,models}/`，其中 `<svc>` ∈
{`user`, `order`, `product`, `acceptance`, `billing`, `notification`, `customer-hierarchy`, `supplier`, `api-gateway`}；
跨服務共用 DTO 契約在 `shared/types/`。OpenAPI derived 由 `docs/system-spec/api-specification.yaml` 同步。

## Folder Prior Guidance

folder 只提供 discovery prior，不提供最終 authority。

- `docs/plans/{date}-*/` 預設應以 `execution-sequencing` 為主
- `docs/plans/` 根層 curated 開發文件預設為 `reusable-operational-rule` / `curated-durable-doc`
- `docs/references/` 預設應以 stable truth / reference 為主
- `docs/references/history/` 預設應以 archived historical residue 為主（不作為 active reference）
- `docs/system-spec/` 預設應以 technical contract / design 為主

若內容與 folder prior 不符，必須先走 `Content Ownership Extraction Gate`。

## Risk Levels

`high-risk`:
- full-governance
- 2+ modules in one run
- ADR mass rewrite or renumbering
- authority-chain or vocabulary schema changes

`low-risk`:
- single module
- single ADR cluster
- derived-only cleanup

## Existing Evidence To Reuse

（尚無既有治理 run。）開始新 run 前先掃 `docs/plans/` 是否有既有 governance run 或 alignment
plan（dated `{run-id}/` 子目錄、`governance-ledger.md`、`health-check-*.md`）；若 scope 與其重疊，
先讀再判斷是否能直接沿用 freeze 結果，不要再造第二套衝突的凍結判決。
