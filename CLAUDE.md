# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Canonical Documentation Index: see `docs/INDEX.md` for the single source of truth and cross-links to PRD, Design System, Architecture, API, and Database docs.

## Project Overview

井然 Orderly is an enterprise-grade digital supply chain platform for the restaurant industry, featuring Ultra-Automated CI/CD with 98%+ automation. The platform connects restaurants and suppliers through a unified interface for the complete order-to-settlement workflow: ordering → delivery → acceptance → billing → settlement.

## Architecture

### Microservices Architecture
- **Frontend**: Next.js + TypeScript + TailwindCSS (port 3000)
- **Backend**: FastAPI microservices architecture with API Gateway pattern
  - API Gateway (port 8000) - Routes to all services (FastAPI)
  - User Service (port 3001) - Authentication and user management  
  - Order Service (port 3002) - Order processing
  - Product Service (port 3003) - Product catalog
  - Acceptance Service (port 3004) - Receipt verification
  - Billing Service (port 3005) - Invoicing and payments
  - Notification Service (port 3006) - Real-time notifications
- **Database**: PostgreSQL (port 5432) with SQLAlchemy ORM + Alembic
- **Cache**: Redis (port 6379)
- **Infrastructure**: Multi-region Terraform on Google Cloud Platform

### Key Directories
- `backend/` - Microservices (each with own Dockerfile, package.json, TypeScript)
- `frontend/` - Next.js App Router application
- `shared/types/` - TypeScript type definitions shared across services
- `infrastructure/terraform/` - Complete IaC with modules for networking, compute, database, security, monitoring, redis
- `.github/workflows/` - 8 advanced CI/CD workflows including ML-powered quality gates
- `scripts/` - Automation scripts for deployment, monitoring, security

## Repository Guidelines

### Project Structure
- `app/`: Next.js App Router + TypeScript frontend application.
- `backend/`: Microservices (API Gateway and core domain services in FastAPI + SQLAlchemy).
- `shared/types/`: Reusable TS types as `@orderly/types`.
- `infrastructure/`, `scripts/`, `docker-compose.yml`: IaC, automation, local orchestration.

### Build, Test, and Develop
- Install deps (root): `npm install`.
- Dev all: `npm run dev` (frontend) and `docker-compose up -d` (backend services).
- Build all/one: `npm run build` (frontend) or Docker builds per service.
- Start API Gateway: `docker compose up -d api-gateway` (FastAPI).
- Tests: `npm test` (all) or `npm test -w <workspace>`; watch: `npm run test:watch -w backend/user-service`.
- Lint/format: `npm run lint`, `npm run format`.

### Coding Style
- TypeScript, 2-space indent, Prettier trailing commas.
- ESLint with TS, React, and hooks plugins; fix issues before PR.
- Names: `PascalCase` components, `camelCase` vars/functions, env as `SCREAMING_SNAKE_CASE`.
- Files: components `PascalCase.tsx`, modules `kebab-case.ts`, tests `*.test.ts(x)`.

### Testing
- Frontend: Jest + React Testing Library; Backend: Jest (+ ts-jest). Prefer co-located unit tests.
- Target ≥80% unit coverage; add integration tests for FastAPI routes and DB flows.
- Run fast locally with watch; run full suite in CI.

### Commits & PRs
- Conventional Commits (e.g., `feat(api): add rate limiting`, `fix(user): hash password correctly`).
- PRs: concise summary, linked issues (`Closes #123`), UI screenshots, test plan, and green lint/tests.
- Keep scope focused; update docs when behavior changes.

### Documentation Maintenance
- Single source of truth lives in `docs/INDEX.md`.
- Update the corresponding canonical docs when changing behavior/contracts:
  - PRD → `docs/PRD-Complete.md`
  - Architecture → `docs/Technical-Architecture-Summary.md`
  - Design System → `docs/design-system.md`
  - API → `docs/API-Endpoints-Essential.md` and `docs/api-specification.yaml`
  - Database → `docs/Database-Schema-Core.md` and `docs/database.md`
