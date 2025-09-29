#!/usr/bin/env bash
set -Eeuo pipefail

REGION="${REGION:-asia-east1}"
PROJECT_ID="${PROJECT_ID:-orderly-472413}"
SERVICE_PRIMARY="${SERVICE_PRIMARY:-orderly-customer-hierarchy-staging}"
SERVICE_SECONDARY="${SERVICE_SECONDARY:-orderly-custhier-staging-v2}"
REPORT_FILE="${REPORT_FILE:-diagnostic-report-$(date +%Y%m%d%H%M%S).log}"
LOCAL_PORT="${LOCAL_PORT:-54329}"
DB_ENGINE="${DB_ENGINE:-postgres}"

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*"; }
section() { printf '\n===== %s =====\n' "$1"; }

describe_env() {
  local svc=$1
  gcloud run services describe "$svc" \
    --platform=managed \
    --region "$REGION" \
    --format="json(spec.template.spec.containers[0].env)" | \
  python3 - "$svc" <<'PY'
import json, sys
data = json.load(sys.stdin) or []
for item in data:
    name = item.get("name")
    if not name:
        continue
    if "value" in item:
        print(f"{name}={item['value']}")
    elif item.get("valueSource") and item["valueSource"].get("secretRef"):
        ref = item["valueSource"]["secretRef"]
        print(f"{name}=<secret:{ref.get('secret','unknown')}/{ref.get('version','latest')}>")
    elif item.get("valueFrom") and item["valueFrom"].get("secretKeyRef"):
        ref = item["valueFrom"]["secretKeyRef"]
        print(f"{name}=<secret:{ref.get('name','unknown')}/{ref.get('key','value')}>")
    else:
        print(f"{name}=<unhandled>")
PY
}

tmp_primary="$(mktemp)"
tmp_secondary="$(mktemp)"
cleanup() {
  [[ -n "${proxy_pid:-}" ]] && kill "${proxy_pid}" 2>/dev/null || true
  rm -f "$tmp_primary" "$tmp_secondary"
}
trap cleanup EXIT

touch "$REPORT_FILE"
exec > >(tee "$REPORT_FILE") 2>&1

section "Context"
log "Project: ${PROJECT_ID:-<unset>}"
log "Region: ${REGION}"
log "Primary service: ${SERVICE_PRIMARY}"
log "Secondary service: ${SERVICE_SECONDARY}"
log "Report file: ${REPORT_FILE}"

section "Checking Cloud Run service presence"
services=$(gcloud run services list --platform=managed --region "$REGION" --format="value(metadata.name)")
if grep -Fxq "$SERVICE_SECONDARY" <<<"$services"; then
  log "'$SERVICE_SECONDARY' service exists."
else
  log "ERROR: '$SERVICE_SECONDARY' service not found."
fi

section "Comparing environment variables"
if ! gcloud run services describe "$SERVICE_PRIMARY" --platform=managed --region "$REGION" --format="value(status.address.url)" >/dev/null 2>&1; then
  log "Skipping comparison: failed to describe primary service."
else
  describe_env "$SERVICE_PRIMARY" | sort >"$tmp_primary"
  log "Captured $(wc -l <"$tmp_primary") env entries from $SERVICE_PRIMARY."
fi
if ! gcloud run services describe "$SERVICE_SECONDARY" --platform=managed --region "$REGION" --format="value(status.address.url)" >/dev/null 2>&1; then
  log "Skipping comparison: failed to describe secondary service."
else
  describe_env "$SERVICE_SECONDARY" | sort >"$tmp_secondary"
  log "Captured $(wc -l <"$tmp_secondary") env entries from $SERVICE_SECONDARY."
fi

if [[ -s "$tmp_primary" && -s "$tmp_secondary" ]]; then
  log "Diff (primary only):"
  comm -23 "$tmp_primary" "$tmp_secondary" || true
  log "Diff (secondary only):"
  comm -13 "$tmp_primary" "$tmp_secondary" || true
fi

extract_env_value() {
  local key=$1 file=$2
  grep -E "^${key}=" "$file" | head -n1 | cut -d= -f2-
}

