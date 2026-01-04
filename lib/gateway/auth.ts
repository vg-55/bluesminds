// ============================================================================
// AUTHENTICATION & AUTHORIZATION MODULE
// ============================================================================

import { supabaseAdmin } from '@/lib/supabase/client'
import { verifyApiKey } from '@/lib/utils/crypto'
import { logger } from '@/lib/utils/logger'
import { AuthenticationError, AuthorizationError } from '@/lib/utils/errors'
import type { ApiKey, User, ApiKeyScope } from '@/lib/types'

export interface AuthContext {
  apiKey: ApiKey
  user: User
  scopes: ApiKeyScope[]
}

// Extract API key from Authorization header
export function extractApiKey(authorization: string | null): string {
  if (!authorization) {
    throw new AuthenticationError('Missing Authorization header')
  }

  // Support both "Bearer token" and just "token" formats
  const match = authorization.match(/^(?:Bearer\s+)?(.+)$/)
  if (!match) {
    throw new AuthenticationError('Invalid Authorization header format')
  }

  return match[1]
}

// Validate API key and get auth context
export async function validateApiKey(key: string): Promise<AuthContext> {
  try {
    // Extract the prefix for lookup
    const prefix = key.substring(0, 8)

    // Find API keys with matching prefix
    const { data: apiKeys, error: lookupError } = await supabaseAdmin
      .from('api_keys')
      .select('*, users(*)')
      .eq('key_prefix', prefix)
      .eq('is_active', true)

    if (lookupError) {
      logger.error('API key lookup failed', lookupError)
      throw new AuthenticationError('Failed to validate API key')
    }

    if (!apiKeys || apiKeys.length === 0) {
      throw new AuthenticationError('Invalid API key')
    }

    // Check each matching key (there should typically be only one)
    let validApiKey: typeof apiKeys[0] | null = null
    for (const apiKey of apiKeys) {
      if (verifyApiKey(key, apiKey.key_hash)) {
        validApiKey = apiKey
        break
      }
    }

    if (!validApiKey) {
      throw new AuthenticationError('Invalid API key')
    }

    // Check if key has expired
    if (validApiKey.expires_at) {
      const expiresAt = new Date(validApiKey.expires_at)
      if (expiresAt < new Date()) {
        throw new AuthenticationError('API key has expired')
      }
    }

    // Check user status
    const user = validApiKey.users as unknown as User
    if (!user) {
      throw new AuthenticationError('User not found')
    }

    if (user.status !== 'active') {
      throw new AuthenticationError(`User account is ${user.status}`)
    }

    // Update last_used_at timestamp (async, don't wait)
    supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', validApiKey.id)
      .then(() => {})
      .catch((err) => {
        logger.warn('Failed to update API key last_used_at', { error: err })
      })

    logger.auth('API key validated', true, {
      apiKeyId: validApiKey.id,
      userId: user.id,
    })

    return {
      apiKey: validApiKey as unknown as ApiKey,
      user,
      scopes: validApiKey.scopes as ApiKeyScope[],
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error
    }
    logger.error('API key validation error', error)
    throw new AuthenticationError('Failed to validate API key')
  }
}

// Check if API key has required scope
export function checkScope(context: AuthContext, requiredScope: ApiKeyScope): void {
  if (!context.scopes.includes(requiredScope) && !context.scopes.includes('admin')) {
    throw new AuthorizationError(`Missing required scope: ${requiredScope}`)
  }
}

// Check if user is admin
export function checkAdmin(context: AuthContext): void {
  if (!context.scopes.includes('admin')) {
    throw new AuthorizationError('Admin access required')
  }
}

// Middleware wrapper for API routes
export async function withAuth(
  authorization: string | null,
  requiredScope?: ApiKeyScope
): Promise<AuthContext> {
  const key = extractApiKey(authorization)
  const context = await validateApiKey(key)

  if (requiredScope) {
    checkScope(context, requiredScope)
  }

  return context
}

// Check if user email is in admin list
export function isAdminUser(email: string, adminEmails: string[]): boolean {
  return adminEmails.includes(email)
}
