// ============================================================================
// SETTINGS VERSIONING
// ============================================================================
// Helper functions to manage referral settings versioning

import { createServerClient } from '@/lib/supabase/client'

export interface ReferralSettings {
  referrerRewardType: 'fixed' | 'percentage'
  referrerRewardValue: number
  refereeRewardType: 'fixed' | 'percentage'
  refereeRewardValue: number
  minPurchaseAmount: number
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
    const supabase = await createServerClient()

    // Get next version number
    const { data: versionData, error: versionError } = await supabase.rpc(
      'get_next_settings_version'
    )

    if (versionError) {
      console.error('Failed to get next version:', versionError)
      return null
    }

    const nextVersion = versionData as number

    // Insert new version
    const { data, error } = await supabase
      .from('referral_settings_history')
      .insert({
        version: nextVersion,
        referrer_reward_type: newSettings.referrerRewardType,
        referrer_reward_value: newSettings.referrerRewardValue,
        referee_reward_type: newSettings.refereeRewardType,
        referee_reward_value: newSettings.refereeRewardValue,
        min_purchase_amount: newSettings.minPurchaseAmount,
        enabled: newSettings.enabled,
        changed_by: changedBy,
        change_reason: reason || null,
        metadata: {},
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create settings version:', error)
      return null
    }

    return {
      version: nextVersion,
      entry: {
        id: data.id,
        version: data.version,
        referrerRewardType: data.referrer_reward_type,
        referrerRewardValue: parseFloat(data.referrer_reward_value),
        refereeRewardType: data.referee_reward_type,
        refereeRewardValue: parseFloat(data.referee_reward_value),
        minPurchaseAmount: parseFloat(data.min_purchase_amount),
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
    const supabase = await createServerClient()

    const { data, error } = await supabase
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
      referrerRewardType: data.referrer_reward_type,
      referrerRewardValue: parseFloat(data.referrer_reward_value),
      refereeRewardType: data.referee_reward_type,
      refereeRewardValue: parseFloat(data.referee_reward_value),
      minPurchaseAmount: parseFloat(data.min_purchase_amount),
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
    const supabase = await createServerClient()

    const { data, error } = await supabase
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
      referrerRewardType: data.referrer_reward_type,
      referrerRewardValue: parseFloat(data.referrer_reward_value),
      refereeRewardType: data.referee_reward_type,
      refereeRewardValue: parseFloat(data.referee_reward_value),
      minPurchaseAmount: parseFloat(data.min_purchase_amount),
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
    const supabase = await createServerClient()

    const { data, error } = await supabase
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
      referrerRewardType: item.referrer_reward_type,
      referrerRewardValue: parseFloat(item.referrer_reward_value),
      refereeRewardType: item.referee_reward_type,
      refereeRewardValue: parseFloat(item.referee_reward_value),
      minPurchaseAmount: parseFloat(item.min_purchase_amount),
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
    referrer_reward_type: settings.referrerRewardType,
    referrer_reward_value: settings.referrerRewardValue,
    referee_reward_type: settings.refereeRewardType,
    referee_reward_value: settings.refereeRewardValue,
    min_purchase_amount: settings.minPurchaseAmount,
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
    'referrerRewardType',
    'referrerRewardValue',
    'refereeRewardType',
    'refereeRewardValue',
    'minPurchaseAmount',
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
