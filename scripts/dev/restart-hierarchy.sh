#!/usr/bin/env bash
set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔁 Rebuilding and restarting Customer Hierarchy stack...${NC}"

if ! command -v docker-compose >/dev/null 2>&1; then
  echo -e "${RED}❌ docker-compose not found. Install Docker Desktop and retry.${NC}"
  exit 1
fi

echo -e "${BLUE}🏗  Building images (hierarchy, gateway, frontend)...${NC}"
docker-compose build customer-hierarchy-service api-gateway frontend

echo -e "${BLUE}🚀 Starting services...${NC}"
docker-compose up -d customer-hierarchy-service api-gateway frontend

echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"

wait_http() {
  local url="$1"; local name="$2"; local max=60; local i=0
  until curl -sf "$url" >/dev/null 2>&1; do
    i=$((i+1));
    if [ $i -ge $max ]; then
      echo -e "${RED}❌ $name not responding at $url${NC}"
      return 1
    fi
    sleep 1
  done
  echo -e "${GREEN}✅ $name ready (${url})${NC}"
}

wait_http "http://localhost:3007/health" "Customer Hierarchy"
wait_http "http://localhost:8000/health" "API Gateway"
wait_http "http://localhost:3000" "Frontend"

echo -e "${BLUE}🧪 Verifying hierarchy endpoints...${NC}"
set +e
svc_resp=$(curl -s -w "\n%{http_code}" http://localhost:3007/api/v2/hierarchy/tree)
svc_body=$(echo "$svc_resp" | sed '$d')
svc_code=$(echo "$svc_resp" | tail -n1)

gw_resp=$(curl -s -w "\n%{http_code}" http://localhost:8000/api/v2/hierarchy/tree)
gw_body=$(echo "$gw_resp" | sed '$d')
gw_code=$(echo "$gw_resp" | tail -n1)
set -e

echo -e "${YELLOW}Service (3007) status:${NC} $svc_code"
echo "$svc_body" | head -c 400 || true; echo
echo -e "${YELLOW}Gateway (8000) status:${NC} $gw_code"
echo "$gw_body" | head -c 400 || true; echo

if [ "$svc_code" != "200" ] || [ "$gw_code" != "200" ]; then
  echo -e "${RED}❌ Verification failed. Check logs:${NC}"
  echo -e "docker-compose logs -f customer-hierarchy-service"
  echo -e "docker-compose logs -f api-gateway"
  exit 2
fi

echo -e "${GREEN}🎉 Restart complete. Frontend should now load the hierarchy tree.${NC}"

