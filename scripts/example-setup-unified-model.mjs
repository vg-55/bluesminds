#!/usr/bin/env node

/**
 * Example: Setup Unified Model with Multiple Different Provider Models
 *
 * This demonstrates mapping ONE custom model name to MULTIPLE providers
 * where each provider uses a DIFFERENT actual model name.
 *
 * Usage:
 *   1. Update PROVIDER_IDS with your actual provider IDs
 *   2. Customize the MODEL_MAPPINGS configuration
 *   3. Run: node scripts/example-setup-unified-model.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eoxoiqeswazggavqnocx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveG9pcWVzd2F6Z2dhdnFub2N4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUzNDQ1NywiZXhwIjoyMDgzMTEwNDU3fQ.mQ-GOLUZFjL0GAv_X0UU4zPlFJNUwhpivxvZGnP5TMY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==============================================================================
// CONFIGURATION - Update these with your actual provider IDs and models
// ==============================================================================

const MODEL_MAPPINGS = [
  {
    customName: 'my-unified-model',
    displayName: 'My Unified Model',
    description: 'Intelligent routing across Claude, GPT, and DeepSeek',
    providers: [
      {
        // Provider 1: Claude Sonnet (Primary, 50% traffic)
        providerId: 'REPLACE_WITH_PROVIDER_1_ID',
        providerName: 'Provider 1', // For display only
        actualModel: 'claude-sonnet-4-5',
        priority: 1,
        weight: 1.5,
      },
      {
        // Provider 2: GPT-4 Turbo (Primary, 33% traffic)
        providerId: 'REPLACE_WITH_PROVIDER_2_ID',
        providerName: 'Provider 2',
        actualModel: 'gpt-4-turbo',
        priority: 1,
        weight: 1.0,
      },
      {
        // Provider 3: DeepSeek (Backup)
        providerId: 'REPLACE_WITH_PROVIDER_3_ID',
        providerName: 'Provider 3',
        actualModel: 'deepseek-chat',
        priority: 2,
        weight: 1.0,
      },
    ],
  },
  {
    customName: 'cost-optimizer',
    displayName: 'Cost-Optimized Model',
    description: 'Prioritizes cheaper models, fallback to premium',
    providers: [
      {
        // Cheap provider gets 75% of traffic
        providerId: 'REPLACE_WITH_CHEAP_PROVIDER_ID',
        providerName: 'Budget Provider',
        actualModel: 'llama-3-70b',
        priority: 1,
        weight: 3.0,
      },
      {
        // Mid-tier gets 25% of traffic
        providerId: 'REPLACE_WITH_MID_PROVIDER_ID',
        providerName: 'Mid-Tier Provider',
        actualModel: 'deepseek-chat',
        priority: 1,
        weight: 1.0,
      },
      {
        // Premium only used as backup
        providerId: 'REPLACE_WITH_PREMIUM_PROVIDER_ID',
        providerName: 'Premium Provider',
        actualModel: 'claude-opus-4-5',
        priority: 2,
        weight: 1.0,
      },
    ],
  },
];

// ==============================================================================
// SETUP FUNCTIONS
// ==============================================================================

async function listProviders() {
  console.log('\n📋 Available Providers:\n');

  const { data: providers, error } = await supabase
    .from('litellm_servers')
    .select('id, name, base_url, health_status, is_active')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('❌ Error fetching providers:', error);
    return [];
  }

  if (!providers || providers.length === 0) {
    console.log('❌ No active providers found. Please add providers first.\n');
    return [];
  }

  providers.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   URL: ${p.base_url}`);
    console.log(`   Health: ${p.health_status}`);
    console.log('');
  });

  return providers;
}

async function setupMapping(config) {
  console.log(`\n🔧 Setting up: ${config.customName}\n`);
  console.log(`   Display Name: ${config.displayName}`);
  console.log(`   Description: ${config.description}`);
  console.log(`   Providers: ${config.providers.length}\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const provider of config.providers) {
    // Check if provider ID looks valid
    if (provider.providerId.startsWith('REPLACE_WITH_')) {
      console.log(`   ⚠️  Skipped ${provider.providerName}: Update PROVIDER_ID first`);
      skipCount++;
      continue;
    }

    // Verify provider exists
    const { data: providerExists } = await supabase
      .from('litellm_servers')
      .select('id, name')
      .eq('id', provider.providerId)
      .single();

    if (!providerExists) {
      console.log(`   ❌ Provider ID not found: ${provider.providerId}`);
      errorCount++;
      continue;
    }

    // Check if mapping already exists
    const { data: existing } = await supabase
      .from('custom_models')
      .select('id')
      .eq('custom_name', config.customName)
      .eq('provider_id', provider.providerId)
      .single();

    if (existing) {
      console.log(`   ℹ️  Already exists: ${providerExists.name} → ${provider.actualModel}`);
      continue;
    }

    // Create the mapping
    const { error } = await supabase
      .from('custom_models')
      .insert({
        custom_name: config.customName,
        provider_id: provider.providerId,
        actual_model_name: provider.actualModel,
        display_name: config.displayName,
        description: config.description,
        priority: provider.priority,
        weight: provider.weight,
        is_active: true,
      });

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      errorCount++;
    } else {
      const totalWeight = config.providers
        .filter(p => p.priority === provider.priority)
        .reduce((sum, p) => sum + p.weight, 0);
      const percentage = ((provider.weight / totalWeight) * 100).toFixed(1);

      console.log(`   ✅ Created: ${providerExists.name} → ${provider.actualModel}`);
      console.log(`      Priority: ${provider.priority}, Weight: ${provider.weight} (${percentage}% at this priority)`);
      successCount++;
    }
  }

  console.log(`\n   Summary: ${successCount} created, ${skipCount} skipped, ${errorCount} errors\n`);
  return successCount > 0;
}

async function showMappings() {
  console.log('\n📊 Current Model Mappings:\n');

  const { data: mappings, error } = await supabase
    .from('custom_models')
    .select(`
      custom_name,
      actual_model_name,
      priority,
      weight,
      is_active,
      litellm_servers (
        name,
        health_status
      )
    `)
    .eq('is_active', true)
    .order('custom_name')
    .order('priority')
    .order('weight', { ascending: false });

  if (error) {
    console.error('❌ Error fetching mappings:', error);
    return;
  }

  if (!mappings || mappings.length === 0) {
    console.log('No mappings found.\n');
    return;
  }

  // Group by custom name
  const grouped = {};
  for (const mapping of mappings) {
    if (!grouped[mapping.custom_name]) {
      grouped[mapping.custom_name] = [];
    }
    grouped[mapping.custom_name].push(mapping);
  }

  // Display grouped mappings
  for (const [customName, providers] of Object.entries(grouped)) {
    console.log(`🎯 ${customName} (${providers.length} providers):`);

    providers.forEach((p, i) => {
      const providerName = p.litellm_servers?.name || 'Unknown';
      const health = p.litellm_servers?.health_status || 'unknown';
      console.log(`   ${i + 1}. ${providerName} → ${p.actual_model_name}`);
      console.log(`      Priority: ${p.priority}, Weight: ${p.weight}, Health: ${health}`);
    });
    console.log('');
  }
}

async function testMapping(customName) {
  console.log(`\n🧪 Testing model: ${customName}\n`);

  const { data: mappings, error } = await supabase
    .from('custom_models')
    .select(`
      actual_model_name,
      priority,
      weight,
      litellm_servers (
        id,
        name,
        health_status
      )
    `)
    .eq('custom_name', customName)
    .eq('is_active', true)
    .order('priority')
    .order('weight', { ascending: false });

  if (error || !mappings || mappings.length === 0) {
    console.log('❌ Model not found or has no active mappings\n');
    return;
  }

  console.log(`Found ${mappings.length} provider mappings:\n`);

  mappings.forEach((m, i) => {
    const provider = m.litellm_servers;
    console.log(`${i + 1}. ${provider.name}`);
    console.log(`   Model: ${m.actual_model_name}`);
    console.log(`   Priority: ${m.priority}`);
    console.log(`   Weight: ${m.weight}`);
    console.log(`   Health: ${provider.health_status}`);
    console.log('');
  });

  console.log('🎯 The gateway will automatically rotate between these providers');
  console.log('   based on priority, weight, health, and current load.\n');
}

// ==============================================================================
// MAIN
// ==============================================================================

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  Multi-Provider Model Setup - Different Models per Provider');
  console.log('='.repeat(70));

  // Step 1: List available providers
  const providers = await listProviders();

  if (providers.length === 0) {
    console.log('Please add providers first, then run this script again.\n');
    return;
  }

  // Step 2: Show instructions
  console.log('='.repeat(70));
  console.log('📝 Instructions:');
  console.log('='.repeat(70));
  console.log('');
  console.log('1. Copy provider IDs from the list above');
  console.log('2. Edit this script and update MODEL_MAPPINGS configuration');
  console.log('3. Replace REPLACE_WITH_PROVIDER_X_ID with actual IDs');
  console.log('4. Customize model names, priorities, and weights');
  console.log('5. Run this script again to create the mappings');
  console.log('');

  // Step 3: Attempt to create mappings
  let hasValidMappings = false;
  for (const config of MODEL_MAPPINGS) {
    const success = await setupMapping(config);
    if (success) hasValidMappings = true;
  }

  // Step 4: Show current mappings
  await showMappings();

  // Step 5: Test a mapping if we have valid ones
  if (hasValidMappings && MODEL_MAPPINGS.length > 0) {
    await testMapping(MODEL_MAPPINGS[0].customName);
  }

  console.log('='.repeat(70));
  console.log('✅ Setup complete!');
  console.log('='.repeat(70));
  console.log('');
  console.log('Next steps:');
  console.log('1. Test your unified model with an API request:');
  console.log('');
  console.log('   curl http://localhost:3000/v1/chat/completions \\');
  console.log('     -H "Authorization: Bearer YOUR_API_KEY" \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"model": "my-unified-model", "messages": [{"role": "user", "content": "Hello"}]}\'');
  console.log('');
  console.log('2. Check logs to see which provider/model was selected');
  console.log('3. Adjust priorities/weights based on performance');
  console.log('');
}

main().catch(console.error);
