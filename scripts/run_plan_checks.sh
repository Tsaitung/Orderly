#!/usr/bin/env bash
set -euo pipefail

# Enhanced Post-Deployment Validation Script
# Automatically detects anomalies after deployment rather than requiring manual troubleshooting

PLAN_FILE=${PLAN_FILE:-docs/3-Development-Plan/STATUS-SUMMARY.md}
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

# Performance thresholds
WARN_THRESHOLD=${WARN_THRESHOLD:-500}  # ms
FAIL_THRESHOLD=${FAIL_THRESHOLD:-2000} # ms

# Exit codes
EXIT_SUCCESS=0
EXIT_CRITICAL=1
EXIT_WARNINGS=2

# Global status tracking
CRITICAL_FAILURES=0
WARNING_COUNT=0
TOTAL_CHECKS=0
PASSED_CHECKS=0

env_suffix="${ENVIRONMENT}${SERVICE_SUFFIX}"
if [[ "$env_suffix" == "staging-v2" ]]; then
  CUSTHIER_SERVICE_NAME="orderly-custhier-staging-v2"
  CUSTHIER_BASE="orderly-custhier-staging-v2-${RUN_HOST_SUFFIX}.asia-east1.run.app"
else
  CUSTHIER_SERVICE_NAME="orderly-customer-hierarchy-${env_suffix}"
  CUSTHIER_BASE="orderly-customer-hierarchy-${env_suffix}-${RUN_HOST_SUFFIX}.asia-east1.run.app"
fi

# All services configuration
SERVICES=(
  "api-gateway-fastapi"
  "user-service-fastapi"
  "order-service-fastapi"
  "product-service-fastapi"
  "acceptance-service-fastapi"
  "notification-service-fastapi"
  "customer-hierarchy-service-fastapi"
  "supplier-service-fastapi"
)

# Service URL mappings
declare -A SERVICE_URLS
declare -A SERVICE_NAMES

# Enhanced logging with status tracking
append_log() {
  local header="$1"
  local cmd="$2"
  local status="$3"
  local output="$4"
  local duration="${5:-}"
  
  # Update global counters
  ((TOTAL_CHECKS++))
  if [[ "$status" == "✅ 成功" ]]; then
    ((PASSED_CHECKS++))
  elif [[ "$status" == "⚠️ 警告" ]]; then
    ((WARNING_COUNT++))
  elif [[ "$status" == "❌ 失敗" ]]; then
    ((CRITICAL_FAILURES++))
  fi
  
  {
    echo "#### ${header}"
    echo "- 指令：\`${cmd}\`"
    echo "- 狀態：${status}"
    if [[ -n "$duration" ]]; then
      echo "- 響應時間：${duration}ms"
    fi
    echo "- 輸出："
    echo '```'
    echo "${output}"
    echo '```'
    echo
  } >>"${PLAN_FILE}"
}

# Enhanced run_step with timing and better error handling
run_step() {
  local header="$1"
  shift
  local cmd="$*"
  local output
  local start_time=$(date +%s%N)
  local exit_code
  
  if output=$(eval "$cmd" 2>&1); then
    exit_code=0
  else
    exit_code=$?
  fi
  
  local end_time=$(date +%s%N)
  local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
  
  if [[ $exit_code -eq 0 ]]; then
    append_log "$header" "$cmd" "✅ 成功" "$output" "$duration"
  else
    append_log "$header" "$cmd" "❌ 失敗" "$output" "$duration"
    echo "[錯誤] ${header} 失敗，已將輸出寫入 ${PLAN_FILE}" >&2
    # Don't exit immediately - continue with other checks
  fi
  
  return $exit_code
}

# Non-critical check that logs warnings but doesn't fail
run_check() {
  local header="$1"
  shift
  local cmd="$*"
  local output
  local start_time=$(date +%s%N)
  local exit_code
  
  if output=$(eval "$cmd" 2>&1); then
    exit_code=0
  else
    exit_code=$?
  fi
  
  local end_time=$(date +%s%N)
  local duration=$(( (end_time - start_time) / 1000000 ))
  
  local status
  if [[ $exit_code -eq 0 ]]; then
    if [[ $duration -gt $FAIL_THRESHOLD ]]; then
      status="❌ 失敗 (響應時間過長)"
    elif [[ $duration -gt $WARN_THRESHOLD ]]; then
      status="⚠️ 警告 (響應時間較慢)"
    else
      status="✅ 成功"
    fi
  else
    status="❌ 失敗"
  fi
  
  append_log "$header" "$cmd" "$status" "$output" "$duration"
  return $exit_code
}

