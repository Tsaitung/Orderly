#!/usr/bin/env bash
# Single source of truth for Cloud Run service-name derivation.
# Sourced by cd.yml jobs (build-deploy / wire-up / deploy-frontend / smoke) so
# the staging-v2 abbreviations live in exactly one place instead of being
# copy-pasted into every job (the old deploy.yml repeated this function 4x).
#
# Usage:  source scripts/ci/cloud-run-names.sh
#         name=$(cr_service_name "<service>" "<environment>" "<suffix>")

cr_service_name() {
  local service="$1" env="$2" suffix="$3"
  local env_suffix="${env}${suffix}"

  if [ "$env_suffix" = "staging-v2" ]; then
    case "$service" in
      api-gateway-fastapi)                echo "orderly-apigw-staging-v2" ;;
      user-service-fastapi)               echo "orderly-user-staging-v2" ;;
      order-service-fastapi)              echo "orderly-order-staging-v2" ;;
      product-service-fastapi)            echo "orderly-product-staging-v2" ;;
      acceptance-service-fastapi)         echo "orderly-accept-staging-v2" ;;
      notification-service-fastapi)       echo "orderly-notify-staging-v2" ;;
      customer-hierarchy-service-fastapi) echo "orderly-custhier-staging-v2" ;;
      supplier-service-fastapi)           echo "orderly-supplier-staging-v2" ;;
      *)                                  echo "orderly-${service}-${env_suffix}" ;;
    esac
  else
    case "$service" in
      customer-hierarchy-service-fastapi) echo "orderly-customer-hierarchy-${env_suffix}" ;;
      *)                                  echo "orderly-${service}-${env_suffix}" ;;
    esac
  fi
}
