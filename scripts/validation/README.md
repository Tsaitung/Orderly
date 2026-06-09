# scripts/validation/ — 設定驗證工具

部署前 / 提交前的設定健全性檢查：

- `cleanup-validate.sh` — 檢查本機 `.secrets/*` 必要 secret 是否齊全（從 repo root 執行）。

這些是手動 / 開發期驗證工具（非 CI gate）。CI 端的驗證腳本在 `scripts/ci/`。

> 註：原 `validate-docker-compose.py` / `validate-yaml-syntax.py` 已隨 per-service 架構退役而移除（2026-06-09）；它們整支硬寫舊的 8 微服務拓撲，monolith 化後失效。通用配置驗證見 `scripts/env/validate-config.py`。
