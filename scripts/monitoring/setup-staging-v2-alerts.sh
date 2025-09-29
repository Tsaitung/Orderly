#!/usr/bin/env bash
# Configure Cloud Monitoring alerting policies for staging-v2.
#
# Enhanced monitoring policies for Orderly Platform staging-v2:
#   1. Cloud SQL connection failures (orderly-db-v2)
#   2. Cloud Run service health failures
#   3. Memorystore Redis memory usage (orderly-cache)
#   4. Cloud Run service error rates
#   5. Cloud Run service response latency
#   6. Cloud SQL CPU utilization
#   7. Cloud Run concurrent requests
#
# Requirements:
#   - gcloud SDK (>= 430)
#   - monitoring, logging, redis, run, sqladmin APIs enabled
#   - Caller must have roles/monitoring.alertPolicyEditor and roles/monitoring.notificationChannelEditor
#
# Usage:
#   GOOGLE_CLOUD_PROJECT=<project> \
#   REGION=asia-east1 \
#   NOTIFICATION_CHANNEL="projects/<project>/notificationChannels/<channel_id>" \
#   ./scripts/monitoring/setup-staging-v2-alerts.sh [--email your@email.com]

set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-${PROJECT_ID:-}}"
REGION="${REGION:-asia-east1}"
INSTANCE_NAME="${INSTANCE_NAME:-orderly-db-v2}" # Cloud SQL
CONNECTOR_NAME="${CONNECTOR_NAME:-orderly-vpc-connector}" # Serverless VPC Connector
REDIS_INSTANCE="${REDIS_INSTANCE:-orderly-cache}" # Memorystore instance id
CHANNELS="${NOTIFICATION_CHANNEL:-}" # Comma separated notification channels
EMAIL_ADDRESS="" # Will be set by command line args

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Cloud Run services for staging-v2 (with abbreviated names)
declare -a CLOUD_RUN_SERVICES=(
  "orderly-apigw-staging-v2"
  "orderly-user-staging-v2"
  "orderly-order-staging-v2"
  "orderly-product-staging-v2"
  "orderly-accept-staging-v2"
  "orderly-notify-staging-v2"
  "orderly-custhier-staging-v2"
  "orderly-supplier-staging-v2"
)

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --email)
      EMAIL_ADDRESS="$2"
      shift 2
      ;;
    --help|-h)
      echo "Setup Cloud Monitoring alerts for Orderly Platform staging-v2"
      echo ""
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --email EMAIL    Create email notification channel"
      echo "  --help           Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  GOOGLE_CLOUD_PROJECT    GCP project ID (required)"
      echo "  REGION                  GCP region (default: asia-east1)"
      echo "  NOTIFICATION_CHANNEL    Existing notification channels"
      echo ""
      echo "Examples:"
      echo "  $0 --email admin@orderly.com"
      echo "  GOOGLE_CLOUD_PROJECT=orderly-472413 $0"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$PROJECT_ID" ]]; then
  echo -e "${RED}[ERROR] GOOGLE_CLOUD_PROJECT (or PROJECT_ID) is required.${NC}" >&2
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo -e "${RED}[ERROR] gcloud CLI not found in PATH.${NC}" >&2
  exit 1
fi

# Print configuration
echo -e "${BLUE}=== Orderly Platform Monitoring Setup ===${NC}"
echo "Project:          $PROJECT_ID"
echo "Region:           $REGION"
echo "DB Instance:      $INSTANCE_NAME"
echo "VPC Connector:    $CONNECTOR_NAME"
echo "Redis Instance:   $REDIS_INSTANCE"
echo "Cloud Run Services: ${#CLOUD_RUN_SERVICES[@]} services"
echo "Email Address:    ${EMAIL_ADDRESS:-<none>}"
echo "Notification channels: ${CHANNELS:-<none>}"
echo

policy_tmp=$(mktemp)
trap 'rm -f "$policy_tmp"' EXIT

