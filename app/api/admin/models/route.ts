import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client';
import { checkAdminAccess } from '@/lib/utils/check-admin';

// GET /api/admin/models - List all custom models
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check admin access using centralized function
    await checkAdminAccess(supabase);

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      );
    }

    // Fetch all custom models with provider information
    const { data: models, error } = await supabaseAdmin
      .from('custom_models')
      .select(`
        *,
        provider:litellm_servers(id, name, base_url, health_status)
      `)
      .order('custom_name', { ascending: true })
      .order('priority', { ascending: true })
      .order('weight', { ascending: false });

    if (error) {
      console.error('Failed to fetch custom models:', error);
      return NextResponse.json(
        { error: 'Failed to fetch custom models' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: models || [] });
  } catch (error) {
    console.error('Error fetching custom models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom models' },
      { status: 500 }
    );
  }
}

// POST /api/admin/models - Create new custom model
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check admin access using centralized function
    await checkAdminAccess(supabase);

    const body = await request.json();
    const {
      custom_name,
      provider_id,
      actual_model_name,
      display_name,
      description,
      is_active,
      priority,
      weight,
    } = body;

    if (!custom_name || !provider_id || !actual_model_name) {
      return NextResponse.json(
        { error: 'custom_name, provider_id, and actual_model_name are required' },
        { status: 400 }
      );
    }

    // Validate priority and weight ranges
    if (priority !== undefined && (priority < 1 || priority > 1000)) {
      return NextResponse.json(
        { error: 'Priority must be between 1 and 1000' },
        { status: 400 }
      );
    }

    if (weight !== undefined && (weight <= 0 || weight > 10)) {
      return NextResponse.json(
        { error: 'Weight must be between 0.1 and 10.0' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('custom_models')
      .insert({
        custom_name,
        provider_id,
        actual_model_name,
        display_name: display_name || custom_name,
        description,
        is_active: is_active !== undefined ? is_active : true,
        priority: priority !== undefined ? priority : 100,
        weight: weight !== undefined ? weight : 1.0,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create custom model:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create custom model' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error creating custom model:', error);
    return NextResponse.json(
      { error: 'Failed to create custom model' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/models - Update custom model
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check admin access using centralized function
    await checkAdminAccess(supabase);

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('custom_models')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update custom model:', error);
      return NextResponse.json(
        { error: 'Failed to update custom model' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating custom model:', error);
    return NextResponse.json(
      { error: 'Failed to update custom model' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/models - Delete custom model
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check admin access using centralized function
    await checkAdminAccess(supabase);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      );
    }

    const { error } = await supabaseAdmin
      .from('custom_models')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete custom model:', error);
      return NextResponse.json(
        { error: 'Failed to delete custom model' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom model:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom model' },
      { status: 500 }
    );
  }
}
