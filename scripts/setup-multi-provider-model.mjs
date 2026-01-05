#!/usr/bin/env node

/**
 * Setup Multi-Provider Model Mapping
 *
 * This script helps you map a single custom model name to multiple providers
 * for automatic load balancing and failover.
 *
 * Usage:
 *   node scripts/setup-multi-provider-model.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eoxoiqeswazggavqnocx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveG9pcWVzd2F6Z2dhdnFub2N4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUzNDQ1NywiZXhwIjoyMDgzMTEwNDU3fQ.mQ-GOLUZFjL0GAv_X0UU4zPlFJNUwhpivxvZGnP5TMY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupMultiProviderModel() {
  console.log('\n🔧 Multi-Provider Model Setup\n');
  console.log('=' .repeat(60));

  // First, get all available providers
  console.log('\n📋 Fetching available providers...\n');

  const { data: providers, error: providersError } = await supabase
    .from('litellm_servers')
    .select('id, name, base_url, health_status, is_active')
    .eq('is_active', true);

  if (providersError) {
    console.error('❌ Error fetching providers:', providersError);
    return;
  }

  if (!providers || providers.length === 0) {
    console.error('❌ No active providers found. Please add providers first.');
    return;
  }

  console.log('Available Providers:');
  providers.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (${p.base_url}) - ${p.health_status}`);
  });

  // Example configuration - you can modify this
  const exampleConfigs = [
    {
      description: 'Map "gpt-4" to multiple Claude providers with failover',
      customName: 'gpt-4',
      displayName: 'GPT-4 (Multi-Provider)',
      mappings: [
        {
          providerName: 'primary-provider', // Replace with actual provider name
          actualModel: 'claude-sonnet-4-5',
          priority: 1,  // Primary (highest priority)
          weight: 1.0,
        },
        {
          providerName: 'backup-provider', // Replace with actual provider name
          actualModel: 'claude-sonnet-4-5',
          priority: 2,  // Backup
          weight: 1.0,
        },
        {
          providerName: 'fallback-provider', // Replace with actual provider name
          actualModel: 'claude-opus-4-5',
          priority: 3,  // Fallback with different model
          weight: 0.5,
        },
      ]
    },
    {
      description: 'Map "claude-sonnet" to load-balanced providers',
      customName: 'claude-sonnet',
      displayName: 'Claude Sonnet (Load Balanced)',
      mappings: [
        {
          providerName: 'provider-1', // Replace with actual provider name
          actualModel: 'claude-sonnet-4-5',
          priority: 1,
          weight: 1.5,  // Gets 60% of traffic (1.5 / (1.5 + 1.0))
        },
        {
          providerName: 'provider-2', // Replace with actual provider name
          actualModel: 'claude-sonnet-4-5',
          priority: 1,
          weight: 1.0,  // Gets 40% of traffic
        },
      ]
    }
  ];

  console.log('\n\n📝 Example Configurations:\n');
  exampleConfigs.forEach((config, i) => {
    console.log(`${i + 1}. ${config.description}`);
    console.log(`   Custom Name: ${config.customName}`);
    console.log(`   Mappings:`);
    config.mappings.forEach(m => {
      console.log(`     - ${m.providerName} → ${m.actualModel}`);
      console.log(`       Priority: ${m.priority}, Weight: ${m.weight}`);
    });
    console.log('');
  });

  console.log('\n' + '='.repeat(60));
  console.log('To set up your own multi-provider mapping:');
  console.log('1. Replace provider names with actual provider names from above');
  console.log('2. Set priority (1 = highest, lower numbers = higher priority)');
  console.log('3. Set weight (higher = more traffic, typical range: 0.1 - 10.0)');
  console.log('4. Run the setup by uncommenting the code below\n');

  // Uncomment and modify this section to create your mappings
  /*
  const customName = 'gpt-4';  // Your custom model name
  const displayName = 'GPT-4 (Multi-Provider)';
  const description = 'GPT-4 with automatic failover across multiple providers';

  const mappings = [
    {
      providerId: providers[0].id,  // Replace with actual provider IDs
      actualModel: 'claude-sonnet-4-5',
      priority: 1,
      weight: 1.0,
    },
    {
      providerId: providers[1]?.id,  // Replace with actual provider IDs
      actualModel: 'claude-sonnet-4-5',
      priority: 2,
      weight: 1.0,
    },
  ];

  console.log(`\n🚀 Creating multi-provider mapping for "${customName}"...\n`);

  for (const mapping of mappings) {
    const { data, error } = await supabase
      .from('custom_models')
      .insert({
        custom_name: customName,
        provider_id: mapping.providerId,
        actual_model_name: mapping.actualModel,
        display_name: displayName,
        description: description,
        priority: mapping.priority,
        weight: mapping.weight,
        is_active: true,
      });

    if (error) {
      if (error.code === '23505') {
        console.log(`  ⚠️  Mapping already exists for provider ${mapping.providerId}`);
      } else {
        console.error(`  ❌ Error creating mapping:`, error);
      }
    } else {
      console.log(`  ✅ Created mapping: ${customName} → ${mapping.actualModel} (priority: ${mapping.priority}, weight: ${mapping.weight})`);
    }
  }

  console.log('\n✨ Setup complete!\n');
  */

  console.log('\n💡 How it works:');
  console.log('   - Priority: Lower numbers are tried first (1 = highest priority)');
  console.log('   - Weight: Controls traffic distribution (higher = more requests)');
  console.log('   - Health: Unhealthy providers are automatically skipped');
  console.log('   - Load: Providers with fewer active requests are preferred');
  console.log('\n');
}

// Run the setup
setupMultiProviderModel().catch(console.error);
