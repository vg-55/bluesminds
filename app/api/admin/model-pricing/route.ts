/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// ADMIN API: MODEL PRICING MANAGEMENT
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client'
import { errorResponse } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { checkAdminAccess } from '@/lib/utils/check-admin'
import { ensureUserProfile } from '@/lib/utils/ensure-user-profile'
import { ValidationError, ServerError } from '@/lib/utils/errors'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const PLATFORM_SETTINGS_ID = '00000000-0000-0000-0000-000000000001'
const MODEL_PRICING_SELECTED_MODEL_KEY = 'model_pricing_selected_model'

// GET: Fetch all model pricing OR (when include_settings=true) also return selected model + available models list
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check admin access using centralized function
    await checkAdminAccess(supabase)

    // Ensure user profile exists (using admin client)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user && supabaseAdmin) {
      await ensureUserProfile(supabaseAdmin, user.id)
    }

    logger.info('Admin model pricing GET called', {
      userId: user?.id ?? null,
      includeSettings: request.nextUrl.searchParams.get('include_settings'),
    })

    const searchParams = request.nextUrl.searchParams
    const includeSettings = searchParams.get('include_settings') === 'true'

    // Get search/filter params
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
      return errorResponse(new ServerError('Failed to fetch model pricing', error))
    }

    // Source of truth for "mapped models" is Admin → Models (custom_models)
    // End users only see custom_models where is_active=true (see /api/v1/models).
    // Model Pricing Management must reflect the same list and exclude unmapped/disabled models.
    const { data: mappedModels, error: mappedModelsError } = await supabase
      .from('custom_models')
      .select('custom_name, display_name, provider_id, is_active')
      .eq('is_active', true)

    logger.info('Model pricing mapped models (user client) fetched', {
      count: Array.isArray(mappedModels) ? mappedModels.length : null,
      error: mappedModelsError ? (mappedModelsError as any).message ?? String(mappedModelsError) : null,
    })

    // Compare with service-role client to detect RLS issues
    if (supabaseAdmin) {
      const { data: mappedModelsAdmin, error: mappedModelsAdminError } = await supabaseAdmin
        .from('custom_models')
        .select('custom_name, display_name, provider_id, is_active')
        .eq('is_active', true)

      logger.info('Model pricing mapped models (admin client) fetched', {
        count: Array.isArray(mappedModelsAdmin) ? mappedModelsAdmin.length : null,
        error: mappedModelsAdminError
          ? (mappedModelsAdminError as any).message ?? String(mappedModelsAdminError)
          : null,
      })
    }

    if (mappedModelsError) {
      logger.error('Failed to fetch mapped models for filtering', mappedModelsError)
      return errorResponse(new ServerError('Failed to fetch model pricing', mappedModelsError))
    }

    const mappedModelNames = new Set(
      (mappedModels || [])
        .map((m: any) => (typeof m?.custom_name === 'string' ? m.custom_name : null))
        .filter(Boolean)
    )

    // Filter pricing data: only show pricing rows for mapped models OR explicitly custom pricing rows.
    // This ensures unmapped/disabled models never appear in Admin → Model Pricing.
    const filteredData = (data || []).filter(
      (pricing: any) => mappedModelNames.has(pricing.model_name) || pricing.is_custom
    )

    if (!includeSettings) {
      return NextResponse.json({
        success: true,
        data: filteredData,
      })
    }

    if (!supabaseAdmin) {
      return errorResponse(new ServerError('Service role client not available'))
    }

    // Read selected model from platform_settings.metadata
    const { data: settingsRow, error: settingsError } = await supabaseAdmin
      .from('platform_settings')
      .select('metadata')
      .eq('id', PLATFORM_SETTINGS_ID)
      .single()

    if (settingsError) {
      logger.error('Failed to fetch platform settings for model pricing selection', settingsError)
      return errorResponse(new ServerError('Failed to fetch model pricing settings', settingsError))
    }

    const metadata = ((settingsRow as any)?.metadata as Record<string, any> | null) || {}
    const selectedModelName =
      typeof metadata[MODEL_PRICING_SELECTED_MODEL_KEY] === 'string'
        ? (metadata[MODEL_PRICING_SELECTED_MODEL_KEY] as string)
        : null

    // Available models list for selection should be the same mapped models list visible to end users.
    // Include provider name for display (optional).
    const providerIds = Array.from(
      new Set(
        (mappedModels || [])
          .map((m: any) => (typeof m?.provider_id === 'string' ? m.provider_id : null))
          .filter(Boolean)
      )
    )

    const providerNameById = new Map<string, string>()
    if (providerIds.length > 0) {
      const { data: providers, error: providersError } = await supabase
        .from('litellm_servers')
        .select('id, name')
        .in('id', providerIds)

      if (providersError) {
        logger.error('Failed to fetch providers for mapped models list', providersError)
        return errorResponse(new ServerError('Failed to fetch model pricing settings', providersError))
      }

      ;(providers || []).forEach((p: any) => {
        if (p?.id && p?.name) providerNameById.set(String(p.id), String(p.name))
      })
    }

    const availableModels = (mappedModels || [])
      .map((m: any) => {
        const modelName = String(m.custom_name)
        const displayName =
          typeof m?.display_name === 'string' && m.display_name.trim()
            ? String(m.display_name)
            : modelName

        const providerName =
          typeof m?.provider_id === 'string' ? providerNameById.get(String(m.provider_id)) ?? null : null

        return {
          model_name: modelName,
          display_name: displayName,
          provider: providerName,
          is_custom: true,
        }
      })
      .sort((a, b) => a.display_name.localeCompare(b.display_name))

    return NextResponse.json({
      success: true,
      data: filteredData || [],
      settings: {
        selected_model_name: selectedModelName,
        available_models: availableModels,
      },
    })
  } catch (error) {
    logger.error('Model pricing fetch error', error)
    return errorResponse(error)
  }
}

