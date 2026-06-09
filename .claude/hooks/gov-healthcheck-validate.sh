#!/bin/bash
# Governance Health-Check Validate — PostToolUse Hook
# Ported from sibling repo helloglow-doc-governance for orderly-doc-governance.
# 當 agent 寫入 docs/plans/health-check-*.md 時，驗證必填欄位是否齊全。
# 不匹配的檔案直接放行。

set -euo pipefail

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# 只驗證 health-check output 檔案
if [[ "$FILE_PATH" != *docs/plans/health-check-*.md ]]; then
  exit 0
fi

# 檔案不存在（不太可能，Write 後觸發）→ 放行
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

CONTENT=$(cat "$FILE_PATH")

# === 必填欄位檢查 ===
REQUIRED_PATTERNS=(
  "## Governance Run Summary"
  "\\*\\*Mode\\*\\*:"
  "\\*\\*Scope\\*\\*:"
  "\\*\\*Findings\\*\\*:"
  "\\*\\*Content Residency\\*\\*"
  "\\*\\*Actionable Items\\*\\*:"
  "\\*\\*Blockers\\*\\*:"
  "\\*\\*Recommended Next Step\\*\\*:"
  "\\*\\*Persisted To\\*\\*:"
)

MISSING=""
for pattern in "${REQUIRED_PATTERNS[@]}"; do
  if ! echo "$CONTENT" | grep -qE "$pattern"; then
    # 提取人類可讀的欄位名稱
    FIELD=$(echo "$pattern" | sed 's/\\//g' | sed 's/\*//g' | sed 's/##//' | xargs)
    MISSING="${MISSING}\n  - ${FIELD}"
  fi
done

if [ -n "$MISSING" ]; then
  MSG="Governance health-check output 缺少必填欄位：${MISSING}\n\n請補齊後再寫入。參考 SKILL.md Mode Completion Protocol。"
  printf '%s' "$(echo -e "$MSG" | jq -Rs '{decision: "block", reason: .}')"
  exit 2
fi

# === 進階驗證：Content Residency table 格式 ===
# 檢查是否有 ownership breakdown table header
if ! echo "$CONTENT" | grep -qE "\| *File *\| *Status *\| *Ownership Breakdown"; then
  # 可能 scope 不含 docs/plans/，檢查是否有豁免標記
  if echo "$CONTENT" | grep -qE "Content Residency.*N/A\|Content Residency.*not applicable"; then
    exit 0
  fi
  MSG="Governance health-check output 缺少 Content Residency inline table（File | Status | Ownership Breakdown | ...）。\n若 scope 不含 docs/plans/ 檔案，請在 Content Residency 欄位標記 N/A。"
  printf '%s' "$(echo -e "$MSG" | jq -Rs '{decision: "block", reason: .}')"
  exit 2
fi

# 檢查 Guard Result 欄位值
if ! echo "$CONTENT" | grep -qE "pass|fail|carve-out"; then
  MSG="Governance health-check Content Residency table 缺少有效的 Guard Result（必須為 pass / fail / carve-out）。"
  printf '%s' "$(echo "$MSG" | jq -Rs '{decision: "block", reason: .}')"
  exit 2
fi

exit 0