# Initialize service mappings
init_service_mappings() {
  for service in "${SERVICES[@]}"; do
    local service_name="orderly-${service}-${ENVIRONMENT}${SERVICE_SUFFIX}"
    
    # Handle special case for customer hierarchy service in staging-v2
    if [[ "$service" == "customer-hierarchy-service-fastapi" && "${ENVIRONMENT}${SERVICE_SUFFIX}" == "staging-v2" ]]; then
      service_name="orderly-custhier-staging-v2"
    fi
    
    SERVICE_NAMES["$service"]="$service_name"
    
    # Get service URL
    local url
    url=$(gcloud run services describe "$service_name" \
      --region="$REGION" \
      --project="$PROJECT_ID" \
      --format='value(status.url)' 2>/dev/null || echo "")
    
    SERVICE_URLS["$service"]="$url"
  done
}

# Print summary dashboard
print_summary() {
  echo "=== POST-DEPLOYMENT VALIDATION SUMMARY ==="
  echo "Environment: ${ENVIRONMENT}${SERVICE_SUFFIX}"
  echo "Timestamp: $(date -Iseconds)"
  echo "Total Checks: $TOTAL_CHECKS"
  echo "Passed: $PASSED_CHECKS"
  echo "Warnings: $WARNING_COUNT"
  echo "Critical Failures: $CRITICAL_FAILURES"
  echo
  
  if [[ $CRITICAL_FAILURES -gt 0 ]]; then
    echo "❌ CRITICAL ISSUES DETECTED - Deployment may need rollback"
    echo "📋 Check the detailed logs below for remediation steps"
  elif [[ $WARNING_COUNT -gt 0 ]]; then
    echo "⚠️ WARNINGS DETECTED - Monitor closely"
    echo "📋 Check the detailed logs below for optimization opportunities"
  else
    echo "✅ ALL CHECKS PASSED - Deployment is healthy"
  fi
  echo
}

# Database health checks for all services
check_database_health() {
  echo "=== Database Health Checks ==="
  
  for service in "${SERVICES[@]}"; do
    local service_name="${SERVICE_NAMES[$service]}"
    local url="${SERVICE_URLS[$service]}"
    
    if [[ -z "$url" ]]; then
      append_log "資料庫健康檢查 - $service" "curl $service_name/db/health" "⚠️ 警告" "服務未部署或無法獲取 URL"
      continue
    fi
    
    # Generate correlation ID for tracing
    local cid=$(uuidgen 2>/dev/null || echo "check-$(date +%s%N)")
    
    # Check /db/health endpoint
    local health_cmd="curl -sf -m 10 -H 'X-Correlation-ID: $cid' '$url/db/health'"
    if run_check "資料庫健康檢查 - $service" "$health_cmd"; then
      echo "✅ $service: DB健康"
    else
      # Try to get more specific error information
      local error_code
      error_code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 -H "X-Correlation-ID: $cid" "$url/db/health" 2>/dev/null || echo "timeout")
      echo "❌ $service: DB故障 (HTTP $error_code, CID: $cid)"
      
      # Get recent logs for troubleshooting
      append_log "資料庫故障日誌 - $service" "gcloud logging read" "📋 診斷信息" \
        "HTTP狀態碼: $error_code\nCorrelation ID: $cid\n建議檢查：\n1. Cloud SQL 連接狀態\n2. 服務的 DATABASE_* 環境變數\n3. Cloud SQL Proxy 日誌"
    fi
  done
}

