#!/usr/bin/env node
// ============================================================================
// SYNC CUSTOM MODEL PRICING
// ============================================================================
// This script ensures all custom model mappings have pricing configured
// by auto-creating pricing entries with default values
//
// Usage:
//   node scripts/sync-custom-model-pricing.mjs
// ============================================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env file
let supabaseUrl, supabaseKey
try {
  const envFile = readFileSync('.env', 'utf8')
  const lines = envFile.split('\n')
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim()
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseKey = line.split('=')[1].trim()
    }
  }
} catch (error) {
  console.error('❌ Error reading .env file:', error.message)
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Helper function to extract provider from model name
function extractProviderFromModel(modelName) {
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

async function main() {
  console.log('🔄 Syncing pricing for custom model mappings...\n')

  // 1. Get all active custom model mappings
  const { data: customModels, error: customError } = await supabase
    .from('custom_models')
    .select('custom_name, actual_model_name')
    .eq('is_active', true)

  if (customError) {
    console.error('❌ Error fetching custom models:', customError)
    process.exit(1)
  }

  if (!customModels || customModels.length === 0) {
    console.log('ℹ️  No custom model mappings found.')
    console.log('   Create some in the Models admin section first.')
    return
  }

  console.log(`📋 Found ${customModels.length} active custom model mapping(s)\n`)

  // 2. Get existing pricing entries
  const { data: existingPricing, error: pricingError } = await supabase
    .from('model_pricing')
    .select('model_name')

  if (pricingError) {
    console.error('❌ Error fetching pricing:', pricingError)
    process.exit(1)
  }

  const existingPricingNames = new Set(
    (existingPricing || []).map(p => p.model_name)
  )

  // 3. Find custom models without pricing
  const modelsWithoutPricing = customModels.filter(
    model => !existingPricingNames.has(model.custom_name)
  )

  if (modelsWithoutPricing.length === 0) {
    console.log('✅ All custom models already have pricing configured!')
    return
  }

  console.log(`🔍 Found ${modelsWithoutPricing.length} custom model(s) without pricing\n`)

  // 4. Create pricing entries with default values
  const pricingEntries = modelsWithoutPricing.map(model => ({
    model_name: model.custom_name,
    price_per_request: 0.005, // Default pricing
    provider: extractProviderFromModel(model.actual_model_name),
    is_custom: true,
    is_active: true,
    notes: `Auto-created for custom model mapping: ${model.custom_name} → ${model.actual_model_name}`,
  }))

  const { data: created, error: insertError } = await supabase
    .from('model_pricing')
    .insert(pricingEntries)
    .select()

  if (insertError) {
    console.error('❌ Error creating pricing entries:', insertError)
    process.exit(1)
  }

  console.log(`✅ Successfully created pricing for ${created.length} custom model(s):\n`)
  created.forEach(pricing => {
    console.log(`   • ${pricing.model_name} (${pricing.provider}) - $${pricing.price_per_request}/request`)
  })

  console.log('\n✨ Done! These models will now appear in Model Pricing Management.')
  console.log('   You can adjust the pricing values in the UI as needed.')
}

main().catch(console.error)
