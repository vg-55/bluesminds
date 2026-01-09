// ============================================================================
// SETTINGS VERSIONING
// ============================================================================
// Helper functions to manage referral settings versioning

import { supabaseAdmin } from '@/lib/supabase/client'

export interface ReferralSettings {
  rewardType?: 'requests' | 'credits'
  referrerRewardType: 'fixed' | 'percentage'
  referrerRewardValue: number
  refereeRewardType: 'fixed' | 'percentage'
  refereeRewardValue: number
  referrerRequests?: number
  refereeRequests?: number
  minPurchaseAmount: number
  minQualifyingRequests?: number
  enabled: boolean
}

export interface ReferralSettingsHistory extends ReferralSettings {
  id: string
  version: number
  changedBy: string | null
  changeReason: string | null
  createdAt: string
  metadata: Record<string, any>
}

/**
 * Creates a new version of referral settings in the history table
 *
 * @param newSettings - The new settings to version
 * @param changedBy - User ID who made the change
 * @param reason - Optional reason for the change
 * @returns The version number and full history entry
 */
export async function createSettingsVersion(
  newSettings: ReferralSettings,
  changedBy: string,
  reason?: string
): Promise<{ version: number; entry: ReferralSettingsHistory } | null> {
  try {
    // Use supabaseAdmin to bypass RLS restrictions
    if (!supabaseAdmin) {
      console.error('[createSettingsVersion] Service role client not available')
      return null
    }

    console.log('[createSettingsVersion] Getting next version number...')

    // Get next version number - try RPC first, then fallback to direct query
    let nextVersion: number = 1
    const { data: versionData, error: versionError } = await supabaseAdmin.rpc(
      'get_next_settings_version'
    )

    if (versionError) {
      console.warn('[createSettingsVersion] RPC failed, using fallback:', versionError.message)

      // Fallback: Get next version directly from table
      const { data: maxVersionData, error: maxError } = await supabaseAdmin
        .from('referral_settings_history')
        .select('version')
        .order('version', { ascending: false })
        .limit(1)
        .single()

      if (maxError && maxError.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('[createSettingsVersion] Failed to get max version:', maxError)
        return null
      }

      nextVersion = maxVersionData ? maxVersionData.version + 1 : 1
      console.log('[createSettingsVersion] Using fallback version:', nextVersion)
    } else {
      nextVersion = versionData as number
      console.log('[createSettingsVersion] Got version from RPC:', nextVersion)
    }

    console.log('[createSettingsVersion] Inserting version:', nextVersion, 'enabled:', newSettings.enabled)

    // Insert new version
    const insertData = {
      version: nextVersion,
      reward_type: newSettings.rewardType || 'requests',
      referrer_reward_type: newSettings.referrerRewardType,
      referrer_reward_value: newSettings.referrerRewardValue,
      referee_reward_type: newSettings.refereeRewardType,
      referee_reward_value: newSettings.refereeRewardValue,
      referrer_requests: newSettings.referrerRequests || 1000,
      referee_requests: newSettings.refereeRequests || 500,
      min_purchase_amount: newSettings.minPurchaseAmount,
      min_qualifying_requests: newSettings.minQualifyingRequests || 10,
      enabled: newSettings.enabled,
      changed_by: changedBy,
      change_reason: reason || null,
      metadata: {},
    }

    console.log('[createSettingsVersion] Insert data:', JSON.stringify(insertData, null, 2))

    const { data, error } = await supabaseAdmin
      .from('referral_settings_history')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[createSettingsVersion] Insert failed:', error)
      console.error('[createSettingsVersion] Error code:', error.code)
      console.error('[createSettingsVersion] Error message:', error.message)
      console.error('[createSettingsVersion] Error details:', error.details)
      return null
    }

    console.log('[createSettingsVersion] Successfully created version:', nextVersion)

    return {
      version: nextVersion,
      entry: {
        id: data.id,
        version: data.version,
        rewardType: data.reward_type || 'requests',
        referrerRewardType: data.referrer_reward_type,
        referrerRewardValue: parseFloat(data.referrer_reward_value),
        refereeRewardType: data.referee_reward_type,
        refereeRewardValue: parseFloat(data.referee_reward_value),
        referrerRequests: data.referrer_requests || 1000,
        refereeRequests: data.referee_requests || 500,
        minPurchaseAmount: parseFloat(data.min_purchase_amount),
        minQualifyingRequests: data.min_qualifying_requests || 10,
        enabled: data.enabled,
        changedBy: data.changed_by,
        changeReason: data.change_reason,
        createdAt: data.created_at,
        metadata: data.metadata,
      },
    }
  } catch (error) {
    console.error('Error in createSettingsVersion:', error)
    return null
  }
}

/**
 * Gets the current (latest) settings version
 *
 * @returns The latest settings version entry or null
 */
