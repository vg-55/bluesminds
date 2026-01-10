#!/bin/bash

# BluesMinds Setup Script
# This script helps you set up your environment variables

set -e

echo "🚀 BluesMinds AI Gateway - Environment Setup"
echo "=============================================="
echo ""

# Check if .env.local already exists
if [ -f .env.local ]; then
    read -p "⚠️  .env.local already exists. Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Edit .env.local manually."
        exit 0
    fi
fi

# Copy from example
cp .env.example .env.local

echo "✅ Created .env.local from .env.example"
echo ""

# Generate secrets
echo "🔑 Generating secure secrets..."
JWT_SECRET=$(openssl rand -base64 32)
API_KEY_SECRET=$(openssl rand -base64 32)

# Update .env.local with generated secrets
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env.local
    sed -i '' "s|API_KEY_SECRET=.*|API_KEY_SECRET=$API_KEY_SECRET|" .env.local
else
    # Linux
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env.local
    sed -i "s|API_KEY_SECRET=.*|API_KEY_SECRET=$API_KEY_SECRET|" .env.local
fi

echo "✅ Generated JWT_SECRET"
echo "✅ Generated API_KEY_SECRET"
echo ""

# Prompt for required values
echo "📝 Please provide the following information:"
echo ""

read -p "Supabase Project URL (https://xxx.supabase.co): " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
read -p "Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY

echo ""
read -p "Application URL (default: http://localhost:3000): " APP_URL
APP_URL=${APP_URL:-http://localhost:3000}

echo ""
echo "🟣 Creem Configuration (press Enter to skip for now)"
read -p "Creem API Key: " CREEM_API_KEY
read -p "Creem Webhook Secret: " CREEM_WEBHOOK_SECRET
read -p "Creem Product ID - Starter: " CREEM_PRODUCT_STARTER
read -p "Creem Product ID - Pro: " CREEM_PRODUCT_PRO
read -p "Creem Product ID - Enterprise: " CREEM_PRODUCT_ENTERPRISE

echo ""
read -p "Admin Emails (comma-separated): " ADMIN_EMAILS

# Update .env.local with user-provided values
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL|" .env.local
    sed -i '' "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" .env.local
    sed -i '' "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY|" .env.local
    sed -i '' "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$APP_URL|" .env.local

    if [ ! -z "$CREEM_API_KEY" ]; then
        sed -i '' "s|CREEM_API_KEY=.*|CREEM_API_KEY=$CREEM_API_KEY|" .env.local
    fi
    if [ ! -z "$CREEM_WEBHOOK_SECRET" ]; then
        sed -i '' "s|CREEM_WEBHOOK_SECRET=.*|CREEM_WEBHOOK_SECRET=$CREEM_WEBHOOK_SECRET|" .env.local
    fi
    if [ ! -z "$CREEM_PRODUCT_STARTER" ]; then
        sed -i '' "s|CREEM_PRODUCT_STARTER=.*|CREEM_PRODUCT_STARTER=$CREEM_PRODUCT_STARTER|" .env.local
    fi
    if [ ! -z "$CREEM_PRODUCT_PRO" ]; then
        sed -i '' "s|CREEM_PRODUCT_PRO=.*|CREEM_PRODUCT_PRO=$CREEM_PRODUCT_PRO|" .env.local
    fi
    if [ ! -z "$CREEM_PRODUCT_ENTERPRISE" ]; then
        sed -i '' "s|CREEM_PRODUCT_ENTERPRISE=.*|CREEM_PRODUCT_ENTERPRISE=$CREEM_PRODUCT_ENTERPRISE|" .env.local
    fi
    if [ ! -z "$ADMIN_EMAILS" ]; then
        sed -i '' "s|ADMIN_EMAILS=.*|ADMIN_EMAILS=$ADMIN_EMAILS|" .env.local
    fi
else
    # Linux
    sed -i "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL|" .env.local
    sed -i "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" .env.local
    sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY|" .env.local
    sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$APP_URL|" .env.local

    if [ ! -z "$CREEM_API_KEY" ]; then
        sed -i "s|CREEM_API_KEY=.*|CREEM_API_KEY=$CREEM_API_KEY|" .env.local
    fi
    if [ ! -z "$CREEM_WEBHOOK_SECRET" ]; then
        sed -i "s|CREEM_WEBHOOK_SECRET=.*|CREEM_WEBHOOK_SECRET=$CREEM_WEBHOOK_SECRET|" .env.local
    fi
    if [ ! -z "$CREEM_PRODUCT_STARTER" ]; then
        sed -i "s|CREEM_PRODUCT_STARTER=.*|CREEM_PRODUCT_STARTER=$CREEM_PRODUCT_STARTER|" .env.local
    fi
    if [ ! -z "$CREEM_PRODUCT_PRO" ]; then
        sed -i "s|CREEM_PRODUCT_PRO=.*|CREEM_PRODUCT_PRO=$CREEM_PRODUCT_PRO|" .env.local
    fi
    if [ ! -z "$CREEM_PRODUCT_ENTERPRISE" ]; then
        sed -i "s|CREEM_PRODUCT_ENTERPRISE=.*|CREEM_PRODUCT_ENTERPRISE=$CREEM_PRODUCT_ENTERPRISE|" .env.local
    fi
    if [ ! -z "$ADMIN_EMAILS" ]; then
        sed -i "s|ADMIN_EMAILS=.*|ADMIN_EMAILS=$ADMIN_EMAILS|" .env.local
    fi
fi

echo ""
echo "✅ Environment configuration complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Review .env.local and adjust any values if needed"
echo "   2. Run database migrations: pnpm supabase db push"
echo "   3. Set up at least one LiteLLM server (see SETUP.md)"
echo "   4. Start the application: pnpm dev"
echo ""
echo "📖 For detailed setup instructions, see SETUP.md"
