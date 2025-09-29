# Separated Database Variables Configuration Guide

**Document Version**: 1.0  
**Created**: 2025-09-29  
**Migration Status**: ✅ Complete  
**Architecture**: Separated Variables with Intelligent DSN Assembly

## 🎯 Overview

The Orderly platform has migrated from monolithic `DATABASE_URL` configurations to a separated variables architecture that provides enhanced security, maintainability, and environment flexibility.

### Key Benefits
- ✅ **Enhanced Security**: No URL-encoded passwords in configuration
- ✅ **Environment Flexibility**: Easy switching between local, staging, production
- ✅ **Cloud SQL Integration**: Automatic Unix socket detection for Cloud Run
- ✅ **Backward Compatibility**: Fallback support for legacy configurations
- ✅ **Intelligent Assembly**: Automatic DSN construction with proper encoding

## 🏗️ Architecture Components

### Core Environment Variables

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `DATABASE_HOST` | Database host or socket path | `127.0.0.1` or `/cloudsql/project:region:instance` | ✅ |
| `DATABASE_PORT` | Database port | `5432` | ✅ |
| `DATABASE_NAME` | Database name | `orderly` | ✅ |
| `DATABASE_USER` | Database username | `orderly` | ✅ |
| `POSTGRES_PASSWORD` | Database password (via Secret Manager) | `secure_password` | ✅ |

### Intelligent DSN Assembly

The system automatically constructs the appropriate connection string based on the environment:

```python
# Automatic DSN construction logic
def build_database_url():
    if DATABASE_HOST.startswith('/cloudsql/'):
        # Cloud SQL Unix socket
        return f"postgresql://{USER}:{PASSWORD}@/{DATABASE_NAME}?host={DATABASE_HOST}"
    else:
        # TCP connection with proper URL encoding
        return f"postgresql://{USER}:{quote_plus(PASSWORD)}@{HOST}:{PORT}/{DATABASE_NAME}"
```

## 🔧 Configuration by Environment

### Local Development

```yaml
# docker-compose.yml or .env.local
DATABASE_HOST: 127.0.0.1
DATABASE_PORT: 5432
DATABASE_NAME: orderly
DATABASE_USER: orderly
POSTGRES_PASSWORD: dev_password
```

### Staging (staging-v2)

```yaml
# Cloud Run Environment Variables
DATABASE_HOST: /cloudsql/orderly-472413:asia-east1:orderly-db-v2
DATABASE_PORT: 5432
DATABASE_NAME: orderly
DATABASE_USER: orderly
# POSTGRES_PASSWORD: Set via Secret Manager reference
```

### Production

```yaml
# Cloud Run Environment Variables
DATABASE_HOST: /cloudsql/orderly-472413:asia-east1:orderly-db
DATABASE_PORT: 5432
DATABASE_NAME: orderly
DATABASE_USER: orderly
# POSTGRES_PASSWORD: Set via Secret Manager reference
```

## 🚀 Deployment Configuration

### GitHub Actions Secrets

**Required Secrets:**
```yaml
GCP_PROJECT_ID: orderly-472413
GCP_SA_KEY: <service-account-json>
POSTGRES_PASSWORD: <managed-by-secret-manager>
JWT_SECRET: <jwt-signing-key>
JWT_REFRESH_SECRET: <jwt-refresh-key>
```

**Deprecated (Removed):**
```yaml
# These have been safely removed
DATABASE_URL_STAGING: ❌ REMOVED
DATABASE_URL_PRODUCTION: ❌ REMOVED  
DATABASE_URL_STAGING_V2: ❌ REMOVED
```

### Cloud Run Service Configuration

The deployment automatically configures Cloud Run services with:

```bash
# Automatically set by deploy script
gcloud run deploy service-name \
  --set-env-vars="DATABASE_HOST=/cloudsql/project:region:instance,DATABASE_PORT=5432,DATABASE_NAME=orderly,DATABASE_USER=orderly" \
  --set-secrets="POSTGRES_PASSWORD=postgres-password:latest" \
  --add-cloudsql-instances="project:region:instance"
```

