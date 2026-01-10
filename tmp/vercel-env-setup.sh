#!/bin/bash
# ============================================================================
# VERCEL ENVIRONMENT VARIABLES SETUP
# ============================================================================
# This script helps you set the required environment variables in Vercel
# Run this from your project root directory
# ============================================================================

echo "Setting Vercel environment variables for production..."

# Read from .env.local
source .env.local

# Set Creem environment variables
vercel env add CREEM_API_KEY production <<< "$CREEM_API_KEY"
vercel env add CREEM_WEBHOOK_SECRET production <<< "$CREEM_WEBHOOK_SECRET"
vercel env add CREEM_PRODUCT_STARTER production <<< "$CREEM_PRODUCT_STARTER"
vercel env add CREEM_PRODUCT_PRO production <<< "$CREEM_PRODUCT_PRO"
vercel env add CREEM_PRODUCT_ENTERPRISE production <<< "$CREEM_PRODUCT_ENTERPRISE"

# Set other critical environment variables if missing
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "$SUPABASE_SERVICE_ROLE_KEY"
vercel env add JWT_SECRET production <<< "$JWT_SECRET"
vercel env add API_KEY_SECRET production <<< "$API_KEY_SECRET"

echo "Done! Now redeploy your app with: vercel --prod"