- If adding/renaming docs, also update `docs/INDEX.md` and cross-links.
- Before merging, run a quick link check for stale paths:
  - `rg -n "api-specification\.md|technical-architecture\.md|PRD\.md|Orderly Design System\.md|requirement\.md"`

### Security & Configuration
- Copy `.env.example` per workspace to `.env.local`; never commit secrets.
- For full local stack use `docker-compose up -d`; verify health endpoints before merging.
- Manage secrets via GitHub Secrets as outlined in README.

## Common Commands

### Development
```bash
# Start all services in development
npm run dev

# Start only backend services  
npm run dev:backend

# Start only frontend
npm run dev:frontend

# Build all workspaces
npm run build

# Run tests across all workspaces
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

### Docker Development
```bash
# Start full environment with Docker
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Rebuild specific service
docker-compose build [service-name]

# Stop all services
docker-compose down
```

### Infrastructure Management
```bash
# Initialize Terraform
cd infrastructure/terraform
terraform init

# Plan infrastructure changes
terraform plan -var-file="[environment].tfvars"

# Apply infrastructure
terraform apply

# Deploy to staging (triggers CI/CD)
git push origin develop

# Deploy to production (requires approval)
git push origin main
```

### Service-Specific Commands
```bash
# Generate SQLAlchemy client (user-service)
cd backend/user-service
alembic upgrade head # per FastAPI service

# Run database migrations
alembic upgrade head

