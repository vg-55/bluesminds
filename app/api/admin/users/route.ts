import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/utils/ensure-user-profile';
import { checkAdminAccess } from '@/lib/utils/check-admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check admin access using centralized function
    await checkAdminAccess(supabase);

    // Ensure user profile exists in database (using admin client)
    const { data: { user } } = await supabase.auth.getUser();
    if (user && supabaseAdmin) {
      await ensureUserProfile(supabaseAdmin, user.id);
    }

    // CRITICAL FIX: Use supabaseAdmin to bypass RLS and fetch ALL users
    // Regular client is RLS-restricted and can only see own profile
    if (!supabaseAdmin) {
      throw new Error('Service role client not available');
    }

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check admin access using centralized function
    await checkAdminAccess(supabase);

    // Ensure user profile exists in database (using admin client)
    const { data: { user } } = await supabase.auth.getUser();
    if (user && supabaseAdmin) {
      await ensureUserProfile(supabaseAdmin, user.id);
    }

    const body = await request.json();
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use supabaseAdmin to bypass RLS restrictions
    if (!supabaseAdmin) {
      throw new Error('Service role client not available');
    }

    // Update user status
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check admin access using centralized function
    await checkAdminAccess(supabase);

    // Ensure user profile exists in database (using admin client)
    const { data: { user } } = await supabase.auth.getUser();
    if (user && supabaseAdmin) {
      await ensureUserProfile(supabaseAdmin, user.id);
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Use supabaseAdmin to bypass RLS restrictions
    if (!supabaseAdmin) {
      throw new Error('Service role client not available');
    }

    // Soft delete by setting status to 'deleted'
    const { error } = await supabaseAdmin
      .from('users')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
