#!/usr/bin/env node
// ============================================================================
// MARK SEED MODELS AS CUSTOM
// ============================================================================
// This script marks the seed model pricing entries as custom so they
// appear in the Model Pricing Management UI by default.
//
// Usage:
//   node scripts/mark-seed-models-custom.mjs
//
// Note: Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
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
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Models to mark as custom (seed data models)
const SEED_MODELS = [
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4o',
  'gpt-3.5-turbo',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
  'gemini-pro',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
]

async function markModelsAsCustom() {
  console.log('🔄 Marking seed models as custom...\n')

  try {
    // Update models to mark as custom
    const { data, error } = await supabase
      .from('model_pricing')
      .update({ is_custom: true })
      .in('model_name', SEED_MODELS)
      .eq('is_custom', false)
      .select()

    if (error) {
      console.error('❌ Error updating models:', error)
      process.exit(1)
    }

    console.log(`✅ Successfully marked ${data?.length || 0} models as custom:`)
    data?.forEach((model) => {
      console.log(`   • ${model.model_name} (${model.provider})`)
    })

    console.log('\n✨ Done! Refresh the Model Pricing Management page to see the models.')
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

markModelsAsCustom()
