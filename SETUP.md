# BluesMinds AI Gateway - Setup Guide

This guide will help you set up and run BluesMinds AI Gateway from scratch.

## Prerequisites

- Node.js 18+ and pnpm installed
- Supabase account (https://supabase.com)
- Creem account (https://docs.creem.io/getting-started/introduction) for billing
- LiteLLM installed (optional for local testing)

## Step 1: Install Dependencies

```bash
pnpm install
```

## Step 2: Supabase Setup

### 2.1 Create a Supabase Project

1. Go to https://supabase.com and create a new project
2. Wait for the project to be provisioned (takes ~2 minutes)
3. Note down your project URL and API keys from Settings > API

### 2.2 Run Database Migrations

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link your project:
```bash
supabase link --project-ref your-project-ref
```

3. Push migrations to your database:
```bash
supabase db push
```

Alternatively, you can run the SQL migrations manually:
- Go to your Supabase project's SQL Editor
- Run each migration file in order (001, 002, 003, 004)

## Step 3: Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in all required values:

### 3.1 Supabase Configuration

```env
# Get these from Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3.2 Application Configuration

```env
# Your application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Generate a secure random string (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Generate another secure random string for API key encryption
API_KEY_SECRET=your-super-secret-api-key-min-32-chars
```

To generate secure secrets, you can use:
```bash
openssl rand -base64 32
```

### 3.3 Creem Configuration

```env
# Get this from Creem Dashboard
CREEM_API_KEY=creem_...

# Get this from Creem Dashboard > Webhooks
CREEM_WEBHOOK_SECRET=whsec_...

# Create products in Creem, then add their IDs
CREEM_PRODUCT_STARTER=prod_...
CREEM_PRODUCT_PRO=prod_...
CREEM_PRODUCT_ENTERPRISE=prod_...
```

### 3.4 Admin Configuration

```env
# Comma-separated list of admin emails
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

## Step 4: Creem Setup

### 4.1 Create Products and Prices

1. Go to Creem Dashboard > Products
2. Create three products:
   - **Starter**: $29/month
     - 1M tokens/day
     - 100 req/min
   - **Pro**: $99/month
     - 10M tokens/day
     - 1000 req/min
   - **Enterprise**: $299/month
     - Unlimited tokens
     - 5000 req/min

3. Copy the Product IDs and add them to `.env.local`

### 4.2 Setup Webhook Endpoint

1. Go to Creem Dashboard > Webhooks
2. Add endpoint: `https://your-domain.com/api/billing/webhook`
3. Configure the webhook secret and set it as `CREEM_WEBHOOK_SECRET`

For local testing, use a tunnel (e.g. ngrok) to expose your local server:
```bash
ngrok http 3000
# then set webhook endpoint to: https://<id>.ngrok-free.app/api/billing/webhook
```

## Step 5: LiteLLM Server Setup

BluesMinds routes requests through LiteLLM servers. You need at least one LiteLLM server running.

### 5.1 Install LiteLLM

```bash
pip install litellm[proxy]
```

### 5.2 Create LiteLLM Configuration

Create `litellm_config.yaml`:

```yaml
model_list:
  - model_name: gpt-4
    litellm_params:
      model: gpt-4
      api_key: os.environ/OPENAI_API_KEY

  - model_name: gpt-3.5-turbo
    litellm_params:
      model: gpt-3.5-turbo
      api_key: os.environ/OPENAI_API_KEY

  - model_name: claude-3-opus
    litellm_params:
      model: claude-3-opus-20240229
      api_key: os.environ/ANTHROPIC_API_KEY

litellm_settings:
  success_callback: ["langfuse"]
  failure_callback: ["langfuse"]
```

### 5.3 Start LiteLLM Server

```bash
export OPENAI_API_KEY=your-openai-key
export ANTHROPIC_API_KEY=your-anthropic-key
litellm --config litellm_config.yaml --port 4000
```

### 5.4 Register LiteLLM Server in Database

Connect to your Supabase database and insert a server record:

```sql
INSERT INTO litellm_servers (name, base_url, api_key, is_active, weight, models)
VALUES (
  'Primary Server',
  'http://localhost:4000',
  'your-litellm-master-key',  -- if you set LITELLM_MASTER_KEY
  true,
  100,
  ARRAY['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus']
);
```

## Step 6: Run the Application

### Development Mode

```bash
pnpm dev
```

The application will be available at http://localhost:3000

### Production Build

```bash
pnpm build
pnpm start
```

## Step 7: Create Your First User

1. Navigate to http://localhost:3000/signup
2. Create an account with your email and password
3. You'll be redirected to the dashboard

## Step 8: Create Your First API Key

1. In the dashboard, go to "API Keys"
2. Click "Create New Key"
3. Configure the key settings:
   - Name: "Test Key"
   - Scopes: Select the permissions needed
   - Rate limits: Leave default or customize
4. Copy the generated key (shown only once!)

## Step 9: Test the Gateway

### Using cURL

```bash
curl http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer bm_your_api_key_here" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Using OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    api_key="bm_your_api_key_here",
    base_url="http://localhost:3000/api/v1"
)

response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

## Troubleshooting

### Build Errors

**Error**: Missing environment variables
- **Solution**: Ensure all required variables in `.env.local` are set
- Check `.env.example` for the complete list

**Error**: Cannot connect to Supabase
- **Solution**: Verify your Supabase URL and keys are correct
- Make sure your Supabase project is active

### Runtime Errors

**Error**: No LiteLLM servers available
- **Solution**:
  1. Ensure at least one LiteLLM server is running
  2. Check the `litellm_servers` table has active servers
  3. Verify the server URL is accessible from your application

**Error**: Rate limit exceeded
- **Solution**: Check your user tier limits in the database
- Default free tier: 60 RPM, 90K TPM

**Error**: Creem webhook signature verification failed
- **Solution**:
  1. Verify `CREEM_WEBHOOK_SECRET` is correct
  2. Ensure the webhook signature header matches (default: `creem-signature`)
  3. For local testing, ensure your tunnel forwards the raw request body unchanged

### Database Issues

**Error**: Migration failed
- **Solution**:
  1. Check Supabase logs in Dashboard > Database > Logs
  2. Ensure you're running migrations in order
  3. Drop and recreate database if needed (development only!)

**Error**: Row Level Security (RLS) errors
- **Solution**:
  1. Check RLS policies in migration files
  2. Ensure service role key is used for server-side operations
  3. Verify user authentication is working

## Production Deployment

### Recommended Setup

1. **Deploy Application**: Vercel, Railway, or any Node.js hosting
2. **Database**: Use managed Supabase (already set up)
3. **LiteLLM Servers**: Deploy on separate servers for reliability
   - Use Docker for easy deployment
   - Set up multiple servers for load balancing
   - Configure health checks
4. **Monitoring**: Set up Sentry or similar for error tracking

### Environment Variables for Production

Update `.env.local` (or hosting platform's env vars):

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### Security Checklist

- [ ] Use strong secrets (32+ characters)
- [ ] Enable HTTPS (required for Creem webhooks)
- [ ] Configure CORS if needed
- [ ] Set up rate limiting at infrastructure level
- [ ] Enable Supabase Auth email verification
- [ ] Configure proper RLS policies
- [ ] Set up database backups
- [ ] Monitor API usage and costs
- [ ] Set up alerts for high error rates

## Next Steps

1. **Customize Pricing**: Adjust tiers and pricing in Creem and database
2. **Add Models**: Configure more LLM providers in LiteLLM
3. **Set Up Monitoring**: Implement logging and monitoring
4. **Customize UI**: Update branding and styling
5. **Add Features**: Implement additional features as needed

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the codebase documentation
- Check LiteLLM docs: https://docs.litellm.ai/
- Check Supabase docs: https://supabase.com/docs

## Architecture Overview

```
User Request → BluesMinds Gateway → Authentication → Rate Limiting
    → Load Balancer → LiteLLM Server → LLM Provider (OpenAI/Anthropic/etc)
    → Response ← LiteLLM ← Gateway → Usage Tracking → User
```

The gateway handles:
- Authentication with API keys
- Rate limiting (RPM, TPM, quotas)
- Load balancing across LiteLLM servers
- Usage tracking and billing
- Health monitoring
- Error handling and retries