# Helper functions
print_error() {
  echo -e "${RED}❌ $1${NC}" >&2
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Create email notification channel if specified
create_email_notification_channel() {
  if [[ -n "$EMAIL_ADDRESS" ]]; then
    echo -e "${BLUE}=== Creating Email Notification Channel ===${NC}"
    
    local channel_name="orderly-staging-v2-alerts"
    local existing_channel
    existing_channel=$(gcloud alpha monitoring channels list \
      --format="value(name)" \
      --filter="displayName='$channel_name'" \
      --project="$PROJECT_ID" 2>/dev/null || echo "")
    
    if [[ -n "$existing_channel" ]]; then
      print_info "Email notification channel already exists: $existing_channel"
      CHANNELS="$existing_channel"
    else
      print_info "Creating email notification channel for: $EMAIL_ADDRESS"
      
      local channel_json=$(cat <<JSON
{
  "type": "email",
  "displayName": "$channel_name",
  "description": "Email alerts for Orderly Platform staging-v2 environment",
  "labels": {
    "email_address": "$EMAIL_ADDRESS"
  },
  "enabled": true
}
JSON
)
      
      printf '%s' "$channel_json" > "$policy_tmp"
      
      local new_channel
      new_channel=$(gcloud alpha monitoring channels create \
        --channel-content-from-file="$policy_tmp" \
        --format="value(name)" \
        --project="$PROJECT_ID")
      
      if [[ -n "$new_channel" ]]; then
        print_success "Created notification channel: $new_channel"
        CHANNELS="$new_channel"
      else
        print_error "Failed to create notification channel"
      fi
    fi
  fi
}

# Verify Cloud Run services exist
verify_cloud_run_services() {
  echo -e "${BLUE}=== Verifying Cloud Run Services ===${NC}"
  
  local verified_services=()
  for service in "${CLOUD_RUN_SERVICES[@]}"; do
    if gcloud run services describe "$service" --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
      print_success "Service exists: $service"
      verified_services+=("$service")
    else
      print_error "Service not found: $service"
    fi
  done
  
  CLOUD_RUN_SERVICES=("${verified_services[@]}")
  echo "Verified ${#CLOUD_RUN_SERVICES[@]} Cloud Run services"
}

create_policy() {
  local name="$1"
  local json="$2"

  printf '%s' "$json" >"$policy_tmp"

  print_info "Creating/Updating policy: $name"

  # Try update existing policy if it exists (by display name).
  local existing
  existing=$(gcloud monitoring policies list \
    --format="value(name)" \
    --filter="displayName=\"$name\"" \
    --project="$PROJECT_ID" 2>/dev/null) || true

  if [[ -n "$existing" ]]; then
    if gcloud monitoring policies update "$existing" \
      --policy-from-file="${policy_tmp}" \
      --project="$PROJECT_ID" &>/dev/null; then
      print_success "Updated policy: $name"
    else
      print_error "Failed to update policy: $name"
    fi
  else
    local create_cmd="gcloud monitoring policies create --policy-from-file=\"${policy_tmp}\" --project=\"$PROJECT_ID\""
    if [[ -n "$CHANNELS" ]]; then
      create_cmd="$create_cmd --notification-channels=\"$CHANNELS\""
    fi
    
    if eval "$create_cmd" &>/dev/null; then
      print_success "Created policy: $name"
    else
      print_error "Failed to create policy: $name"
    fi
  fi
}

# Setup monitoring
echo -e "${BLUE}=== Setting up monitoring policies ===${NC}"

# Create notification channel if email provided
create_email_notification_channel

# Verify services exist
verify_cloud_run_services

# 1. Cloud SQL connection failures (per-minute failures > 3 for 5 minutes)
cloud_sql_policy=$(cat <<JSON
{
  "displayName": "staging-v2 | Cloud SQL connection failures",
  "userLabels": {
    "environment": "staging-v2"
  },
  "documentation": {
    "content": "Cloud SQL proxy or clients are repeatedly failing to connect to ${INSTANCE_NAME}. Investigate Cloud SQL availability, network or credential issues.",
    "mimeType": "text/markdown"
  },
  "conditions": [
    {
      "displayName": "Cloud SQL connections failed",
      "conditionThreshold": {
        "filter": "metric.type=\"cloudsql.googleapis.com/database/network/connections_failed\" resource.type=\"cloudsql_database\" resource.label.\"database_id\"=\"${PROJECT_ID}:${REGION}:${INSTANCE_NAME}\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_DELTA"
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 3,
        "duration": "300s",
        "trigger": {
          "count": 1
        }
      }
    }
  ],
  "combiner": "OR",
  "enabled": true
}
JSON
)
create_policy "staging-v2 | Cloud SQL connection failures" "$cloud_sql_policy"

# 2. Serverless VPC Connector restarts (>0 restarts in 1 hour)
vpc_policy=$(cat <<JSON
{
  "displayName": "staging-v2 | Serverless VPC Connector restarts",
  "userLabels": {
    "environment": "staging-v2"
  },
  "documentation": {
    "content": "Serverless VPC Connector ${CONNECTOR_NAME} restarted within the last hour. Inspect connector logs for errors and verify capacity.",
    "mimeType": "text/markdown"
  },
  "conditions": [
    {
      "displayName": "VPC Connector restart count",
      "conditionThreshold": {
        "filter": "metric.type=\"run.googleapis.com/instance/network/connector/restarts\" resource.type=\"run_revision\" resource.label.\"location\"=\"${REGION}\"",
        "aggregations": [
          {
            "alignmentPeriod": "3600s",
            "perSeriesAligner": "ALIGN_DELTA",
            "crossSeriesReducer": "REDUCE_SUM",
            "groupByFields": [
              "resource.label.\"connector_name\""
            ]
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0,
        "duration": "0s",
        "trigger": {
          "count": 1
        }
      }
    }
  ],
  "combiner": "OR",
  "enabled": true
}
JSON
)
create_policy "staging-v2 | Serverless VPC Connector restarts" "$vpc_policy"

# 3. Memorystore Redis memory usage (>80% for 10 minutes)
redis_policy=$(cat <<JSON
{
  "displayName": "staging-v2 | Redis memory usage high",
  "userLabels": {
    "environment": "staging-v2"
  },
  "documentation": {
    "content": "Memorystore instance ${REDIS_INSTANCE} memory usage above 80%. Consider scaling or purging keys.",
    "mimeType": "text/markdown"
  },
  "conditions": [
    {
      "displayName": "Redis memory usage",
      "conditionThreshold": {
        "filter": "metric.type=\"redis.googleapis.com/stats/memory/usage_ratio\" resource.type=\"redis_instance\" resource.label.\"instance_id\"=\"${REDIS_INSTANCE}\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MAX"
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.8,
        "duration": "600s",
        "trigger": {
          "count": 1
        }
      }
    }
  ],
  "combiner": "OR",
  "enabled": true
}
JSON
)
create_policy "staging-v2 | Redis memory usage high" "$redis_policy"

# 4. Cloud Run service error rates (>5% error rate for 5 minutes)
for service in "${CLOUD_RUN_SERVICES[@]}"; do
  error_rate_policy=$(cat <<JSON
{
  "displayName": "staging-v2 | ${service} error rate high",
  "userLabels": {
    "environment": "staging-v2",
    "service": "${service}"
  },
  "documentation": {
    "content": "Cloud Run service ${service} error rate above 5% for 5 minutes. Check service logs and health endpoints.",
    "mimeType": "text/markdown"
  },
  "conditions": [
    {
      "displayName": "High error rate",
      "conditionThreshold": {
        "filter": "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"${service}\" metric.label.\"response_code_class\"!=\"2xx\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE",
            "crossSeriesReducer": "REDUCE_SUM",
            "groupByFields": ["resource.label.service_name"]
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.05,
        "duration": "300s",
        "trigger": {
          "count": 1
        }
      }
    }
  ],
  "combiner": "OR",
  "enabled": true
}
JSON
)
  create_policy "staging-v2 | ${service} error rate high" "$error_rate_policy"
done

# 5. Cloud Run service response latency (>2s P95 for 5 minutes)
high_latency_policy=$(cat <<JSON
{
  "displayName": "staging-v2 | Cloud Run high latency",
  "userLabels": {
    "environment": "staging-v2"
  },
  "documentation": {
    "content": "Cloud Run services showing high response latency (P95 > 2 seconds). Investigate performance bottlenecks.",
    "mimeType": "text/markdown"
  },
  "conditions": [
    {
      "displayName": "High response latency",
      "conditionThreshold": {
        "filter": "metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\" resource.label.\"location\"=\"${REGION}\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_DELTA",
            "crossSeriesReducer": "REDUCE_PERCENTILE_95",
            "groupByFields": ["resource.label.service_name"]
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 2000,
        "duration": "300s",
        "trigger": {
          "count": 1
        }
      }
    }
  ],
  "combiner": "OR",
  "enabled": true
}
JSON
)
create_policy "staging-v2 | Cloud Run high latency" "$high_latency_policy"

# 6. Cloud SQL CPU utilization (>80% for 10 minutes)
cloud_sql_cpu_policy=$(cat <<JSON
{
  "displayName": "staging-v2 | Cloud SQL CPU high",
  "userLabels": {
    "environment": "staging-v2"
  },
  "documentation": {
    "content": "Cloud SQL instance ${INSTANCE_NAME} CPU utilization above 80%. Consider scaling up the instance.",
    "mimeType": "text/markdown"
  },
  "conditions": [
    {
      "displayName": "High CPU utilization",
      "conditionThreshold": {
        "filter": "metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\" resource.type=\"cloudsql_database\" resource.label.\"database_id\"=\"${PROJECT_ID}:${REGION}:${INSTANCE_NAME}\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.8,
        "duration": "600s",
        "trigger": {
          "count": 1
        }
      }
    }
  ],
  "combiner": "OR",
  "enabled": true
}
JSON
)
create_policy "staging-v2 | Cloud SQL CPU high" "$cloud_sql_cpu_policy"

# 7. Cloud Run concurrent requests (>80% of max for 5 minutes)
concurrent_requests_policy=$(cat <<JSON
{
  "displayName": "staging-v2 | Cloud Run high concurrency",
  "userLabels": {
    "environment": "staging-v2"
  },
  "documentation": {
    "content": "Cloud Run services approaching maximum concurrent request limit. Consider scaling configuration.",
    "mimeType": "text/markdown"
  },
  "conditions": [
    {
      "displayName": "High concurrent requests",
      "conditionThreshold": {
        "filter": "metric.type=\"run.googleapis.com/container/request_count\" resource.type=\"cloud_run_revision\" resource.label.\"location\"=\"${REGION}\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE",
            "crossSeriesReducer": "REDUCE_SUM",
            "groupByFields": ["resource.label.service_name"]
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 80,
        "duration": "300s",
        "trigger": {
          "count": 1
        }
      }
    }
  ],
  "combiner": "OR",
  "enabled": true
}
JSON
)
create_policy "staging-v2 | Cloud Run high concurrency" "$concurrent_requests_policy"

echo ""
echo -e "${GREEN}=== Monitoring Setup Complete ===${NC}"
print_success "All monitoring policies have been processed"
print_info "Use 'gcloud monitoring policies list --project=${PROJECT_ID}' to verify"

if [[ -n "$CHANNELS" ]]; then
  print_success "Notifications will be sent to: $CHANNELS"
fi

echo ""
echo -e "${BLUE}=== Monitoring Dashboard Links ===${NC}"
echo "• Cloud Monitoring Console: https://console.cloud.google.com/monitoring?project=${PROJECT_ID}"
echo "• Alerting Policies: https://console.cloud.google.com/monitoring/alerting/policies?project=${PROJECT_ID}"
echo "• Cloud Run Metrics: https://console.cloud.google.com/run?project=${PROJECT_ID}"
echo "• Cloud SQL Metrics: https://console.cloud.google.com/sql/instances?project=${PROJECT_ID}"
echo "• Redis Metrics: https://console.cloud.google.com/memorystore/redis/instances?project=${PROJECT_ID}"

echo ""
echo -e "${YELLOW}=== Next Steps ===${NC}"
echo "1. Test alert policies by triggering conditions"
echo "2. Adjust thresholds based on actual traffic patterns"
echo "3. Add additional notification channels if needed"
echo "4. Set up monitoring dashboards for visualization"
echo "5. Review and tune policies based on false positive rates"
