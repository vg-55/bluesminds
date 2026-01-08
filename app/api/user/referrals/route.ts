// ============================================================================
// USER REFERRALS API
// ============================================================================
// Endpoint for users to view their referral stats and list

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client'
import { errorResponse, successResponse, AuthenticationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { ensureUserProfile } from '@/lib/utils/ensure-user-profile'

export const dynamic = 'force-dynamic'

// GET /api/user/referrals - Get current user's referral data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      throw new AuthenticationError('Not authenticated')
    }

    // Ensure user profile exists (using admin client)
    if (supabaseAdmin) {
      await ensureUserProfile(supabaseAdmin, authUser.id)
    }

    // Get user profile with referral code and free requests
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, referral_code, credits_balance, free_requests_balance, full_name, email')
      .eq('id', authUser.id)
      .single()

    if (profileError) {
      logger.error('Failed to get user profile', profileError)
      throw new Error('Failed to get user profile')
    }

    // Get referrals where user is the referrer
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select(`
        id,
        status,
        created_at,
        signup_date,
        completion_date,
        referrer_reward,
        referee_reward,
        referrer_requests_granted,
        referee_requests_granted,
        referee:referee_id (
          id,
          full_name,
          email,
          created_at
        )
      `)
      .eq('referrer_id', authUser.id)
      .order('created_at', { ascending: false })

    if (referralsError) {
      logger.error('Failed to get referrals', referralsError)
      throw new Error('Failed to get referrals')
    }

    // Calculate stats
    const totalReferrals = referrals?.length || 0
    const completedReferrals = referrals?.filter((r) => r.status === 'completed').length || 0
    const pendingReferrals = referrals?.filter((r) => r.status === 'pending' || r.status === 'active').length || 0

    // Calculate earnings (credits)
    const totalEarnings = referrals?.reduce((sum, r) => {
      return sum + (r.status === 'completed' ? (r.referrer_reward || 0) : 0)
    }, 0) || 0

    // Calculate total requests earned
    const totalRequestsEarned = referrals?.reduce((sum, r) => {
      return sum + (r.status === 'completed' ? (r.referrer_requests_granted || 0) : 0)
    }, 0) || 0

    // Get referral settings for current rewards
    const { data: settings, error: settingsError } = await supabase
      .from('referral_settings')
      .select('*')
      .single()

    if (settingsError) {
      logger.warn('Failed to get referral settings', settingsError)
    }

    // Format referrals list
    const referralsList = referrals?.map((ref) => ({
      id: ref.id,
      refereeName: ref.referee?.full_name || 'Unknown User',
      refereeEmail: ref.referee?.email || '',
      status: ref.status,
      signupDate: ref.signup_date || ref.created_at,
      completionDate: ref.completion_date,
      reward: ref.referrer_reward || 0,
      requestsGranted: ref.referrer_requests_granted || 0,
      earned: ref.status === 'completed',
    })) || []

    // Generate referral link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'
    const referralLink = profile.referral_code
      ? `${baseUrl}/signup?ref=${profile.referral_code}`
      : null

    return successResponse({
      user: {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        referralCode: profile.referral_code,
        creditsBalance: profile.credits_balance,
        freeRequestsBalance: profile.free_requests_balance || 0,
      },
      referralLink,
      stats: {
        totalReferrals,
        completedReferrals,
        pendingReferrals,
        totalEarnings,
        totalRequestsEarned,
      },
      settings: settings ? {
        rewardType: settings.reward_type || 'requests',
        referrerRewardType: settings.referrer_reward_type,
        referrerRewardValue: settings.referrer_reward_value || 0,
        refereeRewardValue: settings.referee_reward_value || 0,
        referrerRequests: settings.referrer_requests || 1000,
        refereeRequests: settings.referee_requests || 500,
        minPurchaseAmount: settings.min_purchase_amount || 0,
        minQualifyingRequests: settings.min_qualifying_requests || 10,
        enabled: settings.enabled,
      } : null,
      referrals: referralsList,
    })
  } catch (error) {
    logger.error('Get user referrals error', error)
    return errorResponse(error)
  }
}