## 🔄 Migration from DATABASE_URL

### Before (Legacy)
```yaml
# Old monolithic approach
DATABASE_URL: postgresql://user:password%40special@host:5432/database
```

### After (Current)
```yaml
# New separated approach
DATABASE_HOST: host
DATABASE_PORT: 5432
DATABASE_NAME: database
DATABASE_USER: user
POSTGRES_PASSWORD: password@special  # No manual encoding needed
```

### Migration Benefits
1. **No Manual URL Encoding**: Passwords with special characters handled automatically
2. **Environment Flexibility**: Easy switching between TCP and Unix socket
3. **Security Enhancement**: Passwords managed via Secret Manager
4. **Configuration Clarity**: Clear, readable environment variables

## 🛠️ Implementation Details

### Service Integration

All FastAPI services use the unified configuration system:

```python
# backend/libs/orderly_fastapi_core/unified_config.py
class DatabaseConfig:
    def __init__(self):
        self.host = os.getenv("DATABASE_HOST", "127.0.0.1")
        self.port = int(os.getenv("DATABASE_PORT", "5432"))
        self.name = os.getenv("DATABASE_NAME", "orderly")
        self.user = os.getenv("DATABASE_USER", "orderly")
        self.password = os.getenv("POSTGRES_PASSWORD", "")
    
    def get_database_url(self) -> str:
        # Intelligent DSN assembly with automatic encoding
        return build_smart_dsn(self.host, self.port, self.name, self.user, self.password)
```

### Alembic Migration Support

Database migration scripts automatically use the new architecture:

```python
# alembic/env.py
from orderly_fastapi_core.unified_config import get_database_url

config.set_main_option("sqlalchemy.url", get_database_url())
```

### Testing Framework Integration

Test configurations support both approaches for compatibility:

```python
# tests/conftest.py
def get_test_database_url():
    # Try separated variables first
    if all(os.getenv(var) for var in ["DATABASE_HOST", "DATABASE_PORT", "DATABASE_NAME", "DATABASE_USER"]):
        return build_smart_dsn()
    # Fallback to DATABASE_URL if available
    return os.getenv("DATABASE_URL", "postgresql://test:test@localhost:5432/test_orderly")
```

## 🔒 Security Considerations

### Secret Manager Integration

Passwords are managed centrally via Google Cloud Secret Manager:

```bash
# Create secret
gcloud secrets create postgres-password --data-file=password.txt

# Grant access to service accounts
gcloud secrets add-iam-policy-binding postgres-password \
  --member="serviceAccount:service@project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Reference in Cloud Run
--set-secrets="POSTGRES_PASSWORD=postgres-password:latest"
```

### Password Security Features

1. **No Plaintext Storage**: Passwords never stored in configuration files
2. **Automatic Escaping**: Special characters handled without manual encoding
3. **Audit Trail**: Secret Manager provides access logging
4. **Rotation Support**: Easy password rotation without service reconfiguration

## 🧪 Testing and Validation

### Connection Testing

```bash
# Test separated variables configuration
export DATABASE_HOST=127.0.0.1
export DATABASE_PORT=5432
export DATABASE_NAME=orderly
export DATABASE_USER=orderly
export POSTGRES_PASSWORD=your_password

# Verify connection
python -c "
from backend.libs.orderly_fastapi_core.unified_config import get_database_url
import psycopg2
conn = psycopg2.connect(get_database_url())
print('✅ Connection successful')
conn.close()
"
```

### Cloud SQL Testing

