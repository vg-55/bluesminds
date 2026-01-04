# Disaster Recovery & Business Continuity Plan

## Overview

This document outlines the disaster recovery procedures for BluesMinds AI Gateway to ensure minimal downtime and data loss in case of system failures, security breaches, or other catastrophic events.

## Recovery Objectives

- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 1 hour
- **Service Level:** 99.9% uptime (8.76 hours downtime/year)

## Backup Strategy

### Database Backups

#### Automated Backups (Supabase)

Supabase provides automated daily backups with 7-day retention:

```yaml
Backup Schedule:
  - Daily: Full backup at 03:00 UTC
  - Retention: 7 days (free), 30 days (pro)
  - Location: Supabase managed storage
```

#### Manual Backup Procedure

For critical changes or before major updates:

```bash
#!/bin/bash
# backup-database.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="bluesmind_backup_${TIMESTAMP}.sql"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Upload to S3
aws s3 cp ${BACKUP_FILE}.gz s3://bluesmind-backups/database/

# Upload to Google Cloud Storage (redundant)
gsutil cp ${BACKUP_FILE}.gz gs://bluesmind-backups/database/

# Keep local copy for 24 hours
find . -name "bluesmind_backup_*.sql.gz" -mtime +1 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

**Run manually:**
```bash
chmod +x backup-database.sh
./backup-database.sh
```

**Set up cron job (every 6 hours):**
```cron
0 */6 * * * /path/to/backup-database.sh >> /var/log/backup.log 2>&1
```

#### Backup Verification

Test backups monthly:

```bash
#!/bin/bash
# verify-backup.sh

# Download latest backup
aws s3 cp s3://bluesmind-backups/database/latest.sql.gz ./

# Decompress
gunzip latest.sql.gz

# Restore to test database
psql $TEST_DATABASE_URL < latest.sql

# Run validation queries
psql $TEST_DATABASE_URL -c "SELECT COUNT(*) FROM users;"
psql $TEST_DATABASE_URL -c "SELECT COUNT(*) FROM api_keys;"
psql $TEST_DATABASE_URL -c "SELECT COUNT(*) FROM usage_logs;"

echo "Backup verification completed"
```

### Environment Configuration Backup

```bash
#!/bin/bash
# backup-config.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create encrypted backup of environment variables
# Note: Do NOT commit this to git

# Vercel
vercel env pull .env.backup.${TIMESTAMP}

# Encrypt
gpg --symmetric --cipher-algo AES256 .env.backup.${TIMESTAMP}

# Upload encrypted file
aws s3 cp .env.backup.${TIMESTAMP}.gpg s3://bluesmind-backups/config/

# Remove unencrypted file
rm .env.backup.${TIMESTAMP}

