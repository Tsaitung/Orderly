# GitHub Secrets Audit and Cleanup Checklist

**Document Version**: 1.0  
**Created**: 2025-09-29  
**Target**: Platform Administrator with GitHub repository admin privileges  
**Objective**: Complete removal of deprecated DATABASE_URL_* secrets and migration to separated variables

## 🎯 Executive Summary

The Orderly platform has successfully migrated from monolithic `DATABASE_URL` secrets to a separated variable architecture for improved security and maintainability. This checklist provides the platform administrator with detailed steps to complete the cleanup of legacy secrets.

### Current Status
- ✅ **Technical Implementation**: 100% complete - All services use separated variables
- ✅ **CI/CD Migration**: 100% complete - All workflows updated
- ✅ **Backward Compatibility**: Maintained with fallback support
- 🔄 **Secret Cleanup**: Requires admin privileges (this document)

## 🔍 Phase 1: GitHub Secrets Discovery and Audit

### Step 1.1: Access GitHub Repository Settings
1. Navigate to: `https://github.com/[org]/Orderly/settings/secrets/actions`
2. Log in with admin credentials
3. Verify access to "Repository secrets" section

### Step 1.2: Inventory Current Secrets
Execute the following audit to identify all DATABASE_URL-related secrets:

```bash
# Run this locally with GitHub CLI (requires admin token)
gh secret list --repo [org]/Orderly | grep -i database
```

Expected legacy secrets to identify and remove:
- `DATABASE_URL_STAGING`
- `DATABASE_URL_PRODUCTION` 
- `DATABASE_URL_STAGING_V2`
- `DATABASE_URL_DEV`
- Any other `DATABASE_URL_*` variants

### Step 1.3: Document Current Secret Inventory

Create an audit log:

| Secret Name | Created Date | Last Used | Migration Status | Action Required |
|------------|--------------|-----------|------------------|-----------------|
| DATABASE_URL_STAGING | [Date] | [Date] | ✅ Migrated | 🗑️ DELETE |
| DATABASE_URL_PRODUCTION | [Date] | [Date] | ✅ Migrated | 🗑️ DELETE |
| DATABASE_URL_STAGING_V2 | [Date] | [Date] | ✅ Migrated | 🗑️ DELETE |

## 🔧 Phase 2: Verification of New Architecture

### Step 2.1: Confirm Separated Variables Exist
Verify these essential secrets are present and correctly configured:

**Core Database Secrets:**
- ✅ `POSTGRES_PASSWORD` - PostgreSQL password (managed via Secret Manager)
- ✅ `GCP_PROJECT_ID` - Google Cloud Project ID
- ✅ `GCP_SA_KEY` - Service Account credentials

**Authentication Secrets:**
- ✅ `JWT_SECRET` - JWT signing key
- ✅ `JWT_REFRESH_SECRET` - JWT refresh token key

### Step 2.2: Validate Secret Manager Integration
Confirm these secrets are properly synced with Google Cloud Secret Manager:

```bash
# Verify Secret Manager secrets exist
gcloud secrets list --project=orderly-472413 | grep -E "(postgres-password|jwt-secret|jwt-refresh-secret)"

# Expected output:
# postgres-password    [timestamp]
# jwt-secret          [timestamp]  
# jwt-refresh-secret  [timestamp]
```

## 🗑️ Phase 3: Safe Removal of Legacy Secrets

### Step 3.1: Pre-Deletion Verification
Before deleting any secrets, verify the following:

1. **No Active Workflows Reference Legacy Secrets**:
   ```bash
   # Search all workflow files for DATABASE_URL references
   find .github/workflows -name "*.yml" -exec grep -l "DATABASE_URL" {} \;
   # Expected: No results (already cleaned)
   ```

2. **No Recent Deployments Failed**:
   - Check last 3 deployment runs were successful
   - Verify all services in staging-v2 are healthy
   - Confirm no rollback scenarios require legacy secrets

3. **Emergency Rollback Plan Ready**:
   - Document secret values in secure location (temporarily)
   - Prepare restoration commands if needed
   - Notify team of maintenance window

### Step 3.2: Execute Safe Deletion

**⚠️ CRITICAL: Follow this exact sequence**

1. **Start with Non-Production Secrets First**:
   ```bash
   # Delete staging secrets first for testing
   gh secret delete DATABASE_URL_STAGING --repo [org]/Orderly
   gh secret delete DATABASE_URL_STAGING_V2 --repo [org]/Orderly
   gh secret delete DATABASE_URL_DEV --repo [org]/Orderly
   ```

