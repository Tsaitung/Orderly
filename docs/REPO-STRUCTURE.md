# Repository Structure 目錄地圖（單一事實來源）

本檔是 Orderly repo 目錄結構的**權威說明**，給人與未來的 AI agent 參考，避免重複「為什麼這個檔在這裡 / 能不能搬」的調查。
任何搬移、刪除、新增目錄後，請同步更新本檔。

> 黃金規則：**搬檔＝舊路徑被刪除**。動任何路徑前先 `grep -rn '<basename>'` 掃 `Makefile .github/ scripts/ Dockerfile* compose*.yml infra/service-manifest.yaml`，確認沒有 build / CI / deploy / script 引用，破壞性與刪檔相同。

## 頂層佈局

```
.
├── app/  components/  lib/  contexts/  hooks/  types/  public/  middleware.ts
│        # Next.js App Router 前端 —— [釘在 ROOT，不可移] 見下方「為何前端釘 root」
├── backend/              # FastAPI modular monolith
│   ├── app/              #   應用本體（app/modules/<svc>、app/requirements.txt）
│   ├── libs/             #   共用 orderly_fastapi_core
│   ├── Dockerfile.monolith
│   └── cloudbuild.monolith.yaml
├── shared/types/         # 跨服務 TS 型別契約（唯一仍在的 npm workspace 成員）
├── infra/                # 部署 / 基礎設施單一根（2026-06-09 由 4 散落目錄整併）
│   ├── terraform/        #   IaC（main.tf, variables.tf）—— 手動 apply，無 workflow 觸發
│   ├── env/              #   部署期 env 檔（production.env, staging.env）
│   ├── staging/          #   Cloud Run 服務 YAML + env-vars + schema baseline
│   └── service-manifest.yaml   # CI 服務相依宣告（被 scripts/ci/detect-changes.py 讀）
├── scripts/              # 自動化腳本（依用途分目錄，見下方「scripts 規約」）
├── tests/               # 整合 / 單元測試（unit/、integration/、dev-utils/）
├── e2e/                 # Playwright E2E —— [釘 testDir './e2e'，不可移]
├── docs/               # 文件單一事實來源（入口 docs/INDEX.md）
├── data/staging/v1/    # staging 資料快照 —— [.gcloudignore + scripts/database 相對路徑釘死]
├── .github/workflows/  # CI/CD（ci.yml, cd.yml, deploy-staging-permanent.yml…）
├── .specify/  specs/   # spec-kit 工作流（specs/<feature>/ 由 .specify 按需 mkdir）
└── 根設定檔             # next.config.js, tsconfig*.json, tailwind/jest/playwright/postcss,
                        # eslint/prettier, package.json, Makefile, compose.*.yml,
                        # Dockerfile.frontend*, cloudbuild-frontend.yaml —— 全部 [釘 root]
```

## 為何前端釘在 ROOT（不可移）

前端 runtime 目錄與根設定檔被四方同時釘死，硬搬會斷 build，收益低：

| 釘死來源 | 釘住什麼 |
|---|---|
| `tsconfig.json` `paths`（`@/* -> ./*`、`lib/*`） | `app/ components/ lib/ contexts/ hooks/ types/` |
| `next.config.js` webpack alias（`path.resolve(__dirname,…)`） | `lib/`、`@/` 解析 |
| `Dockerfile.frontend` `COPY . .` / `COPY public ./public` / `COPY app/apple-icon.png` | `app/ public/ package.json` |
| `.github/workflows/ci.yml` `dorny/paths-filter` | `app/** components/** lib/** middleware.ts tsconfig*.json …` |
| `cd.yml:453` `file: Dockerfile.frontend`、`cloudbuild-frontend.yaml`（root build context） | 前端 image 建置 |

要移動前端，必須**同步**改上述每一處 alias / COPY / filter，屬高風險，預設不做。

## scripts 規約

- **`scripts/` root**：只放 load-bearing 入口（被 CI / hooks / deploy 直接引用）：
  `ci/`（CI 共用腳本）、`database/`（遷移 / seed / schema）、`deploy-staging-permanent.sh`、
  `health-check-simple.sh`、`health-check-all.sh`、`check-doc-references.sh`、
  `run_plan_checks.sh`、`test-redis-connection.sh`。
- **`scripts/dev/`**：一次性開發 / 測試便利腳本（無 CI 引用）。
- **`scripts/validation/`**：設定驗證工具（compose / yaml / 部署前 secret 檢查）。
- **`scripts/perf/`**：效能 / 相容性測試（JS）。
- **`scripts/cloudbuild/` `scripts/iam/`**：Cloud Build 設定 / SA bootstrap —— load-bearing。

> 注意同名陷阱：`health-check-simple.sh`（load-bearing, cd.yml 引用）≠ `dev/`（無）；
> `deploy-staging-permanent.sh`（load-bearing）≠ `dev/docker-deploy.sh`。

## 2026-06-09 reorg 紀要

由散落整併（git mv 保留 history，所有引用同步更新）：

- 孤兒 root 檔歸位：`CICD-init-guide.md`、`plan.md`→`docs/3-Development-Plan/STATUS-SUMMARY.md`、
  `test-super-admin.js`→`tests/dev-utils/`、`cleanup-validate.sh`→`scripts/validation/`、
  `scripts/performance-*.js`→`scripts/perf/`。
- 刪 dead shell：`frontend/`（僅含廢棄 cloudbuild.yaml）、`specs/.workflow-confirmations.json`、
  obsolete `scripts/*.sql`（已被 Alembic + seed_from_real_data.py 取代）。
- 15 支一次性腳本 → `scripts/dev/`。
- `package.json` workspaces 清掉 9 個已不存在的 `backend/*-service-fastapi`（backend 已 re-root 成 monolith）。
- infra 整併：`infrastructure/` + `deploy/` + `ci/` + `configs/staging/` → 單一 `infra/`。
