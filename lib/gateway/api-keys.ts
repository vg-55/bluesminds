// ============================================================================
// API KEY MANAGEMENT MODULE
// ============================================================================

import { supabaseAdmin } from '@/lib/supabase/client'
import { generateApiKey, generateReferralCode } from '@/lib/utils/crypto'
import { logger } from '@/lib/utils/logger'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'
import { defaultRateLimits } from '@/lib/config/env'
import type {
  ApiKey,
  ApiKeyInsert,
  ApiKeyUpdate,
  ApiKeyScope,
  CreateApiKeyInput,
  UpdateApiKeyInput,
} from '@/lib/types'

export interface CreateApiKeyResult {
  apiKey: ApiKey
  key: string // The actual key (only returned once!)
}

// Create a new API key
export async function createApiKey(
  userId: string,
  input: CreateApiKeyInput
): Promise<CreateApiKeyResult> {
  try {
    // Generate API key
    const { key, prefix, hash } = generateApiKey()

    // Prepare insert data
    const insertData: ApiKeyInsert = {
      user_id: userId,
      key_hash: hash,
      key_prefix: prefix,
      name: input.name,
      scopes: input.scopes || ['chat.completions', 'embeddings'],
      rate_limit_rpm: input.rate_limit_rpm || defaultRateLimits.rpm,
      rate_limit_tpm: input.rate_limit_tpm || defaultRateLimits.tpm,
      quota_daily: input.quota_daily || defaultRateLimits.daily_quota,
      quota_monthly: input.quota_monthly || defaultRateLimits.monthly_quota,
      expires_at: input.expires_at || null,
      is_active: true,
    }

    // Insert into database
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      logger.error('Failed to create API key', error)
      throw new Error('Failed to create API key')
    }

    logger.info('API key created', {
      apiKeyId: data.id,
      userId,
      name: input.name,
    })

    return {
      apiKey: data as ApiKey,
      key, // Return the actual key (only time we do this!)
    }
  } catch (error) {
    logger.error('Create API key error', error)
    throw error
  }
}

// List user's API keys (without sensitive data)
export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to list API keys', error)
      throw new Error('Failed to list API keys')
    }

    return (data || []) as ApiKey[]
  } catch (error) {
    logger.error('List API keys error', error)
    throw error
  }
}

// Get a single API key
export async function getApiKey(userId: string, keyId: string): Promise<ApiKey> {
  try {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('API key')
      }
      logger.error('Failed to get API key', error)
      throw new Error('Failed to get API key')
    }

    return data as ApiKey
  } catch (error) {
    if (error instanceof NotFoundError) throw error
    logger.error('Get API key error', error)
    throw error
  }
}

// Update an API key
export async function updateApiKey(
  userId: string,
  keyId: string,
  input: UpdateApiKeyInput
): Promise<ApiKey> {
  try {
    // First verify the key belongs to the user
    await getApiKey(userId, keyId)

    // Prepare update data
    const updateData: ApiKeyUpdate = {
      ...input,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .update(updateData)
      .eq('id', keyId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update API key', error)
      throw new Error('Failed to update API key')
    }

    logger.info('API key updated', {
      apiKeyId: keyId,
      userId,
      changes: Object.keys(input),
    })

    return data as ApiKey
  } catch (error) {
    logger.error('Update API key error', error)
    throw error
  }
}

// Revoke (delete) an API key
export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  try {
    // First verify the key belongs to the user
    await getApiKey(userId, keyId)

    const { error } = await supabaseAdmin
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', userId)

    if (error) {
      logger.error('Failed to revoke API key', error)
      throw new Error('Failed to revoke API key')
    }

    logger.info('API key revoked', {
      apiKeyId: keyId,
      userId,
    })
  } catch (error) {
    logger.error('Revoke API key error', error)
    throw error
  }
}

// Rotate an API key (create new one and revoke old)
export async function rotateApiKey(
  userId: string,
  keyId: string
): Promise<CreateApiKeyResult> {
  try {
    // Get the old key
    const oldKey = await getApiKey(userId, keyId)

    // Create new key with same settings
    const newKeyResult = await createApiKey(userId, {
      name: `${oldKey.name} (rotated)`,
      scopes: oldKey.scopes as ApiKeyScope[],
      rate_limit_rpm: oldKey.rate_limit_rpm,
      rate_limit_tpm: oldKey.rate_limit_tpm,
      quota_daily: oldKey.quota_daily,
      quota_monthly: oldKey.quota_monthly,
      expires_at: oldKey.expires_at || undefined,
    })

    // Revoke old key
    await revokeApiKey(userId, keyId)

    logger.info('API key rotated', {
      oldKeyId: keyId,
      newKeyId: newKeyResult.apiKey.id,
      userId,
    })

    return newKeyResult
  } catch (error) {
    logger.error('Rotate API key error', error)
    throw error
  }
}

// Get API key usage statistics
export async function getApiKeyUsage(
  userId: string,
  keyId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  total_requests: number
  total_tokens: number
  total_cost: number
  error_count: number
}> {
  try {
    // Verify key belongs to user
    await getApiKey(userId, keyId)

    let query = supabaseAdmin
      .from('usage_logs')
      .select('total_tokens, cost_usd, is_error')
      .eq('api_key_id', keyId)

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to get API key usage', error)
      throw new Error('Failed to get API key usage')
    }

    const stats = (data || []).reduce(
      (acc, log) => {
        acc.total_requests++
        acc.total_tokens += log.total_tokens || 0
        acc.total_cost += Number(log.cost_usd) || 0
        if (log.is_error) acc.error_count++
        return acc
      },
      {
        total_requests: 0,
        total_tokens: 0,
        total_cost: 0,
        error_count: 0,
      }
    )

    return stats
  } catch (error) {
    logger.error('Get API key usage error', error)
    throw error
  }
}

// Generate referral code for user
export async function generateUserReferralCode(userId: string): Promise<string> {
  try {
    // Check if user already has a referral code
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('referral_code')
      .eq('id', userId)
      .single()

    if (user?.referral_code) {
      return user.referral_code
    }

    // Generate unique referral code
    let code: string
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    do {
      code = generateReferralCode()
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('referral_code', code)
        .single()

      isUnique = !existing
      attempts++
    } while (!isUnique && attempts < maxAttempts)

    if (!isUnique) {
      throw new Error('Failed to generate unique referral code')
    }

    // Update user with referral code
    const { error } = await supabaseAdmin
      .from('users')
      .update({ referral_code: code! })
      .eq('id', userId)

    if (error) {
      throw error
    }

    logger.info('Referral code generated', { userId, code })
    return code!
  } catch (error) {
    logger.error('Generate referral code error', error)
    throw error
  }
}
