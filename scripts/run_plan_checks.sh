#!/usr/bin/env bash
set -euo pipefail

PLAN_FILE=${PLAN_FILE:-plan.md}
PROJECT_ID=${PROJECT_ID:-orderly-472413}
REGION=${REGION:-asia-east1}
ENVIRONMENT=${ENV:-staging}
SERVICE_SUFFIX=${SERVICE_SUFFIX:-}
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-5433}
DB_NAME=${DB_NAME:-orderly}
DB_USER=${DB_USER:-orderly}
PGPASSWORD=${PGPASSWORD:?"PGPASSWORD 未設定，請 export PGPASSWORD=..."}
RUN_HOST_SUFFIX=${RUN_HOST_SUFFIX:?"請設定 RUN_HOST_SUFFIX，例如 655602747430"}

append_log() {
  local header="$1"
  local cmd="$2"
  local status="$3"
  local output="$4"
  {
    echo "#### ${header}"
    echo "- 指令：\`${cmd}\`"
    echo "- 狀態：${status}"
    echo "- 輸出："
    echo '```'
    echo "${output}"
    echo '```'
    echo
  } >>"${PLAN_FILE}"
}

run_step() {
  local header="$1"
  shift
  local cmd="$*"
  local output
  if output=$(eval "$cmd" 2>&1); then
    append_log "$header" "$cmd" "成功" "$output"
  else
    append_log "$header" "$cmd" "失敗" "$output"
    echo "[錯誤] ${header} 失敗，已將輸出寫入 ${PLAN_FILE}" >&2
    exit 1
  fi
}

echo "=== 執行 staging 驗證流程 ==="

# Step 1: 環境與服務檢查
run_step "步驟 1：環境與服務檢查" \
  "ENV=${ENVIRONMENT} SERVICE_SUFFIX=${SERVICE_SUFFIX} ./scripts/db/diag.sh"

# Step 2：Cloud Run 日誌蒐集
run_step "步驟 2：產品服務日誌" \
  "gcloud logging read 'resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"orderly-product-service-fastapi-${ENVIRONMENT}${SERVICE_SUFFIX}\"' --project=${PROJECT_ID} --limit=50 --format=\"value(textPayload)\""

run_step "步驟 2：供應商服務日誌" \
  "gcloud logging read 'resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"orderly-supplier-service-fastapi-${ENVIRONMENT}${SERVICE_SUFFIX}\"' --project=${PROJECT_ID} --limit=50 --format=\"value(textPayload)\""

run_step "步驟 2：客戶層級服務日誌" \
  "gcloud logging read 'resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"orderly-customer-hierarchy-service-fastapi-${ENVIRONMENT}${SERVICE_SUFFIX}\"' --project=${PROJECT_ID} --limit=50 --format=\"value(textPayload)\""

# Step 3：資料筆數確認
SQL_QUERY=$(cat <<'SQL'
SELECT 'users' AS table, COUNT(*) FROM users
UNION ALL SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL SELECT 'business_units', COUNT(*) FROM business_units
UNION ALL SELECT 'customer_companies', COUNT(*) FROM customer_companies
UNION ALL SELECT 'customer_groups', COUNT(*) FROM customer_groups
UNION ALL SELECT 'product_categories', COUNT(*) FROM product_categories
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'product_skus', COUNT(*) FROM product_skus
UNION ALL SELECT 'supplier_product_skus', COUNT(*) FROM supplier_product_skus
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
ORDER BY 1;
SQL
)
SQL_FILE=$(mktemp)
trap 'rm -f "$SQL_FILE"' EXIT
printf '%s\n' "$SQL_QUERY" >"$SQL_FILE"
run_step "步驟 3：資料筆數確認" \
  "PGPASSWORD='${PGPASSWORD}' psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ${SQL_FILE}"

# Step 4：API 與 Gateway 驗證
run_step "步驟 4：service-map" \
  "curl -s https://orderly-api-gateway-fastapi-${ENVIRONMENT}${SERVICE_SUFFIX}-${RUN_HOST_SUFFIX}.asia-east1.run.app/service-map | jq"

run_step "步驟 4：ready" \
  "curl -s https://orderly-api-gateway-fastapi-${ENVIRONMENT}${SERVICE_SUFFIX}-${RUN_HOST_SUFFIX}.asia-east1.run.app/ready"

run_step "步驟 4：產品 API" \
  "curl -s https://orderly-product-service-fastapi-${ENVIRONMENT}${SERVICE_SUFFIX}-${RUN_HOST_SUFFIX}.asia-east1.run.app/api/products/categories | jq '.data | length'"

run_step "步驟 4：客戶公司 API" \
  "curl -s https://orderly-api-gateway-fastapi-${ENVIRONMENT}${SERVICE_SUFFIX}-${RUN_HOST_SUFFIX}.asia-east1.run.app/api/customer-companies | jq '.data | length'"

run_step "步驟 4：供應商 API" \
  "curl -s https://orderly-api-gateway-fastapi-${ENVIRONMENT}${SERVICE_SUFFIX}-${RUN_HOST_SUFFIX}.asia-east1.run.app/api/suppliers | jq '.data | length'"

# Step 5：前端環境檢查
run_step "步驟 5：env-check" \
  "curl -s https://orderly-frontend-${ENVIRONMENT}${SERVICE_SUFFIX}-${RUN_HOST_SUFFIX}.asia-east1.run.app/api/env-check"

echo "\n=== 已將所有輸出附加至 ${PLAN_FILE}，請檢查步驟 6/7（資料匯入、報告整理）並手動補充。==="
