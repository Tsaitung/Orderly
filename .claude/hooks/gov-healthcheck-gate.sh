#!/bin/bash
# Governance Health-Check Gate — Stop Hook
# Ported from sibling repo helloglow-doc-governance for orderly-doc-governance.
# Session 結束時，檢查是否有未完成的 governance health-check。
# 若 .claude/.gov-healthcheck-scope marker 存在但無對應 output → 阻擋。

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
MARKER="${PROJECT_DIR}/.claude/.gov-healthcheck-scope"

# 沒有 marker → 本次 session 沒有 governance health-check → 放行
if [ ! -f "$MARKER" ]; then
  exit 0
fi

# Marker 存在 → 檢查 health-check output 是否已產出
TODAY=$(date +"%Y-%m-%d")
OUTPUT_FILE="${PROJECT_DIR}/docs/plans/health-check-${TODAY}.md"

if [ ! -f "$OUTPUT_FILE" ]; then
  # 也檢查是否有其他日期的 health-check（避免跨午夜）
  YESTERDAY=$(date -v-1d +"%Y-%m-%d" 2>/dev/null || date -d "yesterday" +"%Y-%m-%d" 2>/dev/null || echo "")
  if [ -n "$YESTERDAY" ] && [ -f "${PROJECT_DIR}/docs/plans/health-check-${YESTERDAY}.md" ]; then
    # 跨午夜場景，昨天的 output 也算
    rm -f "$MARKER"
    exit 0
  fi

  SCOPE=$(cat "$MARKER")
  MSG="Governance health-check 已啟動但未產出結果檔案。\n\n"
  MSG="${MSG}Scope: ${SCOPE}\n"
  MSG="${MSG}預期產出: docs/plans/health-check-${TODAY}.md\n\n"
  MSG="${MSG}請完成 health-check 並 Write 結果到上述路徑，包含完整的 Governance Run Summary 與 Content Residency table。"

  printf '%s' "$(echo -e "$MSG" | jq -Rs '{decision: "block", reason: .}')"
  exit 2
fi

# Output 存在 → 清理 marker → 放行
rm -f "$MARKER"
exit 0
