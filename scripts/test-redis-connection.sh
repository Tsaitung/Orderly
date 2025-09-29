#!/bin/bash
# Redis 連線測試腳本
# 用於驗證 staging 環境的 Redis 連線狀態

ENVIRONMENT="${ENV:-staging}"
HOST_SUFFIX="usg6y7o2ba-de.a.run.app"

if [[ "$ENVIRONMENT" == "staging-v2" ]]; then
  CUSTOMER_BASE="orderly-custhier-staging-v2-${HOST_SUFFIX}"
else
  CUSTOMER_BASE="orderly-customer-hierarchy-${ENVIRONMENT}-${HOST_SUFFIX}"
fi

CUSTOMER_BASE_URL="https://${CUSTOMER_BASE}"

echo "=== Redis Connection Test (${ENVIRONMENT}) ==="
echo "Date: $(date)"
echo ""

# 測試 Customer Hierarchy Service 的 Redis 連線
echo "1. Testing Customer Hierarchy Service Redis Connection:"
response=$(curl -s --max-time 10 "${CUSTOMER_BASE_URL}/api/v2/health/ready" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "$response" | jq -r '.cache // "No cache info"'
    
    # 檢查 cache 狀態
    cache_status=$(echo "$response" | jq -r '.cache.state // "unknown"')
    if [ "$cache_status" = "ready" ]; then
        echo "✅ Redis is connected and ready"
    elif [ "$cache_status" = "degraded" ]; then
        echo "⚠️ Redis is in degraded mode (connection issues)"
    else
        echo "❌ Redis status: $cache_status"
    fi
else
    echo "❌ Failed to reach service"
fi

echo ""
echo "2. Testing cache operations via API:"

# 測試快取寫入
test_key="test_$(date +%s)"
test_value="redis_test_$(date +%Y%m%d_%H%M%S)"

    echo "   Writing test value to cache..."
    write_response=$(curl -s -X POST \
    "${CUSTOMER_BASE_URL}/api/v2/test/cache" \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"$test_key\", \"value\": \"$test_value\", \"action\": \"set\"}" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "   Write response: $write_response"
    
    # 測試快取讀取
    echo "   Reading test value from cache..."
    read_response=$(curl -s -X POST \
        "${CUSTOMER_BASE_URL}/api/v2/test/cache" \
        -H "Content-Type: application/json" \
        -d "{\"key\": \"$test_key\", \"action\": \"get\"}" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "   Read response: $read_response"
        retrieved_value=$(echo "$read_response" | jq -r '.value // "null"')
        if [ "$retrieved_value" = "$test_value" ]; then
            echo "   ✅ Cache read/write test successful"
        else
            echo "   ❌ Cache test failed: value mismatch"
        fi
    else
        echo "   ❌ Failed to read from cache"
    fi
else
    echo "   ❌ Failed to write to cache"
fi

echo ""
echo "3. Checking VPC Connector status:"
gcloud compute networks vpc-access connectors describe orderly-vpc-connector \
    --region=asia-east1 \
    --project=orderly-472413 \
    --format="yaml(name,state,network,ipCidrRange)" 2>/dev/null || echo "   ❌ Failed to get VPC Connector info"

echo ""
echo "4. Checking Redis instance status:"
gcloud redis instances describe orderly-cache \
    --region=asia-east1 \
    --project=orderly-472413 \
    --format="yaml(name,state,host,port,connectMode)" 2>/dev/null || echo "   ❌ Failed to get Redis instance info"

echo ""
echo "=== Test Complete ==="
