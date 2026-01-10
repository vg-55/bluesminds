# BluesMinds Quick Start Guide

Get BluesMinds up and running in 5 minutes!

## Prerequisites

- Node.js 18+ with pnpm
- Supabase account (free tier works)
- (Optional) Creem account for billing

## Step 1: Clone and Install (1 min)

```bash
cd bluesminds
pnpm install
```

## Step 2: Environment Setup (2 mins)

### Option A: Interactive Setup (Recommended)

```bash
bash scripts/setup-env.sh
```

Follow the prompts to configure your environment.

### Option B: Manual Setup

1. Copy the example file:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` and set these required variables:

```env
# Supabase (get from https://supabase.com/dashboard/project/_/settings/api)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Generate secrets (run: openssl rand -base64 32)
JWT_SECRET=your-random-secret-here
API_KEY_SECRET=another-random-secret-here

# Admin emails
ADMIN_EMAILS=your@email.com
```

## Step 3: Database Setup (1 min)

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

**Alternative**: Manually run SQL migrations in Supabase Dashboard SQL Editor:
1. Go to https://supabase.com/dashboard/project/_/sql
2. Copy and run each migration file in order from `supabase/migrations/`

## Step 4: Start the App (30 seconds)

```bash
pnpm dev
```

Visit: http://localhost:3000

## Step 5: Create Your First API Key (1 min)

1. Sign up at http://localhost:3000/signup
2. Go to Dashboard > API Keys
3. Click "Create New Key"
4. Copy the generated key (shown only once!)

## Test Your Gateway

```bash
curl http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## What's Next?

### For Basic Testing (No Billing)

You're done! You can now:
- Create and manage API keys
- View usage statistics
- Test the gateway endpoints

The app will work without Creem - billing features will just be disabled.

### To Enable Billing

Add these to `.env.local`:

```env
CREEM_API_KEY=creem_...
CREEM_WEBHOOK_SECRET=whsec_...
CREEM_PRODUCT_STARTER=prod_...
CREEM_PRODUCT_PRO=prod_...
CREEM_PRODUCT_ENTERPRISE=prod_...
```

See [SETUP.md](./SETUP.md) for detailed Creem configuration.

### To Set Up LiteLLM Server

```bash
# Install LiteLLM
pip install litellm[proxy]

# Create config file (litellm_config.yaml)
model_list:
  - model_name: gpt-3.5-turbo
    litellm_params:
      model: gpt-3.5-turbo
      api_key: your-openai-key

# Start server
litellm --config litellm_config.yaml --port 4000

# Add to database
INSERT INTO litellm_servers (name, base_url, is_active, weight, models)
VALUES ('Primary', 'http://localhost:4000', true, 100, ARRAY['gpt-3.5-turbo']);
```

See [SETUP.md](./SETUP.md) for detailed LiteLLM configuration.

## Common Issues

### Build fails with "Missing environment variables"

**Solution**: Make sure all required variables in `.env.local` are set. Run:
```bash
bash scripts/validate-setup.sh
```

### "Cannot connect to Supabase"

**Solution**:
1. Check your Supabase URL and keys
2. Verify your Supabase project is active
3. Ensure you've run the migrations

### "No LiteLLM servers available"

**Solution**:
1. Set up at least one LiteLLM server (see above)
2. Add it to the `litellm_servers` table in your database
3. Verify the server is accessible

### Login/Signup not working

**Solution**:
1. Check browser console for errors
2. Verify Supabase Auth is enabled in your project
3. Check that your Supabase keys are correct

## Validate Your Setup

Run the validation script to check everything:

```bash
bash scripts/validate-setup.sh
```

This will:
- Check all environment variables
- Test database connection
- Verify dependencies
- Provide helpful error messages

## Development Tips

### Useful Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
supabase db push      # Push migrations
supabase db reset     # Reset database (dev only!)
supabase db diff      # Show migration diff

# Utilities
bash scripts/setup-env.sh       # Configure environment
bash scripts/validate-setup.sh  # Validate setup
```

### Folder Structure

```
bluesminds/
├── app/                  # Next.js pages and API routes
│   ├── api/v1/          # Gateway proxy endpoints
│   ├── dashboard/       # Dashboard pages
│   └── ...
├── lib/gateway/         # Core gateway logic
├── components/          # React components
└── supabase/migrations/ # Database schema
```

### Key Files

- `.env.local` - Environment variables (create from `.env.example`)
- `lib/gateway/` - Core gateway modules (auth, rate limiting, etc.)
- `supabase/migrations/` - Database schema migrations
- `app/api/v1/` - OpenAI-compatible API endpoints

## Getting Help

- **Detailed Setup**: See [SETUP.md](./SETUP.md)
- **Architecture**: See [README.md](./README.md)
- **LiteLLM Docs**: https://docs.litellm.ai/
- **Supabase Docs**: https://supabase.com/docs
- **Creem Docs**: https://docs.creem.io/getting-started/introduction

## Production Checklist

Before deploying to production:

- [ ] Use strong secrets (32+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Configure Creem webhooks with production URL
- [ ] Set up monitoring and logging
- [ ] Configure database backups
- [ ] Set up proper rate limiting
- [ ] Enable email verification in Supabase Auth
- [ ] Review and test RLS policies
- [ ] Set up error tracking (Sentry, etc.)

---

That's it! You now have a fully functional AI gateway.

For more details, see [SETUP.md](./SETUP.md) and [README.md](./README.md).