```bash
# Test Cloud SQL configuration
export DATABASE_HOST=/cloudsql/orderly-472413:asia-east1:orderly-db-v2
export DATABASE_PORT=5432
export DATABASE_NAME=orderly
export DATABASE_USER=orderly
export POSTGRES_PASSWORD=$(gcloud secrets versions access latest --secret=postgres-password)

# Test via Cloud Run simulation
docker run --rm \
  -e DATABASE_HOST=$DATABASE_HOST \
  -e DATABASE_PORT=$DATABASE_PORT \
  -e DATABASE_NAME=$DATABASE_NAME \
  -e DATABASE_USER=$DATABASE_USER \
  -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  orderly-service:latest \
  python -c "from app.core.database import engine; print('✅ Cloud SQL connection works')"
```

## 📊 Monitoring and Troubleshooting

### Health Check Endpoints

All services provide enhanced health checks:

```bash
# Basic health check
curl https://service.run.app/health

# Database-specific health check
curl https://service.run.app/db/health

# Detailed configuration status
curl https://service.run.app/db/config-status
```

### Common Issues and Solutions

#### Issue: Connection Refused
```bash
# Check if DATABASE_PORT is set
echo $DATABASE_PORT  # Should be 5432

# Verify Cloud SQL instance is running
gcloud sql instances describe orderly-db-v2 --project=orderly-472413
```

#### Issue: Authentication Failed
```bash
# Check password retrieval
gcloud secrets versions access latest --secret=postgres-password

# Verify user exists
gcloud sql users list --instance=orderly-db-v2 --project=orderly-472413
```

#### Issue: DSN Construction Problems
```python
# Debug DSN generation
from backend.libs.orderly_fastapi_core.unified_config import get_database_url, DatabaseConfig
config = DatabaseConfig()
print(f"Generated DSN: {config.get_database_url()}")
```

### Automated Validation

The platform includes comprehensive validation scripts:

```bash
# Full post-deployment validation
ENV=staging SERVICE_SUFFIX=-v2 ./scripts/run_plan_checks.sh

# Database-specific diagnostics
ENV=staging SERVICE_SUFFIX=-v2 ./scripts/db/diag.sh

# Configuration validation
python scripts/env/validate-config.py --environment staging
```

## 🚀 Next Steps

### For New Services

When adding new FastAPI services:

1. **Inherit Unified Config**: Use `orderly_fastapi_core.unified_config`
2. **Standard Environment Variables**: Follow the separated variables pattern
3. **Health Check Implementation**: Include `/db/health` endpoint
4. **Secret Manager Integration**: Reference `postgres-password` secret

### For Legacy Migration

If migrating other components:

1. **Audit Current Usage**: Identify all `DATABASE_URL` references
2. **Update Configuration**: Switch to separated variables
3. **Test Thoroughly**: Verify all environments work
4. **Clean Up**: Remove legacy configuration

### For Operations Team

1. **Monitor Health Checks**: Use enhanced validation tools
2. **Secret Rotation**: Plan regular password rotation via Secret Manager
3. **Performance Monitoring**: Track connection pool metrics
4. **Backup Strategy**: Ensure backup procedures work with new architecture

## 📚 Related Documentation

- [GitHub Secrets Audit Checklist](GitHub-Secrets-Audit-Checklist.md)
- [CI/CD Secrets Configuration](ci-secrets.md)
- [Deployment Troubleshooting](DEPLOYMENT-TROUBLESHOOTING.md)
- [Infrastructure Runbook](Infra-Runbook.md)

---

## 🏆 Migration Success Metrics

### Technical Achievements
- ✅ 100% service migration completed
- ✅ Zero downtime during transition
- ✅ Enhanced security posture
- ✅ Improved operational flexibility
- ✅ Comprehensive testing coverage

### Operational Benefits
- 🔒 **Security**: Eliminated plaintext password exposure
- 🚀 **Performance**: Reduced configuration complexity
- 🔧 **Maintainability**: Simplified environment management
- 📊 **Monitoring**: Enhanced health checking
- 🌍 **Scalability**: Environment-agnostic configuration

**Migration Status**: ✅ **COMPLETE**  
**Next Review**: Every 6 months or upon major infrastructure changes