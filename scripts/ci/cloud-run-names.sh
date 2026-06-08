#!/usr/bin/env bash
# Single source of truth for Cloud Run service-name derivation.
# Sourced by cd.yml jobs (build-deploy / wire-up / deploy-frontend / smoke) so
# the backend monolith service name lives in exactly one place.
#
# Usage:  source scripts/ci/cloud-run-names.sh
#         name=$(cr_service_name "<service>" "<environment>" "<suffix>")

cr_service_name() {
  local service="$1" env="$2" suffix="$3"
  local env_suffix="${env}${suffix}"

	  if [ "$env_suffix" = "staging-v2" ]; then
	    case "$service" in
	      backend-monolith)                    echo "orderly-backend-staging-v2" ;;
	      *)                                  echo "orderly-${service}-${env_suffix}" ;;
	    esac
	  else
	    case "$service" in
	      backend-monolith)                   echo "orderly-backend-${env_suffix}" ;;
	      *)                                  echo "orderly-${service}-${env_suffix}" ;;
	    esac
	  fi
}
