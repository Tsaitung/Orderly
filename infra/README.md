# infra/ — 部署與基礎設施單一根

2026-06-09 由原本散落的 `infrastructure/` + `deploy/` + `ci/` + `configs/staging/` 整併而來。

| 子項 | 內容 | 消費者 |
|---|---|---|
| `terraform/` | Terraform IaC（`main.tf`, `variables.tf`） | 手動 `cd infra/terraform && terraform apply`，無 workflow 自動觸發 |
| `env/` | 部署期 env 檔（`production.env`, `staging.env`） | （目前無自動消費者；保留供手動 / 未來使用） |
| `staging/` | Cloud Run 服務 YAML、`env-vars.yaml`、schema baseline、`database/` | `scripts/deploy-staging-permanent.sh`、`scripts/database/sync-schema.sh`、`scripts/ci/validate-deployment.sh`、`scripts/ci/cleanup-github-secrets.sh` |
| `service-manifest.yaml` | CI 服務相依 / 觸發宣告 | `scripts/ci/detect-changes.py` |

> `staging/` 採 `infra/<environment>/` 結構：`scripts/ci/validate-deployment.sh` 以 `infra/${environment}/env-vars.yaml` 取用，未來新增 production 設定請建 `infra/production/`。
> 動這裡的路徑前，先 grep `scripts/` 與 `.github/workflows/` 確認引用同步更新。
