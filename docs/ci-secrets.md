# CI/CD Secrets Configuration

Configure the following repository secrets for staging and production deployments.

## Staging
- `STG_DB_USER`: Database user (e.g., `orderly`)
- `STG_DB_PASSWORD`: Database password
- `STG_DB_NAME`: Database name (default `orderly` if unset)
- `STG_CLOUD_SQL_CONNECTION_NAME`: Cloud SQL instance in `PROJECT:REGION:INSTANCE` format (e.g., `myproj:asia-east1:orderly-stg`)

## Production
- `PROD_DB_USER`: Database user (e.g., `orderly`)
- `PROD_DB_PASSWORD`: Database password
- `PROD_DB_NAME`: Database name (default `orderly` if unset)
- `PROD_CLOUD_SQL_CONNECTION_NAME`: Cloud SQL instance in `PROJECT:REGION:INSTANCE` format

## Optional
- `CODECOV_TOKEN`: For coverage uploads
- `GCP_PROJECT_ID`: GCP Project hosting Cloud Run and Cloud SQL
- `GCP_SA_KEY`: Service account JSON for deployments
- `SNYK_TOKEN`: For dependency scanning

These are referenced in `.github/workflows/main.yml` and validated post-deploy.
