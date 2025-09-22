# Database Setup (PostgreSQL + SQLAlchemy/Alembic)

This repo now uses PostgreSQL with SQLAlchemy ORM and Alembic migrations across all environments. The previous Node ORM has been fully removed.

## Local Development

- Run Postgres via Docker Compose:
  - `docker-compose up -d postgres`
- Create database/user if needed:
  - DB: `orderly`, User: `orderly`, Password: `orderly_dev_password`
- Set `DATABASE_URL` in environment files for each FastAPI service (async connection string):
  - `postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly`
  - Services: `backend/user-service-fastapi/.env`, `backend/order-service-fastapi/.env`, `backend/product-service-fastapi/.env`

## Staging/Production (Cloud SQL)

- Preferred: connect via Cloud SQL Unix sockets.
- Required env vars (examples):
  - `ENVIRONMENT=staging|production`
  - `DB_USER=orderly`
  - `DB_PASSWORD=<secure-secret>`
  - `DB_NAME=orderly`
  - `CLOUD_SQL_CONNECTION_NAME=<PROJECT:REGION:INSTANCE>`
- Connection strings:
  - SQLAlchemy (Python, asyncpg): `postgresql+asyncpg://orderly:<password>@/orderly?host=/cloudsql/<PROJECT:REGION:INSTANCE>`

## Migration

- Run Alembic migrations per service:
  - `cd backend/user-service-fastapi && alembic upgrade head && cd -`
  - `cd backend/order-service-fastapi && alembic upgrade head && cd -`
  - `cd backend/product-service-fastapi && alembic upgrade head && cd -`

To create new migrations:

- Modify SQLAlchemy models under `app/models` then run `alembic revision --autogenerate -m "<message>"` in the respective service directory, followed by `alembic upgrade head`.

## Database Management Tools

### 🎯 Unified Database Manager (`scripts/database/database_manager.py`)

Complete database management solution integrating all data operations:

```bash
# Export all business data
python scripts/database/database_manager.py export

# Create standardized test customers (20 customers: 15 companies + 5 individuals)
python scripts/database/database_manager.py create-test-customers

# Import data to staging/production
python scripts/database/database_manager.py import --target "postgresql+asyncpg://staging:pass@host:5432/orderly"

# Clean test data
python scripts/database/database_manager.py clean --test-data
```

**Features:**

- ✅ **Data Export**: Export suppliers, customers, categories, SKUs to JSON
- ✅ **Data Import**: Import to any environment with duplicate detection
- ✅ **Test Data Creation**: Generate realistic test customers with Taiwan addresses/tax IDs
- ✅ **Data Cleanup**: Safe removal of test data without affecting production
- ✅ **Async Processing**: Parallel processing for optimal performance

### 🏷️ Real Data Test Script (`scripts/database/seed_from_real_data.py`)

Complete test data script based on current production data:

```bash
# Create all real data test copies (9 suppliers + 20 customers + 105 categories + 52 SKUs)
python scripts/database/seed_from_real_data.py

# Clean all test copies
python scripts/database/seed_from_real_data.py --clean
```

**Features:**

- ✅ Based on real production data for business logic accuracy
- ✅ Maintains complete foreign key relationships and data dependencies
- ✅ Supports repeated execution with intelligent duplicate skipping
- ✅ Provides complete cleanup functionality

### Data Management Workflows

**Development → Testing → Production Flow:**

```bash
# 1. Export from production
python scripts/database/database_manager.py export --database-url "postgresql+asyncpg://prod:pass@prod:5432/orderly"

# 2. Create test customers in development
python scripts/database/database_manager.py create-test-customers

# 3. Import to testing environment
python scripts/database/database_manager.py import --target "postgresql+asyncpg://test:pass@test:5432/orderly"

# 4. Clean development environment
python scripts/database/database_manager.py clean --test-data --export-files
```

**Quick Environment Reset:**

```bash
# One-command reset: clean old data + create new test data
python scripts/database/database_manager.py clean --test-data && \
python scripts/database/database_manager.py create-test-customers --force
```

> 📚 **Complete Documentation**: See `scripts/database/README.md` for detailed usage, troubleshooting, and best practices.

## Operational Recommendations

- Use managed secrets for passwords (GitHub Actions, Cloud Secret Manager).
- Enable automated backups and PITR on Cloud SQL.
- Consider PgBouncer for connection pooling if needed.
- Enforce SSL where applicable; for Cloud SQL sockets, SSL is not required.
- Use database management tools for environment consistency and testing.
