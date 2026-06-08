.PHONY: ensure-db \
       test-be test-fe \
       lint typecheck format-check \
       verify verify-pr-local verify-pr \
       deploy-check

# Parallelism control
PYTEST_WORKERS ?= auto

# Python detection (3.11+)
PYTHON_MIN_VERSION := 3.11
PYTHON_VERSION_CHECK := import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)
MISSING_PYTHON_SENTINEL := __MISSING_PYTHON_311__

ROOT_PYTHON := $(shell \
	if [ -x backend/venv/bin/python3 ] && backend/venv/bin/python3 -c '$(PYTHON_VERSION_CHECK)' >/dev/null 2>&1; then \
		echo backend/venv/bin/python3; \
	else \
		for python in python3.13 python3.12 python3.11 python3; do \
			if command -v $$python >/dev/null 2>&1 && $$python -c '$(PYTHON_VERSION_CHECK)' >/dev/null 2>&1; then \
				echo $$python; \
				exit 0; \
			fi; \
		done; \
		echo $(MISSING_PYTHON_SENTINEL); \
	fi)

ifeq ($(ROOT_PYTHON),$(MISSING_PYTHON_SENTINEL))
$(error Python $(PYTHON_MIN_VERSION)+ is required. Run: python3.11 -m venv backend/venv && backend/venv/bin/python3 -m pip install -r backend/requirements.txt)
endif

# Docker command detection
DOCKER_CMD := $(shell if command -v docker-compose >/dev/null 2>&1; then echo docker-compose; elif docker compose version >/dev/null 2>&1; then echo "docker compose"; else echo "echo ERROR: neither docker-compose nor docker compose found; false"; fi)

# ── Infrastructure: Auto-detect & start PostgreSQL + Redis for local tests ──
# CI has services via blocks; locally Docker container binds to POSTGRES_PORT / REDIS_PORT (from direnv .envrc)
# Skip entirely inside GitHub Actions (GITHUB_ACTIONS=true)

ensure-db:
ifeq ($(GITHUB_ACTIONS),true)
	@echo "ensure-db: CI detected, skipping (services managed by GitHub Actions)"
else
	@: $${POSTGRES_PORT:?run direnv allow at repo root}
	@: $${REDIS_PORT:?run direnv allow at repo root}
	@# Test PostgreSQL connectivity
	@PG_DSN=$${TEST_PG_ADMIN_DSN:-postgresql://postgres:postgres@localhost:$${POSTGRES_PORT}/postgres}; \
	if PGPASSWORD=postgres psql -h localhost -p $${POSTGRES_PORT} -U postgres -d postgres -c "SELECT 1" >/dev/null 2>&1; then \
		echo "ensure-db: PostgreSQL reachable on :$${POSTGRES_PORT} ✓"; \
	else \
		echo "ensure-db: PostgreSQL not on :$${POSTGRES_PORT} — starting colima+compose..."; \
		if ! docker info >/dev/null 2>&1; then \
			if command -v colima >/dev/null 2>&1; then \
				echo "ensure-db: Docker not running — starting colima..."; \
				colima start --cpu 2 --memory 4 2>&1 | tail -3; \
			else \
				echo "ERROR: PostgreSQL not on :$${POSTGRES_PORT}, Docker not running, colima not installed."; \
				echo "  Option A: docker compose up -d postgres redis"; \
				echo "  Option B: brew install colima && colima start"; \
				exit 1; \
			fi; \
		fi; \
		echo "ensure-db: starting postgres + redis via compose.dev.yml..."; \
		$(DOCKER_CMD) -f compose.dev.yml up -d postgres redis 2>&1 | tail -5; \
		echo "ensure-db: waiting for PostgreSQL ready on :$${POSTGRES_PORT}..."; \
		for i in $$(seq 1 15); do \
			PGPASSWORD=postgres psql -h localhost -p $${POSTGRES_PORT} -U postgres -d postgres -c "SELECT 1" >/dev/null 2>&1 && break; \
			sleep 2; \
		done; \
		if ! PGPASSWORD=postgres psql -h localhost -p $${POSTGRES_PORT} -U postgres -d postgres -c "SELECT 1" >/dev/null 2>&1; then \
			echo "ERROR: PostgreSQL not reachable on :$${POSTGRES_PORT} after 30s"; \
			exit 1; \
		fi; \
		echo "ensure-db: PostgreSQL reachable on :$${POSTGRES_PORT} ✓"; \
	fi
endif

# ── Backend Tests: monolith gate — MIRRORS CI (.github/workflows/ci.yml backend-test) ──
# CI and this target call the SAME runner (scripts/ci/backend-test.sh): identical
# commands + identical env contract, so a command/env divergence fails locally
# (before push) instead of one-at-a-time in GitHub Actions. App-env below is
# identical to the CI job env: block; only DB/Redis host+port are local-specific.
# BLOCKING: the script runs `set -e`, so a failure fails the push.

test-be: ensure-db
	@echo "Backend monolith test (mirrors CI .github/workflows/ci.yml backend-test):"
	@ENVIRONMENT=test \
	  DATABASE_HOST=localhost \
	  DATABASE_PORT=$${POSTGRES_PORT} \
	  DATABASE_USER=orderly \
	  DATABASE_NAME=orderly \
	  POSTGRES_PASSWORD=orderly_test \
	  REDIS_HOST=localhost \
	  REDIS_PORT=$${REDIS_PORT} \
	  JWT_SECRET=test_jwt_secret_for_ci_only \
	  JWT_REFRESH_SECRET=test_refresh_secret_for_ci_only \
	  PYTHONPATH="$$PWD/backend:$$PWD/backend/libs" \
	  BACKEND_TEST_PYTHON="$(ROOT_PYTHON)" \
	  bash scripts/ci/backend-test.sh
	@echo "✓ test-be passed (monolith — mirrors CI backend-test; BLOCKING)"

# ── Frontend Tests & Quality ──

test-fe:
	npm run test:frontend

lint:
	npm run lint

typecheck:
	npm run type-check

format-check:
	npm run format:check

# ── Daily verification: lint + typecheck + format-check + test-fe ──
# Backend testing not included in daily verify; use test-be manually or in CI.

verify: lint typecheck format-check test-fe
	@echo "✓ verify passed (daily gate: lint + typecheck + format-check + test-fe)"

# ── PR local gate: verify + test-be (BLOCKING, mirrors CI) ──
# test-be now runs the same monolith gate CI does (scripts/ci/backend-test.sh),
# so a backend failure blocks the push instead of surfacing later in Actions.

verify-pr-local: verify test-be
	@echo "✓ verify-pr-local passed (verify + monolith backend test, mirrors CI)"

# ── PR CI gate: authoritative ──
# CI .github/workflows/ci.yml is the source of truth for backend test results.
# This target is a placeholder for documentation; actual CI validation happens in workflows.

verify-pr:
	@echo "verify-pr: CI authoritative gate (see .github/workflows/ci.yml)"
	@echo "  Run locally: make verify-pr-local"

# ── Pre-deploy drift guard: monolith Dockerfile COPY-source consistency ──
# Asserts backend/Dockerfile.monolith's repo-relative COPY sources still exist in
# the build context, so deploy-config vs code drift fails FAST and LOCAL instead
# of mid-CD. Wired as cd.yml `preflight` job (build-deploy / deploy-frontend gate).

deploy-check:
	bash scripts/ci/check-deploy-consistency.sh
