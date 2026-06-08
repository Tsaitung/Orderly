#!/bin/bash
# Quick BFF Endpoint Test Script

BASE_URL="https://orderly-api-gateway-fastapi-staging-655602747430.asia-east1.run.app"

echo "🔍 Testing BFF Endpoints Status"
echo "================================"
echo ""

echo "1. Testing /api/bff/products/skus/search:"
curl -s "$BASE_URL/api/bff/products/skus/search?page_size=1" | jq '.' | head -5
echo ""

echo "2. Testing /api/bff/products/stats:"
curl -s "$BASE_URL/api/bff/products/stats" | jq '.' | head -5
echo ""

echo "3. Testing /api/bff/v2/hierarchy/tree:"
curl -s "$BASE_URL/api/bff/v2/hierarchy/tree" | jq '.' | head -5
echo ""

echo "================================"
echo "📊 Summary:"
echo ""

# Test each endpoint and show status
if curl -s "$BASE_URL/api/bff/products/skus/search?page_size=1" | grep -q "Not Found"; then
    echo "❌ /api/bff/products/skus/search - NOT IMPLEMENTED (404)"
else
    echo "✅ /api/bff/products/skus/search - Available"
fi

if curl -s "$BASE_URL/api/bff/products/stats" | grep -q "Not Found"; then
    echo "❌ /api/bff/products/stats - NOT IMPLEMENTED (404)"
else
    echo "✅ /api/bff/products/stats - Available"
fi

if curl -s "$BASE_URL/api/bff/v2/hierarchy/tree" | grep -q "Not Found"; then
    echo "❌ /api/bff/v2/hierarchy/tree - NOT IMPLEMENTED (404)"
else
    echo "✅ /api/bff/v2/hierarchy/tree - Available"
fi

echo ""
echo "🔍 Database Connection Issue:"
echo "⚠️  Products and Categories APIs have database auth errors"
echo "   This is a separate issue from BFF endpoints"