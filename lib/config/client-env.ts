// ============================================================================
// CLIENT-SAFE ENVIRONMENT CONFIGURATION
// ============================================================================
// This file can be imported in client components without triggering
// server-side environment variable validation

// Client-safe environment variables (NEXT_PUBLIC_* are available on client)
export const clientEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  appUrl: process.env.NEXT_PUBLIC_APP_URL!,
  nodeEnv: process.env.NODE_ENV || 'development',
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
}

// Helper to check if we're in production
export const isProduction = clientEnv.nodeEnv === 'production'
export const isDevelopment = clientEnv.nodeEnv === 'development'