// POST: Create new model pricing OR (when action="set_selected_model") persist selected model for pricing/settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check admin access using centralized function
    await checkAdminAccess(supabase)

    // Ensure user profile exists (using admin client)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user && supabaseAdmin) {
      await ensureUserProfile(supabaseAdmin, user.id)
    }

    // Parse request body
    const body = await request.json()
    const action = body?.action

    if (action === 'set_selected_model') {
      const selectedModelName =
        typeof body?.selected_model_name === 'string' ? body.selected_model_name.trim() : ''

      if (!selectedModelName) {
        return errorResponse(new ValidationError('selected_model_name is required'))
      }
      if (selectedModelName === 'default') {
        return errorResponse(new ValidationError('default cannot be selected'))
      }
      if (!supabaseAdmin) {
        return errorResponse(new ServerError('Service role client not available'))
      }

      // Validate selection is a currently mapped/enabled model (same as end-user models list).
      const { data: mappedRow, error: mappedError } = await supabase
        .from('custom_models')
        .select('custom_name')
        .eq('custom_name', selectedModelName)
        .eq('is_active', true)
        .maybeSingle()

      if (mappedError) {
        logger.error('Failed to validate selected model mapping', mappedError)
        return errorResponse(new ServerError('Failed to validate selected model', mappedError))
      }

      if (!mappedRow) {
        return errorResponse(new ValidationError('Selected model is not mapped/enabled'))
      }

      // Update platform_settings.metadata with selected model
      const { data: currentSettings, error: currentSettingsError } = await supabaseAdmin
        .from('platform_settings')
        .select('metadata')
        .eq('id', PLATFORM_SETTINGS_ID)
        .single()

      if (currentSettingsError) {
        logger.error('Failed to fetch platform settings for update', currentSettingsError)
        return errorResponse(new ServerError('Failed to update model pricing settings', currentSettingsError))
      }

      const currentMetadata = ((currentSettings as any)?.metadata as Record<string, any> | null) || {}
      const newMetadata = {
        ...currentMetadata,
        [MODEL_PRICING_SELECTED_MODEL_KEY]: selectedModelName,
      }

      const { error: updateError } = await (supabaseAdmin as any)
        .from('platform_settings')
        .update({
          metadata: newMetadata,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', PLATFORM_SETTINGS_ID)

      if (updateError) {
        logger.error('Failed to persist selected model', updateError)
        return errorResponse(new ServerError('Failed to save selected model', updateError))
      }

      return NextResponse.json({
        success: true,
        data: { selected_model_name: selectedModelName },
        message: 'Selected model saved',
      })
    }

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
      return errorResponse(new ValidationError('model_name and price_per_request are required'))
    }

    // Insert model pricing
    const { data, error } = await (supabase as any)
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
        new ValidationError(
          error.code === '23505'
            ? 'Model pricing already exists for this model'
            : 'Failed to create model pricing',
          error
        )
      )
    }

    logger.info('Model pricing created', { modelName: model_name, userId: user?.id })

    return NextResponse.json({
      success: true,
      data,
      message: 'Model pricing created successfully',
    })
  } catch (error) {
    logger.error('Model pricing creation error', error)
    return errorResponse(error)
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
      return errorResponse(new ValidationError('id or model_name is required'))
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
    let query = (supabase as any).from('model_pricing').update(updateData)

    if (id) {
      query = query.eq('id', id)
    } else {
      query = query.eq('model_name', model_name)
    }

    const { data, error } = await query.select().single()

    if (error) {
      logger.error('Failed to update model pricing', error)
      return errorResponse(new ServerError('Failed to update model pricing', error))
    }

    logger.info('Model pricing updated', { modelName: (data as any)?.model_name, userId: user?.id })

    return NextResponse.json({
      success: true,
      data,
      message: 'Model pricing updated successfully',
    })
  } catch (error) {
    logger.error('Model pricing update error', error)
    return errorResponse(error)
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
      return errorResponse(new ValidationError('id or model_name query parameter is required'))
    }

    // Prevent deleting the default pricing
    if (modelName === 'default') {
      return errorResponse(new ValidationError('Cannot delete default model pricing'))
    }

    // Delete model pricing
    let query = supabase.from('model_pricing').delete()

    if (id) {
      query = query.eq('id', id)
    } else if (modelName) {
      query = query.eq('model_name', modelName)
    }

    const { error } = await query

    if (error) {
      logger.error('Failed to delete model pricing', error)
      return errorResponse(new ServerError('Failed to delete model pricing', error))
    }

    logger.info('Model pricing deleted', { modelName: modelName || id, userId: user?.id })

    return NextResponse.json({
      success: true,
      message: 'Model pricing deleted successfully',
    })
  } catch (error) {
    logger.error('Model pricing deletion error', error)
    return errorResponse(error)
  }
}