echo "Config backup completed"
```

### Application Code Backup

- **Primary:** GitHub repository (main, develop branches)
- **Mirror:** GitLab mirror (automated sync)
- **Archive:** Tagged releases on both platforms

## Recovery Procedures

### Scenario 1: Complete Database Loss

**Impact:** HIGH - All user data, API keys, usage logs lost
**Likelihood:** LOW
**RTO:** 2 hours
**RPO:** 1 hour (depends on backup schedule)

**Recovery Steps:**

1. **Assess the Situation** (5 minutes)
   ```bash
   # Check database status
   psql $DATABASE_URL -c "SELECT 1"

   # Check Supabase dashboard
   # https://supabase.com/dashboard/project/_/settings/database
   ```

2. **Create New Database Instance** (15 minutes)
   - If Supabase instance is corrupted:
     - Create new Supabase project
     - Run migrations
     - Update environment variables

3. **Restore from Backup** (30 minutes)
   ```bash
   # Download latest backup
   aws s3 cp s3://bluesmind-backups/database/latest.sql.gz ./
   gunzip latest.sql.gz

   # Restore
   psql $NEW_DATABASE_URL < latest.sql

   # Verify
   psql $NEW_DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   ```

4. **Update Application** (15 minutes)
   ```bash
   # Update environment variables
   vercel env add DATABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add SUPABASE_SERVICE_ROLE_KEY

   # Redeploy
   vercel --prod
   ```

5. **Verify System** (30 minutes)
   - Test authentication
   - Test API gateway
   - Verify data integrity
   - Check all endpoints

6. **Communication** (15 minutes)
   - Update status page
   - Send notification to users
   - Post-mortem preparation

### Scenario 2: Application Deployment Failure

**Impact:** MEDIUM - Service unavailable but data intact
**Likelihood:** MEDIUM
**RTO:** 30 minutes
**RPO:** 0 (no data loss)

**Recovery Steps:**

1. **Rollback to Previous Version** (5 minutes)
   ```bash
   # Vercel
   vercel rollback

   # Or Docker
   docker pull username/bluesminds:previous-tag
   docker-compose up -d

   # Or Kubernetes
   kubectl rollout undo deployment/bluesminds-gateway -n bluesminds
   ```

2. **Verify Rollback** (5 minutes)
   ```bash
   curl https://your-domain.com/api/health
   ```

3. **Investigate Issue** (20 minutes)
   - Check deployment logs
   - Identify root cause
   - Fix and test locally

4. **Communication**
   - Update status page
   - Notify affected users

### Scenario 3: LiteLLM Server Failure

**Impact:** MEDIUM - Gateway cannot forward requests
**Likelihood:** MEDIUM
**RTO:** 15 minutes
**RPO:** 0 (no data loss)

**Recovery Steps:**

1. **Automatic Failover** (immediate)
   - Health monitor detects failure
   - Load balancer removes failed server
   - Routes to healthy servers

2. **Manual Intervention** (if needed)
   ```sql
   -- Disable failed server
   UPDATE litellm_servers
   SET is_active = false
   WHERE id = 'failed_server_id';

   -- Add new server
   INSERT INTO litellm_servers (name, base_url, weight, priority, supported_models)
   VALUES ('Backup Server', 'https://backup.example.com', 100, 1, ARRAY['gpt-4']);
   ```

3. **Monitor Recovery**
   ```bash
   # Check health
   curl https://your-domain.com/api/admin/health
   ```

### Scenario 4: Security Breach

**Impact:** CRITICAL - Potential data exposure, compromised API keys
**Likelihood:** LOW
**RTO:** 1 hour
**RPO:** 0 (preserve all data for forensics)

**Immediate Actions (15 minutes):**

1. **Isolate the System**
   ```bash
   # Disable all API keys temporarily
   psql $DATABASE_URL -c "UPDATE api_keys SET is_active = false;"

   # Take application offline (if necessary)
   vercel --prod --down  # or equivalent
   ```

2. **Assess Breach Scope**
   - Check audit logs
   - Identify compromised accounts
   - Determine data exposure

3. **Preserve Evidence**
   ```bash
   # Create forensic backup
   pg_dump $DATABASE_URL > forensic_backup_$(date +%Y%m%d_%H%M%S).sql

   # Save all logs
   kubectl logs deployment/bluesminds-gateway -n bluesminds --all-containers > logs_forensic.txt
   ```

**Recovery Actions (45 minutes):**

1. **Rotate All Secrets**
   ```bash
   # Generate new secrets
   NEW_JWT_SECRET=$(openssl rand -base64 32)
   NEW_API_KEY_SECRET=$(openssl rand -base64 32)

   # Update environment
   vercel env add JWT_SECRET
   vercel env add API_KEY_SECRET
   ```

2. **Force Password Reset**
   ```sql
   -- Invalidate all sessions
   DELETE FROM auth.sessions;

   -- Send password reset emails to all users
   -- (via Supabase or your email service)
   ```

3. **Revoke Compromised API Keys**
   ```sql
   -- Disable affected keys
   UPDATE api_keys
   SET is_active = false, revoked_at = NOW()
   WHERE user_id IN (SELECT user_id FROM compromised_accounts);
   ```

4. **Deploy Patches**
   ```bash
   # Apply security fixes
   git checkout -b security-patch
   # ... make fixes ...
   git commit -m "Security patch"
   git push origin security-patch

   # Deploy immediately
   vercel --prod
   ```

**Post-Incident (ongoing):**

1. Conduct full security audit
2. Notify affected users (legally required)
3. Update security measures
4. Post-mortem and lessons learned

### Scenario 5: Third-Party Service Outage

**Examples:** Supabase, Stripe, Vercel outage

**Impact:** MEDIUM-HIGH
**Likelihood:** LOW
**RTO:** Depends on service
**RPO:** 0

**Recovery Steps:**

1. **Monitor Status**
   - Check service status pages
   - Monitor social media
   - Contact support

2. **Implement Workarounds**
   ```yaml
   Supabase outage:
     - Switch to read-only mode
     - Use cached data
     - Queue write operations

   Stripe outage:
     - Disable new subscriptions temporarily
     - Queue payment processing
     - Use fallback payment processor

   Vercel outage:
     - Failover to backup deployment (AWS/GCP)
     - Use Cloudflare for caching
   ```

3. **Communication**
   - Update status page
   - Notify users of degraded service
   - Provide ETAs if available

## Business Continuity

### Redundancy

**Database:**
- Primary: Supabase (AWS us-east-1)
- Backup: Daily backups to S3 + GCS
- Read replicas: Available on Pro+ plans

**Application:**
- Primary: Vercel (multi-region)
- Backup: Docker image on AWS ECS (standby)
- CDN: Cloudflare (always active)

**LiteLLM Servers:**
- Minimum 2 servers at all times
- Different cloud providers (AWS + GCP)
- Health checks every 60 seconds

### Failover Architecture

```
                 ┌─────────────┐
                 │  Cloudflare │
                 │     CDN     │
                 └──────┬──────┘
                        │
            ┌───────────┴───────────┐
            │                       │
      ┌─────▼─────┐          ┌─────▼─────┐
      │  Primary  │          │  Backup   │
      │  (Vercel) │          │  (AWS)    │
      └─────┬─────┘          └─────┬─────┘
            │                       │
            └───────────┬───────────┘
                        │
                ┌───────▼────────┐
                │   Supabase     │
                │   (Primary)    │
                └───────┬────────┘
                        │
                ┌───────▼────────┐
                │  S3 Backups    │
                │  (Recovery)    │
                └────────────────┘
