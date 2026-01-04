// ============================================================================
// SUPABASE CLIENT CONFIGURATION
// ============================================================================

import { createClient } from '@supabase/supabase-js'
import { createBrowserClient as createBrowserClientSSR, createServerClient as createServerClientSSR } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database.types'

// Check if we're on the server
const isServer = typeof window === 'undefined'

// Get environment variables safely
const getEnvVars = () => {
  if (isServer) {
    // On server, import the full env config
    const { env } = require('@/lib/config/env')
    return {
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    }
  } else {
    // On client, only use NEXT_PUBLIC_ variables
    return {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      supabaseServiceRoleKey: '', // Not available on client
    }
  }
}

const envVars = getEnvVars()

// Client-side Supabase client (for use in Client Components)
export function createBrowserClient() {
  return createBrowserClientSSR<Database>(
    envVars.supabaseUrl,
    envVars.supabaseAnonKey
  )
}

// Server-side Supabase client (for use in Server Components, API routes)
export async function createServerClient() {
  const cookieStore = await cookies()

  return createServerClientSSR<Database>(
    envVars.supabaseUrl,
    envVars.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Service role client (for admin operations, bypasses RLS)
// WARNING: Only use this in server-side code, NEVER expose to client!
export const supabaseAdmin = isServer
  ? createClient<Database>(
      envVars.supabaseUrl,
      envVars.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null

// Helper function to handle Supabase errors
export function handleSupabaseError(error: unknown): never {
  if (error && typeof error === 'object' && 'message' in error) {
    throw new Error(`Database error: ${(error as { message: string }).message}`)
  }
  throw new Error('Unknown database error')
}

// Type-safe query builder helpers
export type SupabaseClient = ReturnType<typeof createBrowserClient>
export type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>
export type SupabaseAdmin = typeof supabaseAdmin
