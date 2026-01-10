# Production Deployment Guide

Complete guide for deploying BluesMinds AI Gateway to production.

## Pre-Deployment Checklist

### Security
- [ ] All environment variables use strong, random values (32+ characters)
- [ ] `NODE_ENV=production` is set
- [ ] HTTPS is enabled and enforced
- [ ] CORS origins are restricted to your domains
- [ ] API rate limits are configured appropriately
- [ ] Database RLS policies are enabled and tested
- [ ] Webhook signatures are verified

### Configuration
- [ ] Supabase production project is set up
- [ ] Database migrations have been run
- [ ] At least one LiteLLM server is configured and healthy
- [ ] Admin emails are configured
- [ ] Stripe is configured (if using billing)
- [ ] Monitoring and error tracking are enabled

### Testing
- [ ] All tests pass (`pnpm test`)
- [ ] Application builds successfully (`pnpm build`)
- [ ] Health check endpoints respond correctly
- [ ] API gateway functionality is tested
- [ ] Authentication flow is tested
- [ ] Payment flow is tested (if applicable)

## Deployment Options

### Option 1: Vercel (Recommended for Quick Start)

#### Prerequisites
- Vercel account
- Vercel CLI installed: `npm install -g vercel`

#### Steps

1. **Install Vercel CLI and login**
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Link your project**
   ```bash
   vercel link
   ```

3. **Set environment variables**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add JWT_SECRET
   vercel env add API_KEY_SECRET
   vercel env add ADMIN_EMAILS

   # Add Creem variables if using billing
   vercel env add CREEM_API_KEY
   vercel env add CREEM_WEBHOOK_SECRET
   vercel env add CREEM_PRODUCT_STARTER
   vercel env add CREEM_PRODUCT_PRO
   vercel env add CREEM_PRODUCT_ENTERPRISE
   ```

4. **Deploy**
   ```bash
   vercel --prod
   ```

5. **Configure Creem webhook** (if using billing)
   - Go to Creem Dashboard → Webhooks
   - Add endpoint: `https://your-domain.vercel.app/api/billing/webhook`
   - Set the webhook secret in `CREEM_WEBHOOK_SECRET`
   - Select events: `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`
   - Copy webhook secret and update in Vercel

#### Vercel Configuration

The `vercel.json` file is already configured with:
- Optimal function timeouts
- Security headers
- Health check rewrites

### Option 2: Docker + Cloud Run / AWS ECS / Azure Container Instances

#### Prerequisites
- Docker installed
- Cloud provider account
- Container registry (Docker Hub, GCR, ECR, ACR)

#### Steps

1. **Build Docker image**
   ```bash
   docker build -t bluesminds-gateway:latest .
   ```

2. **Test locally**
   ```bash
   docker run -p 3000:3000 \
     -e NEXT_PUBLIC_SUPABASE_URL=your-url \
     -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
     # ... other env vars
     bluesminds-gateway:latest
   ```

3. **Push to registry**
   ```bash
   # Docker Hub
   docker tag bluesminds-gateway:latest username/bluesminds:latest
   docker push username/bluesminds:latest

   # Or GCR
   docker tag bluesminds-gateway:latest gcr.io/project-id/bluesminds:latest
   docker push gcr.io/project-id/bluesminds:latest
   ```

4. **Deploy to cloud provider**

   **Google Cloud Run:**
   ```bash
   gcloud run deploy bluesminds-gateway \
     --image gcr.io/project-id/bluesminds:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars "NODE_ENV=production,..." \
     --port 3000
   ```

   **AWS ECS/Fargate:**
   - Create task definition with your image
   - Set environment variables
   - Configure load balancer
   - Deploy service

   **Azure Container Instances:**
   ```bash
   az container create \
     --resource-group myResourceGroup \
     --name bluesminds-gateway \
     --image username/bluesminds:latest \
     --dns-name-label bluesminds \
     --ports 3000 \
     --environment-variables \
       NODE_ENV=production \
       # ... other env vars
   ```

### Option 3: Kubernetes

#### Prerequisites
- Kubernetes cluster
- kubectl configured
- Helm (optional)

#### Steps

1. **Create namespace**
   ```bash
   kubectl create namespace bluesminds
   ```

2. **Create secrets**
   ```bash
   kubectl create secret generic bluesminds-secrets \
     --from-literal=SUPABASE_SERVICE_ROLE_KEY=your-key \
     --from-literal=JWT_SECRET=your-secret \
     --from-literal=API_KEY_SECRET=your-secret \
     -n bluesminds
   ```

3. **Create deployment**
   ```yaml
   # k8s-deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: bluesminds-gateway
     namespace: bluesminds
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: bluesminds-gateway
     template:
       metadata:
         labels:
           app: bluesminds-gateway
       spec:
         containers:
         - name: gateway
           image: username/bluesminds:latest
           ports:
           - containerPort: 3000
           env:
           - name: NODE_ENV
             value: "production"
           - name: NEXT_PUBLIC_SUPABASE_URL
             value: "https://xxx.supabase.co"
           # Add other env vars or use envFrom for secrets
           livenessProbe:
             httpGet:
               path: /api/health/live
               port: 3000
             initialDelaySeconds: 30
             periodSeconds: 10
           readinessProbe:
             httpGet:
               path: /api/health/ready
               port: 3000
             initialDelaySeconds: 5
             periodSeconds: 5
           resources:
             requests:
               memory: "256Mi"
               cpu: "250m"
             limits:
               memory: "512Mi"
               cpu: "500m"
   ```