export async function getCurrentSettingsVersion(): Promise<ReferralSettingsHistory | null> {
  try {
    // Use supabaseAdmin to bypass RLS restrictions
    if (!supabaseAdmin) {
      console.error('Service role client not available')
      return null
    }

    const { data, error } = await supabaseAdmin
      .from('referral_settings_history')
      .select('*')
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Failed to get current settings version:', error)
      return null
    }

    return {
      id: data.id,
      version: data.version,
      rewardType: data.reward_type || 'requests',
      referrerRewardType: data.referrer_reward_type,
      referrerRewardValue: parseFloat(data.referrer_reward_value),
      refereeRewardType: data.referee_reward_type,
      refereeRewardValue: parseFloat(data.referee_reward_value),
      referrerRequests: data.referrer_requests || 1000,
      refereeRequests: data.referee_requests || 500,
      minPurchaseAmount: parseFloat(data.min_purchase_amount),
      minQualifyingRequests: data.min_qualifying_requests || 10,
      enabled: data.enabled,
      changedBy: data.changed_by,
      changeReason: data.change_reason,
      createdAt: data.created_at,
      metadata: data.metadata,
    }
  } catch (error) {
    console.error('Error in getCurrentSettingsVersion:', error)
    return null
  }
}

/**
 * Gets a specific settings version by version number
 *
 * @param version - Version number to retrieve
 * @returns The settings version entry or null
 */
export async function getSettingsVersion(
  version: number
): Promise<ReferralSettingsHistory | null> {
  try {
    // Use supabaseAdmin to bypass RLS restrictions
    if (!supabaseAdmin) {
      console.error('Service role client not available')
      return null
    }

    const { data, error } = await supabaseAdmin
      .from('referral_settings_history')
      .select('*')
      .eq('version', version)
      .single()

    if (error) {
      console.error('Failed to get settings version:', error)
      return null
    }

    return {
      id: data.id,
      version: data.version,
      rewardType: data.reward_type || 'requests',
      referrerRewardType: data.referrer_reward_type,
      referrerRewardValue: parseFloat(data.referrer_reward_value),
      refereeRewardType: data.referee_reward_type,
      refereeRewardValue: parseFloat(data.referee_reward_value),
      referrerRequests: data.referrer_requests || 1000,
      refereeRequests: data.referee_requests || 500,
      minPurchaseAmount: parseFloat(data.min_purchase_amount),
      minQualifyingRequests: data.min_qualifying_requests || 10,
      enabled: data.enabled,
      changedBy: data.changed_by,
      changeReason: data.change_reason,
      createdAt: data.created_at,
      metadata: data.metadata,
    }
  } catch (error) {
    console.error('Error in getSettingsVersion:', error)
    return null
  }
}

/**
 * Gets all settings versions with pagination
 *
 * @param limit - Number of versions to fetch (default: 50)
 * @param offset - Offset for pagination (default: 0)
 * @returns Array of settings history entries
 */
export async function getAllSettingsVersions(
  limit: number = 50,
  offset: number = 0
): Promise<ReferralSettingsHistory[]> {
  try {
    // Use supabaseAdmin to bypass RLS restrictions
    if (!supabaseAdmin) {
      console.error('Service role client not available')
      return []
    }

    const { data, error } = await supabaseAdmin
      .from('referral_settings_history')
      .select('*')
      .order('version', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Failed to get settings versions:', error)
      return []
    }

    return data.map((item) => ({
      id: item.id,
      version: item.version,
      rewardType: item.reward_type || 'requests',
      referrerRewardType: item.referrer_reward_type,
      referrerRewardValue: parseFloat(item.referrer_reward_value),
      refereeRewardType: item.referee_reward_type,
      refereeRewardValue: parseFloat(item.referee_reward_value),
      referrerRequests: item.referrer_requests || 1000,
      refereeRequests: item.referee_requests || 500,
      minPurchaseAmount: parseFloat(item.min_purchase_amount),
      minQualifyingRequests: item.min_qualifying_requests || 10,
      enabled: item.enabled,
      changedBy: item.changed_by,
      changeReason: item.change_reason,
      createdAt: item.created_at,
      metadata: item.metadata,
    }))
  } catch (error) {
    console.error('Error in getAllSettingsVersions:', error)
    return []
  }
}

/**
 * Creates a settings snapshot object for storing with referrals
 *
 * @param settings - Settings to snapshot
 * @returns JSONB-compatible settings snapshot
 */
export function createSettingsSnapshot(settings: ReferralSettings) {
  return {
    reward_type: settings.rewardType || 'requests',
    referrer_reward_type: settings.referrerRewardType,
    referrer_reward_value: settings.referrerRewardValue,
    referee_reward_type: settings.refereeRewardType,
    referee_reward_value: settings.refereeRewardValue,
    referrer_requests: settings.referrerRequests || 1000,
    referee_requests: settings.refereeRequests || 500,
    min_purchase_amount: settings.minPurchaseAmount,
    min_qualifying_requests: settings.minQualifyingRequests || 10,
    enabled: settings.enabled,
  }
}

/**
 * Compares two settings versions and returns the differences
 *
 * @param oldSettings - Previous settings version
 * @param newSettings - New settings version
 * @returns Object describing the differences
 */
export function compareSettingsVersions(
  oldSettings: ReferralSettings,
  newSettings: ReferralSettings
) {
  const differences: Array<{
    field: string
    oldValue: any
    newValue: any
  }> = []

  const fields: Array<keyof ReferralSettings> = [
    'rewardType',
    'referrerRewardType',
    'referrerRewardValue',
    'refereeRewardType',
    'refereeRewardValue',
    'referrerRequests',
    'refereeRequests',
    'minPurchaseAmount',
    'minQualifyingRequests',
    'enabled',
  ]

  fields.forEach((field) => {
    if (oldSettings[field] !== newSettings[field]) {
      differences.push({
        field,
        oldValue: oldSettings[field],
        newValue: newSettings[field],
      })
    }
  })

  return differences
}
