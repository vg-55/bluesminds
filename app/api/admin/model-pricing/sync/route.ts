// ============================================================================
// ADMIN API: SYNC AVAILABLE MODELS WITH PRICING
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { errorResponse } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

interface AvailableModel {
  model_name: string
  source: 'server' | 'custom_mapping'
  provider?: string
  has_pricing: boolean
  current_pricing?: number
}

// GET: Fetch all available models and check pricing coverage
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse('Unauthorized', 401)
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return errorResponse('Forbidden: Admin access required', 403)
    }

    // 1. Fetch all active LiteLLM servers and their supported models
    const { data: servers } = await supabase
      .from('litellm_servers')
      .select('id, name, supported_models, is_active')
      .eq('is_active', true)

    // 2. Fetch all custom model mappings
    const { data: customModels } = await supabase
      .from('custom_models')
      .select('custom_name, actual_model_name, provider_id, is_active')
      .eq('is_active', true)

    // 3. Fetch all existing model pricing
    const { data: existingPricing } = await supabase
      .from('model_pricing')
      .select('model_name, price_per_request, is_active')

    // Create a map of existing pricing for quick lookup
    const pricingMap = new Map(
      existingPricing?.map((p) => [p.model_name, p]) || []
    )

    // 4. Collect all unique models
    const allModels = new Map<string, AvailableModel>()

    // Add models from servers
    servers?.forEach((server) => {
      const models = server.supported_models as string[] | null
      if (Array.isArray(models)) {
        models.forEach((modelName) => {
          if (!allModels.has(modelName)) {
            const pricing = pricingMap.get(modelName)
            allModels.set(modelName, {
              model_name: modelName,
              source: 'server',
              provider: extractProviderFromModel(modelName),
              has_pricing: !!pricing,
              current_pricing: pricing?.price_per_request,
            })
          }
        })
      }
    })

    // Add custom model mappings (both custom_name and actual_model_name)
    customModels?.forEach((customModel) => {
      // Add custom name
      if (!allModels.has(customModel.custom_name)) {
        const pricing = pricingMap.get(customModel.custom_name)
        allModels.set(customModel.custom_name, {
          model_name: customModel.custom_name,
          source: 'custom_mapping',
          provider: extractProviderFromModel(customModel.actual_model_name),
          has_pricing: !!pricing,
          current_pricing: pricing?.price_per_request,
        })
      }

      // Add actual model name if different
      if (customModel.actual_model_name && customModel.actual_model_name !== customModel.custom_name) {
        if (!allModels.has(customModel.actual_model_name)) {
          const pricing = pricingMap.get(customModel.actual_model_name)
          allModels.set(customModel.actual_model_name, {
            model_name: customModel.actual_model_name,
            source: 'custom_mapping',
            provider: extractProviderFromModel(customModel.actual_model_name),
            has_pricing: !!pricing,
            current_pricing: pricing?.price_per_request,
          })
        }
      }
    })

    // Convert to array and separate missing vs existing
    const modelsArray = Array.from(allModels.values())
    const missingPricing = modelsArray.filter((m) => !m.has_pricing)
    const withPricing = modelsArray.filter((m) => m.has_pricing)

    return NextResponse.json({
      success: true,
      data: {
        total_models: modelsArray.length,
        with_pricing: withPricing.length,
        missing_pricing: missingPricing.length,
        models: modelsArray,
        missing_models: missingPricing,
      },
    })
  } catch (error) {
    logger.error('Model sync error', error)
    return errorResponse('Internal server error', 500)
  }
}

// POST: Bulk add pricing for missing models
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse('Unauthorized', 401)
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return errorResponse('Forbidden: Admin access required', 403)
    }

    // Parse request body
    const body = await request.json()
    const { models, default_price = 0.005 } = body

    if (!models || !Array.isArray(models) || models.length === 0) {
      return errorResponse('models array is required', 400)
    }

    // Prepare bulk insert data
    const pricingData = models.map((model: AvailableModel) => ({
      model_name: model.model_name,
      price_per_request: parseFloat(String(default_price)),
      provider: model.provider || 'unknown',
      is_custom: model.source === 'custom_mapping',
      is_active: true,
      notes: `Auto-imported from ${model.source}`,
    }))

    // Bulk insert with conflict handling
    const { data, error } = await supabase
      .from('model_pricing')
      .upsert(pricingData, {
        onConflict: 'model_name',
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      logger.error('Failed to bulk add model pricing', error)
      return errorResponse('Failed to add model pricing', 500)
    }

    logger.info('Bulk model pricing added', {
      count: models.length,
      userId: user.id,
    })

    return NextResponse.json({
      success: true,
      data: {
        added: data?.length || 0,
        models: data,
      },
      message: `Successfully added pricing for ${data?.length || 0} models`,
    })
  } catch (error) {
    logger.error('Bulk pricing add error', error)
    return errorResponse('Internal server error', 500)
  }
}

// Helper function to extract provider from model name
function extractProviderFromModel(modelName: string): string {
  const name = modelName.toLowerCase()

  if (name.includes('gpt') || name.includes('openai')) {
    return 'openai'
  } else if (name.includes('claude') || name.includes('anthropic')) {
    return 'anthropic'
  } else if (name.includes('gemini') || name.includes('palm') || name.includes('google')) {
    return 'google'
  } else if (name.includes('llama')) {
    return 'meta'
  } else if (name.includes('mistral')) {
    return 'mistral'
  } else if (name.includes('deepseek')) {
    return 'deepseek'
  } else if (name.includes('cohere')) {
    return 'cohere'
  }

  return 'custom'
}
