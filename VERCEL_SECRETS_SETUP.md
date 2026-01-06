# Vercel Secrets Setup Guide

This guide explains how to set up the required secrets for deploying this application on Vercel.

## Required Secrets

The following secrets need to be created in your Vercel project:

1. `supabase-url` - Your Supabase project URL
2. `supabase-anon-key` - Your Supabase anonymous/public key
3. `supabase-service-role-key` - Your Supabase service role key (admin access)
4. `jwt-secret` - A secure random string (minimum 32 characters)
5. `api-key-secret` - A secure random string (minimum 32 characters)
6. `app-url` - Your application URL (e.g., https://yourdomain.com)

## Option 1: Using Vercel CLI (Recommended)

### Prerequisites
```bash
# Install Vercel CLI if you haven't already
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link
```

### Add Secrets

```bash
# Supabase Configuration
vercel secrets add supabase-url "https://your-project.supabase.co"
vercel secrets add supabase-anon-key "your-anon-key-here"
vercel secrets add supabase-service-role-key "your-service-role-key-here"

# Security Secrets (generate secure random strings)
vercel secrets add jwt-secret "$(openssl rand -base64 32)"
vercel secrets add api-key-secret "$(openssl rand -base64 32)"

# Application URL
vercel secrets add app-url "https://your-domain.vercel.app"
```

### Generate Secure Random Strings

For JWT_SECRET and API_KEY_SECRET, you can generate secure random strings using:

```bash
# On macOS/Linux
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Option 2: Using Vercel Dashboard

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Environment Variables**
3. For each secret, click **Add New**
4. Select **Secret** as the type
5. Enter the secret name (without the `@` prefix):
   - `supabase-url`
   - `supabase-anon-key`
   - `supabase-service-role-key`
   - `jwt-secret`
   - `api-key-secret`
   - `app-url`
6. Enter the corresponding value
7. Select the environments (Production, Preview, Development)
8. Click **Save**

## Finding Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. You'll find:
   - **Project URL** → use for `supabase-url`
   - **anon/public key** → use for `supabase-anon-key`
   - **service_role key** → use for `supabase-service-role-key` (⚠️ Keep this secret!)

## Verification

After adding all secrets, you can verify they're set correctly:

```bash
# List all secrets (values will be hidden)
vercel secrets ls
```

## Redeploy

After adding the secrets, trigger a new deployment:

```bash
vercel --prod
```

Or push to your connected Git repository to trigger automatic deployment.

## Security Notes

⚠️ **Important Security Considerations:**

- **Never commit secrets to Git** - Secrets should only be stored in Vercel
- **Service Role Key** - This bypasses Row Level Security. Only use server-side
- **JWT Secret** - Must be at least 32 characters for security
- **API Key Secret** - Used for encrypting API keys, must be at least 32 characters
- **Rotate secrets regularly** - Update secrets periodically for better security

## Troubleshooting

### Error: "Secret does not exist"

If you see this error:
1. Verify the secret name matches exactly (case-sensitive, use hyphens not underscores)
2. Ensure the secret is added to the correct Vercel project
3. Check that the secret is available in the target environment (Production/Preview/Development)

### Error: "Invalid environment variable"

If deployment fails with validation errors:
1. Check that all required secrets are set
2. Verify the Supabase URL is a valid URL
3. Ensure JWT_SECRET and API_KEY_SECRET are at least 32 characters
4. Confirm APP_URL is a valid URL

### Need to Update a Secret?

```bash
# Remove the old secret
vercel secrets rm secret-name

# Add the new secret
vercel secrets add secret-name "new-value"

# Redeploy
vercel --prod
```

## Additional Resources

- [Vercel Environment Variables Documentation](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Secrets Documentation](https://vercel.com/docs/cli#commands/secrets)
- [Supabase API Settings](https://supabase.com/docs/guides/api)
