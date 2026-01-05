#!/usr/bin/env node

/**
 * Test Script: Add Second Provider for Same Model
 *
 * This script tests adding a second provider mapping for the same custom model name
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eoxoiqeswazggavqnocx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveG9pcWVzd2F6Z2dhdnFub2N4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUzNDQ1NywiZXhwIjoyMDgzMTEwNDU3fQ.mQ-GOLUZFjL0GAv_X0UU4zPlFJNUwhpivxvZGnP5TMY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('\n🔍 Testing Multi-Provider Setup\n');
  console.log('='.repeat(60));

  // Step 1: Get all providers
  console.log('\n1️⃣  Fetching available providers...\n');
  const { data: providers, error: provError } = await supabase
    .from('litellm_servers')
    .select('id, name, base_url, is_active')
    .eq('is_active', true);

  if (provError) {
    console.error('❌ Error fetching providers:', provError.message);
    return;
  }

  if (!providers || providers.length < 2) {
    console.log('⚠️  You need at least 2 providers to test multi-provider setup.');
    console.log('   Current providers:', providers?.length || 0);
    console.log('\n   Add more providers at: /admin/providers');
    return;
  }

  console.log('✅ Found', providers.length, 'providers:\n');
  providers.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} (${p.id.substring(0, 8)}...)`);
    console.log(`      URL: ${p.base_url}`);
  });

  // Step 2: Check existing mappings for "gpt-4"
  console.log('\n2️⃣  Checking existing mappings for "gpt-4"...\n');
  const { data: existing, error: existError } = await supabase
    .from('custom_models')
    .select('id, custom_name, provider_id, actual_model_name, priority, weight')
    .eq('custom_name', 'gpt-4');

  if (existError) {
    console.error('❌ Error checking existing mappings:', existError.message);
    return;
  }

  if (existing && existing.length > 0) {
    console.log(`📊 Found ${existing.length} existing mapping(s) for "gpt-4":\n`);
    existing.forEach((m, i) => {
      const provider = providers.find(p => p.id === m.provider_id);
      console.log(`   ${i + 1}. Provider: ${provider?.name || 'Unknown'}`);
      console.log(`      Model: ${m.actual_model_name}`);
      console.log(`      Priority: ${m.priority}, Weight: ${m.weight}`);
      console.log(`      ID: ${m.id}`);
    });
  } else {
    console.log('ℹ️  No existing mappings for "gpt-4"');
  }

  // Step 3: Try to add second provider
  console.log('\n3️⃣  Testing: Add second provider for "gpt-4"...\n');

  // Find a provider that's not already used for gpt-4
  const usedProviderIds = (existing || []).map(m => m.provider_id);
  const unusedProvider = providers.find(p => !usedProviderIds.includes(p.id));

  if (!unusedProvider) {
    console.log('⚠️  All providers already mapped to "gpt-4"');
    console.log('   Try a different custom name or add more providers');
    return;
  }

  console.log(`   Using provider: ${unusedProvider.name}`);
  console.log(`   Provider ID: ${unusedProvider.id}\n`);

  const testMapping = {
    custom_name: 'gpt-4',
    provider_id: unusedProvider.id,
    actual_model_name: 'gpt-4-turbo-preview',
    display_name: 'GPT-4 (Backup Provider)',
    description: 'Test multi-provider mapping',
    priority: 2,  // Backup priority
    weight: 1.0,
    is_active: true
  };

  console.log('   Mapping details:');
  console.log(`   - Custom Name: ${testMapping.custom_name}`);
  console.log(`   - Provider: ${unusedProvider.name}`);
  console.log(`   - Actual Model: ${testMapping.actual_model_name}`);
  console.log(`   - Priority: ${testMapping.priority}`);
  console.log(`   - Weight: ${testMapping.weight}\n`);

  const { data: newMapping, error: insertError } = await supabase
    .from('custom_models')
    .insert(testMapping)
    .select();

  if (insertError) {
    console.log('❌ Failed to add second provider!\n');
    console.log('   Error Message:', insertError.message);
    console.log('   Error Code:', insertError.code);
    if (insertError.details) {
      console.log('   Details:', insertError.details);
    }
    if (insertError.hint) {
      console.log('   Hint:', insertError.hint);
    }

    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check if migration 007_multi_provider_models.sql is applied');
    console.log('   2. Verify unique constraint is on (custom_name, provider_id) not just custom_name');
    console.log('   3. Check Supabase logs for more details');
  } else {
    console.log('✅ Successfully added second provider!\n');
    console.log('   Mapping ID:', newMapping[0].id);

    // Verify: Get all mappings for gpt-4
    const { data: allMappings } = await supabase
      .from('custom_models')
      .select('*, provider:litellm_servers(name)')
      .eq('custom_name', 'gpt-4')
      .order('priority');

    console.log(`\n4️⃣  Verification: "gpt-4" now has ${allMappings.length} provider(s):\n`);
    allMappings.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.provider.name} → ${m.actual_model_name}`);
      console.log(`      Priority: ${m.priority}, Weight: ${m.weight}`);
    });

    console.log('\n✨ Multi-provider routing is now active!');
    console.log('   Requests to "gpt-4" will auto-rotate between providers');

    // Ask if user wants to keep it
    console.log('\n⚠️  This is a test mapping. To keep it:');
    console.log('   - Leave it as is, OR');
    console.log('   - Delete it: DELETE FROM custom_models WHERE id = \'' + newMapping[0].id + '\'');
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