# Reset database
# use backups + alembic downgrade if needed
```

## CI/CD System

### Ultra-Automated Pipeline Features
- **ML-Powered Quality Gates**: 5 algorithms (Isolation Forest, Random Forest, DBSCAN, Time Series Forecasting, Ensemble Methods)
- **Zero-Downtime Deployments**: 5 strategies (Blue-Green Fast Track, Blue-Green Standard, Progressive Canary, Conservative Canary, Feature Flag Progressive)
- **Self-Healing Systems**: >90% automatic recovery from anomalies
- **Security Scanning**: Every 4 hours (SAST, DAST, container, dependency, compliance)
- **Cost Optimization**: ML-driven resource right-sizing and budget monitoring

### Deployment Strategies
The system automatically selects deployment strategy based on ML confidence levels:
- **High Confidence (>95%)**: Fast Track Blue-Green (<30s rollback)
- **Medium Confidence (80-95%)**: Standard Blue-Green (5min soak time)
- **Low Confidence (60-80%)**: Progressive Canary (5% → 100% traffic)
- **Very Low (<60%)**: Manual review required

### Required GitHub Secrets
Core secrets for CI/CD automation:
- `GCP_PROJECT_ID`, `GCP_SA_KEY` - Infrastructure access
- `ML_CONFIDENCE_THRESHOLD_*` - ML decision thresholds
- `COST_THRESHOLD_*` - Budget monitoring
- `DATADOG_API_KEY`, `NEWRELIC_LICENSE_KEY` - APM integration
- `SLACK_WEBHOOK_URL`, `PAGERDUTY_INTEGRATION_KEY` - Alerting

## Business Context

### Three-Role System
- **Restaurant Side**: Digital ordering, transparent acceptance, automated billing
- **Supplier Side**: Unified order management, real-time inventory sync, simplified payment
- **Platform Side**: Global monitoring, anomaly alerts, business insights

### Revenue Model
- Transaction commission: 1.5-3% GMV (tiered by volume and category)
- Subscription tiers: Free → Professional (NT$3,999) → Enterprise (NT$9,999)
- Financial value-added services: Supply chain finance, insurance, payments

### Key Performance Indicators
- Restaurant: 70% reduction in ordering time, <2% acceptance error rate
- Supplier: <5min order confirmation, 85%+ fulfillment rate, 30% shorter payment cycle
- Platform: 150% GMV growth, <24h exception handling, 99% log coverage

## Design System

### Brand Guidelines
- **Primary Color**: Mocha Mousse (#A47864)
- **Border Radius**: 4px consistent across all components
- **Typography**: Noto Sans TC (Chinese) / Inter (English)
- **Accessibility**: WCAG 2.1 AA compliance (4.5:1 contrast ratio minimum)
- **Touch Targets**: ≥44×44px for mobile interfaces

## Canonical Documentation

Refer to `docs/INDEX.md` for the up-to-date documentation map. Key entries:
- PRD: `docs/PRD-Complete.md`
- Design System: `docs/design-system.md`
- Technical Architecture: `docs/Technical-Architecture-Summary.md`
- API Essentials: `docs/API-Endpoints-Essential.md`
- OpenAPI Spec: `docs/api-specification.yaml`
- Database Core Schema: `docs/Database-Schema-Core.md`
- Database Operations: `docs/database.md`

## Multi-Region Infrastructure

### Regions
- **Primary**: asia-east1 (Taiwan/Hong Kong proximity)
- **Secondary**: us-central1 (Global distribution)
- **Tertiary**: europe-west1 (European operations)

### High Availability Features
- Cross-region database replication
- Automated failover with <5min RTO
- Zero data loss (RPO = 0) with point-in-time recovery
- Load balancing with health checks
- Disaster recovery drills (monthly automated)

## Security & Compliance

### Automated Compliance
- **SOC2**: IAM policy validation, data encryption verification, audit logging
- **GDPR**: Consent management, right to erasure, data portability
- **HIPAA**: Physical/administrative/technical safeguards, encryption at rest/transit

### Security Architecture
- Zero-trust network model with VPC private subnets
- Secret Manager for credential management
- KMS encryption for data at rest
- Continuous vulnerability scanning (every 4 hours)
- Penetration testing with OWASP ZAP and custom security tests

## Development Guidelines

### Code Organization
- Each microservice follows the same structure: src/controllers/, src/services/, src/routes/, src/middleware/
- Shared TypeScript types in `shared/types/` workspace
- Environment-specific configuration through environment variables
- Database access through SQLAlchemy ORM with migration-driven schema management

### Service Communication
- API Gateway handles external requests and routes to internal services
- Inter-service communication via HTTP (considering gRPC for high-throughput scenarios)
- Real-time notifications through WebSocket connections
- Event-driven architecture capabilities with Redis Streams/Kafka integration

### Testing Strategy
- Unit tests: >80% coverage requirement
- Integration tests: API endpoint validation with ephemeral databases
- E2E tests: Critical user journeys with Playwright
- Load tests: k6 performance benchmarking
- Chaos engineering: Network partitions, resource exhaustion, database failures

### Monitoring & Observability
- Multi-provider APM: DataDog + New Relic + Prometheus/Grafana
- Distributed tracing across microservices
- Structured JSON logging with correlation IDs
- Custom business metrics tracking (GMV, order conversion rates, fulfillment metrics)
- SLO monitoring: >99.9% uptime, <500ms P95 latency, <0.1% error rate

## Data Flow

### Order Processing Flow
1. Restaurant creates order → API Gateway → Order Service
2. Order Service validates → Product Service (inventory check)
3. Notification Service → Supplier notification
4. Supplier accepts → Order status update → Restaurant notification
5. Delivery tracking → Acceptance Service (photo verification)
6. Billing Service → Invoice generation → Payment processing

### User Authentication Flow
- JWT-based authentication through API Gateway
- User Service handles registration, login, password reset
- Role-based access control (restaurant, supplier, admin)
- Session management with Redis for scalability

This codebase represents an enterprise-grade platform with emphasis on automation, reliability, and scalability. The Ultra-Automated CI/CD system ensures high-quality deployments with minimal human intervention while maintaining strict security and compliance standards.
