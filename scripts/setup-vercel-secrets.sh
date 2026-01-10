#!/bin/bash

# ============================================================================
# VERCEL SECRETS SETUP SCRIPT
# ============================================================================
# This script helps you set up all required secrets for Vercel deployment
# 
# Usage:
#   chmod +x scripts/setup-vercel-secrets.sh
#   ./scripts/setup-vercel-secrets.sh
# ============================================================================

set -e

echo "🚀 Vercel Secrets Setup"
echo "======================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed."
    echo "📦 Install it with: npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel..."
    vercel login
fi

echo "✅ Logged in to Vercel"
echo ""

# Prompt for values
echo "📝 Please provide the following values:"
echo ""

read -p "Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
read -sp "Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
echo ""
read -p "App URL (https://yourdomain.com): " APP_URL

# Generate secure secrets
echo ""
echo "🔐 Generating secure random secrets..."
JWT_SECRET=$(openssl rand -base64 32)
API_KEY_SECRET=$(openssl rand -base64 32)

echo "✅ Generated JWT_SECRET: ${JWT_SECRET:0:10}..."
echo "✅ Generated API_KEY_SECRET: ${API_KEY_SECRET:0:10}..."
echo ""

# Prompt for Creem (optional)
echo ""
echo "🟣 Creem (optional) - press Enter to skip"
read -p "Creem API Key: " CREEM_API_KEY
read -p "Creem Webhook Secret: " CREEM_WEBHOOK_SECRET
read -p "Creem Product ID - Starter: " CREEM_PRODUCT_STARTER
read -p "Creem Product ID - Pro: " CREEM_PRODUCT_PRO
read -p "Creem Product ID - Enterprise: " CREEM_PRODUCT_ENTERPRISE

# Confirm before proceeding
echo "⚠️  About to create the following secrets:"
echo "   - supabase-url"
echo "   - supabase-anon-key"
echo "   - supabase-service-role-key"
echo "   - jwt-secret"
echo "   - api-key-secret"
echo "   - app-url"
if [ ! -z "$CREEM_API_KEY" ]; then
  echo "   - creem-api-key"
  echo "   - creem-webhook-secret"
  echo "   - creem-product-starter"
  echo "   - creem-product-pro"
  echo "   - creem-product-enterprise"
fi
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
fi

# Create secrets
echo ""
echo "📤 Creating secrets in Vercel..."

# Function to add or update secret
add_secret() {
    local name=$1
    local value=$2
    
    # Try to remove existing secret (ignore errors if it doesn't exist)
    vercel secrets rm "$name" 2>/dev/null || true
    
    # Add the secret
    echo "$value" | vercel secrets add "$name"
}

add_secret "supabase-url" "$SUPABASE_URL"
add_secret "supabase-anon-key" "$SUPABASE_ANON_KEY"
add_secret "supabase-service-role-key" "$SUPABASE_SERVICE_ROLE_KEY"
add_secret "jwt-secret" "$JWT_SECRET"
add_secret "api-key-secret" "$API_KEY_SECRET"
add_secret "app-url" "$APP_URL"

if [ ! -z "$CREEM_API_KEY" ]; then
  add_secret "creem-api-key" "$CREEM_API_KEY"
  add_secret "creem-webhook-secret" "$CREEM_WEBHOOK_SECRET"
  add_secret "creem-product-starter" "$CREEM_PRODUCT_STARTER"
  add_secret "creem-product-pro" "$CREEM_PRODUCT_PRO"
  add_secret "creem-product-enterprise" "$CREEM_PRODUCT_ENTERPRISE"
fi

echo ""
echo "✅ All secrets created successfully!"
echo ""
echo "📋 Summary:"
echo "   - supabase-url: $SUPABASE_URL"
echo "   - supabase-anon-key: ${SUPABASE_ANON_KEY:0:20}..."
echo "   - supabase-service-role-key: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
echo "   - jwt-secret: ${JWT_SECRET:0:20}..."
echo "   - api-key-secret: ${API_KEY_SECRET:0:20}..."
echo "   - app-url: $APP_URL"
if [ ! -z "$CREEM_API_KEY" ]; then
  echo "   - creem-api-key: ${CREEM_API_KEY:0:10}..."
  echo "   - creem-webhook-secret: ${CREEM_WEBHOOK_SECRET:0:10}..."
  echo "   - creem-product-starter: $CREEM_PRODUCT_STARTER"
  echo "   - creem-product-pro: $CREEM_PRODUCT_PRO"
  echo "   - creem-product-enterprise: $CREEM_PRODUCT_ENTERPRISE"
fi
echo ""
echo "🎉 Setup complete! You can now deploy to Vercel."
echo ""
echo "Next steps:"
echo "  1. Verify secrets: vercel secrets ls"
echo "  2. Deploy: vercel --prod"
echo ""
