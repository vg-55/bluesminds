#!/usr/bin/env node

/**
 * Setup Auto-Rotation for Single Model Name
 *
 * This creates a "gpt-4" model that automatically rotates between
 * your 3 providers with health checking and load balancing.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eoxoiqeswazggavqnocx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveG9pcWVzd2F6Z2dhdnFub2N4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUzNDQ1NywiZXhwIjoyMDgzMTEwNDU3fQ.mQ-GOLUZFjL0GAv_X0UU4zPlFJNUwhpivxvZGnP5TMY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupAutoRotation() {
  console.log('\n🔄 Setting up Auto-Rotation for Model...\n');
  console.log('=' .repeat(60));

  // Get all active providers
  const { data: providers, error: providersError } = await supabase
    .from('litellm_servers')
    .select('id, name, base_url, health_status')
    .eq('is_active', true);

  if (providersError || !providers || providers.length === 0) {
    console.error('❌ Error fetching providers:', providersError);
    return;
  }

  console.log(`\n📋 Found ${providers.length} active providers:`);
  providers.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (${p.base_url}) - ${p.health_status}`);
  });

  // Configuration: Single model name with auto-rotation across all providers
  const MODEL_NAME = 'gpt-4';  // Single model name
  const ACTUAL_MODEL = 'gpt-4'; // Actual model to request from providers

  console.log(`\n🎯 Configuring "${MODEL_NAME}" with auto-rotation...\n`);

  // Strategy 1: LOAD BALANCED (All same priority - traffic distributed by weight)
  console.log('Strategy: Load Balanced + Auto-Failover');
  console.log('  - All providers at priority 1 (load balanced)');
  console.log('  - Unhealthy providers automatically skipped');
  console.log('  - Traffic distributed by weight\n');

  const mappings = [
    {
      custom_name: MODEL_NAME,
      provider_id: providers[0].id,
      actual_model_name: ACTUAL_MODEL,
      display_name: `${MODEL_NAME} - Provider 1`,
      description: 'Auto-rotated provider 1',
      priority: 1,      // Same priority = load balanced
      weight: 1.0,      // Equal weight = even distribution
      is_active: true,
    },
    {
      custom_name: MODEL_NAME,
      provider_id: providers[1].id,
      actual_model_name: ACTUAL_MODEL,
      display_name: `${MODEL_NAME} - Provider 2`,
      description: 'Auto-rotated provider 2',
      priority: 1,      // Same priority = load balanced
      weight: 1.0,      // Equal weight = even distribution
      is_active: true,
    },
    {
      custom_name: MODEL_NAME,
      provider_id: providers[2].id,
      actual_model_name: ACTUAL_MODEL,
      display_name: `${MODEL_NAME} - Provider 3`,
      description: 'Auto-rotated provider 3',
      priority: 1,      // Same priority = load balanced
      weight: 1.0,      // Equal weight = even distribution
      is_active: true,
    },
  ];

  // Insert mappings
  let successCount = 0;
  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i];
    const { error } = await supabase
      .from('custom_models')
      .insert(mapping);

    if (error) {
      if (error.code === '23505') {
        console.log(`  ⚠️  Already exists: Provider ${i + 1}`);
      } else {
        console.error(`  ❌ Error: Provider ${i + 1}:`, error.message);
      }
    } else {
      console.log(`  ✅ Added: Provider ${i + 1} - ${providers[i].name}`);
      successCount++;
    }
  }

  if (successCount > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('✨ Auto-Rotation Setup Complete!\n');
    console.log(`When you request model "${MODEL_NAME}", the system will:`);
    console.log('  1. ✅ Check health of all providers automatically');
    console.log('  2. 🔄 Rotate between healthy providers');
    console.log('  3. ⚖️  Balance load based on current requests');
    console.log('  4. 🚨 Skip unhealthy providers automatically');
    console.log('  5. 🔁 Return to recovered providers when healthy\n');

    console.log('Example API Call:');
    console.log('  curl http://localhost:3000/v1/chat/completions \\');
    console.log('    -H "Authorization: Bearer YOUR_API_KEY" \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"model": "gpt-4", "messages": [...]}\'');
    console.log('\n  → Request automatically rotated between 3 providers! 🎉\n');
  } else {
    console.log('\n⚠️  No new mappings created. They may already exist.\n');
  }

  // Show current mappings
  console.log('=' .repeat(60));
  console.log('📊 Current Model Mappings:\n');

  const { data: currentMappings } = await supabase
    .from('custom_models')
    .select(`
      custom_name,
      actual_model_name,
      display_name,
      priority,
      weight,
      is_active,
      provider_id,
      litellm_servers!inner(name, health_status)
    `)
    .eq('custom_name', MODEL_NAME)
    .order('priority');

  if (currentMappings && currentMappings.length > 0) {
    currentMappings.forEach((m, i) => {
      const serverInfo = m.litellm_servers;
      const status = m.is_active ? '✅' : '❌';
      const health = serverInfo.health_status === 'healthy' ? '💚' :
                     serverInfo.health_status === 'degraded' ? '💛' : '❌';
      console.log(`  ${i + 1}. ${status} ${m.custom_name} → ${serverInfo.name} ${health}`);
      console.log(`     Priority: ${m.priority}, Weight: ${m.weight}`);
      console.log(`     Model: ${m.actual_model_name}\n`);
    });
  }

  console.log('=' .repeat(60));
  console.log('\n💡 Advanced Options:\n');
  console.log('Priority-Based Failover (instead of load balancing):');
  console.log('  - Set Provider 1: priority=1 (primary)');
  console.log('  - Set Provider 2: priority=2 (backup)');
  console.log('  - Set Provider 3: priority=3 (fallback)');
  console.log('  → All traffic goes to priority 1 unless unhealthy\n');

  console.log('Weighted Load Balancing:');
  console.log('  - Set Provider 1: weight=2.0 (gets 50% traffic)');
  console.log('  - Set Provider 2: weight=1.0 (gets 25% traffic)');
  console.log('  - Set Provider 3: weight=1.0 (gets 25% traffic)');
  console.log('  → Traffic distributed by weight ratio\n');
}

// Run setup
setupAutoRotation().catch(console.error);