2. **Test Deployment After Staging Cleanup**:
   ```bash
   # Trigger a staging deployment to verify no issues
   gh workflow run "Deploy to Cloud Run" --ref staging \
     -f environment=staging \
     -f service_suffix=-v2 \
     -f force_backend_redeploy=true
   ```

3. **Monitor Deployment Success**:
   - Wait for deployment completion
   - Verify all services healthy: `ENV=staging SERVICE_SUFFIX=-v2 ./scripts/db/diag.sh`
   - Check post-deployment validation passes

4. **If Staging Test Passes, Remove Production Secrets**:
   ```bash
   # Only after staging verification succeeds
   gh secret delete DATABASE_URL_PRODUCTION --repo [org]/Orderly
   ```

### Step 3.3: Post-Deletion Verification
After each deletion, verify:

1. **Secret List Updated**:
   ```bash
   gh secret list --repo [org]/Orderly | grep -i database
   # Should only show separated variables, no DATABASE_URL_*
   ```

2. **No Workflow Failures**:
   - Monitor GitHub Actions for 24 hours
   - Check for authentication errors
   - Verify health checks pass

## 🔒 Phase 4: Security Hardening

### Step 4.1: Audit Remaining Secrets
Perform final security review of all secrets:

```bash
# Generate complete secret inventory report
gh secret list --repo [org]/Orderly > secret_audit_$(date +%Y%m%d).txt
```

### Step 4.2: Update Secret Rotation Schedule
Update security procedures to reflect new architecture:

| Secret Type | Rotation Frequency | Next Due | Owner |
|-------------|-------------------|----------|-------|
| POSTGRES_PASSWORD | Every 12 months | [Date] | Infrastructure Team |
| JWT_SECRET | Every 6 months | [Date] | Security Team |
| GCP_SA_KEY | Every 3 months | [Date] | DevOps Team |

### Step 4.3: Document Architecture Changes
Update security documentation to reflect:
- Migration from monolithic to separated variables
- Secret Manager integration
- Enhanced security posture

## 📊 Phase 5: Final Validation and Reporting

### Step 5.1: Execute Comprehensive System Test
Run full system validation to ensure everything works:

```bash
# Test all environments with new architecture
ENV=staging SERVICE_SUFFIX=-v2 ./scripts/run_plan_checks.sh
ENV=production ./scripts/run_plan_checks.sh
```

### Step 5.2: Performance Impact Assessment
Measure any performance changes:
- Database connection times
- Service startup latency
- Authentication performance
- Overall system reliability

### Step 5.3: Generate Migration Report
Create final migration report including:

```markdown
## DATABASE_URL to Separated Variables Migration - COMPLETE

**Migration Date**: [Date]
**Executed By**: [Admin Name]
**Duration**: [Time]

### Secrets Removed:
- DATABASE_URL_STAGING ✅
- DATABASE_URL_PRODUCTION ✅  
- DATABASE_URL_STAGING_V2 ✅
- DATABASE_URL_DEV ✅

### New Architecture Verified:
- ✅ Separated database variables (HOST, PORT, NAME, USER)
- ✅ Secret Manager integration
- ✅ Backward compatibility maintained
- ✅ All environments functional
- ✅ Security enhanced

### Post-Migration Testing:
- ✅ Staging deployment successful
- ✅ Production deployment successful
- ✅ All health checks passing
- ✅ No performance degradation
- ✅ Enhanced validation system active

### Next Actions:
- Monitor system for 48 hours
- Update team documentation
- Schedule next secret rotation
```

## ⚠️ Emergency Procedures

### If Deployment Fails After Secret Deletion

1. **Immediate Restoration** (if backup exists):
   ```bash
   gh secret set DATABASE_URL_STAGING --body "[backup_value]" --repo [org]/Orderly
   ```

2. **Alternative Recovery**:
   - Use separated variables manually
   - Check Secret Manager values
   - Verify environment variable configuration

3. **Escalation Path**:
   - Contact DevOps team immediately
   - Reference this document and timestamp
   - Provide error logs and deployment status

### Contact Information
- **Primary**: DevOps Team Lead
- **Secondary**: Infrastructure Manager  
- **Emergency**: Platform Architect

## ✅ Checklist Summary

- [ ] Phase 1: Discovery and audit complete
- [ ] Phase 2: New architecture verified
- [ ] Phase 3: Legacy secrets safely removed
- [ ] Phase 4: Security hardening applied
- [ ] Phase 5: Final validation and reporting
- [ ] Emergency procedures documented
- [ ] Team notified of completion

**Estimated Time**: 2-3 hours  
**Risk Level**: Low (comprehensive testing and fallbacks in place)  
**Business Impact**: None (seamless migration)

---

**Document Owner**: Infrastructure Team  
**Review Date**: Every 6 months  
**Next Update**: Upon next major security architecture change