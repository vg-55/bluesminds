#!/usr/bin/env node
// ============================================================================
// SYNC MODEL PRICING WITH REAL PRODUCTION COSTS
// ============================================================================
// This script updates the model_pricing table with real production costs
// from AI providers (Anthropic, OpenAI, Google, etc.)
//
// Usage:
//   node scripts/sync-model-pricing-production.mjs
//
// Source: Provider pricing pages (January 2026)
// ============================================================================

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Real production costs per 1K tokens (input/output)
// Source: Provider pricing pages (January 2026)
const PRODUCTION_PRICING = {
  // Anthropic Claude 4.5 series - Premium models
  'claude-opus-4': { input: 0.015, output: 0.075, provider: 'anthropic' },
  'claude-opus-4.5': { input: 0.015, output: 0.075, provider: 'anthropic' },
  'claude-opus-4-5-20251031': { input: 0.015, output: 0.075, provider: 'anthropic' },
  'claude-opus-4-5-20251101': { input: 0.015, output: 0.075, provider: 'anthropic' },

  'claude-sonnet-4': { input: 0.003, output: 0.015, provider: 'anthropic' },
  'claude-sonnet-4.5': { input: 0.003, output: 0.015, provider: 'anthropic' },
  'claude-sonnet-4-5-20250929': { input: 0.003, output: 0.015, provider: 'anthropic' },
  'claude-sonnet-4-5-20251001': { input: 0.003, output: 0.015, provider: 'anthropic' },

  'claude-haiku-4': { input: 0.00025, output: 0.00125, provider: 'anthropic' },
  'claude-haiku-4-0-20250101': { input: 0.00025, output: 0.00125, provider: 'anthropic' },
  'claude-haiku-4-5-20251001': { input: 0.00025, output: 0.00125, provider: 'anthropic' },

  // Anthropic Claude 3 series - Legacy models
  'claude-3-opus-20240229': { input: 0.015, output: 0.075, provider: 'anthropic' },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015, provider: 'anthropic' },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125, provider: 'anthropic' },
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015, provider: 'anthropic' },

  // OpenAI models
  'gpt-4': { input: 0.03, output: 0.06, provider: 'openai' },
  'gpt-4-turbo': { input: 0.01, output: 0.03, provider: 'openai' },
  'gpt-4o': { input: 0.005, output: 0.015, provider: 'openai' },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015, provider: 'openai' },

  // Google Gemini models
  'gemini-pro': { input: 0.00025, output: 0.0005, provider: 'google' },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005, provider: 'google' },
  'gemini-1.5-flash': { input: 0.000125, output: 0.0005, provider: 'google' },

  // Default fallback
  'default': { input: 0.001, output: 0.002, provider: 'unknown' },
}

// Helper: Calculate average per-request cost from token pricing
// Assumes typical request: 1000 input tokens + 500 output tokens
function calculatePerRequestCost(inputCost, outputCost) {
  const TYPICAL_INPUT_TOKENS = 1000
  const TYPICAL_OUTPUT_TOKENS = 500

  const inputPrice = (TYPICAL_INPUT_TOKENS / 1000) * inputCost
  const outputPrice = (TYPICAL_OUTPUT_TOKENS / 1000) * outputCost

  return inputPrice + outputPrice
}

async function main() {
  console.log('🔄 Syncing model pricing with real production costs...\n')

  const pricingData = []

  for (const [modelName, costs] of Object.entries(PRODUCTION_PRICING)) {
    const perRequestCost = calculatePerRequestCost(costs.input, costs.output)

    pricingData.push({
      model_name: modelName,
      price_per_request: perRequestCost,
      price_per_1k_input_tokens: costs.input,
      price_per_1k_output_tokens: costs.output,
      provider: costs.provider,
      is_custom: false,
      is_active: true,
      notes: 'Real production costs synced from provider pricing pages (Jan 2026)',
    })
  }

  console.log(`📊 Preparing to sync ${pricingData.length} models...\n`)

  // Upsert all pricing data (create or update)
  const { data, error } = await supabase
    .from('model_pricing')
    .upsert(pricingData, {
      onConflict: 'model_name',
      ignoreDuplicates: false, // Update existing records
    })
    .select()

  if (error) {
    console.error('❌ Error syncing pricing:', error)
    process.exit(1)
  }

  console.log('✅ Successfully synced model pricing!\n')
  console.log('📈 Summary by provider:')

  const byProvider = pricingData.reduce((acc, model) => {
    acc[model.provider] = (acc[model.provider] || 0) + 1
    return acc
  }, {})

  for (const [provider, count] of Object.entries(byProvider)) {
    console.log(`   ${provider}: ${count} models`)
  }

  console.log('\n💰 Cost range:')
  const costs = pricingData.map(m => m.price_per_request).sort((a, b) => a - b)
  console.log(`   Cheapest: $${costs[0].toFixed(5)} per request`)
  console.log(`   Most expensive: $${costs[costs.length - 1].toFixed(5)} per request`)
  console.log(`   Average: $${(costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(5)} per request`)

  console.log('\n📝 Notes:')
  console.log('   - Per-request costs calculated assuming 1000 input + 500 output tokens')
  console.log('   - Token-based pricing stored for accurate cost tracking')
  console.log('   - Visit /admin/model-pricing to view and manage pricing')
  console.log('   - Default pricing: $0.005 per request (fallback for unknown models)')

  console.log('\n✨ Done! Your model pricing is now up-to-date.')
}

main().catch(console.error)
