// ============================================================================
// REFERRAL CREATION HELPER
// ============================================================================
// Helper function to create a referral record when a user signs up with a code

import { supabaseAdmin } from '@/lib/supabase/client'
import { logger } from './logger'

interface CreateReferralParams {
  referralCode: string
  newUserId: string
}

interface CreateReferralResult {
  success: boolean
  referrerId?: string
  error?: string
}

/**
 * Creates a referral record in the database when a user signs up with a referral code
 *
 * @param referralCode - The referral code used during signup
 * @param newUserId - The ID of the newly created user (referee)
 * @returns Result object with success status and referrer ID if successful
 */
export async function createReferral({
  referralCode,
  newUserId,
}: CreateReferralParams): Promise<CreateReferralResult> {
  try {
    if (!supabaseAdmin) {
      logger.error('Service role client not available for referral creation')
      return { success: false, error: 'Service unavailable' }
    }

    // Check if referral system is enabled
    const { data: settings } = await supabaseAdmin
      .from('referral_settings')
      .select('enabled')
      .limit(1)
      .single()

    if (!settings?.enabled) {
      logger.info('Referral system is disabled, skipping referral creation')
      return { success: false, error: 'Referral system disabled' }
    }

    // Look up the referrer by their referral code
    const { data: referrer, error: referrerError } = await supabaseAdmin
      .from('users')
      .select('id, email, referral_code')
      .eq('referral_code', referralCode.toLowerCase().trim())
      .single()

    if (referrerError || !referrer) {
      logger.warn('Invalid referral code', { referralCode })
      return { success: false, error: 'Invalid referral code' }
    }

    // Check if referee is the same as referrer (prevent self-referral)
    if (referrer.id === newUserId) {
      logger.warn('Attempted self-referral', { userId: newUserId })
      return { success: false, error: 'Cannot refer yourself' }
    }

    // Check if referral record already exists
    const { data: existingReferral } = await supabaseAdmin
      .from('referrals')
      .select('id')
      .eq('referee_id', newUserId)
      .single()

    if (existingReferral) {
      logger.warn('Referral already exists for user', { userId: newUserId })
      return { success: false, error: 'Referral already exists' }
    }

    // Create the referral record
    const { data: newReferral, error: createError } = await supabaseAdmin
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referee_id: newUserId,
        status: 'pending', // Will be completed after min qualifying requests
        referrer_reward: 0, // Legacy field, will be set when completed
        referee_reward: 0, // Legacy field, will be set when completed
        signup_date: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (createError) {
      logger.error('Failed to create referral record', createError)
      return { success: false, error: 'Failed to create referral' }
    }

    // Update the referee's referred_by field
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ referred_by: referrer.id })
      .eq('id', newUserId)

    if (updateError) {
      logger.error('Failed to update user referred_by', updateError)
      // Don't fail the operation if this fails
    }

    logger.info('Referral created successfully', {
      referralId: newReferral.id,
      referrerId: referrer.id,
      refereeId: newUserId,
      referralCode,
    })

    return {
      success: true,
      referrerId: referrer.id,
    }
  } catch (error) {
    logger.error('Error creating referral', error)
    return { success: false, error: 'Unexpected error' }
  }
}