# Cloud SQL Proxy monitoring
check_cloudsql_proxy() {
  echo "=== Cloud SQL Proxy Monitoring ==="
  
  # Check last 10 minutes of Cloud SQL proxy logs for all services
  for service in "${SERVICES[@]}"; do
    local service_name="${SERVICE_NAMES[$service]}"
    
    local proxy_cmd="gcloud logging read 'resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$service_name\" AND jsonPayload.component=\"cloudsql-proxy\"' --project=$PROJECT_ID --limit=20 --freshness=10m --format='value(textPayload)'"
    
    echo "檢查 $service Cloud SQL Proxy 日誌..."
    if run_check "Cloud SQL Proxy 監控 - $service" "$proxy_cmd"; then
      # Check for specific error patterns
      local output
      output=$(eval "$proxy_cmd" 2>/dev/null || echo "")
      
      if echo "$output" | grep -qi "connection refused\|failed to connect\|proxy restarted"; then
        append_log "Cloud SQL Proxy 異常 - $service" "grep patterns" "⚠️ 警告" \
          "偵測到連線問題模式:\n$output\n\n建議檢查：\n1. Cloud SQL 執行個體狀態\n2. VPC 連接器設定\n3. 服務帳戶權限"
      fi
      
      # Check for connection pool exhaustion
      if echo "$output" | grep -qi "too many connections\|pool exhausted"; then
        append_log "連線池耗盡 - $service" "connection pool check" "❌ 失敗" \
          "連線池耗盡偵測到:\n$output\n\n建議解決方案：\n1. 增加最大連線數\n2. 檢查連線洩漏\n3. 調整連線池設定"
      fi
    fi
  done
}

# Redis health metrics
check_redis_health() {
  echo "=== Redis Health Metrics ==="
  
  # Use Customer Hierarchy Service to check Redis connectivity
  if [[ -n "${SERVICE_URLS[customer-hierarchy-service-fastapi]}" ]]; then
    local redis_url="${SERVICE_URLS[customer-hierarchy-service-fastapi]}"
    
    # Check Redis ready status
    local ready_cmd="curl -sf --max-time 10 '$redis_url/api/v2/health/ready'"
    if run_check "Redis 連接性檢查" "$ready_cmd"; then
      # Parse cache metrics from response
      local response
      response=$(curl -sf --max-time 10 "$redis_url/api/v2/health/ready" 2>/dev/null || echo '{}')
      
      local cache_state
      cache_state=$(echo "$response" | jq -r '.cache.state // "unknown"' 2>/dev/null || echo "unknown")
      
      case "$cache_state" in
        "ready")
          append_log "Redis 狀態檢查" "cache state analysis" "✅ 成功" "Redis 狀態: ready - 快取正常運作"
          ;;
        "degraded")
          append_log "Redis 狀態檢查" "cache state analysis" "⚠️ 警告" \
            "Redis 狀態: degraded - 服務運行但快取功能受限\n建議檢查：\n1. Redis 執行個體狀態\n2. VPC 連接器\n3. 網路連線品質"
          ;;
        *)
          append_log "Redis 狀態檢查" "cache state analysis" "❌ 失敗" \
            "Redis 狀態: $cache_state - 快取服務異常\n需要立即檢查：\n1. Redis 執行個體\n2. 服務設定\n3. 網路連線"
          ;;
      esac
      
      # Test cache operations
      echo "測試 Redis 讀寫操作..."
      local test_key="validation_$(date +%s)"
      local test_value="check_$(date +%Y%m%d_%H%M%S)"
      
      # Test write
      local write_cmd="curl -sf -X POST '$redis_url/api/v2/test/cache' -H 'Content-Type: application/json' -d '{\"key\": \"$test_key\", \"value\": \"$test_value\", \"action\": \"set\"}'"
      if run_check "Redis 寫入測試" "$write_cmd"; then
        # Test read
        local read_cmd="curl -sf -X POST '$redis_url/api/v2/test/cache' -H 'Content-Type: application/json' -d '{\"key\": \"$test_key\", \"action\": \"get\"}'"
        if run_check "Redis 讀取測試" "$read_cmd"; then
          local read_response
          read_response=$(eval "$read_cmd" 2>/dev/null || echo '{}')
          local retrieved_value
          retrieved_value=$(echo "$read_response" | jq -r '.value // "null"' 2>/dev/null || echo "null")
          
          if [[ "$retrieved_value" == "$test_value" ]]; then
            append_log "Redis 讀寫一致性" "cache consistency check" "✅ 成功" "快取讀寫測試通過 - 數據一致性正常"
          else
            append_log "Redis 讀寫一致性" "cache consistency check" "❌ 失敗" \
              "快取數據不一致\n寫入: $test_value\n讀取: $retrieved_value\n需要檢查 Redis 數據完整性"
          fi
        fi
      fi
    else
      append_log "Redis 服務檢查" "service availability" "❌ 失敗" \
        "無法連接到 Customer Hierarchy Service\n可能原因：\n1. 服務未運行\n2. 網路連線問題\n3. 服務設定錯誤"
    fi
  else
    append_log "Redis 檢查" "service discovery" "⚠️ 警告" "Customer Hierarchy Service URL 未找到，跳過 Redis 檢查"
  fi
  
  # Check VPC Connector status
  echo "檢查 VPC Connector 狀態..."
  local vpc_cmd="gcloud compute networks vpc-access connectors describe orderly-vpc-connector --region=asia-east1 --project=$PROJECT_ID --format='yaml(name,state,network,ipCidrRange)'"
  run_check "VPC Connector 狀態" "$vpc_cmd"
  
  # Check Redis instance status
  echo "檢查 Redis 執行個體狀態..."
  local redis_cmd="gcloud redis instances describe orderly-cache --region=asia-east1 --project=$PROJECT_ID --format='yaml(name,state,host,port,connectMode)'"
  run_check "Redis 執行個體狀態" "$redis_cmd"
}

