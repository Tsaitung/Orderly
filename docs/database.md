# Database Setup (PostgreSQL + Cloud SQL)

This repo now uses PostgreSQL across environments. SQLite has been removed.

## Local Development
- Run Postgres via Docker Compose:
  - `docker-compose up -d postgres`
- Create database/user if needed:
  - DB: `orderly`, User: `orderly`, Password: `orderly_dev_password`
- Set `DATABASE_URL` in environment files:
  - Frontend: `frontend/.env.local`
    - `DATABASE_URL=postgresql://orderly:orderly_dev_password@localhost:5432/orderly`
  - User Service (Node/Prisma): `backend/user-service/.env`
    - Already uses `postgresql://...` in `.env.example`
  - Python services (SQLAlchemy): Use `DATABASE_URL=postgresql+asyncpg://...`

## Staging/Production (Cloud SQL)
- Preferred: connect via Cloud SQL Unix sockets.
- Required env vars (examples):
  - `ENVIRONMENT=staging|production`
  - `DB_USER=orderly`
  - `DB_PASSWORD=<secure-secret>`
  - `DB_NAME=orderly`
  - `CLOUD_SQL_CONNECTION_NAME=<PROJECT:REGION:INSTANCE>`
- Connection strings:
  - Node/Prisma: `postgresql://orderly:<password>@localhost:5432/orderly?host=/cloudsql/<PROJECT:REGION:INSTANCE>`
  - SQLAlchemy (Python, asyncpg): auto-built from the above via `backend/shared/database/connection.py`.
    - Alternatively: `postgresql+asyncpg://orderly:<password>@/orderly?host=/cloudsql/<PROJECT:REGION:INSTANCE>`

## Migration Notes
- Frontend Prisma:
  - After updating `DATABASE_URL`, run:
    - `cd frontend`
    - `npx prisma generate`
    - `npx prisma migrate dev --name init`
- User Service Prisma:
  - `cd backend/user-service`
  - `npm run db:generate`
  - `npm run migrate`
- Python services (SQLAlchemy/Alembic):
  - Configure `backend/shared/database/alembic.ini` or per-service Alembic to point to Postgres.

## Operational Recommendations
- Use managed secrets for passwords (GitHub Actions, Cloud Secret Manager).
- Enable automated backups and PITR on Cloud SQL.
- Consider PgBouncer for connection pooling if needed.
- Enforce SSL where applicable; for Cloud SQL sockets, SSL is not required.

