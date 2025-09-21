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

## Operational Recommendations
- Use managed secrets for passwords (GitHub Actions, Cloud Secret Manager).
- Enable automated backups and PITR on Cloud SQL.
- Consider PgBouncer for connection pooling if needed.
- Enforce SSL where applicable; for Cloud SQL sockets, SSL is not required.
