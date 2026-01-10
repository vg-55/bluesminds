# Environment Setup Guide

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Next.js
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Anthropic API (For Claude models)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here

# LiteLLM (Optional - if using authentication)
LITELLM_API_KEY=your-litellm-master-key
LITELLM_BASE_URL=http://localhost:4000
```

## Getting Your API Keys

### Anthropic API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`)

### Supabase Keys
1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
4. Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## LiteLLM Environment Variables

For your LiteLLM server, create a `.env` file:

```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here  # Optional
GOOGLE_API_KEY=your-google-key-here     # Optional
```

## Security Best Practices

1. **Never commit `.env` or `.env.local`** to git
2. Use different keys for development and production
3. Rotate keys every 90 days
4. Store production keys in secure vault (Vercel, AWS Secrets Manager, etc.)
5. Monitor key usage regularly

## Vercel Deployment

When deploying to Vercel, add environment variables in:
- Project Settings → Environment Variables

Add each variable with appropriate environment (Production/Preview/Development).
