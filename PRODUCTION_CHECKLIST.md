# Production Deployment Checklist

Use this checklist before deploying to production. Check off each item as you complete it.

## Pre-Deployment

### Security

- [ ] All secrets use strong random values (32+ characters)
- [ ] `JWT_SECRET` is unique and secure
- [ ] `API_KEY_SECRET` is unique and secure
- [ ] `STRIPE_WEBHOOK_SECRET` is configured (if using Stripe)
- [ ] No secrets are committed to version control
- [ ] `.env.local` is in `.gitignore`
- [ ] `NODE_ENV=production` is set in production
- [ ] HTTPS is enabled and enforced
- [ ] Security headers are configured (check middleware)
- [ ] CORS origins are restricted (not using `*` in production)
- [ ] Rate limiting is enabled
- [ ] Database RLS (Row Level Security) policies are active
- [ ] Admin emails are configured correctly
- [ ] Sensitive data is encrypted at rest

### Database

- [ ] Supabase production project is created
- [ ] Database migrations have been applied (`supabase db push`)
- [ ] All required tables exist:
  - [ ] `users`
  - [ ] `api_keys`
  - [ ] `litellm_servers`
  - [ ] `usage_logs`
  - [ ] `rate_limits`
  - [ ] `billing_plans`
  - [ ] `invoices`
  - [ ] `payment_transactions`
- [ ] Database functions are created
- [ ] Indexes are optimized
- [ ] Connection pooling is configured
- [ ] Automated backups are enabled
- [ ] Backup retention is configured (30+ days recommended)
- [ ] Database credentials are secure
- [ ] Database access is restricted by IP (if applicable)

### LiteLLM Configuration

- [ ] At least one LiteLLM server is deployed
- [ ] LiteLLM server is accessible from your application
- [ ] LiteLLM server is added to database:
  ```sql
  INSERT INTO litellm_servers (name, base_url, weight, priority, supported_models)
  VALUES ('Primary', 'https://your-litellm.com', 100, 1, ARRAY['gpt-4', 'gpt-3.5-turbo']);
  ```
- [ ] Health monitoring is working
- [ ] At least 2 models are configured
- [ ] API keys for LLM providers are set in LiteLLM
- [ ] Load balancing is tested

### Application Configuration

- [ ] All required environment variables are set:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `NEXT_PUBLIC_APP_URL`
  - [ ] `JWT_SECRET`
  - [ ] `API_KEY_SECRET`
  - [ ] `ADMIN_EMAILS`
- [ ] Optional environment variables (if using):
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `STRIPE_PRICE_STARTER`
  - [ ] `STRIPE_PRICE_PRO`
  - [ ] `STRIPE_PRICE_ENTERPRISE`
  - [ ] `SENTRY_DSN`
  - [ ] `LOGTAIL_SOURCE_TOKEN`
- [ ] `NEXT_PUBLIC_APP_URL` points to production domain
- [ ] Feature flags are set correctly
- [ ] Rate limit defaults are appropriate
- [ ] BCRYPT_ROUNDS is set (10-12 recommended)

### Build & Tests

