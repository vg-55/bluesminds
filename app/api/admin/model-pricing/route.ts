// ============================================================================
// ADMIN API: MODEL PRICING MANAGEMENT
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client'
import { errorResponse } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { checkAdminAccess } from '@/lib/utils/check-admin'
import { ensureUserProfile } from '@/lib/utils/ensure-user-profile'

// GET: Fetch all model pricing
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check admin access using centralized function
    await checkAdminAccess(supabase)

    // Ensure user profile exists (using admin client)
    const { data: { user } } = await supabase.auth.getUser()
    if (user && supabaseAdmin) {
      await ensureUserProfile(supabaseAdmin, user.id)
    }

    // Get search/filter params
    const searchParams = request.nextUrl.searchParams
    const provider = searchParams.get('provider')
    const isActive = searchParams.get('is_active')
    const isCustom = searchParams.get('is_custom')

    // Build query
    let query = supabase
      .from('model_pricing')
      .select('*')
      .order('provider', { ascending: true })
      .order('model_name', { ascending: true })

    if (provider) {
      query = query.eq('provider', provider)
    }
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }
    if (isCustom !== null) {
      query = query.eq('is_custom', isCustom === 'true')
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to fetch model pricing', error)
      return errorResponse('Failed to fetch model pricing', 500)
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    logger.error('Model pricing fetch error', error)
    return errorResponse('Internal server error', 500)
  }
}

// POST: Create new model pricing
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check admin access using centralized function
    await checkAdminAccess(supabase)

    // Ensure user profile exists (using admin client)
    const { data: { user } } = await supabase.auth.getUser()
    if (user && supabaseAdmin) {
      await ensureUserProfile(supabaseAdmin, user.id)
    }

    // Parse request body
    const body = await request.json()
    const {
      model_name,
      price_per_request,
      price_per_1k_input_tokens,
      price_per_1k_output_tokens,
      provider,
      is_custom = false,
      is_active = true,
      notes,
    } = body

    // Validate required fields
    if (!model_name || !price_per_request) {
      return errorResponse('model_name and price_per_request are required', 400)
    }

    // Insert model pricing
    const { data, error } = await supabase
      .from('model_pricing')
      .insert({
        model_name,
        price_per_request: parseFloat(price_per_request),
        price_per_1k_input_tokens: price_per_1k_input_tokens
          ? parseFloat(price_per_1k_input_tokens)
          : null,
        price_per_1k_output_tokens: price_per_1k_output_tokens
          ? parseFloat(price_per_1k_output_tokens)
          : null,
        provider: provider || 'unknown',
        is_custom,
        is_active,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create model pricing', error)
      return errorResponse(
        error.code === '23505' // Unique constraint violation
          ? 'Model pricing already exists for this model'
          : 'Failed to create model pricing',
        error.code === '23505' ? 409 : 500
      )
    }

    logger.info('Model pricing created', { modelName: model_name, userId: user.id })

    return NextResponse.json({
      success: true,
      data,
      message: 'Model pricing created successfully',
    })
  } catch (error) {
    logger.error('Model pricing creation error', error)
    return errorResponse('Internal server error', 500)
  }
}

// PATCH: Update existing model pricing
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check admin access using centralized function
    await checkAdminAccess(supabase)

    // Ensure user profile exists (using admin client)
    const { data: { user } } = await supabase.auth.getUser()
    if (user && supabaseAdmin) {
      await ensureUserProfile(supabaseAdmin, user.id)
    }

    // Parse request body
    const body = await request.json()
    const { id, model_name, ...updates } = body

    if (!id && !model_name) {
      return errorResponse('id or model_name is required', 400)
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (updates.price_per_request !== undefined) {
      updateData.price_per_request = parseFloat(updates.price_per_request)
    }
    if (updates.price_per_1k_input_tokens !== undefined) {
      updateData.price_per_1k_input_tokens = updates.price_per_1k_input_tokens
        ? parseFloat(updates.price_per_1k_input_tokens)
        : null
    }
    if (updates.price_per_1k_output_tokens !== undefined) {
      updateData.price_per_1k_output_tokens = updates.price_per_1k_output_tokens
        ? parseFloat(updates.price_per_1k_output_tokens)
        : null
    }
    if (updates.provider !== undefined) {
      updateData.provider = updates.provider
    }
    if (updates.is_custom !== undefined) {
      updateData.is_custom = updates.is_custom
    }
    if (updates.is_active !== undefined) {
      updateData.is_active = updates.is_active
    }
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes
    }

    // Update model pricing
    let query = supabase.from('model_pricing').update(updateData)

    if (id) {
      query = query.eq('id', id)
    } else {
      query = query.eq('model_name', model_name)
    }

    const { data, error } = await query.select().single()

    if (error) {
      logger.error('Failed to update model pricing', error)
      return errorResponse('Failed to update model pricing', 500)
    }

    logger.info('Model pricing updated', { modelName: data.model_name, userId: user.id })

    return NextResponse.json({
      success: true,
      data,
      message: 'Model pricing updated successfully',
    })
  } catch (error) {
    logger.error('Model pricing update error', error)
    return errorResponse('Internal server error', 500)
  }
}

// DELETE: Remove model pricing
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check admin access using centralized function
    await checkAdminAccess(supabase)

    // Ensure user profile exists (using admin client)
    const { data: { user } } = await supabase.auth.getUser()
    if (user && supabaseAdmin) {
      await ensureUserProfile(supabaseAdmin, user.id)
    }

    // Get ID from query params
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const modelName = searchParams.get('model_name')

    if (!id && !modelName) {
      return errorResponse('id or model_name query parameter is required', 400)
    }

    // Prevent deleting the default pricing
    if (modelName === 'default') {
      return errorResponse('Cannot delete default model pricing', 400)
    }

    // Delete model pricing
    let query = supabase.from('model_pricing').delete()

    if (id) {
      query = query.eq('id', id)
    } else {
      query = query.eq('model_name', modelName)
    }

    const { error } = await query

    if (error) {
      logger.error('Failed to delete model pricing', error)
      return errorResponse('Failed to delete model pricing', 500)
    }

    logger.info('Model pricing deleted', { modelName: modelName || id, userId: user.id })

    return NextResponse.json({
      success: true,
      message: 'Model pricing deleted successfully',
    })
  } catch (error) {
    logger.error('Model pricing deletion error', error)
    return errorResponse('Internal server error', 500)
  }
}
