import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client';
import { checkAdminAccess } from '@/lib/utils/check-admin';

// Force dynamic rendering
export const dynamic = 'force-dynamic'

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

    // Auto-create pricing entry for the custom model mapping
    // Check if pricing already exists for this custom_name
    const { data: existingPricing } = await supabaseAdmin
      .from('model_pricing')
      .select('model_name')
      .eq('model_name', custom_name)
      .maybeSingle();

    if (!existingPricing) {
      // Extract provider name from actual_model_name for pricing
      const providerName = extractProviderFromModel(actual_model_name);

      // Create pricing entry
      const { error: pricingError } = await supabaseAdmin
        .from('model_pricing')
        .insert({
          model_name: custom_name,
          price_per_request: 0.005, // Default pricing
          provider: providerName,
          is_custom: true,
          is_active: true,
          notes: `Auto-created for custom model mapping: ${custom_name} → ${actual_model_name}`,
        });

      if (pricingError) {
        console.warn('Failed to auto-create pricing for custom model:', pricingError);
        // Don't fail the request - pricing can be added manually later
      } else {
        console.log(`Auto-created pricing for custom model: ${custom_name}`);
      }
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

    // If the model was deactivated, also deactivate its auto-created pricing
    if (updates.is_active === false && data) {
      const { data: pricing } = await supabaseAdmin
        .from('model_pricing')
        .select('model_name, notes, is_active')
        .eq('model_name', (data as any).custom_name)
        .maybeSingle();

      // Only update if it was auto-created and is currently active
      if (pricing && pricing.notes?.includes('Auto-created for custom model mapping') && pricing.is_active) {
        await supabaseAdmin
          .from('model_pricing')
          .update({ is_active: false })
          .eq('model_name', (data as any).custom_name);

        console.log(`Auto-deactivated pricing for deactivated custom model: ${(data as any).custom_name}`);
      }
    }

    // If the model was activated, also activate its auto-created pricing
    if (updates.is_active === true && data) {
      const { data: pricing } = await supabaseAdmin
        .from('model_pricing')
        .select('model_name, notes, is_active')
        .eq('model_name', (data as any).custom_name)
        .maybeSingle();

      // Only update if it was auto-created and is currently inactive
      if (pricing && pricing.notes?.includes('Auto-created for custom model mapping') && !pricing.is_active) {
        await supabaseAdmin
          .from('model_pricing')
          .update({ is_active: true })
          .eq('model_name', (data as any).custom_name);

        console.log(`Auto-activated pricing for activated custom model: ${(data as any).custom_name}`);
      }
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

    // Get the custom model info before deleting
    const { data: customModel } = await supabaseAdmin
      .from('custom_models')
      .select('custom_name')
      .eq('id', id)
      .single();

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

    // Auto-delete associated pricing entry if it was auto-created
    if (customModel?.custom_name) {
      const { data: pricing } = await supabaseAdmin
        .from('model_pricing')
        .select('model_name, notes')
        .eq('model_name', customModel.custom_name)
        .maybeSingle();

      // Only delete if it was auto-created (has the auto-created note)
      if (pricing && pricing.notes?.includes('Auto-created for custom model mapping')) {
        await supabaseAdmin
          .from('model_pricing')
          .delete()
          .eq('model_name', customModel.custom_name);

        console.log(`Auto-deleted pricing for removed custom model: ${customModel.custom_name}`);
      }
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

// Helper function to extract provider from model name
function extractProviderFromModel(modelName: string): string {
  const name = modelName.toLowerCase();

  if (name.includes('gpt') || name.includes('openai')) {
    return 'openai';
  } else if (name.includes('claude') || name.includes('anthropic')) {
    return 'anthropic';
  } else if (name.includes('gemini') || name.includes('palm') || name.includes('google')) {
    return 'google';
  } else if (name.includes('llama')) {
    return 'meta';
  } else if (name.includes('mistral')) {
    return 'mistral';
  } else if (name.includes('deepseek')) {
    return 'deepseek';
  } else if (name.includes('cohere')) {
    return 'cohere';
  }

  return 'custom';
}