```

### Key Personnel

**On-Call Rotation:**
- Primary: DevOps Engineer
- Secondary: Backend Lead
- Escalation: CTO

**Contact Information:**
```yaml
Primary:
  Name: [Name]
  Phone: [Phone]
  Email: [Email]

Secondary:
  Name: [Name]
  Phone: [Phone]
  Email: [Email]

Escalation:
  Name: [Name]
  Phone: [Phone]
  Email: [Email]
```

**Vendor Contacts:**
```yaml
Supabase:
  Support: support@supabase.io
  Status: https://status.supabase.com
  Emergency: [Enterprise support number]

Vercel:
  Support: support@vercel.com
  Status: https://vercel-status.com
  Emergency: [Enterprise support number]

Stripe:
  Support: support@stripe.com
  Status: https://status.stripe.com
  Phone: 1-888-926-2289
```

## Testing & Drills

### Quarterly Disaster Recovery Drills

**Q1: Database Restore Drill**
- Restore latest backup to test environment
- Verify data integrity
- Time the process
- Document issues

**Q2: Full System Failover**
- Switch to backup deployment
- Test all functionality
- Measure downtime
- Document process

**Q3: Security Incident Response**
- Simulate breach detection
- Practice incident response
- Test communication plan
- Review and update procedures

**Q4: LiteLLM Server Failure**
- Simulate server failure
- Verify automatic failover
- Test manual intervention
- Update runbooks

### Monthly Health Checks

```bash
#!/bin/bash
# monthly-health-check.sh

echo "=== Monthly Health Check ==="
echo "Date: $(date)"

# Test backup restoration
echo "1. Testing backup restoration..."
./verify-backup.sh

# Check backup availability
echo "2. Checking backup availability..."
aws s3 ls s3://bluesmind-backups/database/ --recursive | tail -n 10

# Verify monitoring
echo "3. Verifying monitoring..."
curl https://your-domain.com/api/health

# Check certificate expiry
echo "4. Checking SSL certificate..."
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Test emergency contacts
echo "5. Testing emergency contact list..."
# Send test alert to on-call

echo "=== Health Check Complete ==="
```

## Post-Incident Procedures

### 1. Incident Log

Document every incident:

```markdown
# Incident Report: [YYYY-MM-DD]

## Incident Details
- **Date/Time:** 2024-01-04 14:30 UTC
- **Duration:** 2 hours 15 minutes
- **Severity:** High
- **Services Affected:** API Gateway, User Authentication

## Timeline
- 14:30 - Issue detected
- 14:35 - Incident declared
- 14:45 - Root cause identified
- 15:30 - Fix deployed
- 16:45 - Services fully restored

## Root Cause
[Detailed description]

## Resolution
[Steps taken]

## Impact
- Users affected: 1,500
- Requests failed: 25,000
- Revenue impact: $500

## Action Items
- [ ] Update monitoring to detect earlier
- [ ] Add automated failover
- [ ] Document runbook
- [ ] Team training

## Lessons Learned
[Key takeaways]
```

### 2. Post-Mortem Meeting

Schedule within 48 hours:
- Review timeline
- Identify root cause
- Discuss preventive measures
- Assign action items

### 3. Communication

**Internal:**
- Share incident report with team
- Update runbooks
- Update training materials

**External:**
- Publish status page update
- Send notification to affected users
- Update incident history

## Regular Maintenance

### Weekly
- [ ] Review backup logs
- [ ] Check monitoring alerts
- [ ] Verify health checks

### Monthly
- [ ] Test backup restoration
- [ ] Review incident logs
- [ ] Update documentation
- [ ] Security audit

### Quarterly
- [ ] Disaster recovery drill
- [ ] Review and update procedures
- [ ] Team training
- [ ] Vendor relationship review

### Annually
- [ ] Full DR plan review
- [ ] Update contact information
- [ ] Review insurance coverage
- [ ] Third-party security audit

## Emergency Contacts

**Internal:**
- On-Call: [Phone]
- DevOps Lead: [Phone]
- CTO: [Phone]

**External:**
- Supabase Support: support@supabase.io
- Vercel Support: support@vercel.com
- Stripe Support: 1-888-926-2289
- AWS Support: [Account-specific]

**Legal:**
- Legal Counsel: [Phone]
- Data Protection Officer: [Phone]

---

**Last Updated:** 2024-01-04
**Next Review:** 2024-04-04
**Document Owner:** DevOps Team
