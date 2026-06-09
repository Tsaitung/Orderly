# ADR-0002: Hybrid GCP / Drive 身份綁定（tsaitung 身份 + orderly-472413 資源）

- **Type**: foundational
- **Lifecycle Status**: accepted
- **Date**: 2026-06-06
- **Cluster**: —
- **Primary PRD**: —
- **FR References**: —
- **US References**: —
- **Supersedes / Superseded By**: 部分逆轉 `~/.config/claude/DECISIONS.md` 2026-05-20 orderly-gcloud-config-created 的隔離設定
- **Review By**: —

## Context

Orderly 整體 refactor 中，要求本地開發的 GCP / Google Drive 身份「完全走 tsaitung agriculture 相同」，以便 drive / sheets / BQ 工具在 Orderly 內與在 tsaitung 系列 repo 內行為一致。

衝突點：Orderly 的 cloud 資源（Cloud SQL `orderly-db-v2`、Cloud Run 微服務、Artifact Registry）全部位於專屬 project `orderly-472413`。若把 core project 也改成 `tsaitung-bigquery`，等於 orphan 這些既有資源。且先前（2026-05-20）刻意給 Orderly 獨立 gcloud config 以避免 active project drift。

## Decision

採 **Hybrid（C）**：
- 帳號 / `gcloud config` / ADC / Drive remote → **tsaitung**（`CLOUDSDK_ACTIVE_CONFIG_NAME=tsaitung`、ADC=`legacy_credentials/yl@tsaitung.com/adc.json`、`RCLONE_GDRIVE_REMOTE=gdrive-tsaitung`）。
- core / quota project → **維持 `orderly-472413`**（`CLOUDSDK_CORE_PROJECT` / `GOOGLE_CLOUD_QUOTA_PROJECT`）。

裸 `gcloud` 預設帳號 = yl@tsaitung.com、預設 project = orderly-472413。drive/sheets/BQ 工具走 tsaitung 身份。cloud deploy/diag 腳本本就顯式帶 `--project`，不受影響。

## Consequences

- (+) 本地 drive/sheets/BQ 工具身份與 tsaitung 系列一致，符合需求。
- (+) Orderly cloud 資源（orderly-472413）不被 orphan，deploy 流程不變。
- (+) drift 風險由 `CLOUDSDK_CORE_PROJECT` env pin + scripts 顯式 `--project` 控制，取代原「獨立 config」隔離手段。
- (−) 「身份在 tsaitung、資源在 orderly-472413」是刻意的不對稱，需靠本 ADR + `.envrc` 註解說明，否則易誤解。
- (−) 依賴 `gdrive-tsaitung` rclone remote 與 tsaitung Drive token；本機若未設定 rclone remote 需另行配置（Drive MCP 走 `tokens-tsaitung.json`）。

## Alternatives Considered

- **A：完全綁 tsaitung（含 core project=tsaitung-bigquery）** — rejected：orphan Orderly 既有 cloud 資源（Cloud SQL / Cloud Run / Artifact Registry 在 orderly-472413）。
- **B：維持 orderly 獨立 account/config/project** — rejected：不符「完全走 tsaitung 相同 gcp/drive」需求。
