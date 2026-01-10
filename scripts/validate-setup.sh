#!/bin/bash

# BluesMinds Setup Validation Script
# This script checks if your environment is properly configured

set -e

echo "🔍 BluesMinds AI Gateway - Setup Validation"
echo "==========================================="
echo ""

ERRORS=0
WARNINGS=0

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found"
    echo "   Run: bash scripts/setup-env.sh"
    ERRORS=$((ERRORS+1))
else
    echo "✅ .env.local file exists"
fi

# Source .env.local if it exists
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

echo ""
echo "Checking required environment variables..."
echo ""

# Function to check env var
check_env() {
    local var_name=$1
    local var_value=${!var_name}
    local is_optional=$2

    if [ -z "$var_value" ]; then
        if [ "$is_optional" = "optional" ]; then
            echo "⚠️  $var_name not set (optional)"
            WARNINGS=$((WARNINGS+1))
        else
            echo "❌ $var_name not set"
            ERRORS=$((ERRORS+1))
        fi
    else
        echo "✅ $var_name set"
    fi
}

# Check required variables
check_env "NEXT_PUBLIC_SUPABASE_URL"
check_env "NEXT_PUBLIC_SUPABASE_ANON_KEY"
check_env "SUPABASE_SERVICE_ROLE_KEY"
check_env "NEXT_PUBLIC_APP_URL"
check_env "JWT_SECRET"
check_env "API_KEY_SECRET"

echo ""
echo "Checking Creem configuration..."
check_env "CREEM_API_KEY" "optional"
check_env "CREEM_WEBHOOK_SECRET" "optional"
check_env "CREEM_PRODUCT_STARTER" "optional"
check_env "CREEM_PRODUCT_PRO" "optional"
check_env "CREEM_PRODUCT_ENTERPRISE" "optional"

echo ""
echo "Checking admin configuration..."
check_env "ADMIN_EMAILS" "optional"

echo ""
echo "Checking dependencies..."
echo ""

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "❌ node_modules not found"
    echo "   Run: pnpm install"
    ERRORS=$((ERRORS+1))
else
    echo "✅ Dependencies installed"
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not installed"
    echo "   Install: npm install -g supabase"
    WARNINGS=$((WARNINGS+1))
else
    echo "✅ Supabase CLI installed"
fi

# Check if LiteLLM is installed
if ! command -v litellm &> /dev/null; then
    echo "⚠️  LiteLLM not installed"
    echo "   Install: pip install litellm[proxy]"
    WARNINGS=$((WARNINGS+1))
else
    echo "✅ LiteLLM installed"
fi

echo ""
echo "Checking database connection..."
echo ""

# Try to connect to Supabase
if [ ! -z "$NEXT_PUBLIC_SUPABASE_URL" ] && [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/users?select=count" || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Database connection successful"
    else
        echo "❌ Database connection failed (HTTP $HTTP_CODE)"
        echo "   Check your Supabase URL and Service Role Key"
        ERRORS=$((ERRORS+1))
    fi
fi

echo ""
echo "Checking for migrations..."
echo ""

# Check if migration files exist
if [ -d supabase/migrations ] && [ "$(ls -A supabase/migrations)" ]; then
    echo "✅ Migration files found"
    echo "   Make sure to run: supabase db push"
else
    echo "❌ Migration files not found"
    ERRORS=$((ERRORS+1))
fi

echo ""
echo "==========================================="
echo "Summary:"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ All checks passed! You're ready to start."
    echo ""
    echo "Next steps:"
    echo "   1. Run migrations: supabase db push"
    echo "   2. Start LiteLLM server (see SETUP.md)"
    echo "   3. Start the application: pnpm dev"
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  Setup mostly complete with $WARNINGS warning(s)"
    echo ""
    echo "You can start the application, but some features may not work."
    echo "Review the warnings above and fix them if needed."
else
    echo "❌ Setup incomplete: $ERRORS error(s), $WARNINGS warning(s)"
    echo ""
    echo "Please fix the errors above before starting the application."
    exit 1
fi

echo ""
echo "📖 For detailed setup instructions, see SETUP.md"
