import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client';
import { checkAdminAccess } from '@/lib/utils/check-admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check admin access using centralized function
    await checkAdminAccess(supabase);

    // Use supabaseAdmin to bypass RLS restrictions
    if (!supabaseAdmin) {
      throw new Error('Service role client not available');
    }

    // Fetch statistics
    // Total users count
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Users created this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const { count: usersThisWeek } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo.toISOString());

    // Total API keys
    const { count: totalApiKeys } = await supabaseAdmin
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Active LiteLLM servers
    const { count: activeServers } = await supabaseAdmin
      .from('litellm_servers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Recent users (last 5)
    const { data: recentUsers } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, tier, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        usersThisWeek: usersThisWeek || 0,
        totalApiKeys: totalApiKeys || 0,
        activeServers: activeServers || 0,
      },
      recentUsers: recentUsers || [],
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