4. **Create service and ingress**
   ```yaml
   # k8s-service.yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: bluesminds-gateway
     namespace: bluesminds
   spec:
     selector:
       app: bluesminds-gateway
     ports:
     - port: 80
       targetPort: 3000
     type: LoadBalancer
   ```

5. **Apply configuration**
   ```bash
   kubectl apply -f k8s-deployment.yaml
   kubectl apply -f k8s-service.yaml
   ```

## Post-Deployment

### 1. Verify Deployment

```bash
# Check health
curl https://your-domain.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-04T...",
  "checks": {
    "database": { "status": "up", "responseTime": 50 },
    "memory": { "used": 120, "total": 512, "percentage": 23.4 },
    "uptime": 3600
  }
}
```

### 2. Test Critical Paths

```bash
# Test signup
curl -X POST https://your-domain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","full_name":"Test User"}'

# Create API key (after login via UI)

# Test gateway
curl -X POST https://your-domain.com/api/v1/chat/completions \
  -H "Authorization: Bearer bm_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello!"}]}'
```

### 3. Set Up Monitoring

#### Application Monitoring
- [ ] Configure Sentry for error tracking
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure log aggregation (Logtail, Datadog)
- [ ] Set up APM if needed (New Relic, Datadog APM)

#### Infrastructure Monitoring
- [ ] CPU and memory alerts
- [ ] Disk space monitoring
- [ ] Network monitoring
- [ ] Database performance monitoring

#### Business Metrics
- [ ] API request volume
- [ ] Error rates
- [ ] Response times (p50, p95, p99)
- [ ] Rate limit hits
- [ ] Cost tracking

### 4. Set Up Alerts

Configure alerts for:
- Application errors (>10 errors/minute)
- High response times (p95 > 2 seconds)
- Database connection failures
- High memory usage (>85%)
- Rate limit exhaustion
- Payment failures

### 5. Backups

#### Database Backups
```sql
-- Enable Supabase automated backups (already enabled by default)
-- Or configure manual backups:

-- Create backup script
#!/bin/bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
# Upload to S3/GCS
aws s3 cp backup_*.sql s3://your-bucket/backups/
```

#### Environment Configuration Backup
```bash
# Export Vercel env vars
vercel env pull .env.backup

# Or backup from other platforms
# Keep this in a secure location (NOT in git)
```

## Scaling

### Horizontal Scaling

**Vercel:**
- Automatically scales based on traffic
- Configure concurrent builds if needed

**Docker/Kubernetes:**
```bash
# Scale to 5 replicas
kubectl scale deployment bluesminds-gateway --replicas=5 -n bluesminds

# Or enable auto-scaling
kubectl autoscale deployment bluesminds-gateway \
  --min=3 --max=10 --cpu-percent=70 -n bluesminds
```

### Database Scaling

1. **Supabase Scaling:**
   - Upgrade to Pro plan for better performance
   - Enable connection pooling (PgBouncer)
   - Add read replicas if needed

2. **Optimize Queries:**
   - Add indexes for frequently queried columns
   - Use partitioning for large tables (already done for usage_logs)

### LiteLLM Scaling

1. **Add more servers:**
   ```sql
   INSERT INTO litellm_servers (name, base_url, weight, priority, supported_models)
   VALUES ('Server-2', 'https://litellm-2.example.com', 100, 1, ARRAY['gpt-4']);
   ```

2. **Load balancing is automatic:**
   - Requests are distributed based on health and weight
   - Failed servers are automatically removed from rotation

## Troubleshooting

### Issue: Database connection failures

**Check:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"
```

**Solutions:**
- Verify Supabase service role key
- Check if IP is whitelisted (if using IP restrictions)
- Verify database isn't paused (free tier auto-pauses)

### Issue: API gateway not forwarding requests

**Check:**
```bash
# View logs
vercel logs --follow  # Vercel
kubectl logs -f deployment/bluesminds-gateway -n bluesminds  # K8s
docker logs -f container_id  # Docker
```

**Solutions:**
- Verify LiteLLM servers are configured and healthy
- Check `/api/admin/health` endpoint
- Verify API key is valid

### Issue: High memory usage

**Check:**
```bash
# View memory stats
curl https://your-domain.com/api/health
```

**Solutions:**
- Increase container memory limits
- Check for memory leaks in custom code
- Enable Node.js memory limits: `NODE_OPTIONS=--max-old-space-size=512`

## Security Best Practices

1. **API Keys:**
   - Rotate secrets regularly
   - Use different keys for different environments
   - Never commit secrets to git

2. **Database:**
   - Enable RLS policies
   - Use service role key only on backend
   - Regularly review access logs

3. **Network:**
   - Use HTTPS only (enforce with HSTS)
   - Configure WAF if available
   - Implement DDoS protection

4. **Application:**
   - Keep dependencies updated
   - Run security audits: `pnpm audit`
   - Monitor for vulnerabilities

## Maintenance

### Regular Tasks

**Daily:**
- Check error logs
- Monitor response times
- Verify backup completion

**Weekly:**
- Review usage patterns
- Check for security updates
- Analyze slow queries

**Monthly:**
- Update dependencies
- Review and rotate secrets
- Capacity planning review
- Cost optimization review

### Updates

```bash
# Update dependencies
pnpm update

# Run tests
pnpm test --run

# Build and deploy
pnpm build
vercel --prod  # or your deployment method
```

## Support

For issues:
1. Check health endpoint: `/api/health`
2. Review logs
3. Check [GitHub Issues](https://github.com/your-repo/issues)
4. Contact support: support@bluesminds.com

---

**Last Updated:** 2024-01-04
