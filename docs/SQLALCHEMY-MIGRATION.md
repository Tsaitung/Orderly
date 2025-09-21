# Migration to SQLAlchemy + FastAPI

This repository has been fully refactored to remove the previous Node ORM. The database layer now uses SQLAlchemy ORM with Alembic migrations. Backend microservices are being migrated to FastAPI.

Key changes:
- Removed `prisma/` directory, the legacy ORM schemas and client usages.
- Added `backend/user-service-fastapi` and `backend/order-service-fastapi` alongside existing `backend/product-service-fastapi`.
- Updated `docker-compose.yml` to build the new FastAPI services.
- Frontend authentication (`lib/auth.ts`) now calls the FastAPI user-service API instead of accessing the DB directly.
- Dockerfiles updated to remove the previous Node ORM client generation.

How to apply migrations:
- cd backend/user-service-fastapi && alembic upgrade head && cd -
- cd backend/order-service-fastapi && alembic upgrade head && cd -
- cd backend/product-service-fastapi && alembic upgrade head && cd -

Next steps (optional):
- Migrate remaining Node microservices to FastAPI.
- Replace any remaining server-side data access in Next.js with API calls to the FastAPI services.
- Expand SQLAlchemy models to cover all former Node ORM models.