connection_name=""
if [[ -s "$tmp_secondary" ]]; then
  connection_name=$(extract_env_value "DB_CONNECTION_NAME" "$tmp_secondary")
  [[ -z "$connection_name" ]] && connection_name=$(extract_env_value "INSTANCE_CONNECTION_NAME" "$tmp_secondary")
  [[ "$connection_name" == \<secret:* ]] && connection_name=""
fi
[[ -z "$connection_name" && -n "${INSTANCE:-}" ]] && connection_name="$INSTANCE"

section "Cloud SQL instance status"
if [[ -z "$connection_name" ]]; then
  log "Unable to determine connection name. Set INSTANCE or DB_CONNECTION_NAME env when running."
else
  IFS=':' read -r sql_project sql_region sql_instance <<<"$connection_name"
  sql_project=${sql_project:-$PROJECT_ID}
  if [[ -z "$sql_instance" ]]; then
    log "Connection name '$connection_name' malformed."
  else
    log "Inspecting instance '$sql_instance' in project '${sql_project:-<unset>}'"
    gcloud sql instances describe "$sql_instance" --project "$sql_project" \
      --format="table(name,state,region,ipAddresses.ipAddress,settings.activationPolicy,backendType,availabilityType)"
  fi
fi

section "Testing database connectivity"
if ! command -v cloud_sql_proxy >/dev/null 2>&1 && ! command -v cloud-sql-proxy >/dev/null 2>&1; then
  log "cloud_sql_proxy not installed; skipping connectivity test."
elif [[ -z "$connection_name" ]]; then
  log "No connection name available; skipping connectivity test."
else
  proxy_cmd=""
  if command -v cloud_sql_proxy >/dev/null 2>&1; then
    proxy_cmd="cloud_sql_proxy"
  else
    proxy_cmd="cloud-sql-proxy"
  fi
  log "Starting Cloud SQL Proxy on 127.0.0.1:${LOCAL_PORT}"
  "${proxy_cmd}" -instances="${connection_name}=tcp:${LOCAL_PORT}" >/tmp/cloud-sql-proxy.log 2>&1 &
  proxy_pid=$!
  sleep 3
  if ! kill -0 "$proxy_pid" >/dev/null 2>&1; then
    log "Proxy failed to start. Check /tmp/cloud-sql-proxy.log"
  else
    db_user="${DB_USER:-$(extract_env_value DB_USER "$tmp_secondary")}"
    db_name="${DB_NAME:-$(extract_env_value DB_NAME "$tmp_secondary")}"
    db_pass="${DB_PASSWORD:-}"
    [[ "$db_user" == \<secret:* ]] && db_user=""
    [[ "$db_name" == \<secret:* ]] && db_name=""
    [[ -z "$db_name" ]] && db_name="postgres"
    if [[ $DB_ENGINE == "postgres" ]]; then
      if ! command -v psql >/dev/null 2>&1; then
        log "psql not available; cannot test Postgres connection."
      elif [[ -z "$db_user" || -z "$db_pass" ]]; then
        log "DB_USER/DB_PASSWORD required for Postgres test; skipping query."
      else
        log "Attempting psql connectivity check..."
        PGPASSWORD="$db_pass" psql "host=127.0.0.1 port=${LOCAL_PORT} dbname=${db_name} user=${db_user}" -c '\conninfo'
      fi
    elif [[ $DB_ENGINE == "mysql" ]]; then
      if ! command -v mysql >/dev/null 2>&1; then
        log "mysql client not available; cannot test MySQL connection."
      elif [[ -z "$db_user" || -z "$db_pass" ]]; then
        log "DB_USER/DB_PASSWORD required for MySQL test; skipping query."
      else
        log "Attempting mysql connectivity check..."
        mysql --host=127.0.0.1 --port="${LOCAL_PORT}" --user="${db_user}" --password="${db_pass}" --database="${db_name}" --execute="SELECT NOW();"
      fi
    else
      log "Unsupported DB_ENGINE '${DB_ENGINE}'; set to 'postgres' or 'mysql'."
    fi
    kill "$proxy_pid" >/dev/null 2>&1 || true
    proxy_pid=""
  fi
fi

section "Report complete"
log "Detailed log saved to ${REPORT_FILE}"