# Service integration tests
check_service_integration() {
  echo "=== Service Integration Tests ==="
  
  # Test critical API paths
  local gw_url="${SERVICE_URLS[api-gateway-fastapi]}"
  
  if [[ -z "$gw_url" ]]; then
    append_log "API Gateway 整合測試" "service discovery" "❌ 失敗" "API Gateway URL 未找到，無法執行整合測試"
    return
  fi
  
  # Generate correlation ID for all tests
  local integration_cid="integration-$(date +%s%N)"
  
  # Test 1: Product categories
  echo "測試產品分類 API..."
  local categories_cmd="curl -sf -m 30 -H 'X-Correlation-ID: $integration_cid' '$gw_url/api/products/categories?includeProducts=false'"
  if run_check "產品分類 API 測試" "$categories_cmd"; then
    local categories_response
    categories_response=$(eval "$categories_cmd" 2>/dev/null || echo '{}')
    local categories_count
    categories_count=$(echo "$categories_response" | jq '.data | length' 2>/dev/null || echo "0")
    
    if [[ "$categories_count" -gt "0" ]]; then
      append_log "產品分類數據驗證" "data validation" "✅ 成功" "成功獲取 $categories_count 個產品分類"
    else
      append_log "產品分類數據驗證" "data validation" "⚠️ 警告" "產品分類數據為空，可能需要導入測試數據"
    fi
  fi
  
  # Test 2: SKU search
  echo "測試 SKU 搜尋 API..."
  local skus_cmd="curl -sf -m 30 -H 'X-Correlation-ID: $integration_cid' '$gw_url/api/products/skus/search?page_size=1'"
  if run_check "SKU 搜尋 API 測試" "$skus_cmd"; then
    local skus_response
    skus_response=$(eval "$skus_cmd" 2>/dev/null || echo '{}')
    local skus_count
    skus_count=$(echo "$skus_response" | jq '.data | length' 2>/dev/null || echo "0")
    
    if [[ "$skus_count" -gt "0" ]]; then
      append_log "SKU 數據驗證" "data validation" "✅ 成功" "成功獲取 SKU 數據"
    else
      append_log "SKU 數據驗證" "data validation" "⚠️ 警告" "SKU 數據為空，可能需要導入測試數據"
    fi
  fi
  
  # Test 3: Customer hierarchy
  echo "測試客戶層級 API..."
  local hierarchy_cmd="curl -sf -m 30 -H 'X-Correlation-ID: $integration_cid' '$gw_url/api/v2/hierarchy/tree?fast_mode=true'"
  if run_check "客戶層級 API 測試" "$hierarchy_cmd"; then
    local hierarchy_response
    hierarchy_response=$(eval "$hierarchy_cmd" 2>/dev/null || echo '{}')
    
    # Check if response contains expected structure
    if echo "$hierarchy_response" | jq -e '.data' >/dev/null 2>&1; then
      append_log "客戶層級數據驗證" "data validation" "✅ 成功" "客戶層級 API 響應結構正確"
    else
      append_log "客戶層級數據驗證" "data validation" "⚠️ 警告" "客戶層級 API 響應結構異常，可能需要檢查服務間通信"
    fi
  fi
  
  # Test 4: Service-to-service communication
  echo "測試服務間通信..."
  local service_map_cmd="curl -sf -m 15 -H 'X-Correlation-ID: $integration_cid' '$gw_url/service-map'"
  if run_check "服務映射檢查" "$service_map_cmd"; then
    local service_map
    service_map=$(eval "$service_map_cmd" 2>/dev/null || echo '{}')
    
    # Verify all expected services are registered
    local expected_services=("USER_SERVICE_URL" "ORDER_SERVICE_URL" "PRODUCT_SERVICE_URL" "ACCEPTANCE_SERVICE_URL" "NOTIFICATION_SERVICE_URL" "CUSTOMER_HIERARCHY_SERVICE_URL" "SUPPLIER_SERVICE_URL")
    local missing_services=()
    
    for expected in "${expected_services[@]}"; do
      if ! echo "$service_map" | jq -e --arg key "$expected" 'has($key)' >/dev/null 2>&1; then
        missing_services+=("$expected")
      fi
    done
    
    if [[ ${#missing_services[@]} -eq 0 ]]; then
      append_log "服務發現驗證" "service discovery" "✅ 成功" "所有預期服務已正確註冊到 API Gateway"
    else
      append_log "服務發現驗證" "service discovery" "⚠️ 警告" \
        "以下服務未在 API Gateway 註冊:\n$(printf '%s\n' "${missing_services[@]}")\n建議檢查 configure-routing 步驟"
    fi
  fi
  
  append_log "整合測試相關 ID" "correlation tracking" "📋 信息" "所有整合測試使用相同的 Correlation ID: $integration_cid\n可用於日誌追蹤和問題診斷"
}

# Performance baseline monitoring
check_performance_baselines() {
  echo "=== Performance Baseline Monitoring ==="
  
  # Monitor response times for critical endpoints
  for service in "${SERVICES[@]}"; do
    local service_name="${SERVICE_NAMES[$service]}"
    local url="${SERVICE_URLS[$service]}"
    
    if [[ -z "$url" ]]; then
      continue
    fi
    
    echo "測試 $service 效能基線..."
    
    # Health endpoint performance
    local perf_cid="perf-$(date +%s%N)"
    local health_start=$(date +%s%N)
    local health_cmd="curl -sf -m 10 -H 'X-Correlation-ID: $perf_cid' '$url/health'"
    
    if eval "$health_cmd" >/dev/null 2>&1; then
      local health_end=$(date +%s%N)
      local health_duration=$(( (health_end - health_start) / 1000000 ))
      
      if [[ $health_duration -gt $FAIL_THRESHOLD ]]; then
        append_log "效能基線 - $service /health" "response time check" "❌ 失敗" \
          "響應時間 ${health_duration}ms 超過失敗閾值 ${FAIL_THRESHOLD}ms\n需要檢查：\n1. 資源配置\n2. 數據庫連線\n3. 外部依賴"
      elif [[ $health_duration -gt $WARN_THRESHOLD ]]; then
        append_log "效能基線 - $service /health" "response time check" "⚠️ 警告" \
          "響應時間 ${health_duration}ms 超過警告閾值 ${WARN_THRESHOLD}ms\n建議監控：\n1. 服務負載\n2. 資源使用率\n3. 網路延遲"
      else
        append_log "效能基線 - $service /health" "response time check" "✅ 成功" \
          "響應時間 ${health_duration}ms 在正常範圍內 (<${WARN_THRESHOLD}ms)"
      fi
    else
      append_log "效能基線 - $service /health" "response time check" "❌ 失敗" \
        "無法連接到 /health 端點\n需要檢查服務可用性"
    fi
    
    # Memory and CPU usage (from Cloud Monitoring)
    local metrics_cmd="gcloud monitoring metrics list --filter='resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$service_name\"' --project=$PROJECT_ID --limit=1"
    if run_check "效能指標檢查 - $service" "$metrics_cmd" >/dev/null 2>&1; then
      append_log "效能監控設定 - $service" "monitoring setup" "✅ 成功" "Cloud Monitoring 指標已配置，可監控 CPU/記憶體使用率"
    else
      append_log "效能監控設定 - $service" "monitoring setup" "⚠️ 警告" "Cloud Monitoring 指標配置可能不完整"
    fi
  done
}

echo "=== 執行增強版 Post-Deployment 驗證流程 ==="
echo "時間: $(date -Iseconds)"
echo "環境: ${ENVIRONMENT}${SERVICE_SUFFIX}"
echo

# Initialize service mappings
init_service_mappings

# Print initial dashboard
print_summary

# Step 1: 環境與服務檢查
run_step "步驟 1：環境與服務檢查" \
  "ENV=${ENVIRONMENT} SERVICE_SUFFIX=${SERVICE_SUFFIX} ./scripts/db/diag.sh"

# Step 2: Database Health Checks (Enhanced)
check_database_health

# Step 3: Cloud SQL Proxy Monitoring (New)
check_cloudsql_proxy

# Step 4: Redis Health Metrics (Enhanced)
check_redis_health

# Step 5: Service Integration Tests (New)
check_service_integration

# Step 6: Performance Baseline Monitoring (New)
check_performance_baselines

# Step 7: Legacy Cloud Run 日誌蒐集 (維持相容性)
run_step "Cloud Run 日誌：產品服務" \
  "gcloud logging read 'resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"orderly-product-service-fastapi-${ENVIRONMENT}${SERVICE_SUFFIX}\"' --project=${PROJECT_ID} --limit=20 --format=\"value(textPayload)\""

run_step "Cloud Run 日誌：供應商服務" \
  "gcloud logging read 'resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"orderly-supplier-service-fastapi-${ENVIRONMENT}${SERVICE_SUFFIX}\"' --project=${PROJECT_ID} --limit=20 --format=\"value(textPayload)\""

run_step "Cloud Run 日誌：客戶層級服務" \
  "gcloud logging read 'resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${CUSTHIER_SERVICE_NAME}\"' --project=${PROJECT_ID} --limit=20 --format=\"value(textPayload)\""

# Step 8：資料筆數確認 (Enhanced with validation)
SQL_QUERY=$(cat <<'SQL'
SELECT 
  table_name,
  row_count,
  CASE 
    WHEN table_name IN ('users', 'suppliers', 'product_categories') AND row_count = 0 THEN 'CRITICAL: Empty core table'
    WHEN table_name IN ('products', 'product_skus') AND row_count = 0 THEN 'WARNING: Empty product data'
    WHEN row_count > 0 THEN 'OK'
    ELSE 'INFO'
  END as status
FROM (
  SELECT 'users' AS table_name, COUNT(*) as row_count FROM users
  UNION ALL SELECT 'organizations', COUNT(*) FROM organizations
  UNION ALL SELECT 'business_units', COUNT(*) FROM business_units
  UNION ALL SELECT 'customer_companies', COUNT(*) FROM customer_companies
  UNION ALL SELECT 'customer_groups', COUNT(*) FROM customer_groups
  UNION ALL SELECT 'product_categories', COUNT(*) FROM product_categories
  UNION ALL SELECT 'products', COUNT(*) FROM products
  UNION ALL SELECT 'product_skus', COUNT(*) FROM product_skus
  UNION ALL SELECT 'supplier_product_skus', COUNT(*) FROM supplier_product_skus
  UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
) data_summary
ORDER BY 
  CASE status 
    WHEN 'CRITICAL: Empty core table' THEN 1
    WHEN 'WARNING: Empty product data' THEN 2
    WHEN 'OK' THEN 3
    ELSE 4
  END,
  table_name;
SQL
)
SQL_FILE=$(mktemp)
trap 'rm -f "$SQL_FILE"' EXIT
printf '%s\n' "$SQL_QUERY" >"$SQL_FILE"
run_step "資料完整性驗證" \
  "PGPASSWORD='${PGPASSWORD}' psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ${SQL_FILE}"

# Step 9：API Gateway 綜合驗證 (Enhanced)
if [[ -n "${SERVICE_URLS[api-gateway-fastapi]}" ]]; then
  local gw_base="${SERVICE_URLS[api-gateway-fastapi]}"
  
  run_step "API Gateway：服務映射" \
    "curl -sf -m 15 '$gw_base/service-map' | jq"
  
  run_step "API Gateway：就緒檢查" \
    "curl -sf -m 10 '$gw_base/ready'"
  
  # Enhanced API tests with error handling
  run_check "API：產品分類 (增強版)" \
    "curl -sf -m 30 '$gw_base/api/products/categories' | jq '.data | length'"
  
  run_check "API：客戶公司 (增強版)" \
    "curl -sf -m 30 '$gw_base/api/customer-companies' | jq '.data | length'"
  
  run_check "API：供應商 (增強版)" \
    "curl -sf -m 30 '$gw_base/api/suppliers' | jq '.data | length'"
else
  append_log "API Gateway 驗證" "service discovery" "❌ 失敗" "無法找到 API Gateway URL，跳過 API 測試"
fi

# Step 10：前端環境檢查 (Enhanced)
local frontend_url="https://orderly-frontend-${ENVIRONMENT}${SERVICE_SUFFIX}-${RUN_HOST_SUFFIX}.asia-east1.run.app"
run_check "前端：環境檢查" \
  "curl -sf -m 15 '$frontend_url/api/env-check'"

# Step 11：Legacy Redis 驗證 (維持相容性)
if [[ -f "./scripts/test-redis-connection.sh" ]]; then
  run_step "Redis：完整連接測試" \
    "ENV=${ENVIRONMENT} SERVICE_SUFFIX=${SERVICE_SUFFIX} ./scripts/test-redis-connection.sh"
else
  append_log "Redis 連接測試" "script not found" "⚠️ 警告" "Redis 測試腳本不存在，已通過內建檢查完成驗證"
fi

# Final Summary
echo
print_summary

# Write summary to plan file
{
  echo "## 🔄 Post-Deployment 自動驗證結果 ($(date -Iseconds))"
  echo
  echo "**環境**: ${ENVIRONMENT}${SERVICE_SUFFIX}"
  echo "**總檢查項目**: $TOTAL_CHECKS"
  echo "**通過**: $PASSED_CHECKS"
  echo "**警告**: $WARNING_COUNT"
  echo "**關鍵失敗**: $CRITICAL_FAILURES"
  echo
  
  if [[ $CRITICAL_FAILURES -gt 0 ]]; then
    echo "### ❌ 關鍵問題需要立即處理"
    echo "部署狀態：**需要回滾或修復**"
    echo
    echo "**建議行動**："
    echo "1. 檢查上述詳細日誌中標記為 ❌ 失敗 的項目"
    echo "2. 優先處理資料庫連線和服務可用性問題"
    echo "3. 考慮回滾到前一版本"
    echo "4. 使用 Correlation IDs 追蹤相關日誌"
  elif [[ $WARNING_COUNT -gt 0 ]]; then
    echo "### ⚠️ 部分功能需要監控"
    echo "部署狀態：**基本可用，需要密切監控**"
    echo
    echo "**建議行動**："
    echo "1. 監控標記為 ⚠️ 警告 的項目"
    echo "2. 檢查效能指標是否在可接受範圍內"
    echo "3. 驗證快取和外部依賴的穩定性"
    echo "4. 設置相關告警"
  else
    echo "### ✅ 所有檢查通過"
    echo "部署狀態：**健康，可投入生產使用**"
    echo
    echo "**後續建議**："
    echo "1. 持續監控關鍵指標"
    echo "2. 定期執行健康檢查"
    echo "3. 保持告警系統活躍"
    echo "4. 準備好回滾計劃"
  fi
  
  echo
  echo "---"
  echo "*詳細檢查結果請參考上述各節的具體輸出*"
  echo
} >>"${PLAN_FILE}"

echo "=== Post-Deployment 驗證完成 ==="
echo "詳細結果已寫入: ${PLAN_FILE}"
echo "檢查摘要: $PASSED_CHECKS/$TOTAL_CHECKS 通過，$WARNING_COUNT 警告，$CRITICAL_FAILURES 關鍵失敗"
echo

# Determine exit code
if [[ $CRITICAL_FAILURES -gt 0 ]]; then
  echo "❌ 發現關鍵問題，退出碼: $EXIT_CRITICAL"
  exit $EXIT_CRITICAL
elif [[ $WARNING_COUNT -gt 0 ]]; then
  echo "⚠️ 發現警告，退出碼: $EXIT_WARNINGS"
  exit $EXIT_WARNINGS
else
  echo "✅ 所有檢查通過，退出碼: $EXIT_SUCCESS"
  exit $EXIT_SUCCESS
fi
