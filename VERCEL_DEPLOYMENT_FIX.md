# Vercel Deployment Fix - Environment Variable Issue Resolved

## Problem

The deployment was failing with the error:
```
Environment Variable "NEXT_PUBLIC_SUPABASE_URL" references Secret "supabase_url", which does not exist.
```

## Root Cause

The `vercel.json` file was using underscore-based secret names (e.g., `@supabase_url`) which don't follow Vercel's naming conventions and the secrets didn't exist in the Vercel project.

## Solution Applied

### 1. Updated vercel.json

Changed all secret references from underscore format to hyphenated format (Vercel's standard):

**Before:**
```json
"env": {
  "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key",
  "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key",
  "JWT_SECRET": "@jwt_secret",
  "API_KEY_SECRET": "@api_key_secret",
  "NEXT_PUBLIC_APP_URL": "@app_url"
}
```

**After:**
```json
"env": {
  "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
  "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key",
  "JWT_SECRET": "@jwt-secret",
  "API_KEY_SECRET": "@api-key-secret",
  "NEXT_PUBLIC_APP_URL": "@app-url"
}
```

### 2. Created Setup Documentation

- **VERCEL_SECRETS_SETUP.md** - Comprehensive guide for setting up secrets
- **scripts/setup-vercel-secrets.sh** - Automated setup script

## Next Steps

You need to create the secrets in Vercel. Choose one of these methods:

### Method 1: Automated Script (Recommended)

```bash
# Run the setup script
./scripts/setup-vercel-secrets.sh
```

This script will:
- Check if Vercel CLI is installed
- Prompt for your Supabase credentials
- Generate secure JWT and API key secrets
- Create all secrets in Vercel
- Provide a summary

### Method 2: Manual CLI Setup

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Add secrets one by one
vercel secrets add supabase-url "https://your-project.supabase.co"
vercel secrets add supabase-anon-key "your-anon-key"
vercel secrets add supabase-service-role-key "your-service-role-key"
vercel secrets add jwt-secret "$(openssl rand -base64 32)"
vercel secrets add api-key-secret "$(openssl rand -base64 32)"
vercel secrets add app-url "https://your-domain.vercel.app"
```

### Method 3: Vercel Dashboard

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Environment Variables**
3. Add each secret as type "Secret" with these names:
   - `supabase-url`
   - `supabase-anon-key`
   - `supabase-service-role-key`
   - `jwt-secret`
   - `api-key-secret`
   - `app-url`

## Required Secrets

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `supabase-url` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `supabase-anon-key` | Public/anonymous key | Supabase Dashboard → Settings → API |
| `supabase-service-role-key` | Admin key (⚠️ Keep secret!) | Supabase Dashboard → Settings → API |
| `jwt-secret` | Random string (32+ chars) | Generate with `openssl rand -base64 32` |
| `api-key-secret` | Random string (32+ chars) | Generate with `openssl rand -base64 32` |
| `app-url` | Your application URL | Your Vercel deployment URL |

## Verification

After adding secrets, verify they're set correctly:

```bash
# List all secrets (values will be hidden)
vercel secrets ls

# Should show:
# supabase-url
# supabase-anon-key
# supabase-service-role-key
# jwt-secret
# api-key-secret
# app-url
```

## Deploy

Once all secrets are created, deploy to Vercel:

```bash
# Deploy to production
vercel --prod

# Or push to your Git repository for automatic deployment
git add .
git commit -m "Fix: Update Vercel secret names to use hyphens"
git push
```

## Files Modified

- ✅ `vercel.json` - Updated secret references to use hyphenated names
- ✅ `VERCEL_SECRETS_SETUP.md` - Created comprehensive setup guide
- ✅ `scripts/setup-vercel-secrets.sh` - Created automated setup script

## Security Notes

⚠️ **Important:**
- Never commit `.env.local` or any file containing actual secret values to Git
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security - only use server-side
- Rotate secrets regularly for better security
- Use different secrets for development, staging, and production environments

## Troubleshooting

### Still getting "Secret does not exist" error?

1. Verify secret names match exactly (case-sensitive, use hyphens not underscores)
2. Ensure secrets are added to the correct Vercel project
3. Check that secrets are available in the target environment (Production/Preview/Development)
4. Try removing and re-adding the secret:
   ```bash
   vercel secrets rm supabase-url
   vercel secrets add supabase-url "your-value"
   ```

### Need help?

- See `VERCEL_SECRETS_SETUP.md` for detailed instructions
- Run `./scripts/setup-vercel-secrets.sh` for automated setup
- Check [Vercel Documentation](https://vercel.com/docs/concepts/projects/environment-variables)