- [ ] All dependencies are installed (`pnpm install`)
- [ ] Application builds successfully (`pnpm build`)
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] All tests pass (`pnpm test --run`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Bundle size is optimized
- [ ] No console errors in browser
- [ ] No console warnings in browser

### Stripe Configuration (if using billing)

- [ ] Stripe account is in production mode
- [ ] Products are created:
  - [ ] Starter ($29/month)
  - [ ] Pro ($99/month)
  - [ ] Enterprise ($299/month)
- [ ] Price IDs are added to environment variables
- [ ] Webhook endpoint is configured:
  - [ ] URL: `https://your-domain.com/api/billing/webhook`
  - [ ] Events selected: `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`
  - [ ] Webhook secret is saved
- [ ] Test mode transactions are tested
- [ ] Production mode is tested
- [ ] Payment flow is working end-to-end

## Deployment

### Platform Setup

Choose your deployment platform:

#### Vercel
- [ ] Vercel account created
- [ ] Project is linked (`vercel link`)
- [ ] All environment variables are set in Vercel dashboard
- [ ] Production domain is configured
- [ ] DNS is pointing to Vercel
- [ ] SSL certificate is active
- [ ] Custom domain is verified

#### Docker/Kubernetes
- [ ] Docker image builds successfully
- [ ] Image is pushed to registry
- [ ] Kubernetes manifests are configured
- [ ] Secrets are created in cluster
- [ ] Services and ingress are configured
- [ ] Load balancer is set up
- [ ] SSL certificate is configured
- [ ] Health checks are working

#### Other Cloud (AWS, GCP, Azure)
- [ ] Cloud account is set up
- [ ] Resources are provisioned
- [ ] Environment variables are configured
- [ ] Load balancer is configured
- [ ] Auto-scaling is configured
- [ ] SSL certificate is configured
- [ ] Health checks are working

### Domain & DNS

- [ ] Domain is purchased/registered
- [ ] DNS records are configured:
  - [ ] A record or CNAME points to deployment
  - [ ] WWW redirect is set up (if desired)
  - [ ] MX records for email (if needed)
- [ ] SSL certificate is active and valid
- [ ] HTTPS is enforced (HTTP redirects to HTTPS)
- [ ] Domain is accessible from multiple locations
- [ ] DNS propagation is complete

### Monitoring & Observability

- [ ] Health check endpoint is working (`/api/health`)
- [ ] Liveness probe is configured (`/api/health/live`)
- [ ] Readiness probe is configured (`/api/health/ready`)
- [ ] Error tracking is set up (Sentry or similar)
- [ ] Log aggregation is configured (Logtail or similar)
- [ ] Uptime monitoring is enabled (UptimeRobot, Pingdom)
- [ ] Performance monitoring is enabled
- [ ] Alerts are configured for:
  - [ ] Application errors
  - [ ] High response times
  - [ ] Database issues
  - [ ] Rate limit exhaustion
  - [ ] Service downtime
  - [ ] SSL expiration
- [ ] Status page is set up (optional but recommended)

## Post-Deployment

### Verification

- [ ] Application is accessible at production URL
- [ ] Health check returns 200: `curl https://your-domain.com/api/health`
- [ ] API endpoints are working
- [ ] Test user registration flow:
  ```bash
  curl -X POST https://your-domain.com/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!","full_name":"Test User"}'
  ```
- [ ] Test user login via UI
- [ ] Create test API key via dashboard
- [ ] Test gateway endpoint:
  ```bash
  curl -X POST https://your-domain.com/api/v1/chat/completions \
    -H "Authorization: Bearer bm_test_key" \
    -H "Content-Type: application/json" \
    -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}]}'
  ```
- [ ] Test streaming responses
- [ ] Test embeddings endpoint
- [ ] Test models list endpoint
- [ ] Verify rate limiting is working
- [ ] Verify usage tracking is working
- [ ] Check logs for any errors
- [ ] Test authentication flow completely
- [ ] Test API key creation, rotation, deletion
- [ ] Test payment flow (if using Stripe)
- [ ] Test billing portal (if using Stripe)

### Performance

- [ ] Page load time < 3 seconds
- [ ] API response time < 1 second (non-streaming)
- [ ] Database query time < 100ms
- [ ] No memory leaks detected
- [ ] No CPU spikes
- [ ] CDN is caching static assets
- [ ] Images are optimized
- [ ] Bundle size is acceptable

### Security

- [ ] Security headers are present:
  ```bash
  curl -I https://your-domain.com/
  # Check for: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, etc.
  ```
- [ ] HTTPS is enforced (check HTTP redirects to HTTPS)
- [ ] CORS is configured correctly
- [ ] No sensitive data in client-side code
- [ ] No secrets in error messages
- [ ] Rate limiting is preventing abuse
- [ ] API keys are hashed in database (not plain text)
- [ ] Passwords are hashed in database
- [ ] Session tokens are secure (httpOnly, secure)
- [ ] SQL injection is prevented (using parameterized queries)
- [ ] XSS is prevented (proper escaping)
- [ ] CSRF protection is in place

### Documentation

- [ ] README.md is updated
- [ ] API documentation is available
- [ ] Setup guide is complete (SETUP.md)
- [ ] Quick start guide is available (QUICKSTART.md)
- [ ] Production deployment guide is available (PRODUCTION.md)
- [ ] Disaster recovery plan is documented (DISASTER_RECOVERY.md)
- [ ] Architecture documentation is available
- [ ] Change log is maintained
- [ ] Contributing guide is available (if open source)

### Team

- [ ] On-call rotation is set up
- [ ] Team has access to production systems
- [ ] Team knows how to respond to incidents
- [ ] Runbooks are documented
- [ ] Contact information is up to date
- [ ] Escalation procedures are defined

### Legal & Compliance

- [ ] Privacy policy is published
- [ ] Terms of service are published
- [ ] Cookie policy is displayed (if applicable)
- [ ] GDPR compliance is verified (if serving EU)
- [ ] Data retention policy is implemented
- [ ] User data export is available
- [ ] User data deletion is available
- [ ] Audit logging is enabled

## Operations

### Daily

- [ ] Check error logs
- [ ] Monitor response times
- [ ] Verify backup completion
- [ ] Check system health

### Weekly

- [ ] Review usage metrics
- [ ] Check for security updates
- [ ] Review slow queries
- [ ] Monitor costs

### Monthly

- [ ] Update dependencies
- [ ] Test backup restoration
- [ ] Review and rotate secrets
- [ ] Capacity planning review
- [ ] Security audit
- [ ] Review incident logs

### Quarterly

- [ ] Disaster recovery drill
- [ ] Review documentation
- [ ] Team training
- [ ] Architecture review

## Rollback Plan

If something goes wrong:

1. **Immediate Rollback**
   ```bash
   # Vercel
   vercel rollback

   # Docker
   docker-compose down
   docker-compose up -d --build

   # Kubernetes
   kubectl rollout undo deployment/bluesminds-gateway -n bluesminds
   ```

2. **Database Rollback**
   ```bash
   # Restore from backup if needed
   psql $DATABASE_URL < backup.sql
   ```

3. **Verify Rollback**
   ```bash
   curl https://your-domain.com/api/health
   ```

4. **Communicate**
   - Update status page
   - Notify affected users
   - Post-mortem

## Sign-Off

Before marking as complete, get sign-off from:

- [ ] Tech Lead
- [ ] DevOps Engineer
- [ ] Security Lead
- [ ] Product Manager

**Deployment Date:** _________________

**Deployed By:** _________________

**Verified By:** _________________

**Production URL:** https://_________________

---

**Notes:**

_Use this space to document any deployment-specific notes, issues encountered, or deviations from the checklist._

---

**Last Updated:** 2024-01-04
