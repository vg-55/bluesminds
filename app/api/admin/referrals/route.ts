// ============================================================================
// ADMIN REFERRALS API
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client'
import { checkAdminAccess } from '@/lib/utils/check-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/referrals - Get all referrals with stats
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check admin access
    await checkAdminAccess(supabase)

    // Use supabaseAdmin to bypass RLS restrictions
    if (!supabaseAdmin) {
      throw new Error('Service role client not available')
    }

    // Fetch all referrals with user details
    const { data: referrals, error } = await supabaseAdmin
      .from('referrals')
      .select(`
        id,
        status,
        signup_date: created_at,
        completion_date,
        referrer_reward,
        referee_reward,
        referrer:referrer_id (
          id,
          full_name,
          email
        ),
        referee:referee_id (
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calculate stats
    const stats = {
      totalReferrals: referrals?.length || 0,
      completedReferrals: referrals?.filter((r) => r.status === 'completed').length || 0,
      totalRewardsPaid: referrals?.reduce((sum, r) => sum + (r.referrer_reward || 0), 0) || 0,
    }

    // Get top referrers
    const referrerMap = new Map()
    referrals?.forEach((ref) => {
      const referrerId = ref.referrer?.id
      if (!referrerId) return

      if (!referrerMap.has(referrerId)) {
        referrerMap.set(referrerId, {
          id: referrerId,
          name: ref.referrer.full_name || 'Unknown',
          email: ref.referrer.email,
          count: 0,
          earned: 0,
        })
      }

      const referrerStats = referrerMap.get(referrerId)
      referrerStats.count++
      referrerStats.earned += ref.referrer_reward || 0
    })

    const topReferrers = Array.from(referrerMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return NextResponse.json({
      referrals: referrals?.map((ref) => ({
        id: ref.id,
        referrer: {
          name: ref.referrer?.full_name || 'Unknown',
          email: ref.referrer?.email || 'unknown@example.com',
        },
        referee: {
          name: ref.referee?.full_name || 'Unknown',
          email: ref.referee?.email || 'unknown@example.com',
        },
        status: ref.status,
        signupDate: ref.signup_date,
        completionDate: ref.completion_date,
        reward: ref.referrer_reward || 0,
      })) || [],
      stats,
      topReferrers,
    })
  } catch (error) {
    console.error('Error fetching referrals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    )
  }
}
