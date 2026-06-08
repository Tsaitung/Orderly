.PHONY: ensure-db \
       test-be test-fe \
       lint typecheck format-check \
       verify verify-pr-local verify-pr \
       deploy-check predeploy-check

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

# Mirror CI (.github/workflows/ci.yml frontend-test): CI runs `jest --ci`, which
# FAILS on a missing/new snapshot instead of writing it. `npm run test:frontend`
# omits --ci, so a snapshot test with no committed snapshot would pass locally and
# fail in CI. Run the same jest mode here (CI shards 1..4; the union is the full
# suite, so unsharded local == same selection + same snapshot semantics).
test-fe:
	npx jest --ci --passWithNoTests

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

verify-pr-local: verify test-be deploy-check
	@echo "✓ verify-pr-local passed (verify + monolith backend test + deploy-check, mirrors CI/CD)"

# ── PR CI gate: authoritative ──
# CI .github/workflows/ci.yml is the source of truth for backend test results.
# This target is a placeholder for documentation; actual CI validation happens in workflows.

verify-pr:
	@echo "verify-pr: CI authoritative gate (see .github/workflows/ci.yml)"
	@echo "  Run locally: make verify-pr-local"

# ── deploy-check: local mirror of cd.yml's REPO-CONTENT checks (fast, no cloud) ──
# Covers every cd.yml failure mode determined by repo content (not cloud state):
#   1. Dockerfile.monolith COPY sources exist  (cd.yml preflight) — drift guard.
#   2. Shell syntax of every cd.yml-referenced script — a `bash -n` break would
#      fail the deploy job mid-CD; catch it locally.
#   3. cloud-run-names.sh naming contract (build-deploy / wire-up / smoke).
# Cloud-state checks (gcloud auth, Cloud SQL orphan audit, Cloud Run deploy,
# live /health smoke) are NOT here — they need real GCP resources and can't run
# locally; they are gated by the cd.yml `preflight` job (itself gated on CI green)
# + post-deploy smoke + monitoring. See docs/3-Development-Plan/CI-CD-PARITY.md.
deploy-check:
	@echo "deploy-check (1/4): Dockerfile.monolith COPY-source drift guard"
	@bash scripts/ci/check-deploy-consistency.sh
	@echo "deploy-check (2/4): shell syntax of cd.yml-referenced scripts"
	@for s in backend-test.sh check-deploy-consistency.sh cloud-run-names.sh resolve-deploy-context.sh; do \
		bash -n "scripts/ci/$$s" && echo "  ok: scripts/ci/$$s" || exit 1; \
	done
	@echo "deploy-check (3/4): cloud-run-names contract self-test"
	@bash scripts/ci/cloud-run-names.test.sh
	@echo "deploy-check (4/4): resolve-deploy-context self-test (env + changed services)"
	@bash scripts/ci/resolve-deploy-context.test.sh
	@echo "✓ deploy-check passed (cd.yml repo-content checks; cloud-state checks gated in CD)"

# ── predeploy-check: deploy-check + real Docker builds (the cd.yml BUILD mirror) ──
# Heavy (needs a running Docker daemon; ~minutes cold). NOT in daily verify; run
# before pushing to a deploy branch (main/staging). cd.yml build-deploy / migrate /
# deploy-frontend each `docker build` these Dockerfiles with context=repo root — a
# COPY/layer break only surfaces mid-CD otherwise (2026-06-08 deploy-drift class).
predeploy-check: deploy-check
	@command -v docker >/dev/null 2>&1 || { echo "ERROR: docker not found — predeploy-check needs Docker"; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "ERROR: Docker daemon not running (try: colima start)"; exit 1; }
	@echo "predeploy-check: docker build backend/Dockerfile.monolith (context=.)"
	@docker build -f backend/Dockerfile.monolith -t orderly-backend-monolith:predeploy-check .
	@echo "predeploy-check: docker build Dockerfile.frontend (context=.)"
	@docker build -f Dockerfile.frontend -t orderly-frontend:predeploy-check .
	@echo "✓ predeploy-check passed (deploy-check + both CD images build)"
